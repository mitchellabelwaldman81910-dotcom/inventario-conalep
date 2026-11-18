/* Herramientas inteligentes del portal: motor sin pantalla (se prueba en Node).
   Magic.analyze → "Borrador mágico": entiende una tabla sucia, quita lo que no sirve, corrige y avisa de lo importante.
   Docx.build / Docx.fill / Docx.autoFields → plantillas de Word que se rellenan con el inventario.
   Todo se calcula en el navegador, por reglas y por lo que ya sabe el inventario. */
(() => {
"use strict";
const strip = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const norm = (s) => strip(s).replace(/[^a-z0-9]+/g, " ").trim();
const MOJI = [["Ã±", "ñ"], ["Ã³", "ó"], ["Ã¡", "á"], ["Ã©", "é"], ["Ã­", "í"], ["Ãº", "ú"], ["Ã‘", "Ñ"], ["Ã“", "Ó"], ["Ã‰", "É"], ["Ãš", "Ú"], ["Â°", "°"], ["Â¿", "¿"], ["Â¡", "¡"], ["â€“", "–"], ["â€œ", "“"], ["â€\u009d", "”"]];
const clean = (s) => { let t = String(s == null ? "" : s); if (/[ÃÂâ]/.test(t)) for (const [a, b] of MOJI) t = t.split(a).join(b); return t.replace(/[  ​-‍﻿]/g, " ").replace(/\s+/g, " ").trim(); };
function lev(a, b, max = 4) {
  if (Math.abs(a.length - b.length) > max) return max + 1; const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; let lo = i; for (let j = 1; j <= n; j++) { const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); cur.push(v); if (v < lo) lo = v; } if (lo > max) return max + 1; prev = cur; }
  return prev[n];
}
const PART = new Set(["de", "del", "la", "las", "los", "y", "e", "el", "da", "van", "von"]);
const title = (s) => String(s || "").toLowerCase().replace(/[a-záéíóúüñ]+/g, (w, i) => (i > 0 && PART.has(w) ? w : w[0].toUpperCase() + w.slice(1)));

/* ---------- roles de columna ---------- */
const ROLES = [
  ["serie", /\bserie\b|\bs\/?n\b|n[uú]mero de serie/], ["marbete", /marbete|folio|\bc[oó]d(igo)?\b|\bclave\b|inventario|no\.? ?inv|n[uú]m(ero)? ?de ?inv/],
  ["importe", /importe|costo|precio|monto|valor|\bimp\b/], ["fecha", /fecha|adquisici|alta/], ["factura", /factura/], ["proveedor", /proveedor/], ["cuenta", /cuenta/],
  ["resguardante", /resguard|responsable|asignado|usuario|persona|nombre del resp/], ["area", /[aá]rea|ubicaci|lugar|sal[oó]n|departamento|\blocal\b/],
  ["marca", /\bmarca\b/], ["modelo", /modelo/], ["estado", /estado|condici[oó]n/], ["nota", /observ|nota|coment/], ["descripcion", /descrip|art[ií]culo|concepto|\bbien\b|nombre del bien/],
];
const ROLE_LABEL = { marbete: "Marbete", descripcion: "Descripción", resguardante: "Resguardante", area: "Área", marca: "Marca", modelo: "Modelo", serie: "Serie", importe: "Importe", fecha: "Fecha", factura: "Factura", proveedor: "Proveedor", cuenta: "Cuenta", estado: "Estado", nota: "Observaciones" };
const roleOfHeader = (h) => { const t = strip(h).trim(); if (!t) return null; for (const [r, re] of ROLES) if (re.test(t)) return r; return null; };

