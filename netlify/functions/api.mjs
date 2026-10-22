// Servidor del inventario CONALEP: login con contraseña + base de datos (Netlify Blobs).
// Las contraseñas NO están en el código: se leen de variables de entorno de Netlify.
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const config = { path: "/api/*" };

const COLS = new Set(["inv", "cambios", "marcas"]);
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const NB = 64;
const TTL = 14 * 24 * 3600 * 1000; // la sesión dura 14 días

const USERS = [
  { id: "Juan Moreno", env: "PASS_JUAN", aliases: ["juan moreno", "juan"] },
  { id: "Mitchell", env: "PASS_MITCHELL", aliases: ["mitchell"], admin: true },
];

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
const fail = (status, code, error) => json({ code, error }, status);

const b64u = (b) => Buffer.from(b).toString("base64url");
const sign = (payload, secret) =>
  crypto.createHmac("sha256", secret).update(payload).digest("base64url");
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeToken(user, secret) {
  const p = b64u(JSON.stringify({ u: user.id, exp: Date.now() + TTL }));
  return p + "." + sign(p, secret);
}
function readToken(req, secret) {
  const h = req.headers.get("authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  const [p, s] = t.split(".");
  if (!p || !s || !same(s, sign(p, secret))) return null;
  try {
    const d = JSON.parse(Buffer.from(p, "base64url").toString());
    if (!d.exp || d.exp < Date.now()) return null;
    return USERS.find((u) => u.id === d.u) || null;
  } catch {
    return null;
  }
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
  if (op === "delete") {
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
    if (p.col === "marcas" && isObj(data.marks)) {
      for (const m of Object.values(data.marks)) if (isObj(m)) { m.by = user.id; m.at = Date.now(); }
    }
    let out;
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

/* ---------- entrada ---------- */
export default async (req) => {
  const secret = process.env.AUTH_SECRET;
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, "");
  if (req.method !== "POST") return fail(405, "method", "Método no permitido");
  if (!secret || secret.length < 16)
    return fail(500, "config", "Falta configurar AUTH_SECRET en Netlify (variables de entorno).");
  let body;
  try {
    body = await req.json();
  } catch {
    return fail(400, "invalid_argument", "Solicitud no válida");
  }
  const s = store();

  if (route === "login") {
    const name = String(body.username || "").trim().toLowerCase();
    const user = USERS.find((u) => u.aliases.includes(name));
    const key = "fail/" + (user ? user.id.replace(/\W/g, "") : "x");
    const f = (await s.get(key, { type: "json" })) || { n: 0, t: 0 };
    if (f.n >= 8 && Date.now() - f.t < 15 * 60 * 1000)
      return fail(429, "locked", "Demasiados intentos. Espera 15 minutos.");
    const pass = user ? process.env[user.env] : "";
    const ok = !!user && !!pass && same(String(body.password || ""), pass);
    if (!ok) {
      await sleep(700);
      await s.setJSON(key, { n: (Date.now() - f.t < 15 * 60 * 1000 ? f.n : 0) + 1, t: Date.now() });
      if (user && !pass) return fail(500, "config", "Falta configurar la contraseña de este usuario en Netlify.");
      return fail(401, "unauthenticated", "Usuario o contraseña incorrectos.");
    }
    if (f.n) await s.delete(key);
    return json({ token: makeToken(user, secret), user: user.id });
  }

  const user = readToken(req, secret);
  if (!user) return fail(401, "unauthenticated", "Sesión vencida. Entra de nuevo.");

  try {
    if (route === "me") return json({ user: user.id });
    if (route === "db") return await dbOp(s, user, body);
    if (route === "item") return await itemOp(s, body);
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
