/* Inventario CONALEP · interfaz (versión 2). Los datos y la sincronización viven en core.js. */
(() => {
"use strict";
const C = window.Core, FX = window.FX, S = C.S, K = C.K;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const cell = C.cell;
const fmtN = (n) => Number(n || 0).toLocaleString("es-MX");
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const rj = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const wj = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

/* ---------- ajustes ---------- */
const SET = Object.assign({ theme: "auto", sound: true, vib: true, auto: true, less: false, sort: "az", group: false }, rj("cnlp_set", {}));
const mqReduce = matchMedia("(prefers-reduced-motion: reduce)"), mqDark = matchMedia("(prefers-color-scheme: dark)");
function applySet() {
  FX.sound = SET.sound; FX.vib = SET.vib; FX.motion = !SET.less && !mqReduce.matches;
  const de = document.documentElement; de.classList.toggle("lessmo", !!SET.less);
  if (SET.theme === "auto") de.removeAttribute("data-theme"); else de.setAttribute("data-theme", SET.theme);
  metaTheme();
}
function saveSet() { wj("cnlp_set", SET); applySet(); }
const isDark = () => SET.theme === "dark" || (SET.theme === "auto" && mqDark.matches);
function metaTheme(c) {
  const m = document.querySelector('meta[name="theme-color"]'); if (!m) return;
  m.content = c || (!$("scan")?.hidden ? "#000000" : !$("login")?.hidden ? "#004536" : isDark() ? "#07120E" : "#EAF0EC");
}
mqDark.addEventListener?.("change", () => metaTheme());

/* ---------- iconos ---------- */
const P = {
  home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11.5h13V9"/><path d="M10 20.5v-6h4v6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  scan: '<path d="M3.5 8V5.5a2 2 0 0 1 2-2H8M16 3.5h2.5a2 2 0 0 1 2 2V8M20.5 16v2.5a2 2 0 0 1-2 2H16M8 20.5H5.5a2 2 0 0 1-2-2V16"/><rect x="7.5" y="7.5" width="3.5" height="3.5" rx=".6"/><rect x="13" y="7.5" width="3.5" height="3.5" rx=".6"/><rect x="7.5" y="13" width="3.5" height="3.5" rx=".6"/><path d="M13 13h1.5M16.5 13v1.5M13 16.5h3.5"/>',
  act: '<path d="M3 12h4l2.5-6.5 5 13L17 12h4"/>',
  more: '<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17" r="2"/>',
  back: '<path d="m14.5 18-6-6 6-6"/>', chev: '<path d="m9.5 18 6-6-6-6"/>', chevd: '<path d="m6 9.5 6 6 6-6"/>',
  check: '<path d="M5 12.5 9.5 17 19 7.5"/>', x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  camera: '<path d="M4 8h3l1.8-2.6h6.4L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.6"/>',
  kbd: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9"/>',
  torch: '<path d="M8 2.5h8v3.5l-2 4v11.5h-4V10L8 6z"/><path d="M12 13.5v2"/>',
  zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6M8 11h6M11 8v6"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10a4.25 4.25 0 0 1-.5 8.5z"/>',
  cloudok: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10a4.25 4.25 0 0 1-.5 8.5z"/><path d="m9.5 14 2 2 3.5-3.5"/>',
  cloudoff: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96 6 6 0 0 1 1.4-2.3M10.8 5.1A6 6 0 0 1 18 10a4.25 4.25 0 0 1 2.4 7.4M3 3l18 18"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>',
  share: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M5 12v6.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V12"/>',
  print: '<path d="M7 9V3.5h10V9"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
  file: '<path d="M14 3H6.5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.5z"/><path d="M14 3v5.5h5.5M8.5 13h7M8.5 17h4.5"/>',
  copy: '<rect x="8" y="8" width="12.5" height="12.5" rx="2"/><path d="M16 8V5.5a2 2 0 0 0-2-2H5.5a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2H8"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  swap: '<path d="M4 8h15l-4-4M20 16H5l4 4"/>',
  box: '<path d="M20.5 8 12 3.5 3.5 8v8l8.5 4.5 8.5-4.5z"/><path d="M3.5 8 12 12.5 20.5 8M12 12.5v8"/>',
  alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13.5h10L18 7"/>',
  logout: '<path d="M15 3.5h3a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-3M10 16.5l4.5-4.5L10 7.5M14.5 12H3.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M2.5 12h2M19.5 12h2M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  auto: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  vib: '<rect x="7.5" y="3.5" width="9" height="17" rx="2"/><path d="M4 9v6M20 9v6"/>',
  bolt: '<path d="M13 2.5 4.5 14H11l-1 7.5L18.5 10H12z"/>',
  spark: '<path d="M12 3.5l1.7 4.6 4.6 1.7-4.6 1.7L12 16.1l-1.7-4.6-4.6-1.7 4.6-1.7z"/><path d="M18.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  book: '<path d="M4 4.5h5.5A2.5 2.5 0 0 1 12 7v13a2 2 0 0 0-2-2H4z"/><path d="M20 4.5h-5.5A2.5 2.5 0 0 0 12 7v13a2 2 0 0 1 2-2h6z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  flag: '<path d="M5.5 21V4M5.5 4h11l-2.2 4.2 2.2 4.3h-11"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  layers: '<path d="m12 3.5 8.5 4.5L12 12.5 3.5 8z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/>',
  sort: '<path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5"/>',
  pin: '<path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  money: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  note: '<path d="M4 5h16v11.5H8.5L4 20.5z"/><path d="M8 9.5h8M8 12.5h5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M2.5 12S6 5.5 12 5.5c1.6 0 3 .4 4.2 1M21.5 12s-1.2 2.3-3.5 4.1M12 18.5c-6 0-9.5-6.5-9.5-6.5M3.5 3.5l17 17"/>',
  install: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M12 8v6M9 11.5l3 3 3-3"/>',
  list: '<path d="M8.5 6h12M8.5 12h12M8.5 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  tag: '<path d="M3.5 12V4.5a1 1 0 0 1 1-1H12l8.5 8.5-8.5 8.5z"/><circle cx="8" cy="8" r="1.5"/>',
};
const ic = (n, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;
const MARKP = "M398.4 51.6L233.8 145.8L211.8 156.8L197.2 158.0L190.0 156.6L178.5 151.8L172.4 147.4L166.4 140.5L159.6 126.5L90.2 168.0L103.2 190.6L118.2 207.4L132.6 218.6L151.6 228.6L166.0 233.8L184.8 237.9L211.6 237.9L240.8 230.6L264.8 218.6L378.6 151.9ZM308.8 69.5L297.9 51.1L281.8 32.5L263.1 18.1L240.0 6.5L215.9 0.6L189.5 0.0L180.0 1.1L155.6 8.2L131.6 20.2L20.0 84.0L0.0 186.8L186.6 80.1L200.9 77.9L208.4 79.0L217.1 82.4L223.9 87.0L232.1 96.1L236.8 104.2L239.1 112.0L307.8 72.1Z";
const MARK = (cls = "") => `<svg class="${cls}" viewBox="0 0 398 238" aria-hidden="true"><path fill="currentColor" d="${MARKP}"/></svg>`;

/* ---------- formato ---------- */
const LOWW = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "van", "von", "el"]);
const tcase = (s) => (!s || s === C.SIN ? s || "" : s.toLowerCase().split(" ").map((w, i) => (i > 0 && LOWW.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" "));
const ACR = new Set(["CPU", "LCD", "LED", "HP", "USB", "PC", "TV", "DVD", "UPS", "CD", "VGA", "HDMI", "PVC", "MDF", "AC", "A/C", "IBM", "LG", "IP", "GB", "TB", "MB", "RAM", "SSD", "HD", "DC", "CCTV", "DVR", "NVR", "RCA", "ABS", "AM", "FM", "UV", "LAN", "PBX", "MIG", "TIG", "CNC", "PLC", "OBD", "SRS", "ABC", "CO2"]);
function scase(s) {
  if (!s) return ""; if (s !== s.toUpperCase()) return s;
  let first = true;
  return s.split(/(\s+)/).map((x) => {
    if (!x.trim()) return x;
    const bare = x.replace(/[.,;:()"]/g, "");
    let out = ACR.has(bare) || (/\d/.test(x) && /[A-Z]/.test(x) && x.length <= 10) ? x : x.toLowerCase();
    if (first && out !== x) out = out.charAt(0).toUpperCase() + out.slice(1);
    first = false; return out;
  }).join("");
}
const HUES = [160, 196, 142, 28, 212, 340, 48, 266, 12, 178, 98, 300];
const hue = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return HUES[h % HUES.length]; };
function initials(n) {
  if (!n || n === C.SIN) return "—";
  const w = n.split(" ").filter((x) => x && !LOWW.has(x.toLowerCase())); return ((w[0]?.[0] || "") + (w[1]?.[0] || "")).toUpperCase();
}
const av = (n, cls = "") => `<span class="av ${cls}" style="--h:${hue(n)}">${esc(initials(n))}</span>`;
const first = (u) => String(u || "").split(" ")[0] || "";
const two = (n) => String(n).padStart(2, "0");
const ftime = (t) => { const d = new Date(t); return two(d.getHours()) + ":" + two(d.getMinutes()); };
const fdate = (t) => new Date(t).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
const fdt = (t) => (t ? fdate(t) + " " + ftime(t) : "");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const dayKey = (t) => { const d = new Date(t); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); };
function fday(t) {
  const n = Date.now(); if (dayKey(t) === dayKey(n)) return "Hoy"; if (dayKey(t) === dayKey(n - 864e5)) return "Ayer";
  return cap(new Date(t).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }));
}
const longDate = () => cap(new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }));
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"; };
const money = (n) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const CONDN = { B: "Bueno", R: "Regular", M: "Malo" };
const isNA = (x) => !x || /^(s\/?[mn]|sin (modelo|marca|serie)|n\/?a|-+|no aplica)$/i.test(x);
const mbOf = (tok) => cell(C.row(tok), K.MB) || tok.slice(1);
const descOf = (tok) => scase(cell(C.row(tok), K.DS));
const metaOf = (tok) => { const r = C.row(tok); return [cell(r, K.MA), cell(r, K.MO), cell(r, K.SE) ? "Serie " + cell(r, K.SE) : ""].filter((x) => !isNA(x) && x !== "Serie S/N").join(" · "); };
const areaOf = (tok) => cell(C.row(tok), K.AR);

/* ---------- capas (botón atrás de Android) ---------- */
const L = [];
function pushLayer(id, close) { L.push({ id, close }); try { history.pushState({ l: L.length }, ""); } catch (e) {} }
function closeLayer(id) {
  const top = L[L.length - 1];
  if (top && top.id === id) { history.back(); return; }
  const i = L.findIndex((x) => x.id === id); if (i >= 0) { const [l] = L.splice(i, 1); l.close(); }
}
function closeThen(id, fn) {
  const top = L[L.length - 1];
  if (!top || top.id !== id) { closeLayer(id); fn(); return; }
  let done = false; const h = () => { if (done) return; done = true; window.removeEventListener("popstate", h); setTimeout(fn, 20); };
  window.addEventListener("popstate", h); history.back(); setTimeout(h, 1500);
}
window.addEventListener("popstate", () => { const l = L.pop(); if (l) l.close(); });

/* ---------- avisos ---------- */
// lo que debe verse encima de la hoja inferior (que está en la capa superior del navegador) usa "popover"
const HASPOP = typeof HTMLElement !== "undefined" && "popover" in HTMLElement.prototype;
function topLayer(el) { if (HASPOP) el.popover = "manual"; document.body.appendChild(el); if (HASPOP) { try { el.showPopover(); } catch (e) {} } }
let snT = 0;
function snack(msg, opt = {}) {
  document.querySelectorAll(".snack").forEach((x) => x.remove());
  const s = document.createElement("div"); s.className = "snack" + (opt.bad ? " bad" : "") + (!$("scan").hidden ? " top" : (!$("tabs").classList.contains("away") || !$("ctx").hidden) ? "" : " low");
  s.setAttribute("role", "status");
  s.innerHTML = (opt.icon ? ic(opt.icon) : "") + `<span class="t">${esc(msg)}</span>` + (opt.action ? `<button type="button">${esc(opt.action)}</button>` : "");
  if (opt.action) s.querySelector("button").onclick = () => { hide(); opt.onAction && opt.onAction(); };
  topLayer(s);
  const hide = () => { if (!s.isConnected) return; s.classList.add("out"); setTimeout(() => s.remove(), 260); };
  clearTimeout(snT); snT = setTimeout(hide, opt.ms || (opt.action ? 5000 : 2800));
}

/* ---------- hoja inferior ---------- */
const sheet = {
  build: null, onclose: null, closeT: 0,
  open(build, opt = {}) {
    const d = $("sheet"), box = $("shin");
    const closing = d.classList.contains("closing"); if (closing) { clearTimeout(this.closeT); d.classList.remove("closing"); }
    const swap = d.open && !closing;
    if (swap && this.onclose) { const f = this.onclose; this.onclose = null; try { f(); } catch (e) {} }
    this.build = build; this.onclose = opt.onclose || null;
    box.replaceChildren(); box.scrollTop = 0;
    try { build(box); } catch (e) { console.error(e); box.innerHTML = `<p class="err">No se pudo mostrar: ${esc(e.message)}</p>`; }
    if (swap) { box.classList.remove("swap"); void box.offsetWidth; box.classList.add("swap"); }
    else { if (!d.open) d.showModal(); pushLayer("sheet", () => this._close()); }
  },
  redraw() { if (!$("sheet").open || !this.build) return; const box = $("shin"), y = box.scrollTop; box.replaceChildren(); this.build(box); box.scrollTop = y; },
  close() { closeLayer("sheet"); },
  _close() {
    const d = $("sheet"); if (!d.open) return;
    const f = this.onclose; this.onclose = null; try { f && f(); } catch (e) {}
    d.classList.add("closing");
    this.closeT = setTimeout(() => { d.classList.remove("closing"); d.style.transform = ""; if (d.open) d.close(); this.build = null; refresh(); }, FX.motion ? 270 : 0);
  },
};
$("sheet").addEventListener("cancel", (e) => { e.preventDefault(); sheet.close(); });
$("sheet").addEventListener("click", (e) => { if (e.target === $("sheet")) sheet.close(); });
(() => { // arrastrar hacia abajo para cerrar
  const d = $("sheet"); let st = null;
  d.querySelector(".grab").addEventListener("pointerdown", (e) => { st = { y: e.clientY, t: performance.now(), dy: 0 }; e.target.setPointerCapture(e.pointerId); d.style.transition = "none"; });
  d.querySelector(".grab").addEventListener("pointermove", (e) => { if (!st) return; st.dy = Math.max(0, e.clientY - st.y); d.style.transform = `translateY(${st.dy}px)`; });
  const up = () => { if (!st) return; const v = st.dy / (performance.now() - st.t); d.style.transition = "transform .3s cubic-bezier(.16,1,.3,1)"; if (st.dy > 110 || v > 0.6) { sheet.close(); } else d.style.transform = ""; setTimeout(() => (d.style.transition = ""), 320); st = null; };
  d.querySelector(".grab").addEventListener("pointerup", up); d.querySelector(".grab").addEventListener("pointercancel", up);
})();

/* ---------- estado de la interfaz ---------- */
const U = { view: "home", cur: "", hq: "", hf: "all", pq: "", pf: "all", gq: "", collapsed: new Set(), cel: new Set(), scroll: {}, last: rj("cnlp_last", "") };
const stack = [];
let V = null, booted = false;
const VIEWS = {};