/* ---------- valores ---------- */
const MES = { ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8, sep: 9, sept: 9, septiembre: 9, set: 9, oct: 10, octubre: 10, nov: 11, noviembre: 11, dic: 12, diciembre: 12 };
const p2 = (n) => String(n).padStart(2, "0");
function parseDate(s) {
  const t = strip(clean(s)).replace(/\./g, "/"); if (!t) return null; let d, m, y, x;
  if ((x = /^(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{2,4})$/.exec(t))) { d = +x[1]; m = +x[2]; y = +x[3]; if (m > 12 && d <= 12) [d, m] = [m, d]; }
  else if ((x = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/.exec(t))) { y = +x[1]; m = +x[2]; d = +x[3]; }
  else if ((x = /^(\d{1,2})\s*(?:de\s+)?([a-z]+)\.?\s*(?:de\s+|del\s+)?(\d{2,4})$/.exec(t)) && MES[x[2]]) { d = +x[1]; m = MES[x[2]]; y = +x[3]; }
  else if ((x = /^(\d{1,2})[\/\-]([a-z]{3,})[\/\-](\d{2,4})$/.exec(t)) && MES[x[2]]) { d = +x[1]; m = MES[x[2]]; y = +x[3]; }
  else if (/^\d{5}(\.\d+)?$/.test(t) && +t > 20000 && +t < 60000) { const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(+t) * 864e5); d = dt.getUTCDate(); m = dt.getUTCMonth() + 1; y = dt.getUTCFullYear(); }
  else return null;
  if (y < 100) y += y <= 30 ? 2000 : 1900;
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1950 && y <= 2100)) return null;
  const chk = new Date(Date.UTC(y, m - 1, d)); if (chk.getUTCMonth() !== m - 1) return null;
  return { d, m, y, s: p2(d) + "/" + p2(m) + "/" + y, k: y * 10000 + m * 100 + d };
}
function parseMoney(s) {
  let t = clean(s).replace(/mxn|mn|pesos|\$|\s/gi, ""); if (!t || !/^-?[\d.,]+$/.test(t)) return null;
  const lc = t.lastIndexOf(","), ld = t.lastIndexOf(".");
  if (lc >= 0 && ld >= 0) t = lc > ld ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  else if (lc >= 0) t = /,\d{1,2}$/.test(t) && t.indexOf(",") === lc ? t.replace(",", ".") : t.replace(/,/g, "");
  const n = parseFloat(t); return Number.isFinite(n) ? n : null;
}
const money = (n) => "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EMPTY = /^(n\/?a|s\/?d|sin dato|sin datos|ninguno|ninguna|null|none|undefined|-+|\.+|_+|x+|—|–)$/i;

/* ---------- análisis ---------- */
const NOISE = /^(p[aá]gina|p[aá]g\.?|hoja)\s*\d+|^(elabor[oó]|autoriz[oó]|revis[oó]|vo\.? ?bo\.?|nombre y firma|firma|sello|fecha de impresi[oó]n|impreso el|reporte|generado|sistema)(?![a-záéíóúñ])|p[aá]gina \d+ de \d+/i;
const TOTAL = /^(total(es)?|suma(s)?|subtotal(es)?|gran total|total general)\b/i;
const CTX = [["resguardante", /^(resguardante|responsable|usuario|asignado a|nombre)\s*[:\-–]\s*(.+)$/i], ["area", /^([aá]rea|ubicaci[oó]n|lugar|sal[oó]n|departamento)\s*[:\-–]\s*(.+)$/i]];
const CAT_LABEL = { vacia: "Filas vacías", encabezado: "Encabezados repetidos", total: "Totales y sumas", pie: "Pies de página, firmas y membretes", titulo: "Títulos y notas sueltas", incompleta: "Filas casi vacías", duplicada: "Duplicadas exactas", conflicto: "Mismo marbete con datos distintos", contexto: "Líneas de contexto (se usaron para llenar columnas)" };
const CAT_KEEP = { vacia: false, encabezado: false, total: false, pie: false, titulo: false, incompleta: false, duplicada: false, conflicto: false, contexto: false };

function classifyCols(cells, hdr, ctx, mem) {
  const roles = hdr.map((h) => (mem && mem.roleOf && mem.roleOf[norm(h)]) || roleOfHeader(h)), n = hdr.length;
  const col = (j) => cells.map((r) => clean(r[j])).filter((v) => v);
  const used = new Set(roles.filter(Boolean));
  const tryRole = (role, test) => { if (used.has(role)) return; let best = -1, br = 0.5; for (let j = 0; j < n; j++) { if (roles[j]) continue; const v = col(j); if (v.length < 2) continue; const r = v.filter(test).length / v.length; if (r > br) { br = r; best = j; } } if (best >= 0) { roles[best] = role; used.add(role); } };
  tryRole("marbete", (v) => ctx.marbetes.has(norm(v)) || /^[a-z]{0,4}[\- ]?\d{4,}$/i.test(v));
  tryRole("resguardante", (v) => ctx.peopleN.has(norm(v)));
  tryRole("area", (v) => ctx.areasN.has(norm(v)));
  tryRole("fecha", (v) => !!parseDate(v) && /[\/\-]|\bde\b/.test(v));
  tryRole("importe", (v) => parseMoney(v) != null && /[$.,]/.test(v));
  return roles;
}

