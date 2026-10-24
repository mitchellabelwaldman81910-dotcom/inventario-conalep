/* Efectos del portal (los mismos de la app): sonidos sintetizados sin archivos, confeti, números que cuentan, anillos y onda al tocar. */
(() => {
"use strict";
const FX = { sound: true, vib: true, motion: true };
let ac = null, noise = null;
function ctx() {
  try {
    if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); }
    if (ac.state === "suspended") ac.resume().catch(() => {});
    return ac;
  } catch (e) { return null; }
}
function tone(a, f, t0, dur, type = "sine", g = 0.07, f2) {
  const o = a.createOscillator(), v = a.createGain(), t = a.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + 0.012); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(v); v.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function thunk(a) {
  if (!noise) { noise = a.createBuffer(1, Math.round(a.sampleRate * 0.12), a.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); }
  const s = a.createBufferSource(), f = a.createBiquadFilter(), v = a.createGain();
  s.buffer = noise; f.type = "lowpass"; f.frequency.value = 900; v.gain.value = 0.35;
  s.connect(f); f.connect(v); v.connect(a.destination); s.start();
  tone(a, 150, 0, 0.13, "sine", 0.16, 60);
}
FX.unlock = () => { ctx(); };
FX.play = (kind) => {
  if (!FX.sound) return; const a = ctx(); if (!a) return;
  try {
    if (kind === "ok") { tone(a, 1046, 0, 0.09, "sine", 0.08); tone(a, 1568, 0.07, 0.14, "sine", 0.07); }
    else if (kind === "stamp") thunk(a);
    else if (kind === "soft") tone(a, 880, 0, 0.1, "sine", 0.05);
    else if (kind === "warn") { tone(a, 620, 0, 0.12, "triangle", 0.09); tone(a, 440, 0.11, 0.2, "triangle", 0.09); }
    else if (kind === "err") { tone(a, 196, 0, 0.11, "square", 0.04); tone(a, 196, 0.15, 0.13, "square", 0.04); }
    else if (kind === "done") [523, 659, 784, 1046, 1318].forEach((f, i) => tone(a, f, i * 0.08, 0.32, "sine", 0.06));
    else if (kind === "undo") tone(a, 700, 0, 0.14, "sine", 0.05, 380);
    else if (kind === "tap") tone(a, 2200, 0, 0.025, "sine", 0.025);
    else if (kind === "whoosh") tone(a, 300, 0, 0.22, "sine", 0.04, 900);
  } catch (e) {}
};
FX.buzz = (p) => { if (!FX.vib) return; try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
FX.hit = (kind) => {
  FX.play(kind);
  FX.buzz({ ok: 35, stamp: [18, 30, 40], soft: 12, warn: [50, 60, 50], err: [90, 50, 90], done: [30, 50, 30, 50, 80], undo: 15, tap: 8 }[kind] || 10);
};

/* ---------- números que cuentan ---------- */
const fmt = (n) => Math.round(n).toLocaleString("es-MX");
FX.count = (el, to, dur = 650) => {
  if (!el) return; const from = Number(el.dataset.v ?? 0); el.dataset.v = to;
  if (!FX.motion || from === to || document.hidden) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = (t) => { const k = Math.max(0, Math.min(1, (t - t0) / dur)), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1 && el.dataset.v == to) requestAnimationFrame(step); };
  requestAnimationFrame(step);
};
FX.countAll = (root) => root.querySelectorAll("[data-count]").forEach((el) => { const to = Number(el.dataset.count); el.removeAttribute("data-count"); FX.count(el, to); });

