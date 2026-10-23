/* Inventario CONALEP · app para celular. Todo lo que se hace se guarda primero en el teléfono (IndexedDB)
   y se envía al servidor en cuanto hay internet. Nada se pierde si se va la señal. */
(() => {
"use strict";
const VERSION = "1.0";
const TK = "cnlp_token", UK = "cnlp_user";
const SIN = "(Sin resguardante)";
const $ = (id) => document.getElementById(id);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const nameKey = (n) => { let h = 5381; for (const ch of n) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return "r" + h.toString(36) + n.length; };
const bucketOf = (t) => { let h = 0; for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return "b" + String(h % 64).padStart(2, "0"); };
const uid = () => Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
const nm = (r) => r || SIN;
const fdt = (t) => { const d = new Date(t); return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }); };

/* ---------- almacenamiento en el teléfono ---------- */
let idbP = null;
const idb = () => idbP || (idbP = new Promise((res, rej) => {
  const r = indexedDB.open("conalep-inv", 1);
  r.onupgradeneeded = () => { r.result.createObjectStore("kv"); r.result.createObjectStore("fotos"); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
}));
async function tx(store, mode, fn) {
  const d = await idb();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode); let out;
    const q = fn(t.objectStore(store)); if (q) q.onsuccess = () => (out = q.result);
    t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  });
}
const kvGet = (k) => tx("kv", "readonly", (s) => s.get(k)).catch(() => undefined);
const kvSet = (k, v) => tx("kv", "readwrite", (s) => { s.put(v, k); }).catch((e) => { S.noStore = true; throw e; });
const fotoGet = (k) => tx("fotos", "readonly", (s) => s.get(k)).catch(() => undefined);
const fotoSet = (k, v) => tx("fotos", "readwrite", (s) => { s.put(v, k); });
const fotoAll = () => tx("fotos", "readonly", (s) => s.getAll()).catch(() => []);

/* ---------- estado ---------- */
const S = {
  tok: "", user: "", inv: null, marks: {}, ops: [], moves: { out: {}, inn: {} }, fotos: {}, lphotos: [],
  view: "home", cur: "", filter: "all", q: "", hq: "", syncing: false, lastSync: 0, lastPull: 0, noStore: false,
  pm: new Map(), po: new Map(), pex: {}, authLost: false, err: "",
};
let RC = -1, MB = -1, DS = -1, MA = -1, MO = -1, SE = -1, AR = -1;
function cols() {
  const h = S.inv?.h || [];
  const f = (re) => h.findIndex((x) => re.test(x));
  RC = f(/resguard/i); MB = f(/marbete|inventario|folio|clave|c[oó]digo/i); if (MB < 0) MB = 0;
  DS = f(/descrip/i); if (DS < 0) DS = Math.min(1, h.length - 1);
  MA = f(/marca/i); MO = f(/modelo/i); SE = f(/serie/i); AR = f(/[áa]rea/i);
}
const cell = (row, j) => (j >= 0 && row ? clean(row[j + 1]) : "");

/* ---------- lo pendiente se ve encima de lo guardado ---------- */
function rebuildPending() {
  S.pm = new Map(); S.po = new Map(); S.pex = {};
  for (const o of S.ops) {
    if (o.type === "mark") S.pm.set(o.name + "\u0000" + o.tok, o.e || null);
    else if (o.type === "move") S.po.set(o.tok, o.to);
    else if (o.type === "extra") (S.pex[o.name] = S.pex[o.name] || {})[o.tok] = { n: o.note, t: o.t, pending: true };
  }
}
const rawOwner = (tok) => (S.po.has(tok) ? S.po.get(tok) : cell(S.inv.i[tok], RC));
function getMark(name, tok) {
  const k = name + "\u0000" + tok;
  if (S.pm.has(k)) { const e = S.pm.get(k); return e ? { e, pending: true } : null; }
  const d = S.marks[nameKey(name)];
  if (d && d.name === name && d.marks && d.marks[tok]) return d.marks[tok];
  return null;
}
function listFor(name) {
  const out = [];
  for (const tok in S.inv.i) if (nm(rawOwner(tok)) === name) out.push(tok);
  const gone = Object.keys(S.moves.out[name] || {}).filter((t) => S.inv.i[t] && nm(rawOwner(t)) !== name);
  const num = (t) => Number(S.inv.i[t][0]) || 0;
  out.sort((a, b) => num(a) - num(b)); gone.sort((a, b) => num(a) - num(b));
  return { own: out, gone };
}
function groups() {
  const g = new Map();
  for (const tok in S.inv.i) {
    const n = nm(rawOwner(tok)); let x = g.get(n); if (!x) g.set(n, (x = { total: 0, si: 0, no: 0 }));
    x.total++; const m = getMark(n, tok); if (m?.e === "si") x.si++; else if (m?.e === "no") x.no++;
  }
  return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
}
function summaryOf(name) {
  const { own, gone } = listFor(name);
  const si = [], no = [], pend = [];
  for (const t of own) { const m = getMark(name, t); (m?.e === "si" ? si : m?.e === "no" ? no : pend).push(t); }
  const d = S.marks[nameKey(name)]; const dd = d && d.name === name ? d : {};
  const extras = { ...(dd.extras || {}), ...(S.pex[name] || {}) };
  let fin = dd.fin || null; for (const o of S.ops) if (o.type === "fin" && o.name === name) fin = { t: o.t, pending: true };
  return { own, gone, si, no, pend, extras, fin, inicio: dd.inicio };
}

/* ---------- servidor ---------- */
async function api(route, body, auth = true) {
  let r;
  try {
    r = await fetch("/api/" + route, { method: "POST", headers: { "content-type": "application/json", ...(auth && S.tok ? { authorization: "Bearer " + S.tok } : {}) }, body: JSON.stringify(body || {}) });
  } catch (e) { throw { net: true, message: "Sin conexión" }; }
  if (r.status === 401 && auth) throw { auth: true, message: "Sesión vencida" };
  if (route === "foto-get" && r.ok) return r;
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok) throw { code: j.code || "error", status: r.status, message: j.error || "Error del servidor (" + r.status + ")" };
  return j;
}
const db = (b) => api("db", b);

async function saveOps() { rebuildPending(); try { await kvSet("ops", S.ops); } catch (e) {} }
async function saveMoves() { try { await kvSet("moves", S.moves); } catch (e) {} }
let invT = 0;
function saveInvSoon() { clearTimeout(invT); invT = setTimeout(() => { kvSet("inv", S.inv).catch(() => {}); kvSet("marks", S.marks).catch(() => {}); }, 400); }

