/* Portal de inventario CONALEP · estructura: acceso, barra lateral, paleta de búsqueda y preguntas,
   ficha de cada artículo, escáner de QR (cámara o lector USB) y arranque. */
(() => {
"use strict";
const { $, $$, esc, h, icon } = U;
const S = {};

/* ================= ACCESO ================= */
let lgRaf = 0;
function loginArt() {
  const cv = $("#lgCv"); if (!cv) return; const ctx = cv.getContext("2d");
  let W, H, dpr, cells = [], t0 = performance.now();
  const size = () => { const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; cells = []; const p = 14; for (let y = 0; y < H; y += p) for (let x = 0; x < W; x += p) cells.push({ x, y, r: Math.random(), on: 0 }); };
  size(); addEventListener("resize", size);
  const step = (now) => {
    if ($("#login").hidden) { lgRaf = 0; return; }
    const t = (now - t0) / 1000; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const sx = ((t * 120) % (W + 300)) - 150;
    for (const c of cells) {
      const wave = Math.sin(c.x * 0.012 + c.y * 0.018 - t * 1.2) * 0.5 + 0.5;
      const d = Math.abs(c.x - sx); if (d < 8 && c.r > 0.55) c.on = 1;
      c.on *= 0.985;
      const a = 0.05 + wave * 0.07 + c.on * 0.75;
      ctx.fillStyle = c.on > 0.05 ? `rgba(127,224,184,${a})` : `rgba(160,220,195,${a})`;
      const s = 5 + c.on * 3; ctx.fillRect(c.x + (8 - s) / 2, c.y + (8 - s) / 2, s, s);
    }
    ctx.fillStyle = "rgba(127,224,184,.25)"; ctx.fillRect(sx, 0, 2, H);
    lgRaf = requestAnimationFrame(step);
  };
  if (FX.motion) { cancelAnimationFrame(lgRaf); lgRaf = requestAnimationFrame(step); }
  else { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); for (const c of cells) { ctx.fillStyle = "rgba(160,220,195,.08)"; ctx.fillRect(c.x, c.y, 5, 5); } }
}
S.showLogin = (msg) => {
  const lg = $("#login"); lg.hidden = false; hideBoot();
  const last = D.lastUser(); if (last === "Mitchell") $("#lu2").checked = true;
  $("#lerr").textContent = msg || "";
  loginArt(); setTimeout(() => $("#lp").focus(), 80);
};
function initLogin() {
  $("#leye").onclick = () => { const p = $("#lp"); p.type = p.type === "password" ? "text" : "password"; };
  $("#lcard").onsubmit = async (e) => {
    e.preventDefault(); FX.unlock();
    const b = $("#lb"), err = $("#lerr"), u = $$("input[name=lu]").find((x) => x.checked).value, p = $("#lp").value;
    if (!p) { err.textContent = "Escribe tu contraseña."; return; }
    b.classList.add("busy"); b.querySelector("span").textContent = "Entrando…"; err.textContent = "";
    try {
      await D.login(u, p); $("#lp").value = ""; FX.hit("ok");
      $("#login").hidden = true;
      if (S.entered) { D.refresh().catch(() => {}); U.toast("Sesión renovada. Ya puedes seguir.", { kind: "ok" }); }
      else enterApp();
    } catch (e2) { err.textContent = e2.message || "No se pudo entrar."; FX.hit("err"); const c = $("#lcard"); c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake"); }
    b.classList.remove("busy"); b.querySelector("span").textContent = "Entrar";
  };
}

/* ================= BARRA LATERAL Y SUPERIOR ================= */
const NAV = [
  [null, [["inicio", "home", "Inicio"]]],
  ["Inventario", [["lista", "list", "Lista completa"], ["resguardantes", "people", "Resguardantes"], ["areas", "map", "Áreas"]]],
  ["Revisión", [["vivo", "pulse", "En vivo"], ["analisis", "chart", "Análisis"], ["salud", "shield", "Salud de los datos"]]],
  ["Herramientas", [["etiquetas", "qr", "Etiquetas QR"], ["importar", "upload", "Importar Excel"], ["historial", "clock", "Bitácora"]]],
];
function buildShell() {
  const side = $("#side");
  side.innerHTML = `<a class="sb-brand" href="#/inicio">${U.mark("mk")}<div><b>Inventario</b><small>CONALEP Chetumal<br>Servicios Administrativos</small></div></a>` +
    NAV.map(([sec, items]) => (sec ? `<div class="sb-sec">${esc(sec)}</div>` : "") + items.map(([k, ic, label]) => `<a class="nv" href="#/${k}" data-k="${k}">${icon(ic)}<span>${esc(label)}</span><i class="bd" data-b="${k}" hidden></i></a>`).join("")).join("") +
    `<div class="sb-foot"><a class="nv" href="/app/" target="_blank" rel="noopener">${icon("phone")}<span>App de celular</span>${icon("ext", "")}</a><a class="nv" href="#/ajustes" data-k="ajustes">${icon("gear")}<span>Ajustes</span></a>
     <div class="sb-user">${U.avatar(D.user)}<div><b>${esc(D.user)}</b><small>${D.admin ? "Administrador" : "Servicios Administrativos"}</small></div><button class="ib" type="button" id="outBtn" aria-label="Salir" data-tip="Salir">${icon("logout")}</button></div>
     <button class="credit" type="button" id="mitchell">Mitchell</button></div>`;
  $("#outBtn").onclick = async () => { if (await U.confirm("¿Salir del inventario?", "Se borra la copia guardada en este equipo. Para volver a entrar necesitas tu contraseña.", "Salir")) { await D.logout(); location.hash = ""; location.reload(); } };
  $("#mitchell").onclick = credits;
  $("#menuBtn").innerHTML = icon("menu"); $("#menuBtn").onclick = U.toggleSide;
  $("#qbtn").innerHTML = `${icon("search")}<span>Busca o pregunta<span class="qx">, por ejemplo: <span class="typed" id="qtyped"></span></span></span><kbd>Ctrl K</kbd>`;
  $("#qbtn").onclick = () => S.openPal();
  $("#scanBtn").innerHTML = icon("qr"); $("#scanBtn").onclick = () => S.scan();
  $("#themeBtn").onclick = (e) => toggleTheme(e);
  $("#sync").onclick = () => { if (!D.syncing) D.refresh().then(() => U.toast("Inventario actualizado.", { kind: "ok" })).catch(U.fail); };
  themeIcon(); typeHints();
  addEventListener("scroll", () => $("#top").classList.toggle("scrolled", scrollY > 4), { passive: true });
  document.addEventListener("click", (e) => { if (e.target.closest(".nv")) FX.play("tap"); });
}
function themeIcon() { $("#themeBtn").innerHTML = icon(U.isDark() ? "sun" : "moon"); }
function toggleTheme(e) {
  const next = U.isDark() ? "light" : "dark";
  const apply = () => { U.set.theme = next; U.saveSet(); themeIcon(); U.current()?.retheme?.(); };
  if (!document.startViewTransition || !FX.motion) return apply();
  const x = e?.clientX ?? innerWidth - 60, y = e?.clientY ?? 30, r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(apply);
  vt.ready.then(() => document.documentElement.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] }, { duration: 550, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" })).catch(() => {});
  FX.play("whoosh");
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if ($("#themeBtn")) themeIcon(); U.current()?.retheme?.(); });
const HINTS = ["¿cuántas sillas tiene Irma?", "computadoras sin serie", "¿qué área vale más?", "monitores de más de $5,000", "¿quién tiene el marbete 735293?", "artículos de antes de 1990", "¿cómo va el inventario?", "faltantes", "aire acondicionado", "¿cuál es el artículo más caro?"];
function typeHints() {
  const el = $("#qtyped"); if (!el) return; let i = 0, j = 0, dir = 1, wait = 0;
  const loop = () => {
    if (!document.body.contains(el)) return;
    if (!FX.motion) { el.textContent = HINTS[0]; return; }
    const s = HINTS[i];
    if (wait > 0) wait--; else { j += dir; if (j > s.length) { dir = -1; wait = 40; } else if (j < 0) { dir = 1; j = 0; i = (i + 1) % HINTS.length; wait = 6; } }
    el.textContent = s.slice(0, Math.max(0, j));
    setTimeout(loop, dir > 0 ? 55 : 22);
  };
  loop();
}
S.badges = () => {
  const set = (k, v, hot) => { const b = $(`[data-b="${k}"]`); if (!b) return; b.hidden = !v; b.textContent = v; b.classList.toggle("hot", !!hot); };
  if (!D.items.length) return;
  set("lista", B.int(D.items.length)); set("resguardantes", B.int(B.peopleMap().size));
  const ins = B.insights().filter((x) => x.sev >= 2).length; set("salud", ins || "", ins > 0);
  const recent = B.feed(1)[0]; const live = recent && Date.now() - recent.at < 15 * 60e3;
  const v = $('.nv[data-k="vivo"]'); if (v) { let d = v.querySelector(".live"); if (live && !d) v.insertAdjacentHTML("beforeend", '<i class="live" title="Hay revisiones activas"></i>'); else if (!live && d) d.remove(); }
};
S.syncPill = () => {
  const s = $("#sync"); if (!s) return;
  s.classList.toggle("busy", D.syncing); s.classList.toggle("off", !D.online);
  s.querySelector("span").textContent = !D.online ? "Sin conexión" : D.syncing ? "Actualizando…" : D.lastSync ? "Al día" : "Copia local";
  s.setAttribute("data-tip", !D.online ? "No hay conexión con el servidor. Lo que ves es la última copia guardada." : D.lastSync ? "Actualizado " + B.ago(D.lastSync) + ". Toca para actualizar ahora." : "Mostrando la copia guardada en este equipo.");
};
function credits() {
  FX.confetti({ n: 220 }); FX.hit("done");
  U.modal({ title: "Acerca del portal", body: `<div class="credits">${U.mark("mk")}<b>Inventario CONALEP</b><p class="muted">Portal de inventario de mobiliario y equipo de la Jefatura de Proyecto de Servicios Administrativos, CONALEP Chetumal.</p><p>Hecho por <strong>Mitchell</strong>.</p></div>`, actions: [{ label: "Cerrar", kind: "pri", value: "x" }] });
}

/* ================= RESPUESTAS (paleta e Inicio) ================= */
S.answerEl = (a, { onList } = {}) => {
  const max = a.groups ? Math.max(...a.groups.map((g) => (a.metric === "val" ? g.val : g.n))) || 1 : 1;
  const el = h(`<div class="ans" role="status">
    <div class="ans-h">${icon("spark")}<span>${esc(a.title || "Respuesta")}</span></div>
    <div class="ans-b">${a.big ? `<span class="big">${esc(a.big)}</span>` : ""}<p>${esc(a.sentence)}</p></div>
    ${a.groups ? `<div class="ans-g">${a.groups.map((g, i) => `<button type="button" data-g="${i}"><span>${esc(g.label)}</span><i style="width:${Math.max(4, ((a.metric === "val" ? g.val : g.n) / max) * 120)}px"></i><b>${a.metric === "val" ? esc(B.moneyShort(g.val)) : B.int(g.n)}</b></button>`).join("")}</div>` : ""}
    ${a.items && a.items.length && !a.groups ? `<div class="ans-g">${a.items.slice(0, 5).map((it) => `<button type="button" data-t="${it.tok}"><b style="min-width:62px;text-align:left">${esc(it.mb)}</b><span>${esc(U.txt(it.ds))}</span><small>${esc(a.intent === "top_item" || a.intent === "sum" ? B.money(it.im, 0) : a.intent === "oldest" ? String(it.y) : U.nm(it.rc))}</small></button>`).join("")}</div>` : ""}
    <div class="ans-f">${(a.fixed || []).map(([x, y]) => `<span class="chip">Entendí «${esc(x)}» como «${esc(y)}»</span>`).join("")}${(a.chips || []).map((c) => `<span class="chip">${esc(c)}</span>`).join("")}<span style="flex:1"></span>
      ${"speechSynthesis" in window ? `<button type="button" class="btn ghost sm" data-say>${icon("speaker")}<span>Escuchar</span></button>` : ""}
      ${a.go ? `<a class="btn sm" href="${a.go}">${esc(a.goLabel || "Abrir")}</a>` : a.total ? `<button type="button" class="btn sm" data-list>Ver ${a.total > 5 ? "los " + B.int(a.total) : "en la lista"}</button>` : ""}</div>
  </div>`);
  el.addEventListener("click", (e) => {
    const g = e.target.closest("[data-g]"), t = e.target.closest("[data-t]");
    if (g) { const x = a.groups[+g.dataset.g]; S.closePal(); if (x.go) U.go(x.go); else if (x.q) U.go("#/lista?q=" + encodeURIComponent((a.query ? a.query + " " : "") + x.q)); }
    else if (t) { S.openItem(t.dataset.t); }
    else if (e.target.closest("[data-list]")) { S.closePal(); onList ? onList() : U.go("#/lista?q=" + encodeURIComponent(a.query || "")); }
    else if (e.target.closest("[data-say]")) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(a.sentence); u.lang = "es-MX"; u.rate = 1.02; speechSynthesis.speak(u); }
  });
  FX.play("soft");
  return el;
};

