/* Portal de inventario CONALEP · archivos: Excel (lectura y escritura propias), CSV, PDF, ZIP y etiquetas QR.
   No depende de servicios externos: JSZip y pdf-lib viven en /vendor y se cargan solo cuando se necesitan. */
(() => {
"use strict";
const F = {};
const loaded = {};
F.load = (src, global) => loaded[src] || (loaded[src] = new Promise((res, rej) => {
  if (window[global]) return res(window[global]);
  const s = document.createElement("script"); s.src = src; s.async = true;
  s.onload = () => (window[global] ? res(window[global]) : rej({ message: "No se pudo preparar " + global + "." }));
  s.onerror = () => { delete loaded[src]; s.remove(); rej({ message: "No se pudo cargar una parte del portal. Revisa tu conexión." }); };
  document.head.appendChild(s);
}));
const JSZ = () => F.load("vendor/jszip.min.js", "JSZip");
const PDFL = () => F.load("vendor/pdf-lib.min.js", "PDFLib");
F.preload = () => { JSZ().catch(() => {}); PDFL().catch(() => {}); };

/* ---------- descargar ---------- */
F.save = (filename, data, type) => {
  const blob = data instanceof Blob ? data : new Blob([data], { type: type || "application/octet-stream" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
  return blob;
};
F.safe = (s) => String(s).replace(/[\\/:*?"<>|\n\r\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 50);
F.fecha = () => new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
F.stamp = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const tick = () => new Promise((r) => setTimeout(r));

/* ================= EXCEL: escritura ================= */
const esc = (s) => String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F￾￿]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const colName = (c) => { let s = ""; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
F.colName = colName;
const ST = { title: 1, sub: 2, head: 3, money: 4, int: 5, bold: 6, moneyBold: 7, ok: 8, bad: 9, warn: 10, muted: 11, wrap: 12, right: 13, pct: 14 };
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/><numFmt numFmtId="165" formatCode="0%"/></numFmts>
<fonts count="8">
<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="14"/><color rgb="FF006B54"/><name val="Calibri"/><family val="2"/></font>
<font><sz val="10"/><color rgb="FF5E6E68"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF0A7A3E"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFC2362B"/><name val="Calibri"/><family val="2"/></font>
<font><sz val="11"/><color rgb="FF9A5B00"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF006B54"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFD5DED9"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="15">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="4" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="7" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
function sheetXml(sh) {
  const rows = sh.rows || [];
  let x = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`;
  x += `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>`;
  x += `<sheetViews><sheetView workbookViewId="0"${sh.freeze ? "" : ' tabSelected="0"'}>` + (sh.freeze ? `<pane ySplit="${sh.freeze}" topLeftCell="A${sh.freeze + 1}" activePane="bottomLeft" state="frozen"/>` : "") + `</sheetView></sheetViews>`;
  x += `<sheetFormatPr defaultRowHeight="15"/>`;
  if (sh.cols && sh.cols.length) x += "<cols>" + sh.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("") + "</cols>";
  x += "<sheetData>";
  rows.forEach((row, r) => {
    if (!row || !row.length) return;
    const ht = sh.heights && sh.heights[r] ? ` ht="${sh.heights[r]}" customHeight="1"` : "";
    x += `<row r="${r + 1}"${ht}>`;
    row.forEach((cell, c) => {
      if (cell === null || cell === undefined || cell === "") return;
      const o = typeof cell === "object" && !(cell instanceof Date) ? cell : { v: cell };
      const ref = colName(c) + (r + 1), s = o.s ? ` s="${ST[o.s] || 0}"` : "";
      if (o.f) x += `<c r="${ref}"${s}><f>${esc(o.f)}</f>${o.v !== undefined && o.v !== "" ? `<v>${Number(o.v) || 0}</v>` : ""}</c>`;
      else if (typeof o.v === "number" && isFinite(o.v)) x += `<c r="${ref}"${s}><v>${o.v}</v></c>`;
      else if (o.v === undefined || o.v === null || o.v === "") { if (o.s) x += `<c r="${ref}"${s}/>`; }
      else x += `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${esc(o.v)}</t></is></c>`;
    });
    x += "</row>";
  });
  x += "</sheetData>";
  if (sh.filter) x += `<autoFilter ref="${sh.filter}"/>`;
  if (sh.merges && sh.merges.length) x += `<mergeCells count="${sh.merges.length}">` + sh.merges.map((m) => `<mergeCell ref="${m}"/>`).join("") + "</mergeCells>";
  x += `<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="1" orientation="${sh.portrait ? "portrait" : "landscape"}" fitToWidth="1" fitToHeight="0"/>`;
  return x + "</worksheet>";
}
const sheetName = (s, used) => { let n = String(s || "Hoja").replace(/[\[\]:*?\/\\]/g, " ").trim().slice(0, 31) || "Hoja"; let k = 2; while (used.has(n.toLowerCase())) n = n.slice(0, 28) + " " + k++; used.add(n.toLowerCase()); return n; };
F.xlsx = async (sheets) => {
  const JSZip = await JSZ(); const z = new JSZip(); const used = new Set();
  sheets = sheets.map((s) => ({ ...s, name: sheetName(s.name, used) }));
  z.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  z.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  z.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Inventario CONALEP Chetumal</dc:title><dc:creator>${esc(window.D?.user || "Inventario")}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`);
  const defs = sheets.map((s, i) => s.filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${s.name.replace(/'/g, "''")}'!$${s.filter.split(":")[0].replace(/(\d+)/, "\$$1")}:$${(s.filterEnd || s.filter.split(":")[1]).replace(/(\d+)/, "\$$1")}</definedName>` : "").join("");
  z.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>${defs ? "<definedNames>" + defs + "</definedNames>" : ""}</workbook>`);
  z.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  z.file("xl/styles.xml", STYLES);
  sheets.forEach((s, i) => z.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)));
  return z.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", compression: "DEFLATE" });
};
/* tabla con título, subtítulos, encabezados verdes, filtro, totales y columnas ajustadas */
F.table = ({ name, title, subs = [], head, rows, widths, money = [], ints = [], total, statusCol = -1, portrait }) => {
  const R = [];
  R.push([{ v: title, s: "title" }]);
  subs.forEach((s) => R.push([{ v: s, s: "sub" }]));
  R.push([]);
  const hr = R.length; R.push(head.map((h) => ({ v: h, s: "head" })));
  rows.forEach((row) => R.push(row.map((v, c) => {
    if (v && typeof v === "object") return v;
    if (money.includes(c) && typeof v === "number") return { v, s: "money" };
    if (ints.includes(c) && typeof v === "number") return { v, s: "int" };
    if (c === statusCol) return { v, s: v === "Presente" ? "ok" : v === "No está" ? "bad" : v === "Pendiente" ? "warn" : undefined };
    return v;
  })));
  const last = R.length;
  if (total) {
    R.push([]);
    const tr = []; tr[total.labelCol] = { v: total.label || "TOTAL", s: "right" };
    for (const c of total.sumCols || []) { const L = colName(c); let sum = 0; rows.forEach((r) => { const v = r[c]; sum += typeof v === "number" ? v : v && typeof v.v === "number" ? v.v : 0; }); tr[c] = { f: `SUM(${L}${hr + 2}:${L}${last})`, v: Math.round(sum * 100) / 100, s: money.includes(c) ? "moneyBold" : "bold" }; }
    for (const [c, v] of Object.entries(total.extra || {})) tr[c] = { v, s: "bold" };
    R.push(tr);
  }
  const lastCol = colName(head.length - 1);
  return { name, rows: R, cols: widths || head.map(() => 16), freeze: hr + 1, filter: `A${hr + 1}:${lastCol}${hr + 1}`, filterEnd: `${lastCol}${Math.max(last, hr + 1)}`, merges: [], heights: { [hr]: 30 }, portrait };
};

/* ================= EXCEL / CSV: lectura ================= */
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const xmlDoc = (s) => new DOMParser().parseFromString(s, "application/xml");
const tags = (n, t) => n.getElementsByTagNameNS("*", t);
const kids = (n, t) => [...n.childNodes].filter((x) => x.nodeType === 1 && x.localName === t);
function isDateFmt(id, code) {
  if ((id >= 14 && id <= 22) || (id >= 27 && id <= 36) || (id >= 45 && id <= 47) || (id >= 50 && id <= 58)) return true;
  if (!code || /^general$/i.test(code)) return false;
  const c = code.replace(/"[^"]*"/g, "").replace(/\\./g, "").replace(/\[[^\]]*\]/g, "").replace(/_.|\*./g, "");
  return /[dmyhs]/i.test(c) && !/^[#0.,\s%E+\-]*$/i.test(c);
}
const ymd = (v, d1904) => {
  let days = Math.floor(v); if (d1904) days += 1462;
  if (days === 60) return { y: 1900, m: 2, d: 29 };
  const dt = new Date((days >= 61 ? Date.UTC(1899, 11, 30) : Date.UTC(1899, 11, 31)) + days * 864e5);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
};
function mkSheet(name, cells) {
  let er = 0, ec = 0, sr = Infinity, sc = Infinity;
  for (const k of cells.keys()) { const r = Math.floor(k / 16384), c = k % 16384; if (r > er) er = r; if (c > ec) ec = c; if (r < sr) sr = r; if (c < sc) sc = c; }
  if (!cells.size) { sr = sc = 0; }
  return { name, get: (r, c) => cells.get(r * 16384 + c), s: { r: sr === Infinity ? 0 : sr, c: sc === Infinity ? 0 : sc }, e: { r: er, c: ec }, size: cells.size ? (er - sr + 1) * (ec - sc + 1) : 0 };
}
async function readXlsx(buf) {
  const JSZip = await JSZ();
  let z; try { z = await JSZip.loadAsync(buf); } catch (e) { throw { message: "No pude abrir ese archivo. Guárdalo como .xlsx desde Excel e inténtalo otra vez." }; }
  const txt = async (p) => { const f = z.file(p) || z.file(p.replace(/^\//, "")); return f ? f.async("string") : null; };
  const wbx = await txt("xl/workbook.xml"); if (!wbx) throw { message: "Ese archivo no parece un Excel (.xlsx)." };
  const wb = xmlDoc(wbx);
  const pr = tags(wb, "workbookPr")[0]; const d1904 = pr && /^(1|true)$/i.test(pr.getAttribute("date1904") || "");
  const rels = {}; const rx = await txt("xl/_rels/workbook.xml.rels");
  if (rx) for (const r of tags(xmlDoc(rx), "Relationship")) rels[r.getAttribute("Id")] = r.getAttribute("Target");
  const sst = []; const sx = await txt("xl/sharedStrings.xml");
  if (sx) for (const si of tags(xmlDoc(sx), "si")) { let s = ""; for (const t of tags(si, "t")) { let p = t.parentNode, ph = false; while (p && p !== si) { if (p.localName === "rPh") ph = true; p = p.parentNode; } if (!ph) s += t.textContent; } sst.push(s); }
  const fmts = {}, xfs = []; const stx = await txt("xl/styles.xml");
  if (stx) { const st = xmlDoc(stx); for (const f of tags(st, "numFmt")) fmts[f.getAttribute("numFmtId")] = f.getAttribute("formatCode"); const cx = tags(st, "cellXfs")[0]; if (cx) for (const xf of kids(cx, "xf")) { const id = +xf.getAttribute("numFmtId") || 0; xfs.push({ id, code: fmts[id] || "" }); } }
  const out = [];
  for (const s of tags(wb, "sheet")) {
    const rid = s.getAttributeNS(NS_R, "id") || s.getAttribute("r:id"); let target = rels[rid]; if (!target) continue;
    target = target.startsWith("/") ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
    const x = await txt(target); if (!x) continue;
    const doc = xmlDoc(x); const cells = new Map(); let rAuto = 0;
    for (const row of tags(doc, "row")) {
      const rr = row.getAttribute("r"); const r = rr ? +rr - 1 : rAuto; rAuto = r + 1; let cAuto = 0;
      for (const c of kids(row, "c")) {
        const ref = c.getAttribute("r"); let col = cAuto;
        if (ref) { const m = /^([A-Z]+)/.exec(ref); col = 0; for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64; col--; }
        cAuto = col + 1;
        const t = c.getAttribute("t") || "n", sIx = +(c.getAttribute("s") || 0);
        const vEl = kids(c, "v")[0], v = vEl ? vEl.textContent : null;
        let cell = null;
        if (t === "s") { if (v != null) cell = { t: "s", v: sst[+v] ?? "" }; }
        else if (t === "inlineStr") { const is = kids(c, "is")[0]; if (is) { let s2 = ""; for (const tt of tags(is, "t")) s2 += tt.textContent; cell = { t: "s", v: s2 }; } }
        else if (t === "str") { if (v != null) cell = { t: "s", v }; }
        else if (t === "b") { if (v != null) cell = { t: "b", v: v === "1" || v === "true" }; }
        else if (t === "e") cell = null;
        else if (t === "d") { if (v) { const dt = new Date(v); if (!isNaN(dt)) cell = { t: "d", v: dt }; } }
        else if (v != null && v !== "") { const n = parseFloat(v); if (isFinite(n)) { const xf = xfs[sIx] || { id: 0, code: "" }; cell = { t: "n", v: n, date: isDateFmt(xf.id, xf.code), d1904 }; } }
        if (cell) cells.set(r * 16384 + col, cell);
      }
    }
    out.push(mkSheet(s.getAttribute("name") || "Hoja", cells));
  }
  if (!out.length) throw { message: "No encontré hojas con datos en ese archivo." };
  return out;
}
function decodeText(buf) {
  const u8 = new Uint8Array(buf);
  try { return new TextDecoder("utf-8", { fatal: true }).decode(u8).replace(/^﻿/, ""); }
  catch (e) { return new TextDecoder("windows-1252").decode(u8); }
}
function readCsv(buf) {
  const s = decodeText(buf); const first = s.split(/\r?\n/).find((l) => l.trim()) || "";
  const count = (ch) => { let n = 0, q = false; for (const c of first) { if (c === '"') q = !q; else if (c === ch && !q) n++; } return n; };
  const dl = [",", ";", "\t", "|"].sort((a, b) => count(b) - count(a))[0];
  const cells = new Map(); let r = 0, c = 0, cur = "", q = false;
  const push = () => { const t = cur.trim(); if (t !== "") cells.set(r * 16384 + c, /^-?\d+(\.\d+)?$/.test(t) ? { t: "n", v: parseFloat(t) } : { t: "s", v: cur }); cur = ""; };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"') q = true; else if (ch === dl) { push(); c++; } else if (ch === "\n" || ch === "\r") { if (ch === "\r" && s[i + 1] === "\n") i++; push(); r++; c = 0; } else cur += ch;
  }
  push();
  return [mkSheet("CSV", cells)];
}
async function readXls(buf) {
  let X;
  try { X = await F.load("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", "XLSX"); }
  catch (e) { throw { message: "Los archivos .xls antiguos necesitan internet para abrirse. También puedes guardarlo como .xlsx desde Excel." }; }
  const wb = X.read(buf, { type: "array", cellNF: true, cellDates: false });
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name]; const cells = new Map();
    for (const k of Object.keys(ws)) { if (k[0] === "!") continue; const a = X.utils.decode_cell(k), x = ws[k]; if (x.v == null || x.v === "") continue;
      cells.set(a.r * 16384 + a.c, x.t === "n" ? { t: "n", v: x.v, date: !!(x.z && X.SSF.is_date(x.z)) } : x.t === "b" ? { t: "b", v: x.v } : x.t === "d" ? { t: "d", v: x.v } : x.t === "e" ? null : { t: "s", v: String(x.v) }); }
    for (const [k, v] of [...cells]) if (!v) cells.delete(k);
    return mkSheet(name, cells);
  });
}
F.readSheets = async (file) => {
  const buf = await file.arrayBuffer(); const n = file.name.toLowerCase();
  if (n.endsWith(".csv") || n.endsWith(".txt")) return readCsv(buf);
  const u8 = new Uint8Array(buf.slice(0, 4));
  if (u8[0] === 0x50 && u8[1] === 0x4b) return readXlsx(buf);
  if (u8[0] === 0xd0 && u8[1] === 0xcf) return readXls(buf);
  if (n.endsWith(".xls")) return readXls(buf);
  return readXlsx(buf);
};
/* misma interpretación de celdas que el generador anterior: fechas dd/mm/aaaa, importes con $, enteros sin decimales */
const AMT = /importe|costo|precio|monto|valor/i;
const p2 = (n) => String(n).padStart(2, "0");
function cellVal(cell, isAmt) {
  if (!cell || cell.v == null || cell.v === "") return ["", ""];
  const v = cell.v;
  if (cell.t === "d" || (cell.t === "n" && cell.date)) {
    const d = cell.t === "d" ? { y: v.getFullYear(), m: v.getMonth() + 1, d: v.getDate() } : ymd(v, cell.d1904);
    const s = p2(d.d) + "/" + p2(d.m) + "/" + d.y; return [s, s];
  }
  if (cell.t === "n") {
    if (isAmt) return ["$" + v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), v.toFixed(2)];
    if (v === 0) return ["", ""];
    const s = Number.isInteger(v) ? String(v) : String(+v.toFixed(4)); return [s, s];
  }
  if (cell.t === "b") return v ? ["Sí", "SI"] : ["No", "NO"];
  const s = String(v).replace(/\s+/g, " ").trim();
  return s === "0" ? ["", ""] : [s, s];
}
F.extractTable = (ws) => {
  if (!ws.size) throw { message: "Esa hoja está vacía." };
  const R = { s: ws.s, e: ws.e };
  const txt = (r, c) => { const x = ws.get(r, c); return x && x.v != null ? String(x.t === "d" ? "fecha" : x.v).trim() : ""; };
  const cnt = (r) => { let n = 0; for (let c = R.s.c; c <= R.e.c; c++) if (txt(r, c)) n++; return n; };
  const counts = []; for (let r = R.s.r; r <= Math.min(R.e.r, R.s.r + 25); r++) counts.push(cnt(r));
  const mx = Math.max(0, ...counts);
  let hi = counts.findIndex((n) => n >= Math.max(2, Math.ceil(mx * 0.6))); hi = R.s.r + (hi < 0 ? 0 : hi);
  const hdr = [], idx = [];
  for (let c = R.s.c; c <= R.e.c; c++) {
    let h = txt(hi, c).replace(/\s+/g, " ");
    if (!h) { let any = false; for (let r = hi + 1; r <= R.e.r && !any; r++) any = !!txt(r, c); if (!any) continue; h = "Columna " + colName(c); }
    let nm = h, j = 2; while (hdr.includes(nm)) nm = h + " " + j++; hdr.push(nm); idx.push(c);
  }
  const kh = hdr.find((h) => /marbete|inventario|folio|clave|c[oó]digo/i.test(h)) || hdr[0];
  const kc = idx[hdr.indexOf(kh)];
  const rows = [];
  for (let r = hi + 1; r <= R.e.r; r++) {
    let stop = false; for (const c of idx) { const t = txt(r, c).toUpperCase(); if (t === "TOTAL" || t === "TOTALES") { stop = true; break; } }
    if (stop) break;
    if (!txt(r, kc) || cnt(r) < 3) continue;
    const cells = {};
    hdr.forEach((h, k) => { cells[h] = cellVal(ws.get(r, idx[k]), AMT.test(h))[0]; });
    rows.push({ row: r + 1, cells });
  }
  if (!rows.length) throw { message: "No encontré artículos en esa hoja. Revisa que tenga encabezados y filas con datos (marbete y al menos 3 columnas llenas)." };
  return { hdr, rows, hdrRow: hi + 1, keyCol: kh, sheet: ws.name };
};
/* lee el archivo y escoge la hoja más grande, como antes */
F.readTable = async (file) => {
  const sheets = await F.readSheets(file);
  const big = sheets.slice().sort((a, b) => b.size - a.size)[0];
  return { ...F.extractTable(big), sheets: sheets.map((s) => s.name) };
};

/* ================= ETIQUETAS QR (mismo diseño y mismo contenido que siempre) ================= */
const RATIO = 1.42, LOGO_AR = 420 / 355, QX = 60, QY = 265, QS = 880;
F.RATIO = RATIO;
const LOGO = new Image(); LOGO.src = "assets/logo.png";
F.logoReady = () => (LOGO.complete && LOGO.naturalWidth ? Promise.resolve() : new Promise((r) => { LOGO.onload = r; LOGO.onerror = r; }));
const qrCache = new Map();
F.qrOf = (it) => {
  const url = location.origin + "/#" + it.tok;
  if (qrCache.has(url)) return qrCache.get(url);
  let q = null; try { q = QR.encode(url, "Q"); } catch (e) {}
  qrCache.set(url, q); return q;
};
const keyShort = () => { const h = D.hMB || ""; const map = [[/marbete/i, "MARBETE"], [/inventario/i, "INVENTARIO"], [/folio/i, "FOLIO"], [/clave/i, "CLAVE"], [/c[oó]digo/i, "CODIGO"]]; for (const [re, l] of map) if (re.test(h)) return l; return "MARBETE"; };
F.labelLines = (it) => (it.lines ? it.lines : it.mb ? [keyShort() + " " + it.mb, "No. " + it.n] : ["No. " + it.n, ""]);
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function fitFont(c, txt, weight, size, maxW) { let s = size; c.font = `${weight} ${s}px Arial, Helvetica, sans-serif`; while (c.measureText(txt).width > maxW && s > 20) { s -= 2; c.font = `${weight} ${s}px Arial, Helvetica, sans-serif`; } }
function drawModules(c, qr, x, y, S) {
  const n = qr.getModuleCount(), m = S / (n + 8); c.fillStyle = "#000";
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
    if (!qr.isDark(r, k)) continue;
    const x0 = Math.round(x + (k + 4) * m), y0 = Math.round(y + (r + 4) * m), x1 = Math.round(x + (k + 5) * m), y1 = Math.round(y + (r + 5) * m);
    c.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
}
F.drawLabel = (cv, W, it) => {
  const k = W / 1000; cv.width = W; cv.height = Math.round(W * RATIO);
  const c = cv.getContext("2d");
  c.fillStyle = "#fff"; c.fillRect(0, 0, W, cv.height);
  c.save(); c.scale(k, k);
  c.strokeStyle = "#c9cecb"; c.lineWidth = 6; rr(c, 3, 3, 994, 1414, 40); c.stroke();
  const lh = 180, lw = lh * LOGO_AR; if (LOGO.complete && LOGO.naturalWidth) c.drawImage(LOGO, 500 - lw / 2, 55, lw, lh);
  const [a, b] = F.labelLines(it); c.fillStyle = "#000"; c.textAlign = "center"; c.textBaseline = "middle";
  fitFont(c, a, "700", 84, 880); c.fillText(a, 500, 1232);
  if (b) { c.fillStyle = "#555"; fitFont(c, b, "400", 48, 880); c.fillText(b, 500, 1335); }
  c.restore();
  const qr = F.qrOf(it);
  if (qr) drawModules(c, qr, QX * k, QY * k, QS * k);
  else { c.fillStyle = "#a6461a"; c.font = `600 ${Math.round(40 * k)}px Arial`; c.textAlign = "center"; c.fillText("No se pudo generar", W / 2, (QY + QS / 2) * k); }
  return cv;
};
/* QR suelto (para la ficha y pantallas) como SVG nítido */
F.qrSvg = (it, cls = "") => {
  const qr = F.qrOf(it); if (!qr) return "";
  const n = qr.getModuleCount(); let d = "";
  for (let r = 0; r < n; r++) { let k = 0; while (k < n) { if (!qr.isDark(r, k)) { k++; continue; } let e = k; while (e < n && qr.isDark(r, e)) e++; d += `M${k + 4} ${r + 4}h${e - k}v1h${k - e}z`; k = e; } }
  return `<svg class="${cls}" viewBox="0 0 ${n + 8} ${n + 8}" shape-rendering="crispEdges" role="img" aria-label="Código QR del marbete ${it.mb}"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
};
const PAGE = { w: 215.9, h: 279.4, m: 10 };
F.layout = (L) => { const cw = L + 6, ch = L * RATIO + 9 + 4; const cols = Math.max(1, Math.floor((PAGE.w - 2 * PAGE.m + 6) / cw)), rows = Math.max(1, Math.floor((PAGE.h - 2 * PAGE.m + 4) / ch)); return { L, cw, ch, cols, rows, per: cols * rows }; };

/* ================= PDF ================= */
const MM = 72 / 25.4;
const WIN = new Set([..."€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ"].map((c) => c.charCodeAt(0)));
const win = (s) => String(s ?? "").replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").replace(/[–—−]/g, "-").replace(/…/g, "...").replace(/[\r\n\t]+/g, " ").replace(/[^\x20-\x7E\xA0-\xFF]/g, (c) => (WIN.has(c.charCodeAt(0)) ? c : c.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7E]/g, "?")));
F.win = win;
let logoBytes = null;
async function logoPng(pdf) { if (!logoBytes) logoBytes = await fetch("assets/logo.png").then((r) => r.arrayBuffer()); return pdf.embedPng(logoBytes); }
function wrap(text, font, size, maxW) {
  const words = win(text).split(/\s+/).filter(Boolean); const lines = []; let cur = "";
  const fits = (t) => font.widthOfTextAtSize(t, size) <= maxW;
  for (let w of words) {
    if (!fits(w)) { if (cur) { lines.push(cur); cur = ""; } while (w && !fits(w)) { let k = w.length; while (k > 1 && !fits(w.slice(0, k))) k--; lines.push(w.slice(0, k)); w = w.slice(k); } cur = w; continue; }
    const t = cur ? cur + " " + w : w; if (fits(t)) cur = t; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur); return lines.length ? lines : [""];
}
async function pdfBase() {
  const L = await PDFL(); const pdf = await L.PDFDocument.create();
  pdf.setTitle("Inventario CONALEP Chetumal"); pdf.setAuthor(window.D?.user || "Servicios Administrativos"); pdf.setCreator("Portal de inventario CONALEP");
  const font = await pdf.embedFont(L.StandardFonts.Helvetica), bold = await pdf.embedFont(L.StandardFonts.HelveticaBold);
  const logo = await logoPng(pdf);
  return { L, pdf, font, bold, logo, rgb: L.rgb };
}
/* Tabla oficial: resguardos, listas y reportes (carta horizontal) */
F.pdfTable = async ({ title, subtitle, info, cols, rows, footer, signature, landscape = true, onProg }) => {
  const { L, pdf, font, bold, logo, rgb } = await pdfBase();
  const W = (landscape ? 279.4 : 215.9) * MM, H = (landscape ? 215.9 : 279.4) * MM, M = 10 * MM;
  const tw = cols.reduce((s, c) => s + c.w, 0), sc = (W - 2 * M) / tw; const cw = cols.map((c) => c.w * sc);
  const GREEN = rgb(0, 107 / 255, 84 / 255), INK = rgb(0.08, 0.08, 0.08), GRAY = rgb(0.32, 0.32, 0.32);
  let page, y; const pages = [];
  const head = () => {
    page = pdf.addPage([W, H]); pages.push(page);
    const lh = 12 * MM, lw = lh * LOGO_AR; page.drawImage(logo, { x: M, y: H - M - lh, width: lw, height: lh });
    page.drawText(win(title), { x: M + lw + 4 * MM, y: H - M - 4.5 * MM, size: 11, font: bold, color: INK });
    if (subtitle) page.drawText(win(subtitle), { x: M + lw + 4 * MM, y: H - M - 9.5 * MM, size: 9, font, color: GRAY });
    let extra = 0;
    if (info) {
      const t = win(info), iw = font.widthOfTextAtSize(t, 9), tw2 = bold.widthOfTextAtSize(win(title), 11);
      if (M + lw + 4 * MM + tw2 + 8 * MM < W - M - iw) page.drawText(t, { x: W - M - iw, y: H - M - 4.5 * MM, size: 9, font, color: GRAY });
      else { page.drawText(t, { x: M + lw + 4 * MM, y: H - M - 14 * MM, size: 9, font, color: GRAY }); extra = 4 * MM; }
    }
    y = H - M - 17 * MM - extra;
    page.drawRectangle({ x: M, y: y - 6 * MM, width: W - 2 * M, height: 6 * MM, color: GREEN });
    let x = M; cols.forEach((c, j) => { const t = wrap(String(c.h).toUpperCase(), bold, 7, cw[j] - 2 * MM)[0]; page.drawText(t, { x: c.right ? x + cw[j] - 1 * MM - bold.widthOfTextAtSize(t, 7) : x + 1 * MM, y: y - 4.1 * MM, size: 7, font: bold, color: rgb(1, 1, 1) }); x += cw[j]; });
    y -= 6 * MM;
  };
  head();
  for (let i = 0; i < rows.length; i++) {
    const vals = rows[i]; const lines = vals.map((v, j) => wrap(v ?? "", font, 7.5, cw[j] - 2 * MM));
    const rh = Math.max(...lines.map((x) => x.length)) * 3.2 * MM + 2.4 * MM;
    if (y - rh < M + 22 * MM) head();
    if (i % 2) page.drawRectangle({ x: M, y: y - rh, width: W - 2 * M, height: rh, color: rgb(242 / 255, 245 / 255, 244 / 255) });
    let x = M;
    lines.forEach((ln, j) => { ln.forEach((t, k) => { const tx = cols[j].right ? x + cw[j] - 1 * MM - font.widthOfTextAtSize(t, 7.5) : x + 1 * MM; page.drawText(t, { x: tx, y: y - 3.4 * MM - k * 3.2 * MM, size: 7.5, font, color: INK }); }); x += cw[j]; });
    y -= rh;
    if (onProg && i % 200 === 0) { onProg(i, rows.length); await tick(); }
  }
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  if (y - 30 * MM < M) { head(); }
  if (footer) page.drawText(win(footer), { x: M, y: y - 6 * MM, size: 9, font: bold, color: INK });
  const sigs = signature ? (Array.isArray(signature) ? signature : [signature]) : [];
  sigs.forEach((s, k) => {
    const x1 = W - M - (k + 1) * 86 * MM + 6 * MM, x2 = x1 + 80 * MM, cx = (x1 + x2) / 2, yl = y - 20 * MM;
    page.drawLine({ start: { x: x1, y: yl }, end: { x: x2, y: yl }, thickness: 0.6, color: INK });
    const a = win(s.name || ""), b = win(s.role || "");
    page.drawText(a, { x: cx - font.widthOfTextAtSize(a, 8) / 2, y: yl - 4 * MM, size: 8, font, color: INK });
    page.drawText(b, { x: cx - font.widthOfTextAtSize(b, 8) / 2, y: yl - 7.5 * MM, size: 8, font, color: GRAY });
  });
  pages.forEach((p, k) => { const t = `Hoja ${k + 1} de ${pages.length}`; p.drawText(t, { x: W - M - font.widthOfTextAtSize(t, 8), y: M - 4 * MM, size: 8, font, color: GRAY }); });
  return new Blob([await pdf.save()], { type: "application/pdf" });
};
/* Etiquetas QR en hojas carta: misma geometría que el generador anterior, QR vectorial nítido */
F.pdfLabels = async (list, L, onProg) => {
  const { L: PL, pdf, font, bold, logo, rgb } = await pdfBase();
  const g = F.layout(L), k = g.L / 1000, gx = (PAGE.w - 2 * PAGE.m - g.cols * g.cw + 6) / 2;
  const H = PAGE.h * MM; let page;
  const Y = (mm) => H - mm * MM;
  for (let i = 0; i < list.length; i++) {
    const it = list[i], slot = i % g.per; if (slot === 0) page = pdf.addPage([PAGE.w * MM, H]);
    const col = slot % g.cols, row = Math.floor(slot / g.cols), x = PAGE.m + gx + col * g.cw, y = PAGE.m + row * g.ch;
    const w = g.L * MM, h = g.L * RATIO * MM, r = 40 * k * MM;
    page.drawSvgPath(`M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`, { x: x * MM, y: Y(y), borderColor: rgb(201 / 255, 206 / 255, 203 / 255), borderWidth: 0.7 });
    const lh = 180 * k, lw = lh * LOGO_AR; page.drawImage(logo, { x: (x + g.L / 2 - lw / 2) * MM, y: Y(y + 55 * k + lh), width: lw * MM, height: lh * MM });
    const qr = F.qrOf(it);
    if (qr) {
      const n = qr.getModuleCount(), S = QS * k, m = S / (n + 8), ox = x + QX * k, oy = y + QY * k; const ops = [PL.pushGraphicsState(), PL.setFillingRgbColor(0, 0, 0)];
      for (let rr2 = 0; rr2 < n; rr2++) { let c = 0; while (c < n) { if (!qr.isDark(rr2, c)) { c++; continue; } let e = c; while (e < n && qr.isDark(rr2, e)) e++; ops.push(PL.rectangle((ox + (c + 4) * m) * MM, Y(oy + (rr2 + 5) * m) - 0.01, (e - c) * m * MM + 0.02, m * MM + 0.02)); c = e; } }
      ops.push(PL.fill(), PL.popGraphicsState()); page.pushOperators(...ops);
    }
    const [a, b] = F.labelLines(it); const wa = win(a);
    let fs = 84 * k * MM; while (bold.widthOfTextAtSize(wa, fs) > g.L * 0.88 * MM && fs > 5) fs -= 0.5;
    page.drawText(wa, { x: (x + g.L / 2) * MM - bold.widthOfTextAtSize(wa, fs) / 2, y: Y(y + 1232 * k) - fs * 0.35, size: fs, font: bold, color: rgb(0, 0, 0) });
    if (b) { const wb = win(b), fb = 48 * k * MM; page.drawText(wb, { x: (x + g.L / 2) * MM - font.widthOfTextAtSize(wb, fb) / 2, y: Y(y + 1335 * k) - fb * 0.35, size: fb, font, color: rgb(85 / 255, 85 / 255, 85 / 255) }); }
    const d = wrap(it.ds || "", font, 7, g.L * MM).slice(0, 2);
    d.forEach((t, j) => page.drawText(t, { x: x * MM, y: Y(y + g.L * RATIO + 3.5) - j * 8, size: 7, font, color: rgb(60 / 255, 60 / 255, 60 / 255) }));
    if (onProg && i % 40 === 0) { onProg(i, list.length); await tick(); }
  }
  return new Blob([await pdf.save()], { type: "application/pdf" });
};
F.zipLabels = async (list, onProg) => {
  const JSZip = await JSZ(); const zip = new JSZip(), cv = document.createElement("canvas"); await F.logoReady();
  for (let i = 0; i < list.length; i++) {
    const it = list[i]; F.drawLabel(cv, 600, it);
    const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
    zip.file(String(it.n).padStart(4, "0") + (it.mb ? "_" + F.safe(it.mb) : "") + ".png", blob);
    if (onProg && i % 25 === 0) { onProg(i, list.length); await tick(); }
  }
  return zip.generateAsync({ type: "blob" });
};

window.F = F;
})();