async function pull() {
  if (!S.tok || !navigator.onLine) return false;
  const r = await db({ op: "list", collection: "inv" });
  let meta = null; const i = {};
  for (const d of r.docs || []) {
    if (d.id === "meta") meta = d.data; else if (d.data?.items) for (const [k, v] of Object.entries(d.data.items)) i[k] = v;
  }
  if (!meta || !Object.keys(i).length) throw { message: "El servidor no devolvió el inventario completo" };
  const mk = await db({ op: "list", collection: "marcas" });
  const marks = {}; for (const d of mk.docs || []) marks[d.id] = d.data;
  let fotos = S.fotos; try { const f = await db({ op: "list", collection: "fotos" }); fotos = Object.fromEntries((f.docs || []).map((d) => [d.id, d.data])); } catch (e) { if (e.net || e.auth) throw e; }
  S.inv = { h: meta.h, i, at: Date.now() }; S.marks = marks; S.fotos = fotos; S.lastPull = Date.now();
  cols(); rebuildPending();
  await kvSet("inv", S.inv).catch(() => {}); await kvSet("marks", S.marks).catch(() => {});
  return true;
}

async function addOp(op) {
  op.id = uid(); op.t = Date.now(); S.ops.push(op);
  await saveOps(); render(); kick();
  return op;
}
let kickT = 0;
function kick() { clearTimeout(kickT); kickT = setTimeout(() => sync().catch(() => {}), 250); }

async function doMove(op) {
  const b = bucketOf(op.tok);
  const d = await db({ op: "get", path: "inv/" + b });
  const row = d.data?.items?.[op.tok];
  if (!row) { op.hold = "missing"; return false; }
  const cur = clean(row[RC + 1]);
  if (op.stage !== "bucket") {
    if (cur === op.to) return true;                       // ya estaba así: nada que hacer
    if (cur !== op.from) { op.hold = "conflict"; op.now = cur; return false; }
    const nr = row.slice(); while (nr.length < S.inv.h.length + 1) nr.push(""); nr[RC + 1] = op.to;
    await db({ op: "update", path: "inv/" + b, data: { items: { [op.tok]: nr } } });
    op.stage = "bucket"; await saveOps();
  }
  const mb = cell(row, MB), desc = cell(row, DS);
  await db({ op: "set", path: "cambios/" + op.id, data: { tipo: "traslado", nota: (op.ctx ? "Durante revisión de inventario de " + op.ctx : "Traslado") + " · app de inventario", personas: [op.from, op.to].filter(Boolean), diffs: [{ tok: op.tok, mb, desc, campo: S.inv.h[RC], antes: op.from, despues: op.to }] } });
  if (S.inv.i[op.tok]) { const nr = S.inv.i[op.tok].slice(); nr[RC + 1] = op.to; S.inv.i[op.tok] = nr; }
  return true;
}

async function syncMarks(ops) {
  const by = {};
  for (const o of ops) {
    const g = (by[o.name] = by[o.name] || { marks: {}, extras: {}, del: [], fin: null, ids: [], t0: o.t });
    g.ids.push(o.id);
    if (o.type === "mark") { if (o.e) { g.marks[o.tok] = { e: o.e, t: o.t }; g.del = g.del.filter((x) => x !== o.tok); } else { delete g.marks[o.tok]; g.del.push(o.tok); } }
    else if (o.type === "extra") g.extras[o.tok] = { n: o.note, t: o.t };
    else if (o.type === "fin") g.fin = { t: o.t };
  }
  for (const [name, g] of Object.entries(by)) {
    const key = nameKey(name);
    try {
      const d = await db({ op: "get", path: "marcas/" + key });
      const ex = d.exists && d.data?.name === name ? d.data : null;
      if (!ex) {
        await db({ op: "set", path: "marcas/" + key, data: { name, inicio: g.t0, marks: g.marks, extras: g.extras, ...(g.fin ? { fin: g.fin } : {}) } });
      } else if (g.del.length) {
        const nd = JSON.parse(JSON.stringify(ex)); nd.marks = nd.marks || {}; nd.extras = nd.extras || {};
        for (const t of g.del) delete nd.marks[t];
        Object.assign(nd.marks, g.marks); Object.assign(nd.extras, g.extras); if (g.fin) nd.fin = g.fin;
        await db({ op: "set", path: "marcas/" + key, data: nd });
      } else {
        const up = {}; if (Object.keys(g.marks).length) up.marks = g.marks; if (Object.keys(g.extras).length) up.extras = g.extras; if (g.fin) up.fin = g.fin;
        if (Object.keys(up).length) await db({ op: "update", path: "marcas/" + key, data: up });
      }
      // lo enviado ya forma parte de la copia local
      const c = (S.marks[key] = S.marks[key]?.name === name ? S.marks[key] : { name, inicio: g.t0, marks: {}, extras: {} });
      c.marks = c.marks || {}; c.extras = c.extras || {};
      for (const t of g.del) delete c.marks[t];
      for (const [t, m] of Object.entries(g.marks)) c.marks[t] = { e: m.e, at: m.t, by: S.user };
      for (const [t, m] of Object.entries(g.extras)) c.extras[t] = { n: m.n, at: m.t, by: S.user };
      if (g.fin) c.fin = { t: g.fin.t, at: g.fin.t, by: S.user };
      S.ops = S.ops.filter((o) => !g.ids.includes(o.id)); await saveOps();
    } catch (e) {
      if (e.net || e.auth) throw e;
      for (const o of ops) if (g.ids.includes(o.id)) { o.err = e.message; }
      await saveOps();
    }
  }
}

