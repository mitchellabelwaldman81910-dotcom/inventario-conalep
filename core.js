/* Inventario CONALEP · núcleo de datos.
   Todo lo que se hace se guarda primero en el teléfono (IndexedDB) y se envía al servidor en cuanto hay internet.
   Mismo formato de almacenamiento y de cola que la versión 1: si había algo pendiente, se envía igual. */
(() => {
"use strict";
const VERSION = "2.0";
const TK = "cnlp_token", UK = "cnlp_user";
const SIN = "(Sin resguardante)";
const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const nameKey = (n) => { let h = 5381; for (const ch of n) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return "r" + h.toString(36) + n.length; };
const bucketOf = (t) => { let h = 0; for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return "b" + String(h % 64).padStart(2, "0"); };
const uid = () => Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
const nm = (r) => r || SIN;
const money = (v) => { const n = parseFloat(String(v || "").replace(/[^0-9.]/g, "")); return isFinite(n) ? n : 0; };

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
const fotoDel = (k) => tx("fotos", "readwrite", (s) => { s.delete(k); }).catch(() => {});
const fotoAll = () => tx("fotos", "readonly", (s) => s.getAll()).catch(() => []);

/* ---------- estado ---------- */
const S = {
  tok: "", user: "", inv: null, marks: {}, ops: [], moves: { out: {}, inn: {} }, fotos: {}, fidx: [], log: [],
  syncing: false, lastSync: 0, lastPull: 0, noStore: false, pm: new Map(), po: new Map(), pex: {}, authLost: false, err: "",
};
const subs = [];
const emit = (k) => { for (const f of subs) { try { f(k); } catch (e) { console.error(e); } } };
const K = { RC: -1, MB: 0, DS: 1, MA: -1, MO: -1, SE: -1, AR: -1, IM: -1 };
function cols() {
  const h = S.inv?.h || [];
  const f = (re) => h.findIndex((x) => re.test(x));
  K.RC = f(/resguard/i); K.MB = f(/marbete|inventario|folio|clave|c[oó]digo/i); if (K.MB < 0) K.MB = 0;
  K.DS = f(/descrip/i); if (K.DS < 0) K.DS = Math.min(1, h.length - 1);
  K.MA = f(/marca/i); K.MO = f(/modelo/i); K.SE = f(/serie/i); K.AR = f(/[áa]rea|ubicaci/i); K.IM = f(/importe|valor|costo|precio/i);
  sx = null;
}
const cell = (row, j) => (j >= 0 && row ? clean(row[j + 1]) : "");
const row = (tok) => S.inv?.i?.[tok];

/* ---------- lo pendiente se ve encima de lo guardado ---------- */
function rebuildPending() {
  S.pm = new Map(); S.po = new Map(); S.pex = {};
  for (const o of S.ops) {
    if (o.type === "mark") S.pm.set(o.name + "\u0000" + o.tok, o);
    else if (o.type === "move") S.po.set(o.tok, o.to);
    else if (o.type === "extra") (S.pex[o.name] = S.pex[o.name] || {})[o.tok] = { n: o.note, t: o.t, pending: true };
  }
}
const rawOwner = (tok) => (S.po.has(tok) ? S.po.get(tok) : cell(S.inv.i[tok], K.RC));
const owner = (tok) => nm(rawOwner(tok));
function getMark(name, tok) {
  const k = name + "\u0000" + tok;
  if (S.pm.has(k)) { const o = S.pm.get(k); return o.e ? { e: o.e, c: o.c || "", n: o.n || "", at: o.t, by: S.user, pending: true } : null; }
  const d = S.marks[nameKey(name)];
  if (d && d.name === name && d.marks && d.marks[tok]) return d.marks[tok];
  return null;
}
const num = (t) => Number(S.inv.i[t]?.[0]) || 0;
function listFor(name) {
  const out = [];
  for (const tok in S.inv.i) if (nm(rawOwner(tok)) === name) out.push(tok);
  const gone = Object.keys(S.moves.out[name] || {}).filter((t) => S.inv.i[t] && nm(rawOwner(t)) !== name);
  out.sort((a, b) => num(a) - num(b)); gone.sort((a, b) => num(a) - num(b));
  return { own: out, gone };
}
function finOf(name) {
  const d = S.marks[nameKey(name)]; let fin = d && d.name === name ? d.fin || null : null;
  for (const o of S.ops) if (o.type === "fin" && o.name === name) fin = { t: o.t, by: S.user, pending: true };
  return fin;
}
function groups() {
  const g = new Map();
  for (const tok in S.inv.i) {
    const n = nm(rawOwner(tok)); let x = g.get(n); if (!x) g.set(n, (x = { name: n, total: 0, si: 0, no: 0 }));
    x.total++; const m = getMark(n, tok); if (m?.e === "si") x.si++; else if (m?.e === "no") x.no++;
  }
  const out = [...g.values()];
  for (const x of out) { x.rev = x.si + x.no; x.fin = finOf(x.name); }
  return out.sort((a, b) => a.name.localeCompare(b.name, "es"));
}
function totals() {
  const gs = groups(); const t = { total: 0, si: 0, no: 0, fin: 0, people: gs.length, started: 0 };
  for (const x of gs) { t.total += x.total; t.si += x.si; t.no += x.no; if (x.fin) t.fin++; if (x.rev) t.started++; }
  t.rev = t.si + t.no; return t;
}
function summaryOf(name) {
  const { own, gone } = listFor(name);
  const si = [], no = [], pend = [], reg = [], mal = [];
  let valTot = 0, valNo = 0;
  for (const t of own) {
    const m = getMark(name, t); const v = money(cell(S.inv.i[t], K.IM)); valTot += v;
    if (m?.e === "si") { si.push(t); if (m.c === "R") reg.push(t); else if (m.c === "M") mal.push(t); }
    else if (m?.e === "no") { no.push(t); valNo += v; } else pend.push(t);
  }
  const d = S.marks[nameKey(name)]; const dd = d && d.name === name ? d : {};
  const extras = { ...(dd.extras || {}), ...(S.pex[name] || {}) };
  const rec = Object.keys(S.moves.inn[name] || {}).filter((t) => S.inv.i[t] && nm(rawOwner(t)) === name);
  const notes = own.filter((t) => getMark(name, t)?.n);
  return { name, own, gone, si, no, pend, reg, mal, notes, rec, extras, fin: finOf(name), inicio: dd.inicio, valTot, valNo };
}

/* ---------- búsqueda ---------- */
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
let sx = null;
function searchIndex() {
  if (sx && sx.inv === S.inv) return sx.m;
  const m = new Map();
  for (const t in S.inv.i) { const r = S.inv.i[t]; m.set(t, norm([cell(r, K.MB), cell(r, K.DS), cell(r, K.MA), cell(r, K.MO), cell(r, K.SE), cell(r, K.AR), cell(r, K.RC)].join(" | "))); }
  sx = { inv: S.inv, m }; return m;
}
function search(q, max = 80) {
  const words = norm(clean(q)).split(" ").filter(Boolean); if (!words.length) return { list: [], more: 0 };
  const ix = searchIndex(); const exact = [], rest = []; let n = 0;
  const qq = norm(clean(q));
  for (const [t, s] of ix) {
    if (!words.every((w) => s.includes(w))) continue;
    n++; const mb = norm(cell(S.inv.i[t], K.MB));
    if (mb === qq || mb.startsWith(qq)) exact.push(t); else if (rest.length < max) rest.push(t);
  }
  const list = exact.concat(rest).slice(0, max);
  return { list, more: Math.max(0, n - list.length), total: n };
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
let logT = 0;
function saveLogSoon() { clearTimeout(logT); logT = setTimeout(() => kvSet("log", S.log).catch(() => {}), 300); }
function logAdd(ev) { ev.t = Date.now(); S.log.push(ev); if (S.log.length > 800) S.log.splice(0, S.log.length - 800); saveLogSoon(); }
function logPop() { S.log.pop(); saveLogSoon(); }

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
  await kvSet("inv", S.inv).catch(() => {}); await kvSet("marks", S.marks).catch(() => {}); kvSet("fotosIdx", S.fotos).catch(() => {});
  emit("data");
  return true;
}

async function addOp(op) {
  op.id = uid(); op.t = Date.now();
  // la última marca de un artículo sustituye a las anteriores que aún no se envían (el servidor se queda con la última igual)
  if (op.type === "mark") S.ops = S.ops.filter((o) => !(o.type === "mark" && o.name === op.name && o.tok === op.tok));
  if (op.type === "fin") S.ops = S.ops.filter((o) => !(o.type === "fin" && o.name === op.name));
  S.ops.push(op);
  await saveOps(); emit("data"); kick();
  return op;
}
let kickT = 0;
function kick() { clearTimeout(kickT); kickT = setTimeout(() => sync().catch(() => {}), 250); }

async function doMove(op) {
  const b = bucketOf(op.tok);
  const d = await db({ op: "get", path: "inv/" + b });
  const r = d.data?.items?.[op.tok];
  if (!r) { op.hold = "missing"; return false; }
  const cur = clean(r[K.RC + 1]);
  if (op.stage !== "bucket") {
    if (cur === op.to) return true;                       // ya estaba así: nada que hacer
    if (cur !== op.from) { op.hold = "conflict"; op.now = cur; return false; }
    const nr = r.slice(); while (nr.length < S.inv.h.length + 1) nr.push(""); nr[K.RC + 1] = op.to;
    await db({ op: "update", path: "inv/" + b, data: { items: { [op.tok]: nr } } });
    op.stage = "bucket"; await saveOps();
  }
  const mb = cell(r, K.MB), desc = cell(r, K.DS);
  await db({ op: "set", path: "cambios/" + op.id, data: { tipo: "traslado", nota: (op.ctx ? "Durante revisión de inventario de " + op.ctx : "Traslado") + " · app de inventario", personas: [op.from, op.to].filter(Boolean), diffs: [{ tok: op.tok, mb, desc, campo: S.inv.h[K.RC], antes: op.from, despues: op.to }] } });
  if (S.inv.i[op.tok]) { const nr = S.inv.i[op.tok].slice(); nr[K.RC + 1] = op.to; S.inv.i[op.tok] = nr; }
  return true;
}

const markData = (o) => { const m = { e: o.e, t: o.t }; if (o.c !== undefined || o.n !== undefined) { m.c = o.c || ""; m.n = o.n || ""; } return m; };
async function syncMarks(ops) {
  const by = {};
  for (const o of ops) {
    const g = (by[o.name] = by[o.name] || { marks: {}, extras: {}, del: [], fin: null, ids: [], t0: o.t });
    g.ids.push(o.id);
    if (o.type === "mark") { if (o.e) { g.marks[o.tok] = markData(o); g.del = g.del.filter((x) => x !== o.tok); } else { delete g.marks[o.tok]; g.del.push(o.tok); } }
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
        for (const [t, m] of Object.entries(g.marks)) nd.marks[t] = { ...(nd.marks[t] || {}), ...m };
        Object.assign(nd.extras, g.extras); if (g.fin) nd.fin = g.fin;
        await db({ op: "set", path: "marcas/" + key, data: nd });
      } else {
        const up = {}; if (Object.keys(g.marks).length) up.marks = g.marks; if (Object.keys(g.extras).length) up.extras = g.extras; if (g.fin) up.fin = g.fin;
        if (Object.keys(up).length) await db({ op: "update", path: "marcas/" + key, data: up });
      }
      // lo enviado ya forma parte de la copia local
      const c = (S.marks[key] = S.marks[key]?.name === name ? S.marks[key] : { name, inicio: g.t0, marks: {}, extras: {} });
      c.marks = c.marks || {}; c.extras = c.extras || {};
      for (const t of g.del) delete c.marks[t];
      for (const [t, m] of Object.entries(g.marks)) { const p = c.marks[t]; const keep = p && p.e === m.e && p.at; c.marks[t] = { ...(p || {}), e: m.e, at: keep ? p.at : m.t, by: keep ? p.by : S.user, ...(m.c !== undefined ? { c: m.c, n: m.n } : {}) }; }
      for (const [t, m] of Object.entries(g.extras)) c.extras[t] = { n: m.n, at: m.t, by: S.user };
      if (g.fin) c.fin = { t: g.fin.t, at: g.fin.t, by: S.user };
      S.ops = S.ops.filter((o) => !g.ids.includes(o.id)); await saveOps();
    } catch (e) {
      if (e.net || e.auth) throw e;
      for (const o of S.ops) if (g.ids.includes(o.id)) { o.err = e.message; }
      await saveOps();
    }
  }
}

