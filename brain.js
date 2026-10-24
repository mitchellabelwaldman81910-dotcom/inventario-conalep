/* Portal de inventario CONALEP · el "cerebro": búsqueda que entiende filtros y sinónimos,
   respuestas a preguntas en español, detecciones automáticas y puntaje de salud de los datos.
   Todo se calcula en el navegador, por reglas, sin enviar nada a otros servicios. */
(() => {
"use strict";
const SIN = "(Sin resguardante)";
const strip = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const norm = (s) => strip(s).replace(/[^a-z0-9]+/g, " ").trim();
const B = { norm, strip };

/* ---------- textos legibles ---------- */
const PART = new Set(["de", "del", "la", "las", "los", "y", "e", "el", "da", "van", "von"]);
B.title = (s) => String(s || "").toLowerCase().replace(/[a-záéíóúüñ]+/g, (w, i) => (i > 0 && PART.has(w) ? w : w[0].toUpperCase() + w.slice(1)));
const ACR = new Set(["lcd", "led", "cpu", "hp", "usb", "hdmi", "tv", "dvd", "pc", "ac", "btu", "ram", "ssd", "hdd", "dg", "sa", "cv", "ups", "ips", "lg", "ibm", "acer", "vga", "dvi", "rgb", "wifi", "pvc", "mdf", "rca", "xl", "ii", "iii", "iv", "cd", "ssd", "gb", "tb", "mb", "ghz", "hd", "fhd", "uhd", "sat", "cfe", "imss", "sep", "conalep", "jvc", "aoc", "nec", "pos", "nas", "cctv", "dvr", "nvr", "poe"]);
const UNIT = new Set(["cm", "mm", "m", "kg", "gr", "lt", "lts", "ml", "pulg", "x"]);
B.smart = (s) => {
  const t = String(s || ""); if (!t || t !== t.toUpperCase()) return t;
  let out = t.toLowerCase().replace(/[a-záéíóúüñ0-9]+/g, (w) => {
    if (UNIT.has(w)) return w;
    if (ACR.has(w) || (/\d/.test(w) && /[a-z]/.test(w))) return w.toUpperCase();
    if (w.length <= 3 && !/[aeiouyáéíóú]/.test(w) && /^[a-z]+$/.test(w)) return w.toUpperCase();
    return w;
  });
  return out.replace(/^(\s*)([a-záéíóúüñ])/, (m, a, b) => a + b.toUpperCase()).replace(/([.:;]\s+)([a-záéíóúüñ])/g, (m, a, b) => a + b.toUpperCase());
};
B.money = (n, dec = 2) => "$" + (Number(n) || 0).toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec });
B.moneyShort = (n) => { n = Number(n) || 0; const a = Math.abs(n); if (a >= 1e6) return "$" + (n / 1e6).toLocaleString("es-MX", { maximumFractionDigits: 2 }) + " M"; if (a >= 1e4) return "$" + Math.round(n / 1e3).toLocaleString("es-MX") + " mil"; return B.money(n, 0); };
B.int = (n) => Math.round(Number(n) || 0).toLocaleString("es-MX");
B.pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
B.plural = (n, one, many) => B.int(n) + " " + (n === 1 ? one : many || one + "s");
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
B.fdt = (t) => { if (!t) return ""; const d = new Date(t); return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }); };
B.fdate = (t) => { const d = new Date(t); return d.getDate() + " " + MES[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? " " + d.getFullYear() : ""); };
B.ago = (t) => {
  if (!t) return ""; const s = (Date.now() - t) / 1000;
  if (s < 45) return "hace un momento"; if (s < 90) return "hace 1 min"; if (s < 3600) return "hace " + Math.round(s / 60) + " min";
  const d = new Date(t), now = new Date(), hm = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return "hoy a las " + hm;
  const y = new Date(now); y.setDate(now.getDate() - 1); if (d.toDateString() === y.toDateString()) return "ayer a las " + hm;
  if (s < 6 * 86400) return d.toLocaleDateString("es-MX", { weekday: "long" }) + " a las " + hm;
  return B.fdate(t);
};
B.initials = (name) => { const w = String(name).replace(/[:(].*$/, "").split(/\s+/).filter((x) => x && !PART.has(x.toLowerCase())); return ((w[0] || "?")[0] + (w.length > 2 ? w[w.length - 2][0] : w[1] ? w[1][0] : "")).toUpperCase(); };

/* ---------- valores vacíos o de relleno (S/N, S/M, SIN MODELO…) ---------- */
const BLANK = /^(s\s*\/?\s*n|s\s*\/?\s*m|s\s*\/?\s*mod|n\s*\/?\s*a|n\s*\/?\s*d|sin\b.*|no\s+tiene.*|no\s+aplica|no\s+visible|ningun[oa]?|desconocid[oa]|ilegible|-+|\.+|x+|0+|\?+|na|nd)$/i;
B.blank = (v) => { const s = String(v || "").trim(); return !s || BLANK.test(s); };

/* ---------- índice de búsqueda (se rehace solo cuando cambian los datos) ---------- */
let IX = null;
function index() {
  if (IX && IX.rev === D.rev) return IX;
  const vocab = new Map(), people = new Map(), areas = new Map(), nameTok = new Map();
  for (const it of D.items) {
    it.h = " " + norm([it.mb, it.ds, it.ma, it.mo, it.se, it.ar, it.rc === SIN ? "" : it.rc, it.pr, it.cu, it.fa, it.fe].join(" | ")) + " ";
    it.hd = " " + norm(it.ds + " " + it.ma + " " + it.mo) + " ";
    for (const w of it.h.split(" ")) if (w.length > 1) vocab.set(w, (vocab.get(w) || 0) + 1);
    let p = people.get(it.rc); if (!p) people.set(it.rc, (p = [])); p.push(it);
    const ak = it.ar || "(Sin área)"; let a = areas.get(ak); if (!a) areas.set(ak, (a = [])); a.push(it);
  }
  for (const n of people.keys()) for (const w of norm(n).split(" ")) if (w.length > 2) { let s = nameTok.get(w); if (!s) nameTok.set(w, (s = new Set())); s.add(n); }
  IX = { rev: D.rev, vocab, vocabList: [...vocab.keys()], people, areas, nameTok, dup: null, ppl: null, tot: null };
  return IX;
}
B.index = index;
B.peopleMap = () => index().people;
B.areasMap = () => index().areas;
B.names = () => [...index().people.keys()].filter((n) => n !== SIN).sort((a, b) => a.localeCompare(b, "es"));
B.areaNames = () => [...index().areas.keys()].filter((n) => n !== "(Sin área)").sort((a, b) => a.localeCompare(b, "es"));

/* ---------- sinónimos y plurales ---------- */
const SYN = [
  ["computadora", "computadoras", "~compu", "~compus", "pc", "cpu", "desktop", "all in one", "thinkcentre", "workstation", "laptop"],
  ["laptop", "laptops", "portatil", "portatiles", "notebook", "lap top"],
  ["monitor", "monitores", "pantalla", "display", "thinkvision"],
  ["television", "televisiones", "~tele", "tv", "televisor", "smart tv", "pantalla"],
  ["impresora", "impresoras", "multifuncional", "printer"],
  ["proyector", "proyectores", "canon", "videoproyector", "video proyector"],
  ["aire acondicionado", "aire", "aires", "clima", "climas", "minisplit", "mini split", "split"],
  ["asiento", "asientos", "silla", "butaca", "banco"],
  ["archivero", "archiveros", "gabinete"],
  ["anaquel", "anaqueles", "estante", "estantes", "librero", "libreros", "estanteria"],
  ["pintarron", "pintarrones", "pizarron", "pizarrones", "pizarra"],
  ["no break", "nobreak", "ups", "regulador"],
  ["bocina", "bocinas", "altavoz", "sonido", "audio"],
  ["refrigerador", "refrigeradores", "frigobar", "~refri"],
  ["vehiculo", "vehiculos", "automovil", "camioneta", "~carro", "~auto"],
  ["red", "switch", "router", "access point", "rack"],
  ["telefono", "telefonos", "conmutador"],
];
const SYNMAP = new Map(); for (const g of SYN) { const use = g.filter((x) => x[0] !== "~"); for (const w0 of g) { const w = w0.replace("~", ""); const s = SYNMAP.get(w) || new Set(); use.forEach((x) => s.add(x)); SYNMAP.set(w, s); } }
function alts(w) {
  const a = new Set([w]);
  if (w.length > 4 && w.endsWith("es")) { a.add(w.slice(0, -2)); a.add(w.slice(0, -1)); }
  else if (w.length > 3 && w.endsWith("s") && !/\d/.test(w)) a.add(w.slice(0, -1));
  let slang = false;
  for (const x of [...a]) { const s = SYNMAP.get(x); if (s) { s.forEach((y) => a.add(y)); if (!s.has(x)) slang = true; } }
  if (slang) { a.delete(w); if (w.endsWith("s")) a.delete(w.slice(0, -1)); }
  return [...a];
}
const hasAlt = (h, alt) => (alt.length <= 2 ? h.includes(" " + alt + " ") : h.includes(" " + alt));

/* distancia de edición (con transposición) para corregir errores de dedo */
function dl(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length; let prev2 = null, prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i]; let best = i;
    for (let j = 1; j <= n; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v; if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev2 = prev; prev = cur;
  }
  return prev[n];
}
B.dl = dl;
function correct(w) {
  const ix = index(); const max = w.length >= 8 ? 2 : w.length >= 5 ? 1 : 0; if (!max) return null;
  let best = null, bd = max + 1, bc = 0;
  for (const v of ix.vocabList) {
    if (v[0] !== w[0] || Math.abs(v.length - w.length) > max) continue;
    const d = dl(w, v, max); const c = ix.vocab.get(v);
    if (d < bd || (d === bd && c > bc)) { best = v; bd = d; bc = c; }
  }
  return bd <= max ? best : null;
}