function mountView(dir) {
  const v = VIEWS[U.view]; V = v;
  const pg = document.createElement("div"); pg.className = "pg" + (dir && FX.motion ? " in-" + dir : "");
  $("view").replaceChildren(pg);
  header(true); bars();
  try { v.mount(pg); } catch (e) { console.error(e); pg.innerHTML = `<div class="empty">${ic("alert")}<b>No se pudo mostrar esta pantalla</b><span>${esc(e.message)}</span></div>`; }
  FX.fill(pg); FX.countAll(pg);
}
function header(anim) {
  const h = V?.head ? V.head() : { t: "Inventario" };
  $("hb").hidden = !h.back; $("hlogo").hidden = !!h.back;
  const t = $("htit"); t.querySelector("b").textContent = h.t || ""; t.querySelector("small").textContent = h.s || "";
  if (anim && FX.motion) { t.classList.remove("anim"); void t.offsetWidth; t.classList.add("anim"); }
}
function bars() {
  const root = !!V?.root;
  $("tabs").classList.toggle("away", !root || !S.inv);
  if (root) moveInd();
  const ctx = $("ctx");
  if (!root && V?.ctx && S.inv) {
    ctx.innerHTML = V.ctx().map((b) => `<button type="button" class="cbtn${b.main ? " main" : ""}" data-act="${b.act}">${ic(b.icon)}<span>${esc(b.label)}</span></button>`).join("");
    ctx.hidden = false;
  } else ctx.hidden = true;
}
function moveInd() {
  const t = document.querySelector(`.tab[data-tab="${U.view}"]`), ind = $("tind");
  document.querySelectorAll(".tab").forEach((x) => { x.classList.toggle("on", x === t); x.setAttribute("aria-current", x === t ? "page" : "false"); });
  if (!t) { ind.style.opacity = "0"; return; }
  ind.style.opacity = "1"; ind.style.width = t.offsetWidth + "px"; ind.style.transform = `translateX(${t.offsetLeft}px)`;
}
function go(view, cur) {
  stack.push({ view: U.view, cur: U.cur, top: $("view").scrollTop });
  U.view = view; if (cur !== undefined) U.cur = cur;
  if (view === "per") { U.pq = ""; U.pf = "all"; U.last = U.cur; wj("cnlp_last", U.cur); }
  pushLayer("view", () => { const p = stack.pop(); if (!p) return; U.view = p.view; U.cur = p.cur; mountView("b"); $("view").scrollTop = p.top; });
  mountView("f"); $("view").scrollTop = 0;
}
function tab(t) {
  FX.hit("tap");
  if (U.view === t) { $("view").scrollTo({ top: 0, behavior: FX.motion ? "smooth" : "auto" }); return; }
  U.scroll[U.view] = $("view").scrollTop; U.view = t; mountView("t"); $("view").scrollTop = U.scroll[t] || 0;
}
function refresh() {
  netPill(); offlineBar();
  if (!S.inv) { showBoot(); return; }
  if (!booted) { booted = true; mountView("t"); maybeOnboard(); return; }
  try { V?.update && V.update(); } catch (e) { console.error(e); }
  if (V && !V.root) header(false);
  if (!$("scan").hidden) scanProg();
}
function showBoot() {
  booted = false; $("tabs").classList.add("away"); $("ctx").hidden = true; $("hb").hidden = true; $("hlogo").hidden = false;
  const t = $("htit"); t.querySelector("b").textContent = "Inventario"; t.querySelector("small").textContent = "";
  const msg = S.err || (navigator.onLine ? "Descargando el inventario…" : "Sin internet y todavía no hay datos en este teléfono. Conéctate una vez para descargar el inventario.");
  $("view").innerHTML = `<div class="pg"><div class="boot">${MARK("m")}<b>${esc(msg)}</b>${S.err ? `<button class="btn pri" data-act="retryboot">${ic("sync")}Intentar de nuevo</button>` : ""}</div>${S.err ? "" : '<div class="skel"></div><div class="skel"></div><div class="skel"></div>'}</div>`;
}

/* ---------- estado de envío ---------- */
let lastPill = "";
function netPill() {
  const p = $("net"), n = S.ops.length, bad = S.ops.filter((o) => o.hold || o.err).length;
  let cls, txt;
  if (S.syncing) { cls = "busy"; txt = "Enviando…"; }
  else if (!navigator.onLine) { cls = "off"; txt = n ? n + " por enviar" : "Sin internet"; }
  else if (S.authLost) { cls = "bad"; txt = "Entrar de nuevo"; }
  else if (bad) { cls = "bad"; txt = "Revisar " + bad; }
  else if (n) { cls = "off"; txt = n + " por enviar"; }
  else { cls = "ok"; txt = "Todo enviado"; }
  const k = cls + txt; if (k === lastPill) return; const was = lastPill; lastPill = k;
  p.className = "pill " + cls; p.innerHTML = `<i class="dot"></i><span>${esc(txt)}</span>`;
  if (was && FX.motion) { p.classList.remove("bump"); void p.offsetWidth; p.classList.add("bump"); }
}
function offlineBar() {
  const o = $("offline"), show = !navigator.onLine && !!S.inv;
  if (show && o.hidden) { o.innerHTML = ic("cloudoff") + "<span>Sin internet. Todo lo que hagas se guarda en el teléfono y se envía solo después.</span>"; o.hidden = false; }
  else if (!show) o.hidden = true;
}

/* ---------- piezas visuales ---------- */
const ring = (p, cls = "", inner) => `<span class="ring ${cls}${p ? "" : " zero"}"><svg viewBox="0 0 36 36"><circle class="bg" cx="18" cy="18" r="15.5"/><circle class="fg" cx="18" cy="18" r="15.5" pathLength="100" data-p="${p}"/></svg><span class="tx">${inner ?? p}</span></span>`;
function setRing(el, p, inner) { if (!el) return; el.classList.toggle("zero", !p); const fg = el.querySelector(".fg"); if (fg.hasAttribute("data-p")) fg.dataset.p = p; else fg.style.strokeDashoffset = String(100 - p); el.querySelector(".tx").innerHTML = inner ?? p; }
function qrDeco() {
  let s = 13, r = ""; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const fin = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) { if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) continue; if (rnd() > 0.52) r += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }
  return `<svg class="qr" viewBox="-.5 -.5 22 22" fill="currentColor" aria-hidden="true">${fin(0, 0)}${fin(14, 0)}${fin(0, 14)}${r}</svg>`;
}
function keyed(box, keys, make, fill) {
  const have = new Map(); for (const n of box.children) if (n.dataset.key != null && !n.dataset.leaving) have.set(n.dataset.key, n);
  const want = new Set(keys); const out = [...have.keys()].filter((k) => !want.has(k));
  const bulk = out.length > 16 || !box.isConnected;
  for (const k of out) leave(have.get(k), bulk);
  const miss = keys.filter((k) => !have.has(k));
  const news = [];
  if (miss.length) { const t = document.createElement("template"); t.innerHTML = miss.map(make).join(""); const ns = [...t.content.children]; ns.forEach((n, i) => { have.set(miss[i], n); n._new = true; news.push(n); }); }
  let ref = box.firstElementChild;
  for (const k of keys) {
    const n = have.get(k);
    while (ref && ref.dataset.leaving) ref = ref.nextElementSibling;
    if (n !== ref) box.insertBefore(n, ref); else ref = ref.nextElementSibling;
    const isNew = !!n._new; n._new = false; fill(n, k, isNew);
  }
  return news;
}
function leave(n, now) {
  if (now || !FX.motion) { n.remove(); return; }
  n.dataset.leaving = "1"; n.style.height = n.offsetHeight + "px";
  requestAnimationFrame(() => { n.classList.add("leaving"); n.style.height = "0px"; n.style.marginBottom = "-8px"; });
  setTimeout(() => n.remove(), 460);
}
function stagger(box, max = 14) { if (!FX.motion) return; let i = 0; for (const n of box.children) { if (i >= max) break; n.classList.add("enter"); n.style.animationDelay = i * 28 + "ms"; i++; } }

/* =================== INICIO =================== */
function groupState(g) { return g.fin ? "fin" : g.rev === 0 ? "new" : g.rev >= g.total ? "done" : "prog"; }
VIEWS.home = {
  root: true,
  head: () => ({ t: "Inventario CONALEP", s: S.inv?.at ? "Datos al " + fdt(S.inv.at) : "" }),
  mount(pg) {
    pg.innerHTML = `
      <div class="greet"><h1>${esc(greeting())}, ${esc(first(S.user))}</h1><p>${esc(longDate())}</p></div>
      <section class="hero" aria-label="Avance del inventario">${qrDeco()}
        <div class="hero-l">Avance del inventario</div>
        <div class="hero-k"><b class="disp" id="hRev">0</b><span>de <span id="hTot"></span> revisados</span></div>
        <div class="seg"><i class="si" id="hSi"></i><i class="no" id="hNo"></i></div>
        <div class="legend"><span><i style="background:#9BE3C8"></i>Presentes <b id="hSiN"></b></span><span><i style="background:#FF9C8F"></i>No están <b id="hNoN"></b></span><span><i style="background:rgba(255,255,255,.35)"></i>Pendientes <b id="hPeN"></b></span></div>
        <div class="hero-f"><span>Resguardantes finalizados</span><b id="hFin"></b></div>
      </section>
      <div id="hCont"></div><div id="hInst"></div>
      <div class="sec"><h2>Resguardantes</h2><span class="tiny" id="hCount"></span></div>
      <div class="srch">${ic("search")}<input id="hq" type="search" placeholder="Buscar resguardante" autocomplete="off" enterkeyhint="search" aria-label="Buscar resguardante"><button class="clr" type="button" data-act="hclr" aria-label="Borrar" hidden>${ic("x")}</button></div>
      <div class="chips" id="hChips"></div>
      <div class="plist" id="hList"></div>`;
    const q = $("hq"); q.value = U.hq;
    q.oninput = () => { U.hq = q.value; this.update(); };
    this.mounted = true; this.update(true);
  },
  update(firstTime) {
    const gs = C.groups(); const t = { total: 0, si: 0, no: 0, fin: 0 };
    for (const g of gs) { t.total += g.total; t.si += g.si; t.no += g.no; if (g.fin) t.fin++; }
    const rev = t.si + t.no;
    FX.count($("hRev"), rev); $("hTot").textContent = fmtN(t.total);
    const w = (a) => (t.total ? (a / t.total) * 100 : 0).toFixed(2);
    const si = $("hSi"), no = $("hNo");
    if (firstTime) { si.dataset.w = w(t.si); no.dataset.w = w(t.no); } else { si.style.width = w(t.si) + "%"; no.style.width = w(t.no) + "%"; }
    $("hSiN").textContent = fmtN(t.si); $("hNoN").textContent = fmtN(t.no); $("hPeN").textContent = fmtN(t.total - rev);
    $("hFin").textContent = t.fin + " de " + gs.length;
    // continuar donde se quedó
    const lg = U.last && gs.find((g) => g.name === U.last);
    $("hCont").innerHTML = lg && groupState(lg) !== "fin" ? `<button class="cont" type="button" data-act="per" data-key="${esc(lg.name)}">${av(lg.name)}<span class="t"><small>Continuar donde te quedaste</small><b>${esc(tcase(lg.name))}</b><small>${lg.rev} de ${lg.total} revisados</small></span><span class="go">${ic("arrow")}</span></button>` : "";
    $("hInst").innerHTML = installHTML();
    // filtros
    const cnt = { all: gs.length, prog: 0, new: 0, done: 0 };
    for (const g of gs) { const s = groupState(g); if (s === "prog") cnt.prog++; else if (s === "new") cnt.new++; else cnt.done++; }
    const SORTS = { az: "A–Z", low: "Menos avance", high: "Más avance", big: "Más artículos" };
    $("hChips").innerHTML = [["all", "Todos"], ["prog", "En curso"], ["new", "Sin empezar"], ["done", "Completos"]].map(([k, l]) => `<button type="button" class="chip${U.hf === k ? " on" : ""}" data-act="hf" data-f="${k}">${l}<em>${cnt[k]}</em></button>`).join("") + `<button type="button" class="chip" data-act="hsort">${ic("sort")}${SORTS[SET.sort] || "A–Z"}</button>`;
    // lista
    const q = C.norm(U.hq.trim());
    document.querySelector('[data-act="hclr"]').hidden = !U.hq;
    let list = gs.filter((g) => (!q || C.norm(g.name).includes(q)) && (U.hf === "all" || (U.hf === "done" ? ["fin", "done"].includes(groupState(g)) : groupState(g) === U.hf)));
    const P2 = (g) => g.rev / (g.total || 1);
    if (SET.sort === "low") list.sort((a, b) => P2(a) - P2(b)); else if (SET.sort === "high") list.sort((a, b) => P2(b) - P2(a)); else if (SET.sort === "big") list.sort((a, b) => b.total - a.total);
    $("hCount").textContent = list.length === gs.length ? gs.length + " personas" : list.length + " de " + gs.length;
    const box = $("hList"); const map = new Map(list.map((g) => [g.name, g]));
    keyed(box, list.map((g) => g.name), pcHTML, (el, k, isNew) => pcFill(el, map.get(k), isNew));
    if (firstTime) stagger(box);
    let em = box.parentElement.querySelector(".empty.hl");
    if (!list.length) { if (!em) { box.insertAdjacentHTML("afterend", `<div class="empty hl">${ic("user")}<b>Nadie coincide</b><span>Prueba con otro nombre o quita el filtro.</span></div>`); } } else if (em) em.remove();
  },
};
const pcHTML = (name) => `<button type="button" class="pc" data-act="per" data-key="${esc(name)}">${av(name)}<span class="t"><span class="nm">${esc(tcase(name))}</span><span class="mt"></span><span class="bar"><i class="si"></i><i class="no"></i></span><span class="bd"></span></span>${ring(0)}</button>`;
function pcFill(el, g, isNew) {
  const st = groupState(g), p = pct(g.rev, g.total);
  const sig = [g.si, g.no, g.total, st].join("|"); if (el.dataset.sig === sig) return; el.dataset.sig = sig;
  el.classList.toggle("fin", st === "fin");
  el.querySelector(".mt").textContent = g.rev + " de " + g.total + " revisados" + (g.no ? " · " + g.no + (g.no === 1 ? " no está" : " no están") : "");
  const [a, b] = el.querySelectorAll(".bar i"); const ws = (g.si / g.total) * 100, wn = (g.no / g.total) * 100;
  if (isNew) { a.dataset.w = ws.toFixed(2); b.dataset.w = wn.toFixed(2); FX.fill(el); } else { a.style.width = ws + "%"; b.style.width = wn + "%"; }
  el.querySelector(".bd").innerHTML = st === "fin" ? `<span class="badge b-fin">${ic("check")}Finalizado ${esc(fdate(g.fin.t || g.fin.at))}</span>` : st === "done" ? `<span class="badge b-ready">${ic("flag")}Listo para finalizar</span>` : "";
  const r = el.querySelector(".ring"); r.classList.toggle("done", p === 100);
  if (isNew) { r.classList.toggle("zero", !p); r.querySelector(".fg").dataset.p = p; r.querySelector(".tx").textContent = p; FX.fill(el); } else setRing(r, p, st === "fin" ? ic("check") : p);
  if (isNew && st === "fin") r.querySelector(".tx").innerHTML = ic("check");
}
let deferredInstall = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; if (V === VIEWS.home && $("hInst")) $("hInst").innerHTML = installHTML(); });
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone;
function installHTML() {
  if (standalone() || rj("cnlp_hint", 0) === 1) return "";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return `<div class="card inst">${ic("install", "big")}<div style="flex:1;min-width:0"><b>Instala la app en tu teléfono</b><div class="tiny" style="margin:3px 0 10px">${ios ? "En Safari toca Compartir y luego «Agregar a pantalla de inicio»." : deferredInstall ? "Queda en tu pantalla de inicio y abre sin internet." : "Abre el menú del navegador (⋮) y toca «Instalar app»."}</div><div class="row">${deferredInstall ? `<button class="btn pri sm" data-act="install">Instalar</button>` : ""}<button class="btn sm" data-act="hidehint">Ahora no</button></div></div></div>`;
}