async function sync() {
  if (S.syncing || !S.tok || !navigator.onLine || !S.inv) return;
  S.syncing = true; S.err = ""; render();
  try {
    for (const op of S.ops.filter((o) => o.type === "move" && !o.hold)) {
      try {
        const done = await doMove(op);
        if (done) { S.ops = S.ops.filter((o) => o.id !== op.id); }
        await saveOps();
      } catch (e) { if (e.net || e.auth) throw e; op.err = e.message; await saveOps(); }
    }
    await syncMarks(S.ops.filter((o) => ["mark", "extra", "fin"].includes(o.type)));
    for (const op of S.ops.filter((o) => o.type === "foto")) {
      const f = await fotoGet(op.fid);
      if (!f) { S.ops = S.ops.filter((o) => o.id !== op.id); await saveOps(); continue; }
      try {
        await api("foto-put", { tok: op.tok, id: op.fid, data: f.data });
        f.sent = true; await fotoSet(op.fid, f);
        S.ops = S.ops.filter((o) => o.id !== op.id); await saveOps();
      } catch (e) { if (e.net || e.auth) throw e; op.err = e.message; await saveOps(); }
    }
    S.lastSync = Date.now();
    await pull().catch((e) => { if (e.net || e.auth) throw e; });
    kvSet("lastSync", S.lastSync).catch(() => {});
    S.authLost = false;
  } catch (e) {
    if (e.auth) { S.authLost = true; showLogin("Tu sesión venció. Entra de nuevo: lo pendiente sigue guardado y se enviará al entrar."); }
    else if (!e.net) S.err = e.message || "Error al sincronizar";
  } finally { S.syncing = false; render(); }
}

/* ---------- acciones de inventario ---------- */
function setMark(name, tok, e) {
  const cur = getMark(name, tok);
  const val = cur?.e === e ? null : e;                    // tocar de nuevo = quitar la marca
  return addOp({ type: "mark", name, tok, e: val });
}
function doMove2(tok, to, ctx) {
  const from = rawOwner(tok);
  recordMove(tok, nm(from), to);
  return addOp({ type: "move", tok, from, to, ctx: ctx || "" });
}
function recordMove(tok, from, to) {
  const M = S.moves; (M.out[from] = M.out[from] || {})[tok] = { to, t: Date.now() };
  if (M.out[to]) delete M.out[to][tok];
  (M.inn[to] = M.inn[to] || {})[tok] = { from, t: Date.now() };
  if (M.inn[from]) delete M.inn[from][tok];
  saveMoves();
}
function resNames() { const s = new Set(); for (const t in S.inv.i) { const n = cell(S.inv.i[t], RC); if (n) s.add(n); } return [...s].sort((a, b) => a.localeCompare(b, "es")); }

/* ---------- fotos ---------- */
async function shrink(file) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch (e) { bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file); }); }
  const w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight, k = Math.min(1, 1280 / Math.max(w0, h0));
  const c = document.createElement("canvas"); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.72);
}
async function addPhoto(tok, file) {
  const data = await shrink(file);
  const fid = (Math.random().toString(36).slice(2, 8) + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)).replace(/[^A-Za-z0-9]/g, "");
  await fotoSet(fid, { fid, tok, data, t: Date.now(), sent: false });
  S.lphotos.push({ fid, tok, sent: false });
  await addOp({ type: "foto", tok, fid });
}
const photoUrls = new Map();
async function serverPhoto(tok, id) {
  const k = tok + "/" + id; if (photoUrls.has(k)) return photoUrls.get(k);
  const r = await api("foto-get", { tok, id }); const u = URL.createObjectURL(await r.blob()); photoUrls.set(k, u); return u;
}

/* ---------- avisos ---------- */
let toastT = 0;
function toast(msg, bad) {
  document.querySelectorAll(".toast").forEach((x) => x.remove());
  const t = el("div", "toast" + (bad ? " bad" : ""), msg); document.body.appendChild(t);
  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2600);
}
let actx = null;
function beep(ok = true) {
  try { navigator.vibrate && navigator.vibrate(ok ? 60 : [60, 40, 60]); } catch (e) {}
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = ok ? 880 : 330; g.gain.value = 0.08;
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.12);
  } catch (e) {}
}

/* ---------- pantallas ---------- */
const nav = [];
function go(view, cur) { nav.push({ view: S.view, cur: S.cur, q: S.q, filter: S.filter }); S.view = view; if (cur !== undefined) S.cur = cur; S.q = ""; if (view === "per") S.filter = "all"; try { history.pushState({ n: nav.length }, ""); } catch (e) {} render(); $("view").scrollTop = 0; }
function back() { const p = nav.pop(); if (!p) return; S.view = p.view; S.cur = p.cur; S.q = p.q; S.filter = p.filter; render(); }
window.addEventListener("popstate", () => { if ($("scan").hidden === false) { closeScan(); return; } if ($("sheet").open) { $("sheet").close(); return; } back(); });
$("back").onclick = () => { if (history.state && history.state.n) history.back(); else back(); };

function netPill() {
  const p = $("net"), n = S.ops.length;
  if (S.syncing) { p.className = "pill"; p.textContent = "Enviando…"; }
  else if (!navigator.onLine) { p.className = "pill off"; p.textContent = "Sin internet" + (n ? " · " + n + " por enviar" : ""); }
  else if (S.authLost) { p.className = "pill bad"; p.textContent = "Entrar de nuevo"; }
  else if (S.ops.some((o) => o.hold || o.err)) { p.className = "pill bad"; p.textContent = "Revisar " + S.ops.filter((o) => o.hold || o.err).length; }
  else if (n) { p.className = "pill off"; p.textContent = n + " por enviar"; }
  else { p.className = "pill ok"; p.textContent = "Todo enviado ✓"; }
}

function render() {
  netPill();
  const v = $("view"), bar = $("bar"), bk = $("back");
  v.classList.remove("sum");
  if (!S.inv) { bk.hidden = true; bar.hidden = true; $("title").firstChild.nodeValue = "Inventario"; $("sub").textContent = ""; v.replaceChildren(boot()); return; }
  try {
    bk.hidden = S.view === "home";
    ({ home: rHome, per: rPer, sum: rSum, queue: rQueue })[S.view]();
  } catch (e) { console.error(e); v.replaceChildren(el("div", "empty", "Error al mostrar la pantalla: " + e.message)); }
}
function boot() {
  const d = el("div", "empty");
  d.append(el("p", "", S.err || (navigator.onLine ? "Descargando el inventario…" : "Sin internet y todavía no hay datos guardados. Conéctate una vez para descargar el inventario.")));
  if (S.err) { const b = el("button", "btn main", "Reintentar"); b.onclick = () => start(); d.append(b); }
  return d;
}
function setHead(t, s) { $("title").firstChild.nodeValue = t; $("sub").textContent = s || ""; }
function setBar(btns) { const b = $("bar"); b.replaceChildren(...btns); b.hidden = !btns.length; }
function bt(txt, cls, fn) { const b = el("button", "btn " + (cls || ""), txt); b.type = "button"; b.onclick = fn; return b; }