function analyze(grid, ctx, mem) {
  mem = mem || {}; ctx = Object.assign({ marbetes: new Set(), byMb: new Map(), people: [], areas: [], smart: (s) => s }, ctx || {});
  ctx.peopleN = new Map(ctx.people.map((p) => [norm(p), p])); ctx.areasN = new Map(ctx.areas.map((a) => [norm(a), a]));
  ctx.marbetes = ctx.marbetes instanceof Set ? ctx.marbetes : new Set(ctx.marbetes || []);
  const G = grid.map((r) => r.map((c) => clean(c)));
  const W = Math.max(0, ...G.map((r) => r.length)); for (const r of G) while (r.length < W) r.push("");
  // 1) fila de encabezados: la que más celdas con nombre de columna conocido trae
  let hi = -1, best = 0;
  for (let i = 0; i < Math.min(G.length, 40); i++) { const sc = G[i].filter((c) => roleOfHeader(c) || (mem.roleOf && mem.roleOf[norm(c)])).length; if (sc > best) { best = sc; hi = i; } }
  if (best < 2) { let bn = 0; hi = 0; for (let i = 0; i < Math.min(G.length, 25); i++) { const n = G[i].filter(Boolean).length; if (n > bn * 1.0 + 0.5 && n >= 2) { bn = n; hi = i; if (n >= W * 0.7) break; } } }
  const hdrRaw = G[hi] || [], keep = [], hdr = [];
  for (let j = 0; j < W; j++) { let h = hdrRaw[j] || ""; if (!h) { let any = false; for (let i = hi + 1; i < G.length && !any; i++) any = !!G[i][j]; if (!any) continue; h = "Columna " + (j + 1); } let nm = h, k = 2; while (hdr.includes(nm)) nm = h + " " + k++; hdr.push(nm); keep.push(j); }
  const data = G.slice(hi + 1).map((r, i) => ({ src: hi + 2 + i, v: keep.map((j) => r[j]) }));
  const roles = classifyCols(data.map((d) => d.v), hdr, ctx, mem);
  const ix = (role) => roles.indexOf(role), iMB = ix("marbete"), iRC = ix("resguardante"), iAR = ix("area");
  const hdrN = new Set(hdr.map(norm).filter(Boolean));
  // 2) clasificar cada fila
  const rows = [], context = {}, seenKey = new Map(); let cur = { resguardante: "", area: "" };
  const cat = (r, c, why) => { r.cat = c; r.why = why || ""; r.keep = mem.keep && c in mem.keep ? !!mem.keep[c] : CAT_KEEP[c]; };
  for (const d of data) {
    const filled = d.v.filter(Boolean), r = { id: rows.length, src: d.src, raw: d.v.slice(), cells: [], cat: "valida", why: "", keep: true, flags: [] };
    rows.push(r);
    if (!filled.length) { cat(r, "vacia", "No tiene nada escrito"); continue; }
    const joined = filled.join(" ");
    const same = d.v.filter((c, j) => c && hdrN.has(norm(c))).length;
    if (same >= Math.max(2, Math.ceil(filled.length * 0.6)) && norm(joined) !== "") { cat(r, "encabezado", "Repite los nombres de las columnas (de otra página)"); continue; }
    const soloMb = iMB >= 0 && !!d.v[iMB] && filled.length === 1 && (ctx.marbetes.has(norm(d.v[iMB]).replace(/ /g, "")) || /^[a-z]{0,4}[\- ]?\d{3,}$/i.test(d.v[iMB]));
    if (!soloMb && (filled.length === 1 || (filled.length <= 2 && filled.every((c) => c.length > 18 && !/\d{3,}/.test(c))))) {
      let hit = false;
      for (const [role, re] of CTX) { const m = re.exec(filled[0]); if (m) { cur[role] = m[2].trim(); cat(r, "contexto", `Dice «${role === "area" ? "Área" : "Resguardante"}: ${cur[role]}» y se aplicó a las filas siguientes`); hit = true; break; } }
      if (hit) continue;
      const nn = norm(filled[0]);
      if (ctx.peopleN.has(nn) && iRC >= 0) { cur.resguardante = ctx.peopleN.get(nn); cat(r, "contexto", `Es el nombre de ${ctx.peopleN.get(nn)} y se aplicó a las filas siguientes`); continue; }
      if (ctx.areasN.has(nn) && iAR >= 0) { cur.area = ctx.areasN.get(nn); cat(r, "contexto", `Es el lugar «${ctx.areasN.get(nn)}» y se aplicó a las filas siguientes`); continue; }
      if (NOISE.test(filled[0])) { cat(r, "pie", "Parece pie de página, firma o membrete"); continue; }
      if (TOTAL.test(filled[0])) { cat(r, "total", "Es una fila de total"); continue; }
      cat(r, "titulo", "Es un texto suelto (título o nota), no un artículo"); continue;
    }
    if (d.v.some((c) => TOTAL.test(c)) && (filled.length <= Math.ceil(hdr.length / 2) || parseMoney(filled[filled.length - 1]) != null)) { cat(r, "total", "Es una fila de total"); continue; }
    if (NOISE.test(filled[0]) || (filled.length <= 2 && filled.some((c) => NOISE.test(c)))) { cat(r, "pie", "Parece pie de página, firma o membrete"); continue; }
    const mbv = iMB >= 0 ? d.v[iMB] : "";
    if (iMB >= 0 && !mbv && filled.length < Math.max(2, Math.ceil(hdr.length * 0.3))) { cat(r, "incompleta", "Casi no tiene datos y no trae marbete"); continue; }
    if (mbv && filled.length === 1) r.flags.push("solo trae el marbete: faltan los demás datos");
    if (iMB < 0 && filled.length < Math.max(2, Math.ceil(hdr.length * 0.3))) { cat(r, "incompleta", "Casi no tiene datos"); continue; }
    // contexto heredado
    r.vals = d.v.slice();
    if (iRC >= 0 && !r.vals[iRC] && cur.resguardante) { r.vals[iRC] = cur.resguardante; r.flags.push("resguardante tomado de la línea de contexto"); }
    if (iAR >= 0 && !r.vals[iAR] && cur.area) { r.vals[iAR] = cur.area; r.flags.push("área tomada de la línea de contexto"); }
    const key = iMB >= 0 && mbv ? "m:" + norm(mbv).replace(/ /g, "") : "f:" + norm(r.vals.join("|"));
    const prev = seenKey.get(key);
    if (prev) { const nz = (x) => x.vals.map((c, j) => (j === iMB ? "" : norm(c))).join("|"), same2 = nz(prev) === nz(r); cat(r, same2 ? "duplicada" : "conflicto", same2 ? `Es igual a la fila ${prev.src}` : `Mismo marbete que la fila ${prev.src} pero con datos distintos: revísala`); if (!same2) r.keep = mem.keep && "conflicto" in mem.keep ? !!mem.keep.conflicto : false; continue; }
    seenKey.set(key, r);
  }
  // 3) limpiar celdas de las filas válidas
  const fixes = [];
  const fx = (r, j, before, after, kind) => { if (before === after) return after; fixes.push({ id: fixes.length, row: r.id, col: j, before, after, kind, on: true }); return after; };
  const nameFix = (v, pool, poolN, memMap, kind, r, j) => {
    const nn = norm(v), learned = memMap && memMap[nn];
    if (learned === "=") return v;
    if (learned) return fx(r, j, v, learned, kind + " (lo aprendí de ti)");
    if (poolN.has(nn)) { const c = poolN.get(nn); return c === v ? v : fx(r, j, v, c, "nombre ya conocido"); }
    const toks = nn.split(" ").sort().join(" "); for (const [k, c] of poolN) if (k.split(" ").sort().join(" ") === toks) return fx(r, j, v, c, "mismas palabras en otro orden");
    let bestC = null, bd = 99, tie = false; const tol = Math.max(1, Math.min(3, Math.floor(nn.length * 0.12)));
    for (const [k, c] of poolN) { const dd = lev(nn, k, tol); if (dd <= tol) { if (dd < bd) { bd = dd; bestC = c; tie = false; } else if (dd === bd && c !== bestC) tie = true; } }
    if (bestC && !tie) return fx(r, j, v, bestC, "se parece a uno que ya existe");
    r.flags.push(kind === "persona" ? "persona que no está en el inventario" : "lugar que no está en el inventario"); return v;
  };
  for (const r of rows) {
    if (r.cat === "vacia" || !r.vals) { r.cells = r.raw.map((v) => ({ o: v, v })); continue; }
    r.cells = r.vals.map((v0, j) => {
      let v = clean(v0), o = v; const role = roles[j];
      if (v && EMPTY.test(v)) { return { o: v, v: fx(r, j, v, "", "dato vacío («" + v + "»)") }; }
      if (!v) return { o, v };
      if (role === "marbete") { let t = v.replace(/\.0+$/, "").replace(/\s+/g, "").toUpperCase(); if (t !== v) v = fx(r, j, v, t, "marbete ordenado"); }
      else if (role === "resguardante") { let t = /[a-z]/.test(v) && v !== v.toUpperCase() ? v : title(v); if (t !== v) v = fx(r, j, v, t, "mayúsculas y minúsculas"); v = nameFix(v, ctx.people, ctx.peopleN, mem.nameFix, "persona", r, j); }
      else if (role === "area") { let t = v === v.toUpperCase() && /[A-ZÁÉÍÓÚ]{3}/.test(v) ? ctx.smart(v) : v; if (t !== v) v = fx(r, j, v, t, "mayúsculas y minúsculas"); v = nameFix(v, ctx.areas, ctx.areasN, mem.areaFix, "área", r, j); }
      else if (role === "importe") { const n = parseMoney(v); if (n == null) r.flags.push("importe que no se entiende"); else { const t = money(n); if (t !== v) v = fx(r, j, v, t, "importe con formato"); } }
      else if (role === "fecha") { const d = parseDate(v); if (!d) r.flags.push("fecha que no se entiende"); else if (d.s !== v) v = fx(r, j, v, d.s, "fecha ordenada"); }
      else if (role === "serie") { const t = v.replace(/\s+/g, " ").trim().toUpperCase(); if (t !== v) v = fx(r, j, v, t, "serie ordenada"); }
      else if ((role === "descripcion" || role === "marca") && ctx.upper) { const t = v.toUpperCase(); if (t !== v) v = fx(r, j, v, t, "mayúsculas como en el inventario"); }
      else if (role === "descripcion" || role === "marca" || role === "modelo") { if (v === v.toUpperCase() && /[A-ZÁÉÍÓÚ]{4}/.test(v) && role !== "modelo") { const t = ctx.smart(v); if (t !== v) v = fx(r, j, v, t, "mayúsculas y minúsculas"); } }
      v = v.replace(/^[\s.,;:\-–_]+|[\s,;:\-–_]+$/g, (m) => (m.includes(".") && /\.$/.test(m) && /\w\.$/.test(v) ? m : "")).trim();
      return { o, v };
    });
  }
  const res = { hdr, roles, hdrRow: hi + 1, rows, fixes, cats: CAT_LABEL, ctx: { cur } };
  res.live = () => fixes.filter((f) => rows[f.row].keep);
  res.info = summarize(res, ctx); res.compare = compare(res, ctx);
  return res;
}