/* =================== RESGUARDANTE =================== */
VIEWS.per = {
  root: false,
  head() { const sm = this.sm && this.sm.name === U.cur ? this.sm : C.summaryOf(U.cur); return { t: tcase(U.cur), s: sm.own.length + " artículos" + (sm.fin ? " · finalizado" : sm.pend.length ? " · " + sm.pend.length + " por revisar" : " · todo revisado"), back: true }; },
  ctx: () => [{ act: "key", icon: "kbd", label: "Teclear" }, { act: "scaninv", icon: "scan", label: "Escanear", main: true }, { act: "sum", icon: "flag", label: "Resumen" }],
  mount(pg) {
    const name = U.cur; this.sm = C.summaryOf(name); this.lastPend = null;
    pg.innerHTML = `
      <div class="phero">${av(name, "lg")}<div class="t"><h1>${esc(tcase(name))}</h1><p id="pSub"></p></div><span id="pRing"></span></div>
      <div class="st4" id="pStats"></div>
      <div class="segc" id="pSeg"></div>
      <div class="tools"><div class="srch">${ic("search")}<input id="pq" type="search" placeholder="Marbete, descripción o serie" autocomplete="off" enterkeyhint="search" aria-label="Buscar en este resguardo"><button class="clr" type="button" data-act="pclr" aria-label="Borrar" hidden>${ic("x")}</button></div><button type="button" class="ibtn${SET.group ? " on" : ""}" data-act="group" aria-label="Agrupar por área" title="Agrupar por área">${ic("layers")}</button></div>
      <div class="ilist" id="pList"></div><div id="pEmpty"></div>`;
    const q = $("pq"); q.value = U.pq;
    q.oninput = () => { U.pq = q.value; this.update(); };
    swipeable($("pList"));
    this.update(true);
  },
  update(firstTime) {
    const name = U.cur, sm = (this.sm = C.summaryOf(name)), tot = sm.own.length, rev = sm.si.length + sm.no.length, p = pct(rev, tot);
    $("pSub").textContent = rev + " de " + tot + " revisados" + (sm.fin ? " · finalizado " + fdate(sm.fin.t || sm.fin.at) : "");
    if (firstTime) $("pRing").innerHTML = ring(p, "big", `${p}<small>%</small>`); else setRing($("pRing").firstElementChild, p, `${p}<small>%</small>`);
    const stats = [["si", sm.si.length, "Presentes"], ["no", sm.no.length, "No están"], ["pend", sm.pend.length, "Pendientes"], ["mv", sm.gone.length, "Trasladados"]];
    if (firstTime) $("pStats").innerHTML = stats.map(([k, n, l]) => `<button type="button" class="st ${k}" data-act="pf" data-f="${k}"><b data-v="0" data-count="${n}">0</b><span>${l}</span></button>`).join("");
    else stats.forEach(([k, n]) => FX.count($("pStats").querySelector(`.st.${k} b`), n));
    $("pStats").querySelectorAll(".st").forEach((b) => b.classList.toggle("on", b.dataset.f === U.pf));
    const segs = [["all", "Todos", tot + sm.gone.length], ["pend", "Pendientes", sm.pend.length], ["si", "Presentes", sm.si.length], ["no", "No están", sm.no.length]];
    if (sm.gone.length || U.pf === "mv") segs.push(["mv", "Trasladados", sm.gone.length]);
    const seg = $("pSeg");
    if (seg.dataset.n !== String(segs.length)) { seg.dataset.n = segs.length; seg.innerHTML = `<i class="ind"></i>` + segs.map(([k, l]) => `<button type="button" data-act="pf" data-f="${k}">${l}<em></em></button>`).join(""); }
    segs.forEach(([k, , n]) => { const b = seg.querySelector(`[data-f="${k}"]`); b.querySelector("em").textContent = n; b.classList.toggle("on", k === U.pf); });
    segInd(seg);
    document.querySelector('[data-act="pclr"]').hidden = !U.pq;
    // lista
    const q = C.norm(U.pq.trim()).split(" ").filter(Boolean);
    const set = { all: sm.own.concat(sm.gone), pend: sm.pend, si: sm.si, no: sm.no, mv: sm.gone }[U.pf] || sm.own;
    const match = (t) => { if (!q.length) return true; const r = C.row(t); const s = C.norm([cell(r, K.MB), cell(r, K.DS), cell(r, K.SE), cell(r, K.MA), cell(r, K.MO), cell(r, K.AR)].join(" ")); return q.every((w) => s.includes(w)); };
    let toks = set.filter(match), keys = toks;
    const box = $("pList");
    if (box.dataset.g !== String(!!SET.group)) { box.replaceChildren(); box.dataset.g = String(!!SET.group); }
    if (SET.group) {
      const by = new Map(); for (const t of toks) { const a = areaOf(t) || "Sin área"; if (!by.has(a)) by.set(a, []); by.get(a).push(t); }
      const areas = [...by.keys()].sort((a, b) => a.localeCompare(b, "es"));
      this.areas = by; keys = [];
      const as = (this.astats = new Map());
      for (const t of sm.own) { const a = areaOf(t) || "Sin área"; let x = as.get(a); if (!x) as.set(a, (x = { si: 0, no: 0, n: 0 })); x.n++; const m = C.getMark(name, t); if (m?.e === "si") x.si++; else if (m?.e === "no") x.no++; }
      for (const a of areas) { keys.push("\u0001" + a); if (!U.collapsed.has(a)) keys.push(...by.get(a)); }
    }
    const news = keyed(box, keys, (k) => (k[0] === "\u0001" ? aheadHTML(k.slice(1)) : itHTML(k)), (el, k, isNew) => (k[0] === "\u0001" ? aheadFill(el, k.slice(1), name) : itFill(el, k, name, isNew)));
    if (firstTime) stagger(box, 10); else if (news.length && news.length < 8 && FX.motion) news.forEach((n) => n.classList.add("enter"));
    const empty = !toks.length;
    $("pEmpty").innerHTML = empty ? (U.pq ? `<div class="empty">${ic("search")}<b>Sin resultados</b><span>Ningún artículo coincide con «${esc(U.pq)}».</span></div>`
      : U.pf === "pend" ? `<div class="empty">${ic("check")}<b>No queda nada por revisar</b><span>Revisa el resumen para finalizar.</span><button class="btn pri" data-act="sum">${ic("flag")}Ver resumen</button></div>`
      : `<div class="empty">${ic("box")}<b>No hay artículos en esta vista</b></div>`) : "";
    // celebración
    if (this.lastPend != null && this.lastPend > 0 && sm.pend.length === 0 && tot > 0 && $("scan").hidden && !U.cel.has(name)) { U.cel.add(name); celebrate(name, sm); }
    this.lastPend = sm.pend.length;
  },
};
function segInd(seg) {
  const on = seg.querySelector("button.on"), ind = seg.querySelector(".ind"); if (!on || !ind) return;
  requestAnimationFrame(() => { ind.style.width = on.offsetWidth + "px"; ind.style.transform = `translateX(${on.offsetLeft}px)`; });
}
const aheadHTML = (a) => `<button type="button" class="ahead" data-key="\u0001${esc(a)}" data-act="area"><span class="t"><b>${esc(scase(a))}</b><small></small><span class="pbar"><i class="si"></i><i class="no"></i></span></span>${ic("chevd", "ch")}</button>`;
function aheadFill(el, a, name) {
  const toks = VIEWS.per.areas?.get(a) || []; const st = VIEWS.per.astats?.get(a) || { si: 0, no: 0, n: toks.length };
  el.classList.toggle("closed", U.collapsed.has(a));
  el.querySelector("small").textContent = (st.si + st.no) + " de " + st.n + " revisados" + (toks.length !== st.n ? " · " + toks.length + " en esta vista" : "");
  const [x, y] = el.querySelectorAll(".pbar i"); x.style.width = (st.si / (st.n || 1)) * 100 + "%"; y.style.width = (st.no / (st.n || 1)) * 100 + "%";
}
const itHTML = (tok) => `<div class="it" data-key="${esc(tok)}"><div class="it-bg"><span class="l2">${ic("check")}Presente</span><span class="r2">No está${ic("x")}</span></div><div class="it-c"><button type="button" class="it-i" data-act="item"><span class="it-top"><span class="mb"></span><span class="sp"></span></span><span class="it-d"></span><span class="it-m"></span><span class="it-tags"></span></button><div class="it-a"><button type="button" class="mk si" data-act="si" aria-label="Presente">${ic("check")}</button><button type="button" class="mk no" data-act="no" aria-label="No está">${ic("x")}</button></div></div></div>`;
function itFill(el, tok, name, isNew) {
  const m = C.getMark(name, tok), own = C.owner(tok), moved = own !== name;
  const st = moved ? "mv" : m?.e || "";
  const inn = S.moves.inn[name]?.[tok];
  const ph = C.photoCount(tok);
  const sig = [st, m?.c || "", m?.n ? 1 : 0, m?.pending ? 1 : 0, own, ph, inn ? 1 : 0].join("|");
  if (el.dataset.sig === sig) return;
  const prev = el.dataset.st; el.dataset.sig = sig; el.dataset.st = st;
  el.className = "it" + (st ? " " + st : "");
  if (isNew) {
    el.querySelector(".mb").textContent = mbOf(tok);
    el.querySelector(".it-d").textContent = descOf(tok);
    const meta = metaOf(tok), ar = SET.group ? "" : areaOf(tok);
    el.querySelector(".it-m").textContent = [meta, ar ? scase(ar) : ""].filter(Boolean).join(" · ");
  }
  el.querySelector(".sp").innerHTML = st === "si" ? `<span class="stamp si">Presente</span>${m.c === "R" ? '<span class="stamp c-r">Regular</span>' : m.c === "M" ? '<span class="stamp c-m">Malo</span>' : ""}` : st === "no" ? `<span class="stamp no">No está</span>` : "";
  const tags = [];
  if (moved) tags.push(`<span class="tg w">${ic("swap")}Trasladado a ${esc(tcase(own))}</span>`);
  else if (inn) tags.push(`<span class="tg g">${ic("swap")}Recibido de ${esc(tcase(inn.from))}</span>`);
  if (m?.pending) tags.push(`<span class="tg w">${ic("cloud")}Por enviar</span>`);
  if (ph) tags.push(`<span class="tg b">${ic("camera")}${ph}</span>`);
  if (m?.n) tags.push(`<span class="tg">${ic("note")}Nota</span>`);
  el.querySelector(".it-tags").innerHTML = tags.join("");
  el.querySelector(".it-tags").hidden = !tags.length;
  const [a, b] = el.querySelectorAll(".mk");
  a.classList.toggle("on", st === "si"); b.classList.toggle("on", st === "no"); a.disabled = b.disabled = moved;
  a.setAttribute("aria-pressed", st === "si"); b.setAttribute("aria-pressed", st === "no");
  if (!isNew && prev !== st && (st === "si" || st === "no") && FX.motion) {
    const s = el.querySelector(".stamp"); s && s.classList.add("thump");
    el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
    if (s) setTimeout(() => { const r = s.getBoundingClientRect(); if (r.width) FX.burst(r.left + r.width / 2, r.top + r.height / 2, st === "si" ? "var(--g)" : "var(--red)"); }, 260);
  }
}
/* deslizar para marcar */
let swiped = 0;
function swipeable(list) {
  let st = null; const TH = 84;
  list.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const it = e.target.closest(".it"); if (!it || !list.contains(it) || e.target.closest(".mk")) return;
    const c = it.querySelector(".it-c"); if (!c || it.classList.contains("mv")) return;
    st = { c, it, x: e.clientX, y: e.clientY, dx: 0, on: false, id: e.pointerId, t: performance.now() };
  });
  list.addEventListener("pointermove", (e) => {
    if (!st || e.pointerId !== st.id) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { st = null; return; }
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      st.on = true; try { st.c.setPointerCapture(e.pointerId); } catch (er) {} st.c.classList.add("drag"); st.it.classList.add("sw");
    }
    st.dx = dx; const w = st.c.offsetWidth * 0.55, ax = Math.abs(dx), d = ax < w ? dx : Math.sign(dx) * (w + (ax - w) * 0.25);
    st.it.classList.toggle("sw-r", dx > 0); st.it.classList.toggle("sw-l", dx < 0);
    st.c.style.transform = `translateX(${d}px)`;
    const armed = ax > TH; if (armed !== !!st.armed) { st.armed = armed; if (armed) FX.buzz(8); st.it.querySelectorAll(".it-bg .ic").forEach((i) => (i.style.transform = armed ? "scale(1.25)" : "")); }
  });
  const end = (e) => {
    if (!st || e.pointerId !== st.id) return; const s = st; st = null; if (!s.on) return;
    swiped = Date.now();
    s.c.classList.remove("drag"); s.c.style.transform = "";
    setTimeout(() => s.it.classList.remove("sw", "sw-r", "sw-l"), 320);
    const fast = Math.abs(s.dx) / (performance.now() - s.t) > 0.7;
    if (Math.abs(s.dx) > TH || (Math.abs(s.dx) > 46 && fast)) doMark(s.it.dataset.key, s.dx > 0 ? "si" : "no", "set");
  };
  list.addEventListener("pointerup", end); list.addEventListener("pointercancel", end);
}
// marcar desde la lista o la ficha: "toggle" (botones) o "set" (deslizar)
function doMark(tok, e, how, name = U.cur) {
  const prev = C.getMark(name, tok); const mb = mbOf(tok);
  if (how === "set" && prev?.e === e) { FX.hit("soft"); snack(mb + (e === "si" ? " ya estaba presente" : " ya estaba como no está")); return; }
  const to = how === "set" ? e : prev?.e === e ? null : e;
  C.markTo(name, tok, to);
  FX.hit(to ? "stamp" : "undo");
  snack(to === "si" ? "✓ " + mb + " presente" : to === "no" ? "✗ " + mb + " no está" : "Marca quitada · " + mb, { action: "Deshacer", onAction: () => undoMark(name, tok, prev) });
}
function undoMark(name, tok, prev) { C.logPop(); C.markTo(name, tok, prev?.e || null, prev ? { c: prev.c || "", n: prev.n || "" } : {}, true); FX.hit("undo"); }