/* ---------- lector de búsquedas: filtros, comparaciones, frases y palabras ---------- */
const STOP = new Set("resguardante resguardantes persona personas maestro maestra profe profesor profesora lic licenciado licenciada ing ingeniero ingeniera don dona senor senora sr sra mtro mtra el la los las un una unos unas de del al a en y o u por para con sus su mi mis me se le les lo que cual cuales quien quienes donde como cuando cuanto cuanta cuantos cuantas tiene tienen tengo tenemos hay existen esta estan son es fue ser dame dime muestrame muestra ensename ver lista listar busca buscar encuentra encontrar todos todas todo toda articulo articulos bienes bien cosas objetos inventario inventariado favor porfa porfavor gracias hola quiero quisiera necesito saber tiene tienen mas menos esos esas estos estas ese esa este aqui hoy actualmente total totales numero cantidad".split(" "));
const FIELDS = { marbete: "mb", mb: "mb", desc: "ds", descripcion: "ds", articulo: "ds", marca: "ma", modelo: "mo", serie: "se", ns: "se", area: "ar", ubicacion: "ar", res: "rc", resguardante: "rc", persona: "rc", cuenta: "cu", factura: "fa", proveedor: "pr", prov: "pr", ano: "y", anio: "y", year: "y" };
const FLAB = { mb: "Marbete", ds: "Descripción", ma: "Marca", mo: "Modelo", se: "Serie", ar: "Área", rc: "Resguardante", cu: "Cuenta", fa: "Factura", pr: "Proveedor", y: "Año" };
const toNum = (s, k) => { let n = parseFloat(String(s).replace(/,/g, "")); if (!isFinite(n)) return null; if (k) n *= 1000; return n; };
const FLAGS = [
  [/\bsin (?:numero de |no de |num de )?serie\b|\bsin ns\b/, "Sin número de serie", (it) => B.blank(it.se)],
  [/\bcon (?:numero de )?serie\b/, "Con número de serie", (it) => !B.blank(it.se)],
  [/\bsin marca\b/, "Sin marca", (it) => B.blank(it.ma)],
  [/\bsin modelo\b/, "Sin modelo", (it) => B.blank(it.mo)],
  [/\bsin (?:importe|valor|precio|costo)\b/, "Sin importe", (it) => !it.im],
  [/\bsin (?:area|ubicacion)\b/, "Sin área", (it) => !it.ar],
  [/\bsin (?:resguardante|responsable|dueno)\b/, "Sin resguardante", (it) => it.rc === SIN],
  [/\bsin fotos?\b/, "Sin foto", (it) => !it.fotos],
  [/\bcon fotos?\b/, "Con foto", (it) => it.fotos > 0],
  [/\b(?:faltantes?|no (?:esta|estan|se encontr[oa]|se encuentran?|encontrad[oa]s?|aparecen?|localizad[oa]s?)|perdid[oa]s?|extraviad[oa]s?)\b/, "No está (faltante)", (it) => it.mark?.e === "no"],
  [/\b(?:pendientes?|sin (?:revisar|inventariar|verificar|marcar)|no revisad[oa]s?|por revisar)\b/, "Pendiente de revisar", (it) => !it.mark],
  [/\b(?:presentes?|encontrad[oa]s?|verificad[oa]s?|localizad[oa]s?)\b/, "Presente", (it) => it.mark?.e === "si"],
  [/\b(?:revisad[oa]s?|inventariad[oa]s?)\b/, "Ya revisado", (it) => !!it.mark],
  [/\b(?:en )?mal estado\b|\b(?:mal[oa]s|danad[oa]s?|descompuest[oa]s?|rot[oa]s?|averiad[oa]s?|estropead[oa]s?)\b|\bmalo\b/, "Estado físico: malo", (it) => it.mark?.c === "M"],
  [/\b(?:en )?estado regular\b|\bregular(?:es)?\b/, "Estado físico: regular", (it) => it.mark?.c === "R"],
  [/\b(?:en )?buen estado\b|\bbuen[oa]s?\b/, "Estado físico: bueno", (it) => it.mark?.e === "si" && (!it.mark.c || it.mark.c === "B")],
  [/\bcon (?:observaciones|notas?|comentarios?)\b/, "Con observaciones", (it) => !!it.mark?.n],
  [/\b(?:series? )?(?:duplicad[oa]s?|repetid[oa]s?)\b/, "Serie repetida", (it) => dupSet().has(it.tok)],
  [/\b(?:para baja|de baja|dar de baja|bajas?)\b/, "Señalado para baja", (it) => /\bbaja\b/i.test(it.ar + " " + it.rc)],
  [/\b(?:por localizar|localizar)\b/, "Señalado para localizar", (it) => /localizar/i.test(it.ar + " " + it.rc)],
];
function parse(q) {
  const P = { q: String(q || ""), filters: [], words: [], fixed: [], mbExact: null, cmp: [] };
  let raw = strip(q).replace(/[¿?¡!]/g, " ");
  const add = (k, label, fn) => P.filters.push({ k, label, fn });
  // campo:valor
  raw = raw.replace(/\b(marbete|mb|desc|descripcion|articulo|marca|modelo|serie|ns|area|ubicacion|res|resguardante|persona|cuenta|factura|proveedor|prov|ano|anio|year)\s*:\s*(?:"([^"]*)"|(\S+))/g, (m, f, vq, v) => {
    const key = FIELDS[f], val = norm(vq ?? v); if (!val) return " ";
    if (key === "y") { const y = +val; add("y", "Año " + y, (it) => it.y === y); }
    else add(key, FLAB[key] + ": " + (vq ?? v), (it) => (" " + norm(key === "rc" && it.rc === SIN ? "" : it[key]) + " ").includes(" " + val));
    return " ";
  });
  // importes: >5000, <=1000, $1000-5000, mayor a 10 mil, más de $5000, entre 1000 y 2000, menos de 500 pesos
  const cmp = (op, n, label) => { if (n == null) return; P.cmp.push([op, n]); add("im", label, op === ">" ? (it) => it.im > n : op === ">=" ? (it) => it.im >= n : op === "<" ? (it) => it.im < n && it.im > 0 : op === "<=" ? (it) => it.im <= n && it.im > 0 : (it) => it.im >= n[0] && it.im <= n[1]); };
  raw = raw.replace(/(^|\s)(>=|<=|>|<)\s*\$?\s*([\d.,]+)\s*(k|mil)?(?=\s|$)/g, (m, sp, op, num, k) => { const n = toNum(num, k); cmp(op, n, (op[0] === ">" ? "Más de " : "Menos de ") + B.money(n, 0)); return " "; });
  raw = raw.replace(/\bentre\s+\$?\s*([\d.,]+)\s*(k|mil)?\s*(?:pesos\s*)?y\s+\$?\s*([\d.,]+)\s*(k|mil)?(?:\s*pesos)?/g, (m, a, ka, b, kb) => { const x = toNum(a, ka), y = toNum(b, kb); cmp("rng", [Math.min(x, y), Math.max(x, y)], "Entre " + B.money(Math.min(x, y), 0) + " y " + B.money(Math.max(x, y), 0)); return " "; });
  raw = raw.replace(/\$\s*([\d.,]+)\s*(k|mil)?\s*(?:-|a|hasta)\s*\$?\s*([\d.,]+)\s*(k|mil)?/g, (m, a, ka, b, kb) => { const x = toNum(a, ka), y = toNum(b, kb); cmp("rng", [Math.min(x, y), Math.max(x, y)], "Entre " + B.money(Math.min(x, y), 0) + " y " + B.money(Math.max(x, y), 0)); return " "; });
  // antigüedad: más de 10 años, antes de 2010, después de 2020, del 2022
  const yr = new Date().getFullYear();
  raw = raw.replace(/\b(?:con )?(?:mas de|mayor(?:es)? (?:a|de)|arriba de)\s+(\d{1,2})\s+anos?(?: de antiguedad)?\b/g, (m, n) => { const lim = yr - +n; add("y", "Más de " + n + " años", (it) => it.y && it.y < lim); return " "; });
  raw = raw.replace(/\b(?:con )?(?:menos de)\s+(\d{1,2})\s+anos?(?: de antiguedad)?\b/g, (m, n) => { const lim = yr - +n; add("y", "Menos de " + n + " años", (it) => it.y && it.y >= lim); return " "; });
  raw = raw.replace(/\b(?:antes del?|anteriores? a)\s+((?:19|20)\d\d)\b/g, (m, y) => { add("y", "Antes de " + y, (it) => it.y && it.y < +y); return " "; });
  raw = raw.replace(/\b(?:despues del?|desde (?:el )?|a partir del?|posteriores? a)\s*((?:19|20)\d\d)\b/g, (m, y) => { add("y", "Desde " + y, (it) => it.y >= +y); return " "; });
  raw = raw.replace(/\b(?:del|de|en el|en|ano|comprad[oa]s? en)\s+((?:19[7-9]|20[0-4])\d)\b/g, (m, y) => { add("y", "Año " + y, (it) => it.y === +y); return " "; });
  raw = raw.replace(/\b(?:mayor(?:es)?|arriba|por encima|mas car[oa]s?)\s+(?:a|de|que)\s+\$?\s*([\d.,]+)\s*(k|mil)?(?:\s*pesos)?/g, (m, a, k) => { const n = toNum(a, k); cmp(">", n, "Más de " + B.money(n, 0)); return " "; });
  raw = raw.replace(/\b(?:menor(?:es)?|debajo|por debajo|mas barat[oa]s?)\s+(?:a|de|que)\s+\$?\s*([\d.,]+)\s*(k|mil)?(?:\s*pesos)?/g, (m, a, k) => { const n = toNum(a, k); cmp("<", n, "Menos de " + B.money(n, 0)); return " "; });
  raw = raw.replace(/\bmas de\s+(\$\s*[\d.,]+\s*(?:k|mil)?|[\d.,]+\s*(?:k|mil)?\s*pesos|[\d.,]{3,}(?:\s*(?:k|mil))?)/g, (m, a) => { const k = /k|mil/.test(a); const n = toNum(a.replace(/[^\d.,]/g, ""), k); cmp(">", n, "Más de " + B.money(n, 0)); return " "; });
  raw = raw.replace(/\bmenos de\s+(\$\s*[\d.,]+\s*(?:k|mil)?|[\d.,]+\s*(?:k|mil)?\s*pesos|[\d.,]{3,}(?:\s*(?:k|mil))?)/g, (m, a) => { const k = /k|mil/.test(a); const n = toNum(a.replace(/[^\d.,]/g, ""), k); cmp("<", n, "Menos de " + B.money(n, 0)); return " "; });
  // palabras que solo anuncian un área ("el área de biblioteca", "en la ubicación …")
  raw = raw.replace(/\b(?:el |la |en el |en la )?(?:area|areas|ubicacion|zona|departamento)\s+(?:de la |de los |del |de )?(?=\S)/g, " ");
  // frases con significado
  let s = " " + norm(raw) + " ";
  for (const [re, label, fn] of FLAGS) { const g = new RegExp(re.source, "g"); if (g.test(s)) { add("flag", label, fn); s = s.replace(new RegExp(re.source, "g"), " "); } }
  // palabras sueltas
  const ix = index();
  for (const w of s.split(" ")) {
    if (!w || STOP.has(w) || (w.length < 2 && !/\d/.test(w)) || w === "pesos") continue;
    let a = alts(w);
    if (!a.some((x) => ix.vocabList.some((v) => (x.length <= 2 ? v === x : v.startsWith(x))))) {
      const c = correct(w); if (c) { P.fixed.push([w, c]); a = alts(c); }
    }
    if (/^\d{3,}$/.test(w)) P.mbExact = w;
    P.words.push({ w: a[0] === w ? w : a[0], a });
  }
  P.empty = !P.words.length && !P.filters.length;
  return P;
}
B.parse = parse;
B.matches = (it, P) => { for (const f of P.filters) if (!f.fn(it)) return false; for (const w of P.words) { let ok = false; for (const x of w.a) if (hasAlt(it.h, x)) { ok = true; break; } if (!ok) return false; } return true; };
function score(it, P) {
  let s = 0;
  for (const w of P.words) {
    if (it.mb && norm(it.mb) === w.w) s += 1000; else if (it.mb && norm(it.mb).startsWith(w.w)) s += 40;
    for (const x of w.a) if (hasAlt(it.hd, x)) { s += 8; break; }
    if (it.hd.startsWith(" " + w.w)) s += 4;
  }
  return s;
}
B.filter = (list, P) => { index(); if (P.empty) return list.slice(); const out = []; for (const it of list) if (B.matches(it, P)) out.push(it); return out; };
B.search = (q, limit = 60) => {
  const P = parse(q); if (P.empty) return { P, list: [], total: 0 };
  const all = B.filter(D.items, P);
  if (P.words.length) { for (const it of all) it._s = score(it, P); all.sort((a, b) => b._s - a._s || a.n - b.n); }
  return { P, list: all.slice(0, limit), total: all.length, all };
};
B.findMb = (code) => {
  const c = String(code || "").trim(); if (!c) return null;
  const m = /#(m[A-Za-z0-9]+)/.exec(c); if (m) return D.byTok.get(m[1]) || null;
  const tok = D.tokOf(c); return D.byTok.get(tok) || D.items.find((x) => norm(x.mb) === norm(c)) || null;
};

