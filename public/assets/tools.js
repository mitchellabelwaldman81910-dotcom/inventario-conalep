/* Portal · Herramientas inteligentes: Borrador mágico, Plantillas y Comparar con el inventario.
   El análisis vive en magic.js (sin pantalla). Aquí están las pantallas. */
(() => {
"use strict";
const { $, $$, esc, h, icon } = U;
const SIN = D.SIN, M = window.Magic, DX = window.Docx, PL = window.Plan;
const head = (title, sub, acts = "") => `<header class="vh"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${acts ? `<div class="acts">${acts}</div>` : ""}</header>`;
const busy = async (btn, fn) => { btn.classList.add("busy"); btn.disabled = true; try { return await fn(); } finally { btn.classList.remove("busy"); btn.disabled = false; } };
const JSZ = () => F.jszip();
const back = (t = "Herramientas") => `<a class="back" href="#/herramientas">${icon("left")}${t}</a>`;
const fmt = (n) => B.int(n);

/* ---------- lo que la app va aprendiendo ---------- */
const MEMK = "cnlp_magic_mem";
let MEM = null, memLoaded = false;
const memLocal = () => { try { return JSON.parse(localStorage.getItem(MEMK) || "{}"); } catch (e) { return {}; } };
async function memLoad() {
  if (memLoaded) return MEM; MEM = memLocal();
  try { const r = await D.call("db", { op: "get", path: "plantillas/aprende" }); if (r.exists && r.data && r.data.mem && (r.data.mem.n || 0) >= (MEM.n || 0)) MEM = r.data.mem; } catch (e) {}
  memLoaded = true; return MEM;
}
async function memSave(m) {
  MEM = m; try { localStorage.setItem(MEMK, JSON.stringify(m)); } catch (e) {}
  try { await D.call("db", { op: "set", path: "plantillas/aprende", data: { mem: m } }); } catch (e) {}
}
const memCount = (m) => Object.keys(m.roleOf || {}).length + Object.keys(m.keep || {}).length + Object.keys(m.nameFix || {}).length + Object.keys(m.areaFix || {}).length;

/* ---------- lo que el inventario ya sabe (para reconocer) ---------- */
function context() {
  const byMb = new Map(), people = B.names(), areaSet = new Set();
  for (const it of D.items) {
    if (it.ar) areaSet.add(it.ar);
    if (it.mb) byMb.set(M.norm(it.mb).replace(/ /g, ""), { marbete: it.mb, descripcion: it.ds, resguardante: it.rc === SIN ? "" : it.rc, area: it.ar, marca: it.ma, modelo: it.mo, serie: it.se, importe: it.imS, fecha: it.fe, factura: it.fa });
  }
  const up = D.items.filter((x) => x.ds && x.ds === x.ds.toUpperCase()).length > D.items.length * 0.6;
  return { marbetes: new Set(byMb.keys()), byMb, people, areas: [...areaSet].sort((a, b) => a.localeCompare(b, "es")), upper: up, smart: up ? (s) => s : (s) => B.smart(s) };
}
const roleToInv = () => { const K = D.K || {}, H = D.inv.h, g = (j) => (j >= 0 ? H[j] : ""); return { marbete: g(K.MB), descripcion: g(K.DS), resguardante: g(K.RC), area: g(K.AR), marca: g(K.MA), modelo: g(K.MO), serie: g(K.SE), importe: g(K.IM), fecha: g(K.FE), factura: g(K.FA), proveedor: g(K.PR), cuenta: g(K.CU) }; };

/* ---------- leer un archivo a una matriz de texto ---------- */
async function readGrid(file, sheetName) {
  const n = file.name.toLowerCase();
  if (/\.docx$/.test(n)) { const JSZip = await JSZ(); return { grid: await DX.grid(JSZip, await file.arrayBuffer()), sheets: [], sheet: "Word" }; }
  if (/\.(pdf|png|jpe?g|heic|webp)$/.test(n)) throw { message: "Todavía no leo PDF ni fotos de documentos. Conviértelo a Excel o Word y súbelo aquí." };
  const sheets = await F.readSheets(file); if (!sheets.length) throw { message: "El archivo no tiene hojas con datos." };
  const ws = (sheetName && sheets.find((s) => s.name === sheetName)) || sheets.slice().sort((a, b) => b.size - a.size)[0];
  const grid = []; for (let r = ws.s.r; r <= ws.e.r; r++) { const row = []; for (let c = ws.s.c; c <= ws.e.c; c++) row.push(F.cellText(ws.get(r, c))); grid.push(row); }
  return { grid, sheets: sheets.map((s) => s.name), sheet: ws.name };
}

/* =================== PANTALLA PRINCIPAL =================== */
const TOOLS = [
  { k: "borrador", ic: "spark", t: "Borrador mágico", d: "Sube un Excel o Word sucio. Entiende qué es cada columna, borra lo que no sirve (totales, firmas, títulos, repetidos), corrige nombres, fechas e importes y te avisa de lo importante.", b: "Limpiar un documento" },
  { k: "plantillas", ic: "file", t: "Plantillas", d: "Guarda tus formatos de Word una sola vez. Se llenan solos con los datos del inventario, para una persona, un área o para todas a la vez.", b: "Ver mis plantillas" },
];
U.route("herramientas", (r) => {
  const sub = r.param || ""; const el = h(`<div class="tools-v"></div>`);
  if (sub === "borrador") return viewBorrador(el);
  if (sub === "plantillas") return viewPlantillas(el);
  el.innerHTML = head("Herramientas inteligentes", "Aquí se suben documentos y trabajos para que el portal los entienda, los limpie y los use. Todo se calcula en tu navegador: nada sale a otros servicios.") +
    `<div class="grid g2" style="gap:16px">${TOOLS.map((t) => `<a class="pnl tool-c" href="#/herramientas/${t.k}"><div class="tool-i">${icon(t.ic)}</div><h2>${esc(t.t)}</h2><p>${esc(t.d)}</p><span class="btn pri">${esc(t.b)}</span></a>`).join("")}</div>
    <section class="pnl" style="margin-top:16px"><div class="pnl-h"><div><h2>Lo que ya aprendió de ti</h2><p id="mmS">Cargando…</p></div><button class="btn ghost" type="button" id="mmR">Olvidar lo aprendido</button></div>
      <p class="muted" style="font-size:13.5px">Cada vez que limpias un documento, el portal recuerda qué columnas son qué, qué tipo de filas prefieres conservar y qué correcciones de nombres aceptaste o rechazaste. La siguiente vez ya lo aplica solo.</p></section>
    <section class="pnl" style="margin-top:16px"><div class="pnl-h"><div><h2>Qué sigue</h2><p>Estas se construyen después, con lo que vayamos necesitando.</p></div></div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${["Crear herramientas propias", "Reportes automáticos", "Leer PDF y fotos de documentos", "Etiquetas por lote desde un documento"].map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></section>`;
  const paint = async () => { const m = await memLoad(); $("#mmS", el).textContent = m.n ? `${m.n} ${m.n === 1 ? "documento limpiado" : "documentos limpiados"} · ${memCount(m)} reglas aprendidas.` : "Todavía no ha aprendido nada. Limpia tu primer documento."; };
  return { el, title: "Herramientas", after() { paint(); $("#mmR", el).onclick = async () => { if (await U.confirm("¿Olvidar lo aprendido?", "El portal volverá a limpiar los documentos desde cero.", "Olvidar", true)) { await memSave({}); memLoaded = true; paint(); U.toast("Listo, empezamos de cero.", { kind: "ok" }); } }; } };
});

/* =================== BORRADOR MÁGICO =================== */
function viewBorrador(el) {
  let file = null, res = null, ctx = null, tab = "limpio", sheet = "", sheets = [], over = {}, raw = null;
  el.innerHTML = head("Borrador mágico", "Sube un Excel, CSV o Word. Borra lo que no sirve, corrige lo que se pueda y deja una tabla limpia que puedes descargar o mandar al inventario.", `<a class="btn ghost" href="#/herramientas">${icon("left")}<span>Herramientas</span></a>`) +
    `<label class="drop" id="drop" for="mgF">${icon("upload")}<b>Arrastra aquí tu documento o tócalo para elegirlo</b><p>Excel, CSV o Word con una tabla. Si es un PDF o una foto, primero conviértelo a Excel o Word.</p><input id="mgF" type="file" accept=".xlsx,.xls,.csv,.txt,.docx" hidden></label><div id="mgOut" style="margin-top:18px"></div>`;
  const out = $("#mgOut", el);
  const run = async () => {
    if (!raw) return; const m = Object.assign({}, await memLoad()); m.roleOf = Object.assign({}, m.roleOf, over);
    ctx = context(); res = M.analyze(raw, ctx, m); draw();
  };
  const handle = async (f) => {
    file = f; over = {}; out.innerHTML = `<section class="pnl"><p class="muted">Leyendo ${esc(f.name)}…</p><div class="prog" style="margin-top:10px"><i style="width:40%"></i></div></section>`;
    try { const g = await readGrid(f, sheet); raw = g.grid; sheets = g.sheets; sheet = g.sheet; if (!raw.length) throw { message: "El documento está vacío." }; await run(); FX.play("ok"); }
    catch (e) { out.innerHTML = `<section class="pnl">${U.empty("help", "No pude leer el documento", esc(e.message || D.errMsg(e)))}</section>`; FX.hit("err"); }
  };
  const roleOpts = (cur) => `<option value="">(no sé)</option>` + Object.entries(M.ROLE_LABEL).map(([k, v]) => `<option value="${k}"${cur === k ? " selected" : ""}>${esc(v)}</option>`).join("");
  const draw = () => {
    const I = res.info, keepN = I.buenas, fxLive = res.live();
    const tile = (v, l, cls = "") => `<div class="st ${cls}"><div class="v">${fmt(v)}</div><small>${l}</small></div>`;
    const cats = Object.entries(I.byCat).map(([c, n]) => `${n} ${M.CAT_LABEL[c].toLowerCase()}`).join(", ");
    out.innerHTML = `<section class="pnl"><div class="pnl-h"><div><h2>${esc(file.name)}</h2><p>${sheets.length > 1 ? `Hoja <select id="mgSh" class="sel">${sheets.map((s) => `<option${s === sheet ? " selected" : ""}>${esc(s)}</option>`).join("")}</select> · ` : ""}Encabezados en la fila ${res.hdrRow}. ${cats ? "Quité: " + esc(cats) + "." : "No había nada que quitar."}</p></div><button class="btn ghost" type="button" id="mgX">Quitar archivo</button></div>
      <div class="imp-s mg-t">${tile(I.filas, "Filas leídas")}${tile(keepN, "Se quedan", "si")}${tile(I.quitadas, "Se quitan", I.quitadas ? "no" : "")}${tile(I.correcciones, "Correcciones")}</div>
      <details class="mg-map" open><summary>Lo que entendí de tus columnas</summary><div class="mg-cols">${res.hdr.map((hh, j) => `<label><span>${esc(hh)}</span><select data-col="${esc(hh)}" class="sel">${roleOpts(res.roles[j])}</select></label>`).join("")}</div><p class="muted" style="font-size:13px;margin-top:8px">Si alguna columna está mal entendida, cámbiala y vuelvo a limpiar. La próxima vez lo recuerdo.</p></details></section>
      <section class="pnl" style="margin-top:16px"><nav class="tabs">${[["limpio", "Tabla limpia", keepN], ["quitado", "Quitado", I.quitadas], ["fixes", "Correcciones", fxLive.length], ["info", "Lo importante", ""], ["comp", "Comparar con el inventario", ""]].map(([k, l, n]) => `<button type="button" data-tab="${k}" class="${tab === k ? "on" : ""}">${l}${n !== "" ? ` <span class="cnt">${fmt(n)}</span>` : ""}</button>`).join("")}</nav><div id="mgBody"></div></section>
      <div class="mg-act"><button class="btn pri lg" type="button" id="mgDl">${icon("sheet")}<span>Descargar Excel limpio</span></button><button class="btn" type="button" id="mgIm">${icon("upload")}<span>Mandar al inventario…</span></button><button class="btn ghost" type="button" id="mgCp">${icon("copy")}<span>Copiar resumen</span></button></div>`;
    $("#mgX", out).onclick = () => { out.innerHTML = ""; raw = res = file = null; };
    const sh = $("#mgSh", out); if (sh) sh.onchange = async () => { sheet = sh.value; const g = await readGrid(file, sheet); raw = g.grid; await run(); };
    $$("[data-col]", out).forEach((s) => (s.onchange = () => { over[M.norm(s.dataset.col)] = s.value || undefined; if (!s.value) delete over[M.norm(s.dataset.col)]; run(); }));
    $$("[data-tab]", out).forEach((b) => (b.onclick = () => { tab = b.dataset.tab; $$("[data-tab]", out).forEach((x) => x.classList.toggle("on", x === b)); body(); }));
    $("#mgDl", out).onclick = (e) => busy(e.currentTarget, async () => { await finish(); F.save(`limpio_${F.safe(file.name.replace(/\.[^.]+$/, ""))}_${F.stamp()}.xlsx`, await xlsx()); U.toast("Excel limpio descargado. Ya aprendí de tus decisiones.", { kind: "ok" }); });
    $("#mgIm", out).onclick = (e) => busy(e.currentTarget, async () => { await finish(); U.pendingImport = new File([await xlsx(true)], `limpio_${F.stamp()}.xlsx`, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }); U.go("#/importar"); });
    $("#mgCp", out).onclick = async () => { try { await navigator.clipboard.writeText(summaryText()); U.toast("Resumen copiado.", { kind: "ok" }); } catch (e) { U.toast("No se pudo copiar.", { kind: "err" }); } };
    body();
  };
  const finish = async () => { await memSave(M.learn(Object.assign({}, await memLoad()), res)); };
  const heads = () => { const map = roleToInv(); return res.hdr.map((hh, j) => (res.roles[j] && map[res.roles[j]] ? map[res.roles[j]] : hh)); };
  async function xlsx(forImport) {
    const rows = M.materialize(res), H = heads();
    const sheetsX = [{ name: "Limpio", rows: [H.map((x) => ({ v: x, s: "head" })), ...rows], cols: H.map((x, j) => (res.roles[j] === "descripcion" ? 42 : res.roles[j] === "resguardante" || res.roles[j] === "area" ? 34 : 18)), freeze: 1, filter: "A1:" + F.colName(H.length - 1) + (rows.length + 1) }];
    if (!forImport) {
      const q = res.rows.filter((r) => !r.keep && r.cat !== "valida"); if (q.length) sheetsX.push({ name: "Quitado", rows: [["Fila original", "Por qué se quitó", ...res.hdr].map((x) => ({ v: x, s: "head" })), ...q.map((r) => [r.src, M.CAT_LABEL[r.cat] + (r.why ? " · " + r.why : ""), ...r.raw.filter((_, j) => true).slice(0, res.hdr.length)])], cols: [12, 46, ...res.hdr.map(() => 18)] });
      const fx = res.live().filter((f) => f.on); if (fx.length) sheetsX.push({ name: "Correcciones", rows: [["Fila", "Columna", "Antes", "Después", "Motivo"].map((x) => ({ v: x, s: "head" })), ...fx.map((f) => [res.rows[f.row].src, res.hdr[f.col], f.before, f.after, f.kind])], cols: [8, 22, 30, 30, 34] });
    }
    return F.xlsx(sheetsX);
  }
  const summaryText = () => { const I = res.info, C = res.compare; return [`Documento: ${file.name}`, `${I.filas} filas leídas: ${I.buenas} se quedan, ${I.quitadas} se quitan, ${I.correcciones} correcciones.`, `Marbetes: ${I.marbetes} (${I.marbetesConocidos} ya existen, ${I.marbetesNuevos} nuevos).`, I.importeTotal ? `Importe total: ${M.money(I.importeTotal)}.` : "", I.personasNuevas.length ? `Personas que no están en el inventario: ${I.personasNuevas.join(", ")}.` : "", C ? `Contra el inventario: ${C.igual} iguales, ${C.cambios.length} con cambios, ${C.nuevos.length} nuevos, ${C.faltan.length} que no vienen en el documento.` : ""].filter(Boolean).join("\n"); };

  function body() {
    const b = $("#mgBody", out), I = res.info; let html = "";
    if (tab === "limpio") {
      const rows = M.materialize(res), H = heads(), fxm = new Map(res.live().filter((f) => f.on).map((f) => [f.row + ":" + f.col, f]));
      const keepRows = res.rows.filter((r) => r.keep && r.cells.length && r.cat !== "vacia");
      html = `<div class="tl-w"><table class="tl"><thead><tr>${H.map((x, j) => `<th>${esc(x)}${res.roles[j] ? "" : ' <i class="warn" title="No entendí esta columna">?</i>'}</th>`).join("")}</tr></thead><tbody>${keepRows.slice(0, 150).map((r) => `<tr${r.flags.length ? ` title="${esc(r.flags.join(" · "))}" class="fl"` : ""}>${r.cells.map((c, j) => { const f = fxm.get(r.id + ":" + j); return `<td${f ? ` class="fx" title="Antes: ${esc(f.before)} · ${esc(f.kind)}"` : ""}>${esc(c.v)}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>${rows.length > 150 ? `<p class="muted">Se muestran las primeras 150 de ${fmt(rows.length)} filas. El Excel trae todas.</p>` : ""}<p class="muted" style="font-size:13px">Lo verde se corrigió solo (pasa el cursor para ver cómo estaba). Las filas con borde ámbar traen un aviso.</p>`;
    } else if (tab === "quitado") {
      const groups = {}; for (const r of res.rows) if (r.cat !== "valida") (groups[r.cat] = groups[r.cat] || []).push(r);
      html = Object.keys(groups).length ? Object.entries(groups).map(([c, rs]) => { const all = rs.every((r) => r.keep); return `<div class="mg-g"><div class="mg-gh"><b>${esc(M.CAT_LABEL[c])}</b> <span class="cnt">${rs.length}</span><button class="btn ghost sm" type="button" data-cat="${c}">${all ? "Quitar todas" : "Devolver todas"}</button></div>${rs.slice(0, 60).map((r) => `<label class="mg-r"><input type="checkbox" data-row="${r.id}"${r.keep ? " checked" : ""}><span class="mg-n">fila ${r.src}</span><span class="mg-t">${esc(r.raw.filter(Boolean).join(" · ").slice(0, 120) || "(vacía)")}</span><small>${esc(r.why)}</small></label>`).join("")}${rs.length > 60 ? `<p class="muted">… y ${rs.length - 60} más de este tipo.</p>` : ""}</div>`; }).join("") + `<p class="muted" style="font-size:13px">Marca una fila para devolverla a la tabla. El portal recuerda qué tipos prefieres conservar.</p>` : U.empty("check", "No quité nada", "Todas las filas parecían buenas.");
    } else if (tab === "fixes") {
      const fx = res.live();
      html = fx.length ? `<p class="muted" style="margin-bottom:10px">Desmarca las que no quieras. Si rechazas una corrección de nombre, no vuelvo a proponerla.</p>` + fx.slice(0, 300).map((f) => `<label class="mg-r"><input type="checkbox" data-fx="${f.id}"${f.on ? " checked" : ""}><span class="mg-n">fila ${res.rows[f.row].src}</span><span class="mg-t"><s>${esc(f.before || "(vacío)")}</s> → <b>${esc(f.after || "(vacío)")}</b></span><small>${esc(res.hdr[f.col])} · ${esc(f.kind)}</small></label>`).join("") + (fx.length > 300 ? `<p class="muted">… y ${fx.length - 300} más.</p>` : "") : U.empty("check", "Nada que corregir", "Los datos ya venían ordenados.");
    } else if (tab === "info") {
      const chips = (arr, cls = "") => arr.slice(0, 40).map((x) => `<span class="chip ${cls}">${esc(Array.isArray(x) ? x[0] + " (" + x[1] + ")" : x)}</span>`).join(" ");
      const warn = res.rows.filter((r) => r.keep && r.flags.length).slice(0, 40);
      html = `<div class="grid g2" style="gap:14px"><div><h3>Marbetes</h3><p>${fmt(I.marbetes)} en total: <b>${fmt(I.marbetesConocidos)}</b> ya existen y <b>${fmt(I.marbetesNuevos)}</b> son nuevos.${I.sinMarbete ? ` ${I.sinMarbete} filas no traen marbete.` : ""}${I.conflictos ? ` <b>${I.conflictos}</b> marbetes aparecen repetidos con datos distintos.` : ""}</p>${I.nuevos.length ? `<p>${chips(I.nuevos)}</p>` : ""}
        <h3 style="margin-top:14px">Importes y fechas</h3><p>${I.conImporte ? `Suma de importes: <b>${M.money(I.importeTotal)}</b> (${fmt(I.conImporte)} artículos con importe).` : "No encontré una columna de importes."} ${I.fechaMin ? `Fechas de ${I.fechaMin} a ${I.fechaMax}.` : ""}</p></div>
        <div><h3>Personas</h3><p>${fmt(I.personas.length)} distintas.${I.personasNuevas.length ? ` <b>No están en el inventario:</b>` : ""}</p><p>${chips(I.personasNuevas, "on")}${I.personasNuevas.length ? "" : chips(I.personas.slice(0, 12))}</p>
        <h3 style="margin-top:14px">Áreas</h3><p>${fmt(I.areas.length)} distintas.${I.areasNuevas.length ? ` <b>No están en el inventario:</b>` : ""}</p><p>${chips(I.areasNuevas, "on")}${I.areasNuevas.length ? "" : chips(I.areas.slice(0, 12))}</p></div></div>
        ${I.columnasSinEntender.length ? `<p style="margin-top:14px"><b>Columnas que no entendí:</b> ${esc(I.columnasSinEntender.join(", "))}. Puedes decirme qué son arriba.</p>` : ""}
        ${warn.length ? `<h3 style="margin-top:14px">Filas que conviene revisar</h3>${warn.map((r) => `<div class="mg-r"><span class="mg-n">fila ${r.src}</span><span class="mg-t">${esc(r.raw.filter(Boolean).join(" · ").slice(0, 110))}</span><small>${esc(r.flags.join(" · "))}</small></div>`).join("")}` : ""}`;
    } else {
      const C = res.compare;
      html = C ? `<div class="imp-s"><div class="st si"><div class="v">${fmt(C.igual)}</div><small>Iguales al inventario</small></div><div class="st"><div class="v">${fmt(C.cambios.length)}</div><small>Con cambios</small></div><div class="st"><div class="v">${fmt(C.nuevos.length)}</div><small>Nuevos</small></div><div class="st no"><div class="v">${fmt(C.faltan.length)}</div><small>No vienen en el documento</small></div></div>
        ${C.cambios.length ? `<h3 style="margin-top:14px">Cambios</h3>${C.cambios.slice(0, 80).map((c) => `<div class="diff-r"><span class="mbn">${esc(c.mb)}</span><div><b>${esc(U.txt(c.desc))}</b>${c.diffs.map((d) => `<div>${esc(d.campo)}: <s>${esc(d.antes || "(vacío)")}</s> → <b>${esc(d.despues)}</b></div>`).join("")}</div></div>`).join("")}` : ""}
        ${C.nuevos.length ? `<h3 style="margin-top:14px">Nuevos (no están en el inventario)</h3>${C.nuevos.slice(0, 80).map((n) => `<div class="diff-r"><span class="mbn">${esc(n.mb)}</span><div>${esc(U.txt(n.desc) || "(sin descripción)")}${n.quien ? " · " + esc(U.nm(n.quien)) : ""}</div></div>`).join("")}` : ""}
        ${C.faltan.length ? `<h3 style="margin-top:14px">Están en el inventario y no en el documento</h3><p class="muted" style="font-size:13px">Útil si este documento debía incluir todo (por ejemplo, un levantamiento).</p>${C.faltan.slice(0, 60).map((n) => `<div class="diff-r"><span class="mbn">${esc(n.mb)}</span><div>${esc(U.txt(n.desc))}${n.quien ? " · " + esc(U.nm(n.quien)) : ""}</div></div>`).join("")}${C.faltan.length > 60 ? `<p class="muted">… y ${fmt(C.faltan.length - 60)} más.</p>` : ""}` : ""}` : U.empty("help", "No puedo comparar", "Necesito una columna de marbete en el documento para compararlo con el inventario.");
    }
    b.innerHTML = html;
    $$("[data-row]", b).forEach((c) => (c.onchange = () => { res.rows[+c.dataset.row].keep = c.checked; refresh(); }));
    $$("[data-cat]", b).forEach((c) => (c.onclick = () => { const rs = res.rows.filter((r) => r.cat === c.dataset.cat), all = rs.every((r) => r.keep); rs.forEach((r) => (r.keep = !all)); refresh(); }));
    $$("[data-fx]", b).forEach((c) => (c.onchange = () => { res.fixes[+c.dataset.fx].on = c.checked; refresh(); }));
  }
  const refresh = () => { res.info = M.summarize(res, ctx); res.compare = M.compare(res, ctx); draw(); };
  $("#mgF", el).onchange = (e) => { const f = e.target.files[0]; if (f) { sheet = ""; handle(f); } e.target.value = ""; };
  const drop = $("#drop", el);
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("on"); }); drop.addEventListener("dragleave", () => drop.classList.remove("on"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("on"); const f = e.dataTransfer.files[0]; if (f) { sheet = ""; handle(f); } });
  return { el, title: "Borrador mágico", after() { memLoad(); } };
}

/* =================== PLANTILLAS =================== */
const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => { const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u; };
const DOCX_T = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const itemsOf = (kind, name) => D.items.filter((x) => (kind === "per" ? x.rc === name : x.ar === name));
const targets = (kind) => (kind === "per" ? B.names() : [...new Set(D.items.map((x) => x.ar).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")));
const tl = (x) => U.txt(x);
const BUILTIN = [
  { id: "b-res", name: "Resguardo por persona", kind: "per", about: "Lista de bienes que tiene una persona, con espacio para firmas.", build: (JSZip, name, items) => DX.build(JSZip, { title: "RESGUARDO DE BIENES", subtitle: "CONALEP Chetumal · Servicios Administrativos", paras: [{ t: "Resguardante: " + U.nm(name), b: true }, { t: "Fecha: " + new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }) }, { t: `Total de bienes: ${items.length}    Importe total: ${M.money(items.reduce((a, x) => a + (x.im || 0), 0))}`, after: 160 }, { t: "El resguardante declara recibir los bienes descritos y se compromete a su cuidado y uso adecuado.", after: 160, size: 10 }], table: { head: ["No.", "Marbete", "Descripción", "Marca / modelo", "Serie", "Importe"], rows: items.map((x, i) => [String(i + 1), x.mb, tl(x.ds), [x.ma, x.mo].filter(Boolean).join(" "), x.se, x.im ? M.money(x.im) : ""]), widths: [0.6, 1.4, 4, 2.2, 2, 1.6] }, after: [{ t: "", after: 600 }, { t: "______________________________        ______________________________", align: "center", after: 0 }, { t: "Resguardante                                                    Jefatura de Servicios Administrativos", align: "center", size: 9.5 }] }) },
  { id: "b-area", name: "Bienes por área", kind: "area", about: "Todo lo que hay en un lugar, en horizontal, para pegar en la puerta o llevar a la revisión.", build: (JSZip, name, items) => DX.build(JSZip, { title: "BIENES DEL ÁREA", subtitle: tl(name) + " · CONALEP Chetumal", landscape: true, paras: [{ t: `Total de bienes: ${items.length}    Fecha: ${F.fecha()}`, after: 140 }], table: { head: ["No.", "Marbete", "Descripción", "Resguardante", "Marca / modelo", "Serie", "Importe"], rows: items.map((x, i) => [String(i + 1), x.mb, tl(x.ds), U.nm(x.rc), [x.ma, x.mo].filter(Boolean).join(" "), x.se, x.im ? M.money(x.im) : ""]), widths: [0.6, 1.3, 3.6, 3, 2, 1.8, 1.4] } }) },
];
function viewPlantillas(el) {
  let list = [], loading = true;
  const paint = () => {
    el.innerHTML = head("Plantillas", "Tus formatos de Word se llenan solos con los datos del inventario.", `<a class="btn ghost" href="#/herramientas">${icon("left")}<span>Herramientas</span></a><label class="btn pri" for="plF">${icon("upload")}<span>Subir plantilla</span></label><input id="plF" type="file" accept=".docx" hidden>`) +
      `<section class="pnl"><div class="pnl-h"><div><h2>Listas</h2><p>Ya vienen hechas.</p></div></div><div class="grid g2" style="gap:12px">${BUILTIN.map((t) => card(t, true)).join("")}</div></section>
       <section class="pnl" style="margin-top:16px"><div class="pnl-h"><div><h2>Mis plantillas</h2><p>Escribe campos como <code>{{persona}}</code>, <code>{{area}}</code>, <code>{{fecha}}</code>, <code>{{total}}</code> y en una fila de tabla <code>{{marbete}}</code> <code>{{descripcion}}</code> <code>{{serie}}</code> <code>{{importe_art}}</code>: esa fila se repite por cada bien.</p></div></div>${loading ? `<p class="muted">Cargando…</p>` : list.length ? `<div class="grid g2" style="gap:12px">${list.map((t) => card(t, false)).join("")}</div>` : U.empty("file", "Todavía no subes ninguna", "Sube un Word con tu formato. Si trae renglones como «Nombre: ______», los convierto en campos.")}</section>`;
    $("#plF", el).onchange = (e) => { const f = e.target.files[0]; if (f) upload(f); e.target.value = ""; };
    $$("[data-pg]", el).forEach((b) => (b.onclick = () => act(b)));
  };
  const card = (t, builtin) => `<div class="pnl tpl-c" data-id="${esc(t.id)}"><div class="tool-i">${icon("file")}</div><h3>${esc(t.name)}</h3><p>${esc(builtin ? t.about : (t.ph && t.ph.length ? t.ph.length + " campos: " + t.ph.slice(0, 8).map((x) => "{{" + x + "}}").join(" ") : "Sin campos detectados") + " · subida por " + (t.by || "?"))}</p>
    <div class="tpl-f"><select class="sel" data-sel="${esc(t.id)}">${(t.kind ? [t.kind] : ["per", "area"]).map((k) => `<option value="${k}">${k === "per" ? "Para un resguardante" : "Para un área"}</option>`).join("")}</select><select class="sel" data-who="${esc(t.id)}"></select></div>
    <div class="tpl-a"><button class="btn pri" type="button" data-pg="gen" data-id="${esc(t.id)}">${icon("file")}<span>Generar</span></button><button class="btn" type="button" data-pg="zip" data-id="${esc(t.id)}">${icon("box")}<span>Para todos (ZIP)</span></button>${builtin ? "" : `<button class="btn ghost" type="button" data-pg="dl" data-id="${esc(t.id)}">Original</button><button class="btn ghost" type="button" data-pg="del" data-id="${esc(t.id)}">Eliminar</button>`}</div></div>`;
  const fillSelects = () => $$("[data-sel]", el).forEach((s) => { const who = $(`[data-who="${s.dataset.sel}"]`, el), fill = () => (who.innerHTML = targets(s.value).map((n) => `<option value="${esc(n)}">${esc(s.value === "per" ? U.nm(n) : tl(n))}</option>`).join("")); s.onchange = fill; fill(); });
  const find = (id) => BUILTIN.find((t) => t.id === id) || list.find((t) => t.id === id);
  async function make(t, kind, name) {
    const JSZip = await JSZ(), items = itemsOf(kind, name);
    if (!items.length) throw { message: "Ese " + (kind === "per" ? "resguardante" : "área") + " no tiene bienes." };
    if (t.build) return t.build(JSZip, name, items);
    const buf = unb64(t.b64), vars = PL.vars(kind, kind === "per" ? U.nm(name) : tl(name), items, { elaboro: D.user || "" });
    return DX.fill(JSZip, buf, vars, items.map(PL.rowOf));
  }
  async function act(b) {
    const t = find(b.dataset.id), a = b.dataset.pg, kind = $(`[data-sel="${b.dataset.id}"]`, el).value, who = $(`[data-who="${b.dataset.id}"]`, el).value;
    if (a === "del") { if (await U.confirm("¿Eliminar la plantilla?", `«${t.name}» se borra para todo el equipo.`, "Eliminar", true)) { try { await D.call("db", { op: "delete", path: "plantillas/" + t.id }); list = list.filter((x) => x.id !== t.id); paint(); fillSelects(); U.toast("Plantilla eliminada.", { kind: "ok" }); } catch (e) { U.fail(e); } } return; }
    if (a === "dl") { F.save(F.safe(t.name) + ".docx", new Blob([unb64(t.b64)], { type: DOCX_T })); return; }
    await busy(b, async () => {
      try {
        if (a === "gen") { const u8 = await make(t, kind, who); F.save(`${F.safe(t.name)}_${F.safe(kind === "per" ? U.nm(who) : tl(who))}.docx`, new Blob([u8], { type: DOCX_T })); FX.hit("done"); U.toast("Documento listo.", { kind: "ok" }); }
        else { const JSZip = await JSZ(), z = new JSZip(), names = targets(kind).filter((n) => itemsOf(kind, n).length); let i = 0; for (const n of names) { z.file(`${F.safe(t.name)}_${F.safe(kind === "per" ? U.nm(n) : tl(n))}.docx`, await make(t, kind, n)); if (++i % 10 === 0) await new Promise((r) => setTimeout(r, 0)); } const zn = `${F.safe(t.name)}_todos_${F.stamp()}.zip`, zb = await z.generateAsync({ type: "blob", compression: "DEFLATE" }); F.save(zn, zb); FX.hit("done"); U.toast(`${names.length} documentos en un ZIP.`, { kind: "ok", ms: 12000, action: { label: "Descargar otra vez", fn: () => F.save(zn, zb) } }); }
      } catch (e) { U.toast(e.message || D.errMsg(e), { kind: "err" }); }
    });
  }
  async function upload(f) {
    if (!/\.docx$/i.test(f.name)) { U.toast("Solo Word (.docx). Si es .doc, guárdalo como .docx.", { kind: "err" }); return; }
    if (f.size > 1.5e6) { U.toast("La plantilla pesa más de 1.5 MB. Quítale imágenes pesadas.", { kind: "err" }); return; }
    try {
      const JSZip = await JSZ(); let buf = new Uint8Array(await f.arrayBuffer()), ph = await DX.placeholders(JSZip, buf), auto = null;
      auto = await DX.autoFields(JSZip, buf);
      let use = buf, note = "";
      if (auto && auto.n) { const ok = await U.confirm("Encontré renglones para llenar", `No traía campos, pero detecté ${auto.n} renglones como «Nombre: ____». ¿Los convierto en campos?\n\n${auto.hechos.join("\n")}`, "Sí, convertirlos"); if (ok) { use = auto.data; ph = await DX.placeholders(JSZip, use); note = " Convertí " + auto.n + " renglones en campos."; } }
      if (!ph.length) { const ok = await U.confirm("Sin campos", "Esta plantilla no tiene campos {{así}}, así que saldría igual cada vez. ¿La guardo de todos modos?", "Guardar"); if (!ok) return; }
      const name = f.name.replace(/\.docx$/i, ""), id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      const doc = { name, b64: b64(use), size: use.length, ph, kind: "" }; await D.call("db", { op: "set", path: "plantillas/" + id, data: doc });
      list.unshift({ id, ...doc, by: D.user }); paint(); fillSelects(); FX.hit("done"); U.toast("Plantilla guardada." + note, { kind: "ok" });
    } catch (e) { U.toast(e.message || D.errMsg(e), { kind: "err" }); }
  }
  const load = async () => { try { const r = await D.call("db", { op: "list", collection: "plantillas" }); list = (r.docs || []).filter((d) => d.id !== "aprende").map((d) => ({ id: d.id, ...d.data })).sort((a, b) => (b.at || 0) - (a.at || 0)); } catch (e) { list = []; } loading = false; paint(); fillSelects(); };
  paint(); fillSelects();
  return { el, title: "Plantillas", after() { load(); } };
}

/* =================== BIBLIOTECA (lo que sabe Lumen) =================== */
U.route("biblioteca", () => {
  const L = window.BIBLIOTECA || [], el = h(`<div class="tools-v"></div>`);
  const nz = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  el.innerHTML = head("Biblioteca de inventarios", `${L.length} capítulos sobre inventarios, control de bienes y su historia. Es lo que Lumen consulta para contestar.`) +
    `<div class="pnl"><input class="sel" id="bq" type="search" placeholder="Buscar: depreciación, bajas, historia, QR…" style="width:100%;font-size:15px;padding:12px 14px" aria-label="Buscar en la biblioteca"><p class="muted" id="bn" style="font-size:13px;margin-top:8px"></p></div><div id="bl" style="margin-top:14px;display:grid;gap:10px"></div>`;
  const draw = () => {
    const q = nz($("#bq", el).value).split(/\s+/).filter(Boolean), hit = L.filter((b) => { const z = nz(b.t + " " + b.kw + " " + b.x); return q.every((w) => z.includes(w)); });
    $("#bn", el).textContent = q.length ? `${hit.length} de ${L.length} capítulos` : "";
    $("#bl", el).innerHTML = hit.map((b) => `<details class="pnl bib"><summary><b>${esc(b.t)}</b></summary><p>${esc(b.x)}</p></details>`).join("") || U.empty("search", "Nada con esas palabras", "Prueba con otra palabra.");
  };
  $("#bq", el).addEventListener("input", U.debounce ? U.debounce(draw, 120) : draw); draw();
  return { el, title: "Biblioteca" };
});
})();