/* =================== RESUMEN =================== */
VIEWS.sum = {
  root: false,
  head: () => ({ t: "Resumen", s: tcase(U.cur), back: true }),
  mount(pg) { this.open = new Set(["no", "pend"]); this.render(pg, true); },
  update() { const pg = $("view").firstElementChild; if (!pg) return; pg.querySelectorAll("details.acc").forEach((d) => (d.open ? this.open.add(d.dataset.k) : this.open.delete(d.dataset.k))); const y = $("view").scrollTop; this.render(pg, false); $("view").scrollTop = y; },
  render(pg, anim) {
    const name = U.cur, sm = C.summaryOf(name), tot = sm.own.length, rev = sm.si.length + sm.no.length, p = pct(rev, tot);
    const fs = (n) => ((n / (tot || 1)) * 100).toFixed(2);
    const da = (a, off) => `${fs(a)} ${100 - Number(fs(a))}`;
    const siA = fs(sm.si.length), noA = fs(sm.no.length);
    const fin = sm.fin;
    const li = (t, extra) => `<button type="button" class="li" data-act="item" data-key="${esc(t)}"><span class="mb">${esc(mbOf(t))}</span><span class="t"><span>${esc(descOf(t))}</span><small>${esc(extra ?? metaOf(t))}</small></span></button>`;
    const acc = (k, title, toks, icn, f, def) => toks.length ? `<details class="acc" data-k="${k}"${this.open.has(k) || def ? " open" : ""}><summary>${icn}<span>${title}</span><span class="n">${toks.length}</span>${ic("chev", "ch")}</summary><div class="lst">${toks.slice(0, 400).map((t) => li(t, f ? f(t) : undefined)).join("")}${toks.length > 400 ? `<p class="tiny">y ${toks.length - 400} más</p>` : ""}</div></details>` : "";
    const ex = Object.entries(sm.extras);
    pg.innerHTML = `
      <div class="sumtop">
        <div class="donut"><svg viewBox="0 0 36 36"><circle class="bg" cx="18" cy="18" r="15.5" pathLength="100"/><circle class="si" cx="18" cy="18" r="15.5" pathLength="100" ${anim ? `data-da="${siA} ${100 - siA}"` : `style="stroke-dasharray:${siA} ${100 - siA}"`}/><circle class="no" cx="18" cy="18" r="15.5" pathLength="100" style="stroke-dashoffset:-${siA}${anim ? "" : `;stroke-dasharray:${noA} ${100 - noA}`}" ${anim ? `data-da="${noA} ${100 - noA}"` : ""}/></svg><div class="c"><b ${anim ? `data-v="0" data-count="${p}"` : ""}>${anim ? 0 : p}</b><small>% revisado</small></div></div>
        <div class="lgd"><div><i style="background:var(--g)"></i>Presentes<b>${sm.si.length}</b></div><div><i style="background:var(--red)"></i>No están<b>${sm.no.length}</b></div><div><i style="background:var(--line)"></i>Pendientes<b>${sm.pend.length}</b></div><div class="tiny">${rev} de ${tot} revisados${sm.gone.length ? " · " + sm.gone.length + " trasladados" : ""}</div></div>
      </div>
      ${fin ? `<div class="bigstamp${this.justFin ? " thump" : ""}"><b>Inventariado</b><small>${esc(fdate(fin.t || fin.at))}${fin.by ? " · " + esc(first(fin.by)) : ""}${fin.pending ? " · por enviar" : ""}</small></div>` : ""}
      ${sm.valNo > 0 ? `<div class="card money">${ic("money")}<div><b>${esc(money(sm.valNo))}</b><small>Valor de lo que no está (de ${esc(money(sm.valTot))} en el resguardo)</small></div></div>` : ""}
      ${sm.reg.length || sm.mal.length ? `<div class="card money">${ic("alert")}<div><b>${sm.reg.length} regular · ${sm.mal.length} malo</b><small>Estado físico anotado en la revisión</small></div></div>` : ""}
      ${acc("no", "No están", sm.no, `<span class="stamp no" style="transform:none">✗</span>`)}
      ${acc("pend", "Pendientes de revisar", sm.pend, ic("clock"))}
      ${acc("mal", "En mal estado o regular", sm.mal.concat(sm.reg), ic("alert"), (t) => CONDN[C.getMark(name, t)?.c] + (C.getMark(name, t)?.n ? " · " + C.getMark(name, t).n : ""))}
      ${acc("notes", "Con observaciones", sm.notes, ic("note"), (t) => C.getMark(name, t)?.n || "")}
      ${acc("gone", "Trasladados a otra persona", sm.gone, ic("swap"), (t) => "Ahora a nombre de " + tcase(C.owner(t)))}
      ${acc("rec", "Recibidos de otra persona", sm.rec, ic("swap"), (t) => "Venía de " + tcase(S.moves.inn[name][t].from))}
      ${ex.length ? `<details class="acc" data-k="ex"${this.open.has("ex") ? " open" : ""}><summary>${ic("tag")}<span>Sobrantes (no están en la lista)</span><span class="n">${ex.length}</span>${ic("chev", "ch")}</summary><div class="lst">${ex.map(([t, x]) => `<div class="li"><span class="mb">${esc(t.slice(1))}</span><span class="t"><span>${esc(x.n || "")}</span><small>${x.pending ? "Por enviar" : fdt(x.at || x.t)}</small></span></div>`).join("")}</div></details>` : ""}
      ${acc("si", "Presentes", sm.si, `<span class="stamp si" style="transform:none">✓</span>`)}
      <div class="acts"><button class="btn" data-act="share">${ic("share")}Compartir</button><button class="btn" data-act="acta">${ic("print")}Acta / PDF</button><button class="btn" data-act="csv">${ic("file")}Excel (CSV)</button></div>
      <div id="sSlide"></div>
      <p class="tiny" style="text-align:center;margin-top:10px">${fin ? "Ya está finalizado. Puedes finalizar de nuevo si hiciste cambios." : sm.pend.length ? "Quedan " + sm.pend.length + " pendientes. Puedes finalizar de todos modos." : "Todo revisado."}</p>`;
    this.justFin = false;
    slider($("sSlide"), fin ? "Desliza para finalizar otra vez" : "Desliza para finalizar", () => {
      C.finish(name); this.justFin = true; FX.hit("done"); FX.confetti({ y: innerHeight * 0.3 });
      snack("Inventario finalizado. Se envía al portal " + (navigator.onLine ? "ahora." : "cuando haya internet."), { icon: "check" });
    }, sm.pend.length && !fin ? "" : "");
    if (anim) { FX.fill(pg); FX.countAll(pg); }
  },
};
function slider(el, label, onDone, cls) {
  el.className = "slide " + (cls || "");
  el.innerHTML = `<div class="slide-f"></div><div class="slide-t"><span>${esc(label)}</span></div><div class="slide-k" role="button" tabindex="0" aria-label="${esc(label)}">${ic("arrow")}</div>`;
  const k = el.querySelector(".slide-k"), f = el.querySelector(".slide-f"); let st = null, done = false;
  const fire = () => { if (done) return; done = true; el.classList.add("done"); el.querySelector(".slide-t span").textContent = "Listo"; k.innerHTML = ic("check"); FX.buzz(30); setTimeout(onDone, 120); };
  k.addEventListener("pointerdown", (e) => { if (done) return; st = { x: e.clientX, max: el.offsetWidth - k.offsetWidth - 10, d: 0 }; k.setPointerCapture(e.pointerId); k.classList.add("drag"); f.style.transition = "none"; });
  k.addEventListener("pointermove", (e) => { if (!st) return; st.d = Math.max(0, Math.min(st.max, e.clientX - st.x)); k.style.transform = `translateX(${st.d}px)`; f.style.width = st.d + 64 + "px"; });
  const up = () => { if (!st) return; const s = st; st = null; k.classList.remove("drag"); f.style.transition = "width .45s var(--spring)"; if (s.d >= s.max * 0.88) { k.style.transform = `translateX(${s.max}px)`; f.style.width = "100%"; fire(); } else { k.style.transform = ""; f.style.width = ""; if (s.d < 6) snack("Desliza el botón hasta el final para confirmar."); } };
  k.addEventListener("pointerup", up); k.addEventListener("pointercancel", up);
  k.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (k.dataset.arm) fire(); else { k.dataset.arm = "1"; snack("Presiona otra vez para confirmar."); setTimeout(() => delete k.dataset.arm, 3000); } } });
}
function summaryText(name) {
  const sm = C.summaryOf(name);
  const L2 = [`INVENTARIO · ${name}`, `Fecha: ${fdt(Date.now())} · Revisó: ${S.user}`, `Presentes: ${sm.si.length} · No están: ${sm.no.length} · Pendientes: ${sm.pend.length} · Total: ${sm.own.length}`];
  if (sm.valNo) L2.push(`Valor de lo que no está: ${money(sm.valNo)}`);
  const add = (t, toks, f) => { if (toks.length) { L2.push("", t + ":"); toks.forEach((x) => L2.push(" - " + f(x))); } };
  const d = (t) => mbOf(t) + " " + cell(C.row(t), K.DS);
  add("NO ESTÁN", sm.no, d); add("PENDIENTES", sm.pend, d); add("TRASLADADOS", sm.gone, (t) => d(t) + " → " + C.owner(t));
  add("ESTADO REGULAR O MALO", sm.reg.concat(sm.mal), (t) => d(t) + " · " + CONDN[C.getMark(name, t).c]);
  add("OBSERVACIONES", sm.notes, (t) => d(t) + " · " + C.getMark(name, t).n);
  const ex = Object.entries(sm.extras); if (ex.length) add("SOBRANTES", ex.map((x) => x[0]), (t) => t.slice(1) + " · " + (sm.extras[t].n || ""));
  return L2.join("\n");
}
async function shareSummary(name) {
  const txt = summaryText(name);
  if (navigator.share) { try { await navigator.share({ title: "Inventario · " + name, text: txt }); return; } catch (e) { if (e.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(txt); snack("Resumen copiado. Pégalo en WhatsApp o en un correo.", { icon: "copy" }); } catch (e) { snack("No se pudo copiar el resumen.", { bad: true }); }
}
function csvFor(name) {
  const sm = C.summaryOf(name);
  const q = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const rows = [["Marbete", "Descripción", "Marca", "Modelo", "Serie", "Área", "Importe", "Revisión", "Estado físico", "Observaciones", "Revisado por", "Fecha"]];
  const push = (t, est) => { const r = C.row(t), m = C.getMark(name, t); rows.push([mbOf(t), cell(r, K.DS), cell(r, K.MA), cell(r, K.MO), cell(r, K.SE), cell(r, K.AR), cell(r, K.IM), est, m?.e === "si" ? CONDN[m.c] || "" : "", m?.n || "", m?.by || "", m?.at ? fdt(m.at) : ""]); };
  for (const t of sm.own) { const m = C.getMark(name, t); push(t, m?.e === "si" ? "Presente" : m?.e === "no" ? "No está" : "Pendiente"); }
  for (const t of sm.gone) push(t, "Trasladado a " + C.owner(t));
  for (const [t, x] of Object.entries(sm.extras)) rows.push([t.slice(1), x.n || "Sobrante", "", "", "", "", "", "Sobrante", "", "", x.by || "", fdt(x.at || x.t)]);
  return "﻿" + rows.map((r) => r.map(q).join(",")).join("\r\n");
}
async function downloadCSV(name) {
  const fn = "inventario_" + name.replace(/[^\wÁÉÍÓÚÑáéíóúñ]+/g, "_").slice(0, 60) + ".csv";
  const blob = new Blob([csvFor(name)], { type: "text/csv;charset=utf-8" });
  try { const file = new File([blob], fn, { type: "text/csv" }); if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: fn }); return; } } catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fn; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  snack("Archivo descargado: " + fn, { icon: "file" });
}
function printActa(name) {
  const sm = C.summaryOf(name);
  const tr = (t, est) => { const r = C.row(t), m = C.getMark(name, t); return `<tr><td>${esc(mbOf(t))}</td><td>${esc(cell(r, K.DS))}</td><td>${esc([cell(r, K.MA), cell(r, K.MO), cell(r, K.SE)].filter((x) => !isNA(x)).join(" · "))}</td><td>${esc(est)}</td><td>${esc(m?.e === "si" ? CONDN[m.c] || "" : "")}</td><td>${esc(m?.n || "")}</td></tr>`; };
  const tbl = (title, toks, est) => toks.length ? `<h2>${esc(title)} (${toks.length})</h2><table><thead><tr><th>Marbete</th><th>Descripción</th><th>Marca · modelo · serie</th><th>Revisión</th><th>Estado físico</th><th>Observaciones</th></tr></thead><tbody>${toks.map((t) => tr(t, typeof est === "function" ? est(t) : est)).join("")}</tbody></table>` : "";
  $("print").innerHTML = `<div class="hd">${MARK()}<div><h1>Acta de revisión de inventario</h1><div>CONALEP Chetumal · Servicios Administrativos</div></div></div>
    <p><b>Resguardante:</b> ${esc(name)}<br><b>Fecha de impresión:</b> ${esc(fdt(Date.now()))}${sm.fin ? `<br><b>Finalizado:</b> ${esc(fdt(sm.fin.t || sm.fin.at))}` : ""}<br><b>Revisó:</b> ${esc(S.user)}</p>
    <div class="kp"><div><b>${sm.own.length}</b>Artículos</div><div><b>${sm.si.length}</b>Presentes</div><div><b>${sm.no.length}</b>No están</div><div><b>${sm.pend.length}</b>Pendientes</div>${sm.valNo ? `<div><b>${esc(money(sm.valNo))}</b>Valor de lo que no está</div>` : ""}</div>
    ${tbl("No están", sm.no, "No está")}${tbl("Pendientes de revisar", sm.pend, "Pendiente")}${tbl("Trasladados", sm.gone, (t) => "Trasladado a " + C.owner(t))}${tbl("Presentes", sm.si, "Presente")}
    <div class="firmas"><div>${esc(name)}<br>Resguardante</div><div>${esc(S.user)}<br>Revisó</div><div>Vo. Bo.<br>Servicios Administrativos</div></div>`;
  setTimeout(() => window.print(), 60);
}

/* =================== BUSCAR =================== */
VIEWS.search = {
  root: true,
  head: () => ({ t: "Buscar", s: fmtN(Object.keys(S.inv?.i || {}).length) + " artículos en la lista maestra" }),
  mount(pg) {
    pg.innerHTML = `<div class="greet"><h1>Buscar un bien</h1><p>Por marbete, descripción, serie, marca, área o resguardante.</p></div>
      <div class="tools"><div class="srch">${ic("search")}<input id="gq" type="search" placeholder="Ej. 734821 o monitor lenovo" autocomplete="off" enterkeyhint="search" aria-label="Buscar en todo el inventario"><button class="clr" type="button" data-act="gclr" aria-label="Borrar" hidden>${ic("x")}</button></div><button type="button" class="ibtn" data-act="scanlook" aria-label="Escanear para consultar">${ic("scan")}</button></div>
      <div id="gRec"></div><div class="tiny" id="gInfo" style="margin:4px 2px 8px"></div><div class="ilist" id="gRes"></div>`;
    const q = $("gq"); q.value = U.gq; let t = 0;
    q.oninput = () => { U.gq = q.value; clearTimeout(t); t = setTimeout(() => this.update(), 120); };
    q.onkeydown = (e) => { if (e.key === "Enter") { remember(q.value); q.blur(); } };
    this.update(true);
    if (!U.gq) setTimeout(() => { if (V === this && matchMedia("(pointer:fine)").matches) q.focus(); }, 300);
  },
  update(firstTime) {
    const q = U.gq.trim(); document.querySelector('[data-act="gclr"]').hidden = !q;
    const rec = rj("cnlp_rs", []);
    $("gRec").innerHTML = !q && rec.length ? `<div class="sec" style="margin-top:6px"><h2>Búsquedas recientes</h2></div><div class="chips">${rec.map((r) => `<button type="button" class="chip" data-act="grec" data-q="${esc(r)}">${ic("clock")}${esc(r)}</button>`).join("")}</div>` : "";
    if (!q) { $("gInfo").textContent = ""; $("gRes").replaceChildren(); if (!rec.length) $("gRes").innerHTML = `<div class="empty">${ic("search")}<b>Escribe para buscar</b><span>Encuentra cualquier artículo aunque no sepas de quién es.</span></div>`; return; }
    const r = C.search(q, 80);
    $("gInfo").textContent = r.total ? (r.total === 1 ? "1 resultado" : fmtN(r.total) + " resultados") + (r.more ? " · se muestran los primeros " + r.list.length : "") : "";
    if (!r.list.length) { $("gRes").innerHTML = `<div class="empty">${ic("box")}<b>Sin resultados</b><span>Revisa el número o prueba con otra palabra.</span></div>`; return; }
    if ($("gRes").querySelector(".empty")) $("gRes").replaceChildren();
    keyed($("gRes"), r.list, srHTML, srFill);
    if (firstTime) stagger($("gRes"), 10);
  },
};
function remember(q) { q = q.trim(); if (q.length < 2) return; const r = rj("cnlp_rs", []).filter((x) => x !== q); r.unshift(q); wj("cnlp_rs", r.slice(0, 6)); }
const srHTML = (tok) => `<div class="it sr" data-key="${esc(tok)}"><div class="it-c" role="button" tabindex="0" data-act="item"><span class="it-i"><span class="it-top"><span class="mb"></span><span class="sp"></span></span><span class="it-d"></span><span class="it-m"></span></span></div></div>`;
function srFill(el, tok) {
  const own = C.owner(tok), m = C.getMark(own, tok); const st = m?.e || "";
  const sig = st + own; if (el.dataset.sig === sig) return; el.dataset.sig = sig;
  el.className = "it sr" + (st ? " " + st : "");
  el.querySelector(".mb").textContent = mbOf(tok); el.querySelector(".it-d").textContent = descOf(tok);
  el.querySelector(".it-m").innerHTML = ic("user") + " " + esc(tcase(own)) + (areaOf(tok) ? " · " + esc(scase(areaOf(tok))) : "");
  el.querySelector(".sp").innerHTML = st === "si" ? '<span class="stamp si">Presente</span>' : st === "no" ? '<span class="stamp no">No está</span>' : "";
}