/* ---------- anillos y barras: se llenan después de aparecer ---------- */
FX.fill = (root) => {
  const go = () => {
    root.querySelectorAll("[data-p]").forEach((c) => { c.style.strokeDashoffset = String(100 - Number(c.dataset.p)); c.removeAttribute("data-p"); });
    root.querySelectorAll("[data-w]").forEach((c) => { c.style.width = c.dataset.w + "%"; c.removeAttribute("data-w"); });
    root.querySelectorAll("[data-h]").forEach((c) => { c.style.height = c.dataset.h + "%"; c.removeAttribute("data-h"); });
    root.querySelectorAll("[data-da]").forEach((c) => { c.style.strokeDasharray = c.dataset.da; c.removeAttribute("data-da"); });
  };
  if (!FX.motion) return go();
  requestAnimationFrame(() => requestAnimationFrame(go));
};

/* ---------- confeti ---------- */
let cv = null, cx = null, parts = [], raf = 0;
const COLORS = ["#006B54", "#27B58E", "#9BE3C8", "#E9B949", "#FFFFFF", "#C2362B", "#0F231D"];
FX.confetti = (o = {}) => {
  if (!FX.motion) return;
  if (!cv) { cv = document.createElement("canvas"); cv.className = "fxcv"; if ("popover" in HTMLElement.prototype) cv.popover = "manual"; document.body.appendChild(cv); cx = cv.getContext("2d"); }
  if (cv.showPopover) { try { if (cv.matches(":popover-open")) cv.hidePopover(); cv.showPopover(); } catch (e) {} }
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const x0 = o.x ?? W / 2, y0 = o.y ?? H * 0.35, n = o.n || 160;
  for (let i = 0; i < n; i++) {
    const a = (o.spread ? -Math.PI / 2 + (Math.random() - 0.5) * o.spread : Math.random() * Math.PI * 2), v = 4 + Math.random() * (o.power || 9);
    parts.push({ x: x0, y: y0, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4, w: 5 + Math.random() * 7, h: 3 + Math.random() * 5, c: COLORS[(Math.random() * COLORS.length) | 0], life: 0, max: 110 + Math.random() * 60, round: Math.random() < 0.3 });
  }
  if (!raf) raf = requestAnimationFrame(loop);
};
function loop() {
  const W = innerWidth, H = innerHeight; cx.clearRect(0, 0, W, H);
  parts = parts.filter((p) => p.life < p.max && p.y < H + 30);
  for (const p of parts) {
    p.life++; p.vy += 0.22; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
    cx.save(); cx.globalAlpha = Math.max(0, 1 - Math.max(0, p.life - p.max * 0.7) / (p.max * 0.3)); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c;
    if (p.round) { cx.beginPath(); cx.arc(0, 0, p.h / 1.4, 0, Math.PI * 2); cx.fill(); } else cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life / 6)) + 1);
    cx.restore();
  }
  if (parts.length) raf = requestAnimationFrame(loop); else { raf = 0; cx.clearRect(0, 0, W, H); if (cv.hidePopover) { try { cv.hidePopover(); } catch (e) {} } }
}

/* ---------- salpicadura pequeña (al sellar) ---------- */
FX.burst = (x, y, color) => {
  if (!FX.motion) return;
  for (let i = 0; i < 10; i++) {
    const d = document.createElement("i"); d.className = "spark"; d.style.cssText = `left:${x}px;top:${y}px;background:${color}`;
    const a = (i / 10) * Math.PI * 2 + Math.random() * 0.4, r = 22 + Math.random() * 18;
    document.body.appendChild(d);
    d.animate([{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(.2)`, opacity: 0 }], { duration: 480, easing: "cubic-bezier(.16,1,.3,1)" }).onfinish = () => d.remove();
  }
};

/* ---------- onda al tocar ---------- */
document.addEventListener("pointerdown", (e) => {
  const b = e.target.closest(".btn,.chip,.nv,.seg button,.qa,.rip-on");
  if (!b || !FX.motion || b.disabled) return;
  const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2;
  const w = document.createElement("span"); w.className = "rip"; w.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
  b.appendChild(w); setTimeout(() => w.remove(), 620);
}, { passive: true });

window.FX = FX;
})();