function rHome() {
  setHead("Resguardantes", S.inv.at ? "Datos de " + fdt(S.inv.at) : "");
  const v = $("view"); v.replaceChildren();
  if (S.noStore) v.append(card("warn", "Este navegador no permite guardar datos sin internet. Usa la app con señal."));
  const inst = installHint(); if (inst) v.append(inst);
  const q = el("input"); q.type = "search"; q.placeholder = "Buscar resguardante…"; q.value = S.hq; q.autocomplete = "off";
  const list = el("div"); v.append(q, el("div", "", ""), list); q.style.marginBottom = "10px";
  const draw = () => {
    S.hq = q.value; list.replaceChildren(); const t = clean(q.value).toLowerCase();
    let n = 0;
    for (const [name, g] of groups()) {
      if (t && !name.toLowerCase().includes(t)) continue; n++;
      const b = el("button", "rowc"); b.type = "button";
      const tx = el("div", "t"); tx.append(el("b", "", name));
      const sm = el("small", "", g.si + " presentes · " + g.no + " no están · " + (g.total - g.si - g.no) + " pendientes"); tx.append(sm);
      const pr = el("div", "prog"); const i = el("i"); i.style.width = Math.round(((g.si + g.no) / g.total) * 100) + "%"; pr.append(i); tx.append(pr);
      b.append(tx, el("span", "cnt", (g.si + g.no) + "/" + g.total)); b.onclick = () => go("per", name); list.append(b);
    }
    if (!n) list.append(el("div", "empty", "Ningún resguardante coincide."));
  };
  q.oninput = draw; draw();
  setBar([bt("📷 Consultar un marbete", "main", () => openScan("look")), bt("Pendientes" + (S.ops.length ? " (" + S.ops.length + ")" : ""), "", () => go("queue"))]);
}
function card(cls, txt) { const c = el("div", "card " + (cls || "")); c.textContent = txt; if (cls === "warn") { c.style.background = "var(--warnbg)"; c.style.color = "var(--warn)"; } return c; }
let deferredInstall = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; });
function installHint() {
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (standalone || localStorage.getItem("cnlp_hint") === "1") return null;
  const c = el("div", "card"); const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  c.append(el("b", "", "Instala la app en tu teléfono"));
  c.append(el("div", "note", ios ? "En Safari toca Compartir ⬆︎ y luego «Agregar a pantalla de inicio»." : "Abre el menú del navegador (⋮) y toca «Instalar app» o «Agregar a pantalla de inicio»."));
  const r = el("div"); r.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin-top:8px";
  if (deferredInstall) { const b = bt("Instalar", "main sm", async () => { deferredInstall.prompt(); deferredInstall = null; render(); }); r.append(b); }
  const x = bt("Ocultar", "sm", () => { try { localStorage.setItem("cnlp_hint", "1"); } catch (e) {} render(); }); r.append(x); c.append(r);
  return c;
}

function itemRow(tok, name, opts = {}) {
  const row = S.inv.i[tok]; const m = getMark(name, tok); const owner = nm(rawOwner(tok)); const moved = owner !== name;
  const li = el("div", "it" + (moved ? " moved" : m?.e === "si" ? " ok" : m?.e === "no" ? " no" : ""));
  const info = el("button", "i"); info.type = "button";
  info.append(el("b", "", cell(row, MB) || "No. " + row[0]), el("span", "", cell(row, DS)));
  const sm = [cell(row, MA), cell(row, MO), cell(row, SE)].filter((x) => x && x !== "S/M" && x !== "S/N").join(" · "); if (sm) info.append(el("small", "", sm));
  if (moved) { const t = el("span", "tag w", "Trasladado a " + owner); info.append(t); }
  else if (S.moves.inn[name]?.[tok]) info.append(el("span", "tag g", "Recibido de " + S.moves.inn[name][tok].from));
  if (m?.pending) info.append(el("span", "tag w", "por enviar"));
  info.onclick = () => openSheet(tok);
  li.append(info);
  const a = el("div", "a");
  const ok = el("button", "mk si" + (m?.e === "si" ? " on" : ""), "✓"), no = el("button", "mk no" + (m?.e === "no" ? " on" : ""), "✗");
  ok.type = no.type = "button"; ok.setAttribute("aria-label", "Presente"); no.setAttribute("aria-label", "No está");
  ok.disabled = no.disabled = moved;
  ok.onclick = () => setMark(name, tok, "si"); no.onclick = () => setMark(name, tok, "no");
  a.append(ok, no); li.append(a); return li;
}

function rPer() {
  const name = S.cur, v = $("view"); const sm = summaryOf(name);
  setHead(name, sm.own.length + " artículos" + (sm.fin ? " · finalizado" : ""));
  v.replaceChildren();
  const st = el("div", "stats");
  for (const [l, n, c] of [["Presentes", sm.si.length, "ok"], ["No están", sm.no.length, "bad"], ["Pendientes", sm.pend.length, ""], ["Trasladados", sm.gone.length, ""]]) {
    const s = el("div", "stat " + c); s.append(el("b", "", n), el("span", "", l)); st.append(s);
  }
  v.append(st);
  const chips = el("div", "chips");
  for (const [k, l] of [["all", "Todos"], ["pend", "Pendientes"], ["si", "✓ Presentes"], ["no", "✗ No están"]]) {
    const c = el("button", "chip" + (S.filter === k ? " on" : ""), l); c.type = "button"; c.onclick = () => { S.filter = k; rPer(); }; chips.append(c);
  }
  const q = el("input"); q.type = "search"; q.placeholder = "Buscar marbete o descripción…"; q.value = S.q; q.autocomplete = "off"; q.style.marginBottom = "10px";
  const list = el("div"); v.append(chips, q, list);
  const draw = () => {
    S.q = q.value; list.replaceChildren(); const t = clean(q.value).toLowerCase(); let n = 0;
    const set = { all: [...sm.own], pend: sm.pend, si: sm.si, no: sm.no }[S.filter];
    for (const tok of set) {
      if (t && !(cell(S.inv.i[tok], MB) + " " + cell(S.inv.i[tok], DS) + " " + cell(S.inv.i[tok], SE)).toLowerCase().includes(t)) continue;
      list.append(itemRow(tok, name)); n++;
    }
    if (S.filter === "all") for (const tok of sm.gone) if (!t || (cell(S.inv.i[tok], MB) + " " + cell(S.inv.i[tok], DS)).toLowerCase().includes(t)) { list.append(itemRow(tok, name)); n++; }
    if (!n) list.append(el("div", "empty", "No hay artículos en esta vista."));
  };
  q.oninput = draw; draw();
  setBar([bt("📷 Escanear", "main", () => openScan("inv")), bt("# Marbete", "", () => manualEntry()), bt("Resumen", "", () => go("sum"))]);
}