/* =================== ACTIVIDAD =================== */
const EV = { si: ["check", "Presente"], no: ["x", "No está"], un: ["undo", "Marca quitada"], mv: ["swap", "Traslado"], ex: ["tag", "Sobrante anotado"], fin: ["flag", "Inventario finalizado"], ft: ["camera", "Foto agregada"], c: ["note", "Estado u observaciones"] };
VIEWS.act = {
  root: true,
  head: () => ({ t: "Actividad", s: "Lo hecho en este teléfono" }),
  mount(pg) { this.pg = pg; this.render(true); },
  update() { this.render(false); },
  render(anim) {
    const log = S.log.slice().reverse(); const today = dayKey(Date.now());
    const tl = S.log.filter((e) => dayKey(e.t) === today);
    const rev = tl.filter((e) => e.k === "si" || e.k === "no");
    const c = (k) => tl.filter((e) => e.k === k).length;
    let rate = "";
    if (rev.length >= 3) { const span = (rev[rev.length - 1].t - rev[0].t) / 36e5; if (span > 0.05) rate = Math.round(rev.length / span) + " por hora"; }
    const hours = []; for (let h = 7; h <= 20; h++) hours.push({ h, n: rev.filter((e) => new Date(e.t).getHours() === h).length });
    const mx = Math.max(1, ...hours.map((x) => x.n));
    let lastDay = "", items = "";
    for (const e of log.slice(0, 160)) {
      const d = fday(e.t); if (d !== lastDay) { items += `<li class="tl-day">${esc(d)}</li>`; lastDay = d; }
      const [icn, lbl] = EV[e.k] || ["info", e.k];
      const sub = e.tok && C.row(e.tok) ? mbOf(e.tok) + " · " + descOf(e.tok) : e.tok ? e.tok.slice(1) : "";
      const who = e.k === "mv" ? tcase(e.name) + " → " + tcase(e.to) : tcase(e.name || "");
      items += `<li><button type="button" class="tl-i" ${e.tok && C.row(e.tok) ? `data-act="item" data-key="${esc(e.tok)}"` : ""}><span class="tl-ic ${e.k}">${ic(icn)}</span><span class="t"><b>${esc(lbl)}${e.k === "c" && e.c ? " · " + esc(CONDN[e.c] || "") : ""}</b><small>${esc(sub)}</small><small>${esc(who)}</small></span><time>${ftime(e.t)}</time></button></li>`;
    }
    this.pg.innerHTML = `<div class="greet"><h1>Tu actividad</h1><p>${esc(longDate())}</p></div>
      <div class="today"><div class="card"><b ${anim ? `data-v="0" data-count="${rev.length}"` : ""}>${anim ? 0 : rev.length}</b><small>artículos revisados hoy${rate ? "<br>Ritmo: " + rate : ""}</small></div>
        <div class="mini"><div class="card"><b style="color:var(--g)">${c("si")}</b><small>Presentes</small></div><div class="card"><b style="color:var(--red)">${c("no")}</b><small>No están</small></div><div class="card"><b>${c("mv")}</b><small>Traslados</small></div><div class="card"><b>${c("ft")}</b><small>Fotos</small></div></div></div>
      <div class="bars" aria-label="Revisiones por hora">${hours.map((x) => `<div><i class="${x.n ? "" : "z"}" ${anim ? `data-h="${(x.n / mx) * 100}"` : `style="height:${(x.n / mx) * 100}%"`} title="${x.n}"></i><span>${x.h}</span></div>`).join("")}</div>
      <div class="sec"><h2>Historial</h2><span class="tiny">${S.log.length} acciones</span></div>
      ${items ? `<ul class="tl">${items}</ul>` : `<div class="empty">${ic("act")}<b>Todavía no hay actividad</b><span>Cuando marques, traslades o tomes fotos, aparecerá aquí.</span></div>`}`;
    if (anim) { FX.fill(this.pg); FX.countAll(this.pg); }
  },
};

/* =================== AJUSTES =================== */
VIEWS.more = {
  root: true,
  head: () => ({ t: "Más", s: "Ajustes y cuenta" }),
  mount(pg) { this.pg = pg; this.render(); },
  update() { this.render(); },
  render() {
    const n = S.ops.length, fsent = S.fidx.filter((f) => f.sent).length;
    const sw = (k, on) => `<span class="sw" role="switch" aria-checked="${!!on}" data-sw="${k}"></span>`;
    const th = (k, l, i) => `<button type="button" class="${SET.theme === k ? "on" : ""}" data-act="theme" data-t="${k}">${ic(i)}${l}</button>`;
    this.pg.innerHTML = `<div class="prof">${av(S.user, "")}<div><b>${esc(S.user)}</b><small>Sesión iniciada en este teléfono</small></div></div>
      <div class="set-g"><button type="button" class="set-r" data-act="queue">${ic(n ? "cloud" : "cloudok")}<span class="t">Envíos al portal<small>${n ? (n === 1 ? "1 cambio esperando" : n + " cambios esperando") : "Todo está en el portal"}${S.lastSync ? " · último envío " + esc(fdt(S.lastSync)) : ""}</small></span>${n ? `<span class="cnt">${n}</span>` : ""}${ic("chev")}</button>
        <button type="button" class="set-r" data-act="refreshinv">${ic("sync")}<span class="t">Actualizar inventario<small>Descarga los cambios que hicieron otros${S.inv?.at ? " · datos al " + esc(fdt(S.inv.at)) : ""}</small></span></button>
        <a class="set-r" href="/" target="_blank" rel="noopener">${ic("globe")}<span class="t">Abrir el portal web<small>Lista maestra, historial y fotos</small></span>${ic("chev")}</a></div>
      <div class="set-h">Apariencia</div>
      <div class="set-g"><div class="set-r">${ic(isDark() ? "moon" : "sun")}<span class="t">Tema</span><div class="segm">${th("auto", "Auto", "auto")}${th("light", "Claro", "sun")}${th("dark", "Oscuro", "moon")}</div></div>
        <button type="button" class="set-r" data-act="sw" data-k="less">${ic("spark")}<span class="t">Menos animaciones<small>Útil si el teléfono es lento</small></span>${sw("less", SET.less)}</button></div>
      <div class="set-h">Al revisar</div>
      <div class="set-g"><button type="button" class="set-r" data-act="sw" data-k="auto">${ic("bolt")}<span class="t">Marcar presente al escanear<small>Si lo apagas, la app pregunta cada vez</small></span>${sw("auto", SET.auto)}</button>
        <button type="button" class="set-r" data-act="sw" data-k="sound">${ic("sound")}<span class="t">Sonidos</span>${sw("sound", SET.sound)}</button>
        <button type="button" class="set-r" data-act="sw" data-k="vib">${ic("vib")}<span class="t">Vibración<small>En Android</small></span>${sw("vib", SET.vib)}</button>
        <button type="button" class="set-r" data-act="sw" data-k="group">${ic("layers")}<span class="t">Agrupar artículos por área<small>Para revisar salón por salón</small></span>${sw("group", SET.group)}</button></div>
      <div class="set-h">Teléfono</div>
      <div class="set-g">${standalone() ? "" : `<button type="button" class="set-r" data-act="install2">${ic("install")}<span class="t">Instalar la app<small>Para abrirla sin internet desde la pantalla de inicio</small></span>${ic("chev")}</button>`}
        <button type="button" class="set-r" data-act="free">${ic("image")}<span class="t">Liberar espacio de fotos<small>${S.fidx.length} fotos guardadas en el teléfono · ${fsent} ya están en el portal</small></span></button>
        <button type="button" class="set-r" data-act="onb">${ic("book")}<span class="t">Ver la guía rápida</span>${ic("chev")}</button></div>
      <div class="set-g"><button type="button" class="set-r dan" data-act="logout">${ic("logout")}<span class="t">Cerrar sesión<small>Borra del teléfono los datos del inventario</small></span></button></div>
      <div class="foot">${MARK()}Inventario CONALEP · versión ${C.VERSION}<br>Lector USB o Bluetooth: escanea con la app abierta.</div>`;
  },
};

/* =================== ENVÍOS =================== */
VIEWS.queue = {
  root: false,
  head: () => ({ t: "Envíos al portal", s: S.lastSync ? "Último envío " + fdt(S.lastSync) : "", back: true }),
  mount(pg) { this.pg = pg; this.render(); },
  update() { this.render(); },
  render() {
    const n = S.ops.length, bad = S.ops.filter((o) => o.hold || o.err).length;
    const st = S.syncing ? ["busy", "sync", "Enviando…", "Mandando tus cambios al portal."] : !navigator.onLine ? ["off", "cloudoff", "Sin internet", n ? (n === 1 ? "1 cambio guardado" : n + " cambios guardados") + " en el teléfono. Se envían solos al volver la señal." : "Puedes seguir trabajando: todo se guarda en el teléfono."] : S.authLost ? ["bad", "alert", "Entra de nuevo", "Tu sesión venció. Lo pendiente sigue guardado."] : bad ? ["bad", "alert", "Hay " + bad + " por revisar", "Alguien cambió algo antes que tú. Decide qué hacer abajo."] : n ? ["off", "cloud", n + " por enviar", "Se envían en unos segundos."] : ["ok", "cloudok", "Todo está en el portal", "No hay nada pendiente en este teléfono."];
    const d = (t) => (C.row(t) ? mbOf(t) + " · " + descOf(t) : t.slice(1));
    const it = (o) => {
      const [icn, lbl] = o.type === "mark" ? (o.e === "si" ? ["check", "Presente"] : o.e === "no" ? ["x", "No está"] : ["undo", "Quitar marca"]) : o.type === "move" ? ["swap", "Traslado"] : o.type === "extra" ? ["tag", "Sobrante"] : o.type === "fin" ? ["flag", "Finalizar inventario"] : ["camera", "Foto"];
      const k = o.type === "mark" ? (o.e || "un") : o.type === "move" ? "mv" : o.type === "extra" ? "ex" : o.type === "fin" ? "fin" : "ft";
      const sub = o.type === "move" ? d(o.tok) + " · " + tcase(C.nm(o.from)) + " → " + tcase(o.to) : o.type === "fin" ? tcase(o.name) : o.type === "foto" ? d(o.tok) : d(o.tok) + " · " + tcase(o.name);
      let extra = "";
      if (o.hold === "conflict") extra = `<div class="er">Ese marbete ahora aparece a nombre de «${esc(tcase(C.nm(o.now)))}», no de «${esc(tcase(C.nm(o.from)))}». Alguien lo cambió antes.</div><div class="row"><button class="btn pri sm" data-act="qforce" data-id="${o.id}">Trasladar a ${esc(tcase(o.to))} de todos modos</button><button class="btn dan sm" data-act="qdel" data-id="${o.id}">Descartar</button></div>`;
      else if (o.hold === "missing") extra = `<div class="er">Ese marbete ya no existe en la lista.</div><div class="row"><button class="btn dan sm" data-act="qdel" data-id="${o.id}">Descartar</button></div>`;
      else if (o.err) extra = `<div class="er">${esc(o.err)}</div><div class="row"><button class="btn pri sm" data-act="qretry" data-id="${o.id}">Reintentar</button><button class="btn dan sm" data-act="qdel" data-id="${o.id}">Descartar</button></div>`;
      return `<div class="qi"><span class="tl-ic ${k}">${ic(icn)}</span><span class="t"><b>${lbl}</b><small>${esc(sub)}</small><small>${fdt(o.t)}</small>${extra}</span></div>`;
    };
    this.pg.innerHTML = `<div class="synch"><span class="cloud ${st[0]}">${ic(st[1])}</span><b>${esc(st[2])}</b><p>${esc(st[3])}</p></div>
      <div class="row" style="margin-bottom:8px"><button class="btn pri" data-act="syncnow" ${S.syncing ? "disabled" : ""}>${ic("sync")}Enviar ahora</button><button class="btn" data-act="refreshinv">${ic("cloud")}Actualizar datos</button></div>
      ${S.err ? `<div class="card" style="color:var(--red);margin-top:8px">${esc(S.err)}</div>` : ""}
      ${n ? `<div class="sec"><h2>Por enviar</h2><span class="tiny">${n}</span></div>` + S.ops.slice().sort((a, b) => (b.hold || b.err ? 1 : 0) - (a.hold || a.err ? 1 : 0)).map(it).join("") : ""}`;
  },
};

