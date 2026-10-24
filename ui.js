/* Portal de inventario CONALEP · piezas de la interfaz: rutas, íconos, avisos, ventanas, paleta de comandos,
   tabla virtual, mosaico del inventario, gráficas y ficha lateral de cada artículo. */
(() => {
"use strict";
const U = {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
U.$ = $; U.$$ = $$; U.esc = esc;
U.h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); const f = document.importNode(t.content, true); return f.childElementCount === 1 ? f.firstElementChild : f; };
U.debounce = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };

/* ---------- ajustes del usuario ---------- */
const SK = "cnlp_portal_set";
U.set = Object.assign({ theme: "auto", sound: true, motion: true, raw: false, label: 50, density: "normal", mosaic: "inv", mgroup: "rc" }, (() => { try { return JSON.parse(localStorage.getItem(SK) || "{}"); } catch (e) { return {}; } })());
U.saveSet = () => { try { localStorage.setItem(SK, JSON.stringify(U.set)); } catch (e) {} applySet(); };
function applySet() {
  const r = document.documentElement;
  if (U.set.theme === "dark" || U.set.theme === "light") r.setAttribute("data-theme", U.set.theme); else r.removeAttribute("data-theme");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  FX.sound = !!U.set.sound; FX.vib = false; FX.motion = !!U.set.motion && !reduce;
  r.classList.toggle("lessmo", !FX.motion); r.classList.toggle("dense", U.set.density === "compact");
}
applySet();
U.txt = (s) => (U.set.raw ? String(s ?? "") : B.smart(s));
U.nm = (s) => (U.set.raw ? String(s ?? "") : s === D.SIN ? "Sin resguardante" : B.title(s));
U.isDark = () => { const t = document.documentElement.getAttribute("data-theme"); return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
U.css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/* ---------- íconos (trazo de 1.8 sobre 24) ---------- */
const P = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  people: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.25 3.25 0 0 1 0 6.2",
  person: "M18 20v-1.5a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4V20M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7",
  map: "M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4ZM9 4v13.5M15 6.5V20",
  pulse: "M3 12h4l2.5-6 4 12 2.5-6H21",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  shield: "M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3ZM8.5 12l2.5 2.5 4.5-5",
  tag: "M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9-9-9ZM7.5 7.5h.01",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 20h1M20 14v1M7 7h.01M17 7h.01M7 17h.01",
  upload: "M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15",
  download: "M12 4v11M7.5 10.5 12 15l4.5-4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
  search: "M11 18.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM21 21l-4.6-4.6",
  sun: "M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z",
  x: "M6 6l12 12M18 6 6 18",
  check: "M4.5 12.5 9.5 17.5 19.5 6.5",
  plus: "M12 5v14M5 12h14",
  edit: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4",
  swap: "M7 7h12l-3.5-3.5M17 17H5l3.5 3.5",
  camera: "M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2.5h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9ZM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7",
  image: "M4.5 4h15A1.5 1.5 0 0 1 21 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-13A1.5 1.5 0 0 1 4.5 4ZM3 16l5-5 5 5 3-3 5 5M15.5 9h.01",
  file: "M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8l-5-5ZM14 3v5h5",
  sheet: "M5 3h14v18H5zM5 9h14M5 15h14M11 3v18",
  print: "M7 9V3h10v6M7 18H5.5A1.5 1.5 0 0 1 4 16.5v-5A1.5 1.5 0 0 1 5.5 10h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17M7 14h10v7H7z",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  down: "M6 9l6 6 6-6",
  filter: "M3 5h18l-7 8v6l-4 2v-8L3 5Z",
  cols: "M4 4h16v16H4zM9.5 4v16M14.5 4v16",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  logout: "M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 8l-4 4 4 4M6 12h10",
  phone: "M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM11 18h2",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z",
  mic: "M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15ZM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21",
  speaker: "M4 9.5v5h3.5L12 19V5L7.5 9.5H4ZM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11",
  copy: "M9 9h10.5v10.5H9zM15 9V4.5H4.5V15H9",
  archive: "M3 4h18v4H3zM5 8v11.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8M10 12h4",
  pin: "M12 21s-7-6.1-7-11.5a7 7 0 1 1 14 0C19 14.9 12 21 12 21ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  wrench: "M14.5 6.5a4 4 0 0 0-5.3 5.3L3.5 17.5l3 3 5.7-5.7a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01",
  hourglass: "M6 3h12M6 21h12M7 3v3.5a5 5 0 0 0 10 0V3M7 21v-3.5a5 5 0 0 1 10 0V21",
  undo: "M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11",
  trash: "M4 7h16M10 11v6M14 11v6M5.5 7l1 12.5A1.5 1.5 0 0 0 8 21h8a1.5 1.5 0 0 0 1.5-1.5L18.5 7M9 7V4h6v3",
  refresh: "M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  ext: "M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10",
  menu: "M4 7h16M4 12h16M4 17h16",
  stack: "M12 3 3 7.5l9 4.5 9-4.5L12 3ZM3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5",
  key: "M15 9.5a5 5 0 1 1-2-4l7-.5v3.5h-2.5V11H15",
  sound: "M4 9.5v5h3.5L12 19V5L7.5 9.5H4ZM16 9l5 6M21 9l-5 6",
  zap: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  inbox: "M3 13h5l1.5 3h5L16 13h5M5.5 5h13L21 13v5.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V13l2.5-8Z",
  box: "M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8",
};
U.icon = (k, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[k] || P.help}"/></svg>`;
const MARKP = "M398.4 51.6L233.8 145.8L211.8 156.8L197.2 158.0L190.0 156.6L178.5 151.8L172.4 147.4L166.4 140.5L159.6 126.5L90.2 168.0L103.2 190.6L118.2 207.4L132.6 218.6L151.6 228.6L166.0 233.8L184.8 237.9L211.6 237.9L240.8 230.6L264.8 218.6L378.6 151.9ZM308.8 69.5L297.9 51.1L281.8 32.5L263.1 18.1L240.0 6.5L215.9 0.6L189.5 0.0L180.0 1.1L155.6 8.2L131.6 20.2L20.0 84.0L0.0 186.8L186.6 80.1L200.9 77.9L208.4 79.0L217.1 82.4L223.9 87.0L232.1 96.1L236.8 104.2L239.1 112.0L307.8 72.1Z";
U.mark = (cls = "") => `<svg class="${cls}" viewBox="0 0 398 238" aria-hidden="true"><path fill="currentColor" d="${MARKP}"/></svg>`;