/* ================= PALETA (Ctrl K) ================= */
let pal = null;
const RK = "cnlp_recent";
const recent = () => { try { return JSON.parse(localStorage.getItem(RK) || "[]"); } catch (e) { return []; } };
const pushRecent = (q) => { q = q.trim(); if (!q) return; try { localStorage.setItem(RK, JSON.stringify([q, ...recent().filter((x) => x !== q)].slice(0, 6))); } catch (e) {} };
const ACTIONS = () => [
  { label: "Escanear un QR con la cámara", icon: "qr", run: () => S.scan() },
  { label: "Importar un Excel", icon: "upload", run: () => U.go("#/importar") },
  { label: "Imprimir etiquetas QR", icon: "tag", run: () => U.go("#/etiquetas") },
  { label: "Ver la revisión en vivo", icon: "pulse", run: () => U.go("#/vivo") },
  { label: "Descargar todo el inventario en Excel", icon: "sheet", run: () => S.exportAll() },
  { label: "Descargar respaldo", icon: "download", run: () => U.go("#/importar") },
  { label: "Cambiar entre claro y oscuro", icon: "moon", run: () => toggleTheme() },
  { label: "Ajustes", icon: "gear", run: () => U.go("#/ajustes") },
  { label: "Atajos de teclado", icon: "key", run: () => shortcuts() },
  ...NAV.flatMap(([, items]) => items).map(([k, ic, label]) => ({ label: "Ir a " + label, icon: ic, run: () => U.go("#/" + k) })),
];
S.closePal = () => { if (pal && pal.open) pal.close(); };
S.openPal = (initial = "") => {
  if (pal && pal.open) { pal.querySelector("input").focus(); return; }
  FX.unlock(); FX.play("whoosh");
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  pal = h(`<dialog class="pal" aria-label="Buscar o preguntar"><div class="pal-in"><div class="pal-q">${icon("search")}<input type="text" placeholder="Busca un artículo, persona o área… o haz una pregunta" aria-label="Buscar o preguntar" autocomplete="off" spellcheck="false">${SR ? `<button class="ib mic" type="button" aria-label="Preguntar con la voz" data-tip="Preguntar con la voz">${icon("mic")}</button>` : ""}<button class="ib" type="button" data-x aria-label="Cerrar">${icon("x")}</button></div><div class="pal-r" role="listbox"></div><div class="pal-f"><span>${U.kbd("↑")} ${U.kbd("↓")} moverse</span><span>${U.kbd("Enter")} abrir</span><span>${U.kbd("Esc")} cerrar</span><span style="margin-left:auto">Entiende preguntas como «¿cuánto vale el área de biblioteca?»</span></div></div></dialog>`);
  document.body.appendChild(pal);
  const inp = $("input", pal), out = $(".pal-r", pal); let entries = [], act = 0;
  const render = () => {
    const q = inp.value.trim(); entries = []; out.innerHTML = "";
    const sec = (t) => out.insertAdjacentHTML("beforeend", `<div class="pal-sec">${esc(t)}</div>`);
    const add = (html, run) => { const i = entries.length; const b = h(`<button type="button" class="po" role="option" data-i="${i}">${html}</button>`); out.appendChild(b); entries.push({ el: b, run }); };
    if (!q) {
      const rc = recent(); if (rc.length) { sec("Búsquedas recientes"); rc.forEach((r) => add(`<span class="po-i">${icon("clock")}</span><span class="po-t"><b>${esc(r)}</b></span>`, () => { inp.value = r; render(); })); }
      sec("Prueba preguntar"); ["¿Cuántas computadoras hay?", "¿Quién tiene más artículos?", "¿Cuánto vale el inventario?", "¿Dónde están los proyectores?", "Artículos de más de 15 años"].forEach((x) => add(`<span class="po-i">${icon("spark")}</span><span class="po-t"><b>${esc(x)}</b></span>`, () => { inp.value = x; render(); }));
      sec("Acciones"); ACTIONS().slice(0, 6).forEach((a) => add(`<span class="po-i">${icon(a.icon)}</span><span class="po-t"><b>${esc(a.label)}</b></span>`, () => { S.closePal(); a.run(); }));
    } else {
      if (D.items.length && B.isQuestion(q)) { const a = B.ask(q); if (a) { const el = S.answerEl(a, { onList: () => U.go("#/lista?q=" + encodeURIComponent(a.query || q)) }); out.appendChild(el); entries.push({ el, run: () => { S.closePal(); if (a.go) U.go(a.go); else if (a.items?.length === 1 && a.intent === "who_mb") S.openItem(a.items[0].tok); else U.go("#/lista?q=" + encodeURIComponent(a.query || q)); } }); } }
      const r = B.search(q, 7);
      if (r.total) { sec(`Artículos · ${B.int(r.total)}`); r.list.forEach((it) => add(`<span class="mb">${esc(it.mb || "No. " + it.n)}</span><span class="po-t"><b>${esc(U.txt(it.ds))}</b><small>${esc(U.nm(it.rc))}${it.ar ? " · " + esc(U.txt(it.ar)) : ""}</small></span>${U.stamp(it.mark)}`, () => { pushRecent(q); S.closePal(); S.openItem(it.tok); })); }
      const qn = B.norm(q).split(" ").filter(Boolean);
      const ppl = B.names().filter((n) => { const k = B.norm(n); return qn.every((w) => k.includes(w)); }).slice(0, 4);
      if (ppl.length) { sec("Resguardantes"); ppl.forEach((n) => add(`<span class="po-i">${U.avatar(n, "sm")}</span><span class="po-t"><b>${esc(U.nm(n))}</b><small>${B.plural(B.peopleMap().get(n).length, "artículo")}</small></span>`, () => { pushRecent(q); S.closePal(); U.go("#/resguardante/" + encodeURIComponent(n)); })); }
      const ars = B.areaNames().filter((n) => { const k = B.norm(n); return qn.every((w) => k.includes(w)); }).slice(0, 3);
      if (ars.length) { sec("Áreas"); ars.forEach((n) => add(`<span class="po-i">${icon("map")}</span><span class="po-t"><b>${esc(U.txt(n))}</b><small>${B.plural(B.areasMap().get(n).length, "artículo")}</small></span>`, () => { pushRecent(q); S.closePal(); U.go("#/lista?q=" + encodeURIComponent('area:"' + n + '"')); })); }
      const acts = ACTIONS().filter((a) => qn.every((w) => B.norm(a.label).includes(w))).slice(0, 4);
      if (acts.length) { sec("Acciones"); acts.forEach((a) => add(`<span class="po-i">${icon(a.icon)}</span><span class="po-t"><b>${esc(a.label)}</b></span>`, () => { S.closePal(); a.run(); })); }
      if (r.total > 7) add(`<span class="po-i">${icon("list")}</span><span class="po-t"><b>Ver los ${B.int(r.total)} artículos en la lista</b></span>`, () => { pushRecent(q); S.closePal(); U.go("#/lista?q=" + encodeURIComponent(q)); });
      if (!entries.length) out.insertAdjacentHTML("beforeend", U.empty("search", "No encontré nada con «" + q + "»", "Prueba con el número de marbete, una parte de la descripción, el nombre de una persona o un área."));
    }
    act = 0; mark();
  };
  const mark = () => entries.forEach((e, i) => { e.el.classList.toggle("act", i === act); if (i === act) e.el.scrollIntoView({ block: "nearest" }); });
  const run = U.debounce(render, 90);
  inp.addEventListener("input", run);
  inp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); act = Math.min(entries.length - 1, act + 1); mark(); FX.play("tap"); }
    else if (e.key === "ArrowUp") { e.preventDefault(); act = Math.max(0, act - 1); mark(); FX.play("tap"); }
    else if (e.key === "Enter") { e.preventDefault(); const en = entries[act]; if (en) en.run(); }
  });
  out.addEventListener("click", (e) => { const b = e.target.closest(".po"); if (b) entries[+b.dataset.i]?.run(); });
  out.addEventListener("pointermove", (e) => { const b = e.target.closest(".po"); if (b && +b.dataset.i !== act) { act = +b.dataset.i; entries.forEach((x, i) => x.el.classList.toggle("act", i === act)); } });
  $("[data-x]", pal).onclick = () => S.closePal();
  pal.addEventListener("click", (e) => { if (e.target === pal) S.closePal(); });
  pal.addEventListener("close", () => { setTimeout(() => pal && !pal.open && pal.remove(), 200); });
  const mic = $(".mic", pal);
  if (mic) mic.onclick = () => {
    const rec = new SR(); rec.lang = "es-MX"; rec.interimResults = true; rec.maxAlternatives = 1;
    mic.classList.add("on"); FX.play("tap");
    rec.onresult = (ev) => { inp.value = [...ev.results].map((r) => r[0].transcript).join(" "); render(); };
    rec.onend = () => { mic.classList.remove("on"); render(); };
    rec.onerror = () => { mic.classList.remove("on"); U.toast("No se pudo usar el micrófono.", { kind: "err" }); };
    try { rec.start(); } catch (e) { mic.classList.remove("on"); }
  };
  pal.showModal(); inp.value = initial; render(); inp.focus();
};

