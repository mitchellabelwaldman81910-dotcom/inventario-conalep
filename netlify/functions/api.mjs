// Servidor del inventario CONALEP: login con contraseña + base de datos (Netlify Blobs).
// Las contraseñas NO están en el código: se leen de variables de entorno de Netlify.
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const config = { path: "/api/*" };

const COLS = new Set(["inv", "cambios", "marcas", "fotos", "bajas", "plantillas"]);
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const TOK_RE = /^m[A-Za-z0-9]{1,40}$/, FID_RE = /^[A-Za-z0-9_-]{6,40}$/;
const NB = 64;
const TTL = 14 * 24 * 3600 * 1000; // la sesión dura 14 días

const USERS = [
  { id: "Juan Moreno", env: "PASS_JUAN", aliases: ["juan moreno", "juan"] },
  { id: "Mitchell", env: "PASS_MITCHELL", aliases: ["mitchell"], admin: true },
];

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
const fail = (status, code, error) => json({ code, error }, status);

const b64u = (b) => Buffer.from(b).toString("base64url");
const sign = (payload, secret) =>
  crypto.createHmac("sha256", secret).update(payload).digest("base64url");
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// La firma de cada sesión depende también de la contraseña del usuario: si se cambia la contraseña en Netlify,
// todas las sesiones abiertas (incluida una robada) dejan de servir al instante.
const keyOf = (user, secret) => crypto.createHmac("sha256", secret).update("sesion|" + (process.env[user.env] || "")).digest();
function makeToken(user, secret) {
  const p = b64u(JSON.stringify({ u: user.id, iat: Date.now(), exp: Date.now() + TTL, j: crypto.randomBytes(6).toString("hex") }));
  return p + "." + sign(p, keyOf(user, secret));
}
function readToken(req, secret) {
  const h = req.headers.get("authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (t.length > 600) return null;
  const [p, s] = t.split(".");
  if (!p || !s) return null;
  try {
    const d = JSON.parse(Buffer.from(p, "base64url").toString());
    const u = USERS.find((x) => x.id === d.u);
    if (!u || !process.env[u.env] || !same(s, sign(p, keyOf(u, secret)))) return null;
    if (!d.exp || d.exp < Date.now() || (d.iat && d.iat > Date.now() + 5 * 60 * 1000)) return null;
    return u;
  } catch {
    return null;
  }
}

const ipOf = (req) => (req.headers.get("x-nf-client-connection-ip") || String(req.headers.get("x-forwarded-for") || "").split(",")[0] || "local").trim().slice(0, 64);
// bitácora de accesos: últimos 100 (quién, qué pasó, cuándo y una huella corta de la dirección; nunca la contraseña)
async function audit(s, user, ip, ev) {
  try {
    const cur = (await s.get("audit/log", { type: "json" })) || [];
    cur.push({ t: Date.now(), u: user ? user.id : "?", ev, ip: sha(ip).toString("hex").slice(0, 8) });
    await s.setJSON("audit/log", cur.slice(-100));
  } catch (e) { console.error("audit", e); }
}
const store = () => getStore({ name: "conalep", consistency: "strong" });
const bucketOf = (t) => {
  let h = 0;
  for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return "b" + String(h % NB).padStart(2, "0");
};

/* ---------- documentos ---------- */
function parsePath(p) {
  const [col, id, extra] = String(p || "").split("/");
  if (!COLS.has(col) || !ID_RE.test(id || "") || extra !== undefined) return null;
  return { col, id, key: col + "/" + id };
}
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

/* ---------- listas de baja ---------- */
const BAJA_EST = new Set(["borrador", "propuesta", "autorizada", "ejecutada", "cancelada"]);
const BAJA_MOT = new Set(["dano", "obsoleto", "desecho", "robo", "donacion", "otro"]);
const FOTO_TIPOS = new Set(["general", "etiqueta", "serie", "dano", "baja", "otro"]);
const txt = (v, n) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const fechaOk = (x) => {
  if (typeof x !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  const d = new Date(x + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x;
};
// el servidor deja el documento limpio y pone él mismo quién y cuándo (nadie firma como otra persona)
function cleanBaja(d, id, user, cur) {
  if (!isObj(d)) return null;
  const now = Date.now();
  const out = {
    id, nombre: txt(d.nombre, 120) || "Lista de bajas", estado: BAJA_EST.has(d.estado) ? d.estado : "borrador",
    fecha: fechaOk(d.fecha) ? d.fecha : "", folio: txt(d.folio, 60), resp: txt(d.resp, 80), notas: txt(d.notas, 600),
    creada: cur?.creada || (Number.isFinite(+d.creada) && +d.creada > 0 ? Math.min(+d.creada, now) : now), by: cur?.by || user.id,
    up: now, upby: user.id, items: {},
  };
  let n = 0;
  if (isObj(d.items)) for (const [t, v] of Object.entries(d.items)) {
    if (n >= 5000) break;
    if (!TOK_RE.test(t) || !isObj(v)) continue;
    const c = cur?.items?.[t];
    out.items[t] = { m: BAJA_MOT.has(v.m) ? v.m : "otro", d: txt(v.d, 200), f: fechaOk(v.f) ? v.f : "", at: c?.at || now, by: c?.by || user.id };
    n++;
  }
  return out;
}
function merge(dst, src) {
  for (const [k, v] of Object.entries(src)) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    if (isObj(v) && isObj(dst[k])) merge(dst[k], v);
    else dst[k] = v;
  }
  return dst;
}
const newVer = () => Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex");
async function bump(s, col) {
  const prev = (await s.get("ver/" + col, { type: "json" }))?.v || "";
  const v = newVer();
  await s.setJSON("ver/" + col, { v });
  return { v, prev };
}
async function getDoc(s, key) {
  return await s.get(key, { type: "json" });
}
async function listKeys(s, col) {
  const keys = [];
  let cursor;
  do {
    const r = await s.list({ prefix: col + "/", paginate: false, cursor });
    for (const b of r.blobs) keys.push(b.key);
    cursor = r.cursor;
  } while (cursor);
  return keys;
}
async function getMany(s, keys) {
  const out = [];
  for (let i = 0; i < keys.length; i += 25) {
    const part = await Promise.all(
      keys.slice(i, i + 25).map(async (k) => ({ id: k.split("/")[1], data: await getDoc(s, k) }))
    );
    for (const d of part) if (d.data) out.push(d);
  }
  return out;
}

/* ---------- datos iniciales (seed/seed.json, fuera del sitio público) ---------- */
function seedFile() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const roots = [process.env.LAMBDA_TASK_ROOT, process.cwd(), here, path.join(here, ".."), path.join(here, "../..")];
  for (const r of roots) {
    if (!r) continue;
    const f = path.join(r, "seed", "seed.json");
    if (fs.existsSync(f)) return f;
  }
  return null;
}
async function seedIfEmpty(s) {
  if (await getDoc(s, "inv/meta")) return { seeded: false };
  const f = seedFile();
  if (!f) return { seeded: false, error: "No se encontró seed/seed.json" };
  const seed = JSON.parse(fs.readFileSync(f, "utf8"));
  const ids = Object.keys(seed.buckets);
  let n = 0;
  for (let i = 0; i < ids.length; i += 16) {
    await Promise.all(ids.slice(i, i + 16).map((id) => { n += Object.keys(seed.buckets[id].items || {}).length; return s.setJSON("inv/" + id, seed.buckets[id]); }));
  }
  await s.setJSON("inv/meta", seed.meta); // al final: si algo falla antes, se reintenta completo
  await bump(s, "inv");
  return { seeded: true, items: n };
}

/* ---------- consultas ---------- */
function matches(d, [field, op, value]) {
  const v = d[field];
  if (op === "==") return v === value;
  if (op === "array-contains") return Array.isArray(v) && v.includes(value);
  return false;
}

async function dbOp(s, user, b) {
  const op = b.op;
  if (op === "version") {
    if (!COLS.has(b.collection)) return fail(400, "invalid_argument", "Colección no válida");
    const r = await s.get("ver/" + b.collection, { type: "json" });
    return json({ v: r?.v || "" });
  }
  if (op === "list" || op === "query") {
    if (!COLS.has(b.collection)) return fail(400, "invalid_argument", "Colección no válida");
    if (b.collection === "inv") await seedIfEmpty(s);
    let keys = (await listKeys(s, b.collection)).sort();
    const ob = Array.isArray(b.orderBy) ? b.orderBy : null;
    const wh = Array.isArray(b.where) ? b.where : null;
    const lim = Math.min(Number(b.limit) || 5000, 5000);
    // los ids de "cambios" empiezan con la hora: ordenar por nombre = ordenar por fecha
    if (ob && ob[0] === "at" && ob[1] === "desc") keys.reverse();
    let docs;
    if (!wh && ob) docs = await getMany(s, keys.slice(0, lim));
    else docs = await getMany(s, keys);
    if (wh) docs = docs.filter((d) => matches(d.data, wh));
    if (ob) {
      const [f, dir] = ob;
      docs.sort((x, y) => (x.data[f] > y.data[f] ? 1 : x.data[f] < y.data[f] ? -1 : 0) * (dir === "desc" ? -1 : 1));
    }
    return json({ docs: docs.slice(0, lim), v: (await s.get("ver/" + b.collection, { type: "json" }))?.v || "" });
  }
  const p = parsePath(b.path);
  if (!p) return fail(400, "invalid_argument", "Ruta no válida");
  if (op === "get") {
    if (p.col === "inv") await seedIfEmpty(s);
    const d = await getDoc(s, p.key);
    return json({ exists: !!d, data: d || null });
  }
  if ((op === "delete" || op === "set" || op === "update") && p.col === "fotos")
    return fail(403, "forbidden", "Las fotos se suben con la opción de fotos");
  if (op === "update" && p.col === "bajas") return fail(400, "invalid_argument", "Las listas de baja se guardan completas");
  if (op === "delete") {
    if (p.col === "bajas") {
      const cur = await getDoc(s, p.key);
      if (cur && ["autorizada", "ejecutada"].includes(cur.estado) && !user.admin)
        return fail(403, "forbidden", "Una lista autorizada o ya dada de baja solo la borra el administrador");
    }
    await s.delete(p.key);
    return json({ ok: true, ...(await bump(s, p.col)) });
  }
  if (op === "set" || op === "update") {
    const data = b.data;
    if (!isObj(data)) return fail(400, "invalid_argument", "Datos no válidos");
    if (JSON.stringify(data).length > 4_000_000) return fail(413, "quota_exceeded", "Demasiado grande");
    // el autor y la hora los pone el servidor: nadie puede firmar como otra persona
    if (p.col === "cambios") {
      data.by = user.id;
      data.at = Date.now();
    }
    if (p.col === "plantillas") {
      if (JSON.stringify(data).length > 3_000_000) return fail(413, "quota_exceeded", "La plantilla es demasiado grande");
      data.by = user.id;
      data.at = Date.now();
    }
    if (p.col === "marcas") {
      // solo se sella lo nuevo o lo que cambió: lo que ya estaba conserva su autor y su hora originales
      const cur = (await getDoc(s, p.key)) || {};
      const now = Date.now();
      for (const k of ["marks", "extras"]) {
        if (!isObj(data[k])) continue;
        for (const [t, m] of Object.entries(data[k])) {
          if (!isObj(m)) continue;
          const c = cur[k]?.[t];
          if (isObj(c) && c.e === m.e && (k === "extras" || c.at)) { m.by = c.by; m.at = c.at; }
          else { m.by = user.id; m.at = now; }
        }
      }
      if (isObj(data.fin)) {
        const c = cur.fin;
        if (isObj(c) && c.t === data.fin.t) { data.fin.by = c.by; data.fin.at = c.at; }
        else { data.fin.by = user.id; data.fin.at = now; }
      }
    }
    let out;
    if (p.col === "bajas") {
      const cur = await getDoc(s, p.key);
      out = cleanBaja(data, p.id, user, cur);
      if (!out) return fail(400, "invalid_argument", "Datos no válidos");
      await s.setJSON(p.key, out);
      return json({ ok: true, doc: out, ...(await bump(s, p.col)) });
    }
    if (op === "set") out = data;
    else {
      const cur = await getDoc(s, p.key);
      if (!cur) return fail(400, "invalid_argument", "El documento no existe");
      out = merge(cur, data);
    }
    await s.setJSON(p.key, out);
    return json({ ok: true, ...(await bump(s, p.col)) });
  }
  return fail(400, "invalid_argument", "Operación no válida");
}

/* ---------- ficha de un artículo (para el QR) ---------- */
async function itemOp(s, b) {
  const tok = String(b.tok || "");
  if (!/^m[A-Za-z0-9]{1,40}$/.test(tok)) return fail(400, "invalid_argument", "Marbete no válido");
  await seedIfEmpty(s);
  const meta = await getDoc(s, "inv/meta");
  const bucket = await getDoc(s, "inv/" + bucketOf(tok));
  const row = bucket?.items?.[tok];
  if (!meta || !row) return json({ found: false });
  return json({ found: true, h: meta.h, row });
}

/* ---------- fotos (JPEG en Blobs; el índice por artículo vive en la colección "fotos") ---------- */
async function fotoPut(s, user, b) {
  const tok = String(b.tok || ""), id = String(b.id || "");
  if (!TOK_RE.test(tok) || !FID_RE.test(id)) return fail(400, "invalid_argument", "Datos no válidos");
  const b64 = String(b.data || "").replace(/^data:image\/jpeg;base64,/, "");
  if (b64.length > 2_200_000) return fail(413, "quota_exceeded", "La foto es demasiado grande");
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length < 100 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff)
    return fail(400, "invalid_argument", "Solo se aceptan fotos JPEG");
  await seedIfEmpty(s);
  const bucket = await getDoc(s, "inv/" + bucketOf(tok));
  if (!bucket?.items?.[tok]) return fail(404, "not_found", "Ese marbete no existe");
  const key = "fotos/" + tok;
  const idx = (await getDoc(s, key)) || { list: [] };
  if (idx.list.some((f) => f.id === id)) return json({ ok: true, dup: true, n: idx.list.length });
  await s.set("fotob/" + tok + "/" + id, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const tipo = FOTO_TIPOS.has(b.tipo) ? b.tipo : "general", nota = txt(b.nota, 120);
  idx.list.push({ id, at: Date.now(), by: user.id, tipo, ...(nota ? { nota } : {}) });
  idx.n = idx.list.length;
  await s.setJSON(key, idx);
  return json({ ok: true, n: idx.n, ...(await bump(s, "fotos")) });
}
async function fotoGet(s, b) {
  const tok = String(b.tok || ""), id = String(b.id || "");
  if (!TOK_RE.test(tok) || !FID_RE.test(id)) return fail(400, "invalid_argument", "Datos no válidos");
  const buf = await s.get("fotob/" + tok + "/" + id, { type: "arrayBuffer" });
  if (!buf) return fail(404, "not_found", "No existe esa foto");
  return new Response(buf, { status: 200, headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=3600" } });
}
async function fotoEdit(s, user, b) {
  const tok = String(b.tok || ""), id = String(b.id || "");
  if (!TOK_RE.test(tok) || !FID_RE.test(id)) return fail(400, "invalid_argument", "Datos no válidos");
  const key = "fotos/" + tok, idx = await getDoc(s, key), f = idx?.list?.find((x) => x.id === id);
  if (!f) return fail(404, "not_found", "No existe esa foto");
  if (FOTO_TIPOS.has(b.tipo)) f.tipo = b.tipo;
  if (typeof b.nota === "string") { const n = txt(b.nota, 120); if (n) f.nota = n; else delete f.nota; }
  await s.setJSON(key, idx);
  return json({ ok: true, ...(await bump(s, "fotos")) });
}
async function fotoDel(s, user, b) {
  if (!user.admin) return fail(403, "forbidden", "Solo el administrador puede borrar fotos");
  const tok = String(b.tok || ""), id = String(b.id || "");
  if (!TOK_RE.test(tok) || !FID_RE.test(id)) return fail(400, "invalid_argument", "Datos no válidos");
  const key = "fotos/" + tok, idx = await getDoc(s, key);
  if (!idx) return json({ ok: true });
  idx.list = idx.list.filter((f) => f.id !== id);
  idx.n = idx.list.length;
  await s.setJSON(key, idx);
  await s.delete("fotob/" + tok + "/" + id);
  return json({ ok: true, n: idx.n, ...(await bump(s, "fotos")) });
}

/* ---------- entrada ---------- */
export default async (req) => {
  const secret = process.env.AUTH_SECRET;
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, "");
  if (req.method !== "POST") return fail(405, "method", "Método no permitido");
  if (!secret || secret.length < 16)
    return fail(500, "config", "Falta configurar AUTH_SECRET en Netlify (variables de entorno).");
  if (Number(req.headers.get("content-length") || 0) > 12e6) return fail(413, "too_large", "Solicitud demasiado grande");
  let body;
  try {
    body = await req.json();
  } catch {
    return fail(400, "invalid_argument", "Solicitud no válida");
  }
  const s = store();

  if (route === "login") {
    const name = String(body.username || "").trim().toLowerCase().slice(0, 60);
    const user = USERS.find((u) => u.aliases.includes(name));
    const ip = ipOf(req), WIN = 15 * 60 * 1000, now = Date.now();
    const kIp = "fail/ip-" + sha(ip).toString("hex").slice(0, 16), kUs = "fail/us-" + (user ? user.id.replace(/\W/g, "") : "x");
    const [fi, fu] = await Promise.all([s.get(kIp, { type: "json" }), s.get(kUs, { type: "json" })]);
    const ni = fi && now - fi.t < WIN ? fi.n : 0, nu = fu && now - fu.t < WIN ? fu.n : 0;
    // una dirección se bloquea a los 8 intentos; la cuenta solo a los 40 (así nadie puede dejar fuera al dueño con unos cuantos intentos)
    if (ni >= 8 || nu >= 40) { await audit(s, user, ip, "bloqueado"); return fail(429, "locked", "Demasiados intentos. Espera 15 minutos."); }
    const pass = user ? process.env[user.env] : "";
    const ok = !!user && !!pass && same(String(body.password || "").slice(0, 200), pass);
    if (!ok) {
      await sleep(600 + 250 * Math.min(ni, 8));
      await Promise.all([s.setJSON(kIp, { n: ni + 1, t: now }), s.setJSON(kUs, { n: nu + 1, t: now })]);
      await audit(s, user, ip, "fallo");
      if (user && !pass) return fail(500, "config", "Falta configurar la contraseña de este usuario en Netlify.");
      return fail(401, "unauthenticated", "Usuario o contraseña incorrectos.");
    }
    if (ni) await s.delete(kIp);
    if (nu) await s.delete(kUs);
    await audit(s, user, ip, "entró");
    return json({ token: makeToken(user, secret), user: user.id });
  }

  const user = readToken(req, secret);
  if (!user) return fail(401, "unauthenticated", "Sesión vencida. Entra de nuevo.");

  try {
    if (route === "me") return json({ user: user.id });
    if (route === "db") return await dbOp(s, user, body);
    if (route === "item") return await itemOp(s, body);
    if (route === "foto-put") return await fotoPut(s, user, body);
    if (route === "foto-get") return await fotoGet(s, body);
    if (route === "foto-edit") return await fotoEdit(s, user, body);
    if (route === "foto-del") return await fotoDel(s, user, body);
    if (route === "audit") {
      if (!user.admin) return fail(403, "forbidden", "Solo el administrador");
      return json({ log: (await s.get("audit/log", { type: "json" })) || [] });
    }
    if (route === "seed") {
      if (!user.admin) return fail(403, "forbidden", "Solo el administrador");
      return json(await seedIfEmpty(s));
    }
  } catch (e) {
    console.error(e);
    return fail(500, "internal", "Error del servidor. Intenta de nuevo.");
  }
  return fail(404, "not_found", "No existe");
};