/* ---------- agregados ---------- */
B.sum = (list) => list.reduce((s, it) => s + it.im, 0);
B.groupBy = (list, key) => {
  const m = new Map();
  for (const it of list) { const k = typeof key === "function" ? key(it) : it[key] || ""; let g = m.get(k); if (!g) m.set(k, (g = { key: k, n: 0, val: 0, items: [] })); g.n++; g.val += it.im; g.items.push(it); }
  return [...m.values()].sort((a, b) => b.n - a.n || String(a.key).localeCompare(String(b.key), "es"));
};
B.person = (name) => {
  const items = index().people.get(name) || [];
  const p = { name, items, total: items.length, si: 0, no: 0, pend: 0, reg: 0, mal: 0, notes: 0, val: 0, valNo: 0, lastAt: 0 };
  for (const it of items) {
    p.val += it.im; const m = it.mark;
    if (m?.e === "si") { p.si++; if (m.c === "R") p.reg++; else if (m.c === "M") p.mal++; } else if (m?.e === "no") { p.no++; p.valNo += it.im; } else p.pend++;
    if (m?.n) p.notes++; if (m?.at > p.lastAt) p.lastAt = m.at;
  }
  const doc = D.docOf(name); p.doc = doc; p.fin = doc?.fin || null; p.inicio = doc?.inicio || 0; p.extras = doc?.extras || {};
  p.rev = p.si + p.no; p.pct = B.pct(p.rev, p.total);
  p.status = p.fin ? "fin" : p.rev ? "curso" : "nada";
  return p;
};
B.people = () => { const ix = index(); if (ix.ppl && ix.pplRev === D.rev) return ix.ppl; ix.ppl = [...ix.people.keys()].map(B.person).sort((a, b) => a.name.localeCompare(b.name, "es")); ix.pplRev = D.rev; return ix.ppl; };
B.totals = () => {
  const t = { items: D.items.length, val: 0, si: 0, no: 0, pend: 0, reg: 0, mal: 0, fotos: 0, valNo: 0 };
  for (const it of D.items) { t.val += it.im; const m = it.mark; if (m?.e === "si") { t.si++; if (m.c === "R") t.reg++; else if (m.c === "M") t.mal++; } else if (m?.e === "no") { t.no++; t.valNo += it.im; } else t.pend++; if (it.fotos) t.fotos++; }
  const ppl = B.people(); t.people = ppl.filter((p) => p.name !== SIN).length; t.areas = index().areas.size; t.fin = ppl.filter((p) => p.fin).length; t.started = ppl.filter((p) => p.rev && !p.fin).length;
  t.rev = t.si + t.no; t.pct = B.pct(t.rev, t.items);
  return t;
};
/* lo último que se marcó en todas las revisiones (para la vista En vivo) */
B.feed = (limit = 60) => {
  const out = [];
  for (const d of Object.values(D.marcas)) {
    if (!d || !d.name) continue;
    for (const [tok, m] of Object.entries(d.marks || {})) if (m && m.at) out.push({ k: "mark", name: d.name, tok, it: D.byTok.get(tok), e: m.e, c: m.c, n: m.n, by: m.by, at: m.at });
    for (const [tok, x] of Object.entries(d.extras || {})) if (x && x.at) out.push({ k: "extra", name: d.name, tok, it: D.byTok.get(tok), n: x.n, by: x.by, at: x.at });
    if (d.fin && d.fin.at) out.push({ k: "fin", name: d.name, by: d.fin.by, at: d.fin.at });
  }
  return out.sort((a, b) => b.at - a.at).slice(0, limit);
};