/* ================= FICHA DE UN ARTÍCULO ================= */
let dr = null, drTok = "", drTab = "datos", drEdit = false;
S.openItem = (tok, tab) => {
  const it = D.byTok.get(tok);
  if (!it) { U.toast("No encontré ese artículo en el inventario.", { kind: "err" }); return; }
  S.closePal();
  drTok = tok; drTab = tab || "datos"; drEdit = false;
  if (!dr) {
    dr = h(`<dialog class="drawer" aria-label="Ficha del artículo"><div class="dr"></div></dialog>`);
    document.body.appendChild(dr);
    dr.addEventListener("click", (e) => { if (e.target === dr) closeDr(); });
    dr.addEventListener("cancel", (e) => { e.preventDefault(); closeDr(); });
  }
  drawDr();
  if (!dr.open) { dr.classList.remove("closing"); dr.showModal(); FX.play("whoosh"); const bd = $(".dr-b", dr); if (bd) { bd.tabIndex = -1; bd.focus({ preventScroll: true }); } }
  history.replaceState(history.state, "", location.href);
};
const closeDr = () => { if (!dr || !dr.open) return; if (!FX.motion) return dr.close(); dr.classList.add("closing"); setTimeout(() => { dr.close(); dr.classList.remove("closing"); }, 230); };
S.closeItem = closeDr;
S.refreshItem = () => { if (dr && dr.open && !drEdit) drawDr(true); };
function factsHtml(it) {
  const rows = D.inv.h.map((h2) => [h2, D.cell(it, h2)]).filter(([, v]) => v);
  const m = it.mark;
  return `<dl class="facts"><dt>No.</dt><dd>${it.n}</dd>${rows.map(([k, v]) => `<dt>${esc(U.set.raw ? k : B.smart(k))}</dt><dd>${esc(v)}</dd>`).join("")}
    <dt>Revisión</dt><dd><span class="rv-a" style="margin-bottom:8px;display:flex;gap:6px;align-items:center"><button class="mk si ${m?.e === "si" ? "on" : ""}" type="button" data-mk="si" aria-label="Marcar presente" data-tip="${esc(`Marcar presente en la revisión de ${esc(U.nm(it.rc))}`)}">${icon("check")}</button><button class="mk no ${m?.e === "no" ? "on" : ""}" type="button" data-mk="no" aria-label="Marcar que no está" data-tip="Marcar que no está">${icon("x")}</button></span>${m ? `${U.stamp(m)}<br><small class="muted">${m.e === "si" ? "Presente" : "No está"}${m.c ? " · estado " + { B: "bueno", R: "regular", M: "malo" }[m.c] : ""} · ${esc(m.by || "")} · ${esc(B.ago(m.at))}</small>${m.n ? `<br>Observaciones: ${esc(m.n)}` : ""}` : `<span class="muted">Todavía no se revisa en el inventario de ${esc(U.nm(it.rc))}.</span>`}</dd>
    <dt>Fotos</dt><dd>${it.fotos ? B.plural(it.fotos, "foto") : '<span class="muted">Sin fotos</span>'}</dd></dl>${ctxHtml(it)}`;
}
S.ctxHtml = (it) => ctxHtml(it);
function ctxHtml(it) {
  const c = B.context(it); if (!c.length) return "";
  return `<ul class="ins ctx" style="margin-top:16px">${c.map((x) => `<li class="${x.warn ? "s2" : "s1"}"><span class="ic">${icon(x.icon)}</span><div class="tx"><b style="font-weight:400">${esc(x.text)}</b></div>${x.q ? `<a class="btn sm" href="#/lista?q=${encodeURIComponent(x.q)}">Ver</a>` : x.go ? `<a class="btn sm" href="${x.go}">Revisar</a>` : ""}</li>`).join("")}</ul>`;
}
function editHtml(it) {
  const rc = D.hRC, ar = D.inv.h[D.K.AR];
  return `<form class="edit-g" id="edF">${D.inv.h.map((h2, j) => { const v = D.cell(it, h2); const ro = h2 === D.hMB; const long = /descrip/i.test(h2); return `<label class="fld ${long ? "full" : ""}"><span>${esc(B.smart(h2))}${ro ? " (no se edita: es la clave del QR)" : ""}</span>${long ? `<textarea data-h="${esc(h2)}">${esc(v)}</textarea>` : `<input data-h="${esc(h2)}" value="${esc(v)}" ${ro ? "readonly" : ""} ${h2 === rc ? 'list="dlRc"' : h2 === ar ? 'list="dlAr"' : ""}>`}</label>`; }).join("")}
    <datalist id="dlRc">${B.names().map((n) => `<option value="${esc(n)}">`).join("")}</datalist><datalist id="dlAr">${B.areaNames().map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
    <div class="full" style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="btn ghost" id="edC">Cancelar</button><button class="btn pri" id="edS">${icon("check")}<span>Guardar cambios</span></button></div></form>`;
}
S.historyInto = (it, host) => historyHtml(it, host);
S.photosInto = (it, host) => photosHtml(it, host);
async function historyHtml(it, host) {
  host.innerHTML = `<p class="muted">Cargando historial…</p>`;
  try { await D.loadCambios(); } catch (e) { host.innerHTML = `<p class="muted">${esc(D.errMsg(e))}</p>`; return; }
  const ev = D.historyOfItem(it.tok);
  const m = it.mark;
  const lis = [];
  if (m) lis.push(`<li class="${m.e === "si" ? "" : "ex"}"><b>Revisión: ${m.e === "si" ? "presente" : "no se encontró"}${m.c ? " · " + { B: "bueno", R: "regular", M: "malo" }[m.c] : ""}</b><small>${esc(m.by || "")} · ${esc(B.fdt(m.at))}${m.n ? " · " + esc(m.n) : ""}</small></li>`);
  for (const e of ev) {
    if (e.campo === "(alta)") lis.push(`<li class="ex"><b>${esc(e.despues)}</b><small>${esc(e.by)} · ${esc(B.fdt(e.at))}${e.nota ? " · " + esc(e.nota) : ""}</small></li>`);
    else lis.push(`<li class="${e.campo === D.hRC ? "tr" : ""}"><b>${esc(B.smart(e.campo))}</b><div><s>${esc(e.antes || "vacío")}</s> → <strong>${esc(e.despues || "vacío")}</strong></div><small>${esc(e.by)} · ${esc(B.fdt(e.at))} · ${esc({ edicion: "Edición", traslado: "Traslado", excel: "Excel" }[e.tipo] || e.tipo)}${e.nota ? " · " + esc(e.nota) : ""}</small></li>`);
  }
  host.innerHTML = lis.length ? `<ul class="tl">${lis.join("")}</ul><p class="muted" style="font-size:12.5px">Se muestran los cambios de los últimos 1,000 registros de la bitácora.</p>` : U.empty("clock", "Sin cambios registrados", "Este artículo no se ha editado ni trasladado desde que se cargó el inventario.");
}
async function photosHtml(it, host) {
  const list = (D.fotos[it.tok]?.list || []).slice().sort((a, b) => a.at - b.at);
  host.innerHTML = `<div class="phg">${list.map((f) => `<figure data-id="${esc(f.id)}"><img alt="Foto del artículo ${esc(it.mb)}" loading="lazy"><figcaption>${esc(B.fdate(f.at))} · ${esc(f.by || "")}</figcaption>${D.admin ? `<button class="del" type="button">Borrar</button>` : ""}</figure>`).join("")}<label class="add">${icon("camera", "big")}<span>Agregar foto</span><input type="file" accept="image/*" capture="environment" hidden></label></div>${list.length ? "" : `<p class="muted" style="margin-top:12px">Todavía no hay fotos. Las que se toman con la app de celular también aparecen aquí.</p>`}`;
  for (const fig of $$("figure", host)) {
    const id = fig.dataset.id, img = $("img", fig);
    D.fotoUrl(it.tok, id).then((u) => (img.src = u)).catch(() => (img.alt = "No se pudo cargar"));
    img.onclick = () => { const lb = h(`<div class="lightbox" role="dialog" aria-label="Foto ampliada"><img src="${img.src}" alt=""></div>`); lb.onclick = () => lb.remove(); document.body.appendChild(lb); };
    const del = $(".del", fig); if (del) { let arm = 0; del.onclick = async () => { if (Date.now() - arm > 4000) { arm = Date.now(); del.textContent = "¿Seguro?"; return; } try { await D.fotoDel(it.tok, id); U.toast("Foto borrada.", { kind: "ok" }); photosHtml(it, host); } catch (e) { U.fail(e); } }; }
  }
  const inp = $("input[type=file]", host);
  inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const lab = inp.closest(".add"); lab.querySelector("span").textContent = "Subiendo…"; try { await D.fotoPut(it.tok, f); FX.hit("ok"); U.toast("Foto agregada.", { kind: "ok" }); photosHtml(it, host); drawTabs(); } catch (e) { U.fail(e); lab.querySelector("span").textContent = "Agregar foto"; } };
}
function drawTabs() {
  const it = D.byTok.get(drTok); if (!it || !dr) return;
  const t = $(".dr-tabs", dr); if (!t) return;
  t.innerHTML = [["datos", "Datos"], ["fotos", "Fotos" + (it.fotos ? " · " + it.fotos : "")], ["historial", "Historial"], ["qr", "Etiqueta QR"]].map(([k, l]) => `<button type="button" data-t="${k}" class="${drTab === k ? "on" : ""}">${esc(l)}</button>`).join("");
}
function drawDr(keepScroll) {
  const it = D.byTok.get(drTok); if (!it) { closeDr(); return; }
  const root = $(".dr", dr); const sc = keepScroll ? $(".dr-b", root)?.scrollTop : 0;
  root.style.setProperty("--mk", `url("data:image/svg+xml,${encodeURIComponent(U.mark())}")`);
  root.innerHTML = `<div class="dr-h"><div class="dr-top"><small>Artículo No. ${it.n}</small><div><button class="ib" type="button" data-a="link" aria-label="Copiar enlace" data-tip="Copiar el enlace de este artículo">${icon("copy")}</button><a class="ib" href="#${it.tok}" aria-label="Abrir como página" data-tip="Abrir como página">${icon("ext")}</a><button class="ib" type="button" data-a="close" aria-label="Cerrar">${icon("x")}</button></div></div>
    <div class="dr-mb"><span>${esc(it.mb || "—")}</span>${U.stamp(it.mark, "in")}</div><div class="dr-t">${esc(U.txt(it.ds))}</div>
    <a class="dr-who" href="#/resguardante/${encodeURIComponent(it.rc)}">${U.avatar(it.rc)}<div><b>${esc(U.nm(it.rc))}</b><small>${esc(it.ar ? U.txt(it.ar) : "Sin área")}${it.im ? " · " + B.money(it.im) : ""}</small></div></a></div>
    <div class="dr-acts"><button class="btn sm" type="button" data-a="edit">${icon("edit")}<span>Editar</span></button><button class="btn sm" type="button" data-a="move">${icon("swap")}<span>Trasladar</span></button><button class="btn sm" type="button" data-a="label">${icon("print")}<span>Etiqueta PDF</span></button><button class="btn sm" type="button" data-a="photo">${icon("camera")}<span>Foto</span></button></div>
    <div class="dr-tabs" role="tablist"></div><div class="dr-b"></div>`;
  drawTabs(); drawBody(it);
  if (keepScroll) $(".dr-b", root).scrollTop = sc;
  root.onclick = async (e) => {
    const t = e.target.closest("[data-t]"); if (t) { drTab = t.dataset.t; drEdit = false; FX.play("tap"); drawTabs(); drawBody(it); return; }
    const mk = e.target.closest("[data-mk]");
    if (mk) { const cur = it.mark, e2 = mk.dataset.mk; const val = cur?.e === e2 ? null : { e: e2, c: cur?.e === "si" && e2 === "si" ? cur.c : "", n: cur?.n || "" }; FX.hit(val ? (e2 === "si" ? "stamp" : "warn") : "undo"); try { await D.setMark(it.rc, it.tok, val); U.toast(val ? `${it.mb} marcado como ${e2 === "si" ? "presente" : "no está"} en la revisión de ${U.nm(it.rc)}.` : `Se quitó la marca de ${it.mb}.`, { kind: "ok", sound: false }); } catch (err) { U.fail(err); } return; }
    const a = e.target.closest("[data-a]")?.dataset.a; if (!a) return;
    if (a === "close") closeDr();
    else if (a === "link") U.copy(location.origin + "/#" + it.tok);
    else if (a === "edit") { drTab = "datos"; drEdit = true; drawTabs(); drawBody(it); }
    else if (a === "move") S.moveItems([it.tok]);
    else if (a === "label") S.labelPdf([it], "etiqueta_" + it.mb);
    else if (a === "photo") { drTab = "fotos"; drawTabs(); drawBody(it); setTimeout(() => $(".dr-b input[type=file]", dr)?.click(), 60); }
  };
  if (dr.querySelector(".dr-who")) dr.querySelector(".dr-who").onclick = () => closeDr();
}
function drawBody(it) {
  const b = $(".dr-b", dr); b.scrollTop = 0;
  if (drTab === "datos") {
    if (!drEdit) { b.innerHTML = factsHtml(it); return; }
    b.innerHTML = editHtml(it);
    $("#edC", b).onclick = () => { drEdit = false; drawBody(it); };
    $("#edF", b).onsubmit = async (e) => {
      e.preventDefault();
      const set = {}; $$("[data-h]", b).forEach((x) => { const h2 = x.dataset.h; if (h2 !== D.hMB && D.clean(x.value) !== D.cell(it, h2)) set[h2] = x.value; });
      if (!Object.keys(set).length) { drEdit = false; drawBody(it); return; }
      if (D.hRC && set[D.hRC] !== undefined) {
        const nv = D.clean(set[D.hRC]).toUpperCase(); set[D.hRC] = nv;
        if (!nv) { U.toast("El resguardante no puede quedar vacío.", { kind: "err" }); return; }
        if (!B.names().includes(nv) && !(await U.confirm("¿Resguardante nuevo?", `«${nv}» no existe en la lista de resguardantes. Revisa que esté bien escrito.`, "Sí, es correcto"))) return;
      }
      const btn = $("#edS", b); btn.classList.add("busy");
      try {
        const r = await D.applyChanges({ [it.tok]: set }, D.hRC && set[D.hRC] !== undefined ? "traslado" : "edicion");
        drEdit = false; FX.hit("ok"); drawDr();
        U.toast(`Guardado: ${B.plural(r.n, "cambio")} en el marbete ${it.mb}.`, { kind: "ok", action: { label: "Deshacer", fn: () => S.undo(r.undo) } });
      } catch (e2) { U.fail(e2); btn.classList.remove("busy"); }
    };
    setTimeout(() => $("[data-h]:not([readonly])", b)?.focus(), 50);
  } else if (drTab === "fotos") photosHtml(it, b);
  else if (drTab === "historial") historyHtml(it, b);
  else if (drTab === "qr") {
    b.innerHTML = `<div class="qrbox"><canvas></canvas><p class="muted" style="text-align:center;max-width:40ch">El QR abre <b>${esc(location.origin)}/#${esc(it.tok)}</b>: la ficha de este artículo después de entrar con contraseña.</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn pri" type="button" data-q="pdf">${icon("file")}<span>PDF para imprimir</span></button><button class="btn" type="button" data-q="png">${icon("image")}<span>Imagen PNG</span></button></div></div>`;
    F.logoReady().then(() => F.drawLabel($("canvas", b), 600, it));
    b.onclick = (e) => { const q = e.target.closest("[data-q]")?.dataset.q; if (q === "pdf") S.labelPdf([it], "etiqueta_" + it.mb); else if (q === "png") $("canvas", b).toBlob((bl) => F.save("etiqueta_" + F.safe(it.mb) + ".png", bl)); };
  }
}
S.undo = async (undo) => {
  try { const r = await D.applyChanges(undo, Object.values(undo).some((s) => D.hRC in s) ? "traslado" : "edicion", "Deshacer"); FX.play("undo"); U.toast(`Listo: se deshicieron ${B.plural(r.n, "cambio")}.`, { kind: "ok" }); S.refreshItem(); }
  catch (e) { U.fail(e); }
};
S.moveItems = async (toks, opts = {}) => {
  const its = toks.map((t) => D.byTok.get(t)).filter(Boolean); if (!its.length) return;
  const from = [...new Set(its.map((x) => x.rc))];
  const to = await U.pickPerson({ title: its.length === 1 ? "Trasladar el marbete " + its[0].mb : `Trasladar ${B.int(its.length)} artículos`, text: its.length === 1 ? `Ahora está con ${U.nm(its[0].rc)}. El cambio queda en la bitácora.` : `Vienen de ${from.length === 1 ? U.nm(from[0]) : B.plural(from.length, "resguardante")}. El cambio queda en la bitácora.`, exclude: from.length === 1 ? from[0] : "" });
  if (!to) return;
  const t = U.toast(`Trasladando ${B.plural(its.length, "artículo")}…`, { ms: 60000, icon: "swap" });
  try {
    const r = await D.transfer(its.map((x) => x.tok), to, opts.nota || "");
    t.remove(); FX.hit("ok");
    U.toast(`${B.plural(r.items, "artículo trasladado", "artículos trasladados")} a ${U.nm(to)}.`, { kind: "ok", action: { label: "Deshacer", fn: () => S.undo(r.undo) } });
    opts.done && opts.done(r); S.refreshItem();
  } catch (e) { t.remove(); U.fail(e); }
};
S.labelPdf = async (list, name) => {
  const t = U.toast(`Preparando ${B.plural(list.length, "etiqueta")}…`, { ms: 120000, icon: "print" });
  try { await F.logoReady(); const blob = await F.pdfLabels(list, U.set.label || 50); F.save(F.safe(name || "etiquetas_qr") + ".pdf", blob); t.remove(); U.toast("PDF listo.", { kind: "ok" }); }
  catch (e) { t.remove(); U.fail(e); }
};
S.exportAll = async () => {
  const t = U.toast("Preparando el Excel de todo el inventario…", { ms: 60000, icon: "sheet" });
  try { const blob = await S.inventoryXlsx(D.items, "Inventario completo"); F.save(`inventario_conalep_${F.stamp()}.xlsx`, blob); t.remove(); U.toast("Excel descargado.", { kind: "ok" }); }
  catch (e) { t.remove(); U.fail(e); }
};
const EST = { si: "Presente", no: "No está" }, CND = { B: "Bueno", R: "Regular", M: "Malo" };
S.inventoryXlsx = async (list, title, extraSubs = []) => {
  const h0 = D.inv.h, im = D.K.IM;
  const head = ["No.", ...h0, "Revisión", "Estado físico", "Observaciones", "Fotos"];
  const rows = list.map((it) => [it.n, ...h0.map((hh, j) => { const v = D.cell(it, hh); if (j === im) return it.im || v; if (j === D.K.MB && /^\d+$/.test(v)) return Number(v); return v; }), it.mark ? EST[it.mark.e] : "Pendiente", it.mark?.e === "si" ? CND[it.mark.c] || "" : "", it.mark?.n || "", it.fotos || ""]);
  const widths = [6, ...h0.map((hh) => (/descrip/i.test(hh) ? 46 : /proveedor|[aá]rea|resguard/i.test(hh) ? 30 : 15)), 11, 12, 30, 7];
  const main = F.table({ name: "Inventario", title: "CONALEP CHETUMAL · JEFATURA DE PROYECTO DE SERVICIOS ADMINISTRATIVOS", subs: [title + " · " + B.plural(list.length, "artículo") + " · " + F.fecha(), ...extraSubs], head, rows, widths, money: im >= 0 ? [im + 1] : [], statusCol: h0.length + 1, total: im >= 0 ? { labelCol: im, sumCols: [im + 1] } : null });
  const byRc = B.groupBy(list, "rc").sort((a, b) => a.key.localeCompare(b.key, "es"));
  const res = F.table({ name: "Por resguardante", title: "Resumen por resguardante", subs: [F.fecha()], head: ["Resguardante", "Artículos", "Valor", "Presentes", "No están", "Pendientes"], rows: byRc.map((g) => [g.key, g.n, g.val, g.items.filter((x) => x.mark?.e === "si").length, g.items.filter((x) => x.mark?.e === "no").length, g.items.filter((x) => !x.mark).length]), widths: [44, 11, 16, 11, 11, 11], money: [2], ints: [1, 3, 4, 5], total: { labelCol: 0, sumCols: [1, 2, 3, 4, 5] }, portrait: true });
  const byAr = B.groupBy(list, (x) => x.ar || "(Sin área)").sort((a, b) => a.key.localeCompare(b.key, "es"));
  const ar = F.table({ name: "Por área", title: "Resumen por área", subs: [F.fecha()], head: ["Área", "Artículos", "Valor"], rows: byAr.map((g) => [g.key, g.n, g.val]), widths: [60, 11, 16], money: [2], ints: [1], total: { labelCol: 0, sumCols: [1, 2] }, portrait: true });
  return F.xlsx([main, res, ar]);
};