/* =================== FICHA DE UN ARTÍCULO =================== */
function openItem(tok, ctxName) {
  if (!C.row(tok)) return;
  if (!$("scan").hidden) pauseScan();
  let noteEl = null, markName = null;
  const saveNote = () => {
    if (!noteEl || !markName) return; const m = C.getMark(markName, tok); if (!m) return;
    const v = C.clean(noteEl.value); if (v !== (m.n || "")) { C.markTo(markName, tok, m.e, { n: v }); snack("Observación guardada", { icon: "note" }); }
  };
  sheet.open((box) => {
    const r = C.row(tok), own = C.owner(tok), ctx = ctxName || "";
    markName = !ctx || ctx === own ? own : null;
    const m = markName ? C.getMark(markName, tok) : null;
    const ph = C.photoCount(tok);
    let h = `<div class="sh-head"><div class="t"><div class="sh-mb"><span class="disp">${esc(mbOf(tok))}</span>${m?.e === "si" ? '<span class="stamp si">Presente</span>' : m?.e === "no" ? '<span class="stamp no">No está</span>' : ""}</div><div class="sh-d">${esc(descOf(tok))}</div></div><button type="button" class="sh-x" data-act="close" aria-label="Cerrar">${ic("x")}</button></div>
      <div class="who-row">${av(own)}<span class="t"><small>Resguardante</small><b>${esc(tcase(own))}</b>${areaOf(tok) ? `<small style="margin-top:3px">${ic("pin")} ${esc(scase(areaOf(tok)))}</small>` : ""}</span></div>`;
    if (markName) {
      h += `<span class="lbl">Revisión${ctx ? "" : " · inventario de " + esc(tcase(own))}</span>
        <div class="mkbig"><button type="button" class="si${m?.e === "si" ? " on" : ""}" data-act="msi">${ic("check")}Presente</button><button type="button" class="no${m?.e === "no" ? " on" : ""}" data-act="mno">${ic("x")}No está</button></div>`;
      if (m?.e === "si") h += `<span class="lbl">Estado físico</span><div class="cond">${["B", "R", "M"].map((c) => `<button type="button" class="${c}${m.c === c ? " on" : ""}" data-act="cond" data-c="${c}"><i></i>${CONDN[c]}</button>`).join("")}</div>`;
      h += `<span class="lbl">Observaciones</span><textarea class="note" id="shNote" maxlength="400" placeholder="${m ? "Ej. le falta una pata, está en la bodega…" : "Primero marca si está o no está"}" ${m ? "" : "disabled"}>${esc(m?.n || "")}</textarea>`;
      if (m) h += `<div class="tiny" style="margin-top:6px">${m.pending ? "Por enviar · " : ""}Marcado ${m.by ? "por " + esc(m.by) + " " : ""}${m.at ? "el " + esc(fdt(m.at)) : ""}</div>`;
    } else {
      h += `<div class="card" style="background:var(--mansoft);border-color:transparent;color:var(--man);margin-top:10px"><b>No está en el resguardo de ${esc(tcase(ctx))}</b><div style="font-size:.88rem;margin-top:2px">En la lista maestra aparece a nombre de ${esc(tcase(own))}.</div></div>
        <button type="button" class="btn pri blk" style="margin-top:10px" data-act="takeit">${ic("swap")}Trasladar a ${esc(tcase(ctx))} y marcar ✓</button>`;
    }
    h += `<span class="lbl">Fotos${ph ? " (" + ph + ")" : ""}</span><div class="photos" id="shPh"><button type="button" class="ph-add" data-act="addph">${ic("camera")}Tomar foto</button></div><input type="file" accept="image/*" capture="environment" id="shFile" hidden>`;
    const kv = S.inv.h.map((hd, j) => (j === K.MB || j === K.DS || j === K.RC || !cell(r, j) ? "" : `<dt>${esc(cap(hd.toLowerCase()))}</dt><dd>${esc(cell(r, j))}</dd>`)).join("");
    h += `<span class="lbl">Datos del bien</span><dl class="kv">${kv}</dl>`;
    const out = Object.entries(S.moves.out).filter(([, o]) => o[tok]).map(([from, o]) => ({ from, to: o[tok].to, t: o[tok].t }));
    if (out.length) h += `<span class="lbl">Traslados hechos en este teléfono</span><ul class="hist">${out.map((x) => `<li>${ic("swap")}<span>${esc(tcase(x.from))} → ${esc(tcase(x.to))} · ${esc(fdt(x.t))}</span></li>`).join("")}</ul>`;
    h += `<button type="button" class="btn blk" style="margin-top:14px" data-act="trf">${ic("swap")}Trasladar a otro resguardante</button><div id="shTrf"></div>`;
    box.innerHTML = h;
    noteEl = box.querySelector("#shNote");
    if (noteEl) noteEl.addEventListener("change", saveNote);
    fillPhotos(box.querySelector("#shPh"), tok);
    box.querySelector("#shFile").onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return; e.target.value = "";
      try { await C.addPhoto(tok, f); FX.hit("ok"); snack("Foto guardada" + (navigator.onLine ? ". Se sube al portal." : ". Se sube cuando haya internet."), { icon: "camera" }); sheet.redraw(); }
      catch (er) { snack("No se pudo guardar la foto.", { bad: true }); }
    };
    box.dataset.tok = tok; box.dataset.ctx = ctx; box.dataset.mn = markName || "";
  }, { onclose: () => { saveNote(); resumeScanSoon(); } });
}
async function fillPhotos(el, tok) {
  if (!el) return;
  const locals = await C.localPhotos(tok); const seen = new Set();
  const urls = [];
  for (const f of locals) { seen.add(f.fid); urls.push({ src: f.data, pend: !f.sent }); }
  const srv = (S.fotos[tok]?.list || []).filter((f) => !seen.has(f.id));
  for (const f of srv) urls.push({ id: f.id });
  if (!el.isConnected) return;
  urls.forEach((u, i) => {
    const d = document.createElement("button"); d.type = "button"; d.className = "ph"; d.style.animationDelay = i * 50 + "ms";
    const im = document.createElement("img"); im.alt = "Foto " + (i + 1); d.append(im);
    if (u.pend) d.insertAdjacentHTML("beforeend", "<em>Por enviar</em>");
    if (u.src) im.src = u.src; else if (navigator.onLine) C.serverPhoto(tok, u.id).then((x) => { im.src = x; u.src = x; }).catch(() => {}); else d.insertAdjacentHTML("beforeend", "<em>Sin internet</em>");
    d.onclick = () => lightbox(urls, i);
    el.append(d);
  });
}
function lightbox(urls, i) {
  const lb = document.createElement("div"); lb.className = "lb";
  const draw = () => { lb.innerHTML = `<img alt="" src="${esc(urls[i].src || "")}"><button class="x" type="button" aria-label="Cerrar">${ic("x")}</button><div class="n">${i + 1} de ${urls.length}${urls.length > 1 ? " · desliza para ver más" : ""}</div>`; lb.querySelector(".x").onclick = () => closeLayer("lb"); };
  draw(); topLayer(lb);
  let x0 = null;
  lb.addEventListener("pointerdown", (e) => (x0 = e.clientX));
  lb.addEventListener("pointerup", (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50 && urls.length > 1) { i = (i + (dx < 0 ? 1 : -1) + urls.length) % urls.length; draw(); } else if (e.target === lb) closeLayer("lb"); });
  pushLayer("lb", () => lb.remove());
}
function transferPanel(tok, ctx) {
  const box = $("shTrf"); if (!box) return;
  const names = C.resNames(); const cur = C.rawOwner(tok);
  box.innerHTML = `<div class="trf"><div class="srch">${ic("search")}<input id="tq" placeholder="Busca o escribe el nombre" autocomplete="off" aria-label="Nuevo resguardante"></div><div class="plm" id="tlst"></div><div id="tconf"></div></div>`;
  const q = box.querySelector("#tq"), lst = box.querySelector("#tlst"), conf = box.querySelector("#tconf");
  const pick = (nv) => {
    if (nv === cur) { conf.innerHTML = `<p class="err">Ya está en el resguardo de esa persona.</p>`; return; }
    lst.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.n === nv));
    conf.innerHTML = `<div class="trc"><span class="a">${esc(tcase(C.nm(cur)))}</span>${ic("arrow")}<span class="a">${esc(tcase(nv))}</span></div>${names.includes(nv) ? "" : `<p class="tiny">«${esc(nv)}» no está en la lista: se agregará como nuevo resguardante.</p>`}<div class="row"><button class="btn pri" type="button" id="tgo">${ic("swap")}Trasladar marbete ${esc(mbOf(tok))}</button></div>`;
    conf.querySelector("#tgo").onclick = () => { C.move(tok, nv, ctx || C.nm(cur)); FX.hit("whoosh"); snack("Marbete " + mbOf(tok) + " trasladado a " + tcase(nv), { icon: "swap" }); sheet.redraw(); };
    conf.scrollIntoView({ behavior: FX.motion ? "smooth" : "auto", block: "nearest" });
  };
  const draw = () => {
    const t = C.norm(q.value.trim());
    const list = names.filter((n) => n !== cur && (!t || C.norm(n).includes(t))).slice(0, 60);
    const typed = C.clean(q.value).toUpperCase();
    lst.innerHTML = list.map((n) => `<button type="button" data-n="${esc(n)}">${av(n)}<span>${esc(tcase(n))}</span></button>`).join("") + (typed && !list.length && typed.length > 3 ? `<button type="button" data-n="${esc(typed)}">${ic("plus")}<span>Usar «${esc(typed)}»</span></button>` : "");
    lst.querySelectorAll("button").forEach((b) => (b.onclick = () => pick(b.dataset.n)));
  };
  q.oninput = draw; draw(); setTimeout(() => q.focus(), 80);
  box.scrollIntoView({ behavior: FX.motion ? "smooth" : "auto", block: "start" });
}
function keyEntry() {
  const inScan = !$("scan").hidden; if (inScan) pauseScan();
  sheet.open((box) => {
    box.innerHTML = `<div class="sh-head"><div class="t"><div class="sh-d" style="font-size:1.25rem">Teclear el número de marbete</div><div class="tiny">${U.view === "per" || (inScan && SC.mode === "inv") ? "Se marca presente en el inventario de " + esc(tcase(inScan ? SC.name : U.cur)) : "Para consultar un artículo"}</div></div><button type="button" class="sh-x" data-act="close" aria-label="Cerrar">${ic("x")}</button></div>
      <form class="keyin" id="kf"><input id="kin" inputmode="numeric" autocomplete="off" placeholder="730065" aria-label="Número de marbete"><button class="btn pri" type="submit">${ic("arrow")}</button></form><div class="err" id="kerr"></div>`;
    const f = box.querySelector("#kf"), inp = box.querySelector("#kin");
    f.onsubmit = (e) => {
      e.preventDefault(); const code = C.parseCode(inp.value) || C.clean(inp.value);
      if (!code) { box.querySelector("#kerr").textContent = "Escribe un número de marbete."; return; }
      const tok = C.findTok(code);
      if (!tok && !(inScan ? SC.mode === "inv" : U.view === "per")) { box.querySelector("#kerr").textContent = "El marbete " + code + " no está en la lista maestra."; FX.hit("err"); inp.select(); return; }
      closeThen("sheet", () => processCode(code, inScan ? "scan" : "manual"));
    };
    setTimeout(() => inp.focus(), 120);
  }, { onclose: resumeScanSoon });
}

