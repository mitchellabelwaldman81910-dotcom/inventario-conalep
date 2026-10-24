/* Portal de inventario CONALEP · pantallas */
(() => {
"use strict";
const { $, $$, esc, h, icon } = U;
const SIN = D.SIN;
const head = (title, sub, acts = "") => `<header class="vh"><div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${acts ? `<div class="acts">${acts}</div>` : ""}</header>`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const firstName = (n) => String(n || "").split(" ")[0];
const qLink = (q) => "#/lista?q=" + encodeURIComponent(q);
const busyBtn = async (btn, fn) => { btn.classList.add("busy"); btn.disabled = true; try { return await fn(); } finally { btn.classList.remove("busy"); btn.disabled = false; } };
const EST = { si: "Presente", no: "No está" }, CND = { B: "Bueno", R: "Regular", M: "Malo" };

/* ================= colores del mosaico (el tablero siempre es oscuro) ================= */
const PEND = "rgba(205,235,222,.22)";
function quant(vals, k) { const s = vals.slice().sort((a, b) => a - b); return Array.from({ length: k - 1 }, (_, i) => s[Math.floor(((i + 1) / k) * s.length)] || 0); }
function mosaicMode(mode) {
  if (mode === "est") { const L = [["B", "Bueno", "#45E0A0", "buen estado"], ["R", "Regular", "#F2C14E", "estado regular"], ["M", "Malo", "#FF7B6B", "mal estado"], ["x", "Sin revisar", PEND, "pendientes"]]; return { L, key: (it) => (it.mark?.e === "si" ? it.mark.c || "B" : "x") }; }
  if (mode === "val") { const q = quant(D.items.filter((x) => x.im > 0).map((x) => x.im), 5); const C = ["#1F5B4A", "#2C7C61", "#3FA27B", "#6DC99B", "#B9EDCF"]; const lab = ["Hasta " + B.moneyShort(q[0]), B.moneyShort(q[0]) + " a " + B.moneyShort(q[1]), B.moneyShort(q[1]) + " a " + B.moneyShort(q[2]), B.moneyShort(q[2]) + " a " + B.moneyShort(q[3]), "Más de " + B.moneyShort(q[3])]; const L = C.map((c, i) => ["v" + i, lab[i], c]).concat([["v_", "Sin importe", PEND]]); return { L, key: (it) => { if (!it.im) return "v_"; let i = 0; while (i < 4 && it.im > q[i]) i++; return "v" + i; } }; }
  if (mode === "edad") { const y = new Date().getFullYear(); const L = [["a0", "Menos de 5 años", "#5B4A1D"], ["a1", "5 a 9 años", "#8A6B23"], ["a2", "10 a 19 años", "#BC8C2C"], ["a3", "20 años o más", "#F2CD72"], ["a_", "Sin fecha", PEND]]; return { L, key: (it) => { if (!it.y) return "a_"; const d = y - it.y; return d < 5 ? "a0" : d < 10 ? "a1" : d < 20 ? "a2" : "a3"; } }; }
  if (mode === "datos") { const L = [["d3", "Marca, modelo y serie", "#45E0A0"], ["d2", "Le falta 1 dato", "#9ED36A"], ["d1", "Le faltan 2", "#F2C14E"], ["d0", "Le faltan los 3", "#FF7B6B"]]; return { L, key: (it) => "d" + [it.ma, it.mo, it.se].filter((v) => !B.blank(v)).length }; }
  const L = [["si", "Presente", "#45E0A0", "presentes"], ["no", "No está", "#FF7B6B", "faltantes"], ["pend", "Pendiente", PEND, "pendientes"]];
  return { L, key: (it) => (it.mark ? it.mark.e : "pend") };
}
function mosaicGroups(by, mode) {
  const order = new Map(mode.L.map((x, i) => [x[0], i]));
  const g = by === "ar" ? B.groupBy(D.items, (it) => it.ar || "(Sin área)") : by === "cu" ? B.groupBy(D.items, (it) => it.cu || "(Sin cuenta)") : B.groupBy(D.items, "rc");
  return g.map((x) => ({ key: x.key, label: by === "rc" ? U.nm(x.key) : by === "ar" ? U.txt(x.key) : x.key, sub: B.moneyShort(x.val), items: x.items.slice().sort((a, b) => order.get(mode.key(a)) - order.get(mode.key(b)) || a.n - b.n) }));
}
const itemTip = (it) => `<b>${esc(it.mb)}</b> · ${esc(U.txt(it.ds))}<br>${esc(U.nm(it.rc))}${it.ar ? "<br>" + esc(U.txt(it.ar)) : ""}${it.im ? "<br>" + B.money(it.im) : ""}<br>${U.stamp(it.mark)}`;

/* ================= INICIO ================= */
U.route("inicio", () => {
  const el = h(`<div class="home"></div>`);
  const hr = new Date().getHours(); const saludo = hr < 12 ? "Buenos días" : hr < 19 ? "Buenas tardes" : "Buenas noches";
  const today = cap(new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }));
  el.innerHTML = `<div class="hello"><div><h1>${saludo}, ${esc(firstName(D.user))}.</h1><p id="hSub">${esc(today)}</p></div><div class="acts" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" id="hScan">${icon("qr")}<span>Escanear</span></button><a class="btn" href="#/importar">${icon("upload")}<span>Importar Excel</span></a><a class="btn pri" href="#/lista">${icon("list")}<span>Abrir la lista</span></a></div></div>
  <section class="board" aria-labelledby="bT"><div class="board-h"><div><h2 id="bT">Todo el inventario, artículo por artículo</h2><p id="bSub"></p></div><div class="board-c"><div class="seg" id="mMode" role="group" aria-label="Colorear por">${[["inv", "Revisión"], ["est", "Estado físico"], ["val", "Valor"], ["edad", "Antigüedad"], ["datos", "Datos"]].map(([k, l]) => `<button type="button" data-m="${k}">${l}</button>`).join("")}</div><div class="seg" id="mBy" role="group" aria-label="Agrupar por">${[["rc", "Resguardante"], ["ar", "Área"], ["cu", "Cuenta"]].map(([k, l]) => `<button type="button" data-b="${k}">${l}</button>`).join("")}</div></div></div><div id="mos"></div><div class="board-k" id="mKey"></div></section>
  <div class="kpis" id="kpis"></div>
  <div class="grid g2"><section class="ask" id="ask"></section><section class="pnl"><div class="pnl-h"><div><h2>Lo que detecté</h2><p>Revisión automática de todo el inventario.</p></div><a class="link" href="#/salud">Ver todo${icon("right")}</a></div><ul class="ins" id="ins"></ul></section></div>
  <div class="grid g2" style="margin-top:18px"><section class="pnl"><div class="pnl-h"><div><h2>Actividad reciente</h2><p>Cambios, traslados y revisiones.</p></div><a class="link" href="#/historial">Bitácora${icon("right")}</a></div><ul class="feed" id="feed"></ul></section><section class="pnl" id="curso"></section></div>`;
  $("#hScan", el).onclick = () => S.scan();
  // mosaico
  const mos = U.mosaic({ onItem: (it) => S.openItem(it.tok), onGroup: (g) => { if (U.set.mgroup === "rc") U.go("#/resguardante/" + encodeURIComponent(g.key)); else if (U.set.mgroup === "ar") U.go(qLink('area:"' + g.key + '"')); else U.go(qLink('cuenta:"' + g.key + '"')); } });
  mos.tip = itemTip; $("#mos", el).appendChild(mos.el);
  let mode = mosaicMode(U.set.mosaic);
  const curMode = () => (!U.set.mosaicChosen && U.set.mosaic === "inv" && !D.items.some((x) => x.mark) ? "val" : U.set.mosaic);
  const paintMos = (animate) => {
    const mk = curMode(); mode = mosaicMode(mk);
    const colors = new Map(mode.L.map((x) => [x[0], x[2]]));
    const gs = mosaicGroups(U.set.mgroup, mode);
    mos.set(gs, (it) => colors.get(mode.key(it)), animate);
    const counts = {}; for (const it of D.items) { const k = mode.key(it); counts[k] = (counts[k] || 0) + 1; }
    $("#mKey", el).innerHTML = mode.L.map(([k, l, c, q]) => `<button type="button" data-q="${esc(q || "")}" ${q ? "" : "disabled"}><i style="background:${c}"></i>${esc(l)} <b>${B.int(counts[k] || 0)}</b></button>`).join("");
    $("#bSub", el).textContent = `${B.int(D.items.length)} cuadros, uno por artículo, agrupados por ${{ rc: "resguardante", ar: "área", cu: "cuenta contable" }[U.set.mgroup]}. Toca uno para abrir su ficha.`;
    $$("#mMode button", el).forEach((b) => b.classList.toggle("on", b.dataset.m === mk));
    $$("#mBy button", el).forEach((b) => b.classList.toggle("on", b.dataset.b === U.set.mgroup));
  };
  $("#mMode", el).onclick = (e) => { const b = e.target.closest("button"); if (!b) return; U.set.mosaic = b.dataset.m; U.set.mosaicChosen = true; U.saveSet(); FX.play("tap"); paintMos(false); };
  $("#mBy", el).onclick = (e) => { const b = e.target.closest("button"); if (!b) return; U.set.mgroup = b.dataset.b; U.saveSet(); FX.play("tap"); paintMos(true); };
  $("#mKey", el).onclick = (e) => { const b = e.target.closest("button[data-q]"); if (b && b.dataset.q) U.go(qLink(b.dataset.q)); };
  // cifras
  const kpis = () => {
    const t = B.totals(), hl = B.health(), ins = B.insights().filter((x) => x.sev >= 1).length;
    $("#kpis", el).innerHTML = `<a class="kpi" href="#/analisis"><div><div class="v">${esc(B.moneyShort(t.val))}</div><div class="l">Valor del inventario</div><div class="s"><span data-count="${t.items}">0</span> artículos</div></div></a>
      <a class="kpi" href="#/resguardantes"><div><div class="v" data-count="${t.people}">0</div><div class="l">Resguardantes</div><div class="s">${B.int(t.areas)} áreas</div></div></a>
      <a class="kpi" href="#/vivo"><div><div class="v"><span data-count="${t.pct}">0</span>%</div><div class="l">Avance de la revisión</div><div class="s">${B.int(t.rev)} de ${B.int(t.items)} revisados</div></div>${U.ring(t.pct, { size: 58, sw: 6, cls: t.pct >= 100 ? "done" : "" })}</a>
      <a class="kpi" href="#/salud"><div><div class="v" data-count="${hl.score}">0</div><div class="l">Salud de los datos</div><div class="s">${ins ? B.plural(ins, "cosa") + " por atender" : "Todo en orden"}</div></div>${U.ring(hl.score, { size: 58, sw: 6, cls: hl.score < 70 ? "warn" : "done" })}</a>`;
    U.anim($("#kpis", el));
  };
  // pregúntale
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const EX = ["¿Cuántas computadoras hay?", "¿Quién tiene más artículos?", "¿Qué área vale más?", "Monitores sin serie", "¿Cuál es el artículo más antiguo?", "¿Cuánto valen las sillas?", "¿Dónde están los proyectores?", "Artículos de más de $50,000"];
  $("#ask", el).innerHTML = `<div><h2>Pregúntale al inventario</h2><p class="muted">Escribe como hablas. Entiende personas, áreas, montos, años, estados y sinónimos.</p></div>
    <form class="ask-f" id="askF">${icon("spark")}<input type="text" id="askQ" placeholder="¿Cuántas sillas tiene Irma?" aria-label="Pregunta" autocomplete="off">${SR ? `<button class="ib" type="button" id="askMic" aria-label="Preguntar con la voz">${icon("mic")}</button>` : ""}<button class="btn pri sm" type="submit">Preguntar</button></form>
    <div class="ask-ex">${EX.sort(() => Math.random() - 0.5).slice(0, 4).map((x) => `<button type="button" class="chip">${esc(x)}</button>`).join("")}</div><div class="ask-out" id="askOut"></div>`;
  const ask = (q) => { const a = B.ask(q); const out = $("#askOut", el); out.innerHTML = ""; if (a) out.appendChild(S.answerEl(a)); };
  $("#askF", el).onsubmit = (e) => { e.preventDefault(); const q = $("#askQ", el).value.trim(); if (q) ask(q); };
  $("#askQ", el).addEventListener("input", U.debounce(() => { const q = $("#askQ", el).value.trim(); if (q.length > 3 && B.isQuestion(q)) ask(q); }, 450));
  $(".ask-ex", el).onclick = (e) => { const b = e.target.closest(".chip"); if (b) { $("#askQ", el).value = b.textContent; ask(b.textContent); } };
  if (SR) $("#askMic", el).onclick = () => { const rec = new SR(); rec.lang = "es-MX"; const m = $("#askMic", el); m.style.color = "var(--red)"; rec.onresult = (ev) => { const t = [...ev.results].map((r) => r[0].transcript).join(" "); $("#askQ", el).value = t; }; rec.onend = () => { m.style.color = ""; const q = $("#askQ", el).value.trim(); if (q) ask(q); }; try { rec.start(); } catch (e) {} };
  // detecciones
  const insights = () => {
    const list = B.insights().slice(0, 6);
    $("#ins", el).innerHTML = list.length ? list.map((x, i) => `<li class="s${x.sev}"><span class="ic">${icon(x.icon)}</span><div class="tx"><b>${esc(x.title)}</b><small>${esc(x.detail || "")}</small></div>${x.act ? `<button class="btn sm" type="button" data-i="${i}">${esc(x.act.label)}</button>` : ""}</li>`).join("") : `<li>${U.empty("check", "Todo en orden", "No encontré nada que atender.")}</li>`;
    $("#ins", el).onclick = (e) => { const b = e.target.closest("[data-i]"); if (!b) return; const a = list[+b.dataset.i].act; if (a.q) U.go(qLink(a.q)); else if (a.go) U.go(a.go); else if (a.href) window.open(a.href, "_blank", "noopener"); };
  };
  // actividad
  const activity = () => {
    const ev = B.feed(10).map((x) => ({ ...x, src: "m" }));
    for (const c of (D.cambios || []).slice(0, 20)) ev.push({ k: "c", c, at: c.at });
    ev.sort((a, b) => b.at - a.at);
    const li = ev.slice(0, 8).map((x) => {
      if (x.k === "mark") return `<li><span class="dot ${x.e === "no" ? "no" : "si"}"></span><div class="tx"><b>${esc(x.it ? x.it.mb + " · " + U.txt(x.it.ds) : x.tok)}</b><small>${esc(x.by || "")} lo marcó ${x.e === "si" ? "presente" : "como no encontrado"} · revisión de ${esc(U.nm(x.name))}</small></div><time>${esc(B.ago(x.at))}</time></li>`;
      if (x.k === "fin") return `<li><span class="dot fin"></span><div class="tx"><b>${esc(U.nm(x.name))} terminó su inventario</b><small>Finalizó ${esc(x.by || "")}</small></div><time>${esc(B.ago(x.at))}</time></li>`;
      if (x.k === "extra") return `<li><span class="dot ex"></span><div class="tx"><b>Encontrado fuera de lista: ${esc(x.tok)}</b><small>${esc(x.n || "")} · revisión de ${esc(U.nm(x.name))}</small></div><time>${esc(B.ago(x.at))}</time></li>`;
      const c = x.c, n = (c.diffs || []).length, toks = new Set((c.diffs || []).map((d) => d.tok)).size;
      const t = c.tipo === "traslado" ? `trasladó ${B.plural(toks, "artículo")}${c.diffs?.[0]?.despues ? " a " + U.nm(c.diffs[0].despues) : ""}` : c.tipo === "excel" ? `importó ${c.nota ? "«" + c.nota + "»" : "un Excel"}` : `editó ${B.plural(n, "campo")}`;
      return `<li><span class="dot ${c.tipo === "traslado" ? "tr" : "ed"}"></span><div class="tx"><b>${esc(c.by || "")} ${esc(t)}</b><small>${esc((c.diffs || []).slice(0, 2).map((d) => d.mb + " · " + B.smart(d.campo)).join(" · "))}${c.nota && c.tipo !== "excel" ? " · " + esc(c.nota) : ""}</small></div><time>${esc(B.ago(c.at))}</time></li>`;
    });
    $("#feed", el).innerHTML = li.length ? li.join("") : `<li>${U.empty("clock", "Sin actividad todavía", "Aquí aparecerán los cambios y las revisiones.")}</li>`;
  };
  const curso = () => {
    const ppl = B.people().filter((p) => p.status === "curso").sort((a, b) => b.lastAt - a.lastAt).slice(0, 6);
    const box = $("#curso", el);
    if (ppl.length) {
      box.innerHTML = `<div class="pnl-h"><div><h2>Revisiones en curso</h2><p>Se actualiza solo mientras revisan con la app.</p></div><a class="link" href="#/vivo">En vivo${icon("right")}</a></div><div class="feed">${ppl.map((p) => `<a class="lv-t" href="#/resguardante/${encodeURIComponent(p.name)}" style="text-decoration:none;color:inherit;padding:10px 0;border-bottom:1px solid var(--line2)">${U.avatar(p.name, "sm")}<div><b>${esc(U.nm(p.name))}</b><div class="bar" style="margin-top:6px"><i class="si" data-w="${(p.si / p.total) * 100}"></i><i class="no" data-w="${(p.no / p.total) * 100}"></i></div></div><small class="muted" style="min-width:90px;text-align:right">${p.pct}% · ${esc(B.ago(p.lastAt))}</small></a>`).join("")}</div>`;
    } else {
      const top = B.people().filter((p) => p.name !== SIN).sort((a, b) => b.total - a.total).slice(0, 7);
      box.innerHTML = `<div class="pnl-h"><div><h2>Quién tiene más artículos</h2><p>Ninguna revisión está en curso ahora.</p></div><a class="link" href="#/resguardantes">Todos${icon("right")}</a></div>`;
      box.appendChild(U.hbars(top.map((p) => ({ label: U.nm(p.name), value: p.total, sub: B.money(p.val), go: p.name })), { onClick: (d) => U.go("#/resguardante/" + encodeURIComponent(d.go)) }));
    }
    U.anim(box);
  };
  const sub = () => { const line = B.todayLine(); $("#hSub", el).textContent = `${today} · ${line || (D.lastSync ? "datos al día, " + B.ago(D.lastSync) : "mostrando la copia de este equipo")}`; };
  let prevMarks = new Map(D.items.map((it) => [it.tok, it.mark ? it.mark.e + it.mark.c : ""]));
  const all = () => { kpis(); insights(); activity(); curso(); sub(); };
  D.loadCambios().then(() => { if (document.body.contains(el)) activity(); }).catch(() => {});
  D.wantCambios = true;
  return {
    el, title: "Inicio",
    after() { paintMos(true); all(); },
    update(k) {
      if (k === "marcas") { const ch = []; for (const it of D.items) { const v = it.mark ? it.mark.e + it.mark.c : ""; if (prevMarks.get(it.tok) !== v) ch.push(it.tok); } prevMarks = new Map(D.items.map((it) => [it.tok, it.mark ? it.mark.e + it.mark.c : ""])); paintMos(false); mos.flash(ch); }
      else if (k === "inv") paintMos(false);
      all();
    },
    destroy() { mos.destroy(); D.wantCambios = false; },
  };
});