/* ================= ESCÁNER (cámara y lector USB) ================= */
let scanEl = null, scanStream = null, scanRaf = 0;
S.handleCode = (code) => {
  const v = U.current();
  if (v && v.onScan && v.onScan(code)) return;
  const it = B.findMb(code);
  if (it) { FX.hit("ok"); S.openItem(it.tok); }
  else { FX.hit("err"); U.toast(`No encontré el marbete «${code}» en el inventario.`, { kind: "err" }); }
};
S.scan = async () => {
  if (scanEl) return;
  scanEl = h(`<div class="scan" role="dialog" aria-label="Escanear QR"><video playsinline muted autoplay></video><div class="sc-fr"><i></i><i></i><i></i><i></i><span class="ls"></span></div><div class="sc-top"><b>Apunta al QR del marbete</b><button class="ib" type="button" aria-label="Cerrar">${icon("x")}</button></div><div class="sc-msg">Abriendo la cámara…</div></div>`);
  document.body.appendChild(scanEl);
  const msg = $(".sc-msg", scanEl), video = $("video", scanEl);
  const stop = () => { cancelAnimationFrame(scanRaf); scanStream && scanStream.getTracks().forEach((t) => t.stop()); scanStream = null; scanEl && scanEl.remove(); scanEl = null; removeEventListener("keydown", esck); };
  const esck = (e) => { if (e.key === "Escape") stop(); };
  addEventListener("keydown", esck);
  $(".ib", scanEl).onclick = stop;
  try { scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false }); }
  catch (e) { msg.textContent = "No se pudo abrir la cámara. Revisa el permiso del navegador o usa un lector USB."; return; }
  video.srcObject = scanStream; await video.play().catch(() => {});
  msg.textContent = "Buscando un código QR…";
  let det = null; if ("BarcodeDetector" in window) { try { det = new BarcodeDetector({ formats: ["qr_code"] }); } catch (e) {} }
  if (!det && !window.QRDec) { await F.load("assets/qrdec.js", "QRDec").catch(() => {}); }
  const cv = document.createElement("canvas"), cx = cv.getContext("2d", { willReadFrequently: true }); let busy = false, last = 0;
  const loop = async (t) => {
    if (!scanEl) return; scanRaf = requestAnimationFrame(loop);
    if (busy || t - last < 160 || video.readyState < 2) return; busy = true; last = t;
    try {
      let txt = null;
      if (det) { const r = await det.detect(video); if (r.length) txt = r[0].rawValue; }
      else if (window.QRDec) { const w = 640, hh = Math.round((video.videoHeight / video.videoWidth) * w) || 480; cv.width = w; cv.height = hh; cx.drawImage(video, 0, 0, w, hh); const d = cx.getImageData(0, 0, w, hh); txt = window.QRDec.decode({ data: d.data, width: w, height: hh }); }
      if (txt) { stop(); S.handleCode(String(txt)); }
    } catch (e) {}
    busy = false;
  };
  scanRaf = requestAnimationFrame(loop);
};
/* lector de código por USB/Bluetooth: escribe muy rápido y termina con Enter */
let kb = "", kbT = 0;
addEventListener("keydown", (e) => {
  const tg = e.target; const typing = tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.isContentEditable);
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  const now = performance.now();
  if (e.key === "Enter") { if (kb.length >= 4 && now - kbT < 80) { e.preventDefault(); S.handleCode(kb); } kb = ""; return; }
  if (e.key.length === 1) { kb = now - kbT > 80 ? e.key : kb + e.key; kbT = now; }
}, true);