async function sync() {
  if (S.syncing || !S.tok || !navigator.onLine || !S.inv) return;
  S.syncing = true; S.err = ""; emit("sync");
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
        const fi = S.fidx.find((x) => x.fid === op.fid); if (fi) { fi.sent = true; saveFidx(); }
        S.ops = S.ops.filter((o) => o.id !== op.id); await saveOps();
      } catch (e) { if (e.net || e.auth) throw e; op.err = e.message; await saveOps(); }
    }
    S.lastSync = Date.now();
    await pull().catch((e) => { if (e.net || e.auth) throw e; });
    kvSet("lastSync", S.lastSync).catch(() => {});
    S.authLost = false;
  } catch (e) {
    if (e.auth) { S.authLost = true; emit("auth"); }
    else if (!e.net) S.err = e.message || "Error al sincronizar";
  } finally { S.syncing = false; emit("sync"); }
}

/* ---------- acciones de inventario ---------- */
// deja la marca exactamente en el estado pedido (e = "si" | "no" | null); conserva estado físico y observaciones
function markTo(name, tok, e, patch = {}, quiet) {
  const cur = getMark(name, tok);
  const op = { type: "mark", name, tok, e: e || null };
  if (e) {
    const c = patch.c !== undefined ? patch.c : cur?.c || "", n = patch.n !== undefined ? patch.n : cur?.n || "";
    if (c || n || cur?.c || cur?.n) { op.c = c; op.n = clean(n).slice(0, 400); }
  }
  if (!quiet) logAdd({ k: patch.c !== undefined || patch.n !== undefined ? "c" : e || "un", tok, name, c: op.c });
  return addOp(op);
}
// tocar el mismo botón otra vez quita la marca
function toggleMark(name, tok, e) { const cur = getMark(name, tok); return markTo(name, tok, cur?.e === e ? null : e); }
function move(tok, to, ctx) {
  const from = rawOwner(tok);
  recordMove(tok, nm(from), to);
  logAdd({ k: "mv", tok, name: nm(from), to });
  return addOp({ type: "move", tok, from, to, ctx: ctx || "" });
}
function recordMove(tok, from, to) {
  const M = S.moves; (M.out[from] = M.out[from] || {})[tok] = { to, t: Date.now() };
  if (M.out[to]) delete M.out[to][tok];
  (M.inn[to] = M.inn[to] || {})[tok] = { from, t: Date.now() };
  if (M.inn[from]) delete M.inn[from][tok];
  saveMoves();
}
function addExtra(name, code, note) { logAdd({ k: "ex", tok: "m" + code, name }); return addOp({ type: "extra", name, tok: "m" + code, note: note || "Marbete fuera de la lista" }); }
function finish(name) { logAdd({ k: "fin", name }); return addOp({ type: "fin", name }); }
function resNames() { const s = new Set(); for (const t in S.inv.i) { const n = cell(S.inv.i[t], K.RC); if (n) s.add(n); } return [...s].sort((a, b) => a.localeCompare(b, "es")); }