/* ================= LISTA COMPLETA ================= */
const LS = { q: "", f: {}, sort: "", dir: 1, sel: new Set() };
const FACETS = [
  ["rc", "Resguardante", (it) => it.rc, (k) => U.nm(k)],
  ["ar", "Área", (it) => it.ar || "(Sin área)", (k) => U.txt(k)],
  ["inv", "Revisión", (it) => (it.mark ? it.mark.e : "pend"), (k) => ({ si: "Presente", no: "No está", pend: "Pendiente" }[k])],
  ["cnd", "Estado físico", (it) => (it.mark?.e === "si" ? it.mark.c || "B" : "x"), (k) => ({ B: "Bueno", R: "Regular", M: "Malo", x: "Sin revisar" }[k])],
  ["fot", "Fotos", (it) => (it.fotos ? "con" : "sin"), (k) => (k === "con" ? "Con foto" : "Sin foto")],
  ["cu", "Cuenta", (it) => it.cu || "(Sin cuenta)", (k) => k],
  ["dec", "Año", (it) => (it.y ? Math.floor(it.y / 10) * 10 + "s" : "Sin fecha"), (k) => (k === "Sin fecha" ? k : "Década de " + k.replace("s", ""))],
];
const COLS = {
  n: { h: "No.", w: "62px", k: "n", sort: 1, cell: (it) => `<span class="tnum muted">${it.n}</span>` },
  mb: { h: "Marbete", w: "100px", k: "mb", sort: 1, cell: (it) => `<span class="mbn">${esc(it.mb)}</span>` },
  ds: { h: "Descripción", w: "minmax(220px,2.4fr)", k: "ds", sort: 1, cell: (it) => `${esc(U.txt(it.ds))}<span class="sub">${esc([it.ma, it.mo, B.blank(it.se) ? "" : "Serie " + it.se].filter((x) => x && !B.blank(x)).join(" · "))}</span>` },
  rc: { h: "Resguardante", w: "minmax(150px,1.25fr)", k: "rc", sort: 1, cell: (it) => esc(U.nm(it.rc)) },
  ar: { h: "Área", w: "minmax(140px,1.15fr)", k: "ar", sort: 1, cell: (it) => esc(U.txt(it.ar)) },
  im: { h: "Importe", w: "112px", k: "im", sort: 1, dir: -1, right: 1, cell: (it) => (it.im ? `<span class="tnum">${B.money(it.im)}</span>` : '<span class="muted">—</span>') },
  se: { h: "Serie", w: "130px", k: "se", sort: 1, cell: (it) => esc(B.blank(it.se) ? "" : it.se) },
  cu: { h: "Cuenta", w: "100px", k: "cu", sort: 1, cell: (it) => esc(it.cu) },
  pr: { h: "Proveedor", w: "minmax(150px,1fr)", k: "pr", sort: 1, cell: (it) => esc(U.txt(it.pr)) },
  fe: { h: "Fecha", w: "100px", k: "y", sort: 1, cell: (it) => `<span class="tnum">${esc(it.fe)}</span>` },
  fa: { h: "Factura", w: "110px", k: "fa", sort: 1, cell: (it) => esc(it.fa) },
  inv: { h: "Revisión", w: "118px", k: "inv", sort: 1, cell: (it) => U.stamp(it.mark, "", true) },
  ph: { h: "", w: "48px", cell: (it) => (it.fotos ? `<span class="ph" title="${it.fotos} fotos">${icon("camera")}${it.fotos}</span>` : "") },
};
const COLS_DEF = ["n", "mb", "ds", "rc", "ar", "im", "inv", "ph"];
const sorter = (k, dir) => {
  const S2 = { n: (a, b) => a.n - b.n, im: (a, b) => a.im - b.im, y: (a, b) => a.y - b.y, inv: (a, b) => (a.mark ? (a.mark.e === "no" ? 0 : 2) : 1) - (b.mark ? (b.mark.e === "no" ? 0 : 2) : 1), mb: (a, b) => a.mb.localeCompare(b.mb, "es", { numeric: true }) };
  const f = S2[k] || ((a, b) => String(a[k] || "").localeCompare(String(b[k] || ""), "es"));
  return (a, b) => f(a, b) * dir || a.n - b.n;
};
function facetPop(btn, fk, base, onChange) {
  document.querySelector(".fpop")?.remove();
  const [k, label, keyFn, nameFn] = FACETS.find((f) => f[0] === fk);
  const counts = B.groupBy(base, keyFn).sort((a, b) => b.n - a.n);
  const sel = LS.f[k] || (LS.f[k] = new Set());
  const pop = h(`<div class="fpop" role="dialog" aria-label="${esc(label)}"><input type="search" placeholder="Filtrar ${esc(label.toLowerCase())}…"><ul></ul><footer><button class="btn ghost sm" type="button" data-c>Quitar filtro</button><button class="btn pri sm" type="button" data-ok>Listo</button></footer></div>`);
  const ul = $("ul", pop), inp = $("input", pop);
  const draw = () => { const q = B.norm(inp.value); ul.innerHTML = counts.filter((g) => !q || B.norm(nameFn(g.key)).includes(q)).slice(0, 300).map((g) => `<li><label><input type="checkbox" value="${esc(g.key)}" ${sel.has(String(g.key)) ? "checked" : ""}><span>${esc(nameFn(g.key))}</span><small>${B.int(g.n)}</small></label></li>`).join("") || `<li class="muted" style="padding:10px">Sin opciones</li>`; };
  draw(); inp.addEventListener("input", draw);
  ul.addEventListener("change", (e) => { const c = e.target; if (c.checked) sel.add(c.value); else sel.delete(c.value); onChange(); });
  $("[data-c]", pop).onclick = () => { sel.clear(); draw(); onChange(); };
  $("[data-ok]", pop).onclick = () => pop.remove();
  document.body.appendChild(pop);
  const r = btn.getBoundingClientRect(); pop.style.left = Math.min(r.left, innerWidth - 310) + "px"; pop.style.top = Math.min(r.bottom + 6, innerHeight - 430) + "px";
  setTimeout(() => { inp.focus(); const off = (e) => { if (!pop.contains(e.target) && e.target !== btn) { pop.remove(); document.removeEventListener("pointerdown", off, true); } }; document.addEventListener("pointerdown", off, true); });
}
U.route("lista", (r) => {
  if (r.q.q !== undefined) LS.q = r.q.q;
  if (r.q.f) { LS.f = {}; }
  const mobile = innerWidth < 700;
  const colKeys = mobile ? ["mb", "ds", "inv"] : (U.set.cols && U.set.cols.length ? U.set.cols : COLS_DEF);
  const colDefs = colKeys.map((k) => (mobile ? { ...COLS[k], w: { mb: "84px", ds: "minmax(0,1fr)", inv: "92px" }[k] } : COLS[k]));
  const el = h(`<div>${head("Lista completa", "Busca con palabras, números de marbete o frases como «sin serie», «mayor a 5000», «antes de 2010», «faltantes».", `<button class="btn" type="button" id="lXls">${icon("sheet")}<span>Excel</span></button><button class="btn" type="button" id="lPdf">${icon("file")}<span>PDF</span></button><button class="btn" type="button" id="lLbl">${icon("qr")}<span>Etiquetas</span></button>`)}
    <div class="tools"><label class="sbox">${icon("search")}<input type="search" id="lq" placeholder="Busca o filtra: «computadoras sin serie», «area:biblioteca», «>10000»…" aria-label="Buscar en la lista" autocomplete="off"><button class="ib" type="button" id="lqx" aria-label="Borrar búsqueda" hidden>${icon("x")}</button></label><div class="facets" id="lf"></div><button class="btn ghost sm" type="button" id="lCols" aria-label="Columnas">${icon("cols")}<span>Columnas</span></button></div>
    <div class="parsed" id="lpar"></div><div id="lsel"></div><div class="sum" id="lsum"></div><div id="lt"></div></div>`);
  let base = [], view = [];
  const table = U.vtable({ cols: colDefs, rowH: U.set.density === "compact" ? 44 : 54, select: LS.sel, sortKey: LS.sort, sortDir: LS.dir, onOpen: (it) => S.openItem(it.tok), onSort: (k, d) => { LS.sort = k; LS.dir = d; apply(true); }, empty: () => U.empty("search", "Ningún artículo coincide", "Prueba con menos palabras o quita algún filtro.") });
  $("#lt", el).appendChild(table.el);
  table.onSel = () => selbar();
  const inp = $("#lq", el); inp.value = LS.q;
  const facetsUI = () => {
    $("#lf", el).innerHTML = FACETS.map(([k, label]) => { const n = LS.f[k]?.size || 0; return `<button type="button" class="fbtn ${n ? "on" : ""}" data-f="${k}">${esc(label)}${n ? " · " + n : ""}${icon("down")}</button>`; }).join("") + (Object.values(LS.f).some((s) => s.size) ? `<button type="button" class="btn ghost sm" id="lfx">Quitar filtros</button>` : "");
  };
  const apply = (keep) => {
    const P = B.parse(LS.q); base = B.filter(D.items, P);
    view = base.filter((it) => FACETS.every(([k, , fn]) => !LS.f[k]?.size || LS.f[k].has(String(fn(it)))));
    if (LS.sort) view.sort(sorter(LS.sort, LS.dir));
    else if (P.words.length) { const sc = (it) => { let s = 0; for (const w of P.words) { if (B.norm(it.mb) === w.w) s += 1000; if (it.hd && it.hd.includes(" " + w.a[0])) s += 5; } return s; }; view.forEach((it) => (it._s = sc(it))); view.sort((a, b) => b._s - a._s || a.n - b.n); }
    table.set(view, keep);
    $("#lqx", el).hidden = !LS.q;
    $("#lpar", el).innerHTML = (P.fixed.map(([a, b]) => `<span>Entendí «${esc(a)}» como «${esc(b)}»</span>`).join("") + P.filters.map((f) => `<span class="chip">${esc(f.label)}</span>`).join(""));
    const val = B.sum(view), ppl = new Set(view.map((x) => x.rc)).size;
    $("#lsum", el).innerHTML = `<span><b>${B.int(view.length)}</b> ${view.length === 1 ? "artículo" : "artículos"}${view.length !== D.items.length ? ` de ${B.int(D.items.length)}` : ""}</span><span>Valor <b>${B.money(val)}</b></span><span><b>${B.int(ppl)}</b> ${ppl === 1 ? "resguardante" : "resguardantes"}</span><span class="sp"></span>${mobile ? "" : `<span class="muted">${U.kbd("↑")} ${U.kbd("↓")} para moverte · ${U.kbd("Espacio")} selecciona</span>`}`;
    facetsUI(); selbar();
    const url = "#/lista" + (LS.q ? "?q=" + encodeURIComponent(LS.q) : ""); if (location.hash !== url) history.replaceState(null, "", url);
  };
  const selbar = () => {
    const n = LS.sel.size, box = $("#lsel", el);
    if (!n) { box.innerHTML = ""; return; }
    if (!box.firstChild) box.innerHTML = `<div class="selbar"><b></b><button class="btn sm" type="button" data-s="move">${icon("swap")}<span>Trasladar</span></button><button class="btn sm" type="button" data-s="area">${icon("map")}<span>Cambiar área</span></button><button class="btn sm" type="button" data-s="lbl">${icon("qr")}<span>Etiquetas</span></button><button class="btn sm" type="button" data-s="xls">${icon("sheet")}<span>Excel</span></button><button class="btn sm" type="button" data-s="clr">${icon("x")}<span>Quitar selección</span></button></div>`;
    $("b", box).textContent = B.plural(n, "seleccionado");
  };
  $("#lsel", el).onclick = async (e) => {
    const a = e.target.closest("[data-s]")?.dataset.s; if (!a) return; const toks = [...LS.sel];
    if (a === "clr") { LS.sel.clear(); table.refresh(); selbar(); }
    else if (a === "move") S.moveItems(toks, { done: () => { LS.sel.clear(); apply(true); } });
    else if (a === "area") changeArea(toks, () => { LS.sel.clear(); apply(true); });
    else if (a === "lbl") { window.__labelSel = toks; U.go("#/etiquetas?src=sel"); }
    else if (a === "xls") { const list = toks.map((t) => D.byTok.get(t)).filter(Boolean); F.save(`seleccion_${F.stamp()}.xlsx`, await S.inventoryXlsx(list, "Selección de la lista")); }
  };
  $("#lf", el).onclick = (e) => { if (e.target.closest("#lfx")) { LS.f = {}; apply(); return; } const b = e.target.closest("[data-f]"); if (b) facetPop(b, b.dataset.f, base, () => apply()); };
  inp.addEventListener("input", U.debounce(() => { LS.q = inp.value; apply(); }, 160));
  inp.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") { e.preventDefault(); table.focus(); } else if (e.key === "Enter") { e.preventDefault(); const it = B.findMb(inp.value); if (it && view.length === 1) S.openItem(it.tok); else table.focus(); } });
  $("#lqx", el).onclick = () => { inp.value = LS.q = ""; apply(); inp.focus(); };
  $("#lCols", el).onclick = () => {
    const cur = new Set(colKeys);
    const body = h(`<div class="set-l">${Object.entries(COLS).filter(([k]) => k !== "ph").map(([k, c]) => `<label class="set"><span><b>${esc(c.h)}</b></span><input type="checkbox" value="${k}" ${cur.has(k) ? "checked" : ""}></label>`).join("")}</div>`);
    U.modal({ title: "Columnas de la lista", body, actions: [{ label: "Restablecer", kind: "ghost", fn: () => { U.set.cols = null; U.saveSet(); U.render({ force: true, instant: true }); } }, { label: "Aplicar", kind: "pri", fn: () => { const ks = $$("input:checked", body).map((x) => x.value); if (!ks.length) return false; U.set.cols = Object.keys(COLS).filter((k) => ks.includes(k) || k === "ph"); U.saveSet(); U.render({ force: true, instant: true }); } }] });
  };
  $("#lXls", el).onclick = (e) => busyBtn(e.currentTarget, async () => { F.save(`lista_${F.stamp()}.xlsx`, await S.inventoryXlsx(view, "Lista filtrada", LS.q ? ["Búsqueda: " + LS.q] : [])); U.toast("Excel descargado.", { kind: "ok" }); }).catch(U.fail);
  $("#lPdf", el).onclick = (e) => busyBtn(e.currentTarget, async () => { F.save(`lista_${F.stamp()}.pdf`, await listPdf(view, "LISTA DE ARTÍCULOS", LS.q ? "Búsqueda: " + LS.q : "Inventario completo")); U.toast("PDF descargado.", { kind: "ok" }); }).catch(U.fail);
  $("#lLbl", el).onclick = () => { window.__labelSel = view.map((x) => x.tok); U.go("#/etiquetas?src=sel"); };
  const fit = () => { const t = table.el.getBoundingClientRect().top + scrollY; table.el.style.setProperty("--vth", Math.max(340, innerHeight - Math.min(t, 330) - 40) + "px"); };
  addEventListener("resize", fit);
  return { el, title: "Lista completa", after() { apply(); fit(); }, update() { apply(true); }, focusSearch() { inp.focus(); inp.select(); }, destroy() { removeEventListener("resize", fit); document.querySelector(".fpop")?.remove(); } };
});
async function changeArea(toks, done) {
  const arH = D.inv.h[D.K.AR]; if (!arH) return U.toast("El inventario no tiene columna de área.", { kind: "err" });
  const body = h(`<div><label class="fld"><span>Nueva área para ${B.plural(toks.length, "artículo")}</span><input list="dlAr2" autocomplete="off"></label><datalist id="dlAr2">${B.areaNames().map((n) => `<option value="${esc(n)}">`).join("")}</datalist></div>`);
  const v = await U.modal({ title: "Cambiar área", body, onOpen: () => setTimeout(() => $("input", body).focus(), 50), actions: [{ label: "Cancelar", kind: "ghost", value: "" }, { label: "Cambiar", kind: "pri", fn: () => { const x = D.clean($("input", body).value).toUpperCase(); if (!x) return false; return x; } }] });
  if (!v) return;
  try { const r = await D.bulkSet(toks, arH, v); FX.hit("ok"); U.toast(`Área cambiada en ${B.plural(r.items || 0, "artículo")}.`, { kind: "ok", action: { label: "Deshacer", fn: () => S.undo(r.undo) } }); done && done(); } catch (e) { U.fail(e); }
}
function pdfCols(withRc) {
  const K = D.K, h0 = D.inv.h, cols = [{ h: "#", w: 8, right: 1 }, { h: "No.", w: 11, right: 1 }];
  if (K.MB >= 0) cols.push({ h: h0[K.MB], w: 18, k: K.MB });
  cols.push({ h: h0[K.DS], w: 74, k: K.DS });
  for (const j of [K.MA, K.MO, K.SE]) if (j >= 0) cols.push({ h: h0[j], w: 24, k: j });
  if (K.AR >= 0) cols.push({ h: h0[K.AR], w: 40, k: K.AR });
  if (withRc && K.RC >= 0) cols.push({ h: h0[K.RC], w: 40, k: K.RC });
  if (K.IM >= 0) cols.push({ h: h0[K.IM], w: 22, k: K.IM, right: 1 });
  return cols;
}
async function listPdf(list, title, subtitle) {
  const cols = pdfCols(true);
  const rows = list.map((it, i) => cols.map((c, j) => (j === 0 ? String(i + 1) : j === 1 ? String(it.n) : D.clean(it.row[c.k + 1]))));
  const tot = B.sum(list);
  return F.pdfTable({ title: "CONALEP CHETUMAL · SERVICIOS ADMINISTRATIVOS", subtitle: title + " · " + subtitle, info: `Fecha: ${F.fecha()}   ·   Total: ${B.int(list.length)} artículos`, cols, rows, footer: `TOTAL DE ARTÍCULOS: ${B.int(list.length)}     IMPORTE TOTAL: ${B.money(tot)}` });
}

