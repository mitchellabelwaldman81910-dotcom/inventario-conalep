/* Portal de inventario CONALEP · Centro de ayuda, recorrido de bienvenida y ayuda en la paleta */
(() => {
"use strict";
const { $, $$, esc, h, icon } = U;
const AY = window.AYUDA || { flujo: [], app: [], portal: [], faq: [], glosario: [], atajos: [] };
const IC = { scan: "qr", note: "edit", flag: "check", cloud: "upload", act: "pulse", more: "gear", install: "phone", box: "tag", user: "person", send: "upload", list: "list", logout: "logout" };
const ic = (k) => icon(IC[k] || k);
const strip = (t) => String(t || "").replace(/<[^>]+>/g, " ");
const nrm = (s) => B.norm(strip(s));
/* qué tema de ayuda corresponde a cada pantalla (botón «?» de arriba) */
const SCREEN = { inicio: "inicio", lista: "lista", resguardantes: "resguardantes", resguardante: "resguardantes", areas: "areas", vivo: "vivo", analisis: "analisis", salud: "salud", etiquetas: "etiquetas", importar: "importar", historial: "bitacora", ajustes: "ajustes", articulo: "ficha", ayuda: "inicio" };
S.helpFor = (name) => "#/ayuda/" + (SCREEN[name] || "inicio");

/* ---------- buscar en la ayuda (también lo usa la paleta Ctrl K) ---------- */
const all = () => [
  ...AY.portal.map((t) => ({ ...t, tab: "portal", key: t.id, tag: "Portal", hay: nrm([t.t, t.q, t.kw, ...(t.pasos || []), ...(t.tips || [])].join(" ")) })),
  ...AY.app.map((t) => ({ ...t, tab: "app", key: "a-" + t.id, tag: "App de celular", hay: nrm([t.t, t.q, t.kw, ...(t.pasos || []), ...(t.tips || [])].join(" ")) })),
];
S.helpHits = (q, n = 3) => {
  const w = B.norm(q).split(" ").filter((x) => x.length > 2 && !["como", "donde", "para", "que", "los", "las", "una", "uno", "del", "con", "por", "hago", "puedo", "hacer"].includes(x));
  if (!w.length) return [];
  const st = (x) => (x.length > 5 ? x.slice(0, x.length - 2) : x.length > 4 ? x.slice(0, 4) : x); // «importo» ≈ «importar»
  return all().map((t) => ({ t, s: w.reduce((a, x) => { const y = st(x); return a + (nrm(t.t).includes(y) ? 3 : 0) + (nrm(t.kw).includes(y) ? 2 : 0) + (t.hay.includes(y) ? 1 : 0); }, 0) })).filter((x) => x.s >= Math.max(2, w.length)).sort((a, b) => b.s - a.s).slice(0, n).map((x) => x.t);
};

const topic = (t) => `<details class="hq" id="h-${t.key}" data-k="${t.key}"><summary><span class="hq-i">${ic(t.i)}</span><span class="hq-t"><b>${t.t}</b><small>${t.q}</small></span>${t.tag ? `<em class="hq-tag">${t.tag}</em>` : ""}${icon("right", "ch")}</summary>
  <div class="hq-b"><ol>${(t.pasos || []).map((p) => `<li>${p}</li>`).join("")}</ol>${t.tips && t.tips.length ? `<div class="hq-tips">${icon("spark")}<ul>${t.tips.map((p) => `<li>${p}</li>`).join("")}</ul></div>` : ""}</div></details>`;
const faqH = (f, i) => `<details class="hq faq" id="h-f${i}"><summary><span class="hq-i q">?</span><span class="hq-t"><b>${f.q}</b></span>${icon("right", "ch")}</summary><div class="hq-b"><p>${f.a}</p></div></details>`;

U.route("ayuda", (r) => {
  const el = h(`<div class="hlp-wrap"></div>`);
  let tab = /^a-/.test(r.param) || r.param === "app" ? "app" : "portal", q = "";
  const want = r.param && r.param !== "app" ? r.param : "";
  const draw = () => {
    const list = all(), words = B.norm(q).split(" ").filter(Boolean);
    const hit = (txt) => !words.length || words.every((w) => nrm(txt).includes(w));
    const topics = words.length ? list.filter((t) => words.every((w) => t.hay.includes(w))) : list.filter((t) => t.tab === tab);
    const faq = AY.faq.map((f, i) => ({ f, i })).filter(({ f }) => (words.length ? hit(f.q + " " + f.a) : f.w === "ambos" || f.w === tab));
    const glo = AY.glosario.filter(([a, b]) => hit(a + " " + b));
    $("#hlBody", el).innerHTML = `
      ${words.length ? `<div class="hl-res">${topics.length + faq.length + glo.length ? `Resultados para <b>«${esc(q)}»</b>` : ""}</div>` : ""}
      ${topics.length ? `<section id="h-temas"><div class="hl-sec"><h2>${words.length ? "Temas" : tab === "portal" ? "Temas del portal web" : "Temas de la app de celular"}</h2><span>${topics.length}</span></div><div class="hl-list">${topics.map((t) => topic(words.length ? t : { ...t, tag: "" })).join("")}</div></section>` : ""}
      ${faq.length ? `<section id="h-faq"><div class="hl-sec"><h2>Preguntas frecuentes</h2><span>${faq.length}</span></div><div class="hl-list">${faq.map(({ f, i }) => faqH(f, i)).join("")}</div></section>` : ""}
      ${glo.length ? `<section id="h-glosario"><div class="hl-sec"><h2>Palabras que verás</h2></div><dl class="hl-glo">${glo.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl></section>` : ""}
      ${!words.length && tab === "portal" ? `<section id="h-atajos"><div class="hl-sec"><h2>Atajos de teclado</h2></div><div class="pnl"><div class="keys">${AY.atajos.map(([k, d]) => `<span>${k.split(/\s{2,}/).map((x) => (x === "o" ? " o " : `<kbd>${esc(x.trim())}</kbd>`)).join(" ")}</span><span>${esc(d)}</span>`).join("")}</div></div></section>` : ""}
      ${!topics.length && !faq.length && !glo.length ? U.empty("search", "No encontré «" + q + "»", "Prueba con otra palabra, por ejemplo: etiquetas, importar, trasladar, respaldo, foto, escanear.") : ""}`;
    $$(".seg button", el).forEach((b) => b.classList.toggle("on", b.dataset.t === tab));
    $("#hlTabs", el).hidden = !!words.length;
    $$(".hlp-toc a[data-k]", el).forEach((a) => (a.hidden = !!words.length && a.dataset.k !== "temas"));
    U.anim && U.anim($("#hlBody", el));
  };
  el.innerHTML = `<header class="vh"><div><h1>Centro de ayuda</h1><p>Cómo funciona todo el inventario, explicado paso a paso. Busca una palabra o abre un tema.</p></div><div class="acts"><button class="btn" type="button" id="hlTour">${icon("spark")}<span>Recorrido de bienvenida</span></button><button class="btn" type="button" id="hlPrint">${icon("print")}<span>Imprimir la guía</span></button></div></header>
    <section class="hl-hero"><div class="hl-hero-t"><h2>Revisar el inventario son 4 pasos</h2><p>Lo mismo en la computadora y en el celular. En el celular se hace caminando y escaneando los QR; aquí se controla, se corrige y se imprimen los documentos.</p></div>
      <ol class="hl-flow">${AY.flujo.map((f) => `<li><span class="n">${f.n}</span><div><b>${f.t}</b><p>${f.d}</p></div></li>`).join("")}</ol></section>
    <div class="hl-search">${icon("search")}<input id="hlQ" type="search" placeholder="Busca en la ayuda: etiquetas, importar, trasladar, respaldo…" autocomplete="off" aria-label="Buscar en la ayuda"></div>
    <div class="hl-tabs" id="hlTabs"><div class="seg" role="tablist"><button type="button" data-t="portal" role="tab">${icon("home")}Portal web</button><button type="button" data-t="app" role="tab">${icon("phone")}App de celular</button></div></div>
    <div class="hlp"><nav class="hlp-toc" aria-label="Índice de la ayuda"><a data-k="temas" href="#h-temas">Temas</a><a data-k="faq" href="#h-faq">Preguntas frecuentes</a><a data-k="glosario" href="#h-glosario">Palabras que verás</a><a data-k="atajos" href="#h-atajos">Atajos de teclado</a><hr><a href="/app/" target="_blank" rel="noopener">${icon("phone")}Abrir la app</a></nav><div class="hlp-main" id="hlBody"></div></div>`;
  el.addEventListener("click", (e) => {
    const t = e.target.closest(".seg button"); if (t) { tab = t.dataset.t; draw(); FX.play("tap"); return; }
    const a = e.target.closest(".hlp-toc a[href^='#h-']"); if (a) { e.preventDefault(); const d = $(a.getAttribute("href"), el); d && d.scrollIntoView({ behavior: FX.motion ? "smooth" : "auto", block: "start" }); return; }
    if (e.target.closest("#hlTour")) S.tour(true);
    else if (e.target.closest("#hlPrint")) S.printGuide();
  });
  el.addEventListener("input", (e) => { if (e.target.id === "hlQ") { q = e.target.value; draw(); } });
  draw();
  return { el, title: "Ayuda", after() {
    if (want) { const d = $("#h-" + CSS.escape(want), el); if (d) { d.open = true; setTimeout(() => d.scrollIntoView({ behavior: FX.motion ? "smooth" : "auto", block: "start" }), 120); } }
    else $$(".hq", el).slice(0, 0);
  }, focusSearch() { $("#hlQ", el).focus(); } };
});

/* ---------- guía completa para imprimir ---------- */
S.printGuide = () => {
  let box = $("#printGuide"); if (box) box.remove();
  const steps = (t) => `<div class="pg-t"><h3>${t.t}</h3><p class="pg-q">${t.q}</p><ol>${(t.pasos || []).map((p) => `<li>${p}</li>`).join("")}</ol>${t.tips && t.tips.length ? `<ul class="pg-tips">${t.tips.map((p) => `<li>${p}</li>`).join("")}</ul>` : ""}</div>`;
  box = h(`<div id="printGuide"><header><b>Inventario CONALEP Chetumal</b><span>Servicios Administrativos · Guía de uso · versión ${esc(AY.version)}</span></header>
    <h1>Cómo funciona el inventario</h1><p>Revisar el inventario son 4 pasos.</p><ol class="pg-flow">${AY.flujo.map((f) => `<li><b>${f.t}.</b> ${f.d}</li>`).join("")}</ol>
    <h2>Portal web (computadora)</h2>${AY.portal.map(steps).join("")}
    <h2>App de celular</h2>${AY.app.map(steps).join("")}
    <h2>Preguntas frecuentes</h2>${AY.faq.map((f) => `<div class="pg-t"><h3>${f.q}</h3><p>${f.a}</p></div>`).join("")}
    <h2>Palabras que verás</h2><dl>${AY.glosario.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl>
    <h2>Atajos de teclado</h2><table>${AY.atajos.map(([k, d]) => `<tr><td>${esc(k)}</td><td>${esc(d)}</td></tr>`).join("")}</table></div>`);
  document.body.appendChild(box);
  const clean = () => { box.remove(); removeEventListener("afterprint", clean); };
  addEventListener("afterprint", clean);
  setTimeout(() => window.print(), 80);
};

/* ---------- recorrido de bienvenida ---------- */
const TK = "cnlp_portal_tour";
const tourDone = () => { try { return localStorage.getItem(TK) === "1"; } catch (e) { return true; } };
const tourSet = () => { try { localStorage.setItem(TK, "1"); } catch (e) {} };
let tourEl = null;
S.tour = (force) => {
  if (tourEl) return;
  if (!force && tourDone()) return;
  const wide = innerWidth > 900;
  const steps = [
    { sel: wide ? "#side" : "#menuBtn", t: "Las secciones", d: wide ? "Aquí están todas las pantallas. <b>Inicio</b> resume todo, <b>Lista completa</b> tiene cada artículo y <b>Resguardantes</b> a cada persona." : "Con este botón abres las secciones: Inicio, Lista completa, Resguardantes, Áreas y más.", side: "right" },
    { sel: "#qbtn", t: "Busca o pregunta", d: "Escribe un nombre, un marbete o una pregunta como <i>«¿cuántas sillas tiene Irma?»</i>. Atajo: <kbd>Ctrl</kbd> + <kbd>K</kbd>.", side: "bottom" },
    { sel: ".board", t: "Todo el inventario en un mosaico", d: "Cada cuadrito es un artículo. Cambia el color para ver la revisión, el estado, el valor o la antigüedad.", side: "top", only: "inicio" },
    { sel: "#sync", t: "¿Está al día?", d: "Aquí ves si los datos están actualizados. Púlsalo para actualizar al momento.", side: "bottom" },
    { sel: "#helpBtn", t: "Cuando tengas dudas", d: "Este botón abre la ayuda de la pantalla donde estés, con pasos cortos.", side: "bottom" },
    { sel: wide ? "#helpNav" : "#menuBtn", t: "Y la guía completa", d: "En <b>Ayuda</b> está todo explicado: el portal, la app de celular, preguntas frecuentes y hasta una guía para imprimir.", side: "right" },
  ].filter((s) => (!s.only || U.parse().name === s.only));
  let i = -1;
  tourEl = h(`<div class="tour" role="dialog" aria-label="Recorrido de bienvenida"><div class="tour-hl"></div><div class="tour-card"><div class="tour-n"></div><h3></h3><p></p><div class="tour-b"><button class="btn ghost sm" type="button" data-t="skip">Saltar</button><span></span><button class="btn sm" type="button" data-t="prev">Atrás</button><button class="btn pri sm" type="button" data-t="next">Siguiente</button></div></div></div>`);
  document.body.appendChild(tourEl);
  const hl = $(".tour-hl", tourEl), card = $(".tour-card", tourEl);
  const end = () => { tourSet(); removeEventListener("resize", place); removeEventListener("keydown", key, true); if (!tourEl) return; tourEl.classList.add("out"); const t = tourEl; tourEl = null; setTimeout(() => t.remove(), 260); };
  function place() {
    const s = steps[i]; if (!s) return;
    const t = $(s.sel); const r = t && t.getBoundingClientRect();
    if (!r || !r.width) { hl.style.opacity = "0"; card.style.left = "50%"; card.style.top = "50%"; card.style.transform = "translate(-50%,-50%)"; return; }
    const pad = 6; hl.style.opacity = "1";
    hl.style.cssText = `opacity:1;left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
    const cw = Math.min(340, innerWidth - 24); card.style.width = cw + "px"; card.style.transform = "";
    const ch = card.offsetHeight; let x, y;
    if (s.side === "right" && r.right + 16 + cw < innerWidth) { x = r.right + 16; y = Math.max(12, Math.min(innerHeight - ch - 12, r.top + 24)); }
    else if (s.side === "top" && r.top > ch + 40) { x = Math.max(12, Math.min(innerWidth - cw - 12, r.left + 20)); y = Math.max(12, r.top - ch - 16); }
    else { x = Math.max(12, Math.min(innerWidth - cw - 12, r.left)); y = Math.min(innerHeight - ch - 12, r.bottom + 16); if (y < r.bottom + 4 && r.top > ch + 30) y = r.top - ch - 16; }
    card.style.left = x + "px"; card.style.top = y + "px";
  }
  const show = (k) => {
    i = k; const s = steps[i];
    const t = $(s.sel); if (t && (t.getBoundingClientRect().top < 0 || t.getBoundingClientRect().bottom > innerHeight)) t.scrollIntoView({ block: "center" });
    $(".tour-n", tourEl).textContent = `${i + 1} de ${steps.length}`;
    $("h3", card).textContent = s.t; $("p", card).innerHTML = s.d;
    $('[data-t="prev"]', card).hidden = i === 0; $('[data-t="next"]', card).textContent = i === steps.length - 1 ? "Entendido" : "Siguiente";
    card.classList.remove("in"); void card.offsetWidth; card.classList.add("in");
    place(); FX.play("tap");
  };
  const key = (e) => { if (e.key === "Escape") { e.stopPropagation(); end(); } else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); i < steps.length - 1 ? show(i + 1) : end(); } else if (e.key === "ArrowLeft" && i > 0) { e.stopPropagation(); show(i - 1); } };
  tourEl.addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (!b) return; if (b.dataset.t === "skip") end(); else if (b.dataset.t === "prev") show(i - 1); else if (i < steps.length - 1) show(i + 1); else end(); });
  addEventListener("resize", place); addEventListener("keydown", key, true);
  show(0);
};
/* errores inesperados: aviso amable en vez de fallar en silencio */
let lastErrAt = 0;
const oops = (m) => {
  m = String(m || ""); if (!m || /^Script error|ResizeObserver|AbortError|aborted|Failed to fetch|NetworkError|Load failed/i.test(m)) return;
  console.error("[portal]", m);
  if (Date.now() - lastErrAt < 20000) return; lastErrAt = Date.now();
  U.toast("Algo no salió como debía. Tus datos están a salvo; si se repite, recarga la página (F5).", { kind: "err" });
};
window.addEventListener("error", (e) => oops(e.message));
window.addEventListener("unhandledrejection", (e) => { const r = e.reason; if (r && (r.net || r.auth)) return; oops(r?.message || r); });
S.maybeTour = () => { if (tourDone()) return; setTimeout(() => { if (document.querySelector("dialog[open]")) return; S.tour(); }, 1400); };
})();
