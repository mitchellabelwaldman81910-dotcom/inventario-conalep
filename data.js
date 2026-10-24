/* Portal de inventario CONALEP · capa de datos.
   Habla con el mismo servidor y guarda en las mismas colecciones que la app y el portal anterior:
   inv (64 grupos + meta), cambios (historial), marcas (revisiones de inventario) y fotos.
   Lo último que se descargó queda en este equipo (IndexedDB) para abrir al instante. */
(() => {
"use strict";
const TK = "cnlp_token", UK = "cnlp_user";
const SIN = "(Sin resguardante)";
const MAX = 8000;
const KEY_RE = /marbete|inventario|folio|clave|c[oó]digo/i;
const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const nameKey = (n) => { let h = 5381; for (const ch of n) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return "r" + h.toString(36) + n.length; };
const bucketOf = (t) => { let h = 0; for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return "b" + String(h % 64).padStart(2, "0"); };
const tokOf = (v) => { const t = String(v || "").replace(/[^A-Za-z0-9]/g, ""); return t ? "m" + t : ""; };
const uid = () => Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
const money = (v) => { const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : 0; };
const yearOf = (s) => { let m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); if (m) return +m[3]; m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s); return m ? +m[1] : 0; };
const deep = (o) => JSON.parse(JSON.stringify(o));

const D = {
  SIN, MAX, KEY_RE, clean, nameKey, bucketOf, tokOf, money,
  user: "", token: "", admin: false,
  inv: { h: [], i: {} }, v: { inv: "", marcas: "", fotos: "", cambios: "" },
  marcas: {}, fotos: {}, cambios: null,
  items: [], byTok: new Map(), K: {}, people: new Map(),
  ready: false, cached: false, online: true, syncing: false, lastSync: 0, err: "", rev: 0, stale: {},
};

/* ---------- avisos internos ---------- */
const subs = new Set();
D.on = (f) => { subs.add(f); return () => subs.delete(f); };
const emit = (k, x) => { for (const f of subs) { try { f(k, x); } catch (e) { console.error(e); } } };

/* ---------- servidor ---------- */
function setOnline(v) { if (D.online !== v) { D.online = v; emit("net"); } }
async function call(route, body, auth = true) {
  let r;
  try {
    r = await fetch("/api/" + route, {
      method: "POST",
      headers: { "content-type": "application/json", ...(auth && D.token ? { authorization: "Bearer " + D.token } : {}) },
      body: JSON.stringify(body || {}),
    });
  } catch (e) { setOnline(false); throw { code: "unavailable", message: "Sin conexión con el servidor. Revisa tu internet y vuelve a intentarlo." }; }
  setOnline(true);
  if (route === "foto-get" && r.ok) return r.blob();
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (r.status === 401 && auth) { lostSession(); throw { code: "unauthenticated", message: "Tu sesión venció. Entra de nuevo y repite el cambio." }; }
  if (!r.ok) throw { code: j.code || "error", status: r.status, message: j.error || "El servidor no respondió bien. Intenta de nuevo." };
  return j;
}
const db = (body) => call("db", body);
D.call = call;
D.errMsg = (e) => e?.code === "quota_exceeded" ? "Se llenó el espacio: " + (e.message || "") :
  e?.code === "unavailable" || e?.code === "unauthenticated" || e?.code === "forbidden" || e?.code === "locked" ? e.message :
  e?.message && !e.code ? e.message : "No se pudo guardar. Revisa tu conexión e intenta de nuevo.";

/* ---------- sesión (la misma que usa la app de celular) ---------- */
D.session = () => {
  try { D.token = localStorage.getItem(TK) || ""; D.user = localStorage.getItem(UK) || ""; } catch (e) {}
  D.admin = D.user === "Mitchell";
  return !!D.token;
};
D.lastUser = () => { try { return localStorage.getItem(UK) || ""; } catch (e) { return ""; } };
D.login = async (username, password) => {
  const r = await call("login", { username, password }, false);
  D.token = r.token; D.user = r.user; D.admin = D.user === "Mitchell";
  try { localStorage.setItem(TK, D.token); localStorage.setItem(UK, D.user); } catch (e) {}
  emit("auth");
  return r;
};
D.checkMe = async () => { const r = await call("me", {}); D.user = r.user; D.admin = D.user === "Mitchell"; return r; };
D.logout = async () => {
  try { localStorage.removeItem(TK); } catch (e) {}
  D.token = ""; await IDB.clear();
};
function lostSession() { D.token = ""; try { localStorage.removeItem(TK); } catch (e) {} emit("auth-lost"); }