function rSum() {
  const name = S.cur, v = $("view"), sm = summaryOf(name);
  setHead("Resumen", name); v.replaceChildren(); v.classList.add("sum");
  const tot = sm.own.length, rev = sm.si.length + sm.no.length;
  const st = el("div", "stats");
  for (const [l, n, c] of [["Presentes", sm.si.length, "ok"], ["No están", sm.no.length, "bad"], ["Pendientes", sm.pend.length, ""], ["Total", tot, ""]]) { const s = el("div", "stat " + c); s.append(el("b", "", n), el("span", "", l)); st.append(s); }
  v.append(st);
  v.append(card("", "Revisados: " + rev + " de " + tot + (sm.fin ? " · Finalizado el " + fdt(sm.fin.t) + (sm.fin.by ? " por " + sm.fin.by : "") + (sm.fin.pending ? " (por enviar)" : "") : "")));
  const sec = (title, toks, fmt) => {
    if (!toks.length) return; v.append(el("h2", "", title + " (" + toks.length + ")"));
    const ul = el("div"); for (const t of toks) { const c = el("button", "rowc"); c.type = "button"; const x = el("div", "t"); x.append(el("b", "", fmt(t)[0])); x.append(el("small", "", fmt(t)[1])); c.append(x); c.onclick = () => openSheet(t); ul.append(c); } v.append(ul);
  };
  const base = (t) => [cell(S.inv.i[t], MB) + " · " + cell(S.inv.i[t], DS), [cell(S.inv.i[t], MA), cell(S.inv.i[t], MO), cell(S.inv.i[t], SE)].filter(Boolean).join(" · ")];
  sec("✗ No están", sm.no, base);
  sec("Pendientes (sin revisar)", sm.pend, base);
  sec("Trasladados a otro resguardante", sm.gone, (t) => [cell(S.inv.i[t], MB) + " · " + cell(S.inv.i[t], DS), "Ahora a nombre de " + nm(rawOwner(t))]);
  const rec = Object.keys(S.moves.inn[name] || {}).filter((t) => S.inv.i[t] && nm(rawOwner(t)) === name);
  sec("Recibidos de otro resguardante", rec, (t) => [cell(S.inv.i[t], MB) + " · " + cell(S.inv.i[t], DS), "Venía de " + S.moves.inn[name][t].from]);
  const ex = Object.entries(sm.extras);
  if (ex.length) { v.append(el("h2", "", "Sobrantes: marbetes que no están en la lista (" + ex.length + ")")); for (const [t, x] of ex) { const c = el("div", "rowc"); const y = el("div", "t"); y.append(el("b", "", t.slice(1)), el("small", "", x.n || "")); c.append(y); v.append(c); } }
  sec("✓ Presentes", sm.si, base);
  setBar([bt("Copiar resumen", "", () => copySummary(name, sm)), bt(sm.fin ? "Finalizar de nuevo" : "Finalizar inventario", "main", () => finish(name, sm))]);
}
let finArm = 0;
function finish(name, sm) {
  if (sm.pend.length && Date.now() - finArm > 5000) { finArm = Date.now(); toast("Quedan " + sm.pend.length + " pendientes sin revisar. Toca otra vez para finalizar de todos modos."); return; }
  addOp({ type: "fin", name }).then(() => toast("Inventario finalizado. Se envía al sitio en cuanto haya internet."));
}
function copySummary(name, sm) {
  const L = [`INVENTARIO · ${name}`, `Fecha: ${fdt(Date.now())}`, `Presentes: ${sm.si.length} · No están: ${sm.no.length} · Pendientes: ${sm.pend.length} · Total: ${sm.own.length}`];
  const add = (t, toks, f) => { if (toks.length) { L.push("", t + ":"); toks.forEach((x) => L.push(" - " + f(x))); } };
  const d = (t) => cell(S.inv.i[t], MB) + " " + cell(S.inv.i[t], DS);
  add("NO ESTÁN", sm.no, d); add("PENDIENTES", sm.pend, d); add("TRASLADADOS", sm.gone, (t) => d(t) + " → " + nm(rawOwner(t)));
  const txt = L.join("\n");
  (navigator.clipboard?.writeText(txt) || Promise.reject()).then(() => toast("Resumen copiado."), () => { if (navigator.share) navigator.share({ text: txt }).catch(() => {}); else toast("No se pudo copiar.", true); });
}