/* lo que pasó hoy, en una frase */
B.todayLine = () => {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0); const t0 = d0.getTime();
  let marks = 0; const fins = [];
  for (const d of Object.values(D.marcas)) { if (!d) continue; for (const m of Object.values(d.marks || {})) if (m?.at >= t0) marks++; if (d.fin?.at >= t0) fins.push(d.name); }
  const ch = (D.cambios || []).filter((c) => c.at >= t0).reduce((s, c) => s + (c.diffs || []).length, 0);
  const parts = [];
  if (marks) parts.push(`hoy se ${marks === 1 ? "revisó 1 artículo" : "revisaron " + B.int(marks) + " artículos"}`);
  if (fins.length) parts.push(`${fins.length === 1 ? B.title(fins[0]) + " terminó su inventario" : B.int(fins.length) + " resguardos terminados"}`);
  if (ch) parts.push(`${B.plural(ch, "cambio")} en la bitácora`);
  return parts.join(", ");
};
/* contexto de un artículo: iguales, serie repetida, señales de baja */
B.context = (it) => {
  const out = [];
  const same = D.items.filter((x) => x !== it && x.ds === it.ds);
  if (same.length) { const ppl = new Set(same.concat(it).map((x) => x.rc)).size; out.push({ icon: "copy", text: `Hay ${B.plural(same.length, "artículo igual", "artículos iguales")} con esta descripción, con ${B.plural(ppl, "resguardante")}.`, q: 'desc:"' + it.ds + '"' }); }
  if (dupSet().has(it.tok)) { const g = B.dupGroups().find((x) => x.items.includes(it)); out.push({ icon: "help", warn: 1, text: `Su número de serie se repite en ${B.plural(g.items.length - 1, "marbete más", "marbetes más")}. Puede ser un error de captura.`, q: 'serie:"' + it.se + '"' }); }
  if (/\bbaja\b/i.test(it.ar + " " + it.rc)) out.push({ icon: "archive", warn: 1, text: "Está señalado para baja (" + B.smart(it.ar || it.rc) + ")." });
  if (/localizar/i.test(it.ar + " " + it.rc)) out.push({ icon: "pin", warn: 1, text: "Está señalado como «por localizar»." });
  if (it.y && new Date().getFullYear() - it.y >= 15) out.push({ icon: "hourglass", text: `Tiene ${new Date().getFullYear() - it.y} años (factura de ${it.y}).` });
  const nv = B.nameVariants().find((g) => g.names.some((x) => x.name === it.rc));
  if (nv) out.push({ icon: "people", warn: 1, text: `El nombre del resguardante parece duplicado de ${nv.names.filter((x) => x.name !== it.rc).map((x) => B.title(x.name)).join(", ")}.`, go: "#/salud?ver=nombres" });
  return out;
};