/* ================= ATAJOS ================= */
function shortcuts() {
  U.modal({ title: "Atajos de teclado", body: `<div class="keys">${[["Ctrl K  o  /", "Buscar o preguntar"], ["g  i", "Inicio"], ["g  l", "Lista completa"], ["g  r", "Resguardantes"], ["g  a", "Áreas"], ["g  v", "En vivo"], ["g  n", "Análisis"], ["g  s", "Salud de los datos"], ["g  e", "Etiquetas QR"], ["g  m", "Importar Excel"], ["g  b", "Bitácora"], ["↑ ↓  Enter", "Moverse y abrir en las listas"], ["Espacio", "Seleccionar en la lista"], ["Esc", "Cerrar"], ["?", "Esta ayuda"]].map(([k, v]) => `<span>${k.split("  ").map((x) => U.kbd(x)).join(" ")}</span><span>${esc(v)}</span>`).join("")}</div><p class="muted">Con un lector de códigos USB puedes escanear un marbete en cualquier pantalla y se abre su ficha.</p>`, actions: [{ label: "Entendido", kind: "pri", value: "x" }] });
}
S.shortcuts = shortcuts;
let gKey = 0;
addEventListener("keydown", (e) => {
  if (!S.entered) return;
  const tg = e.target; const typing = tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.tagName === "SELECT" || tg.isContentEditable);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); S.openPal(); return; }
  if (typing || document.querySelector("dialog[open]")) return;
  if (e.key === "/") { e.preventDefault(); const v = U.current(); if (v && v.focusSearch) v.focusSearch(); else S.openPal(); return; }
  if (e.key === "?") { shortcuts(); return; }
  if (e.key === "g") { gKey = Date.now(); return; }
  if (Date.now() - gKey < 900) { const m = { i: "inicio", l: "lista", r: "resguardantes", a: "areas", v: "vivo", n: "analisis", s: "salud", e: "etiquetas", m: "importar", b: "historial", j: "ajustes" }[e.key]; gKey = 0; if (m) { e.preventDefault(); U.go("#/" + m); } }
});