/* ---------- piezas pequeñas ---------- */
const AV = ["#0F6E5A", "#3D6B8E", "#8A5A2B", "#6B4E8E", "#2F7D7A", "#8E3D52", "#5B7A2E", "#7A6A2F", "#45607A", "#7E4A6B"];
U.avatar = (name, cls = "") => { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `<span class="av ${cls}" style="--av:${AV[h % AV.length]}" aria-hidden="true">${esc(name === D.SIN ? "–" : B.initials(name))}</span>`; };
U.stamp = (m, cls = "", short) => {
  if (!m) return `<span class="stamp pend ${cls}">Pendiente</span>`;
  if (m.e === "no") return `<span class="stamp no ${cls}">No está</span>`;
  const c = m.c === "M" ? "malo" : m.c === "R" ? "regular" : "";
  return `<span class="stamp si ${m.c === "M" ? "c-m" : m.c === "R" ? "c-r" : ""} ${cls}">${short && c ? cap1(c) : "Presente" + (c ? " · " + c : "")}</span>`;
};
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
U.ring = (pct, { size = 64, sw = 7, label, cls = "" } = {}) => {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct || 0));
  return `<span class="ring ${cls} ${p ? "" : "zero"}" style="--s:${size}px"><svg viewBox="0 0 ${size} ${size}"><circle class="bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}"/><circle class="fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" pathLength="100" stroke-dasharray="100" style="stroke-dashoffset:100" data-p="${p}"/></svg>${label !== undefined ? `<b>${label}</b>` : ""}</span>`;
};
U.kbd = (k) => `<kbd>${esc(k)}</kbd>`;
U.empty = (icon, title, text, btn) => `<div class="empty">${U.icon(icon, "big")}<b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ""}${btn || ""}</div>`;
U.anim = (root) => { if (!root) return; FX.fill(root); FX.countAll(root); };
U.copy = async (t) => { try { await navigator.clipboard.writeText(t); U.toast("Copiado.", { kind: "ok" }); } catch (e) { U.toast("No se pudo copiar.", { kind: "err" }); } };

/* ---------- avisos ---------- */
U.toast = (msg, o = {}) => {
  const host = $("#toasts");
  const t = U.h(`<div class="toast ${o.kind || ""}" role="status">${U.icon(o.kind === "err" ? "x" : o.kind === "ok" ? "check" : o.icon || "zap")}<span>${esc(msg)}</span>${o.action ? `<button class="btn ghost sm" type="button">${esc(o.action.label)}</button>` : ""}<i class="tbar"></i></div>`);
  const ms = o.ms || (o.kind === "err" ? 7000 : o.action ? 8000 : 3800);
  t.style.setProperty("--ms", ms + "ms");
  const close = () => { t.classList.add("out"); setTimeout(() => t.remove(), 260); };
  if (o.action) t.querySelector("button").onclick = () => { close(); o.action.fn(); };
  host.appendChild(t); while (host.children.length > 4) host.firstElementChild.remove();
  const tm = setTimeout(close, ms); t.onmouseenter = () => { clearTimeout(tm); t.classList.add("hold"); }; t.onmouseleave = () => setTimeout(close, 2000);
  if (o.kind === "err") FX.hit("err"); else if (o.sound !== false && o.kind === "ok") FX.play("soft");
  return t;
};
U.fail = (e) => U.toast(D.errMsg(e), { kind: "err" });