/* =================== PROCESAR UN CÓDIGO =================== */
function processCode(code, src) {
  const inScan = !$("scan").hidden;
  const tok = C.findTok(code);
  const ctx = inScan ? (SC.mode === "inv" ? SC.name : "") : U.view === "per" || U.view === "sum" ? U.cur : "";
  let r;
  if (!tok) r = { k: "unknown", code };
  else {
    const own = C.owner(tok);
    if (!ctx) r = { k: "look", tok, own };
    else if (own !== ctx) r = { k: "other", tok, own };
    else {
      const m = C.getMark(ctx, tok);
      if (m?.e === "si") r = { k: "already", tok };
      else if (SET.auto || src === "manual") { C.markTo(ctx, tok, "si"); r = { k: "marked", tok, prev: m }; }
      else r = { k: "confirm", tok };
    }
  }
  r.ctx = ctx; r.src = src;
  FX.hit({ marked: "ok", already: "soft", confirm: "soft", look: "soft", other: "warn", unknown: "err" }[r.k]);
  if (inScan) scanResult(r); else appResult(r);
  return r;
}
function appResult(r) {
  if (r.k === "marked") {
    snack("✓ " + mbOf(r.tok) + " presente", { action: "Deshacer", onAction: () => undoMark(r.ctx, r.tok, r.prev) });
    const el = document.querySelector(`.it[data-key="${CSS.escape(r.tok)}"]`);
    if (el) { el.scrollIntoView({ behavior: FX.motion ? "smooth" : "auto", block: "center" }); el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
  } else if (r.k === "already") snack(mbOf(r.tok) + " ya estaba registrado ✓", { icon: "check" });
  else if (r.k === "unknown") unknownSheet(r.code, r.ctx);
  else openItem(r.tok, r.ctx || r.own);
}
function unknownSheet(code, ctx) {
  sheet.open((box) => {
    box.innerHTML = `<div class="sh-head"><div class="t"><div class="sh-mb"><span class="disp">${esc(code)}</span></div><div class="sh-d">Este marbete no está en la lista maestra</div></div><button type="button" class="sh-x" data-act="close" aria-label="Cerrar">${ic("x")}</button></div>
      <p class="muted">${ctx ? "Puedes anotarlo como sobrante en el inventario de " + esc(tcase(ctx)) + " para revisarlo después en el portal." : "Revisa que el número esté bien escrito."}</p>
      <div class="row">${ctx ? `<button class="btn warn" type="button" data-act="extra" data-code="${esc(code)}">${ic("tag")}Anotar como sobrante</button>` : ""}<button class="btn" type="button" data-act="close">Cerrar</button></div>`;
  });
}

/* =================== ESCÁNER =================== */
const SC = { mode: "inv", name: "", stream: null, det: null, timer: 0, last: { k: "", at: 0 }, hist: [], n: 0, torch: false, zoom: 1, wake: null, run: false, paused: false, cv: null, cx: null, r: null };
async function openScan(mode) {
  FX.unlock();
  SC.mode = mode; SC.name = mode === "inv" ? U.cur : ""; SC.last = { k: "", at: 0 }; SC.hist = []; SC.n = 0; SC.paused = false; SC.r = null;
  const sc = $("scan"); sc.hidden = false; sc.classList.remove("lock", "w", "e", "flash"); metaTheme("#000000");
  pushLayer("scan", closeScan);
  $("st").textContent = mode === "inv" ? tcase(SC.name) : "Consultar un marbete";
  $("ss").textContent = mode === "inv" ? "Escanea los marbetes de este resguardo" : "Escanea para ver de quién es";
  $("shist").hidden = true; $("shist").innerHTML = "";
  scanProg(); scanHint();
  try { SC.wake = await navigator.wakeLock?.request("screen"); } catch (e) { SC.wake = null; }
  if (!navigator.mediaDevices?.getUserMedia) { scanFail("Este navegador no permite usar la cámara."); return; }
  try {
    SC.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch (e) { scanFail(e.name === "NotAllowedError" ? "No hay permiso para usar la cámara. Actívalo en los ajustes del navegador." : "No se pudo abrir la cámara (" + (e.message || e.name) + ")."); return; }
  if ($("scan").hidden) { SC.stream.getTracks().forEach((t) => t.stop()); SC.stream = null; return; }
  const vid = $("vid"); vid.srcObject = SC.stream; try { await vid.play(); } catch (e) {}
  const tr = SC.stream.getVideoTracks()[0]; const caps = tr.getCapabilities ? tr.getCapabilities() : {};
  $("storch").hidden = !caps.torch; SC.torch = false; $("storch").classList.remove("on");
  SC.zoomMax = caps.zoom ? Math.min(caps.zoom.max, 3) : 1; SC.zoom = 1; $("szoom").hidden = !(SC.zoomMax > 1.4); $("szoom").textContent = "1×";
  if (!SC.det && "BarcodeDetector" in window) { try { const f = await BarcodeDetector.getSupportedFormats(); if (f.includes("qr_code")) SC.det = new BarcodeDetector({ formats: ["qr_code"] }); } catch (e) {} }
  SC.run = true; tick();
}
function closeScan() {
  SC.run = false; clearTimeout(SC.timer);
  if (SC.stream) { SC.stream.getTracks().forEach((t) => t.stop()); SC.stream = null; }
  try { SC.wake && SC.wake.release(); } catch (e) {} SC.wake = null;
  $("vid").srcObject = null; $("scan").hidden = true; metaTheme();
  if (SC.n && SC.mode === "inv") snack(SC.n + (SC.n === 1 ? " marbete registrado" : " marbetes registrados") + " con la cámara", { icon: "check" });
  refresh();
}
function pauseScan() { SC.paused = true; }
let resT = 0;
function resumeScanSoon() { clearTimeout(resT); resT = setTimeout(() => { SC.paused = false; if (!$("scan").hidden) scanProg(); }, 350); }
$("sx").onclick = () => closeLayer("scan");
$("skey").onclick = () => keyEntry();
$("storch").onclick = async () => { try { SC.torch = !SC.torch; await SC.stream.getVideoTracks()[0].applyConstraints({ advanced: [{ torch: SC.torch }] }); $("storch").classList.toggle("on", SC.torch); FX.hit("tap"); } catch (e) {} };
$("szoom").onclick = async () => { try { SC.zoom = SC.zoom > 1 ? 1 : Math.min(2, SC.zoomMax); await SC.stream.getVideoTracks()[0].applyConstraints({ advanced: [{ zoom: SC.zoom }] }); $("szoom").textContent = SC.zoom + "×"; $("szoom").classList.toggle("on", SC.zoom > 1); FX.hit("tap"); } catch (e) {} };
document.addEventListener("visibilitychange", async () => {
  if ($("scan").hidden) return;
  if (document.hidden) { SC.run = false; clearTimeout(SC.timer); }
  else { if (SC.stream && !SC.run) { SC.run = true; tick(); } try { SC.wake = await navigator.wakeLock?.request("screen"); } catch (e) {} }
});
function frameText() {
  const vid = $("vid"); const vw = vid.videoWidth, vh = vid.videoHeight; if (!vw) return null;
  const k = Math.min(1, 960 / vw), w = Math.round(vw * k), h = Math.round(vh * k);
  if (!SC.cv) { SC.cv = document.createElement("canvas"); SC.cx = SC.cv.getContext("2d", { willReadFrequently: true }); }
  SC.cv.width = w; SC.cv.height = h; SC.cx.drawImage(vid, 0, 0, w, h);
  const id = SC.cx.getImageData(0, 0, w, h);
  return window.QRDec.decode({ data: id.data, width: w, height: h });
}
async function tick() {
  if (!SC.run) return;
  try {
    const vid = $("vid");
    if (!SC.paused && vid.readyState >= 2) {
      let txt = null;
      if (SC.det) { try { const r = await SC.det.detect(vid); if (r[0]) txt = r[0].rawValue; } catch (e) {} }
      if (!txt) txt = frameText();
      if (txt) onCode(txt);
    }
  } catch (e) { console.error(e); }
  SC.timer = setTimeout(tick, 90);
}
function onCode(txt) {
  const code = C.parseCode(txt); if (!code) return;
  const key = C.findTok(code) || "x" + code;
  if (SC.last.k === key && Date.now() - SC.last.at < 3000) { SC.last.at = Date.now(); return; }
  SC.last = { k: key, at: Date.now() };
  processCode(code, "scan");
}
function scanProg() {
  const p = $("sprog");
  if (SC.mode !== "inv" || !S.inv) { p.hidden = true; return; }
  const sm = C.summaryOf(SC.name), tot = sm.own.length, rev = sm.si.length + sm.no.length, pc = pct(rev, tot);
  if (p.hidden || !p.firstElementChild) { p.innerHTML = ring(pc, "", "") + `<span><b>${rev}</b> de ${tot}</span>`; p.hidden = false; FX.fill(p); }
  else { setRing(p.querySelector(".ring"), pc, ""); p.querySelector("b").textContent = rev; }
  return sm;
}
function scanHint() {
  $("sres").innerHTML = `<div class="sc-hint sc-res"><span class="qrani">${ic("scan")}</span><span><b>Apunta al código QR del marbete</b><small>${SC.mode === "inv" ? "Cada marbete leído se marca presente." : "Verás de quién es y si ya se revisó."}</small></span></div>`;
}
function scanFail(msg) {
  $("sres").innerHTML = `<div class="sc-fail sc-res">${ic("camera")}<p>${esc(msg)}</p><button class="btn pri blk" type="button" data-act="key">${ic("kbd")}Teclear el número de marbete</button></div>`;
}
function lockFx(kind) {
  const sc = $("scan"); sc.classList.remove("lock", "w", "e", "flash"); void sc.offsetWidth;
  sc.classList.add("lock"); if (kind === "w") sc.classList.add("w"); if (kind === "e") sc.classList.add("e"); if (kind === "ok") sc.classList.add("flash");
  clearTimeout(lockFx.t); lockFx.t = setTimeout(() => sc.classList.remove("lock", "w", "e", "flash"), 900);
}
function scanHist(tok, cls) {
  SC.hist = SC.hist.filter((h) => h.tok !== tok); SC.hist.unshift({ tok, cls }); SC.hist = SC.hist.slice(0, 10);
  const h = $("shist"); h.hidden = false;
  h.innerHTML = SC.hist.map((x) => `<button type="button" class="${x.cls}" data-act="sitem" data-key="${esc(x.tok)}"><i></i>${esc(x.tok[0] === "x" ? x.tok.slice(1) : mbOf(x.tok))}</button>`).join("");
}
function scanResult(r) {
  SC.r = r;
  const body = (tok) => { const meta = metaOf(tok); return `<div class="rbody"><span class="t"><span class="mb">${esc(mbOf(tok))}</span><span>${esc(descOf(tok))}</span>${meta ? `<small>${esc(meta)}</small>` : ""}</span></div>`; };
  const head = (cls, icn, t, s) => `<div class="rhead"><span class="rico">${ic(icn, icn === "check" || icn === "x" ? "draw" : "")}</span><span class="t"><b>${t}</b><small>${s || ""}</small></span></div>`;
  let h = "";
  if (r.k === "marked" || r.k === "already" || r.k === "confirm") {
    const sm = scanProg(); const rem = sm ? sm.pend.length : 0;
    if (r.k === "marked") { SC.n++; lockFx("ok"); scanHist(r.tok, "si"); }
    else { lockFx(); scanHist(r.tok, r.k === "already" ? "si" : ""); }
    const m = C.getMark(r.ctx, r.tok);
    const cnd = m?.e === "si" ? `<div class="cond" style="margin-top:10px">${["B", "R", "M"].map((c) => `<button type="button" class="${c}${m.c === c ? " on" : ""}" data-act="scond" data-c="${c}"><i></i>${CONDN[c]}</button>`).join("")}</div>` : "";
    if (r.k === "marked") h = `<div class="sc-res r-ok">${head("ok", "check", "Presente", SC.n + " en esta sesión · " + (rem ? rem + " por revisar" : "¡todo revisado!"))}${body(r.tok)}${cnd}<div class="row"><button class="btn sm" type="button" data-act="sundo">${ic("undo")}Deshacer</button><button class="btn sm dan" type="button" data-act="sno">${ic("x")}No está</button><button class="btn sm" type="button" data-act="sphoto">${ic("camera")}Foto</button><button class="btn sm" type="button" data-act="sitem" data-key="${esc(r.tok)}">${ic("info")}Ficha</button></div></div>`;
    else if (r.k === "already") h = `<div class="sc-res r-info">${head("info", "check", "Ya estaba registrado ✓", m?.by ? "Por " + esc(m.by) + (m.at ? " · " + esc(fdt(m.at)) : "") : "")}${body(r.tok)}${cnd}<div class="row"><button class="btn sm" type="button" data-act="sunmark">${ic("undo")}Quitar ✓</button><button class="btn sm" type="button" data-act="sphoto">${ic("camera")}Foto</button><button class="btn sm" type="button" data-act="sitem" data-key="${esc(r.tok)}">${ic("info")}Ficha</button></div></div>`;
    else h = `<div class="sc-res r-info">${head("info", "scan", "¿Está aquí?", "Confirma la revisión")}${body(r.tok)}<div class="row"><button class="btn pri" type="button" data-act="ssi">${ic("check")}Presente</button><button class="btn dan" type="button" data-act="sno">${ic("x")}No está</button></div></div>`;
    if (r.k === "marked" && rem === 0 && sm.own.length && !U.cel.has(r.ctx)) { U.cel.add(r.ctx); setTimeout(() => { FX.confetti({ y: innerHeight * 0.35 }); FX.hit("done"); }, 250); }
  } else if (r.k === "other") {
    lockFx("w"); scanHist(r.tok, "w");
    h = `<div class="sc-res r-warn">${head("warn", "alert", "Está a nombre de otra persona", "Lista maestra: " + esc(tcase(r.own)) + " · puedes pasarlo a " + esc(tcase(r.ctx)))}${body(r.tok)}<div class="row"><button class="btn pri" type="button" data-act="stake">${ic("swap")}Trasladar aquí y marcar ✓</button><button class="btn" type="button" data-act="shint">Omitir</button><button class="btn" type="button" data-act="sitem" data-key="${esc(r.tok)}">Ficha</button></div></div>`;
  } else if (r.k === "unknown") {
    lockFx("e"); scanHist("x" + r.code, "no");
    h = `<div class="sc-res r-err">${head("err", "x", "El marbete " + esc(r.code) + " no está en la lista maestra", r.ctx ? "Puedes anotarlo como sobrante para revisarlo después." : "Revisa que sea un marbete de CONALEP.")}<div class="row">${r.ctx ? `<button class="btn warn" type="button" data-act="extra" data-code="${esc(r.code)}">${ic("tag")}Anotar como sobrante</button>` : ""}<button class="btn" type="button" data-act="shint">Ignorar</button></div></div>`;
  } else {
    lockFx(); const m = C.getMark(r.own, r.tok); scanHist(r.tok, m?.e === "si" ? "si" : m?.e === "no" ? "no" : "");
    h = `<div class="sc-res r-info">${head("info", "user", esc(tcase(r.own)), m?.e === "si" ? "Revisado: presente" + (m.at ? " · " + esc(fdt(m.at)) : "") : m?.e === "no" ? "Revisado: no está" : "Todavía sin revisar")}${body(r.tok)}<div class="row">${m?.e !== "si" ? `<button class="btn pri" type="button" data-act="slooksi">${ic("check")}Marcar presente</button>` : ""}<button class="btn" type="button" data-act="sitem" data-key="${esc(r.tok)}">${ic("info")}Ficha, foto o traslado</button></div></div>`;
  }
  $("sres").innerHTML = h;
}
function scanPhoto(tok) {
  const f = document.createElement("input"); f.type = "file"; f.accept = "image/*"; f.setAttribute("capture", "environment");
  pauseScan();
  f.onchange = async () => { const x = f.files[0]; if (x) { try { await C.addPhoto(tok, x); FX.hit("ok"); snack("Foto guardada · " + mbOf(tok), { icon: "camera" }); } catch (e) { snack("No se pudo guardar la foto.", { bad: true }); } } resumeScanSoon(); };
  window.addEventListener("focus", () => resumeScanSoon(), { once: true });
  f.click();
}

/* =================== CELEBRACIÓN =================== */
function celebrate(name, sm) {
  FX.confetti(); FX.hit("done");
  sheet.open((box) => {
    box.innerHTML = `<div style="text-align:center;padding:10px 0 4px">${ring(100, "big", "100<small>%</small>")}<h2 style="margin:16px 0 6px;font-size:1.5rem;letter-spacing:-.02em">¡Revisaste todo!</h2><p class="muted" style="margin:0 auto 16px;max-width:30ch">Los ${sm.own.length} artículos de ${esc(tcase(name))} ya tienen revisión: ${sm.si.length} presentes y ${sm.no.length} que no están.</p></div>
      <button class="btn pri blk" type="button" data-act="celsum">${ic("flag")}Ver resumen y finalizar</button><button class="btn ghost blk" type="button" data-act="close" style="margin-top:6px">Seguir aquí</button>`;
    FX.fill(box);
  });
}

/* =================== ACCIONES (un solo escucha para todo) =================== */
const ctxTok = (el) => el.closest("[data-key]")?.dataset.key;
const A = {
  per: (el) => go("per", el.closest("[data-key]").dataset.key),
  hf: (el) => { U.hf = el.dataset.f; FX.hit("tap"); V.update(); },
  hsort: () => { const o = ["az", "low", "high", "big"]; SET.sort = o[(o.indexOf(SET.sort) + 1) % o.length]; saveSet(); FX.hit("tap"); V.update(); },
  hclr: () => { U.hq = ""; $("hq").value = ""; V.update(); $("hq").focus(); },
  pclr: () => { U.pq = ""; $("pq").value = ""; V.update(); $("pq").focus(); },
  gclr: () => { U.gq = ""; $("gq").value = ""; V.update(); $("gq").focus(); },
  grec: (el) => { U.gq = el.dataset.q; $("gq").value = U.gq; V.update(); },
  install: async () => { if (!deferredInstall) return; deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) {} deferredInstall = null; V.update(); },
  install2: () => { if (deferredInstall) return A.install(); const ios = /iphone|ipad|ipod/i.test(navigator.userAgent); snack(ios ? "En Safari: Compartir → «Agregar a pantalla de inicio»." : "Abre el menú del navegador (⋮) → «Instalar app».", { ms: 5000 }); },
  hidehint: () => { wj("cnlp_hint", 1); $("hInst").innerHTML = ""; },
  pf: (el) => { U.pf = U.pf === el.dataset.f && el.classList.contains("st") ? "all" : el.dataset.f; FX.hit("tap"); V.update(); },
  group: () => { SET.group = !SET.group; saveSet(); FX.hit("tap"); document.querySelector('[data-act="group"]').classList.toggle("on", SET.group); V.update(); snack(SET.group ? "Agrupado por área" : "Lista sin agrupar", { icon: "layers", ms: 1600 }); },
  area: (el) => { const a = el.dataset.key.slice(1); U.collapsed.has(a) ? U.collapsed.delete(a) : U.collapsed.add(a); FX.hit("tap"); V.update(); },
  si: (el) => doMark(ctxTok(el), "si", "toggle"),
  no: (el) => doMark(ctxTok(el), "no", "toggle"),
  item: (el) => { if (Date.now() - swiped < 350) return; openItem(ctxTok(el), U.view === "per" || U.view === "sum" ? U.cur : ""); },
  key: () => keyEntry(),
  scaninv: () => openScan("inv"),
  scanlook: () => openScan("look"),
  sum: () => go("sum"),
  queue: () => go("queue"),
  share: () => shareSummary(U.cur),
  acta: () => printActa(U.cur),
  csv: () => downloadCSV(U.cur),
  close: () => sheet.close(),
  celsum: () => closeThen("sheet", () => go("sum")),
  retryboot: () => C.start(),
  // ficha
  msi: () => sheetMark("si"), mno: () => sheetMark("no"),
  cond: (el) => { const b = $("shin"), tok = b.dataset.tok, mn = b.dataset.mn, m = C.getMark(mn, tok); if (!m) return; const c = m.c === el.dataset.c ? "" : el.dataset.c; C.markTo(mn, tok, m.e, { c }); FX.hit("tap"); sheet.redraw(); },
  addph: () => $("shFile").click(),
  trf: (el) => { el.hidden = true; transferPanel($("shin").dataset.tok, $("shin").dataset.ctx); },
  takeit: () => { const b = $("shin"), tok = b.dataset.tok, ctx = b.dataset.ctx; C.move(tok, ctx, ctx); C.markTo(ctx, tok, "si"); FX.hit("stamp"); snack("Trasladado a " + tcase(ctx) + " y marcado ✓", { icon: "swap" }); sheet.redraw(); },
  extra: (el) => { const ctx = !$("scan").hidden ? SC.name : U.cur; C.addExtra(ctx, el.dataset.code); FX.hit("ok"); if (!$("scan").hidden && !$("sheet").open) { $("sres").innerHTML = `<div class="sc-res r-ok"><div class="rhead"><span class="rico">${ic("tag", "draw")}</span><span class="t"><b>Anotado como sobrante</b><small>Marbete ${esc(el.dataset.code)}</small></span></div></div>`; } else { sheet.close(); snack("Sobrante anotado: " + el.dataset.code, { icon: "tag" }); } },
  // escáner
  sundo: () => { const r = SC.r; if (!r) return; undoMark(r.ctx, r.tok, r.prev); SC.n = Math.max(0, SC.n - 1); SC.hist = SC.hist.filter((h) => h.tok !== r.tok); $("sres").innerHTML = ""; scanHint(); scanProg(); SC.last = { k: "", at: 0 }; },
  sunmark: () => { const r = SC.r; if (!r) return; const prev = C.getMark(r.ctx, r.tok); C.markTo(r.ctx, r.tok, null); FX.hit("undo"); scanHint(); scanProg(); snack("Marca quitada · " + mbOf(r.tok), { action: "Deshacer", onAction: () => undoMark(r.ctx, r.tok, prev) }); },
  sno: () => { const r = SC.r; if (!r) return; C.markTo(r.ctx, r.tok, "no"); if (r.k === "marked") SC.n = Math.max(0, SC.n - 1); FX.hit("stamp"); scanHist(r.tok, "no"); scanProg(); $("sres").innerHTML = `<div class="sc-res r-err"><div class="rhead"><span class="rico">${ic("x", "draw")}</span><span class="t"><b>Marcado: no está</b><small>${esc(mbOf(r.tok))} · ${esc(descOf(r.tok))}</small></span></div></div>`; },
  ssi: () => { const r = SC.r; if (!r) return; const prev = C.getMark(r.ctx, r.tok); C.markTo(r.ctx, r.tok, "si"); scanResult({ ...r, k: "marked", prev }); FX.hit("ok"); },
  scond: (el) => { const r = SC.r; if (!r) return; const m = C.getMark(r.ctx, r.tok); if (!m) return; const c = m.c === el.dataset.c ? "" : el.dataset.c; C.markTo(r.ctx, r.tok, m.e, { c }); FX.hit("tap"); el.parentElement.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.c === c)); },
  sphoto: () => { const r = SC.r; if (r?.tok) scanPhoto(r.tok); },
  sitem: (el) => { const tok = el.dataset.key || SC.r?.tok; if (!tok || tok[0] === "x") return; openItem(tok, SC.mode === "inv" ? SC.name : ""); },
  stake: async () => { const r = SC.r; if (!r) return; await C.move(r.tok, r.ctx, r.ctx); await C.markTo(r.ctx, r.tok, "si"); SC.n++; FX.hit("ok"); lockFx("ok"); scanHist(r.tok, "si"); scanProg(); $("sres").innerHTML = `<div class="sc-res r-ok"><div class="rhead"><span class="rico">${ic("check", "draw")}</span><span class="t"><b>Trasladado a ${esc(tcase(r.ctx))} y marcado ✓</b><small>${esc(mbOf(r.tok))} · ${esc(descOf(r.tok))}</small></span></div></div>`; },
  shint: () => { scanHint(); SC.last = { k: "", at: 0 }; },
  slooksi: () => { const r = SC.r; if (!r) return; C.markTo(r.own, r.tok, "si"); FX.hit("stamp"); scanResult(r); },
  // ajustes
  theme: (el, e) => setTheme(el.dataset.t, e),
  sw: (el) => { const k = el.dataset.k; SET[k] = !SET[k]; saveSet(); FX.hit("tap"); V.update(); },
  refreshinv: async () => { if (!navigator.onLine) return snack("Sin internet. Conéctate para actualizar.", { bad: true }); snack("Actualizando…", { icon: "sync", ms: 8000 }); try { if (S.ops.length) await C.sync(); else await C.pull(); snack("Inventario actualizado", { icon: "check" }); } catch (e) { snack(e.message || "No se pudo actualizar", { bad: true }); } refresh(); },
  syncnow: () => { if (!navigator.onLine) return snack("Sin internet. Se enviará al volver la señal.", { bad: true }); C.sync(); },
  qforce: (el) => { const o = S.ops.find((x) => x.id === el.dataset.id); if (o) C.forceMove(o); },
  qretry: (el) => { const o = S.ops.find((x) => x.id === el.dataset.id); if (o) C.retry(o); },
  qdel: (el) => { const o = S.ops.find((x) => x.id === el.dataset.id); if (o) { C.discard(o); snack("Descartado", { icon: "trash" }); } },
  free: async () => { const n = await C.freeSent(); snack(n ? n + " fotos borradas del teléfono (siguen en el portal)" : "No hay fotos que liberar", { icon: "image" }); V.update(); },
  onb: () => showOnb(true),
  logout: () => logoutSheet(),
};
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]"); if (!el || el.disabled) return;
  const f = A[el.dataset.act]; if (!f) return;
  if (el.tagName === "A") return;
  e.preventDefault(); FX.unlock();
  try { f(el, e); } catch (er) { console.error(er); snack("Algo falló: " + er.message, { bad: true }); }
});
document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.click(); } });
function sheetMark(e) {
  const b = $("shin"), tok = b.dataset.tok, mn = b.dataset.mn; if (!mn) return;
  const prev = C.getMark(mn, tok); const to = prev?.e === e ? null : e;
  const note = $("shNote") && C.clean($("shNote").value);
  C.markTo(mn, tok, to, to && note !== undefined && note !== (prev?.n || "") ? { n: note } : {});
  FX.hit(to ? "stamp" : "undo");
  sheet.redraw();
  const st = $("shin").querySelector(".sh-mb .stamp"); if (st && FX.motion) st.classList.add("thump");
  if (!$("scan").hidden) { scanProg(); if (SC.r?.tok === tok) scanResult({ ...SC.r, k: to === "si" ? "already" : SC.r.k }); }
}
$("tabs").addEventListener("click", (e) => { const t = e.target.closest(".tab"); if (t) tab(t.dataset.tab); });
$("fab").onclick = () => openScan("look");
$("hb").onclick = () => {
  FX.hit("tap");
  if (L.length && L[L.length - 1].id === "view") { history.back(); return; }
  if (L.some((x) => x.id === "view")) { closeLayer("view"); return; }
  const p = stack.pop(); if (p) { U.view = p.view; U.cur = p.cur; mountView("b"); }
};
$("net").onclick = () => { if (S.authLost) showLogin(""); else if (U.view !== "queue") go("queue"); };
$("view").addEventListener("scroll", () => $("hdr").classList.toggle("scrolled", $("view").scrollTop > 4), { passive: true });
/* jalar hacia abajo para actualizar */
(() => {
  const v = $("view"); let y0 = null, d = 0, el = null;
  const okView = () => V === VIEWS.home || V === VIEWS.per || V === VIEWS.queue || V === VIEWS.act || V === VIEWS.sum;
  v.addEventListener("touchstart", (e) => { y0 = v.scrollTop <= 0 && okView() && e.touches.length === 1 && !e.target.closest(".it-c") ? e.touches[0].clientY : null; d = 0; }, { passive: true });
  v.addEventListener("touchmove", (e) => {
    if (y0 == null) return; d = e.touches[0].clientY - y0;
    if (d <= 0 || v.scrollTop > 0) { if (el) el.style.opacity = "0"; return; }
    if (!el) { el = document.createElement("div"); el.className = "ptr"; el.innerHTML = ic("sync"); v.prepend(el); }
    el.style.opacity = String(Math.min(1, d / 90)); el.style.transform = `translate(-50%, ${Math.min(d * 0.5, 64)}px) rotate(${d * 2}deg)`;
    const arm = d > 90; if (arm !== el.classList.contains("arm")) { el.classList.toggle("arm", arm); if (arm) FX.buzz(8); }
  }, { passive: true });
  v.addEventListener("touchend", async () => {
    if (y0 == null) return; y0 = null; const e2 = el; el = null; if (!e2) return;
    if (d > 90) { e2.classList.add("spin"); await A.refreshinv(); }
    e2.style.opacity = "0"; setTimeout(() => e2.remove(), 300);
  }, { passive: true });
})();
window.addEventListener("resize", () => { if (V?.root) moveInd(); const s = document.querySelector(".segc"); if (s) segInd(s); });