/* lo que se quedaría en la tabla, respetando lo que la persona restauró o dejó fuera */
function materialize(res) {
  const fixOn = new Map(); for (const f of res.fixes) fixOn.set(f.row + ":" + f.col, f);
  const out = [];
  for (const r of res.rows) { if (!r.keep || !r.cells.length || r.cat === "vacia" && !r.keep) continue; out.push(r.cells.map((c, j) => { const f = fixOn.get(r.id + ":" + j); return f && !f.on ? c.o : c.v; })); }
  return out;
}
const rowGood = (r) => r.keep && r.cells.length && r.cat !== "vacia";
function summarize(res, ctx) {
  const { hdr, roles, rows } = res, iMB = roles.indexOf("marbete"), iRC = roles.indexOf("resguardante"), iAR = roles.indexOf("area"), iIM = roles.indexOf("importe"), iFE = roles.indexOf("fecha");
  const good = rows.filter(rowGood), val = (r, j) => (j >= 0 && r.cells[j] ? r.cells[j].v : "");
  const mbs = new Set(), newMb = [], oldMb = []; for (const r of good) { const m = val(r, iMB); if (!m) continue; const k = norm(m); if (mbs.has(k)) continue; mbs.add(k); (ctx.marbetes.has(k) ? oldMb : newMb).push(m); }
  const peo = new Map(), are = new Map(), unkP = new Set(), unkA = new Set(); let total = 0, nimp = 0, dmin = null, dmax = null;
  for (const r of good) {
    const p = val(r, iRC), a = val(r, iAR); if (p) { peo.set(p, (peo.get(p) || 0) + 1); if (!ctx.peopleN.has(norm(p))) unkP.add(p); } if (a) { are.set(a, (are.get(a) || 0) + 1); if (!ctx.areasN.has(norm(a))) unkA.add(a); }
    const n = iIM >= 0 ? parseMoney(val(r, iIM)) : null; if (n != null) { total += n; nimp++; } const d = iFE >= 0 ? parseDate(val(r, iFE)) : null; if (d) { if (!dmin || d.k < dmin.k) dmin = d; if (!dmax || d.k > dmax.k) dmax = d; }
  }
  const byCat = {}; for (const r of rows) if (r.cat !== "valida" && !r.keep) byCat[r.cat] = (byCat[r.cat] || 0) + 1;
  return { filas: rows.length, buenas: good.length, quitadas: Object.values(byCat).reduce((a, b) => a + b, 0), byCat, correcciones: res.fixes.filter((f) => f.on && res.rows[f.row].keep).length, marbetes: mbs.size, marbetesNuevos: newMb.length, marbetesConocidos: oldMb.length, nuevos: newMb.slice(0, 50),
    personas: [...peo].sort((a, b) => b[1] - a[1]), personasNuevas: [...unkP], areas: [...are].sort((a, b) => b[1] - a[1]), areasNuevas: [...unkA], importeTotal: total, conImporte: nimp, fechaMin: dmin && dmin.s, fechaMax: dmax && dmax.s,
    sinMarbete: iMB >= 0 ? good.filter((r) => !val(r, iMB)).length : 0, columnasSinEntender: hdr.filter((h, j) => !roles[j]), conflictos: rows.filter((r) => r.cat === "conflicto").length };
}
/* comparar con lo que ya hay en el inventario */
function compare(res, ctx) {
  const { roles, hdr, rows } = res, iMB = roles.indexOf("marbete"); if (iMB < 0 || !ctx.byMb || !ctx.byMb.size) return null;
  const val = (r, j) => (j >= 0 && r.cells[j] ? r.cells[j].v : ""), fields = ["resguardante", "area", "descripcion", "marca", "modelo", "serie", "importe", "fecha", "factura"];
  const sameN = (role, a, b) => (role === "importe" ? parseMoney(a) === parseMoney(b) : role === "fecha" ? (parseDate(a) || {}).k === (parseDate(b) || {}).k : norm(a) === norm(b));
  const igual = [], cambios = [], nuevos = [], vistos = new Set();
  for (const r of rows.filter(rowGood)) {
    const mb = val(r, iMB); if (!mb) continue; const inv = ctx.byMb.get(norm(mb)); vistos.add(norm(mb));
    if (!inv) { nuevos.push({ mb, desc: val(r, roles.indexOf("descripcion")), quien: val(r, roles.indexOf("resguardante")) }); continue; }
    const diffs = []; for (const f of fields) { const j = roles.indexOf(f); if (j < 0) continue; const a = inv[f] || "", b = val(r, j); if (b && a && !sameN(f, a, b)) diffs.push({ campo: ROLE_LABEL[f], antes: a, despues: b }); else if (b && !a) diffs.push({ campo: ROLE_LABEL[f], antes: "", despues: b }); }
    (diffs.length ? cambios.push({ mb, desc: inv.descripcion || "", diffs }) : igual.push(mb));
  }
  const faltan = []; for (const [k, v] of ctx.byMb) if (!vistos.has(k)) faltan.push({ mb: v.marbete || k, desc: v.descripcion || "", quien: v.resguardante || "" });
  return { igual: igual.length, cambios, nuevos, faltan };
}
/* lo que la app aprende de las decisiones */
function learn(mem, res) {
  mem = mem || {}; mem.roleOf = mem.roleOf || {}; mem.keep = mem.keep || {}; mem.nameFix = mem.nameFix || {}; mem.areaFix = mem.areaFix || {}; mem.n = (mem.n || 0) + 1;
  res.hdr.forEach((h, j) => { if (res.roles[j]) mem.roleOf[norm(h)] = res.roles[j]; });
  for (const c of Object.keys(CAT_KEEP)) { const rs = res.rows.filter((r) => r.cat === c); if (!rs.length) continue; const k = rs.filter((r) => r.keep).length; if (k === rs.length) mem.keep[c] = true; else if (k === 0) mem.keep[c] = false; }
  const offs = new Set(res.fixes.filter((f) => !f.on).map((f) => res.roles[f.col] + "|" + norm(f.before)));
  for (const f of res.fixes) { if (f.on && offs.has(res.roles[f.col] + "|" + norm(f.before))) continue; const role = res.roles[f.col]; const map = role === "resguardante" ? mem.nameFix : role === "area" ? mem.areaFix : null; if (!map || !/parece|otro orden|conocido|aprend/.test(f.kind)) continue; const nb = norm(f.before); if (!f.on) map[nb] = "="; else if (map[nb] !== "=") map[nb] = f.after; }
  return mem;
}