/* ================= ARRANQUE ================= */
function hideBoot() { const b = $("#boot"); if (b && !b.classList.contains("out")) { b.classList.add("out"); setTimeout(() => b.remove(), 600); } }
let rendered = false;
function firstRender() { if (rendered) return; rendered = true; hideBoot(); S.badges(); S.syncPill(); U.render({ instant: true }); }
async function enterApp() {
  S.entered = true;
  buildShell(); $("#shell").hidden = false;
  $("#bootMsg") && ($("#bootMsg").textContent = "Abriendo el inventario…");
  D.on((k) => {
    if (k === "ready") firstRender();
    if (k === "sync" || k === "net") S.syncPill();
    if (k === "inv" || k === "marcas" || k === "fotos" || k === "cambios") {
      if (!rendered && D.items.length) { firstRender(); return; }
      S.badges(); const v = U.current(); if (v && v.update) { try { v.update(k); } catch (e) { console.error(e); } }
      S.refreshItem();
    }
    if (k === "auth-lost") S.showLogin("Tu sesión venció. Entra de nuevo para seguir; no se perdió nada de lo que ya estaba guardado.");
  });
  addEventListener("hashchange", () => { if (rendered) { S.closeItem(); U.render(); } });
  try { await D.boot(); firstRender(); }
  catch (e) {
    if (e.code === "unauthenticated") return;
    if (!rendered) { hideBoot(); $("#view").innerHTML = ""; $("#view").appendChild(h(`<div class="pnl" style="max-width:560px;margin:10vh auto">${U.empty("refresh", "No se pudo cargar el inventario", D.errMsg(e), `<button class="btn pri" type="button" onclick="location.reload()">Intentar de nuevo</button>`)}</div>`)); }
  }
  F.preload();
}
S.start = async () => {
  initLogin();
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("/portal-sw.js", { scope: "/" }).catch(() => {});
  if (!D.session()) { S.showLogin(); return; }
  try { await D.checkMe(); }
  catch (e) { if (e.code === "unauthenticated") { S.showLogin(); return; } }
  enterApp();
};
window.S = S;
})();