function rQueue() {
  setHead("Pendientes y ajustes", "Versión " + VERSION); const v = $("view"); v.replaceChildren();
  const c = el("div", "card"); c.append(el("b", "", navigator.onLine ? "Con internet" : "Sin internet"));
  c.append(el("div", "note", "Usuario: " + (S.user || "—") + (S.lastSync ? " · Último envío: " + fdt(S.lastSync) : "") + (S.err ? " · " + S.err : "")));
  const r = el("div"); r.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin-top:10px";
  const b1 = bt(S.syncing ? "Enviando…" : "Enviar ahora", "main", () => { if (!navigator.onLine) return toast("Sin internet.", true); sync(); }); b1.disabled = S.syncing;
  r.append(b1, bt("Actualizar datos", "", async () => { try { await pull(); toast("Datos actualizados."); } catch (e) { toast(e.net ? "Sin internet." : e.message, true); } render(); }));
  c.append(r); v.append(c);
  v.append(el("h2", "", "Por enviar (" + S.ops.length + ")"));
  if (!S.ops.length) v.append(el("div", "empty", "No hay nada pendiente."));
  for (const o of S.ops) {
    const k = el("div", "card"); const d = (t) => (S.inv.i[t] ? cell(S.inv.i[t], MB) + " · " + cell(S.inv.i[t], DS) : t.slice(1));
    const txt = o.type === "mark" ? (o.e === "si" ? "✓ Presente" : o.e === "no" ? "✗ No está" : "Quitar marca") + " · " + d(o.tok) + " · " + o.name
      : o.type === "move" ? "Traslado de " + d(o.tok) + ": " + nm(o.from) + " → " + o.to
      : o.type === "extra" ? "Sobrante " + o.tok.slice(1) + " · " + o.name : o.type === "fin" ? "Finalizar inventario de " + o.name : "Foto de " + d(o.tok);
    k.append(el("b", "", txt)); k.append(el("div", "note", fdt(o.t)));
    if (o.hold === "conflict") {
      k.append(el("div", "err", "Ese marbete ahora aparece a nombre de «" + nm(o.now) + "», no de «" + nm(o.from) + "». Alguien lo cambió antes."));
      const rr = el("div"); rr.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin-top:6px";
      rr.append(bt("Trasladar a " + o.to + " de todos modos", "main sm", () => { o.from = o.now; o.hold = null; saveOps().then(() => { render(); kick(); }); }),
        bt("Descartar", "bad sm", () => discard(o))); k.append(rr);
    } else if (o.hold === "missing") { k.append(el("div", "err", "Ese marbete ya no existe en la lista.")); k.append(bt("Descartar", "bad sm", () => discard(o))); }
    else if (o.err) { k.append(el("div", "err", o.err)); const rr = el("div"); rr.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin-top:6px"; rr.append(bt("Reintentar", "main sm", () => { delete o.err; saveOps().then(() => { render(); kick(); }); }), bt("Descartar", "bad sm", () => discard(o))); k.append(rr); }
    v.append(k);
  }
  v.append(el("h2", "", "Sesión"));
  let arm = 0; const lo = bt("Cerrar sesión", "bad", () => {
    if (S.ops.length && Date.now() - arm > 5000) { arm = Date.now(); lo.textContent = "Hay " + S.ops.length + " sin enviar. Toca otra vez para salir y perderlos"; return; }
    logout();
  }); lo.style.width = "100%"; v.append(lo);
  v.append(el("p", "note", "Al cerrar sesión se borran del teléfono los datos del inventario."));
  setBar([]);
}
async function discard(o) {
  S.ops = S.ops.filter((x) => x.id !== o.id);
  if (o.type === "move") { const M = S.moves; if (M.out[nm(o.from)]) delete M.out[nm(o.from)][o.tok]; if (M.inn[o.to]) delete M.inn[o.to][o.tok]; await saveMoves(); }
  await saveOps(); render();
}
async function logout() {
  S.tok = ""; S.user = ""; S.inv = null; S.marks = {}; S.ops = []; S.moves = { out: {}, inn: {} }; S.fotos = {}; S.lphotos = []; nav.length = 0; S.view = "home";
  try { localStorage.removeItem(TK); localStorage.removeItem(UK); } catch (e) {}
  try { await tx("kv", "readwrite", (s) => { s.clear(); }); await tx("fotos", "readwrite", (s) => { s.clear(); }); } catch (e) {}
  rebuildPending(); showLogin(""); render();
}

/* ---------- hoja de un artículo ---------- */
function openSheet(tok) {
  const row = S.inv.i[tok]; if (!row) return;
  const dlg = $("sheet"), box = $("shin"); box.replaceChildren();
  const name = S.view === "per" || S.view === "sum" ? S.cur : "";
  const owner = nm(rawOwner(tok));
  box.append(el("div", "note", "Marbete " + cell(row, MB)), el("h3", "", cell(row, DS)));
  const dl = el("dl", "f");
  S.inv.h.forEach((h, j) => { if (j === MB || j === DS) return; const x = cell(row, j); if (!x) return; dl.append(el("dt", "", h), el("dd", "", x)); });
  box.append(dl);
  if (name) {
    const m = getMark(name, tok);
    if (owner === name) {
      const r = el("div"); r.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin:10px 0";
      const ok = bt("✓ Presente", m?.e === "si" ? "main" : "", () => { setMark(name, tok, "si"); dlg.close(); });
      const no = bt("✗ No está", m?.e === "no" ? "bad" : "", () => { setMark(name, tok, "no"); dlg.close(); });
      r.append(ok, no); box.append(r);
      if (m) box.append(el("div", "note", "Marcado: " + (m.e === "si" ? "presente" : "no está") + (m.at ? " · " + fdt(m.at) : "") + (m.by ? " · " + m.by : "") + (m.pending ? " (por enviar)" : "")));
    } else {
      box.append(card("warn", "Este artículo no está en el resguardo de " + name + ": está a nombre de " + owner + "."));
      const tb2 = bt("Trasladar a " + name + " y marcar ✓", "main", async () => { dlg.close(); await doMove2(tok, name, name); await setMark(name, tok, "si"); toast("Trasladado y marcado ✓"); }); tb2.style.cssText = "width:100%;margin-top:8px"; box.append(tb2);
    }
  }
  // traslado
  const tr = el("div"); tr.style.marginTop = "12px";
  const tb = bt("Trasladar a otro resguardante", "", () => { tb.hidden = true; panel.hidden = false; inp.focus(); });
  const panel = el("div"); panel.hidden = true;
  const inp = el("input"); inp.setAttribute("list", "resNames"); inp.placeholder = "Escribe o elige el nuevo resguardante"; inp.autocomplete = "off";
  let dlist = document.getElementById("resNames"); if (!dlist) { dlist = document.createElement("datalist"); dlist.id = "resNames"; document.body.append(dlist); }
  dlist.replaceChildren(...resNames().map((n) => { const o = document.createElement("option"); o.value = n; return o; }));
  const st = el("div", "err"); let conf = "";
  const go2 = bt("Trasladar", "main", () => {
    const nv = clean(inp.value), cur = rawOwner(tok);
    if (!nv) { st.textContent = "Escribe el nombre del nuevo resguardante."; return; }
    if (nv === cur) { st.textContent = "Ya está en el resguardo de esa persona."; return; }
    if (conf !== nv) { conf = nv; st.textContent = (resNames().includes(nv) ? "" : "Ese nombre no existe en la lista. ") + "¿Trasladar el marbete " + cell(row, MB) + " de " + nm(cur) + " a " + nv + "? Toca Trasladar otra vez para confirmar."; return; }
    doMove2(tok, nv, name); dlg.close(); toast("Marbete " + cell(row, MB) + " trasladado a " + nv + ".");
  }); go2.style.cssText = "margin-top:8px;width:100%";
  panel.append(inp, st, go2); tr.append(tb, panel); tb.style.width = "100%"; box.append(tr);
  // fotos
  box.append(el("h2", "", "Fotos"));
  const ph = el("div", "ph"); box.append(ph);
  fillPhotos(ph, tok);
  const file = el("input"); file.type = "file"; file.accept = "image/*"; file.setAttribute("capture", "environment"); file.hidden = true;
  file.onchange = async () => { const f = file.files[0]; if (!f) return; try { await addPhoto(tok, f); toast("Foto guardada" + (navigator.onLine ? "." : ": se enviará con internet.")); fillPhotos(ph, tok); } catch (e) { toast("No se pudo guardar la foto.", true); } file.value = ""; };
  const pb = bt("📷 Agregar foto", "", () => file.click()); pb.style.cssText = "width:100%;margin-top:6px";
  const cl = bt("Cerrar", "", () => dlg.close()); cl.style.cssText = "width:100%;margin-top:14px";
  box.append(pb, file, cl);
  dlg.showModal();
}
async function fillPhotos(ph, tok) {
  ph.replaceChildren();
  const locals = (await fotoAll()).filter((f) => f.tok === tok).sort((a, b) => a.t - b.t);
  const seen = new Set();
  for (const f of locals) { seen.add(f.fid); const u = el("div", "u"); const im = el("img"); im.src = f.data; u.append(im); if (!f.sent) u.append(el("i", "", "por enviar")); ph.append(u); }
  const idx = S.fotos[tok]; const srv = (idx?.list || []).filter((f) => !seen.has(f.id));
  for (const f of srv) { const u = el("div", "u"); const im = el("img"); u.append(im); ph.append(u); if (navigator.onLine) serverPhoto(tok, f.id).then((url) => { im.src = url; }).catch(() => {}); }
  if (!ph.children.length) ph.append(el("div", "note", "Sin fotos."));
}
function manualEntry() {
  const dlg = $("sheet"), box = $("shin"); box.replaceChildren();
  box.append(el("h3", "", "Teclear el número de marbete"));
  const inp = el("input"); inp.type = "text"; inp.inputMode = "numeric"; inp.placeholder = "Ej. 730065"; inp.autocomplete = "off"; inp.style.margin = "12px 0";
  const go2 = bt("Buscar", "main", () => { const t = findTok(inp.value); if (!t) { st.textContent = "Ese marbete no está en la lista maestra."; return; } dlg.close(); handleItem(t, "manual"); });
  const st = el("div", "err"); inp.onkeydown = (e) => { if (e.key === "Enter") go2.click(); };
  go2.style.width = "100%"; box.append(inp, st, go2); dlg.showModal(); setTimeout(() => inp.focus(), 50);
}
function findTok(t) {
  t = clean(t); if (!t) return "";
  if (S.inv.i["m" + t]) return "m" + t; if (/^m/i.test(t) && S.inv.i["m" + t.slice(1)]) return "m" + t.slice(1); if (S.inv.i[t]) return t; return "";
}

/* ---------- cámara y lectura de QR ---------- */
let stream = null, scanning = false, mode = "inv", det = null, timer = 0, last = { tok: "", at: 0 }, torchOn = false, scanned = 0, cv = null, cx = null;
function parseCode(txt) {
  txt = String(txt || "").trim();
  let m = txt.match(/#m([A-Za-z0-9]{1,40})\s*$/); if (m) return m[1];
  m = txt.match(/^m?([A-Za-z0-9]{1,40})$/i); if (m) return m[1];
  return "";
}
async function openScan(md) {
  mode = md; scanned = 0; last = { tok: "", at: 0 };
  $("scan").hidden = false; document.body.style.overflow = "hidden";
  try { history.pushState({ n: 999 }, ""); } catch (e) {}
  $("st").textContent = md === "inv" ? S.cur : "Consultar marbete";
  showHint("Apunta la cámara al código QR del marbete.");
  beep(true);
  if (!navigator.mediaDevices?.getUserMedia) { showHint("Este navegador no permite usar la cámara. Teclea el número de marbete."); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch (e) { showHint("No se pudo abrir la cámara (" + (e.name === "NotAllowedError" ? "permiso denegado: actívalo en los ajustes del navegador" : e.message || e.name) + "). Puedes teclear el número de marbete."); return; }
  const vid = $("vid"); vid.srcObject = stream; try { await vid.play(); } catch (e) {}
  const tr = stream.getVideoTracks()[0]; const caps = tr.getCapabilities ? tr.getCapabilities() : {};
  $("storch").hidden = !caps.torch; torchOn = false; $("storch").textContent = "Linterna";
  if (!det && "BarcodeDetector" in window) { try { const f = await BarcodeDetector.getSupportedFormats(); if (f.includes("qr_code")) det = new BarcodeDetector({ formats: ["qr_code"] }); } catch (e) {} }
  scanning = true; tick();
}
function closeScan() {
  scanning = false; clearTimeout(timer);
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  $("vid").srcObject = null; $("scan").hidden = true; document.body.style.overflow = "";
  render();
}
$("sx").onclick = () => { if (history.state && history.state.n === 999) history.back(); else closeScan(); };
$("storch").onclick = async () => { try { torchOn = !torchOn; await stream.getVideoTracks()[0].applyConstraints({ advanced: [{ torch: torchOn }] }); $("storch").textContent = torchOn ? "Apagar luz" : "Linterna"; } catch (e) {} };
document.addEventListener("visibilitychange", () => { if (document.hidden && scanning) { scanning = false; clearTimeout(timer); } else if (!document.hidden && !$("scan").hidden && stream && !scanning) { scanning = true; tick(); } if (!document.hidden) onFocus(); });
function frameText() {
  const vid = $("vid"); const vw = vid.videoWidth, vh = vid.videoHeight; if (!vw) return null;
  const k = Math.min(1, 960 / vw), w = Math.round(vw * k), h = Math.round(vh * k);
  if (!cv) { cv = document.createElement("canvas"); cx = cv.getContext("2d", { willReadFrequently: true }); }
  cv.width = w; cv.height = h; cx.drawImage(vid, 0, 0, w, h);
  const id = cx.getImageData(0, 0, w, h);
  return window.QRDec.decode({ data: id.data, width: w, height: h });
}
async function tick() {
  if (!scanning) return;
  try {
    const vid = $("vid");
    if (vid.readyState >= 2) {
      let txt = null;
      if (det) { try { const r = await det.detect(vid); if (r[0]) txt = r[0].rawValue; } catch (e) {} }
      if (!txt) txt = frameText();
      if (txt) onCode(txt);
    }
  } catch (e) { console.error(e); }
  timer = setTimeout(tick, 90);
}
function showHint(t) { $("sres").replaceChildren(el("div", "hint", t)); }
function onCode(txt) {
  const code = parseCode(txt); if (!code) return;
  const tok = findTok(code) || "";
  const key = tok || "x" + code;
  if (last.tok === key && Date.now() - last.at < 3000) { last.at = Date.now(); return; }
  last = { tok: key, at: Date.now() };
  if (!tok) { unknownCard(code); beep(false); return; }
  handleItem(tok, "scan");
}
function resCard() { const r = $("sres"); r.replaceChildren(); const c = el("div", "scanres"); r.append(c); return c; }
function unknownCard(code) {
  const c = resCard(); c.append(el("b", "big", "El marbete " + code + " no está en la lista maestra."));
  if (mode === "inv") {
    c.append(el("div", "note", "Puedes anotarlo como sobrante para revisarlo después."));
    const r = el("div"); r.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin-top:10px";
    r.append(bt("Anotar como sobrante", "warn", () => { addOp({ type: "extra", name: S.cur, tok: "m" + code, note: "Marbete fuera de la lista" }); showHint("Anotado como sobrante: " + code); }), bt("Ignorar", "", () => showHint("Apunta la cámara al código QR del marbete.")));
    c.append(r);
  }
}
function handleItem(tok) {
  const row = S.inv.i[tok], owner = nm(rawOwner(tok));
  const inScan = !$("scan").hidden;
  const mb = cell(row, MB), desc = cell(row, DS), det2 = [cell(row, MA), cell(row, MO), cell(row, SE)].filter(Boolean).join(" · ");
  const inInv = !!S.cur && (S.view === "per" || S.view === "sum") && (!inScan || mode === "inv");
  if (!inInv) {
    if (!inScan) { openSheet(tok); return; }
    beep(true); const c = resCard(); c.append(el("b", "big", mb + " · " + desc), el("div", "", "Resguardante: " + owner));
    if (det2) c.append(el("div", "note", det2));
    const r = el("div"); r.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin-top:10px";
    r.append(bt("Ver ficha / foto / traslado", "main", () => { scanning = false; clearTimeout(timer); $("sheet").addEventListener("close", () => { if (!$("scan").hidden) { scanning = true; tick(); } }, { once: true }); openSheet(tok); }));
    c.append(r); return;
  }
  const name = S.cur, m = getMark(name, tok);
  if (!inScan) {                                           // número tecleado
    if (owner === name) { if (m?.e !== "si") setMark(name, tok, "si"); toast(m?.e === "si" ? "Ya estaba registrado ✓" : "✓ Presente: " + mb); } else openSheet(tok);
    return;
  }
  const card2 = (head, extra) => {
    const c = resCard(); c.append(el("b", "big", head), el("div", "", mb + " · " + desc));
    if (det2) c.append(el("div", "note", det2)); if (extra) c.append(extra);
    const r = el("div"); r.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"; c.append(r); return r;
  };
  if (owner === name) {
    if (m?.e === "si") { beep(true); card2("Ya estaba registrado ✓").append(bt("Quitar ✓", "", () => { setMark(name, tok, "si"); showHint("Quitado: " + mb); })); }
    else {
      setMark(name, tok, "si"); scanned++; beep(true); const sc = $("scan"); sc.classList.remove("flash"); void sc.offsetWidth; sc.classList.add("flash");
      card2("✓ Presente · " + scanned + " en esta sesión").append(bt("Deshacer", "", () => { setMark(name, tok, "si"); showHint("Deshecho: " + mb); }), bt("✗ No está", "bad", () => { setMark(name, tok, "no"); showHint("Marcado como no está: " + mb); }));
    }
  } else {
    beep(false);
    card2("Está a nombre de otra persona", el("div", "err", "Lista maestra: " + owner)).append(
      bt("Trasladar a " + name + " y marcar ✓", "main", async () => { await doMove2(tok, name, name); await setMark(name, tok, "si"); scanned++; showHint("Trasladado a " + name + " y marcado ✓: " + mb); }),
      bt("Omitir", "", () => showHint("Apunta la cámara al código QR del marbete.")));
  }
}
$("sheet").addEventListener("close", () => { render(); });

/* ---------- acceso ---------- */
function showLogin(msg) { $("login").hidden = false; $("le").textContent = ""; const n = $("lnote"); n.hidden = !msg; n.textContent = msg || ""; setTimeout(() => $("lp").focus(), 50); }
$("lg").src = "icons/icon-192.png";
$("lf").onsubmit = async (ev) => {
  ev.preventDefault(); const b = $("lb"); b.disabled = true; b.textContent = "Entrando…"; $("le").textContent = "";
  try {
    const r = await api("login", { username: $("lu").value, password: $("lp").value }, false);
    S.tok = r.token; S.user = r.user; try { localStorage.setItem(TK, S.tok); localStorage.setItem(UK, S.user); } catch (e) {}
    $("lp").value = ""; $("login").hidden = true; S.authLost = false; await start();
  } catch (e) { $("le").textContent = e.net ? "Sin internet: para entrar la primera vez necesitas conexión." : e.message || "No se pudo entrar."; }
  b.disabled = false; b.textContent = "Entrar";
};
$("net").onclick = () => { if (S.authLost) showLogin(""); else if (S.view !== "queue") go("queue"); };

function onFocus() { if (S.tok && S.inv && navigator.onLine && !S.syncing && Date.now() - S.lastPull > 120000) sync().catch(() => {}); }
window.addEventListener("online", () => { render(); kick(); });
window.addEventListener("offline", render);
setInterval(() => { if (!document.hidden && S.ops.length) kick(); }, 30000);

async function start() {
  S.err = "";
  if (!S.inv) { render(); if (navigator.onLine && S.tok) { try { await pull(); } catch (e) { if (e.auth) { S.authLost = true; showLogin("Tu sesión venció. Entra de nuevo."); } else S.err = e.net ? "" : "No se pudo descargar el inventario: " + (e.message || ""); } } }
  if (S.inv) { cols(); rebuildPending(); }
  render(); kick();
}
(async () => {
  try { S.tok = localStorage.getItem(TK) || ""; S.user = localStorage.getItem(UK) || ""; } catch (e) {}
  S.inv = (await kvGet("inv")) || null; S.marks = (await kvGet("marks")) || {}; S.ops = (await kvGet("ops")) || [];
  S.moves = (await kvGet("moves")) || { out: {}, inn: {} }; S.lastSync = (await kvGet("lastSync")) || 0;
  S.lphotos = (await fotoAll()).map((f) => ({ fid: f.fid, tok: f.tok, sent: f.sent }));
  if (S.inv) { cols(); rebuildPending(); }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (!S.tok) { showLogin(""); render(); return; }
  await start();
})();
window.__app = { S, sync, pull, addOp, listFor };
})();