/* ---------- Word ---------- */
const X = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const run = (t, o = {}) => `<w:r><w:rPr>${o.b ? "<w:b/>" : ""}${o.i ? "<w:i/>" : ""}${o.color ? `<w:color w:val="${o.color}"/>` : ""}<w:sz w:val="${Math.round((o.size || 10.5) * 2)}"/></w:rPr><w:t xml:space="preserve">${X(t)}</w:t></w:r>`;
const para = (t, o = {}) => `<w:p><w:pPr><w:spacing w:before="${o.before || 0}" w:after="${o.after == null ? 80 : o.after}"/>${o.align ? `<w:jc w:val="${o.align}"/>` : ""}</w:pPr>${t === "" ? "" : run(t, o)}</w:p>`;
function tbl(head, rows, widths, land) {
  const total = land ? 13000 : 9400, sum = widths.reduce((a, b) => a + b, 0), w = widths.map((x) => Math.round((x / sum) * total));
  const cell = (t, i, hd) => `<w:tc><w:tcPr><w:tcW w:w="${w[i]}" w:type="dxa"/>${hd ? '<w:shd w:val="clear" w:color="auto" w:fill="1F5B4A"/>' : ""}</w:tcPr><w:p><w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr>${run(t, { b: hd, size: 9, color: hd ? "FFFFFF" : "" })}</w:p></w:tc>`;
  const bd = ["top", "left", "bottom", "right", "insideH", "insideV"].map((k) => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="B8C4BE"/>`).join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblBorders>${bd}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${w.map((x) => `<w:gridCol w:w="${x}"/>`).join("")}</w:tblGrid><w:tr><w:trPr><w:tblHeader/></w:trPr>${head.map((h, i) => cell(h, i, true)).join("")}</w:tr>${rows.map((r) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r.map((c, i) => cell(c, i, false)).join("")}</w:tr>`).join("")}</w:tbl>`;
}
async function pack(JSZip, body, land) {
  const z = new JSZip();
  z.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  z.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  const sect = land ? `<w:sectPr><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000"/></w:sectPr>` : `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1100" w:right="1300" w:bottom="1100" w:left="1300"/></w:sectPr>`;
  z.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}${sect}</w:body></w:document>`);
  return z.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