/* ---------- ventanas ---------- */
U.modal = ({ title, body, actions = [], wide, cls = "", onOpen }) => new Promise((res) => {
  const d = U.h(`<dialog class="modal ${wide ? "wide" : ""} ${cls}"><div class="m-in"><header class="m-h"><h2>${esc(title)}</h2><button class="ib" type="button" data-x aria-label="Cerrar">${U.icon("x")}</button></header><div class="m-b"></div>${actions.length ? `<footer class="m-f"></footer>` : ""}</div></dialog>`);
  d.querySelector("[data-x]").onclick = () => { d._v = ""; d.close(); };
  const b = d.querySelector(".m-b"); if (typeof body === "string") b.innerHTML = body; else if (body) b.appendChild(body);
  const f = d.querySelector(".m-f");
  let primary = null;
  actions.forEach((a) => { const x = U.h(`<button class="btn ${a.kind || ""}" type="button" value="${esc(a.value || "")}">${a.icon ? U.icon(a.icon) : ""}<span>${esc(a.label)}</span></button>`); x.onclick = async (e) => { e.preventDefault(); if (a.fn) { x.disabled = true; let r; try { r = await a.fn(d, x); } finally { x.disabled = false; } if (r !== false) { d._v = r ?? a.value; d.close(); } } else { d._v = a.value; d.close(); } }; f.appendChild(x); if (a.kind === "pri") primary = x; });
  d.addEventListener("keydown", (e) => { if (e.key === "Enter" && primary && e.target.tagName === "INPUT" && !e.target.closest("[data-own-enter]")) { e.preventDefault(); primary.click(); } });
  document.body.appendChild(d);
  d.addEventListener("close", () => { res(d._v); setTimeout(() => d.remove(), 300); });
  d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
  d.showModal(); FX.play("whoosh"); onOpen && onOpen(d);
});
U.confirm = (title, text, ok = "Confirmar", danger) => U.modal({ title, body: `<p class="lead">${esc(text)}</p>`, actions: [{ label: "Cancelar", kind: "ghost", value: "" }, { label: ok, kind: danger ? "danger" : "pri", value: "ok" }] }).then((v) => v === "ok");

/* ---------- elegir resguardante (con sugerencias y corrección de nombres) ---------- */
U.pickPerson = ({ title = "Trasladar a…", text = "", exclude = "", ok = "Trasladar" } = {}) => new Promise((res) => {
  const names = B.names().filter((n) => n !== exclude);
  const body = U.h(`<div class="pick"><p class="muted">${esc(text)}</p><label class="fld"><span>Nuevo resguardante</span><input type="text" autocomplete="off" placeholder="Escribe un nombre" autofocus></label><ul class="pick-l" role="listbox"></ul><p class="pick-w" hidden></p></div>`);
  const inp = body.querySelector("input"), ul = body.querySelector("ul"), warn = body.querySelector(".pick-w");
  let val = "";
  const draw = () => {
    const q = B.norm(inp.value); val = inp.value.trim().toUpperCase().replace(/\s+/g, " ");
    const scored = names.map((n) => { const k = B.norm(n); let s = 0; if (!q) s = 1; else if (k.startsWith(q)) s = 3; else if (k.includes(q)) s = 2; else if (q.split(" ").every((w) => k.includes(w))) s = 1.5; else if (q.length > 4 && B.dl(q, k.slice(0, q.length), 2) <= 2) s = 1; return [n, s]; }).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")).slice(0, 8);
    ul.innerHTML = scored.map(([n]) => `<li><button type="button" class="pick-o" data-n="${esc(n)}">${U.avatar(n, "sm")}<span>${esc(U.nm(n))}</span><small>${B.int(B.peopleMap().get(n)?.length || 0)}</small></button></li>`).join("");
    const exists = names.includes(val);
    warn.hidden = !val || exists; warn.textContent = `«${val}» no existe todavía. Si es una persona nueva, revisa que esté bien escrito y confirma.`;
  };
  inp.addEventListener("input", draw); draw();
  ul.addEventListener("click", (e) => { const b = e.target.closest(".pick-o"); if (b) { inp.value = b.dataset.n; draw(); } });
  U.modal({ title, body, actions: [{ label: "Cancelar", kind: "ghost", value: "" }, { label: ok, kind: "pri", icon: "swap", fn: () => { if (!val) { inp.focus(); return false; } return val; } }], onOpen: () => setTimeout(() => inp.focus(), 60) }).then((v) => res(v || ""));
});

/* ---------- información flotante ---------- */
const tipEl = () => $("#tip");
U.tipShow = (html, x, y) => { const t = tipEl(); t.innerHTML = html; t.hidden = false; const r = t.getBoundingClientRect(); let L = x + 14, T = y + 14; if (L + r.width > innerWidth - 8) L = x - r.width - 14; if (T + r.height > innerHeight - 8) T = y - r.height - 14; t.style.transform = `translate(${Math.max(8, L)}px,${Math.max(8, T)}px)`; };
U.tipHide = () => { const t = tipEl(); if (t) t.hidden = true; };
document.addEventListener("pointermove", (e) => { const el = e.target.closest?.("[data-tip]"); if (el) U.tipShow(el.getAttribute("data-tip"), e.clientX, e.clientY); else if (!e.target.closest?.("canvas.mos")) U.tipHide(); }, { passive: true });
document.addEventListener("scroll", U.tipHide, { passive: true, capture: true });