/* ---------- detecciones ---------- */
function dupSet() {
  const ix = index(); if (ix.dup) return ix.dup.set;
  const m = new Map();
  for (const it of D.items) { if (B.blank(it.se)) continue; const k = it.se.toUpperCase().replace(/[^A-Z0-9]/g, ""); if (k.length < 5 || /^0+$/.test(k)) continue; let g = m.get(k); if (!g) m.set(k, (g = [])); g.push(it); }
  const groups = [...m.entries()].filter(([, l]) => l.length > 1).map(([k, l]) => ({ serie: l[0].se, key: k, items: l })).sort((a, b) => b.items.length - a.items.length);
  const set = new Set(); for (const g of groups) for (const it of g.items) set.add(it.tok);
  ix.dup = { groups, set }; return set;
}
B.dupGroups = () => { dupSet(); return index().dup.groups; };

/* nombres de resguardante que parecen la misma persona */
function nameParts(n) { const base = n.split(":")[0].trim(); const t = norm(base).split(" ").filter(Boolean); return { n, base, t, key: t.join(" ") }; }
B.nameVariants = () => {
  const ix = index(); if (ix.nv) return ix.nv;
  const names = B.names(); const P = names.map(nameParts);
  const par = names.map((_, i) => i); const find = (i) => (par[i] === i ? i : (par[i] = find(par[i]))); const why = new Map();
  const join = (i, j, r) => { const a = find(i), b = find(j); if (a !== b) par[a] = b; why.set(i + "," + j, r); };
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const a = P[i], b = P[j];
    if (a.key === b.key) { join(i, j, "mismo nombre con ubicación"); continue; }
    if (a.key.length >= 10 && b.key.length >= 10 && dl(a.key, b.key, 2) <= 2) { join(i, j, "posible error de escritura"); continue; }
    const [s, l] = a.t.length <= b.t.length ? [a, b] : [b, a];
    if (!s.t.length || s.t[0].length < 3) continue;
    const L = new Set(l.t);
    if (s.t.length === 1) { if (L.has(s.t[0]) && l.t[0] === s.t[0]) join(i, j, "nombre incompleto"); continue; }
    const sur = s.t.length >= 3 ? s.t.slice(-2) : s.t.slice(-1);
    if (L.has(s.t[0]) && sur.some((x) => x.length >= 3 && L.has(x) && x !== s.t[0])) join(i, j, "nombre incompleto o con texto extra");
  }
  const cl = new Map(); names.forEach((n, i) => { const r = find(i); if (!cl.has(r)) cl.set(r, []); cl.get(r).push(n); });
  const out = [...cl.values()].filter((g) => g.length > 1).map((g) => {
    const counts = g.map((n) => ({ name: n, n: ix.people.get(n)?.length || 0 })).sort((a, b) => b.n - a.n);
    const reasons = new Set(); for (const [k, r] of why) { const [x, y] = k.split(",").map(Number); if (g.includes(names[x]) && g.includes(names[y])) reasons.add(r); }
    return { names: counts, target: counts[0].name, reasons: [...reasons], total: counts.reduce((s, x) => s + x.n, 0) };
  }).sort((a, b) => b.total - a.total);
  ix.nv = out; return out;
};
/* áreas escritas de varias formas (AULA D2 / AULAD2, FORMACIÓN / FORMACION, LAB DE INF01 / LABORATORIO INFORMATICA 1) */
function areaKey(a) {
  let s = norm(a).replace(/\bedifico\b/g, "edificio");
  let m = /(?:edificio|edif)\s*([a-h])\s*aula\s*0*(\d{1,2})\b/.exec(s) || /\baula\s*([a-h])\s*0*(\d{1,2})\b/.exec(s.replace(/aula([a-h])/, "aula $1"));
  if (m) return "aula-" + m[1] + m[2];
  m = /\baula\s*0*(\d{1,2})\s*edificio\s*([a-h])\b/.exec(s); if (m) return "aula-" + m[2] + m[1];
  m = /\blab\w*\s*(?:de\s*)?inf\w*\s*0*(\d)\b/.exec(s.replace(/inf0/, "inf 0")); if (m) return "labinf-" + m[1];
  return s.replace(/\s+/g, "").replace(/s$/, "");
}
B.areaVariants = () => {
  const ix = index(); if (ix.av) return ix.av;
  const m = new Map();
  for (const a of B.areaNames()) { const k = areaKey(a); let g = m.get(k); if (!g) m.set(k, (g = [])); g.push(a); }
  const keys = [...m.keys()];
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const a = keys[i], b = keys[j]; if (!m.has(a) || !m.has(b) || a.length < 9 || b.length < 9) continue;
    if (dl(a, b, 1) <= 1) { m.get(a).push(...m.get(b)); m.delete(b); }
  }
  const out = [...m.values()].filter((g) => g.length > 1).map((g) => {
    const counts = g.map((n) => ({ name: n, n: ix.areas.get(n)?.length || 0 })).sort((a, b) => b.n - a.n);
    return { names: counts, target: counts[0].name, total: counts.reduce((s, x) => s + x.n, 0) };
  }).sort((a, b) => b.total - a.total);
  ix.av = out; return out;
};
const NOT_PERSON = /\b(areas?|localizar|checar|baja|transferencia|inventarios?|bodega|almacen|oficina|bienes|sitaconqroo|sindicato|general)\b|\d/i;
B.notPeople = () => B.names().filter((n) => { const b = n.split(":")[0].trim(); return NOT_PERSON.test(b) || b.split(/\s+/).length < 2; }).map((n) => ({ name: n, n: index().people.get(n).length }));