const Docx = {
  /* documento nuevo desde cero */
  async build(JSZip, o) {
    let b = para(o.title, { b: true, size: 16, align: "center", after: 60 });
    if (o.subtitle) b += para(o.subtitle, { size: 10.5, align: "center", after: 200, color: "555555" });
    for (const p of o.paras || []) b += para(p.t, p);
    if (o.table) b += tbl(o.table.head, o.table.rows, o.table.widths, o.landscape);
    for (const p of o.after || []) b += para(p.t, p);
    return pack(JSZip, b, o.landscape);
  },
  /* los campos {{así}} de una plantilla de Word (aunque Word los haya partido en pedazos) */
  async placeholders(JSZip, buf) {
    const z = await JSZip.loadAsync(buf), xml = await z.file("word/document.xml").async("string"), set = new Set();
    for (const p of xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []) { const t = ptext(p); for (const m of t.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) set.add(m[1]); }
    return [...set];
  },
  /* rellena: vars = {persona:..}, rows = [{marbete:..}] para la fila de la tabla que se repite */
  async fill(JSZip, buf, vars, rows) {
    const z = await JSZip.loadAsync(buf); let xml = await z.file("word/document.xml").async("string");
    xml = joinRuns(xml); const V = {}; for (const k in vars) V[key(k)] = vars[k];
    xml = xml.replace(/<w:tr[ >][\s\S]*?<\/w:tr>/g, (tr) => {
      const t = ptextAll(tr); if (!/\{\{\s*(marbete|mb|descripcion|articulo|marca|modelo|serie|importe_art|valor|n|num|factura|fecha_adq|cuenta|proveedor|estado)\s*\}\}/i.test(strip(t).replace(/\{\{\s*([^}]*?)\s*\}\}/g, (m, a) => "{{" + key(a) + "}}"))) return tr;
      return (rows || []).map((r) => sub(tr, r)).join("");
    });
    xml = sub(xml, V);
    z.file("word/document.xml", xml); return z.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  },
  /* busca renglones como «Nombre: ______» y los vuelve campos */
  async autoFields(JSZip, buf) {
    const z = await JSZip.loadAsync(buf); let xml = joinRuns(await z.file("word/document.xml").async("string")), n = 0; const hechos = [];
    const MAP = [["persona", /(resguardante|responsable|nombre(?: completo)?|recib[ií]\s+de|entrega)/i], ["area", /([aá]rea|ubicaci[oó]n|lugar|departamento|sal[oó]n)/i], ["fecha", /(fecha)/i], ["plantel", /(plantel|escuela)/i]];
    xml = xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (p) => {
      const t = ptext(p); if (/\{\{/.test(t) || !/(_{3,}|\.{5,}|…{2,})/.test(t)) return p;
      const m = /^(.*?)(_{3,}|\.{5,}|…{2,})(.*)$/.exec(t); if (!m) return p; const [, pre, , post] = m; const hit = MAP.find(([, re]) => re.test(pre)); if (!hit) return p;
      n++; hechos.push(`«${pre.trim()}» → {{${hit[0]}}}`); return setText(p, pre + "{{" + hit[0] + "}}" + post);
    });
    z.file("word/document.xml", xml); return { data: await z.generateAsync({ type: "uint8array", compression: "DEFLATE" }), n, hechos };
  },
  /* tablas de un Word → matriz (la más grande) o líneas de texto */
  async grid(JSZip, buf) {
    const z = await JSZip.loadAsync(buf), xml = await z.file("word/document.xml").async("string"), tabs = [];
    for (const t of xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || []) tabs.push((t.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []).map((tr) => (tr.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).map((tc) => ptextAll(tc))));
    if (tabs.length) return tabs.sort((a, b) => b.length * (b[0] || []).length - a.length * (a[0] || []).length)[0];
    return (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map((p) => [ptext(p)]).filter((r) => r[0]);
  },
};
const key = (s) => strip(s).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const ALIAS = { resguardante: "persona", responsable: "persona", nombre: "persona", mb: "marbete", articulo: "descripcion", valor: "importe_art", num: "n", hoy: "fecha", cantidad: "total", total_articulos: "total", importe: "importe_total" };
function sub(xml, vars) { return xml.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (m, k) => { const kk = key(k), v = vars[kk] != null ? vars[kk] : vars[ALIAS[kk]]; return v != null ? X(v) : vars.__keep ? m : ""; }); }
function ptext(p) { return [...p.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&")).join(""); }
const ptextAll = (s) => (s.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [s]).map(ptext).join(" ").trim();
function setText(p, text) {
  const open = (/^<w:p[^>]*>/.exec(p) || ["<w:p>"])[0], ppr = (/<w:pPr>[\s\S]*?<\/w:pPr>/.exec(p) || [""])[0], rpr = (/<w:r>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?/.exec(p) || [""])[0].replace(/^<w:r>/, "");
  return `${open}${ppr}<w:r>${rpr}<w:t xml:space="preserve">${X(text)}</w:t></w:r></w:p>`;
}
function joinRuns(xml) { return xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (p) => (/\{\{|\}\}|\{|\}/.test(ptext(p)) && /<w:t[ >]/.test(p) && (p.match(/<w:r[ >]/g) || []).length > 1 ? setText(p, ptext(p)) : p)); }

const Plan = {
  /* datos de un resguardante o un área a partir de los artículos del inventario */
  vars(kind, name, items, extra) {
    const tot = items.reduce((a, x) => a + (x.im || 0), 0), d = new Date();
    return Object.assign({ persona: kind === "per" ? name : "", area: kind === "area" ? name : [...new Set(items.map((x) => x.ar).filter(Boolean))].join("; "), fecha: d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }), total: String(items.length), importe_total: money(tot), plantel: "CONALEP Chetumal" }, extra || {});
  },
  rowOf: (x, i) => ({ n: String(i + 1), marbete: x.mb, descripcion: x.ds, marca: x.ma, modelo: x.mo, serie: x.se, importe_art: x.im ? money(x.im) : "", factura: x.fa, fecha_adq: x.fe, cuenta: x.cu, proveedor: x.pr, estado: x.estado || "" }),
};
const api = { analyze, materialize, summarize, compare, learn, parseDate, parseMoney, roleOfHeader, ROLE_LABEL, CAT_LABEL, CAT_KEEP, norm, clean, lev, title, money };
if (typeof window !== "undefined") { window.Magic = api; window.Docx = Docx; window.Plan = Plan; }
if (typeof module !== "undefined") module.exports = { Magic: api, Docx, Plan };
})();