/* ================= RESGUARDANTES ================= */
const RS = { q: "", st: "todos", sort: "n" };
U.route("resguardantes", () => {
  const el = h(`<div></div>`);
  const draw = () => {
    const all = B.people(), t = B.totals(); const nv = B.nameVariants(); const dupSet = new Set(nv.flatMap((g) => g.names.map((x) => x.name)));
    let ppl = all.filter((p) => (RS.st === "todos" ? true : RS.st === "curso" ? p.status === "curso" : RS.st === "fin" ? p.status === "fin" : RS.st === "nada" ? p.status === "nada" : dupSet.has(p.name)));
    const q = B.norm(RS.q); if (q) ppl = ppl.filter((p) => B.norm(p.name).includes(q));
    const sorts = { name: (a, b) => a.name.localeCompare(b.name, "es"), n: (a, b) => b.total - a.total, val: (a, b) => b.val - a.val, pct: (a, b) => b.pct - a.pct || b.lastAt - a.lastAt };
    ppl.sort(sorts[RS.sort]);
    const sum = all.reduce((s, p) => s + p.total, 0);
    el.innerHTML = head("Resguardantes", `${B.int(all.filter((p) => p.name !== SIN).length)} personas con ${B.int(t.items)} artículos en total. ${sum === D.items.length ? "Los totales cuadran con el inventario." : "<b>Los totales no cuadran con el inventario.</b>"}`) +
      `<div class="tools"><label class="sbox">${icon("search")}<input type="search" id="rq" placeholder="Buscar una persona" value="${esc(RS.q)}" aria-label="Buscar resguardante"></label><div class="seg" id="rst">${[["todos", "Todos"], ["curso", "En revisión"], ["fin", "Terminados"], ["nada", "Sin empezar"], ["dup", "Posibles duplicados"]].map(([k, l]) => `<button type="button" data-k="${k}" class="${RS.st === k ? "on" : ""}">${l}</button>`).join("")}</div><select class="inp" id="rso" style="width:auto" aria-label="Ordenar">${[["name", "Por nombre"], ["n", "Más artículos"], ["val", "Mayor valor"], ["pct", "Más avance"]].map(([k, l]) => `<option value="${k}" ${RS.sort === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="pgrid">${ppl.map((p) => { const ar = B.groupBy(p.items, (x) => x.ar)[0]; return `<a class="pc ${p.fin ? "fin" : ""}" href="#/resguardante/${encodeURIComponent(p.name)}">${p.fin ? `<span class="stamp si">Inventariado</span>` : ""}<div class="pc-h">${U.avatar(p.name)}<div><b>${esc(U.nm(p.name))}</b><small>${esc(ar && ar.key ? U.txt(ar.key) : "Sin área")}</small></div></div><div class="pc-n"><div><div class="v" data-count="${p.total}">0</div><small>${p.total === 1 ? "artículo" : "artículos"} · ${esc(B.moneyShort(p.val))}</small></div><small class="muted" style="text-align:right">${p.rev ? `${p.pct}% revisado` : "Sin revisar"}${p.no ? `<br><span style="color:var(--red)">${B.plural(p.no, "no está", "no están")}</span>` : ""}</small></div><div class="bar"><i class="si" data-w="${(p.si / p.total) * 100}"></i><i class="no" data-w="${(p.no / p.total) * 100}"></i></div>${dupSet.has(p.name) ? `<span class="flag">${icon("people")}Parece duplicado de otro nombre</span>` : ""}</a>`; }).join("") || U.empty("search", "Nadie coincide con la búsqueda", "")}</div>`;
    $("#rq", el).addEventListener("input", U.debounce((e) => { RS.q = e.target.value; draw(); const i = $("#rq", el); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 200));
    $("#rst", el).onclick = (e) => { const b = e.target.closest("button"); if (b) { RS.st = b.dataset.k; FX.play("tap"); draw(); } };
    $("#rso", el).onchange = (e) => { RS.sort = e.target.value; draw(); };
    U.anim(el);
  };
  return { el, title: "Resguardantes", after: draw, update: U.debounce(draw, 300), focusSearch() { $("#rq", el)?.focus(); } };
});

/* ================= UN RESGUARDANTE ================= */
U.route("resguardante", (r) => {
  const name = r.param; const tab = r.q.t || "articulos";
  const el = h(`<div></div>`);
  let sub = null;
  const draw = () => {
    const p = B.person(name);
    if (!p.total && !p.doc) { el.innerHTML = `<a class="back" href="#/resguardantes">${icon("left")}Resguardantes</a>` + U.empty("person", "Este resguardante ya no tiene artículos", "Puede que sus artículos se hayan trasladado. Revisa la pestaña de historial en la bitácora."); return; }
    const areas = B.groupBy(p.items, (x) => x.ar || "(Sin área)");
    el.innerHTML = `<a class="back" href="#/resguardantes">${icon("left")}Resguardantes</a>
      <section class="ph-hero">${U.avatar(name, "lg")}<div><h1>${esc(U.nm(name))}</h1><div class="meta"><span><b>${B.int(p.total)}</b> artículos</span><span>Valor <b>${B.money(p.val)}</b></span><span><b>${B.int(areas.length)}</b> ${areas.length === 1 ? "área" : "áreas"}</span>${p.lastAt ? `<span>Última revisión ${esc(B.ago(p.lastAt))}</span>` : ""}</div></div>
        <div class="ph-a"><button class="btn pri sm" type="button" data-a="pdf">${icon("file")}<span>Resguardo PDF</span></button><button class="btn sm" type="button" data-a="xls">${icon("sheet")}<span>Excel</span></button><button class="btn sm" type="button" data-a="qr">${icon("qr")}<span>Etiquetas QR</span></button><button class="btn sm" type="button" data-a="acta">${icon("print")}<span>Acta de revisión</span></button><button class="btn sm" type="button" data-a="all">${icon("swap")}<span>Trasladar todo</span></button></div>
        <div class="ph-r">${p.fin ? `<div class="bigstamp">Inventariado<small>${esc(B.fdate(p.fin.at || p.fin.t))}${p.fin.by ? " · " + esc(p.fin.by) : ""}</small></div>` : U.ring(p.pct, { size: 96, sw: 9, label: p.pct + "%" })}</div></section>
      <div class="ph-stats"><div class="st si"><div class="v" data-count="${p.si}">0</div><small>Presentes</small></div><div class="st no"><div class="v" data-count="${p.no}">0</div><small>No están</small></div><div class="st pe"><div class="v" data-count="${p.pend}">0</div><small>Pendientes</small></div><div class="st"><div class="v">${B.int(p.reg)} / ${B.int(p.mal)}</div><small>Regular / malo</small></div></div>
      <nav class="tabs">${[["articulos", "Artículos", p.total], ["revision", "Revisión", p.rev], ["historial", "Historial"], ["resumen", "Resumen"]].map(([k, l, n]) => `<a href="#/resguardante/${encodeURIComponent(name)}?t=${k}" class="${tab === k ? "on" : ""}">${l}${n !== undefined ? `<span class="cnt">${B.int(n)}</span>` : ""}</a>`).join("")}</nav><div id="pt"></div>`;
    el.querySelector(".ph-hero").onclick = (e) => { const a = e.target.closest("[data-a]"); if (a) personAction(a.dataset.a, name, a); };
    const host = $("#pt", el);
    sub && sub.destroy && sub.destroy();
    sub = tab === "revision" ? revTab(name, host) : tab === "historial" ? histTab(name, host) : tab === "resumen" ? resTab(name, host) : artTab(name, host);
    U.anim(el);
  };
  return { el, title: U.nm(name), after: draw, update(k) { if (sub && sub.update) { sub.update(k); updHead(); } else draw(); }, onScan: (c) => sub && sub.onScan ? sub.onScan(c) : false, destroy() { sub && sub.destroy && sub.destroy(); } };
  function updHead() {
    const p = B.person(name); const st = $$(".ph-stats .v", el);
    if (st.length === 4) { st[0].textContent = B.int(p.si); st[1].textContent = B.int(p.no); st[2].textContent = B.int(p.pend); st[3].textContent = B.int(p.reg) + " / " + B.int(p.mal); }
    const rr = $(".ph-r", el); if (rr) { rr.innerHTML = p.fin ? `<div class="bigstamp">Inventariado<small>${esc(B.fdate(p.fin.at || p.fin.t))}${p.fin.by ? " · " + esc(p.fin.by) : ""}</small></div>` : U.ring(p.pct, { size: 96, sw: 9, label: p.pct + "%" }); U.anim(rr); }
  }
});
async function personAction(a, name, btn) {
  const p = B.person(name); const items = p.items;
  const base = "resguardo_" + F.safe(name).replace(/\s+/g, "_");
  try {
    if (a === "pdf") await busyBtn(btn, async () => { F.save(base + ".pdf", await resguardoPdf(name, items)); U.toast("Resguardo en PDF descargado.", { kind: "ok" }); });
    else if (a === "xls") await busyBtn(btn, async () => { F.save(base + ".xlsx", await resguardoXlsx(name, items)); U.toast("Excel descargado.", { kind: "ok" }); });
    else if (a === "qr") { window.__labelSel = items.map((x) => x.tok); U.go("#/etiquetas?src=sel&n=" + encodeURIComponent(name)); }
    else if (a === "acta") await busyBtn(btn, async () => { F.save("acta_revision_" + F.safe(name).replace(/\s+/g, "_") + ".pdf", await actaPdf(name)); U.toast("Acta descargada.", { kind: "ok" }); });
    else if (a === "all") S.moveItems(items.map((x) => x.tok), { nota: "Traslado de todo el resguardo de " + name });
  } catch (e) { U.fail(e); }
}
function resguardoPdf(name, items) {
  const cols = pdfCols(false);
  const rows = items.map((it, i) => cols.map((c, j) => (j === 0 ? String(i + 1) : j === 1 ? String(it.n) : D.clean(it.row[c.k + 1]))));
  let foot = `TOTAL DE ARTÍCULOS: ${items.length}`; if (D.K.IM >= 0) foot += "     IMPORTE TOTAL: " + B.money(B.sum(items));
  return F.pdfTable({ title: "CONALEP CHETUMAL · SERVICIOS ADMINISTRATIVOS", subtitle: "RESGUARDO DE: " + name, info: `Fecha: ${F.fecha()}   ·   Total: ${items.length} artículos`, cols, rows, footer: foot, signature: { name, role: "Firma del resguardante" } });
}
function resguardoXlsx(name, items) {
  const h0 = D.inv.h, ic = D.K.IM;
  const rows = items.map((it, i) => [i + 1, it.n, ...h0.map((hh, j) => { const v = D.cell(it, hh); if (j === ic) return it.im || v; if (j === D.K.MB && /^\d+$/.test(v)) return Number(v); return v; })]);
  const sh = F.table({ name: "Resguardo", title: "CONALEP CHETUMAL · JEFATURA DE PROYECTO DE SERVICIOS ADMINISTRATIVOS", subs: ["RESGUARDO DE: " + name, "Fecha: " + F.fecha() + "   ·   Total de artículos: " + items.length], head: ["#", "No.", ...h0], rows, widths: [5, 6, ...h0.map((hh) => (/descrip/i.test(hh) ? 48 : /proveedor|[aá]rea|resguard/i.test(hh) ? 30 : 14))], money: ic >= 0 ? [ic + 2] : [], total: ic >= 0 ? { labelCol: ic + 1, sumCols: [ic + 2] } : null });
  return F.xlsx([sh]);
}
function actaPdf(name) {
  const p = B.person(name);
  const cols = [{ h: "#", w: 7, right: 1 }, { h: "Marbete", w: 16 }, { h: "Descripción", w: 70 }, { h: "Revisión", w: 18 }, { h: "Estado", w: 14 }, { h: "Observaciones", w: 44 }];
  const rows = p.items.map((it, i) => [String(i + 1), it.mb, it.ds, it.mark ? EST[it.mark.e] : "Pendiente", it.mark?.e === "si" ? CND[it.mark.c] || "Bueno" : "", it.mark?.n || ""]);
  const ex = Object.entries(p.extras || {}); ex.forEach(([tok, x], i) => rows.push([String(p.items.length + i + 1), tok.replace(/^m/, ""), "Encontrado durante la revisión (no estaba en la lista)", "Extra", "", x.n || ""]));
  return F.pdfTable({ title: "ACTA DE REVISIÓN DE INVENTARIO · CONALEP CHETUMAL", subtitle: "RESGUARDO DE: " + name, info: `Fecha: ${F.fecha()}${p.inicio ? "   ·   Inicio: " + new Date(p.inicio).toLocaleDateString("es-MX") : ""}${p.fin ? "   ·   Fin: " + new Date(p.fin.at || p.fin.t).toLocaleDateString("es-MX") : ""}`, cols, rows, landscape: false, footer: `Presentes: ${p.si}   No están: ${p.no}   Pendientes: ${p.pend}   Regular: ${p.reg}   Malo: ${p.mal}${ex.length ? "   Extras: " + ex.length : ""}   Valor de lo que falta: ${B.money(p.valNo)}`, signature: [{ name, role: "Resguardante" }, { name: D.user, role: "Revisó" }] });
}
function personTable(list, host, opts = {}) {
  const mob = innerWidth < 700, keys = mob ? ["mb", "ds", "inv"] : ["n", "mb", "ds", "ar", "im", "inv", "ph"];
  const sel = new Set();
  const t = U.vtable({ cols: keys.map((k) => (mob ? { ...COLS[k], w: { mb: "84px", ds: "minmax(0,1fr)", inv: "92px" }[k] } : COLS[k])), rowH: 54, select: sel, onOpen: (it) => S.openItem(it.tok), onSort: (k, d) => { list.sort(sorter(k, d)); t.set(list, true); } });
  const bar = h(`<div></div>`);
  t.onSel = () => { if (!sel.size) { bar.innerHTML = ""; return; } bar.innerHTML = `<div class="selbar"><b>${B.plural(sel.size, "seleccionado")}</b><button class="btn sm" type="button" data-s="move">${icon("swap")}<span>Trasladar</span></button><button class="btn sm" type="button" data-s="area">${icon("map")}<span>Cambiar área</span></button><button class="btn sm" type="button" data-s="lbl">${icon("qr")}<span>Etiquetas</span></button><button class="btn sm" type="button" data-s="clr">${icon("x")}<span>Quitar</span></button></div>`; };
  bar.onclick = (e) => { const a = e.target.closest("[data-s]")?.dataset.s; if (!a) return; const toks = [...sel]; if (a === "clr") { sel.clear(); t.refresh(); t.onSel(); } else if (a === "move") S.moveItems(toks, { done: () => { sel.clear(); t.onSel(); } }); else if (a === "area") changeArea(toks, () => { sel.clear(); t.onSel(); }); else if (a === "lbl") { window.__labelSel = toks; U.go("#/etiquetas?src=sel"); } };
  host.append(bar, t.el); t.set(list);
  t.el.style.setProperty("--vth", Math.max(360, innerHeight - 260) + "px");
  return t;
}
function artTab(name, host) {
  host.innerHTML = `<div class="tools"><label class="sbox">${icon("search")}<input type="search" placeholder="Buscar en este resguardo" aria-label="Buscar en este resguardo"></label></div><div class="tb"></div>`;
  let q = ""; const get = () => { const P = B.parse(q); return B.filter(B.person(name).items, P); };
  const t = personTable(get(), $(".tb", host));
  $("input", host).addEventListener("input", U.debounce((e) => { q = e.target.value; t.set(get()); }, 150));
  return { update() { t.set(get(), true); } };
}

/* ---------- revisión desde la web (con lector USB o tecleando el marbete) ---------- */
function revTab(name, host) {
  let filter = "todos", q = "", shown = 120, hitTok = "";
  host.innerHTML = `<div class="rev-top"><span id="rvRing"></span><div style="min-width:150px"><b id="rvTxt"></b><small class="muted" style="display:block" id="rvSub"></small></div><form class="sbox" id="rvF">${icon("qr")}<input id="rvQ" placeholder="Escanea o escribe un marbete y presiona Enter" autocomplete="off" aria-label="Escanear o escribir marbete"></form><div class="seg" id="rvFl">${[["todos", "Todos"], ["pend", "Pendientes"], ["si", "Presentes"], ["no", "No están"]].map(([k, l]) => `<button type="button" data-k="${k}" class="${k === filter ? "on" : ""}">${l}</button>`).join("")}</div><button class="btn sm" type="button" id="rvX">${icon("sheet")}<span>Excel</span></button><button class="btn sm" type="button" id="rvMore" aria-label="Más opciones">${icon("more")}</button><button class="btn pri sm" type="button" id="rvFin">${icon("check")}<span>Finalizar</span></button></div><ul class="rev-l" id="rvL"></ul><div id="rvMoreBox"></div><div id="rvEx"></div>`;
  const L = $("#rvL", host);
  const items = () => B.person(name).items;
  const visible = () => { const P = B.parse(q); return B.filter(items(), P).filter((it) => filter === "todos" || (filter === "pend" ? !it.mark : it.mark?.e === filter)); };
  const row = (it) => { const m = it.mark; return `<li class="rv ${m ? m.e : ""} ${hitTok === it.tok ? "hit" : ""}" data-t="${it.tok}"><span class="mbn">${esc(it.mb)}</span><div class="rv-t"><b>${esc(U.txt(it.ds))}</b><small>${esc([it.ma, it.mo, B.blank(it.se) ? "" : "Serie " + it.se, U.txt(it.ar)].filter((x) => x && !B.blank(x)).join(" · "))}</small>${m ? `<small>${m.e === "si" ? "Presente" : "No está"} · ${esc(m.by || "")} · ${esc(B.ago(m.at))}</small>` : ""}${m?.n ? `<small class="note">Observaciones: ${esc(m.n)}</small>` : ""}</div><div class="rv-a">${m?.e === "si" ? `<span class="cnd">${["B", "R", "M"].map((c) => `<button type="button" class="${c} ${(m.c || "B") === c ? "on" : ""}" data-c="${c}" aria-label="Estado ${CND[c]}" data-tip="Estado: ${CND[c]}">${c}</button>`).join("")}</span>` : ""}<button class="ib" type="button" data-n aria-label="Observaciones" data-tip="Observaciones">${icon("edit")}</button><button class="ib" type="button" data-mv aria-label="Trasladar" data-tip="Trasladar a otra persona">${icon("swap")}</button><button class="mk si ${m?.e === "si" ? "on" : ""}" type="button" data-e="si" aria-label="Presente" data-tip="Está en su lugar">${icon("check")}</button><button class="mk no ${m?.e === "no" ? "on" : ""}" type="button" data-e="no" aria-label="No está" data-tip="No está">${icon("x")}</button></div></li>`; };
  const draw = () => {
    const p = B.person(name), list = visible();
    $("#rvRing", host).innerHTML = U.ring(p.pct, { size: 46, sw: 5, cls: p.pct >= 100 ? "done" : "" }); U.anim($("#rvRing", host));
    $("#rvTxt", host).textContent = `${B.int(p.rev)} de ${B.int(p.total)} revisados`;
    $("#rvSub", host).textContent = p.fin ? "Revisión finalizada " + B.ago(p.fin.at || p.fin.t) : `${B.int(p.si)} presentes · ${B.int(p.no)} no están · ${B.int(p.pend)} pendientes`;
    $("#rvFin", host).hidden = !!p.fin;
    L.innerHTML = list.slice(0, shown).map(row).join("") + (list.length > shown ? `<li style="text-align:center;padding:10px"><button class="btn" type="button" id="rvMas">Mostrar ${B.int(Math.min(200, list.length - shown))} más (${B.int(list.length - shown)} restantes)</button></li>` : "") + (!list.length ? `<li>${U.empty("check", filter === "pend" ? "No queda nada pendiente" : "Nada que mostrar", filter === "pend" ? "Todos los artículos de este resguardo ya se revisaron." : "")}</li>` : "");
    const ex = Object.entries(p.extras || {});
    $("#rvEx", host).innerHTML = ex.length ? `<section class="pnl" style="margin-top:16px"><div class="pnl-h"><div><h2>Encontrados que no estaban en su lista</h2><p>Reportados desde la app. Hay que darlos de alta o aclarar de quién son.</p></div></div><ul class="feed">${ex.map(([tok, x]) => { const it = D.byTok.get(tok); return `<li><span class="dot ex"></span><div class="tx"><b>${esc(tok.replace(/^m/, ""))}${it ? " · " + esc(U.txt(it.ds)) : ""}</b><small>${it ? "Está registrado con " + esc(U.nm(it.rc)) : "No existe en el inventario"}${x.n ? " · " + esc(x.n) : ""}</small></div><time>${esc(B.ago(x.at))}</time></li>`; }).join("")}</ul></section>` : "";
  };
  const mark = async (tok, e, extra = {}) => {
    const it = D.byTok.get(tok); const cur = it.mark;
    const val = !e ? null : { e, c: e === "si" ? (extra.c ?? (cur?.e === "si" ? cur.c : "")) : "", n: extra.n ?? cur?.n ?? "" };
    if (e && !("c" in extra) && !("n" in extra) && cur?.e === e) { /* tocar de nuevo quita la marca */ return mark(tok, null); }
    if (val?.e === "si") FX.hit("stamp"); else if (val?.e === "no") FX.hit("warn"); else FX.play("undo");
    try { await D.setMark(name, tok, val); } catch (err) { U.fail(err); }
  };
  L.addEventListener("click", (e) => {
    if (e.target.closest("#rvMas")) { shown += 200; draw(); return; }
    const li = e.target.closest(".rv"); if (!li) return; const tok = li.dataset.t;
    const b = e.target.closest("[data-e]"); if (b) return mark(tok, b.dataset.e);
    const c = e.target.closest("[data-c]"); if (c) return mark(tok, "si", { c: c.dataset.c === "B" ? "" : c.dataset.c });
    if (e.target.closest("[data-n]")) { const it = D.byTok.get(tok); const body = h(`<div><p class="muted">${esc(it.mb)} · ${esc(U.txt(it.ds))}</p><label class="fld"><span>Observaciones</span><textarea placeholder="Por ejemplo: pata rota, sin cargador, está en el aula 3…">${esc(it.mark?.n || "")}</textarea></label></div>`); U.modal({ title: "Observaciones", body, onOpen: () => setTimeout(() => $("textarea", body).focus(), 50), actions: [{ label: "Cancelar", kind: "ghost", value: "" }, { label: "Guardar", kind: "pri", fn: () => mark(tok, it.mark?.e || "si", { n: D.clean($("textarea", body).value) }) }] }); return; }
    if (e.target.closest("[data-mv]")) return S.moveItems([tok], { nota: "Durante revisión de inventario de " + name });
    if (!e.target.closest("button")) S.openItem(tok);
  });
  const onScan = (code) => {
    const it = B.findMb(code);
    if (!it) { FX.hit("err"); U.toast(`El marbete «${code}» no existe en el inventario.`, { kind: "err" }); return true; }
    if (it.rc !== name) { FX.hit("warn"); U.toast(`El marbete ${it.mb} está registrado con ${U.nm(it.rc)}.`, { kind: "err", action: { label: "Trasladar aquí", fn: async () => { try { const r = await D.transfer([it.tok], name, "Encontrado durante la revisión de " + name); U.toast("Trasladado.", { kind: "ok", action: { label: "Deshacer", fn: () => S.undo(r.undo) } }); } catch (e) { U.fail(e); } } } }); return true; }
    hitTok = it.tok;
    if (it.mark?.e !== "si") mark(it.tok, "si"); else { FX.play("soft"); U.toast(`${it.mb} ya estaba marcado como presente.`); }
    if (filter !== "todos" && filter !== "si") { filter = "todos"; $$("#rvFl button", host).forEach((b) => b.classList.toggle("on", b.dataset.k === "todos")); }
    const idx = visible().findIndex((x) => x.tok === it.tok); if (idx >= shown) shown = idx + 20;
    draw(); setTimeout(() => L.querySelector(`[data-t="${it.tok}"]`)?.scrollIntoView({ block: "center", behavior: FX.motion ? "smooth" : "auto" }), 30);
    return true;
  };
  $("#rvF", host).onsubmit = (e) => { e.preventDefault(); const v = $("#rvQ", host).value.trim(); if (!v) return; $("#rvQ", host).value = ""; onScan(v); };
  $("#rvFl", host).onclick = (e) => { const b = e.target.closest("button"); if (!b) return; filter = b.dataset.k; shown = 120; $$("#rvFl button", host).forEach((x) => x.classList.toggle("on", x === b)); FX.play("tap"); draw(); };
  $("#rvX", host).onclick = (e) => busyBtn(e.currentTarget, async () => { F.save("revision_" + F.safe(name).replace(/\s+/g, "_") + ".xlsx", await revXlsx(name)); U.toast("Excel de la revisión descargado.", { kind: "ok" }); }).catch(U.fail);
  $("#rvMore", host).onclick = async () => {
    const p = B.person(name);
    const v = await U.modal({ title: "Más opciones de la revisión", body: `<p class="lead">Revisión de ${esc(U.nm(name))}.</p>`, actions: [{ label: "Cerrar", kind: "ghost", value: "" }, ...(p.fin ? [{ label: "Reabrir revisión", value: "reopen", icon: "undo" }] : []), { label: "Empezar de cero", kind: "danger", value: "reset", icon: "trash" }] });
    if (v === "reopen") { if (await U.confirm("¿Reabrir la revisión?", "Se quita el sello de inventariado y se puede seguir marcando.", "Reabrir")) D.reopen(name).then(() => U.toast("Revisión reabierta.", { kind: "ok" })).catch(U.fail); }
    else if (v === "reset") { if (await U.confirm("¿Empezar la revisión desde cero?", `Se borran las ${p.rev} marcas, las observaciones y los artículos extra de ${U.nm(name)}. Esto no se puede deshacer.`, "Borrar y empezar", true)) D.resetRev(name).then(() => U.toast("La revisión empezó de nuevo.", { kind: "ok" })).catch(U.fail); }
  };
  $("#rvFin", host).onclick = () => finishFlow(name);
  draw(); setTimeout(() => $("#rvQ", host)?.focus(), 100);
  return { update: U.debounce(draw, 120), onScan };
}
function finishFlow(name) {
  const p = B.person(name);
  const body = h(`<div><p class="lead">${p.pend ? `Todavía quedan <b>${B.int(p.pend)}</b> artículos sin revisar. Si finalizas, quedarán como pendientes en el acta.` : "Todos los artículos ya se revisaron."}</p><div class="ph-stats" style="margin:14px 0"><div class="st si"><div class="v">${B.int(p.si)}</div><small>Presentes</small></div><div class="st no"><div class="v">${B.int(p.no)}</div><small>No están</small></div><div class="st pe"><div class="v">${B.int(p.pend)}</div><small>Pendientes</small></div><div class="st"><div class="v">${B.money(p.valNo, 0)}</div><small>Valor faltante</small></div></div><div class="slide" id="sl"><span>Desliza para finalizar</span><div class="kn">${icon("right")}</div></div></div>`);
  let d;
  U.modal({ title: "Finalizar la revisión de " + U.nm(name), body, onOpen: (dlg) => { d = dlg; slider($("#sl", body), async () => { try { await D.finish(name); d.close(); celebrate(name); } catch (e) { U.fail(e); } }); }, actions: [{ label: "Cancelar", kind: "ghost", value: "" }] });
}
function slider(el, onDone) {
  const kn = $(".kn", el); let x0 = 0, dx = 0, drag = false;
  const max = () => el.clientWidth - kn.clientWidth - 8;
  kn.addEventListener("pointerdown", (e) => { drag = true; x0 = e.clientX - dx; kn.setPointerCapture(e.pointerId); FX.play("tap"); });
  kn.addEventListener("pointermove", (e) => { if (!drag) return; dx = Math.max(0, Math.min(max(), e.clientX - x0)); kn.style.transform = `translateX(${dx}px)`; });
  const end = () => { if (!drag) return; drag = false; if (dx >= max() - 6) { el.classList.add("done"); $("span", el).textContent = "Finalizando…"; onDone(); } else { dx = 0; kn.style.transition = "transform .3s"; kn.style.transform = ""; setTimeout(() => (kn.style.transition = ""), 300); } };
  kn.addEventListener("pointerup", end); kn.addEventListener("pointercancel", end);
  kn.tabIndex = 0; kn.setAttribute("role", "button"); kn.setAttribute("aria-label", "Finalizar"); kn.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { el.classList.add("done"); onDone(); } });
}
function celebrate(name) {
  FX.hit("stamp"); setTimeout(() => FX.hit("done"), 250); FX.confetti({ n: 260 });
  const fx = h(`<div class="finfx"><div class="bigstamp">Inventariado<small>${esc(U.nm(name))} · ${esc(B.fdate(Date.now()))}</small></div></div>`); document.body.appendChild(fx); setTimeout(() => fx.remove(), 2700);
}
async function revXlsx(name) {
  const p = B.person(name);
  const rows = p.items.map((it, i) => [i + 1, it.mb, it.ds, it.mark ? EST[it.mark.e] : "Pendiente", it.mark?.e === "si" ? CND[it.mark.c] || "" : "", it.mark?.n || "", it.mark ? B.fdt(it.mark.at) : "", it.mark?.by || "", it.rc]);
  const sh = F.table({ name: "Revisión", title: "REVISIÓN DE INVENTARIO · RESGUARDO DE: " + name, subs: ["Fecha: " + F.fecha() + "   ·   Presentes: " + p.si + "   No están: " + p.no + "   Pendientes: " + p.pend], head: ["#", "Marbete", "Descripción", "Estado", "Estado físico", "Observaciones", "Revisado", "Por", "Resguardante actual"], rows, widths: [5, 10, 50, 12, 13, 36, 18, 18, 34], statusCol: 3 });
  return F.xlsx([sh]);
}
function histTab(name, host) {
  host.innerHTML = `<p class="muted">Cargando historial de ${esc(U.nm(name))}…</p>`;
  D.historyOfPerson(name).then((ev) => {
    const byTok = {}; ev.forEach((r) => (byTok[r.tok] = byTok[r.tok] || []).push(r));
    const cur = new Set(B.person(name).items.map((i) => i.tok));
    const HH = [...new Set([...cur, ...Object.keys(byTok)])].map((tok) => ({ tok, it: D.byTok.get(tok), actual: cur.has(tok), ev: byTok[tok] || [] })).filter((x) => x.it).sort((a, b) => b.actual - a.actual || a.it.n - b.it.n);
    const line = (x) => { const lines = x.ev.map((r) => (r.despues === name ? `Lo recibió el ${B.fdt(r.at)}${r.antes ? " de " + U.nm(r.antes) : ""} · registró ${r.by}` : `Salió el ${B.fdt(r.at)} hacia ${U.nm(r.despues || SIN)} · registró ${r.by}`)); if (x.actual && !x.ev.some((r) => r.despues === name)) lines.unshift("En su resguardo desde la carga inicial del inventario"); return `<li class="${x.actual ? "" : "ex"}" data-t="${x.tok}" style="cursor:pointer"><b>${esc(x.it.mb)} · ${esc(U.txt(x.it.ds))}</b>${lines.map((t) => `<small>${esc(t)}</small>`).join("")}${x.actual ? "" : `<small>Ahora lo tiene ${esc(U.nm(x.it.rc))}</small>`}</li>`; };
    const now = HH.filter((x) => x.actual), past = HH.filter((x) => !x.actual);
    host.innerHTML = `<div class="grid g2"><section class="pnl"><div class="pnl-h"><h2>Lo que tiene ahora · ${B.int(now.length)}</h2></div><ul class="tl">${now.slice(0, 400).map(line).join("")}</ul>${now.length > 400 ? `<p class="muted">Y ${B.int(now.length - 400)} más.</p>` : ""}</section><section class="pnl"><div class="pnl-h"><h2>Lo que tuvo antes · ${B.int(past.length)}</h2></div>${past.length ? `<ul class="tl">${past.map(line).join("")}</ul>` : U.empty("clock", "Nada que haya salido de su resguardo", "Cuando un artículo se traslada a otra persona aparece aquí.")}</section></div>`;
    host.onclick = (e) => { const li = e.target.closest("[data-t]"); if (li) S.openItem(li.dataset.t); };
  }).catch((e) => { host.innerHTML = U.empty("help", "No se pudo cargar el historial", D.errMsg(e)); });
  return {};
}
function resTab(name, host) {
  const draw = () => {
    const p = B.person(name); host.innerHTML = `<div class="grid g2"><section class="pnl"><div class="pnl-h"><h2>Estado de la revisión</h2></div><div id="d1"></div></section><section class="pnl"><div class="pnl-h"><h2>Estado físico</h2></div><div id="d2"></div></section><section class="pnl"><div class="pnl-h"><h2>Por área</h2></div><div id="b1"></div></section><section class="pnl"><div class="pnl-h"><h2>Los de mayor valor</h2></div><div id="b2"></div></section></div>`;
    $("#d1", host).appendChild(U.donut([{ label: "Presentes", value: p.si, color: "var(--ok)" }, { label: "No están", value: p.no, color: "var(--red)" }, { label: "Pendientes", value: p.pend, color: "var(--s-none)" }], { center: p.pct + "%", sub: "revisado" }));
    $("#d2", host).appendChild(U.donut([{ label: "Bueno", value: p.si - p.reg - p.mal, color: "var(--ok)" }, { label: "Regular", value: p.reg, color: "var(--s-warn)" }, { label: "Malo", value: p.mal, color: "var(--red)" }, { label: "Sin revisar", value: p.pend + p.no, color: "var(--s-none)" }], { center: B.int(p.si), sub: "presentes" }));
    $("#b1", host).appendChild(U.hbars(B.groupBy(p.items, (x) => x.ar || "(Sin área)").slice(0, 10).map((g) => ({ label: U.txt(g.key), value: g.n, sub: B.money(g.val), q: g.key })), { onClick: (d) => U.go(qLink('area:"' + d.q + '" res:"' + name + '"')) }));
    $("#b2", host).appendChild(U.hbars(p.items.slice().sort((a, b) => b.im - a.im).slice(0, 8).map((it) => ({ label: it.mb + " · " + U.txt(it.ds), value: it.im, tok: it.tok })), { fmt: (v) => B.money(v, 0), onClick: (d) => S.openItem(d.tok), cls: "gold" }));
    U.anim(host);
  };
  draw(); return { update: U.debounce(draw, 300) };
}

/* ================= ÁREAS ================= */
U.route("areas", () => {
  const el = h(`<div></div>`); let q = "";
  const draw = () => {
    const g = B.groupBy(D.items, (it) => it.ar || "(Sin área)"); const av = new Set(B.areaVariants().flatMap((x) => x.names.map((n) => n.name)));
    el.innerHTML = head("Áreas", `${B.int(g.length)} áreas. En el mapa, el tamaño es la cantidad de artículos y el color, su valor promedio. Toca un área para ver sus artículos.`) + `<div class="tmap" id="tm" role="list"></div><div class="tmap-k"><span>Valor promedio por artículo: menor</span><i></i><span>mayor</span></div><div class="tools" style="margin-top:18px"><label class="sbox">${icon("search")}<input type="search" id="aq" placeholder="Buscar un área" value="${esc(q)}"></label></div><div class="pnl" id="al"></div>`;
    const tm = $("#tm", el); const W = tm.clientWidth || 900, H = tm.clientHeight || 420;
    const top = g.slice(0, 60); const rest = g.slice(60); const data = top.map((x) => ({ g: x, v: x.n }));
    if (rest.length) data.push({ g: { key: `Otras ${rest.length} áreas`, n: rest.reduce((s, x) => s + x.n, 0), val: rest.reduce((s, x) => s + x.val, 0), other: true }, v: rest.reduce((s, x) => s + x.n, 0) });
    const vmax = Math.max(...data.map((d) => d.g.val / d.g.n));
    U.squarify(data, 0, 0, W, H).forEach((r, i) => { const k = Math.sqrt((r.g.val / r.g.n) / vmax); const col = `color-mix(in srgb, #7FE0B8 ${Math.round(12 + k * 70)}%, #00281F)`; const b = h(`<button type="button" role="listitem" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;background:${col};animation-delay:${i * 12}ms" data-tip="${esc(`<b>${esc(U.txt(r.g.key))}</b><br>${B.plural(r.g.n, "artículo")}<br>${B.money(r.g.val)}`)}">${r.w > 84 && r.h > 34 ? `<b>${esc(U.txt(r.g.key))}</b>` : ""}${r.w > 44 && r.h > (r.w > 84 ? 54 : 26) ? `<small>${B.int(r.g.n)}</small>` : ""}</button>`); b.onclick = () => { if (!r.g.other) U.go(qLink('area:"' + r.g.key + '"')); }; tm.appendChild(b); });
    const list = () => { const qq = B.norm(q); const rows = g.filter((x) => !qq || B.norm(x.key).includes(qq)); $("#al", el).innerHTML = `<div class="hb" style="gap:0">${rows.map((x) => `<a class="hb-r" href="${qLink('area:"' + x.key + '"')}" style="text-decoration:none;color:inherit;grid-template-columns:minmax(0,1fr) 120px 140px 90px"><span class="hb-l">${esc(U.txt(x.key))}${av.has(x.key) ? ` <span class="flag" data-tip="Parece la misma área que otra escrita diferente">${icon("map")}variante</span>` : ""}</span><span class="tnum muted" style="text-align:right">${B.plural(new Set(x.items.map((i) => i.rc)).size, "persona")}</span><b class="hb-v">${B.money(x.val, 0)}</b><b class="hb-v">${B.int(x.n)}</b></a>`).join("")}</div>`; };
    list(); $("#aq", el).addEventListener("input", (e) => { q = e.target.value; list(); });
  };
  return { el, title: "Áreas", after: draw, update: U.debounce(draw, 400), retheme: draw };
});

/* ================= EN VIVO ================= */
U.route("vivo", () => {
  const el = h(`<div></div>`); let seen = new Set(B.feed(200).map((x) => x.k + x.name + (x.tok || "") + x.at)); let fins = new Set(B.people().filter((p) => p.fin).map((p) => p.name));
  D.setPace("live");
  const draw = (fresh = new Set()) => {
    const t = B.totals(), ppl = B.people().filter((p) => p.name !== SIN);
    const curso = ppl.filter((p) => p.status === "curso").sort((a, b) => b.lastAt - a.lastAt), fin = ppl.filter((p) => p.status === "fin").sort((a, b) => (b.fin.at || 0) - (a.fin.at || 0)), nada = ppl.filter((p) => p.status === "nada");
    const feed = B.feed(40);
    el.innerHTML = head("Revisión en vivo", "Lo que se marca con la app aparece aquí solo, cada 10 segundos.", `<span class="live-h"><i></i>En vivo</span>`) +
      `<section class="overall">${U.ring(t.pct, { size: 120, sw: 11, label: t.pct + "%" })}<div><h2>Avance de la revisión de inventario</h2><p>${t.rev ? `Van ${B.int(t.rev)} de ${B.int(t.items)} artículos revisados.` : "Todavía no empieza ninguna revisión. Abre la app de celular y escanea los marbetes."}</p><div class="ov-n"><div><b data-count="${t.si}">0</b><small>Presentes</small></div><div><b data-count="${t.no}">0</b><small>No están</small></div><div><b data-count="${t.fin}">0</b><small>Resguardos terminados</small></div><div><b data-count="${t.started}">0</b><small>En revisión</small></div></div></div></section>
      <div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);align-items:start" id="lvg"><div class="grid">
      ${curso.length ? `<section><div class="pnl-h"><h2>En revisión ahora · ${curso.length}</h2></div><div class="lv-grid">${curso.map((p) => `<a class="lv" href="#/resguardante/${encodeURIComponent(p.name)}?t=revision"><div class="lv-t">${U.avatar(p.name)}<div><b>${esc(U.nm(p.name))}</b><small>${esc(B.ago(p.lastAt))}</small></div>${U.ring(p.pct, { size: 44, sw: 5, label: p.pct })}</div><div class="bigbar"><i class="si" data-w="${(p.si / p.total) * 100}"></i><i class="no" data-w="${(p.no / p.total) * 100}"></i></div><div class="lv-n"><span><b>${B.int(p.si)}</b> presentes</span><span><b>${B.int(p.no)}</b> no están</span><span><b>${B.int(p.pend)}</b> pendientes</span></div></a>`).join("")}</div></section>` : ""}
      ${fin.length ? `<section><div class="pnl-h"><h2>Terminados · ${fin.length}</h2></div><div class="lv-grid">${fin.map((p) => `<a class="lv" href="#/resguardante/${encodeURIComponent(p.name)}"><div class="lv-t">${U.avatar(p.name)}<div><b>${esc(U.nm(p.name))}</b><small>Terminó ${esc(B.ago(p.fin.at || p.fin.t))}</small></div><span class="stamp si">Inventariado</span></div><div class="lv-n"><span><b>${B.int(p.si)}</b> presentes</span><span><b>${B.int(p.no)}</b> no están</span><span><b>${B.int(p.pend)}</b> sin revisar</span></div></a>`).join("")}</div></section>` : ""}
      <section class="pnl"><div class="pnl-h"><h2>Sin empezar · ${nada.length}</h2><p>Toca un nombre para ver su resguardo.</p></div><div style="display:flex;gap:6px;flex-wrap:wrap">${nada.map((p) => `<a class="chip" href="#/resguardante/${encodeURIComponent(p.name)}">${esc(U.nm(p.name))} <span class="muted">${B.int(p.total)}</span></a>`).join("")}</div></section></div>
      <section class="pnl" style="position:sticky;top:84px"><div class="pnl-h"><h2>Lo último que se marcó</h2></div><ul class="feed">${feed.map((x) => { const key = x.k + x.name + (x.tok || "") + x.at; const cls = fresh.has(key) ? "new" : ""; if (x.k === "fin") return `<li class="${cls}"><span class="dot fin"></span><div class="tx"><b>${esc(U.nm(x.name))} terminó</b><small>${esc(x.by || "")}</small></div><time>${esc(B.ago(x.at))}</time></li>`; if (x.k === "extra") return `<li class="${cls}"><span class="dot ex"></span><div class="tx"><b>Extra: ${esc(x.tok.replace(/^m/, ""))}</b><small>${esc(U.nm(x.name))}${x.n ? " · " + esc(x.n) : ""}</small></div><time>${esc(B.ago(x.at))}</time></li>`; return `<li class="${cls}" data-t="${x.tok}" style="cursor:pointer"><span class="dot ${x.e}"></span><div class="tx"><b>${esc(x.it ? x.it.mb + " · " + U.txt(x.it.ds) : x.tok)}</b><small>${esc(U.nm(x.name))} · ${x.e === "si" ? "presente" + (x.c && x.c !== "B" ? " · " + CND[x.c].toLowerCase() : "") : "no está"} · ${esc(x.by || "")}</small></div><time>${esc(B.ago(x.at))}</time></li>`; }).join("") || `<li>${U.empty("pulse", "Esperando la primera marca", "Cuando alguien marque un artículo con la app, aparecerá aquí.")}</li>`}</ul></section></div>`;
    $(".feed", el)?.addEventListener("click", (e) => { const li = e.target.closest("[data-t]"); if (li && D.byTok.get(li.dataset.t)) S.openItem(li.dataset.t); });
    if (innerWidth < 900) $("#lvg", el).style.gridTemplateColumns = "minmax(0,1fr)";
    U.anim(el);
  };
  const tickT = setInterval(() => { $$(".feed time", el).forEach(() => {}); }, 30000);
  return {
    el, title: "En vivo", after: () => draw(),
    update() {
      const feed = B.feed(200); const fresh = new Set();
      for (const x of feed) { const k = x.k + x.name + (x.tok || "") + x.at; if (!seen.has(k)) { fresh.add(k); seen.add(k); } }
      const nowFin = B.people().filter((p) => p.fin).map((p) => p.name); const newFin = nowFin.filter((n) => !fins.has(n)); fins = new Set(nowFin);
      draw(fresh);
      if (newFin.length) { celebrate(newFin[0]); U.toast(`${U.nm(newFin[0])} terminó su inventario.`, { kind: "ok" }); }
      else if (fresh.size) FX.play("soft");
    },
    destroy() { D.setPace("normal"); clearInterval(tickT); },
  };
});

/* ================= ANÁLISIS ================= */
U.route("analisis", () => {
  const el = h(`<div></div>`);
  const draw = () => {
    const t = B.totals(); const yr = new Date().getFullYear();
    el.innerHTML = head("Análisis", `${B.int(t.items)} artículos con un valor original de ${B.money(t.val)}. Toca cualquier barra para ver esos artículos.`, `<button class="btn" type="button" id="aX">${icon("sheet")}<span>Excel con resúmenes</span></button>`) +
      `<div class="grid g2"><section class="pnl"><div class="pnl-h"><div><h2>Valor por área</h2><p>Las 12 áreas con más valor.</p></div></div><div id="c1"></div></section>
      <section class="pnl"><div class="pnl-h"><div><h2>Artículos por año de compra</h2><p>Según la fecha de factura.</p></div></div><div id="c2"></div></section>
      <section class="pnl"><div class="pnl-h"><div><h2>Estado de la revisión</h2></div></div><div id="c7"></div></section>
      <section class="pnl"><div class="pnl-h"><div><h2>Estado físico</h2><p>De lo que ya se revisó y está presente.</p></div></div><div id="c8"></div></section>
      <section class="pnl"><div class="pnl-h"><div><h2>Valor por cuenta contable</h2></div></div><div id="c3"></div></section>
      <section class="pnl"><div class="pnl-h"><div><h2>Resguardantes con más valor</h2></div></div><div id="c6"></div></section>
      <section class="pnl"><div class="pnl-h"><div><h2>Proveedores principales</h2><p>Por valor comprado.</p></div></div><div id="c4"></div></section>
      <section class="pnl"><div class="pnl-h"><div><h2>Marcas más comunes</h2><p>Sin contar S/M ni vacías.</p></div></div><div id="c5"></div></section>
      <section class="pnl span2"><div class="pnl-h"><div><h2>Actividad de los últimos seis meses</h2><p>Cambios en la bitácora y artículos revisados por día.</p></div></div><div id="c9"><p class="muted">Cargando…</p></div></section></div>`;
    const g = (k) => B.groupBy(D.items, k);
    $("#c1", el).appendChild(U.hbars(g((x) => x.ar || "(Sin área)").sort((a, b) => b.val - a.val).slice(0, 12).map((x) => ({ label: U.txt(x.key), value: x.val, sub: B.plural(x.n, "artículo"), q: x.key })), { fmt: B.moneyShort, onClick: (d) => U.go(qLink('area:"' + d.q + '"')) }));
    const ys = {}; for (const it of D.items) if (it.y) ys[it.y] = (ys[it.y] || 0) + 1; const y0 = Math.min(...Object.keys(ys).map(Number), yr);
    $("#c2", el).appendChild(U.columns(Array.from({ length: yr - y0 + 1 }, (_, i) => ({ label: String(y0 + i), value: ys[y0 + i] || 0 })), { onClick: (d) => d.value && U.go(qLink("año:" + d.label)), every: Math.ceil((yr - y0 + 1) / 10) }));
    $("#c7", el).appendChild(U.donut([{ label: "Presentes", value: t.si, color: "var(--ok)", q: "presentes" }, { label: "No están", value: t.no, color: "var(--red)", q: "faltantes" }, { label: "Pendientes", value: t.pend, color: "var(--s-none)", q: "pendientes" }], { center: t.pct + "%", sub: "revisado", onClick: (p) => U.go(qLink(p.q)) }));
    $("#c8", el).appendChild(U.donut([{ label: "Bueno", value: t.si - t.reg - t.mal, color: "var(--ok)", q: "buen estado" }, { label: "Regular", value: t.reg, color: "var(--s-warn)", q: "estado regular" }, { label: "Malo", value: t.mal, color: "var(--red)", q: "mal estado" }], { center: B.int(t.si), sub: "presentes", onClick: (p) => U.go(qLink(p.q)) }));
    $("#c3", el).appendChild(U.hbars(g((x) => x.cu || "(Sin cuenta)").sort((a, b) => b.val - a.val).slice(0, 12).map((x) => ({ label: x.key, value: x.val, sub: B.plural(x.n, "artículo"), q: x.key })), { fmt: B.moneyShort, onClick: (d) => U.go(qLink('cuenta:"' + d.q + '"')) }));
    $("#c6", el).appendChild(U.hbars(B.people().filter((p) => p.name !== SIN).sort((a, b) => b.val - a.val).slice(0, 10).map((p) => ({ label: U.nm(p.name), value: p.val, sub: B.plural(p.total, "artículo"), go: p.name })), { fmt: B.moneyShort, onClick: (d) => U.go("#/resguardante/" + encodeURIComponent(d.go)) }));
    $("#c4", el).appendChild(U.hbars(g((x) => x.pr || "(Sin proveedor)").sort((a, b) => b.val - a.val).slice(0, 10).map((x) => ({ label: U.txt(x.key), value: x.val, sub: B.plural(x.n, "artículo"), q: x.key })), { fmt: B.moneyShort, onClick: (d) => U.go(qLink('proveedor:"' + d.q + '"')) }));
    $("#c5", el).appendChild(U.hbars(B.groupBy(D.items.filter((x) => !B.blank(x.ma)), (x) => x.ma.toUpperCase()).slice(0, 10).map((x) => ({ label: x.key, value: x.n, sub: B.money(x.val, 0), q: x.key })), { onClick: (d) => U.go(qLink('marca:"' + d.q + '"')) }));
    const take = (id, txt) => { const hst = $(id, el); if (hst && txt) hst.insertAdjacentHTML("beforeend", `<p class="take">${icon("spark")}<span>${esc(txt)}</span></p>`); };
    const byAr = g((x) => x.ar || "(Sin área)").sort((a, b) => b.val - a.val); if (byAr[0]) take("#c1", `${U.txt(byAr[0].key)} concentra el ${B.pct(byAr[0].val, t.val)}% del valor de todo el inventario.`);
    const yBest = Object.entries(ys).sort((a, b) => b[1] - a[1])[0]; const old = D.items.filter((x) => x.y && yr - x.y >= 15).length; if (yBest) take("#c2", `El año con más compras fue ${yBest[0]} (${B.plural(yBest[1], "artículo")}). El ${B.pct(old, t.items)}% del inventario tiene 15 años o más.`);
    const byCu = g((x) => x.cu || "(Sin cuenta)").sort((a, b) => b.val - a.val); if (byCu[0]) take("#c3", `La cuenta ${byCu[0].key} reúne el ${B.pct(byCu[0].val, t.val)}% del valor.`);
    const top5 = B.people().filter((p) => p.name !== SIN).sort((a, b) => b.val - a.val).slice(0, 5); take("#c6", `Los 5 resguardantes con más valor tienen el ${B.pct(top5.reduce((s, p) => s + p.val, 0), t.val)}% del total.`);
    const byPr = g((x) => x.pr || "(Sin proveedor)").sort((a, b) => b.val - a.val); if (byPr[0]) take("#c4", `${U.txt(byPr[0].key)} es el proveedor con más valor: ${B.money(byPr[0].val, 0)} en ${B.plural(byPr[0].n, "artículo")}.`);
    if (t.rev) take("#c7", `${B.pct(t.no, t.rev)}% de lo revisado no se encontró (${B.money(t.valNo, 0)}).`);
    D.loadCambios().then(() => {
      const days = {}; const add = (t2, n = 1) => { const k = new Date(t2); k.setHours(0, 0, 0, 0); const s = new Date(k.getTime() - k.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); days[s] = (days[s] || 0) + n; };
      for (const c of D.cambios || []) add(c.at, (c.diffs || []).length);
      for (const d of Object.values(D.marcas)) for (const m of Object.values(d?.marks || {})) if (m?.at) add(m.at);
      const host = $("#c9", el); if (!host) return; host.innerHTML = ""; host.appendChild(U.heat(days));
    }).catch(() => { const host = $("#c9", el); if (host) host.innerHTML = '<p class="muted">No se pudo cargar la bitácora.</p>'; });
    $("#aX", el).onclick = (e) => busyBtn(e.currentTarget, () => S.exportAll());
    U.anim(el);
  };
  return { el, title: "Análisis", after: draw, update: U.debounce(draw, 500) };
});

/* ================= SALUD DE LOS DATOS ================= */
U.route("salud", (r) => {
  const el = h(`<div></div>`); const ver = r.q.ver || "";
  const draw = () => {
    const hl = B.health(), nv = B.nameVariants(), av = B.areaVariants(), dg = B.dupGroups(), np = B.notPeople();
    el.innerHTML = head("Salud de los datos", "Qué tan completos y consistentes están los datos del inventario, y herramientas para arreglarlos.") +
      `<section class="pnl" style="margin-bottom:18px"><div class="health">${U.ring(hl.score, { size: 150, sw: 13, label: hl.score, cls: hl.score < 70 ? "warn" : "done" })}<div><h2 style="font-size:20px">${hl.score >= 85 ? "Los datos están en muy buen estado" : hl.score >= 70 ? "Los datos están bien, con detalles por pulir" : "Hay datos que conviene completar"}</h2><p class="muted" style="margin:4px 0 12px">80% del puntaje es qué tan completos están los campos y 20% la consistencia (nombres, áreas y series sin duplicar).</p>${hl.fields.map((f) => `<div class="fbar"><span>${esc(f.label)}</span><span class="hb-t"><i style="width:0;${f.pct < 0.5 ? "background:var(--gold)" : ""}" data-w="${Math.max(1, f.pct * 100)}"></i></span>${f.miss ? `<button type="button" data-fix="${f.k}">${B.int(f.miss)} ${esc(f.q)}</button>` : `<small>Completo</small>`}</div>`).join("")}</div></div></section>
      <div class="grid g2">
      <section class="pnl" id="s-nombres"><div class="pnl-h"><div><h2>Nombres que parecen la misma persona · ${nv.length}</h2><p>Elige el nombre correcto y unifica. Los artículos se trasladan al nombre elegido y queda en la bitácora.</p></div></div><div class="var-l">${nv.map((g, i) => `<div class="var" data-g="${i}"><div class="var-h"><b>${esc(cap(g.reasons.join(" · ")))}</b><small>${B.plural(g.total, "artículo")}</small></div><ul>${g.names.map((x, j) => `<li><label><input type="radio" name="nv${i}" value="${esc(x.name)}" ${j === 0 ? "checked" : ""}><span>${esc(x.name)}</span><small>${B.int(x.n)}</small></label></li>`).join("")}</ul><div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn sm pri" type="button" data-un="rc" data-i="${i}">${icon("people")}<span>Unificar en el elegido</span></button></div></div>`).join("") || U.empty("check", "Sin nombres repetidos", "")}</div></section>
      <section class="pnl" id="s-areas"><div class="pnl-h"><div><h2>Áreas escritas de varias formas · ${av.length}</h2><p>Por ejemplo AULA D2, AULAD2 y EDIFICIO D-AULA 2.</p></div></div><div class="var-l">${av.map((g, i) => `<div class="var"><div class="var-h"><b>${esc(g.names[0].name)}</b><small>${B.plural(g.total, "artículo")}</small></div><ul>${g.names.map((x, j) => `<li><label><input type="radio" name="av${i}" value="${esc(x.name)}" ${j === 0 ? "checked" : ""}><span>${esc(x.name)}</span><small>${B.int(x.n)}</small></label></li>`).join("")}</ul><div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn sm pri" type="button" data-un="ar" data-i="${i}">${icon("map")}<span>Unificar en el elegido</span></button></div></div>`).join("") || U.empty("check", "Sin áreas repetidas", "")}</div></section>
      <section class="pnl"><div class="pnl-h"><div><h2>Números de serie repetidos · ${dg.length}</h2><p>Una serie debería ser única. Puede ser un error de captura.</p></div></div><div class="hb">${dg.slice(0, 20).map((g) => `<a class="hb-r" href="${qLink('serie:"' + g.serie + '"')}" style="text-decoration:none;color:inherit;grid-template-columns:minmax(0,1fr) auto"><span class="hb-l"><b>${esc(g.serie)}</b> · ${esc(U.txt(g.items[0].ds))}</span><b class="hb-v">${g.items.length} marbetes</b></a>`).join("") || U.empty("check", "Sin series repetidas", "")}</div></section>
      <section class="pnl"><div class="pnl-h"><div><h2>Resguardantes que no parecen persona · ${np.length}</h2><p>Nombres con ubicación, palabras como BAJA o LOCALIZAR, o un solo nombre.</p></div></div><div class="hb">${np.map((x) => `<a class="hb-r" href="#/resguardante/${encodeURIComponent(x.name)}" style="text-decoration:none;color:inherit;grid-template-columns:minmax(0,1fr) auto"><span class="hb-l">${esc(x.name)}</span><b class="hb-v">${B.int(x.n)}</b></a>`).join("") || U.empty("check", "Todo en orden", "")}</div></section>
      </div>`;
    el.onclick = async (e) => {
      const fx = e.target.closest("[data-fix]"); if (fx) return quickFix(fx.dataset.fix);
      const un = e.target.closest("[data-un]"); if (!un) return;
      const k = un.dataset.un, i = +un.dataset.i, g = (k === "rc" ? nv : av)[i]; const target = $(`input[name="${k === "rc" ? "nv" : "av"}${i}"]:checked`, el).value;
      const campo = k === "rc" ? D.hRC : D.inv.h[D.K.AR]; const others = g.names.filter((x) => x.name !== target);
      if (!(await U.confirm("¿Unificar?", `${B.plural(others.reduce((s, x) => s + x.n, 0), "artículo")} de ${others.map((x) => "«" + x.name + "»").join(", ")} pasarán a «${target}». Podrás deshacerlo justo después.`, "Unificar"))) return;
      await busyBtn(un, async () => { try { const res = await D.unify(campo, g.names.map((x) => x.name), target); FX.hit("done"); FX.confetti({ n: 80, power: 6 }); U.toast(`Listo: ${B.plural(res.items || 0, "artículo")} unificados.`, { kind: "ok", action: { label: "Deshacer", fn: () => S.undo(res.undo) } }); } catch (e2) { U.fail(e2); } });
    };
    U.anim(el);
    if (ver) setTimeout(() => $("#s-" + ver, el)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };
  return { el, title: "Salud de los datos", after: draw, update: U.debounce(draw, 500) };
});
/* corrección rápida: un artículo a la vez, Enter guarda y pasa al siguiente */
function quickFix(k) {
  const map = { ma: D.K.MA, mo: D.K.MO, se: D.K.SE, ar: D.K.AR, im: D.K.IM, rc: D.K.RC, ds: D.K.DS };
  const j = map[k]; if (j === undefined || j < 0) return; const campo = D.inv.h[j];
  const test = { ma: (it) => B.blank(it.ma), mo: (it) => B.blank(it.mo), se: (it) => B.blank(it.se), ar: (it) => !it.ar, im: (it) => !it.im, rc: (it) => it.rc === SIN, ds: (it) => B.blank(it.ds) }[k];
  const queue = D.items.filter(test); let i = 0, done = 0;
  const body = h(`<div class="fix"><div class="fix-p"><i></i></div><div class="fx-c"></div></div>`);
  const show = () => {
    const it = queue[i]; $(".fix-p i", body).style.width = (i / queue.length) * 100 + "%";
    if (!it) { $(".fx-c", body).innerHTML = U.empty("check", "Terminaste", `Corregiste ${B.plural(done, "artículo")}.`); FX.hit("done"); return; }
    $(".fx-c", body).innerHTML = `<p class="muted">${B.int(i + 1)} de ${B.int(queue.length)} sin ${esc(campo.toLowerCase())}</p><div class="mbn">${esc(it.mb)}</div><b style="font-size:17px">${esc(U.txt(it.ds))}</b><p class="muted">${esc(U.nm(it.rc))} · ${esc(U.txt(it.ar))}${it.ma && !B.blank(it.ma) ? " · " + esc(it.ma) : ""}${it.mo && !B.blank(it.mo) ? " · " + esc(it.mo) : ""}</p><label class="fld" id="fxF" data-own-enter><span>${esc(B.smart(campo))}</span><input autocomplete="off" value="${esc(D.cell(it, campo))}" ${k === "rc" ? 'list="dlRcFx"' : k === "ar" ? 'list="dlArFx"' : ""}></label><datalist id="dlRcFx">${B.names().map((n) => `<option value="${esc(n)}">`).join("")}</datalist><datalist id="dlArFx">${B.areaNames().map((n) => `<option value="${esc(n)}">`).join("")}</datalist><div style="display:flex;gap:8px;justify-content:space-between"><button type="button" class="btn ghost" data-skip>Saltar</button><button type="button" class="btn pri" data-save>${icon("check")}<span>Guardar y seguir</span></button></div><p class="muted" style="font-size:12.5px">${U.kbd("Enter")} guarda y pasa al siguiente.</p>`;
    const inp = $("input", body); setTimeout(() => { inp.focus(); inp.select(); }, 30);
    const save = async () => { const v = inp.value.trim(); if (!v) { i++; show(); return; } try { await D.applyChanges({ [it.tok]: { [campo]: k === "rc" || k === "ar" ? v.toUpperCase() : v } }, k === "rc" ? "traslado" : "edicion", "Corrección rápida"); done++; FX.play("ok"); } catch (e) { U.fail(e); return; } i++; show(); };
    inp.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); save(); } };
    $("[data-save]", body).onclick = save; $("[data-skip]", body).onclick = () => { i++; show(); };
  };
  show();
  U.modal({ title: "Corrección rápida: " + B.smart(campo), body, wide: false, actions: [{ label: "Terminar", kind: "ghost", value: "" }] });
}

/* ================= ETIQUETAS QR ================= */
U.route("etiquetas", (r) => {
  const el = h(`<div></div>`);
  const st = { src: r.q.src === "sel" && window.__labelSel?.length ? "sel" : "all", rc: r.q.n || "", ar: "", a: 1, b: 0, list: "", page: 0 };
  const maxN = Math.max(0, ...D.items.map((x) => x.n)); st.b = maxN;
  const pick = () => {
    if (st.src === "sel") return (window.__labelSel || []).map((t) => D.byTok.get(t)).filter(Boolean).sort((a, b) => a.n - b.n);
    if (st.src === "rc") return (B.peopleMap().get(st.rc) || []).slice();
    if (st.src === "ar") return (B.areasMap().get(st.ar) || []).slice();
    if (st.src === "rng") return D.items.filter((x) => x.n >= st.a && x.n <= st.b);
    if (st.src === "lst") { const codes = st.list.split(/[\s,;]+/).filter(Boolean); return codes.map((c) => B.findMb(c)).filter(Boolean); }
    return D.items.slice();
  };
  el.innerHTML = head("Etiquetas QR", "Las mismas etiquetas de siempre: logo arriba, QR al centro y marbete abajo. Cada QR abre la ficha del artículo.") +
    `<div class="lbl-grid"><aside class="lbl-opts"><section class="pnl"><div class="pnl-h"><h2>¿Qué etiquetas?</h2></div><div class="src-l" id="src">
      <label><input type="radio" name="src" value="all"><div><b>Todo el inventario</b><small>${B.plural(D.items.length, "etiqueta")}</small></div></label>
      ${window.__labelSel?.length ? `<label><input type="radio" name="src" value="sel"><div><b>${r.q.n ? "Resguardo de " + esc(U.nm(r.q.n)) : "Lo que elegiste en la lista"}</b><small>${B.plural(window.__labelSel.length, "etiqueta")}</small></div></label>` : ""}
      <label><input type="radio" name="src" value="rc"><div><b>Un resguardante</b><select class="inp sub" id="sRc">${B.names().map((n) => `<option value="${esc(n)}" ${n === st.rc ? "selected" : ""}>${esc(U.nm(n))}</option>`).join("")}</select></div></label>
      <label><input type="radio" name="src" value="ar"><div><b>Un área</b><select class="inp sub" id="sAr">${B.areaNames().map((n) => `<option value="${esc(n)}">${esc(U.txt(n))}</option>`).join("")}</select></div></label>
      <label><input type="radio" name="src" value="rng"><div><b>Por número (No.)</b><small>Útil para imprimir solo lo nuevo</small><div class="sub" style="display:flex;gap:6px;align-items:center"><input class="inp" type="number" id="sA" min="1" value="1" style="width:90px"> a <input class="inp" type="number" id="sB" min="1" value="${maxN}" style="width:90px"></div></div></label>
      <label><input type="radio" name="src" value="lst"><div><b>Lista de marbetes</b><small>Pega o escribe los números separados por espacios</small><textarea class="inp sub" id="sL" rows="3" placeholder="735293 736085 …"></textarea></div></label>
    </div></section>
    <section class="pnl"><div class="pnl-h"><h2>Tamaño</h2></div><div class="seg" id="sz">${[[40, "4 cm"], [50, "5 cm"], [65, "6.5 cm"]].map(([v, l]) => `<button type="button" data-v="${v}">${l}</button>`).join("")}</div><p class="muted" id="sInfo" style="margin-top:12px"></p>
      <div style="display:grid;gap:8px;margin-top:14px"><button class="btn pri" type="button" id="gPdf">${icon("file")}<span>Descargar PDF para imprimir</span></button><button class="btn" type="button" id="gOne">${icon("print")}<span>PDF solo de esta hoja</span></button><button class="btn" type="button" id="gZip">${icon("image")}<span>Imágenes PNG en ZIP</span></button><div class="prog" id="gProg" hidden><i></i></div><small class="muted" id="gSt"></small></div></section></aside>
    <section><div class="pager" id="pg"></div><div class="paper" id="paper"></div><p class="muted" id="pNote" style="text-align:center;margin-top:12px"></p></section></div>`;
  $(`input[name=src][value="${st.src}"]`, el).checked = true;
  const draw = async () => {
    const list = pick(); const g = F.layout(U.set.label || 50); const pages = Math.max(1, Math.ceil(list.length / g.per)); st.page = Math.min(st.page, pages - 1);
    $$("#sz button", el).forEach((b) => b.classList.toggle("on", +b.dataset.v === (U.set.label || 50)));
    $("#sInfo", el).textContent = `${B.plural(list.length, "etiqueta")} · ${B.plural(pages, "hoja")} carta · ${g.per} por hoja`;
    $("#pg", el).innerHTML = `<button class="btn sm" type="button" data-p="-1" ${st.page ? "" : "disabled"}>${icon("left")}<span>Anterior</span></button><label>Hoja <input type="number" min="1" max="${pages}" value="${st.page + 1}" id="pgN"> de ${B.int(pages)}</label><button class="btn sm" type="button" data-p="1" ${st.page < pages - 1 ? "" : "disabled"}><span>Siguiente</span>${icon("right")}</button>`;
    const paper = $("#paper", el); paper.style.setProperty("--cols", g.cols); paper.innerHTML = "";
    await F.logoReady();
    const slice = list.slice(st.page * g.per, st.page * g.per + g.per);
    slice.forEach((it, i) => { const c = h(`<div class="c" style="--i:${i}"><canvas></canvas><div class="d">${esc(it.ds)}</div></div>`); F.drawLabel($("canvas", c), 300, it); c.onclick = () => S.openItem(it.tok); c.style.cursor = "pointer"; paper.appendChild(c); });
    if (!slice.length) paper.innerHTML = `<div style="grid-column:1/-1">${U.empty("tag", "No hay etiquetas con esta selección", "")}</div>`;
    $("#pNote", el).textContent = slice.length ? `Hoja ${st.page + 1}: artículos No. ${slice[0].n} al ${slice[slice.length - 1].n}. El No. de cada etiqueta coincide con la lista.` : "";
    $("#gPdf", el).disabled = $("#gZip", el).disabled = $("#gOne", el).disabled = !list.length;
  };
  const run = async (btn, kind) => {
    const all = pick(), g = F.layout(U.set.label || 50); const list = kind === "one" ? all.slice(st.page * g.per, st.page * g.per + g.per) : all;
    if (!list.length) return; const pr = $("#gProg", el), sti = $("#gSt", el); pr.hidden = false; const set = (i, n) => { $("i", pr).style.width = (i / n) * 100 + "%"; sti.textContent = `Generando ${B.int(i + 1)} de ${B.int(n)}…`; };
    await busyBtn(btn, async () => {
      try {
        await F.logoReady();
        if (kind === "zip") F.save("qr_conalep.zip", await F.zipLabels(list, set));
        else F.save(kind === "one" ? `etiquetas_qr_hoja_${st.page + 1}.pdf` : `etiquetas_qr_${F.stamp()}.pdf`, await F.pdfLabels(list, U.set.label || 50, set));
        $("i", pr).style.width = "100%"; sti.textContent = kind === "zip" ? `ZIP listo: ${B.plural(list.length, "imagen", "imágenes")}.` : `PDF listo: ${B.plural(list.length, "etiqueta")}.`; FX.hit("done");
      } catch (e) { sti.textContent = D.errMsg(e); U.fail(e); }
    });
    setTimeout(() => (pr.hidden = true), 1500);
  };
  el.addEventListener("change", (e) => {
    const t = e.target;
    if (t.name === "src") st.src = t.value; else if (t.id === "sRc") { st.rc = t.value; st.src = "rc"; } else if (t.id === "sAr") { st.ar = t.value; st.src = "ar"; } else if (t.id === "sA" || t.id === "sB") { st.a = +$("#sA", el).value || 1; st.b = +$("#sB", el).value || maxN; st.src = "rng"; } else if (t.id === "pgN") st.page = (+t.value || 1) - 1; else return;
    if (t.id !== "pgN") { st.page = 0; const rb = $(`input[name=src][value="${st.src}"]`, el); if (rb) rb.checked = true; }
    draw();
  });
  $("#sL", el).addEventListener("input", U.debounce((e) => { st.list = e.target.value; st.src = "lst"; $(`input[name=src][value="lst"]`, el).checked = true; st.page = 0; draw(); }, 300));
  $("#sz", el).onclick = (e) => { const b = e.target.closest("button"); if (!b) return; U.set.label = +b.dataset.v; U.saveSet(); st.page = 0; FX.play("tap"); draw(); };
  $("#pg", el).onclick = (e) => { const b = e.target.closest("[data-p]"); if (b) { st.page += +b.dataset.p; draw(); } };
  if (!st.rc) st.rc = B.names()[0] || ""; st.ar = B.areaNames()[0] || "";
  $("#gPdf", el).onclick = (e) => run(e.currentTarget, "all"); $("#gOne", el).onclick = (e) => run(e.currentTarget, "one"); $("#gZip", el).onclick = (e) => run(e.currentTarget, "zip");
  return { el, title: "Etiquetas QR", after: draw };
});

/* ================= IMPORTAR EXCEL ================= */
U.route("importar", () => {
  const el = h(`<div></div>`);
  el.innerHTML = head("Importar Excel", "Agrega artículos nuevos o actualiza los que ya existen. Antes de guardar verás exactamente qué va a cambiar.") +
    `<label class="drop" id="drop" for="imF">${icon("upload")}<b>Arrastra aquí tu Excel o tócalo para elegirlo</b><p>Se buscan los artículos por marbete: los que no existen se agregan con su propio número y QR; los que ya existen se actualizan. Nunca se borra nada. Acepta .xlsx, .xls, .csv y respaldos .json.</p><input type="file" id="imF" accept=".xlsx,.xls,.csv,.json,.txt" hidden></label>
    <div id="imOut" style="margin-top:18px"></div>
    <div class="grid g3" style="margin-top:18px"><section class="pnl"><div class="pnl-h"><div><h2>Respaldo</h2><p>Todo el inventario en un archivo, para guardarlo en tu Drive o USB.</p></div></div><button class="btn" type="button" id="bk">${icon("download")}<span>Descargar respaldo</span></button></section>
    <section class="pnl"><div class="pnl-h"><div><h2>Inventario completo en Excel</h2><p>Con hojas de resumen por resguardante y por área.</p></div></div><button class="btn" type="button" id="all">${icon("sheet")}<span>Descargar Excel</span></button></section>
    <section class="pnl"><div class="pnl-h"><div><h2>Plantilla para artículos nuevos</h2><p>Un Excel vacío con las mismas columnas del inventario.</p></div></div><button class="btn" type="button" id="tpl">${icon("file")}<span>Descargar plantilla</span></button></section></div>`;
  const drop = $("#drop", el), out = $("#imOut", el);
  const handle = async (file) => {
    out.innerHTML = `<section class="pnl"><p class="muted">Leyendo ${esc(file.name)}…</p><div class="prog" style="margin-top:10px"><i style="width:35%"></i></div></section>`;
    let t;
    try {
      if (/\.json$/i.test(file.name)) { const x = D.rowsFromBackup(await file.text()); t = { hdr: x.hdr, rows: x.rows, sheet: "Respaldo", hdrRow: 0, keyCol: x.hdr.find((h2) => D.KEY_RE.test(h2)) || x.hdr[0], sheets: ["Respaldo"] }; }
      else t = await F.readTable(file);
    } catch (e) { out.innerHTML = `<section class="pnl">${U.empty("help", "No se pudo leer el archivo", D.errMsg(e))}</section>`; FX.hit("err"); return; }
    const plan = D.planImport(t.hdr, t.rows);
    const same = plan.rows - plan.r.sinClave - plan.r.lleno - plan.nuevos.length - plan.cambiados.length;
    out.innerHTML = `<section class="pnl"><div class="pnl-h"><div><h2>${esc(file.name)}</h2><p>Hoja «${esc(t.sheet)}»${t.hdrRow ? `, encabezados en la fila ${t.hdrRow}` : ""}. Clave: «${esc(t.keyCol)}». ${B.plural(t.rows.length, "fila")} con datos.</p></div></div>
      <div class="imp-s"><div class="st si"><div class="v" data-count="${plan.nuevos.length}">0</div><small>Artículos nuevos</small></div><div class="st"><div class="v" data-count="${plan.cambiados.length}">0</div><small>Con cambios</small></div><div class="st pe"><div class="v" data-count="${Math.max(0, same)}">0</div><small>Sin cambios</small></div><div class="st no"><div class="v" data-count="${plan.r.sinClave + plan.r.lleno}">0</div><small>Sin marbete${plan.r.lleno ? " o sin lugar" : ""}</small></div></div>
      ${plan.headersAdded.length ? `<p style="margin-top:12px">Columnas nuevas que se agregarán: ${plan.headersAdded.map((x) => `<span class="chip on">${esc(x)}</span>`).join(" ")}</p>` : ""}
      <p class="muted" style="margin-top:10px">Columnas leídas: ${t.hdr.map((x) => esc(x)).join(" · ")}</p>
      <nav class="tabs" style="margin-top:14px"><button type="button" class="on" data-tb="n">Nuevos <span class="cnt">${B.int(plan.nuevos.length)}</span></button><button type="button" data-tb="c">Cambios <span class="cnt">${B.int(plan.cambiados.length)}</span></button></nav><ul class="diff" id="df"></ul>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap"><button class="btn ghost" type="button" id="imC">Cancelar</button><button class="btn pri lg" type="button" id="imA" ${plan.nuevos.length + plan.cambiados.length ? "" : "disabled"}>${icon("check")}<span>${plan.nuevos.length + plan.cambiados.length ? `Guardar ${B.plural(plan.nuevos.length + plan.cambiados.length, "artículo")} para todos` : "No hay nada que guardar"}</span></button></div><div class="prog" id="imP" hidden style="margin-top:12px"><i></i></div></section>`;
    const df = $("#df", out);
    const showT = (k) => { $$("[data-tb]", out).forEach((b) => b.classList.toggle("on", b.dataset.tb === k)); df.innerHTML = (k === "n" ? plan.nuevos.slice(0, 300).map((x) => `<li class="diff-r"><span class="mbn">${esc(x.mb)}</span><div><b>${esc(x.desc)}</b><span class="f">No. ${x.n}${x.rc ? " · " + esc(x.rc) : ""}</span></div></li>`) : plan.cambiados.slice(0, 300).map((x) => `<li class="diff-r"><span class="mbn">${esc(x.mb)}</span><div><b>${esc(x.desc)}</b>${x.fields.map((f) => `<div><span class="f">${esc(f.campo)}</span><s>${esc(f.antes || "vacío")}</s> → <ins>${esc(f.despues || "vacío")}</ins></div>`).join("")}</div></li>`)).join("") + ((k === "n" ? plan.nuevos : plan.cambiados).length > 300 ? `<li class="muted">Y ${B.int((k === "n" ? plan.nuevos : plan.cambiados).length - 300)} más.</li>` : "") || `<li class="muted">Nada aquí.</li>`; };
    showT(plan.nuevos.length ? "n" : "c");
    $$("[data-tb]", out).forEach((b) => (b.onclick = () => showT(b.dataset.tb)));
    $("#imC", out).onclick = () => (out.innerHTML = "");
    $("#imA", out).onclick = async (e) => {
      const btn = e.currentTarget, pr = $("#imP", out); pr.hidden = false;
      await busyBtn(btn, async () => {
        try { const n = await D.applyImport(plan, file.name, (i, k) => ($("i", pr).style.width = (i / k) * 100 + "%")); $("i", pr).style.width = "100%"; FX.hit("done"); FX.confetti({ n: 200 }); out.innerHTML = `<section class="pnl">${U.empty("check", "Guardado para todos", `${B.plural(n, "artículo")} ${n === 1 ? "quedó" : "quedaron"} en el inventario. ${plan.nuevos.length ? "Los nuevos ya tienen su QR en Etiquetas." : ""}`, `<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${plan.nuevos.length ? `<button class="btn pri" type="button" id="goLbl">${icon("qr")}<span>Imprimir etiquetas de los nuevos</span></button>` : ""}<a class="btn" href="#/historial">${icon("clock")}<span>Ver en la bitácora</span></a></div>`)}</section>`; const gl = $("#goLbl", out); if (gl) gl.onclick = () => { window.__labelSel = plan.nuevos.map((x) => x.tok); U.go("#/etiquetas?src=sel"); }; }
        catch (e2) { U.fail(e2); }
      });
    };
    U.anim(out); FX.play("ok");
  };
  $("#imF", el).onchange = (e) => { const f = e.target.files[0]; if (f) handle(f); e.target.value = ""; };
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("on"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("on"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("on"); const f = e.dataTransfer.files[0]; if (f) handle(f); });
  $("#bk", el).onclick = () => { F.save(`respaldo_inventario_${F.stamp()}.json`, D.backupJSON(), "application/json"); U.toast("Respaldo descargado. Guárdalo en tu Drive o USB.", { kind: "ok" }); };
  $("#all", el).onclick = (e) => busyBtn(e.currentTarget, () => S.exportAll());
  $("#tpl", el).onclick = async () => { F.save("plantilla_inventario.xlsx", await F.xlsx([{ name: "Artículos", rows: [D.inv.h.map((x) => ({ v: x, s: "head" }))], cols: D.inv.h.map((x) => (/descrip/i.test(x) ? 46 : /proveedor|[aá]rea|resguard/i.test(x) ? 30 : 16)), freeze: 1 }])); U.toast("Plantilla descargada.", { kind: "ok" }); };
  return { el, title: "Importar Excel" };
});

/* ================= BITÁCORA ================= */
const HS = { q: "", tipo: "", who: "" };
U.route("historial", () => {
  const el = h(`<div>${head("Bitácora", "Cada cambio queda registrado con fecha y autor: ediciones, traslados e importaciones de Excel.", `<button class="btn" type="button" id="hX">${icon("sheet")}<span>Excel</span></button>`)}<div class="tools"><label class="sbox">${icon("search")}<input type="search" id="hq" placeholder="Buscar marbete, persona, campo o valor" value="${esc(HS.q)}"></label><div class="seg" id="ht">${[["", "Todo"], ["edicion", "Ediciones"], ["traslado", "Traslados"], ["excel", "Excel"]].map(([k, l]) => `<button type="button" data-k="${k}" class="${HS.tipo === k ? "on" : ""}">${l}</button>`).join("")}</div><select class="inp" id="hw" style="width:auto" aria-label="Quién"><option value="">Todas las personas</option><option value="Juan Moreno">Juan Moreno</option><option value="Mitchell">Mitchell</option></select></div><div id="hl"><p class="muted">Cargando bitácora…</p></div></div>`);
  $("#hw", el).value = HS.who;
  const TIP = { edicion: "editó", traslado: "trasladó", excel: "importó" };
  const draw = () => {
    if (!D.cambios) return;
    const q = B.norm(HS.q);
    const docs = D.cambios.filter((c) => (!HS.tipo || c.tipo === HS.tipo) && (!HS.who || c.by === HS.who)).map((c) => ({ c, diffs: q ? (c.diffs || []).filter((d) => B.norm([d.mb, d.desc, d.campo, d.antes, d.despues, c.by, c.nota].join(" ")).includes(q)) : c.diffs || [] })).filter((x) => x.diffs.length);
    const days = new Map(); for (const x of docs.slice(0, 300)) { const k = new Date(x.c.at).toDateString(); if (!days.has(k)) days.set(k, []); days.get(k).push(x); }
    const fmtDay = (k) => { const d = new Date(k), n = new Date(); const y = new Date(n); y.setDate(n.getDate() - 1); return d.toDateString() === n.toDateString() ? "Hoy" : d.toDateString() === y.toDateString() ? "Ayer" : cap(d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })); };
    $("#hl", el).innerHTML = docs.length ? [...days.entries()].map(([k, list]) => `<div class="day"><h3>${esc(fmtDay(k))}</h3>${list.map(({ c, diffs }) => { const toks = new Set(diffs.map((d) => d.tok)).size; return `<div class="ev"><span class="dot ${c.tipo === "traslado" ? "tr" : "ed"}"></span><div class="ev-t"><b>${esc(c.by || "")} ${esc(TIP[c.tipo] || c.tipo)} ${c.tipo === "excel" ? "«" + esc(c.nota || "Excel") + "»" : B.plural(toks, "artículo")}</b><small>${B.plural(diffs.length, "cambio")}${c.nota && c.tipo !== "excel" ? " · " + esc(c.nota) : ""}</small><ul class="ev-d">${diffs.slice(0, 6).map((d, i) => `<li><span class="mbn">${esc(d.mb)}</span><span class="f">${esc(B.smart(d.campo))}</span>${d.campo === "(alta)" ? `<b>${esc(d.despues)}</b>` : `<s>${esc(d.antes || "vacío")}</s> → <b>${esc(d.despues || "vacío")}</b>`}${d.campo !== "(alta)" && D.byTok.get(d.tok) ? `<button class="btn ghost sm" type="button" data-rv="${esc(c.id)}:${i}">${icon("undo")}<span>Revertir</span></button>` : ""}</li>`).join("")}${diffs.length > 6 ? `<li class="muted">Y ${B.int(diffs.length - 6)} cambios más.</li>` : ""}</ul></div><time>${esc(new Date(c.at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }))}</time></div>`; }).join("")}</div>`).join("") + (docs.length > 300 ? `<p class="muted">Se muestran los 300 registros más recientes de ${B.int(docs.length)}.</p>` : "") : U.empty("clock", "Sin cambios con estos filtros", "");
  };
  $("#hl", el).onclick = async (e) => {
    const b = e.target.closest("[data-rv]"); if (!b) return; const [id, i] = b.dataset.rv.split(":"); const c = D.cambios.find((x) => x.id === id); if (!c) return;
    const q = B.norm(HS.q); const diffs = q ? c.diffs.filter((d) => B.norm([d.mb, d.desc, d.campo, d.antes, d.despues, c.by, c.nota].join(" ")).includes(q)) : c.diffs; const d = diffs[+i];
    if (!(await U.confirm("¿Revertir este cambio?", `El campo «${B.smart(d.campo)}» del marbete ${d.mb} volverá a «${d.antes || "vacío"}». Queda registrado en la bitácora.`, "Revertir"))) return;
    try { const r = await D.revert(d, B.fdt(c.at)); FX.play("undo"); U.toast("Cambio revertido.", { kind: "ok", action: { label: "Deshacer", fn: () => S.undo(r.undo) } }); } catch (e2) { U.fail(e2); }
  };
  $("#hq", el).addEventListener("input", U.debounce((e) => { HS.q = e.target.value; draw(); }, 200));
  $("#ht", el).onclick = (e) => { const b = e.target.closest("button"); if (!b) return; HS.tipo = b.dataset.k; $$("#ht button", el).forEach((x) => x.classList.toggle("on", x === b)); draw(); };
  $("#hw", el).onchange = (e) => { HS.who = e.target.value; draw(); };
  $("#hX", el).onclick = async () => { if (!D.cambios) return; const rows = []; for (const c of D.cambios) for (const d of c.diffs || []) rows.push([B.fdt(c.at), c.by || "", { edicion: "Edición", traslado: "Traslado", excel: "Excel" }[c.tipo] || c.tipo, d.mb, d.desc, d.campo, d.antes, d.despues, c.nota || ""]); F.save(`bitacora_${F.stamp()}.xlsx`, await F.xlsx([F.table({ name: "Bitácora", title: "BITÁCORA DE CAMBIOS · INVENTARIO CONALEP CHETUMAL", subs: [F.fecha() + " · " + B.plural(rows.length, "cambio")], head: ["Fecha", "Quién", "Tipo", "Marbete", "Artículo", "Campo", "Antes", "Después", "Nota"], rows, widths: [17, 14, 10, 10, 40, 24, 30, 30, 30] })])); U.toast("Bitácora descargada.", { kind: "ok" }); };
  D.loadCambios(true).then(draw).catch((e) => { $("#hl", el).innerHTML = U.empty("help", "No se pudo cargar la bitácora", D.errMsg(e)); });
  D.wantCambios = true;
  return { el, title: "Bitácora", update(k) { if (k === "cambios" || k === "inv") draw(); }, focusSearch() { $("#hq", el).focus(); }, destroy() { D.wantCambios = false; } };
});

