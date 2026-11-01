/* Efectos: sonidos sintetizados (sin archivos), vibración, confeti, números que cuentan y anillos de avance. */
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
FX.unlock = () => {
  // iPhone: que suene aunque el interruptor de silencio esté activado (Safari 17+)
  try { if (navigator.audioSession && navigator.audioSession.type !== "playback") navigator.audioSession.type = "playback"; } catch (e) {}
  ctx();
};

/* ---------- v10: tonos del escáner, a todo volumen ----------
   Pasan por un compresor para sonar lo más fuerte posible sin distorsionar,
   en las frecuencias (1–3 kHz) que mejor reproduce la bocina del teléfono. */
FX.scanTones = true;
FX.quietUntil = 0;
let bus = null;
function loud(a) {
  if (bus && bus.ctx === a) return bus.in;
  const inp = a.createGain(), comp = a.createDynamicsCompressor(), out = a.createGain();
  inp.gain.value = 1.4;
  comp.threshold.value = -20; comp.knee.value = 4; comp.ratio.value = 14; comp.attack.value = 0.002; comp.release.value = 0.15;
  out.gain.value = 1.0;
  // limitador suave final: sube todo lo posible y nunca pasa de 0.99 (sin chasquidos)
  const sh = a.createWaveShaper(), N = 2048, cv = new Float32Array(N);
  for (let i = 0; i < N; i++) { const x = (i / (N - 1)) * 2 - 1; cv[i] = 0.97 * Math.tanh(1.6 * x) / Math.tanh(1.6); }
  sh.curve = cv; sh.oversample = "none";
  inp.connect(comp); comp.connect(out); out.connect(sh); sh.connect(a.destination);
  bus = { ctx: a, in: inp, out }; return inp;
}
function v(a, f, t0, dur, type, g, f2, att = 0.006) {
  const o = a.createOscillator(), gn = a.createGain(), t = a.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.8);
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + att); gn.gain.setValueAtTime(g, t + Math.min(dur * 0.35, 0.06)); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn); gn.connect(loud(a)); o.start(t); o.stop(t + dur + 0.03);
}
// v12: varios juegos de tonos para elegir en Más → Tonos del escáner. Todos suenan fuerte.
function bell(a, f, t0, dur, g) { // campana: golpe y caída natural, con un armónico suave
  [[1, 1], [2.76, 0.18], [5.4, 0.06]].forEach(([m, k]) => { const o = a.createOscillator(), gn = a.createGain(), t = a.currentTime + t0; o.type = "sine"; o.frequency.setValueAtTime(f * m, t); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g * k, t + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur / (m > 1 ? m * 0.8 : 1)); o.connect(gn); gn.connect(loud(a)); o.start(t); o.stop(t + dur + 0.05); });
}
function knock(a, t0, f = 190, g = 0.95) { // golpe seco y grave, como tocar madera
  const o = a.createOscillator(), gn = a.createGain(), t = a.currentTime + t0; o.type = "sine";
  o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.09);
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + 0.003); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  o.connect(gn); gn.connect(loud(a)); o.start(t); o.stop(t + 0.16);
}
function fv(a, f, t0, dur, type, g, cut, q = 0.7, att = 0.003) { // tono filtrado (más real, menos «de juguete»)
  const o = a.createOscillator(), fl = a.createBiquadFilter(), gn = a.createGain(), t = a.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(f, t); fl.type = "lowpass"; fl.frequency.value = cut; fl.Q.value = q;
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g, t + att); gn.gain.setValueAtTime(g, t + dur * 0.7); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(fl); fl.connect(gn); gn.connect(loud(a)); o.start(t); o.stop(t + dur + 0.03);
}
function partials(a, f, t0, dur, g, parts) { // instrumento con armónicos que se apagan a distinto ritmo
  parts.forEach(([m, k, d]) => { const o = a.createOscillator(), gn = a.createGain(), t = a.currentTime + t0; o.type = "sine"; o.frequency.setValueAtTime(f * m, t); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(g * k, t + 0.003); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur * d); o.connect(gn); gn.connect(loud(a)); o.start(t); o.stop(t + dur * d + 0.05); });
}
const marimba = (a, f, t0, g = 0.95) => partials(a, f, t0, 0.55, g, [[1, 1, 1], [4, 0.35, 0.25], [9.9, 0.08, 0.1]]);
const glass = (a, f, t0, g = 0.9) => partials(a, f, t0, 1.0, g, [[1, 1, 1], [2.32, 0.4, 0.6], [4.25, 0.2, 0.35], [6.63, 0.08, 0.2]]);
const chime = (a, f, t0, g = 0.95) => partials(a, f, t0, 1.1, g, [[1, 1, 1], [2, 0.3, 0.6], [3, 0.12, 0.35], [4.2, 0.05, 0.2]]);
function tick(a, t0, g = 0.9, hp = 1800) { // clic corto y nítido
  const n = a.createBuffer(1, Math.round(a.sampleRate * 0.012), a.sampleRate), d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), gn = a.createGain(); s.buffer = n; f.type = "bandpass"; f.frequency.value = hp; f.Q.value = 1.2; gn.gain.value = g * 3;
  s.connect(f); f.connect(gn); gn.connect(loud(a)); s.start(a.currentTime + t0);
}
function echo(a, fn, delay = 0.16, fb = 0.35) { // eco tipo sonar
  const inp = a.createGain(), dl = a.createDelay(1), fbk = a.createGain(), out = loud(a);
  dl.delayTime.value = delay; fbk.gain.value = fb; inp.connect(out); inp.connect(dl); dl.connect(fbk); fbk.connect(dl); dl.connect(out);
  const keep = bus.in; bus.in = inp; try { fn(); } finally { bus.in = keep; }
}
const PACKS = {
  // escáner real: pitido de bocina piezoeléctrica (onda cuadrada filtrada), zumbido de error, doble pitido
  escaner: {
    frame: (a) => fv(a, 2700, 0, 0.11, "square", 0.6, 5200, 0.9),
    misframe: (a) => { fv(a, 180, 0, 0.45, "square", 0.6, 1400, 1.5); fv(a, 360, 0, 0.45, "sawtooth", 0.25, 1400, 1.5); },
    present: (a) => { fv(a, 2700, 0, 0.08, "square", 0.6, 5200, 0.9); fv(a, 3200, 0.12, 0.12, "square", 0.6, 5600, 0.9); },
    gain: { frame: 1.7, misframe: 1.9, present: 1.7 },
  },
  // variantes del escáner real
  esc_grave: { // más grave y redondo; presente = un pitido largo
    frame: (a) => fv(a, 2300, 0, 0.12, "square", 0.6, 4200, 0.9),
    misframe: (a) => { fv(a, 150, 0, 0.5, "square", 0.6, 1200, 1.5); fv(a, 300, 0, 0.5, "sawtooth", 0.25, 1200, 1.5); },
    present: (a) => fv(a, 2300, 0, 0.28, "square", 0.6, 4200, 0.9),
    gain: { frame: 1.7, misframe: 1.9, present: 1.7 },
  },
  esc_agudo: { // más agudo y cortante; error = tres zumbidos cortos
    frame: (a) => fv(a, 3400, 0, 0.1, "square", 0.6, 6500, 0.9),
    misframe: (a) => { [0, 0.13, 0.26].forEach((t) => { fv(a, 200, t, 0.09, "square", 0.6, 1400, 1.5); fv(a, 400, t, 0.09, "sawtooth", 0.22, 1400, 1.5); }); },
    present: (a) => { fv(a, 3400, 0, 0.08, "square", 0.6, 6500, 0.9); fv(a, 3400, 0.12, 0.08, "square", 0.6, 6500, 0.9); },
    gain: { frame: 1.7, misframe: 1.9, present: 1.7 },
  },
  esc_suave: { // mismo estilo pero más redondo, menos chillón
    frame: (a) => fv(a, 2600, 0, 0.12, "square", 0.6, 3200, 0.7),
    misframe: (a) => { fv(a, 170, 0, 0.42, "square", 0.6, 900, 1); fv(a, 340, 0, 0.42, "triangle", 0.3, 900, 1); },
    present: (a) => { fv(a, 2600, 0, 0.09, "square", 0.6, 3200, 0.7); fv(a, 2600, 0.13, 0.12, "square", 0.6, 3200, 0.7); },
    gain: { frame: 1.8, misframe: 2.0, present: 1.8 },
  },
  esc_industrial: { // de bodega, más áspero; error = zumbido que tiembla; presente = pitido que sube
    frame: (a) => fv(a, 2900, 0, 0.11, "square", 0.6, 8000, 1.1),
    misframe: (a) => { [0, 0.09, 0.18, 0.27].forEach((t, i) => fv(a, i % 2 ? 180 : 230, t, 0.09, "square", 0.6, 1600, 1.5)); },
    present: (a) => { fv(a, 2400, 0, 0.08, "square", 0.6, 8000, 1.1); fv(a, 3300, 0.1, 0.13, "square", 0.6, 8000, 1.1); },
    gain: { frame: 1.6, misframe: 1.9, present: 1.6 },
  },
  esc_rapido: { // todo muy corto, para escanear rápido; presente = tres pitidos veloces
    frame: (a) => fv(a, 2700, 0, 0.07, "square", 0.6, 5200, 0.9),
    misframe: (a) => { fv(a, 180, 0, 0.18, "square", 0.6, 1400, 1.5); fv(a, 180, 0.24, 0.18, "square", 0.6, 1400, 1.5); },
    present: (a) => { [0, 0.08, 0.16].forEach((t) => fv(a, 2900, t, 0.05, "square", 0.6, 5600, 0.9)); },
    gain: { frame: 1.7, misframe: 1.9, present: 1.7 },
  },
  // cristal: «ting» de copa, golpe sordo, dos copas que suben
  cristal: {
    frame: (a) => glass(a, 2093, 0),
    misframe: (a) => { knock(a, 0, 140); knock(a, 0.14, 120); },
    present: (a) => { glass(a, 1568, 0, 0.8); glass(a, 2349, 0.13, 0.85); },
    gain: { frame: 1.5, misframe: 2.1, present: 1.4 },
  },
  // marimba: madera cálida; error en notas graves que bajan; confirmación de tres notas
  marimba: {
    frame: (a) => marimba(a, 1047, 0),
    misframe: (a) => { marimba(a, 330, 0); marimba(a, 262, 0.15); },
    present: (a) => { marimba(a, 784, 0, 0.85); marimba(a, 1047, 0.09, 0.85); marimba(a, 1568, 0.18, 0.9); },
    gain: { frame: 1.6, misframe: 2.0, present: 1.5 },
  },
  // campanilla de aviso (como en un aeropuerto o banco): una nota, «ding-dong» que baja, «ding-dong» que sube
  aviso: {
    frame: (a) => chime(a, 1319, 0),
    misframe: (a) => { chime(a, 659, 0, 0.9); chime(a, 523, 0.22, 0.9); },
    present: (a) => { chime(a, 1047, 0, 0.85); chime(a, 1319, 0.2, 0.9); },
    gain: { frame: 1.4, misframe: 1.7, present: 1.4 },
  },
  // digital minimalista: clic nítido, zumbido corto, clic + tono limpio
  digital: {
    frame: (a) => { tick(a, 0, 0.9, 3200); v(a, 2200, 0.005, 0.06, "sine", 0.6, 0, 0.002); },
    misframe: (a) => { fv(a, 140, 0, 0.22, "sawtooth", 0.8, 900, 2); tick(a, 0, 0.5, 600); },
    present: (a) => { tick(a, 0, 0.8, 3200); v(a, 1760, 0.02, 0.09, "sine", 0.8, 0, 0.002); v(a, 2640, 0.11, 0.14, "sine", 0.85, 0, 0.002); },
    gain: { frame: 1.6, misframe: 1.8, present: 1.5 },
  },
  // sonar: «ping» con eco, «ping» grave y apagado, doble «ping» brillante
  sonar: {
    frame: (a) => echo(a, () => v(a, 1480, 0, 0.12, "sine", 0.9, 0, 0.003), 0.14, 0.3),
    misframe: (a) => echo(a, () => { v(a, 392, 0, 0.16, "triangle", 0.9, 0, 0.003); v(a, 311, 0.2, 0.2, "triangle", 0.9, 0, 0.003); }, 0.12, 0.2),
    present: (a) => echo(a, () => { v(a, 1480, 0, 0.1, "sine", 0.85, 0, 0.003); v(a, 1976, 0.13, 0.16, "sine", 0.9, 0, 0.003); }, 0.14, 0.3),
    gain: { frame: 1.5, misframe: 1.7, present: 1.5 },
  },
  // tipo lector de almacén: pitido agudo, zumbido grave de error, doble pitido al confirmar
  lector: {
    frame: (a) => { v(a, 3150, 0, 0.13, "triangle", 0.9, 0, 0.002); v(a, 3150, 0, 0.13, "sine", 0.5, 0, 0.002); },
    misframe: (a) => { v(a, 262, 0, 0.38, "sawtooth", 0.55, 0, 0.004); v(a, 262, 0, 0.38, "triangle", 0.7, 0, 0.004); },
    present: (a) => { v(a, 3150, 0, 0.09, "triangle", 0.9, 0, 0.002); v(a, 3150, 0.14, 0.09, "triangle", 0.9, 0, 0.002); },
    gain: { frame: 1.3, misframe: 1.7, present: 1.3 },
  },
  // elegante: campana clara, dos golpes de madera, acorde de campanas al confirmar
  campana: {
    frame: (a) => bell(a, 1760, 0, 0.45, 0.95),
    misframe: (a) => { knock(a, 0); knock(a, 0.16); },
    present: (a) => { bell(a, 1319, 0, 0.7, 0.85); bell(a, 1976, 0.12, 0.9, 0.85); },
    gain: { frame: 1.4, misframe: 2.0, present: 1.4 },
  },
  // discreto, como un aviso del celular: «tic» que sube, dos notas que bajan, dos notas que suben
  sistema: {
    frame: (a) => v(a, 1200, 0, 0.13, "sine", 0.95, 1700, 0.003),
    misframe: (a) => { v(a, 740, 0, 0.14, "sine", 0.95, 0, 0.004); v(a, 554, 0.15, 0.2, "sine", 0.95, 0, 0.004); },
    present: (a) => { v(a, 880, 0, 0.11, "sine", 0.9, 0, 0.004); v(a, 1319, 0.11, 0.24, "sine", 0.95, 0, 0.004); },
    gain: { frame: 1.5, misframe: 1.6, present: 1.5 },
  },
  // punto de venta: «bip» seco, tres bips graves de error, tono largo de aceptado
  caja: {
    frame: (a) => v(a, 1800, 0, 0.12, "sine", 0.95, 0, 0.002),
    misframe: (a) => { [0, 0.11, 0.22].forEach((t) => v(a, 330, t, 0.07, "square", 0.45, 0, 0.002)); },
    present: (a) => v(a, 1000, 0, 0.3, "sine", 0.95, 0, 0.004),
    gain: { frame: 1.5, misframe: 1.6, present: 1.4 },
  },
  // los de la versión 11: pitido de 2.7 kHz, dos tonos graves, dos tonos ascendentes
  terminal: {
    frame: (a) => { v(a, 2730, 0, 0.15, "sine", 0.9, 0, 0.003); v(a, 5460, 0, 0.08, "sine", 0.12, 0, 0.003); },
    misframe: (a) => { v(a, 415, 0, 0.13, "triangle", 0.9, 0, 0.004); v(a, 830, 0, 0.13, "sine", 0.35, 0, 0.004); v(a, 415, 0.19, 0.13, "triangle", 0.9, 0, 0.004); v(a, 830, 0.19, 0.13, "sine", 0.35, 0, 0.004); },
    present: (a) => { v(a, 1568, 0, 0.1, "sine", 0.85, 0, 0.004); v(a, 3136, 0, 0.06, "sine", 0.1, 0, 0.004); v(a, 2093, 0.11, 0.2, "sine", 0.9, 0, 0.004); v(a, 4186, 0.11, 0.1, "sine", 0.1, 0, 0.004); },
    gain: { frame: 1.3, misframe: 1.6, present: 1.35 },
  },
};
FX.PACKS = ["escaner", "esc_grave", "esc_agudo", "esc_suave", "esc_industrial", "esc_rapido", "cristal", "marimba", "aviso", "digital", "sonar", "campana", "lector", "sistema", "caja", "terminal"];
FX.pack = "esc_grave";
// solo para pruebas: dibuja el tono en un contexto sin bocina y mide pico y duración audible
FX._render = async (kind, pack) => {
  const keep = ac, keepBus = bus, keepOn = FX.scanTones, keepVib = FX.vib;
  const off = new OfflineAudioContext(1, 48000 * 1.2, 48000); ac = off; bus = null; FX.scanTones = true; FX.vib = false;
  try { FX.scan(kind, pack); } finally { ac = keep; bus = keepBus; FX.scanTones = keepOn; FX.vib = keepVib; }
  const d = (await off.startRendering()).getChannelData(0); let peak = 0, last = 0;
  for (let i = 0; i < d.length; i++) { const x = Math.abs(d[i]); if (x > peak) peak = x; if (x > 0.05) last = i; }
  return { peak, dur: last / 48000 };
};
FX.scan = (kind, pack) => {
  if (!FX.scanTones) return; const a = ctx(); if (!a) return;
  const P = PACKS[pack || FX.pack] || PACKS.escaner; if (!P[kind]) return;
  try {
    loud(a); bus.out.gain.setValueAtTime(P.gain[kind] || 1, a.currentTime);
    P[kind](a);
    FX.buzz({ frame: 30, misframe: [90, 70, 90], present: [35, 45, 60] }[kind]);
  } catch (e) {}
};
FX.play = (kind) => {
  if (!FX.sound) return; if ((kind === "ok" || kind === "stamp") && performance.now() < FX.quietUntil) return; const a = ctx(); if (!a) return;
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
  const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1 && el.dataset.v == to) requestAnimationFrame(step); };
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
  const b = e.target.closest(".btn,.chip,.pc,.tab,.st,.set-r[data-act],.qa");
  if (!b || !FX.motion || b.disabled) return;
  const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2;
  const w = document.createElement("span"); w.className = "rip"; w.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
  b.appendChild(w); setTimeout(() => w.remove(), 620);
}, { passive: true });

window.FX = FX;
})();