/* lector de códigos USB o Bluetooth (escribe como teclado y termina con Enter) */
const KB = { buf: "", t: 0 };
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest("input,textarea,select,[contenteditable]")) return;
  if (!S.inv || !$("login").hidden || !$("onb").hidden) return;
  const now = performance.now(); if (now - KB.t > 120) KB.buf = ""; KB.t = now;
  if (e.key === "Enter") { if (KB.buf.length >= 3) { const code = C.parseCode(KB.buf) || C.parseCode(KB.buf.replace(/[^A-Za-z0-9]/g, "")); KB.buf = ""; if (code) { e.preventDefault(); if ($("sheet").open && $("scan").hidden) closeThen("sheet", () => processCode(code, "hid")); else processCode(code, $("scan").hidden ? "hid" : "scan"); } } return; }
  if (e.key.length === 1) KB.buf += e.key;
});

/* tema con transición circular */
function setTheme(t, e) {
  if (SET.theme === t) return;
  const apply = () => { SET.theme = t; saveSet(); if (V === VIEWS.more) V.update(); };
  if (!document.startViewTransition || !FX.motion) { apply(); return; }
  const x = e?.clientX ?? innerWidth / 2, y = e?.clientY ?? innerHeight / 2, r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(apply);
  vt.ready.then(() => document.documentElement.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] }, { duration: 520, easing: "cubic-bezier(.65,0,.35,1)", pseudoElement: "::view-transition-new(root)" })).catch(() => {});
}

/* =================== CERRAR SESIÓN =================== */
function logoutSheet() {
  const n = S.ops.length;
  sheet.open((box) => {
    box.innerHTML = `<div class="sh-head"><div class="t"><div class="sh-d" style="font-size:1.25rem">¿Cerrar sesión?</div></div><button type="button" class="sh-x" data-act="close" aria-label="Cerrar">${ic("x")}</button></div>
      <p class="muted">Se borran del teléfono el inventario, las fotos guardadas y la actividad. Lo que ya se envió sigue en el portal.</p>
      ${n ? `<div class="card" style="background:var(--redsoft);color:var(--red);border-color:transparent"><b>Hay ${n} cambios sin enviar.</b> Si cierras sesión ahora se pierden. Mejor conéctate a internet y espera a que diga «Todo enviado».</div>` : ""}
      <div id="loSl"></div>`;
    slider(box.querySelector("#loSl"), n ? "Desliza para salir y perder " + n : "Desliza para cerrar sesión", async () => { closeThen("sheet", async () => { await C.logout(); }); }, "dan");
  });
}

/* =================== ACCESO =================== */
function showLogin(msg) {
  const lg = $("login"); lg.hidden = false; metaTheme("#004536");
  $("lerr").textContent = ""; const n = $("lnote"); n.hidden = !msg; n.textContent = msg || "";
  const last = rj("cnlp_lastu", ""); if (last) { const r = document.querySelector(`input[name="lu"][value="${CSS.escape(last)}"]`); if (r) r.checked = true; }
  if (S.user) { const r = document.querySelector(`input[name="lu"][value="${CSS.escape(S.user)}"]`); if (r) r.checked = true; }
  setTimeout(() => { if (matchMedia("(pointer:fine)").matches) $("lp").focus(); }, 300);
}
$("lcard").onsubmit = async (ev) => {
  ev.preventDefault(); FX.unlock();
  const b = $("lb"), user = document.querySelector('input[name="lu"]:checked')?.value || "Juan Moreno";
  if (!$("lp").value) { $("lerr").textContent = "Escribe tu contraseña."; shake(); return; }
  b.disabled = true; b.querySelector("span").textContent = "Entrando…"; $("lerr").textContent = "";
  try {
    await C.login(user, $("lp").value);
    wj("cnlp_lastu", user); $("lp").value = "";
    FX.hit("ok");
    $("login").animate([{ opacity: 1 }, { opacity: 0, transform: "scale(1.04)" }], { duration: FX.motion ? 380 : 1, easing: "ease-in" }).onfinish = () => { $("login").hidden = true; metaTheme(); };
  } catch (e) { $("lerr").textContent = e.net ? "Sin internet: para entrar la primera vez necesitas conexión." : e.message || "No se pudo entrar."; shake(); FX.hit("err"); }
  b.disabled = false; b.querySelector("span").textContent = "Entrar";
};
function shake() { const c = $("lcard"); c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake"); }
$("leye").onclick = () => { const p = $("lp"); const show = p.type === "password"; p.type = show ? "text" : "password"; $("leye").innerHTML = ic(show ? "eyeoff" : "eye"); $("leye").setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña"); };

/* =================== GUÍA INICIAL =================== */
function maybeOnboard() { if (rj("cnlp_onb2", 0) !== 1) setTimeout(() => showOnb(false), 500); }
function showOnb(again) {
  const o = $("onb"); let i = 0;
  const slides = [
    { h: "Escanea el QR del marbete", p: "Abre un resguardante y toca Escanear. Cada marbete que lea la cámara queda marcado como presente, con sonido y vibración.", ill: `<div class="ill-phone"><svg class="q" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${P.scan}</svg><i class="ln"></i></div>` },
    { h: "Desliza para marcar", p: "En la lista, desliza un artículo a la derecha si está y a la izquierda si no está. También puedes usar los botones ✓ y ✗.", ill: `<div class="ill-card"><div class="bgc"><span>✓</span><span>✗</span></div><div class="fc"><span class="mb">734821</span><span>Escritorio metálico</span></div></div>` },
    { h: "Sin internet no pasa nada", p: "Todo se guarda en el teléfono y se envía solo al portal cuando vuelve la señal. Arriba ves cuántos cambios faltan por enviar.", ill: `<div class="ill-cloud"><div class="ph2"><i class="dt"></i><i class="dt"></i><i class="dt"></i></div><svg class="cl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${P.cloudok}</svg></div>` },
  ];
  o.innerHTML = `<button class="onb-skip" type="button" data-o="skip">Saltar</button><div class="onb-track">${slides.map((s) => `<section class="onb-s"><div class="ill">${s.ill}</div><h2>${s.h}</h2><p>${s.p}</p></section>`).join("")}</div><div class="onb-dots">${slides.map(() => "<i></i>").join("")}</div><button class="btn pri blk" type="button" data-o="next"></button>`;
  o.hidden = false;
  const draw = () => { o.querySelectorAll(".onb-s").forEach((s) => (s.style.transform = `translateX(${-i * 100}%)`)); o.querySelectorAll(".onb-dots i").forEach((d, k) => d.classList.toggle("on", k === i)); o.querySelector('[data-o="next"]').innerHTML = i < slides.length - 1 ? "Siguiente " + ic("arrow") : "Empezar " + ic("check"); };
  const done = () => { wj("cnlp_onb2", 1); o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FX.motion ? 300 : 1 }).onfinish = () => { o.hidden = true; o.innerHTML = ""; }; };
  o.onclick = (e) => { const b = e.target.closest("[data-o]"); if (!b) return; FX.hit("tap"); if (b.dataset.o === "skip") done(); else if (i < slides.length - 1) { i++; draw(); } else done(); };
  let x0 = null; const tr = o.querySelector(".onb-track");
  tr.onpointerdown = (e) => (x0 = e.clientX);
  tr.onpointerup = (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (dx < -40 && i < slides.length - 1) i++; else if (dx > 40 && i > 0) i--; draw(); };
  draw();
}

/* =================== ARRANQUE =================== */
C.on((k) => {
  if (k === "auth") { showLogin("Tu sesión venció. Entra de nuevo: lo pendiente sigue guardado y se enviará al entrar."); netPill(); return; }
  if (k === "login") { booted = false; stack.length = 0; L.length = 0; U.view = "home"; U.cur = ""; if ($("sheet").open) $("sheet").close(); if (!$("scan").hidden) closeScan(); showBoot(); showLogin(""); return; }
  if (k === "net" && navigator.onLine && S.tok && !S.inv) C.start();
  if (k === "sync" || k === "net") { netPill(); offlineBar(); if (V === VIEWS.queue || V === VIEWS.more) V.update(); if (k === "net" && booted) V?.update?.(); return; }
  refresh();
});
$("lmark").innerHTML = MARK(); $("hlogo").innerHTML = MARK();
$("hb").innerHTML = ic("back"); $("leye").innerHTML = ic("eye");
$("sx").innerHTML = ic("x"); $("skey").innerHTML = ic("kbd"); $("storch").innerHTML = ic("torch");
$("fab").innerHTML = ic("scan");
document.querySelectorAll(".tab").forEach((t) => { t.insertAdjacentHTML("afterbegin", ic(t.dataset.ic)); });
document.querySelectorAll("#login .who label").forEach((l) => { l.insertAdjacentHTML("afterbegin", av(l.dataset.n)); });
$("lb").insertAdjacentHTML("beforeend", ic("arrow"));
applySet();
try { history.replaceState({ l: 0 }, ""); } catch (e) {}
(async () => {
  netPill();
  const r = await C.boot();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (r.needLogin) { showBoot(); showLogin(""); return; }
  if (S.inv) refresh(); else showBoot();
  const wantScan = /[?&]scan=1/.test(location.search);
  if (wantScan) { try { history.replaceState({ l: 0 }, "", location.pathname); } catch (e) {} }
  await C.start();
  if (wantScan && S.inv) setTimeout(() => openScan("look"), 400);
})();
window.__app = { S, C, sync: C.sync, pull: C.pull, addOp: C.addOp, listFor: C.listFor, U, SET, processCode, go };
})();