/* ================= AJUSTES ================= */
U.route("ajustes", () => {
  const el = h(`<div></div>`);
  const sw = (k) => `<button type="button" class="sw" role="switch" aria-checked="${!!U.set[k]}" data-sw="${k}"></button>`;
  const draw = () => {
    el.innerHTML = head("Ajustes", "Se guardan solo en este equipo.") + `<div class="grid g2"><section class="pnl"><div class="pnl-h"><h2>Apariencia</h2></div><div class="set-l">
      <div class="set"><div><b>Tema</b><small>Automático sigue la configuración de tu equipo.</small></div><div class="seg" data-seg="theme">${[["auto", "Automático"], ["light", "Claro"], ["dark", "Oscuro"]].map(([k, l]) => `<button type="button" data-v="${k}" class="${U.set.theme === k ? "on" : ""}">${l}</button>`).join("")}</div></div>
      <div class="set"><div><b>Animaciones</b><small>Transiciones, sellos, confeti y el mosaico animado.</small></div>${sw("motion")}</div>
      <div class="set"><div><b>Sonidos</b><small>Avisos suaves al marcar, guardar y terminar. <button class="btn ghost sm" type="button" id="tst">Probar</button></small></div>${sw("sound")}</div>
      <div class="set"><div><b>Textos como en el Excel</b><small>Apagado muestra nombres y descripciones más fáciles de leer. Los archivos siempre salen como en el Excel.</small></div>${sw("raw")}</div>
      <div class="set"><div><b>Lista compacta</b><small>Más filas en pantalla.</small></div><button type="button" class="sw" role="switch" aria-checked="${U.set.density === "compact"}" data-sw="density"></button></div>
    </div></section>
    <section class="pnl"><div class="pnl-h"><h2>Datos y cuenta</h2></div><div class="set-l">
      <div class="set"><div><b>${esc(D.user)}</b><small>${D.admin ? "Administrador: puede borrar fotos." : "Servicios Administrativos"}</small></div><button class="btn sm" type="button" id="out">${icon("logout")}<span>Salir</span></button></div>
      <div class="set"><div><b>Actualizar ahora</b><small>${D.lastSync ? "Última actualización " + esc(B.ago(D.lastSync)) : "Sin actualizar todavía"}. Se revisa sola cada 30 segundos.</small></div><button class="btn sm" type="button" id="ref">${icon("refresh")}<span>Actualizar</span></button></div>
      <div class="set"><div><b>Atajos de teclado</b><small>Para trabajar sin ratón.</small></div><button class="btn sm" type="button" id="keys">${icon("key")}<span>Ver atajos</span></button></div>
      <div class="set"><div><b>App de celular</b><small>Para revisar el inventario escaneando los QR.</small></div><a class="btn sm" href="/app/" target="_blank" rel="noopener">${icon("phone")}<span>Abrir</span></a></div>
      <div class="set"><div><b>Portal de inventario 3.0</b><small>${B.plural(D.items.length, "artículo")} · ${esc(String(Object.keys(D.marcas).length))} revisiones · ${esc(String(Object.keys(D.fotos).length))} artículos con foto</small></div><button class="btn ghost sm" type="button" id="cred">Créditos</button></div>
    </div></section></div>`;
  };
  draw();
  el.addEventListener("click", async (e) => {
    const s = e.target.closest("[data-sw]");
    if (s) { const k = s.dataset.sw; if (k === "density") U.set.density = U.set.density === "compact" ? "normal" : "compact"; else U.set[k] = !U.set[k]; U.saveSet(); FX.play("tap"); s.setAttribute("aria-checked", k === "density" ? U.set.density === "compact" : !!U.set[k]); return; }
    const sg = e.target.closest("[data-seg] button"); if (sg) { U.set.theme = sg.dataset.v; U.saveSet(); draw(); $("#themeBtn").innerHTML = icon(U.isDark() ? "sun" : "moon"); return; }
    if (e.target.closest("#tst")) { FX.unlock(); FX.hit("stamp"); setTimeout(() => FX.hit("done"), 400); }
    else if (e.target.closest("#out")) $("#outBtn").click();
    else if (e.target.closest("#ref")) D.refresh().then(() => { U.toast("Inventario actualizado.", { kind: "ok" }); draw(); }).catch(U.fail);
    else if (e.target.closest("#keys")) S.shortcuts();
    else if (e.target.closest("#cred")) $("#mitchell").click();
  });
  return { el, title: "Ajustes" };
});