/* ---------- rutas ---------- */
U.routes = {};
U.route = (name, fn) => { U.routes[name] = fn; };
U.parse = () => {
  const h = location.hash;
  if (/^#m[A-Za-z0-9]+$/.test(h)) return { name: "articulo", param: h.slice(1), q: {} };
  if (h === "#rapido") return { name: "lista", param: "", q: {} };
  const m = /^#\/([^/?]*)\/?([^?]*)(?:\?(.*))?$/.exec(h) || [];
  return { name: m[1] || "inicio", param: m[2] ? decodeURIComponent(m[2]) : "", q: Object.fromEntries(new URLSearchParams(m[3] || "")) };
};
let cur = null, curName = "";
U.current = () => cur;
U.render = (opts = {}) => {
  const r = U.parse(); const fn = U.routes[r.name] || U.routes.inicio;
  const same = curName === r.name && !opts.force;
  const swap = () => {
    try { cur && cur.destroy && cur.destroy(); } catch (e) { console.error(e); }
    const view = $("#view"); view.innerHTML = ""; view.className = "view v-" + r.name;
    try { cur = fn(r) || {}; } catch (e) { console.error(e); cur = { el: U.h(U.empty("help", "Algo salió mal al abrir esta sección", String(e.message || e))) }; }
    curName = r.name;
    if (cur.el) view.appendChild(cur.el);
    U.navMark(r.name); document.title = (cur.title ? cur.title + " · " : "") + "Inventario CONALEP";
    if (!same) { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
    requestAnimationFrame(() => U.anim(view));
    cur.after && requestAnimationFrame(() => cur.after());
    closeSide();
  };
  if (document.startViewTransition && FX.motion && !same && !opts.instant) document.startViewTransition(swap); else swap();
};
U.go = (hash) => { if (location.hash === hash) U.render({ force: true }); else location.hash = hash; };
U.navMark = (name) => { const map = { resguardante: "resguardantes", articulo: "lista" }; const k = map[name] || name; $$(".nv").forEach((a) => a.classList.toggle("on", a.dataset.k === k)); };
const closeSide = () => document.body.classList.remove("side-open");

/* ---------- tabla virtual (miles de filas sin trabarse) ---------- */
U.vtable = ({ cols, rowH = 46, onOpen, select, sortKey, sortDir = 1, onSort, empty = "Sin resultados", cls = "" }) => {
  const el = U.h(`<div class="vt ${cls}" role="grid"><div class="vt-h" role="row"></div><div class="vt-b" tabindex="0"><div class="vt-sp"></div><div class="vt-win"></div><div class="vt-empty" hidden></div></div></div>`);
  const head = $(".vt-h", el), body = $(".vt-b", el), sp = $(".vt-sp", el), win = $(".vt-win", el), emp = $(".vt-empty", el);
  let rows = [], active = -1, lastSel = -1; const sel = select || null;
  const tpl = (select ? "36px " : "") + cols.map((c) => c.w || "1fr").join(" ");
  el.style.setProperty("--cols", tpl); el.style.setProperty("--rh", rowH + "px");
  const drawHead = () => {
    head.innerHTML = (select ? `<label class="vt-c vt-ck"><input type="checkbox" aria-label="Seleccionar todo"></label>` : "") + cols.map((c, j) => `<button type="button" class="vt-c ${c.right ? "r" : ""} ${c.cls || ""} ${c.sort ? "srt" : ""} ${sortKey === c.k ? (sortDir > 0 ? "asc" : "desc") : ""}" data-j="${j}" ${c.sort ? "" : "tabindex=-1"}>${esc(c.h)}${c.sort ? U.icon("down", "si") : ""}</button>`).join("");
    if (select) { const ck = $("input", head); ck.checked = rows.length > 0 && rows.every((r) => sel.has(r.tok)); ck.indeterminate = !ck.checked && rows.some((r) => sel.has(r.tok)); ck.onchange = () => { if (ck.checked) rows.forEach((r) => sel.add(r.tok)); else rows.forEach((r) => sel.delete(r.tok)); paint(true); api.onSel && api.onSel(); }; }
  };
  head.addEventListener("click", (e) => { const b = e.target.closest(".srt"); if (!b) return; const c = cols[+b.dataset.j]; if (sortKey === c.k) sortDir = -sortDir; else { sortKey = c.k; sortDir = c.dir || 1; } FX.play("tap"); onSort && onSort(sortKey, sortDir); drawHead(); });
  let drawn = "";
  const paint = (force) => {
    const H = body.clientHeight || 600, st = body.scrollTop;
    const a = Math.max(0, Math.floor(st / rowH) - 6), z = Math.min(rows.length, Math.ceil((st + H) / rowH) + 6);
    const key = a + ":" + z + ":" + rows.length + ":" + active;
    if (!force && key === drawn) return; drawn = key;
    let html = "";
    for (let i = a; i < z; i++) {
      const r = rows[i];
      html += `<div class="vt-r ${i === active ? "act" : ""} ${sel && sel.has(r.tok) ? "sel" : ""} ${i % 2 ? "odd" : ""}" role="row" data-i="${i}" style="transform:translateY(${i * rowH}px)">` + (select ? `<label class="vt-c vt-ck"><input type="checkbox" ${sel.has(r.tok) ? "checked" : ""} tabindex="-1" aria-label="Seleccionar"></label>` : "") + cols.map((c) => `<div class="vt-c ${c.right ? "r" : ""} ${c.cls || ""}">${c.cell(r)}</div>`).join("") + `</div>`;
    }
    win.innerHTML = html;
    if (select) { const ck = $("input", head); if (ck) { ck.checked = rows.length > 0 && rows.every((r) => sel.has(r.tok)); ck.indeterminate = !ck.checked && rows.some((r) => sel.has(r.tok)); } }
  };
  body.addEventListener("scroll", () => paint(), { passive: true });
  new ResizeObserver(() => paint(true)).observe(body);
  win.addEventListener("click", (e) => {
    const rEl = e.target.closest(".vt-r"); if (!rEl) return; const i = +rEl.dataset.i, r = rows[i];
    if (e.target.closest(".vt-ck")) { e.preventDefault(); toggle(i, e.shiftKey); return; }
    if (e.target.closest("a,button")) return;
    active = i; paint(true); onOpen && onOpen(r, i);
  });
  const toggle = (i, range) => {
    if (!sel) return; const r = rows[i];
    if (range && lastSel >= 0) { const [x, y] = [Math.min(lastSel, i), Math.max(lastSel, i)]; const on = !sel.has(r.tok); for (let k = x; k <= y; k++) on ? sel.add(rows[k].tok) : sel.delete(rows[k].tok); }
    else sel.has(r.tok) ? sel.delete(r.tok) : sel.add(r.tok);
    lastSel = i; FX.play("tap"); paint(true); api.onSel && api.onSel();
  };
  body.addEventListener("keydown", (e) => {
    if (!rows.length) return;
    if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); active = Math.min(rows.length - 1, active + 1); ensure(); }
    else if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); active = Math.max(0, active - 1); ensure(); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); onOpen && onOpen(rows[active], active); }
    else if ((e.key === " " || e.key === "x") && active >= 0 && sel) { e.preventDefault(); toggle(active, e.shiftKey); }
    else if (e.key === "Home") { active = 0; ensure(); } else if (e.key === "End") { active = rows.length - 1; ensure(); }
  });
  const ensure = () => { const top = active * rowH, H = body.clientHeight; if (top < body.scrollTop) body.scrollTop = top; else if (top + rowH > body.scrollTop + H) body.scrollTop = top + rowH - H; paint(true); };
  const api = {
    el,
    set(list, keep) { rows = list; sp.style.height = rows.length * rowH + "px"; emp.hidden = rows.length > 0; emp.innerHTML = rows.length ? "" : typeof empty === "function" ? empty() : U.empty("search", empty, ""); if (!keep) { body.scrollTop = 0; active = -1; } drawHead(); paint(true); },
    refresh() { paint(true); },
    rows: () => rows,
    focus() { body.focus(); if (active < 0 && rows.length) { active = 0; paint(true); } },
    get sortKey() { return sortKey; }, get sortDir() { return sortDir; },
  };
  drawHead();
  return api;
};