B.health = () => {
  const ix = index(); if (ix.hl && ix.hlRev === D.rev) return ix.hl;
  const N = D.items.length || 1;
  const F = [
    ["ds", "Descripción", 15, (it) => !B.blank(it.ds), "sin descripción"],
    ["rc", "Resguardante", 20, (it) => it.rc !== SIN, "sin resguardante"],
    ["ar", "Área", 15, (it) => !!it.ar, "sin área"],
    ["im", "Importe", 15, (it) => it.im > 0, "sin importe"],
    ["ma", "Marca", 10, (it) => !B.blank(it.ma), "sin marca"],
    ["mo", "Modelo", 10, (it) => !B.blank(it.mo), "sin modelo"],
    ["se", "Número de serie", 15, (it) => !B.blank(it.se), "sin número de serie"],
  ].filter(([k]) => ({ ds: D.K.DS, rc: D.K.RC, ar: D.K.AR, im: D.K.IM, ma: D.K.MA, mo: D.K.MO, se: D.K.SE }[k] >= 0));
  const fields = F.map(([k, label, w, ok, q]) => { let n = 0; for (const it of D.items) if (ok(it)) n++; return { k, label, w, ok: n, miss: D.items.length - n, pct: n / N, q }; });
  const W = fields.reduce((s, f) => s + f.w, 0) || 1;
  const comp = fields.reduce((s, f) => s + f.w * f.pct, 0) / W;
  const dups = dupSet().size, nv = B.nameVariants().length, av = B.areaVariants().length, np = B.notPeople().length;
  const cons = Math.max(0, 1 - Math.min(1, dups / N * 4) * 0.4 - Math.min(1, nv / 8) * 0.3 - Math.min(1, av / 15) * 0.2 - Math.min(1, np / 10) * 0.1);
  const score = Math.round((comp * 0.8 + cons * 0.2) * 100);
  ix.hl = { score, comp, cons, fields, dups, nv, av, np }; ix.hlRev = D.rev;
  return ix.hl;
};

/* lista priorizada de lo que conviene atender */
B.insights = () => {
  const out = [], t = B.totals();
  const nv = B.nameVariants();
  if (nv.length) out.push({ id: "nv", sev: 2, icon: "people", title: `${B.plural(nv.length, "grupo")} de resguardantes ${nv.length === 1 ? "parece" : "parecen"} la misma persona`, detail: nv.slice(0, 3).map((g) => g.names.map((x) => B.title(x.name)).join(" · ")).join("  /  "), act: { label: "Revisar y unificar", go: "#/salud?ver=nombres" } });
  const dg = B.dupGroups();
  if (dg.length) { const n = dg.reduce((s, g) => s + g.items.length, 0); out.push({ id: "dup", sev: 2, icon: "copy", title: `${B.plural(n, "artículo")} comparten número de serie con otro`, detail: `La serie ${dg[0].serie} aparece en ${dg[0].items.length} marbetes distintos.`, act: { label: "Ver los repetidos", q: "serie repetida" } }); }
  const bj = D.items.filter((it) => /\bbaja\b/i.test(it.ar + " " + it.rc));
  if (bj.length) out.push({ id: "baja", sev: 1, icon: "archive", title: `${B.plural(bj.length, "artículo")} ${bj.length === 1 ? "está señalado" : "están señalados"} para baja`, detail: `Suman ${B.money(B.sum(bj))}. Siguen contando en el inventario hasta que se den de baja.`, act: { label: "Ver la lista", q: "para baja" } });
  const lc = D.items.filter((it) => /localizar/i.test(it.ar + " " + it.rc));
  if (lc.length) out.push({ id: "loc", sev: 2, icon: "pin", title: `${B.plural(lc.length, "artículo")} por localizar`, detail: "Su área o resguardante dice LOCALIZAR.", act: { label: "Ver cuáles", q: "por localizar" } });
  if (t.no) out.push({ id: "no", sev: 3, icon: "x", title: `${B.plural(t.no, "artículo")} no ${t.no === 1 ? "se encontró" : "se encontraron"} en la revisión`, detail: `Valor de lo que falta: ${B.money(t.valNo)}.`, act: { label: "Ver faltantes", q: "faltantes" } });
  if (t.mal) out.push({ id: "mal", sev: 1, icon: "wrench", title: `${B.plural(t.mal, "artículo")} en mal estado`, detail: "Marcados como Malo durante la revisión. Candidatos a reparación o baja.", act: { label: "Ver cuáles", q: "mal estado" } });
  const av = B.areaVariants();
  if (av.length) out.push({ id: "av", sev: 1, icon: "map", title: `${B.int(av.length)} ${av.length === 1 ? "área escrita" : "áreas escritas"} de varias formas`, detail: av.slice(0, 2).map((g) => g.names.map((x) => x.name).join(" = ")).join("  /  "), act: { label: "Revisar áreas", go: "#/salud?ver=areas" } });
  const np = B.notPeople();
  if (np.length) out.push({ id: "np", sev: 1, icon: "help", title: `${B.plural(np.length, "resguardante")} no ${np.length === 1 ? "parece" : "parecen"} una persona`, detail: np.slice(0, 4).map((x) => x.name).join(" · "), act: { label: "Ver resguardantes", go: "#/salud?ver=nombres" } });
  const ppl = B.people().filter((p) => p.name !== SIN);
  const stale = ppl.filter((p) => !p.fin && p.rev && p.lastAt && Date.now() - p.lastAt > 7 * 864e5);
  if (stale.length) out.push({ id: "stale", sev: 1, icon: "clock", title: `${B.plural(stale.length, "revisión", "revisiones")} sin avance en más de una semana`, detail: stale.slice(0, 3).map((p) => `${B.title(p.name)} (${p.pct}%)`).join(" · "), act: { label: "Ver avance", go: "#/vivo" } });
  const ex = ppl.reduce((s, p) => s + Object.keys(p.extras || {}).length, 0);
  if (ex) out.push({ id: "ex", sev: 2, icon: "plus", title: `${B.plural(ex, "artículo")} ${ex === 1 ? "encontrado" : "encontrados"} que no estaba${ex === 1 ? "" : "n"} en la lista`, detail: "Reportados desde la app durante la revisión. Hay que darlos de alta o aclararlos.", act: { label: "Ver en vivo", go: "#/vivo" } });
  const yr = new Date().getFullYear(); const old = D.items.filter((it) => it.y && yr - it.y >= 15);
  if (old.length) out.push({ id: "old", sev: 0, icon: "hourglass", title: `${B.plural(old.length, "artículo")} con 15 años o más`, detail: `Comprados antes de ${yr - 14}. Valor original ${B.moneyShort(B.sum(old))}.`, act: { label: "Ver cuáles", q: "mas de 14 anos" } });
  const h = B.health(); const se = h.fields.find((f) => f.k === "se");
  if (se && se.pct < 0.5) out.push({ id: "se", sev: 0, icon: "tag", title: `${B.pct(se.miss, D.items.length)}% de los artículos no tiene número de serie`, detail: "Útil para equipo de cómputo y electrónicos; en mobiliario es normal.", act: { label: "Ver equipo sin serie", q: "computadora sin serie" } });
  if (!t.rev) out.push({ id: "start", sev: 0, icon: "phone", title: "Ninguna revisión de inventario ha empezado", detail: "Con la app de celular se marca cada artículo escaneando su QR.", act: { label: "Abrir la app", href: "/app/" } });
  return out.sort((a, b) => b.sev - a.sev);
};