/* ================= UN ARTÍCULO (al escanear su QR con el celular) ================= */
U.route("articulo", (r) => {
  const tok = r.param; const el = h(`<div class="art"></div>`);
  const draw = () => {
    const it = D.byTok.get(tok);
    if (!it) { el.innerHTML = `<a class="back" href="#/inicio">${icon("left")}Inicio</a>` + U.empty("search", "No encontré este artículo", "El QR no corresponde a ningún marbete del inventario."); return; }
    el.innerHTML = `<a class="back" href="#/inicio">${icon("left")}Inventario</a><section class="art-hero"><div><div class="mbn">${esc(it.mb)}</div><h1>${esc(U.txt(it.ds))}</h1><div class="meta"><span>No. <b>${it.n}</b></span><span>Con <b>${esc(U.nm(it.rc))}</b></span>${it.ar ? `<span>En <b>${esc(U.txt(it.ar))}</b></span>` : ""}${it.im ? `<span><b>${B.money(it.im)}</b></span>` : ""}</div>${U.stamp(it.mark, "big in")}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px"><button class="btn sm" type="button" data-a="edit" style="background:#7FE0B8;color:#04140E;border-color:#7FE0B8">${icon("edit")}<span>Editar</span></button><button class="btn sm" type="button" data-a="move" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.3)">${icon("swap")}<span>Trasladar</span></button><a class="btn sm" href="#/resguardante/${encodeURIComponent(it.rc)}" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.3)">${icon("person")}<span>Su resguardante</span></a></div></div><div class="qr">${F.qrSvg(it)}</div></section>
      <div class="grid g2" style="margin-top:18px"><section class="pnl"><div class="pnl-h"><h2>Datos</h2></div>${factsLite(it)}</section><div class="grid"><section class="pnl"><div class="pnl-h"><h2>Fotos</h2></div><div id="aPh"></div></section><section class="pnl"><div class="pnl-h"><h2>Historial</h2><button class="btn sm" type="button" data-a="qr">${icon("print")}<span>Etiqueta</span></button></div><div id="aHi"></div></section></div></div>`;
    S.photosInto(it, $("#aPh", el)); S.historyInto(it, $("#aHi", el));
    el.onclick = (e) => { const a = e.target.closest("[data-a]")?.dataset.a; if (!a) return; if (a === "edit") { S.openItem(tok); setTimeout(() => document.querySelector('.drawer [data-a="edit"]')?.click(), 60); } else if (a === "move") S.moveItems([tok]); else S.openItem(tok, a === "fotos" ? "fotos" : a === "hist" ? "historial" : "qr"); };
    U.anim(el);
  };
  return { el, title: "Marbete " + (D.byTok.get(tok)?.mb || ""), after: draw, update: U.debounce(draw, 200) };
});
function factsLite(it) { return `<dl class="facts">${D.inv.h.map((hh) => [hh, D.cell(it, hh)]).filter(([, v]) => v).map(([k, v]) => `<dt>${esc(B.smart(k))}</dt><dd>${esc(v)}</dd>`).join("")}</dl>${S.ctxHtml(it)}`; }

S.start();
})();