/* ---------- mosaico: un cuadrito por artículo, agrupados ---------- */
function squarify(items, x, y, w, h) {
  const out = []; const total = items.reduce((s, it) => s + it.v, 0); if (!total || w <= 0 || h <= 0) return out;
  const area = w * h; const list = items.map((it) => ({ ...it, a: (it.v / total) * area }));
  let rx = x, ry = y, rw = w, rh = h; let row = [];
  const worst = (row, len) => { const s = row.reduce((a, r) => a + r.a, 0); const mx = Math.max(...row.map((r) => r.a)), mn = Math.min(...row.map((r) => r.a)); return Math.max((len * len * mx) / (s * s), (s * s) / (len * len * mn)); };
  const layout = (row) => {
    const s = row.reduce((a, r) => a + r.a, 0);
    if (rw >= rh) { const cw = s / rh; let cy = ry; for (const r of row) { const ch = r.a / cw; out.push({ ...r, x: rx, y: cy, w: cw, h: ch }); cy += ch; } rx += cw; rw -= cw; }
    else { const ch = s / rw; let cx = rx; for (const r of row) { const cw = r.a / ch; out.push({ ...r, x: cx, y: ry, w: cw, h: ch }); cx += cw; } ry += ch; rh -= ch; }
  };
  for (const it of list) { const len = Math.min(rw, rh); if (!row.length || worst(row.concat(it), len) <= worst(row, len)) row.push(it); else { layout(row); row = [it]; } }
  if (row.length) layout(row);
  return out;
}
U.squarify = squarify;
U.mosaic = ({ onItem, onGroup, height }) => {
  const el = U.h(`<div class="mos-w"><canvas class="mos" role="img" aria-label="Mosaico del inventario: cada cuadro es un artículo"></canvas></div>`);
  const cv = $("canvas", el); const ctx = cv.getContext("2d");
  let groups = [], colorOf = () => "#999", rects = [], p = 8, W = 0, H = 0, dpr = 1, hover = null, hoverG = null, t0 = 0, anim = 1, raf = 0, flash = new Map();
  const LABEL = 18;
  const fit = () => {
    W = el.clientWidth || 800; const N = groups.reduce((s, g) => s + g.items.length, 0) || 1;
    const wt = (v) => v + 1.7 * Math.sqrt(v) + 3; const Wt = groups.reduce((s, g) => s + wt(g.items.length), 0) || 1;
    const target = W < 600 ? 8 : 11;
    H = height || Math.max(260, Math.min(640, Math.round((Wt * target * target) / W * 1.08)));
    dpr = Math.min(2, devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + "px";
    const sorted = groups.map((g) => ({ g, v: wt(g.items.length), n: g.items.length })).sort((a, b) => b.v - a.v);
    rects = squarify(sorted, 0, 0, W, H);
    const capOf = (r, pp) => { const lab = r.w > 70 && r.h > LABEL + pp * 2 ? LABEL : 0; const cols = Math.max(1, Math.floor((r.w - 4) / pp)), rows = Math.max(0, Math.floor((r.h - 4 - lab) / pp)); return { lab, cols, rows, cap: cols * rows }; };
    // el tamaño de cuadro más grande con el que caben los grupos que suman al menos 85% de los artículos
    p = 3;
    for (let pp = Math.sqrt((W * H) / N); pp >= 3; pp -= 0.25) { let fitN = 0; for (const r of rects) if (capOf(r, pp).cap >= r.n) fitN += r.n; if (fitN >= N * 0.85) { p = pp; break; } }
    // los grupos chicos que no caben usan cuadros un poco más pequeños
    for (const r of rects) { let pp = p, c = capOf(r, pp); while (c.cap < r.n && pp > 2) { pp -= 0.25; c = capOf(r, pp); } Object.assign(r, c, { p: pp }); }
  };
  const draw = () => {
    const now = performance.now(); anim = FX.motion ? Math.min(1, (now - t0) / 1300) : 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const lab = U.css("--mos-lab") || "#cfe5dc", line = U.css("--mos-line") || "rgba(255,255,255,.12)";
    ctx.font = "600 11px Bricolage, system-ui, sans-serif"; ctx.textBaseline = "middle";
    const span = W + H * 0.6;
    for (const r of rects) {
      const g = r.g, dim = hoverG && hoverG !== r ? 0.28 : 1;
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w) - 1, Math.round(r.h) - 1);
      if (r.lab) { ctx.globalAlpha = dim * Math.min(1, anim * 2); ctx.fillStyle = lab; let t = g.label; const max = r.w - 12 - 30; while (t.length > 3 && ctx.measureText(t).width > max) t = t.slice(0, -2); if (t !== g.label) t = t.trim() + "…"; ctx.fillText(t, r.x + 6, r.y + 10); ctx.globalAlpha = dim * 0.7 * Math.min(1, anim * 2); const c = B.int(g.items.length); ctx.fillText(c, r.x + r.w - 6 - ctx.measureText(c).width, r.y + 10); }
      const rp = r.p, s = rp - (rp > 6 ? 1.6 : 1), x0 = r.x + 3, y0 = r.y + 3 + r.lab;
      for (let i = 0; i < g.items.length; i++) {
        const it = g.items[i], cx = Math.round(x0 + (i % r.cols) * rp), cy = Math.round(y0 + Math.floor(i / r.cols) * rp);
        let a = anim >= 1 ? 1 : Math.max(0, Math.min(1, anim * 1.9 - ((cx + cy * 0.6) / span) * 0.9));
        if (!a) continue;
        const f = flash.get(it.tok); let sz = s * (0.4 + 0.6 * a);
        if (f) { const k = (now - f) / 900; if (k >= 1) flash.delete(it.tok); else sz = s * (1 + 0.6 * Math.sin(k * Math.PI)); }
        ctx.globalAlpha = dim * a * (hover === it ? 1 : 0.94); ctx.fillStyle = colorOf(it);
        const o = (s - sz) / 2; ctx.fillRect(cx + o, cy + o, sz, sz);
        if (hover === it) { ctx.globalAlpha = 1; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 1, cy - 1, s + 2, s + 2); }
      }
    }
    ctx.globalAlpha = 1;
    if (anim < 1) { const x = anim * (W + 80) - 40; const gr = ctx.createLinearGradient(x - 40, 0, x + 4, 0); gr.addColorStop(0, "rgba(120,255,200,0)"); gr.addColorStop(1, "rgba(160,255,215,.55)"); ctx.fillStyle = gr; ctx.fillRect(x - 40, 0, 44, H); }
    if (anim < 1 || flash.size) raf = requestAnimationFrame(draw); else raf = 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };
  const hit = (e) => {
    const b = cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    const r = rects.find((q) => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h); if (!r) return { r: null, it: null };
    if (r.lab && y < r.y + r.lab + 2) return { r, it: null, label: true };
    const c = Math.floor((x - r.x - 3) / r.p), rw = Math.floor((y - r.y - 3 - r.lab) / r.p); const i = rw * r.cols + c;
    return { r, it: c >= 0 && c < r.cols && rw >= 0 ? r.g.items[i] || null : null };
  };
  cv.addEventListener("pointermove", (e) => {
    const h = hit(e); const nh = h.it || null, ng = h.r || null;
    if (nh !== hover || ng !== hoverG) { hover = nh; hoverG = ng; kick(); }
    cv.style.cursor = h.it || h.label ? "pointer" : "default";
    if (h.it) U.tipShow(api.tip ? api.tip(h.it) : esc(h.it.mb), e.clientX, e.clientY);
    else if (h.r) U.tipShow(`<b>${esc(h.r.g.label)}</b><br>${B.plural(h.r.g.items.length, "artículo")}${h.r.g.sub ? "<br>" + h.r.g.sub : ""}`, e.clientX, e.clientY);
    else U.tipHide();
  });
  cv.addEventListener("pointerleave", () => { hover = hoverG = null; U.tipHide(); kick(); });
  cv.addEventListener("click", (e) => { const h = hit(e); if (h.it) { FX.play("tap"); onItem && onItem(h.it); } else if (h.r && onGroup) onGroup(h.r.g); });
  const ro = new ResizeObserver(U.debounce(() => { if (!groups.length) return; const w = el.clientWidth; if (Math.abs(w - W) > 4) { fit(); kick(); } }, 120)); ro.observe(el);
  const api = {
    el, tip: null,
    set(gs, color, animate) { groups = gs; colorOf = color; fit(); if (animate) t0 = performance.now(); else t0 = performance.now() - 5000; kick(); },
    recolor(color) { colorOf = color; kick(); },
    flash(toks) { const n = performance.now(); for (const t of toks) flash.set(t, n); kick(); },
    destroy() { ro.disconnect(); cancelAnimationFrame(raf); },
  };
  return api;
};