/* ---------- copia local ---------- */
const IDB = {
  p: null,
  open() { return this.p || (this.p = new Promise((res, rej) => { const r = indexedDB.open("conalep-portal", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); },
  async get(k) { try { const d = await this.open(); return await new Promise((res) => { const q = d.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); } catch (e) { return undefined; } },
  async set(k, v) { try { const d = await this.open(); await new Promise((res) => { const t = d.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = res; t.onerror = res; t.onabort = res; }); } catch (e) {} },
  async clear() { try { const d = await this.open(); await new Promise((res) => { const t = d.transaction("kv", "readwrite"); t.objectStore("kv").clear(); t.oncomplete = res; t.onerror = res; }); } catch (e) {} },
};
const saveT = {};
const cacheSave = (k) => { clearTimeout(saveT[k]); saveT[k] = setTimeout(() => {
  if (k === "inv") IDB.set("inv", { h: D.inv.h, i: D.inv.i, v: D.v.inv });
  else if (k === "marcas") IDB.set("marcas", { docs: D.marcas, v: D.v.marcas });
  else if (k === "fotos") IDB.set("fotos", { docs: D.fotos, v: D.v.fotos });
}, 400); };

/* ---------- artículos derivados del inventario ---------- */
function findCols(h) {
  const f = (re) => h.findIndex((x) => re.test(x));
  const K = {};
  K.MB = f(KEY_RE);
  K.DS = f(/descrip/i); if (K.DS < 0) K.DS = f(/art[ií]culo|concepto|bien/i); if (K.DS < 0) K.DS = h.length > 1 ? 1 : 0;
  K.MA = h.findIndex((x) => /^\s*marca\s*$/i.test(x)); if (K.MA < 0) K.MA = f(/marca/i);
  K.MO = f(/modelo/i); K.SE = f(/serie/i); K.IM = f(/importe|costo|precio|monto|valor/i); K.CU = f(/cuenta/i);
  K.FA = h.findIndex((x) => /factura/i.test(x) && !/fecha/i.test(x)); K.FE = f(/fecha/i); K.PR = f(/proveedor/i);
  K.AR = f(/[aá]rea|ubicaci/i); K.RC = f(/resguard/i);
  return K;
}
function mkItem(tok, row, K) {
  const g = (j) => (j >= 0 ? clean(row[j + 1]) : "");
  const it = { tok, n: Number(row[0]) || 0, row, mb: g(K.MB), ds: g(K.DS), ma: g(K.MA), mo: g(K.MO), se: g(K.SE), imS: g(K.IM), cu: g(K.CU), fa: g(K.FA), pr: g(K.PR), fe: g(K.FE), ar: g(K.AR), rc: g(K.RC) || SIN, mark: null, fotos: 0 };
  it.im = money(it.imS); it.y = yearOf(it.fe);
  return it;
}
function derive() {
  const K = (D.K = findCols(D.inv.h));
  D.hRC = K.RC >= 0 ? D.inv.h[K.RC] : ""; D.hMB = K.MB >= 0 ? D.inv.h[K.MB] : ""; D.hDS = D.inv.h[K.DS] || "";
  const items = [];
  for (const [tok, row] of Object.entries(D.inv.i)) items.push(mkItem(tok, row, K));
  items.sort((a, b) => a.n - b.n);
  D.items = items; D.byTok = new Map(items.map((x) => [x.tok, x]));
  attachMarks(false); attachFotos(false);
  D.rev++;
}
function attachMarks(bump = true) {
  for (const it of D.items) it.mark = null;
  D.people = new Map();
  for (const [id, d] of Object.entries(D.marcas)) {
    if (!d || !d.name) continue;
    D.people.set(d.name, { id, doc: d });
    for (const [tok, m] of Object.entries(d.marks || {})) { const it = D.byTok.get(tok); if (it && it.rc === d.name && m && m.e) it.mark = m; }
  }
  if (bump) D.rev++;
}
function attachFotos(bump = true) {
  for (const it of D.items) it.fotos = D.fotos[it.tok]?.list?.length || 0;
  if (bump) D.rev++;
}
D.cell = (it, h) => { const j = D.inv.h.indexOf(h); return j < 0 ? "" : clean(it.row[j + 1]); };
D.docOf = (name) => { const d = D.marcas[nameKey(name)]; return d && d.name === name ? d : null; };
D.markOf = (name, tok) => D.docOf(name)?.marks?.[tok] || null;

/* ---------- descargas del servidor ---------- */
const LOAD = {
  async inv() {
    const r = await db({ op: "list", collection: "inv" });
    let meta = null; const i = {};
    for (const d of r.docs) { if (d.id === "meta") meta = d.data; else if (d.data && d.data.items) for (const [k, v] of Object.entries(d.data.items)) i[k] = v; }
    if (!meta || !Object.keys(i).length) throw { code: "empty", message: "El inventario todavía no está listo en el servidor. Recarga en un momento." };
    D.inv = { h: meta.h.slice(), i }; D.v.inv = r.v; D.stale.inv = false;
    derive(); emit("inv"); cacheSave("inv");
  },
  async marcas() {
    const r = await db({ op: "list", collection: "marcas" });
    const m = {}; for (const d of r.docs) m[d.id] = d.data;
    D.marcas = m; D.v.marcas = r.v; D.stale.marcas = false;
    attachMarks(); emit("marcas"); cacheSave("marcas");
  },
  async fotos() {
    const r = await db({ op: "list", collection: "fotos" });
    const m = {}; for (const d of r.docs) m[d.id] = d.data;
    D.fotos = m; D.v.fotos = r.v; D.stale.fotos = false;
    attachFotos(); emit("fotos"); cacheSave("fotos");
  },
  async cambios() {
    const r = await db({ op: "query", collection: "cambios", orderBy: ["at", "desc"], limit: 1000 });
    D.cambios = r.docs.map((d) => ({ id: d.id, ...d.data })).sort((a, b) => (b.at || 0) - (a.at || 0));
    D.v.cambios = r.v; D.stale.cambios = false;
    emit("cambios");
  },
};
D.loadCambios = async (force) => { if (!D.cambios || force) await LOAD.cambios(); return D.cambios; };

D.boot = async () => {
  const [ci, cm, cf] = await Promise.all([IDB.get("inv"), IDB.get("marcas"), IDB.get("fotos")]);
  if (ci && ci.h && ci.i && Object.keys(ci.i).length) { D.inv = { h: ci.h, i: ci.i }; D.v.inv = ci.v || ""; D.cached = true; }
  if (cm && cm.docs) { D.marcas = cm.docs; D.v.marcas = cm.v || ""; }
  if (cf && cf.docs) { D.fotos = cf.docs; D.v.fotos = cf.v || ""; }
  if (D.cached) { derive(); D.ready = true; emit("ready"); }
  try { await D.refresh(); }
  catch (e) { if (!D.ready) throw e; }
  if (!D.ready) { D.ready = true; emit("ready"); }
  schedule();
};
let refreshing = null;
/* revisa qué colecciones cambiaron (una llamada pequeña por colección) y descarga solo esas */
const lastCheck = { inv: 0, marcas: 0, fotos: 0, cambios: 0 };
D.wantCambios = false;
D.refresh = (only) => refreshing || (refreshing = (async () => {
  D.syncing = true; emit("sync");
  try {
    const cols = only || ["inv", "marcas", "fotos"].concat(D.cambios ? ["cambios"] : []);
    const now = Date.now(); cols.forEach((c) => (lastCheck[c] = now));
    const vs = await Promise.all(cols.map((c) => db({ op: "version", collection: c }).then((r) => r.v, (e) => { if (e.code === "unauthenticated" || e.code === "unavailable") throw e; return null; })));
    const jobs = [];
    cols.forEach((c, k) => {
      if (vs[k] === null) return;
      const empty = c === "inv" && !D.items.length;
      if (empty || vs[k] !== D.v[c] || D.stale[c]) jobs.push(LOAD[c]());
    });
    await Promise.all(jobs);
    D.lastSync = Date.now(); D.err = "";
  } catch (e) { D.err = e.message || "No se pudo actualizar."; throw e; }
  finally { D.syncing = false; refreshing = null; emit("sync"); }
})());

/* consulta periódica con cuidado de no gastar: cada colección tiene su ritmo.
   Normal: inventario y revisiones cada minuto, fotos cada 3 min, bitácora cada 2 min solo si se está viendo.
   En vivo: revisiones cada 10 s. Sin usar el equipo 15 min: cada 5 min. Pestaña oculta: nada. */
let pollT = 0, pace = "normal", lastInput = Date.now();
["pointerdown", "keydown", "wheel"].forEach((ev) => addEventListener(ev, () => { const idle = Date.now() - lastInput > 15 * 60e3; lastInput = Date.now(); if (idle) { D.refresh().catch(() => {}); schedule(); } }, { passive: true }));
const every = (c) => {
  if (Date.now() - lastInput > 15 * 60e3) return 300e3;
  if (c === "marcas") return pace === "live" ? 10e3 : 60e3;
  if (c === "inv") return 60e3;
  if (c === "fotos") return 180e3;
  return D.wantCambios && D.cambios ? 120e3 : Infinity;
};
function schedule() {
  clearTimeout(pollT);
  if (document.hidden || !D.token) return;
  pollT = setTimeout(async () => {
    const now = Date.now(); const due = Object.keys(lastCheck).filter((c) => now - lastCheck[c] >= every(c) && (c !== "cambios" || D.cambios));
    if (due.length) { try { await D.refresh(due); } catch (e) {} }
    schedule();
  }, 5e3);
}
D.setPace = (p) => { if (pace !== p) { pace = p; if (p === "live") D.refresh(["marcas"]).catch(() => {}); schedule(); } };
D.pollStats = () => ({ pace, lastCheck: { ...lastCheck }, every: Object.fromEntries(Object.keys(lastCheck).map((c) => [c, every(c)])) });
document.addEventListener("visibilitychange", () => { if (!document.hidden && D.token && D.ready && Date.now() - D.lastSync > 15e3) D.refresh().catch(() => {}); schedule(); });
addEventListener("online", () => { if (D.token && D.ready) D.refresh().catch(() => {}); });

/* versiones: si nadie más escribió entre tanto, lo local ya está al día */
function chain(col, r) {
  if (!r || !r.v) return;
  if (r.prev === D.v[col]) D.v[col] = r.v; else D.stale[col] = true;
}
const settle = () => { if (Object.values(D.stale).some(Boolean)) setTimeout(() => D.refresh().catch(() => {}), 600); };

/* ---------- escrituras del inventario ---------- */
async function writeBuckets(updates, onProg) {
  const byB = {};
  for (const [t, r] of Object.entries(updates)) (byB[bucketOf(t)] = byB[bucketOf(t)] || {})[t] = r;
  const ids = Object.keys(byB); let done = 0;
  const one = async (b) => {
    const its = byB[b], path = "inv/" + b;
    let r;
    try { r = await db({ op: "update", path, data: { items: its } }); }
    catch (e) {
      if (e?.code === "invalid_argument") { const s = await db({ op: "get", path }); if (!s.exists) r = await db({ op: "set", path, data: { items: its } }); else throw e; }
      else throw e;
    }
    for (const [t, row] of Object.entries(its)) D.inv.i[t] = row;
    chain("inv", r); done++; onProg && onProg(done, ids.length);
  };
  // de 4 en 4 para que sea rápido sin saturar al servidor
  for (let k = 0; k < ids.length; k += 4) await Promise.all(ids.slice(k, k + 4).map(one));
  return ids.length;
}
async function writeLog(tipo, diffs, nota) {
  const rcH = D.hRC; const made = [];
  for (let k = 0; k < diffs.length; k += 300) {
    const part = diffs.slice(k, k + 300);
    const personas = [...new Set(part.filter((d) => d.campo === rcH).flatMap((d) => [d.antes, d.despues]).filter(Boolean))];
    const id = uid();
    const doc = { at: Date.now(), by: D.user, tipo, nota: nota || "", diffs: part, personas };
    const r = await db({ op: "set", path: "cambios/" + id, data: doc });
    made.push({ id, ...doc }); chain("cambios", r);
  }
  if (D.cambios) { D.cambios = made.reverse().concat(D.cambios); emit("cambios"); }
}
D.writeLog = writeLog;

/* cambios de uno o varios artículos: {tok: {campo: valorNuevo}} → número de cambios y cómo deshacerlos */
D.applyChanges = async (changes, tipo, nota, onProg) => {
  const h = D.inv.h, kc = D.hMB, dc = D.hDS;
  const updates = {}, diffs = [], undo = {};
  for (const [tok, set] of Object.entries(changes)) {
    const row = D.inv.i[tok]; if (!row) continue;
    const nr = row.slice(); while (nr.length < h.length + 1) nr.push("");
    let ch = false;
    for (const [campo, val] of Object.entries(set)) {
      const j = h.indexOf(campo); if (j < 0 || campo === kc) continue;
      const antes = row[j + 1] || "", despues = clean(val); if (antes === despues) continue;
      nr[j + 1] = despues; ch = true;
      diffs.push({ tok, mb: kc ? row[h.indexOf(kc) + 1] || "" : "", desc: row[h.indexOf(dc) + 1] || "", campo, antes, despues });
      (undo[tok] = undo[tok] || {})[campo] = antes;
    }
    if (ch) updates[tok] = nr;
  }
  if (!diffs.length) return { n: 0, diffs, undo };
  await writeBuckets(updates, onProg);
  await writeLog(tipo, diffs, nota);
  derive(); emit("inv"); cacheSave("inv"); settle();
  return { n: diffs.length, diffs, undo, items: Object.keys(updates).length };
};
D.transfer = (toks, to, nota, onProg) => { const c = {}; for (const t of toks) c[t] = { [D.hRC]: to }; return D.applyChanges(c, "traslado", nota, onProg); };
D.bulkSet = (toks, campo, valor, nota, onProg) => { const c = {}; for (const t of toks) c[t] = { [campo]: valor }; return D.applyChanges(c, campo === D.hRC ? "traslado" : "edicion", nota, onProg); };
D.unify = (campo, from, to, onProg) => {
  const j = D.inv.h.indexOf(campo); const set = new Set(from); const c = {};
  for (const it of D.items) { const v = clean(it.row[j + 1]); if (set.has(v) && v !== to) c[it.tok] = { [campo]: to }; }
  return D.applyChanges(c, campo === D.hRC ? "traslado" : "edicion", "Unificación de nombres: " + from.filter((x) => x !== to).join(" / ") + " → " + to, onProg);
};
D.revert = async (diff, when) => {
  const it = D.byTok.get(diff.tok); if (!it) throw { message: "Ese artículo ya no existe." };
  const cur = D.cell(it, diff.campo);
  if (cur !== (diff.despues || "")) throw { message: `No se puede revertir: el campo ya cambió después (ahora dice «${cur || "vacío"}»).` };
  return D.applyChanges({ [diff.tok]: { [diff.campo]: diff.antes || "" } }, diff.campo === D.hRC ? "traslado" : "edicion", "Reversión del cambio del " + when);
};

/* ---------- importar Excel: primero se calcula todo, luego se aplica ---------- */
function mergeInto(target, hdr, rows) {
  hdr.forEach((h) => { if (!target.h.includes(h)) { target.h.push(h); for (const k in target.i) target.i[k].push(""); } });
  const kc = hdr.find((h) => KEY_RE.test(h)) || hdr[0];
  let max = Math.max(0, ...Object.values(target.i).map((r) => r[0]));
  let nuevos = 0, act = 0, sinClave = 0, lleno = 0;
  for (const r of rows) {
    const tok = tokOf(r.cells[kc]); if (!tok) { sinClave++; continue; }
    const old = target.i[tok];
    if (!old && Object.keys(target.i).length >= MAX) { lleno++; continue; }
    const vals = target.h.map((h, j) => hdr.includes(h) ? (r.cells[h] ?? "") : (old ? old[j + 1] : ""));
    if (old) { if (old.slice(1).join("\u0001") !== vals.join("\u0001")) act++; target.i[tok] = [old[0], ...vals]; }
    else { target.i[tok] = [++max, ...vals]; nuevos++; }
  }
  return { nuevos, act, sinClave, lleno, kc };
}
D.planImport = (hdr, rows) => {
  const before = { h: D.inv.h.slice(), i: D.inv.i };
  const tmp = { h: D.inv.h.slice(), i: {} }; for (const k in D.inv.i) tmp.i[k] = D.inv.i[k].slice();
  const r = mergeInto(tmp, hdr, rows);
  const rcH = tmp.h.find((h) => /resguard/i.test(h)), kc = tmp.h.find((h) => KEY_RE.test(h)), dc = tmp.h.find((h) => /descrip/i.test(h));
  const ix = (h) => tmp.h.indexOf(h) + 1;
  const updates = {}, diffs = [], nuevos = [], cambiados = [];
  for (const [tok, row] of Object.entries(tmp.i)) {
    const old = before.i[tok]; const mb = row[ix(kc)] || "", desc = row[ix(dc)] || "";
    if (!old) {
      updates[tok] = row; nuevos.push({ tok, n: row[0], mb, desc, rc: rcH ? row[ix(rcH)] || "" : "" });
      diffs.push({ tok, mb, desc, campo: "(alta)", antes: "", despues: "Nuevo artículo No. " + row[0] });
      if (rcH) diffs.push({ tok, mb, desc, campo: rcH, antes: "", despues: row[ix(rcH)] || "" });
      continue;
    }
    const f = [];
    tmp.h.forEach((h, j) => { const a = old[j + 1] || "", b = row[j + 1] || ""; if (a !== b) { f.push({ campo: h, antes: a, despues: b }); diffs.push({ tok, mb, desc, campo: h, antes: a, despues: b }); } });
    if (f.length) { updates[tok] = row; cambiados.push({ tok, n: row[0], mb, desc, fields: f }); }
  }
  return { tmp, r, updates, diffs, nuevos, cambiados, headersAdded: tmp.h.filter((h) => !before.h.includes(h)), rows: rows.length };
};
D.applyImport = async (plan, file, onProg) => {
  if (!Object.keys(plan.updates).length) return 0;
  if (plan.headersAdded.length) { const r = await db({ op: "update", path: "inv/meta", data: { h: plan.tmp.h } }); chain("inv", r); D.inv.h = plan.tmp.h.slice(); for (const k in D.inv.i) while (D.inv.i[k].length < D.inv.h.length + 1) D.inv.i[k].push(""); }
  await writeBuckets(plan.updates, onProg);
  await writeLog("excel", plan.diffs, file);
  derive(); emit("inv"); cacheSave("inv"); settle();
  return Object.keys(plan.updates).length;
};
D.backupJSON = () => JSON.stringify({ v: 2, db: { h: D.inv.h, i: D.inv.i }, at: Date.now() });
D.rowsFromBackup = (txt) => {
  const d = JSON.parse(txt); const src = d.db || d;
  if (src.h && src.i) return { hdr: src.h, rows: Object.values(src.i).map(([, ...v]) => ({ cells: Object.fromEntries(src.h.map((h, j) => [h, v[j] || ""])) })) };
  if (d.hdr && Array.isArray(d.rows)) return { hdr: d.hdr, rows: d.rows };
  throw { message: "Ese archivo no es un respaldo de este inventario." };
};

/* ---------- revisiones de inventario (marcas) ---------- */
function localDoc(name) { const id = nameKey(name); let d = D.marcas[id]; if (!d || d.name !== name) d = D.marcas[id] = { name, inicio: Date.now(), marks: {}, extras: {} }; d.marks = d.marks || {}; return d; }
D.setMark = async (name, tok, val) => {
  const id = nameKey(name), path = "marcas/" + id;
  const prevDoc = D.marcas[id] ? deep(D.marcas[id]) : undefined;
  const d = localDoc(name);
  if (val) d.marks[tok] = { e: val.e, c: val.c || "", n: val.n || "", by: D.user, at: Date.now() }; else delete d.marks[tok];
  attachMarks(); emit("marcas");
  try {
    const s = await db({ op: "get", path });
    let r;
    const v = val ? { e: val.e, c: val.c || "", n: val.n || "" } : null;
    if (!s.exists || s.data.name !== name) r = await db({ op: "set", path, data: { name, inicio: Date.now(), marks: v ? { [tok]: v } : {} } });
    else if (v) r = await db({ op: "update", path, data: { marks: { [tok]: v } } });
    else { const nd = s.data; nd.marks = nd.marks || {}; delete nd.marks[tok]; r = await db({ op: "set", path, data: nd }); }
    chain("marcas", r); cacheSave("marcas"); settle();
  } catch (e) {
    if (prevDoc) D.marcas[id] = prevDoc; else delete D.marcas[id];
    attachMarks(); emit("marcas"); throw e;
  }
};
async function docWrite(name, fn) {
  const id = nameKey(name), path = "marcas/" + id;
  const s = await db({ op: "get", path });
  const cur = s.exists && s.data.name === name ? s.data : { name, inicio: Date.now(), marks: {}, extras: {} };
  const nd = fn(deep(cur));
  const r = await db({ op: "set", path, data: nd });
  chain("marcas", r);
  D.marcas[id] = { ...nd, ...(nd.fin && !nd.fin.by ? { fin: { ...nd.fin, by: D.user, at: Date.now() } } : {}) };
  attachMarks(); emit("marcas"); cacheSave("marcas"); settle();
}
D.finish = (name) => docWrite(name, (d) => { d.fin = { t: Date.now() }; return d; });
D.reopen = (name) => docWrite(name, (d) => { delete d.fin; return d; });
D.resetRev = (name) => docWrite(name, () => ({ name, inicio: Date.now(), marks: {} }));

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
const fotoCache = new Map();
D.fotoUrl = async (tok, id) => {
  const k = tok + "/" + id;
  if (!fotoCache.has(k)) fotoCache.set(k, call("foto-get", { tok, id }).then((b) => URL.createObjectURL(b)).catch((e) => { fotoCache.delete(k); throw e; }));
  return fotoCache.get(k);
};
D.fotoPut = async (tok, file) => {
  const data = await shrink(file);
  const id = (Math.random().toString(36).slice(2, 8) + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)).replace(/[^A-Za-z0-9]/g, "");
  const r = await call("foto-put", { tok, id, data });
  const cur = D.fotos[tok] || { list: [] };
  if (!cur.list.some((f) => f.id === id)) cur.list.push({ id, at: Date.now(), by: D.user });
  cur.n = cur.list.length; D.fotos[tok] = cur;
  fotoCache.set(tok + "/" + id, Promise.resolve(data));
  chain("fotos", r); attachFotos(); emit("fotos"); cacheSave("fotos"); settle();
  return r;
};
D.fotoDel = async (tok, id) => {
  const r = await call("foto-del", { tok, id });
  const cur = D.fotos[tok]; if (cur) { cur.list = cur.list.filter((f) => f.id !== id); cur.n = cur.list.length; }
  chain("fotos", r); attachFotos(); emit("fotos"); cacheSave("fotos"); settle();
};

/* ---------- historial de un artículo o de una persona ---------- */
D.historyOfItem = (tok) => {
  const out = [];
  for (const c of D.cambios || []) for (const d of c.diffs || []) if (d.tok === tok) out.push({ ...d, at: c.at, by: c.by, tipo: c.tipo, nota: c.nota, cid: c.id });
  return out.sort((a, b) => b.at - a.at);
};
D.historyOfPerson = async (name) => {
  const r = await db({ op: "query", collection: "cambios", where: ["personas", "array-contains", name] });
  const out = [];
  for (const d of r.docs) for (const df of d.data.diffs || []) if (df.campo === D.hRC && (df.antes === name || df.despues === name)) out.push({ ...df, at: d.data.at, by: d.data.by, tipo: d.data.tipo, nota: d.data.nota });
  return out.sort((a, b) => a.at - b.at);
};
D.ficha = (tok) => call("item", { tok });

window.D = D;
})();