/* ---------- preguntas en español ---------- */
const INTENTS = [
  ["progress", /\b(como va|como vamos|como lleva|avance|progreso|cuanto falta|que tanto falta|cuantos faltan por revisar)\b/],
  ["who_mb", /\b(?:quien tiene|de quien es|a quien pertenece|donde esta|quien resguarda|resguardante del?|que es)\s+(?:el\s+|la\s+)?(?:marbete|numero|articulo|no\.?)?\s*(\d{3,})\b/],
  ["top_res", /\b(?:que|cual|cuales) (?:resguardantes?|personas?)\b|\bquien(?:es)? (?:tiene|tienen|resguarda|resguardan) (?:mas|menos)\b|\b(?:resguardantes?|personas?) con (?:mas|menos)\b/],
  ["top_area", /\b(?:que|cual|cuales|en que) (?:areas?|ubicacion(?:es)?|lugar(?:es)?)\b.*\b(?:mas|menos|mayor|menor)\b|\bareas? con (?:mas|menos)\b/],
  ["top_item", /\b(?:mas|menos) (?:car[oa]s?|costos[oa]s?|valios[oa]s?|barat[oa]s?)\b|\b(?:mayor|menor) (?:valor|importe|precio)\b/],
  ["oldest", /\b(?:mas|menos) (?:antigu[oa]s?|viej[oa]s?|recientes?|nuev[oa]s?)\b/],
  ["who_has", /^(?:quien|quienes) (?:tiene|tienen|resguarda|resguardan|usa|usan|tienen asignad[oa]s?)\b/],
  ["where", /^(?:donde|en que (?:area|lugar|parte|areas)) (?:esta|estan|hay|se encuentra|se encuentran|quedan?)?/],
  ["avg", /\bpromedio\b/],
  ["sum", /\bcuanto (?:vale|valen|cuesta|cuestan|dinero|suma|es el valor|costo|costaron)\b|\bvalor (?:total|de|del)\b|\bimporte (?:total|de|del)\b|\bsuma de\b|\bmonto\b|\bcuanto se invirtio\b/],
  ["count", /^(?:cuant[oa]s?|numero de|cantidad de|total de|hay)\b/],
  ["list", /^(?:muestra(?:me)?|ensena(?:me)?|dame|lista(?:me)?|quiero ver|busca(?:me)?|cuales son|que)\b/],
];
const QSTART = /^(cuant|que|quien|donde|cual|como|muestr|ensen|dame|lista|hay|busca|quiero|cuanto|en que|de quien|a quien)/;
B.isQuestion = (q) => { const s = norm(q); return /[¿?]/.test(q) || QSTART.test(s) || /\b(mas|menos) (car|antig|viej|recient)/.test(s); };
B.ask = (q) => {
  const s = norm(strip(q).replace(/[¿?¡!]/g, " "));
  if (!s) return null;
  let intent = "count", m = null;
  for (const [k, re] of INTENTS) { m = re.exec(s); if (m) { intent = k; break; } }
  let rest = m ? (s.slice(0, m.index) + " " + s.slice(m.index + m[0].length)).replace(/\b(articulos?|bienes|cosas|hay|tiene|tienen|el|la|los|las|de|del|en)\b/g, " ") : s;
  if (intent !== "count" && intent !== "list") rest = rest.replace(/\b(valor|valores|vale|valen|car[oa]s?|dinero|pesos|importes?|costos?|precios?|promedio|total|cantidad|numero|articulos?|cosas|bienes|tiene|tienen|resguarda|resguardan|mas|menos|mayor|menor)\b/g, " ");
  const yr = new Date().getFullYear();
  const valueQ = /\b(valor|vale|valen|car[oa]|dinero|pesos|importe|costos)/.test(s);
  const low = /\b(menos|menor)\b/.test(s);
  if (intent === "progress") {
    const t = B.totals();
    const sentence = !t.rev ? `Todavía no empieza ninguna revisión. Hay ${B.int(t.items)} artículos por revisar con la app de celular.` : `Van ${B.int(t.rev)} de ${B.int(t.items)} artículos revisados. ${t.fin ? `${B.plural(t.fin, "resguardante")} ya ${t.fin === 1 ? "terminó" : "terminaron"}` : "Nadie ha terminado todavía"}${t.started ? ` y ${B.plural(t.started, "revisión", "revisiones")} ${t.started === 1 ? "está" : "están"} en curso` : ""}. ${t.no ? `No se han encontrado ${B.plural(t.no, "artículo")}.` : ""}`;
    return { intent, title: "Avance del inventario", big: t.pct + "%", sentence, go: "#/vivo", goLabel: "Ver en vivo" };
  }
  if (intent === "who_mb") {
    const it = B.findMb(m[1]);
    if (!it) return { intent, title: "Marbete " + m[1], sentence: `No encontré el marbete ${m[1]} en el inventario.`, items: [] };
    return { intent, title: "Marbete " + it.mb, sentence: `${B.smart(it.ds)} está en resguardo de ${it.rc === SIN ? "nadie (sin resguardante)" : B.title(it.rc)}${it.ar ? ", en " + B.smart(it.ar) : ""}.${it.mark ? " En la revisión quedó como " + (it.mark.e === "si" ? "presente" : "no encontrado") + "." : ""}`, items: [it] };
  }
  const P = parse(rest);
  const list = P.empty ? D.items.slice() : B.filter(D.items, P);
  const what = P.empty ? "artículos" : describe(P);
  const base = { intent, P, query: rest.trim(), fixed: P.fixed, chips: P.filters.map((f) => f.label) };
  if (!list.length) return { ...base, title: "Sin resultados", sentence: `No encontré ${what}.${P.fixed.length ? "" : " Prueba con otras palabras."}`, items: [] };
  const top = (arr, n = 5) => arr.slice(0, n);
  if (intent === "top_res" || intent === "who_has") {
    let g = B.groupBy(list, "rc").filter((x) => x.key !== SIN);
    if (valueQ) g.sort((a, b) => b.val - a.val); if (low) g.reverse();
    if (!g.length) return { ...base, title: "Sin resguardante", sentence: `Los ${B.int(list.length)} ${what} no tienen resguardante.`, items: top(list) };
    const f = g[0];
    const sentence = intent === "who_has" ? `${B.plural(g.length, "persona tiene", "personas tienen")} ${what}. ${B.title(f.key)} tiene ${valueQ ? "el mayor valor: " + B.money(f.val) : "más: " + B.int(f.n)}.` : `${B.title(f.key)} es quien ${low ? "menos" : "más"} tiene${P.empty ? "" : " " + what}: ${valueQ ? B.money(f.val) + " en " + B.int(f.n) + " artículos" : B.plural(f.n, "artículo")}.`;
    return { ...base, title: intent === "who_has" ? "Quién tiene " + what : "Resguardantes", big: valueQ ? B.moneyShort(f.val) : B.int(f.n), sentence, groups: top(g, 6).map((x) => ({ label: B.title(x.key), n: x.n, val: x.val, go: "#/resguardante/" + encodeURIComponent(x.key) })), metric: valueQ ? "val" : "n" };
  }
  if (intent === "top_area" || intent === "where") {
    let g = B.groupBy(list, (it) => it.ar || "(Sin área)");
    if (valueQ) g.sort((a, b) => b.val - a.val); if (low) g.reverse();
    const f = g[0];
    const sentence = intent === "where" ? `Están en ${B.plural(g.length, "área")}. La que más tiene es ${B.smart(f.key)} con ${B.int(f.n)}.` : `${B.smart(f.key)} es el área con ${low ? "menos" : "más"} ${valueQ ? "valor: " + B.money(f.val) : "artículos: " + B.int(f.n)}.`;
    return { ...base, title: intent === "where" ? "Dónde están " + what : "Áreas", big: valueQ ? B.moneyShort(f.val) : B.int(f.n), sentence, groups: top(g, 6).map((x) => ({ label: B.smart(x.key), n: x.n, val: x.val, q: 'area:"' + x.key + '"' })), metric: valueQ ? "val" : "n" };
  }
  if (intent === "top_item") {
    const cheap = /\b(barat|menor|menos)/.test(s);
    const l = list.filter((x) => x.im > 0).sort((a, b) => (cheap ? a.im - b.im : b.im - a.im));
    if (!l.length) return { ...base, title: "Sin importes", sentence: `Ninguno de los ${what} tiene importe capturado.`, items: top(list) };
    return { ...base, title: cheap ? "Los de menor valor" : "Los de mayor valor", big: B.money(l[0].im, 0), sentence: `El ${cheap ? "más barato" : "más caro"} es ${B.smart(l[0].ds)} (marbete ${l[0].mb}), con ${B.title(l[0].rc)}.`, items: top(l, 6) };
  }
  if (intent === "oldest") {
    const nw = /\b(recient|nuev|menos antig|menos viej)/.test(s);
    const l = list.filter((x) => x.y).sort((a, b) => (nw ? b.y - a.y : a.y - b.y) || a.n - b.n);
    if (!l.length) return { ...base, title: "Sin fechas", sentence: `Los ${what} no tienen fecha de factura.`, items: top(list) };
    return { ...base, title: nw ? "Los más recientes" : "Los más antiguos", big: String(l[0].y), sentence: `${nw ? "El más reciente" : "El más antiguo"} es ${B.smart(l[0].ds)} (marbete ${l[0].mb}), de ${l[0].y}: ${yr - l[0].y} años.`, items: top(l, 6) };
  }
  const sum = B.sum(list);
  if (intent === "sum") return { ...base, title: P.empty ? "Valor del inventario" : "Valor de " + what, big: B.moneyShort(sum), sentence: P.empty ? `Todo el inventario vale ${B.money(sum)} (${B.plural(list.length, "artículo")}).` : `Los artículos de ${what} valen ${B.money(sum)} en total (${B.plural(list.length, "artículo")}).`, items: top(list.slice().sort((a, b) => b.im - a.im)), total: list.length };
  if (intent === "avg") { const l = list.filter((x) => x.im > 0); const av = l.length ? B.sum(l) / l.length : 0; return { ...base, title: "Valor promedio", big: B.money(av, 0), sentence: `El valor promedio ${P.empty ? "de un artículo" : "de " + what} es ${B.money(av)} (${B.plural(l.length, "artículo")} con importe).`, items: top(list), total: list.length }; }
  const ppl = new Set(list.map((x) => x.rc));
  const who = ppl.size === 1 && !list.every((x) => x.rc === SIN) && P.words.some((w) => index().nameTok.has(w.w)) ? ` en resguardo de ${B.title(list[0].rc)}` : "";
  return { ...base, title: capital(what), big: B.int(list.length), sentence: `Hay ${B.plural(list.length, "artículo")}${P.empty ? "" : " que coinciden con " + what}${who}. Valen ${B.money(sum)}${ppl.size > 1 ? `, repartidos entre ${B.plural(ppl.size, "resguardante")}` : ""}.`, items: top(list), total: list.length };
};
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function describe(P) {
  const w = P.words.map((x) => x.w).join(" ");
  const parts = []; if (w) parts.push("«" + w + "»"); for (const f of P.filters) parts.push(f.label.toLowerCase());
  return parts.join(", ") || "artículos";
}
B.describe = describe;

window.B = B;
})();