/* ---------- gráficas ---------- */
U.hbars = (data, { fmt = B.int, max, sub, onClick, cls = "" } = {}) => {
  const mx = max || Math.max(1, ...data.map((d) => d.value)); const tot = data.reduce((s, d) => s + d.value, 0) || 1;
  const el = U.h(`<div class="hb ${cls}" role="list">${data.map((d, i) => `<button type="button" class="hb-r" role="listitem" data-i="${i}" data-tip="${esc(`<b>${esc(d.label)}</b><br>${esc(fmt(d.value))}${d.sub ? " · " + esc(d.sub) : ""}<br>${B.pct(d.value, tot)}% del total`)}"><span class="hb-l">${esc(d.label)}</span><span class="hb-t"><i style="width:0" data-w="${Math.max(0.6, (d.value / mx) * 100)}"></i></span><b class="hb-v">${esc(fmt(d.value))}</b></button>`).join("")}</div>`);
  el.addEventListener("click", (e) => { const b = e.target.closest(".hb-r"); if (b && onClick) { FX.play("tap"); onClick(data[+b.dataset.i]); } });
  if (!onClick) el.classList.add("static");
  return el;
};
U.columns = (data, { fmt = B.int, onClick, label = (d) => d.label, every } = {}) => {
  const mx = Math.max(1, ...data.map((d) => d.value)), step = every || Math.ceil(data.length / 12);
  const el = U.h(`<div class="colh ${onClick ? "" : "static"}" role="list">${data.map((d, i) => `<button type="button" class="cc" role="listitem" data-i="${i}" style="--d:${i * 14}ms" data-tip="${esc(`<b>${esc(label(d))}</b><br>${esc(fmt(d.value))}${d.sub ? "<br>" + esc(d.sub) : ""}`)}"><i style="height:${d.value ? Math.max(1.5, (d.value / mx) * 100) : 0}%"></i>${i % step === 0 ? `<span>${esc(label(d))}</span>` : ""}</button>`).join("")}</div>`);
  if (onClick) el.addEventListener("click", (e) => { const b = e.target.closest(".cc"); if (b) onClick(data[+b.dataset.i]); });
  return el;
};
U.columnsSvg = (data, { fmt = B.int, h = 180, onClick, label = (d) => d.label, every } = {}) => {
  const n = data.length, W = Math.max(320, n * 18), bw = W / n, mx = Math.max(1, ...data.map((d) => d.value)), H = h, base = H - 22;
  const step = every || Math.ceil(n / 12);
  const nice = (() => { const e = Math.pow(10, Math.floor(Math.log10(mx))); return Math.ceil(mx / e) * e; })();
  const grid = [0.5, 1].map((k) => `<line x1="0" x2="${W}" y1="${base - (base - 8) * k * (mx / nice)}" y2="${base - (base - 8) * k * (mx / nice)}" class="gl"/>`).join("");
  const el = U.h(`<div class="cols-w"><svg class="cols" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"><line x1="0" x2="${W}" y1="${base}" y2="${base}" class="ax"/>${grid}${data.map((d, i) => { const bh = d.value ? Math.max(2, ((base - 8) * d.value) / mx) : 0; const x = i * bw + bw * 0.16, w = bw * 0.68; return `<g class="col" data-i="${i}" data-tip="${esc(`<b>${esc(label(d))}</b><br>${esc(fmt(d.value))}${d.sub ? "<br>" + esc(d.sub) : ""}`)}"><rect class="hit" x="${i * bw}" y="0" width="${bw}" height="${H}"/><path class="bar" style="--d:${i * 12}ms" d="M${x} ${base}V${base - bh + Math.min(3, bh / 2)}q0 -${Math.min(3, bh / 2)} ${Math.min(3, w / 2)} -${Math.min(3, bh / 2)}H${x + w - Math.min(3, w / 2)}q${Math.min(3, w / 2)} 0 ${Math.min(3, w / 2)} ${Math.min(3, bh / 2)}V${base}Z"/>${i % step === 0 ? `<text x="${i * bw + bw / 2}" y="${H - 6}" class="tx">${esc(label(d))}</text>` : ""}</g>`; }).join("")}</svg></div>`);
  if (onClick) el.addEventListener("click", (e) => { const g = e.target.closest(".col"); if (g) onClick(data[+g.dataset.i]); }); else el.classList.add("static");
  return el;
};
U.donut = (parts, { size = 150, sw = 18, center = "", sub = "", onClick } = {}) => {
  const tot = parts.reduce((s, p) => s + p.value, 0) || 1, r = (size - sw) / 2, C = 2 * Math.PI * r; let acc = 0; const gap = parts.filter((p) => p.value).length > 1 ? 1.2 : 0;
  const arcs = parts.map((p, i) => { const len = (p.value / tot) * 100; const s = `<circle class="dn-s" data-i="${i}" cx="${size / 2}" cy="${size / 2}" r="${r}" pathLength="100" stroke="${p.color}" stroke-width="${sw}" stroke-dasharray="${Math.max(0, len - gap)} ${100 - Math.max(0, len - gap)}" stroke-dashoffset="${-acc}" data-tip="${esc(`<b>${esc(p.label)}</b><br>${B.int(p.value)} · ${B.pct(p.value, tot)}%`)}"/>`; acc += len; return p.value ? s : ""; }).join("");
  const el = U.h(`<div class="dn"><div class="dn-c" style="--s:${size}px"><svg viewBox="0 0 ${size} ${size}" role="img"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="dn-bg" stroke-width="${sw}"/>${arcs}</svg><div class="dn-t"><b>${center}</b><small>${esc(sub)}</small></div></div><ul class="dn-l">${parts.map((p, i) => `<li><button type="button" data-i="${i}" ${onClick ? "" : "disabled"}><i style="background:${p.color}"></i><span>${esc(p.label)}</span><b>${B.int(p.value)}</b><small>${B.pct(p.value, tot)}%</small></button></li>`).join("")}</ul></div>`);
  if (onClick) el.addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) onClick(parts[+b.dataset.i]); });
  return el;
};
U.heat = (days, { weeks = 26, onClick } = {}) => {
  const end = new Date(); end.setHours(0, 0, 0, 0); const start = new Date(end); start.setDate(end.getDate() - (weeks * 7 - 1) - end.getDay());
  const cells = []; const mx = Math.max(1, ...Object.values(days)); const s = 13, g = 3;
  for (let d = new Date(start), i = 0; d <= end; d.setDate(d.getDate() + 1), i++) { const k = d.toISOString().slice(0, 10), v = days[k] || 0; const lvl = v ? Math.min(4, Math.ceil((v / mx) * 4)) : 0; cells.push(`<rect x="${Math.floor(i / 7) * (s + g)}" y="${(i % 7) * (s + g) + 14}" width="${s}" height="${s}" rx="3" class="hm l${lvl}" data-k="${k}" data-tip="<b>${d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</b><br>${v ? B.plural(v, "movimiento") : "Sin movimientos"}"/>`); }
  const cols = Math.ceil(cells.length / 7); const months = []; for (let c = 0; c < cols; c++) { const d = new Date(start); d.setDate(start.getDate() + c * 7); if (d.getDate() <= 7) months.push(`<text x="${c * (s + g)}" y="9" class="tx">${d.toLocaleDateString("es-MX", { month: "short" })}</text>`); }
  const el = U.h(`<div class="heat-w"><svg class="heat" viewBox="0 0 ${cols * (s + g)} ${7 * (s + g) + 14}" role="img">${months.join("")}${cells.join("")}</svg><div class="heat-k"><span>Menos</span>${[0, 1, 2, 3, 4].map((l) => `<i class="hm l${l}"></i>`).join("")}<span>Más</span></div></div>`);
  if (onClick) el.addEventListener("click", (e) => { const r = e.target.closest("rect[data-k]"); if (r) onClick(r.dataset.k); });
  return el;
};

/* ---------- barra lateral en teléfono ---------- */
U.toggleSide = () => document.body.classList.toggle("side-open");

window.U = U;
})();