/* ---------- fotos ---------- */
function saveFidx() { kvSet("fidx", S.fidx).catch(() => {}); }
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
  const t = Date.now();
  await fotoSet(fid, { fid, tok, data, t, sent: false });
  S.fidx.push({ fid, tok, t, sent: false }); saveFidx();
  logAdd({ k: "ft", tok, name: owner(tok) });
  await addOp({ type: "foto", tok, fid });
  return fid;
}
async function localPhotos(tok) {
  const out = [];
  for (const f of S.fidx.filter((x) => x.tok === tok).sort((a, b) => a.t - b.t)) { const d = await fotoGet(f.fid); if (d) out.push(d); }
  return out;
}
function photoCount(tok) {
  const ids = new Set((S.fotos[tok]?.list || []).map((x) => x.id));
  for (const f of S.fidx) if (f.tok === tok) ids.add(f.fid);
  return ids.size;
}
const photoUrls = new Map();
async function serverPhoto(tok, id) {
  const k = tok + "/" + id; if (photoUrls.has(k)) return photoUrls.get(k);
  const r = await api("foto-get", { tok, id }); const u = URL.createObjectURL(await r.blob()); photoUrls.set(k, u); return u;
}
// borra del teléfono las fotos que el portal ya tiene (siguen en el portal)
async function freeSent() {
  let n = 0;
  for (const f of S.fidx.slice()) {
    if (!f.sent) continue;
    if (!(S.fotos[f.tok]?.list || []).some((x) => x.id === f.fid)) continue;
    if (S.ops.some((o) => o.type === "foto" && o.fid === f.fid)) continue;
    await fotoDel(f.fid); S.fidx = S.fidx.filter((x) => x.fid !== f.fid); n++;
  }
  saveFidx(); return n;
}

/* ---------- cola: revisar, reintentar, descartar ---------- */
async function discard(o) {
  S.ops = S.ops.filter((x) => x.id !== o.id);
  if (o.type === "move") { const M = S.moves; if (M.out[nm(o.from)]) delete M.out[nm(o.from)][o.tok]; if (M.inn[o.to]) delete M.inn[o.to][o.tok]; await saveMoves(); }
  if (o.type === "foto") { await fotoDel(o.fid); S.fidx = S.fidx.filter((x) => x.fid !== o.fid); saveFidx(); }
  await saveOps(); emit("data");
}
async function retry(o) { delete o.err; await saveOps(); emit("data"); kick(); }
async function forceMove(o) { o.from = o.now; o.hold = null; delete o.now; await saveOps(); emit("data"); kick(); }

/* ---------- códigos ---------- */
function findTok(t) {
  t = clean(t); if (!t || !S.inv) return "";
  if (S.inv.i["m" + t]) return "m" + t; if (/^m/i.test(t) && S.inv.i["m" + t.slice(1)]) return "m" + t.slice(1); if (S.inv.i[t]) return t; return "";
}
function parseCode(txt) {
  txt = String(txt || "").trim();
  let m = txt.match(/#m([A-Za-z0-9]{1,40})\s*$/); if (m) return m[1];
  m = txt.match(/^m?([A-Za-z0-9]{1,40})$/i); if (m) return m[1];
  return "";
}

/* ---------- sesión ---------- */
async function login(username, password) {
  const r = await api("login", { username, password }, false);
  S.tok = r.token; S.user = r.user;
  try { localStorage.setItem(TK, S.tok); localStorage.setItem(UK, S.user); } catch (e) {}
  S.authLost = false; await start();
}
async function logout() {
  S.tok = ""; S.user = ""; S.inv = null; S.marks = {}; S.ops = []; S.moves = { out: {}, inn: {} }; S.fotos = {}; S.fidx = []; S.log = []; sx = null;
  try { localStorage.removeItem(TK); localStorage.removeItem(UK); } catch (e) {}
  try { await tx("kv", "readwrite", (s) => { s.clear(); }); await tx("fotos", "readwrite", (s) => { s.clear(); }); } catch (e) {}
  rebuildPending(); emit("login");
}
async function start() {
  S.err = "";
  if (!S.inv) {
    emit("data");
    if (navigator.onLine && S.tok) {
      try { await pull(); }
      catch (e) { if (e.auth) { S.authLost = true; emit("auth"); } else S.err = e.net ? "" : "No se pudo descargar el inventario: " + (e.message || ""); }
    }
  }
  if (S.inv) { cols(); rebuildPending(); }
  emit("data"); kick();
}
async function boot() {
  try { S.tok = localStorage.getItem(TK) || ""; S.user = localStorage.getItem(UK) || ""; } catch (e) {}
  S.inv = (await kvGet("inv")) || null; S.marks = (await kvGet("marks")) || {}; S.ops = (await kvGet("ops")) || [];
  S.moves = (await kvGet("moves")) || { out: {}, inn: {} }; S.lastSync = (await kvGet("lastSync")) || 0;
  S.log = (await kvGet("log")) || []; S.fotos = (await kvGet("fotosIdx")) || {};
  let fi = await kvGet("fidx");
  if (!Array.isArray(fi)) { fi = (await fotoAll()).map((f) => ({ fid: f.fid, tok: f.tok, t: f.t || 0, sent: !!f.sent })); kvSet("fidx", fi).catch(() => {}); }
  S.fidx = fi;
  if (S.inv) { cols(); rebuildPending(); }
  return { needLogin: !S.tok };
}
function onFocus() { if (S.tok && S.inv && navigator.onLine && !S.syncing && Date.now() - S.lastPull > 120000) sync().catch(() => {}); }
window.addEventListener("online", () => { emit("net"); kick(); });
window.addEventListener("offline", () => emit("net"));
document.addEventListener("visibilitychange", () => { if (!document.hidden) onFocus(); });
setInterval(() => { if (!document.hidden && S.ops.length) kick(); }, 30000);

window.Core = {
  VERSION, SIN, S, K, on: (f) => subs.push(f), emit, clean, nm, nameKey, norm, money, cell, row, owner, rawOwner, getMark, listFor, groups, totals, summaryOf, finOf, search,
  pull, sync, kick, addOp, markTo, toggleMark, move, addExtra, finish, resNames, addPhoto, localPhotos, photoCount, serverPhoto, freeSent,
  discard, retry, forceMove, findTok, parseCode, login, logout, start, boot, logAdd, logPop, api,
};
})();
