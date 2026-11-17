/* Cerebro · todo el inventario como una constelación viva (app del celular y portal).
   Motor único: Cerebro.mount(el, datos, opciones) → controlador.
   datos = { items:[{k, mb, ds, p, a, s, baja, foto}], pl:{personaKey:nombre}, al:{areaKey:nombre}, fin:{personaKey:true}, listas:[{id, name, toks:[k]}] }
     s = índice de estado (0 = sin revisar, 1.. = según opciones.st)
   opciones = { st:[{l,c}], motion, onOpen(kind,key,extra), nf(n) } */
(() => {
"use strict";
const TAU = Math.PI * 2, GA = 2.399963, SP = 2.15;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const CSS = `
.cbx{position:absolute;inset:0;overflow:hidden;background:#05030f;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;color:#efe6ff;font-family:inherit}
.cbx canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none}
.cbx button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.cbx-stat{position:absolute;left:16px;top:12px;font-size:12px;color:rgba(222,208,255,.62);pointer-events:none;transition:opacity .5s}
.cbx-bar{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;gap:2px;padding:4px;border-radius:999px;background:rgba(26,13,60,.58);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid rgba(190,160,255,.24);box-shadow:0 8px 30px rgba(60,20,160,.35);white-space:nowrap}
.cbx .cbx-bar button{min-height:44px;padding:0 16px;border-radius:999px;font-size:14px}
.cbx-bar .go{background:linear-gradient(135deg,#7b3df0,#b878ff);color:#fff;font-weight:600}
.cbx-bar .on{background:rgba(190,160,255,.2)}
.cbx-z{position:absolute;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:6px}
.cbx .cbx-z button{width:44px;height:44px;border-radius:50%;font-size:22px;line-height:1;background:rgba(26,13,60,.58);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid rgba(190,160,255,.24)}
.cbx-card{position:absolute;left:12px;right:12px;margin:0 auto;max-width:520px;border-radius:18px;padding:12px 14px;background:rgba(22,11,52,.72);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border:1px solid rgba(190,160,255,.26);box-shadow:0 10px 36px rgba(40,10,120,.45);display:flex;align-items:center;gap:10px}
.cbx-card[hidden]{display:none}
.cbx-info{bottom:calc(76px + env(safe-area-inset-bottom,0px));right:66px;margin:0;max-width:none}
.cbx-cap{top:12px;flex-direction:column;align-items:stretch;gap:6px}
.cbx-t{flex:1;min-width:0}.cbx-t b{display:block;font-size:15px;line-height:1.25;overflow-wrap:anywhere}.cbx-t small{display:block;font-size:12.5px;line-height:1.35;color:rgba(226,214,255,.78);margin-top:2px}
.cbx button.cbx-open{background:linear-gradient(135deg,#7b3df0,#b878ff);color:#fff;font-weight:600;font-size:13.5px;padding:0 14px;min-height:40px;border-radius:12px;white-space:nowrap}
.cbx button.cbx-x{width:40px;height:40px;border-radius:50%;font-size:18px;color:rgba(226,214,255,.8)}
.cbx-row{display:flex;align-items:center;gap:8px}
.cbx-dots{display:flex;gap:4px;flex:1;align-items:center}.cbx-dots i{height:3px;flex:1;max-width:26px;border-radius:2px;background:rgba(190,160,255,.25)}.cbx-dots i.d{background:rgba(255,214,120,.9)}.cbx-dots i.c{background:#fff}
.cbx-ld{position:absolute;inset:0;display:grid;place-items:center;color:rgba(222,208,255,.7);font-size:14px}
`;
let cssOn = false;
const injectCss = () => { if (cssOn) return; cssOn = true; const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); };
const sprites = {};
function sprite(col) {
  if (sprites[col]) return sprites[col];
  const s = 40, c = document.createElement("canvas"); c.width = c.height = s; const g = c.getContext("2d");
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.14, hexA(col, 0.95)); r.addColorStop(0.42, hexA(col, 0.26)); r.addColorStop(1, hexA(col, 0));
  g.fillStyle = r; g.fillRect(0, 0, s, s); return (sprites[col] = c);
}
const COL = { core: "#e4d6ff", area: "#62e4ff", per: "#b27dff", pen: "#c8b4ff", baja: "#ffd166", foto: "#ffffff", lista: "#ffb44d" };

function mount(el, data, opts) {
  injectCss(); opts = opts || {};
  const nf = opts.nf || ((n) => Number(n || 0).toLocaleString("es-MX"));
  const ST = opts.st && opts.st.length ? opts.st : [{ l: "Sin revisar", c: COL.pen }, { l: "Presentes", c: "#4df0c8" }, { l: "No están", c: "#ff6b9a" }];
  const motion = opts.motion !== false;
  el.innerHTML = "";
  const root = document.createElement("div"); root.className = "cbx";
  root.innerHTML = `<canvas role="img" aria-label="Constelación del inventario: resguardantes, áreas, artículos y listas de baja conectados"></canvas><div class="cbx-stat"></div><div class="cbx-ld">Conectando el inventario…</div>
    <div class="cbx-card cbx-cap" hidden></div><div class="cbx-card cbx-info" hidden></div>
    <div class="cbx-z"><button type="button" data-a="zi" aria-label="Acercar">+</button><button type="button" data-a="zo" aria-label="Alejar">−</button></div>
    <div class="cbx-bar"><button type="button" class="go" data-a="tour">Recorrido</button><button type="button" data-a="filt">Todo</button><button type="button" data-a="fit">Centrar</button></div>`;
  el.appendChild(root);
  const cv = root.querySelector("canvas"), ctx = cv.getContext("2d"), $q = (s) => root.querySelector(s);
  const S = { w: 0, h: 0, dpr: 1 }, cam = { cx: 0, cy: 0, k: 1, anim: null, vx: 0, vy: 0 };
  let G = null, sel = null, hover = null, filt = 0, fitK = 1, dirty = true, raf = 0, last = 0, t0 = 0, destroyed = false, tour = null, stars = [], bgG = null;
  const FILT = [{ n: "Todo", f: () => true }, ...ST.map((s, i) => ({ n: s.l, f: (x) => x.s === i })), { n: "Bajas", f: (x) => x.baja }, { n: "Fotos", f: (x) => x.foto }];

  /* ---------- construcción y disposición ---------- */
  function build(d) {
    const items = d.items, P = new Map(), A = new Map();
    items.forEach((x, i) => {
      let p = P.get(x.p); if (!p) P.set(x.p, (p = { t: "per", key: x.p, label: (d.pl || {})[x.p] || x.p, n: 0, st: ST.map(() => 0), ix: [], ar: new Map() }));
      p.n++; p.st[x.s] = (p.st[x.s] || 0) + 1; p.ix.push(i); p.ar.set(x.a, (p.ar.get(x.a) || 0) + 1);
      let a = A.get(x.a); if (!a) A.set(x.a, (a = { t: "area", key: x.a, label: (d.al || {})[x.a] || x.a || "Sin área", n: 0, st: ST.map(() => 0), pe: new Map() }));
      a.n++; a.st[x.s] = (a.st[x.s] || 0) + 1; a.pe.set(x.p, (a.pe.get(x.p) || 0) + 1);
    });
    const pl = [...P.values()].sort((a, b) => b.n - a.n), al = [...A.values()];
    const core = { t: "core", key: "", label: "Inventario", x: 0, y: 0, r: 9, R: 28, n: items.length };
    // personas: empaquetado en espiral, las grandes cerca del centro
    const placed = [core];
    for (const p of pl) {
      p.R = SP * Math.sqrt(p.n) + 7; p.r = 2.6 + Math.min(4.5, Math.sqrt(p.n) * 0.17); p.fin = !!(d.fin || {})[p.key];
      for (let s = 0; s < 6000; s++) {
        const rad = s * 2.4, ang = s * 0.37, x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
        if (placed.every((q) => Math.hypot(q.x - x, q.y - y) >= q.R + p.R + 9)) { p.x = x; p.y = y; break; }
      }
      placed.push(p);
    }
    // áreas: entre las personas que las comparten; las de una sola persona orbitan su nube
    const orb = new Map();
    for (const a of al) {
      a.r = 1.9 + Math.min(2.6, Math.sqrt(a.n) * 0.1);
      let sx = 0, sy = 0, w = 0; for (const [pk, c] of a.pe) { const p = P.get(pk); sx += p.x * c; sy += p.y * c; w += c; }
      if (a.pe.size === 1) {
        const p = P.get([...a.pe.keys()][0]), c = orb.get(p) || 0; orb.set(p, c + 1);
        const ang = Math.atan2(p.y, p.x) + (c % 2 ? -1 : 1) * Math.ceil(c / 2) * 0.55, dist = p.R + 12 + (c % 3) * 7;
        a.x = p.x + Math.cos(ang) * dist; a.y = p.y + Math.sin(ang) * dist;
      } else { a.x = sx / w; a.y = sy / w; }
    }
    for (let it = 0; it < 30; it++) for (let i = 0; i < al.length; i++) for (let j = i + 1; j < al.length; j++) {
      const a = al[i], b = al[j], dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy) || 0.1;
      if (dd < 11) { const f = (11 - dd) / 2 / dd; a.x -= dx * f; a.y -= dy * f; b.x += dx * f; b.y += dy * f; }
    }
    // artículos: girasol alrededor de su persona, agrupados por área
    const n = items.length, IX = new Float32Array(n), IY = new Float32Array(n), IP = new Int32Array(n), IA = new Int32Array(n), IPH = new Float32Array(n);
    const pIdx = new Map(pl.map((p, i) => [p.key, i])), aIdx = new Map(al.map((a, i) => [a.key, i]));
    for (const p of pl) {
      const ord = p.ix.slice().sort((a, b) => (items[a].a < items[b].a ? -1 : items[a].a > items[b].a ? 1 : 0));
      ord.forEach((ii, j) => { const rr = 3.2 + SP * Math.sqrt(j), an = j * GA; IX[ii] = p.x + Math.cos(an) * rr; IY[ii] = p.y + Math.sin(an) * rr; IP[ii] = pIdx.get(p.key); IA[ii] = aIdx.get(items[ii].a); IPH[ii] = (ii * 0.73) % TAU; });
    }
    let ext = 60; for (const p of pl) ext = Math.max(ext, Math.hypot(p.x, p.y) + p.R); for (const a of al) ext = Math.max(ext, Math.hypot(a.x, a.y) + 12);
    const byK = new Map(items.map((x, i) => [x.k, i]));
    const li = (d.listas || []).map((l, i, arr) => { const ang = (i + 0.5) / arr.length * TAU - 1.2, o = { t: "lista", key: l.id, label: l.name, n: (l.toks || []).length, x: Math.cos(ang) * (ext + 70), y: Math.sin(ang) * (ext + 70), r: 4, R: 10, ix: (l.toks || []).map((t) => byK.get(t)).filter((v) => v != null) }; return o; });
    if (li.length) ext += 90;
    let x0 = -ext, x1 = ext, y0 = -ext, y1 = ext;
    for (const h of [...pl, ...al, ...li]) { const R = h.R || 12; x0 = Math.min(x0, h.x - R); x1 = Math.max(x1, h.x + R); y0 = Math.min(y0, h.y - R); y1 = Math.max(y1, h.y + R); }
    // hilos: núcleo→persona y persona→área (los que cruzan varias áreas tejen la red)
    const E = [];
    for (const p of pl) { E.push([core, p, 0, 0.5]); for (const [ak, c] of p.ar) E.push([p, al[aIdx.get(ak)], 1, Math.min(1, 0.35 + Math.log(1 + c) * 0.18)]); }
    for (const l of li) E.push([core, l, 2, 0.5]);
    return { items, pl, al, li, core, P, A, pIdx, aIdx, byK, IX, IY, IP, IA, IPH, E, bb: [x0, y0, x1, y1], hubs: [core, ...pl, ...al, ...li], n };
  }
  const fitView = () => { if (!G || !S.w) return; const [x0, y0, x1, y1] = G.bb; fitK = Math.min(S.w / (x1 - x0 + 40), (S.h - 40) / (y1 - y0 + 40)) * 0.96; return [(x0 + x1) / 2, (y0 + y1) / 2, fitK]; };
  const stat = () => { const c = $q(".cbx-stat"); c.textContent = G ? `${nf(G.n)} bienes · ${nf(G.pl.length)} resguardantes · ${nf(G.al.length)} áreas` : ""; };

  /* ---------- cámara ---------- */
  const kick = () => { dirty = true; if (!raf && !destroyed) raf = requestAnimationFrame(loop); };
  function flyTo(cx, cy, k, dur, dip, done) {
    k = clamp(k, fitK * 0.55, fitK * 60);
    if (!motion || !dur) { cam.cx = cx; cam.cy = cy; cam.k = k; cam.anim = null; kick(); done && done(); return; }
    cam.anim = { a: [cam.cx, cam.cy, Math.log(cam.k)], b: [cx, cy, Math.log(k)], t0: 0, dur, dip: dip || 0, done }; kick();
  }
  function zoomAt(sx, sy, nk) {
    nk = clamp(nk, fitK * 0.55, fitK * 60); const k0 = cam.k;
    const wx = (sx - S.w / 2) / k0 + cam.cx, wy = (sy - S.h / 2) / k0 + cam.cy; cam.k = nk; cam.cx = wx - (sx - S.w / 2) / nk; cam.cy = wy - (sy - S.h / 2) / nk; kick();
  }
  const clampCam = () => { if (!G) return; const [x0, y0, x1, y1] = G.bb, m = 60; cam.cx = clamp(cam.cx, x0 - m, x1 + m); cam.cy = clamp(cam.cy, y0 - m, y1 + m); };
  function resize() {
    const r = root.getBoundingClientRect(); if (!r.width || !r.height) return;
    S.dpr = Math.min(1.5, window.devicePixelRatio || 1); const first = !S.w; S.w = r.width; S.h = r.height;
    cv.width = Math.round(S.w * S.dpr); cv.height = Math.round(S.h * S.dpr);
    bgG = ctx.createRadialGradient(S.w / 2, S.h / 2, 8, S.w / 2, S.h / 2, Math.max(S.w, S.h) * 0.8); bgG.addColorStop(0, "#1b0e3a"); bgG.addColorStop(0.5, "#0b0620"); bgG.addColorStop(1, "#04020c");
    if (!stars.length) { let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 110; i++) stars.push([rnd(), rnd(), 0.4 + rnd() * 1.1, rnd() * TAU]); }
    if (G) { const f = fitView(); if (first || !cam.set) { cam.cx = f[0]; cam.cy = f[1]; cam.k = f[2]; cam.set = 1; } }
    kick();
  }

  /* ---------- dibujo ---------- */
  const SX = (x) => (x * ex - cam.cx) * cam.k + S.w / 2, SY = (y) => (y * ex - cam.cy) * cam.k + S.h / 2;
  let ex = 1;
  function curve(a, b, w) { const ax = SX(a.x), ay = SY(a.y), bx = SX(b.x), by = SY(b.y), dx = bx - ax, dy = by - ay, sg = (a.x + b.y) > (b.x + a.y) ? 1 : -1; ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2 - dy * 0.13 * sg, (ay + by) / 2 + dx * 0.13 * sg, bx, by); }
  function draw(ts) {
    if (!G) return; const t = ts / 1000, k = cam.k, zt = clamp((k / fitK - 1) / 3, 0, 1), W = S.w, H = S.h;
    ex = motion && ts - t0 < 1900 ? 1 - Math.pow(1 - clamp((ts - t0) / 1900, 0, 1), 3) : 1;
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (const s of stars) { const x = ((s[0] * W - cam.cx * 0.04 * k) % W + W) % W, y = ((s[1] * H - cam.cy * 0.04 * k) % H + H) % H, a = 0.18 + 0.16 * Math.sin(t * 0.8 + s[3]); ctx.fillStyle = `rgba(200,180,255,${a * (0.5 + s[2] * 0.4)})`; ctx.fillRect(x, y, s[2], s[2]); }
    const cs = SX(0), cy0 = SY(0), pulse = motion ? 1 + 0.05 * Math.sin(t * 1.1) : 1, gr = 360 * k * pulse;
    const cg = ctx.createRadialGradient(cs, cy0, 0, cs, cy0, gr); cg.addColorStop(0, "rgba(140,80,255,.34)"); cg.addColorStop(0.5, "rgba(90,40,200,.10)"); cg.addColorStop(1, "rgba(60,20,160,0)"); ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);
    const F = FILT[filt], focusP = sel ? (sel.t === "per" ? sel : sel.t === "item" ? G.pl[G.IP[sel.i]] : null) : null, focusA = sel && sel.t === "area" ? sel : null, focusL = sel && sel.t === "lista" ? sel : null;
    const lset = focusL ? new Set(focusL.ix) : null, fpi = focusP ? G.pl.indexOf(focusP) : -1, fai = focusA ? G.al.indexOf(focusA) : -1;
    // hilos
    const lit = (a, b) => sel && (sel === a || sel === b || (sel.t === "item" && (G.pl[G.IP[sel.i]] === a || G.al[G.IA[sel.i]] === b)));
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      for (const [a, b, ty, w] of G.E) { const l = !!lit(a, b); if ((pass === 1) !== l) continue; curve(a, b, w); }
      if (pass === 0) { ctx.strokeStyle = sel ? "rgba(160,130,255,.06)" : "rgba(160,130,255,.13)"; ctx.lineWidth = 0.9; } else { ctx.strokeStyle = "rgba(235,215,255,.55)"; ctx.lineWidth = 1.3; }
      ctx.stroke();
    }
    // artículos (polvo luminoso)
    const base = 0.32 + 0.5 * zt, sz = clamp(4.2 * k, 3, 40), pad = sz;
    const sprC = ST.map((s) => sprite(s.c)), sB = sprite(COL.baja), sF = sprite(COL.foto);
    ctx.globalAlpha = 1;
    const small = sz < 8, bk = small ? new Map() : null, rs = Math.max(1.5, sz * 0.5);
    for (let i = 0; i < G.n; i++) {
      const x = G.items[i], sx = SX(G.IX[i]), sy = SY(G.IY[i]); if (sx < -pad || sx > W + pad || sy < -pad || sy > H + pad) continue;
      let a = base; if (filt && !F.f(x)) a *= 0.07; else if (focusP && G.IP[i] !== fpi) a *= 0.3; else if (focusA && G.IA[i] !== fai) a *= 0.3; else if (lset && !lset.has(i)) a *= 0.25; else if (lset || (sel && sel.t === "item" && sel.i === i)) a = 1;
      if (small) { const ci = x.baja ? -1 : x.foto ? -2 : (x.s in sprC ? x.s : 0), key = ci * 8 + Math.round(Math.min(1, a) * 7); let l = bk.get(key); if (!l) bk.set(key, (l = [])); l.push(sx, sy); continue; }
      const tw = motion ? 1 + 0.2 * Math.sin(t * 1.4 + G.IPH[i]) : 1, s2 = sz * tw * (x.foto ? 1.5 : 1);
      ctx.globalAlpha = Math.min(1, a); ctx.drawImage(x.baja ? sB : x.foto ? sF : (sprC[x.s] || sprC[0]), sx - s2, sy - s2, s2 * 2, s2 * 2);
    }
    if (small) for (const [key, l] of bk) {
      const al = (key & 7) / 7, ci = (key - (key & 7)) / 8; ctx.fillStyle = hexA(ci === -1 ? COL.baja : ci === -2 ? "#ffffff" : ST[ci].c, Math.min(1, al * 0.95));
      ctx.beginPath(); for (let j = 0; j < l.length; j += 2) { ctx.moveTo(l[j] + rs / 2, l[j + 1]); ctx.arc(l[j], l[j + 1], rs / 2, 0, TAU); } ctx.fill();
    }
    ctx.globalAlpha = 1;
    // centros: núcleo, listas, áreas, personas
    const orbs = [];
    const orb = (h, col, size, a) => { const x = SX(h.x), y = SY(h.y); if (x < -80 || x > W + 80 || y < -80 || y > H + 80) return; const dim = (focusP && h !== focusP && !(sel.t === "item" && G.al[G.IA[sel.i]] === h)) || (focusA && h !== focusA) ? 0.35 : 1; ctx.globalAlpha = a * dim; const s = size / 2; ctx.drawImage(sprite(col), x - s, y - s, size, size); h._x = x; h._y = y; h._s = size; };
    for (const h of G.pl) orb(h, COL.per, Math.max(18, h.r * k * 7) * (motion ? 1 + 0.06 * Math.sin(t * 1.3 + h.n) : 1), 0.82);
    for (const h of G.al) orb(h, COL.area, Math.max(13, h.r * k * 6.2), 0.9);
    for (const h of G.li) orb(h, COL.lista, Math.max(16, h.r * k * 6), 0.9);
    orb(G.core, COL.core, Math.max(52, G.core.r * k * 9) * pulse, 1);
    ctx.globalAlpha = 1;
    for (const h of G.pl) if (h.fin && h._x != null) { ctx.strokeStyle = "rgba(95,240,207,.7)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(h._x, h._y, Math.max(5, h._s * 0.17), 0, TAU); ctx.stroke(); }
    // rastro del recorrido
    if (tour && tour.on) {
      const pts = tour.stops.slice(0, tour.i + 1).map((s) => [SX(s.x), SY(s.y)]);
      if (pts.length > 1) { for (const [lw, al] of [[7, 0.1], [2, 0.7]]) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let j = 1; j < pts.length; j++) { const p = pts[j - 1], q = pts[j]; ctx.quadraticCurveTo((p[0] + q[0]) / 2 + (q[1] - p[1]) * 0.18, (p[1] + q[1]) / 2 - (q[0] - p[0]) * 0.18, q[0], q[1]); } ctx.strokeStyle = `rgba(255,214,120,${al})`; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.stroke(); } }
      pts.forEach((p) => { ctx.globalAlpha = 1; ctx.drawImage(sprite("#ffd166"), p[0] - 11, p[1] - 11, 22, 22); });
    }
    // anillo de selección
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    const tg = sel || hover;
    if (tg) { const p = pos(tg), rr = tg.t === "item" ? 10 : Math.max(10, (tg._s || 20) * 0.34) + 4; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p[0], p[1], rr + (motion ? Math.sin(t * 4) * 0.8 : 0), 0, TAU); ctx.stroke(); }
    // etiquetas (pocas y limpias)
    ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.font = "600 11.5px system-ui,-apple-system,sans-serif";
    const boxes = [], cut = (t) => (t.length > 30 ? t.slice(0, 29) + "…" : t);
    const lab = (h, strong) => {
      const p = pos(h); if (p[0] < 10 || p[0] > W - 10 || p[1] < 10 || p[1] > H - 10) return false; const off = h.t === "item" ? 13 : Math.max(10, (h._s || 20) * 0.34) + 6, tx = cut(h.label), w = ctx.measureText(tx).width + 8, bx = p[0] - w / 2, by = p[1] + off;
      if (!strong && boxes.some((q) => bx < q[0] + q[2] && bx + w > q[0] && by < q[1] + q[3] && by + 16 > q[1])) return false; boxes.push([bx, by, w, 16]);
      ctx.shadowColor = "rgba(5,3,15,.95)"; ctx.shadowBlur = 5; ctx.fillStyle = strong ? "#fff" : "rgba(232,220,255,.86)"; ctx.fillText(tx, p[0], by); ctx.shadowBlur = 0; return true;
    };
    const zr = k / fitK, shown = new Set();
    if (sel) lab(sel.t === "item" ? { t: "item", label: "Marbete " + G.items[sel.i].mb, x: G.IX[sel.i], y: G.IY[sel.i] } : sel, true);
    if (zr > 1.7) { let c = 0; for (const h of [...G.al].sort((a, b) => b.n - a.n)) { if (c >= 7) break; if (h !== sel && h._x > 20 && h._x < W - 20 && h._y > 20 && h._y < H - 20 && h.n >= 12 && lab(h)) { shown.add(h); c++; } } }
    if (zr > 2.2) { let c = 0; for (const h of G.pl) { if (c >= 5) break; if (h !== sel && h._x > 20 && h._x < W - 20 && h._y > 20 && h._y < H - 20 && h.n >= 20 && lab(h)) { shown.add(h); c++; } } }
    if (!sel && hover && !shown.has(hover)) lab(hover.t === "item" ? { t: "item", label: "Marbete " + G.items[hover.i].mb, x: G.IX[hover.i], y: G.IY[hover.i] } : hover, true);
    ctx.globalAlpha = 1;
  }
  function pos(h) { if (h.t === "item") return [SX(G.IX[h.i]), SY(G.IY[h.i])]; return [SX(h.x), SY(h.y)]; }
  const itemObj = (i) => ({ t: "item", i, get x() { return G.IX[i]; }, get y() { return G.IY[i]; } });

  /* ---------- bucle ---------- */
  function step(ts) {
    const a = cam.anim;
    if (a) {
      if (!a.t0) a.t0 = ts; const p = clamp((ts - a.t0) / (a.dur * 1000), 0, 1), e = ease(p);
      cam.cx = a.a[0] + (a.b[0] - a.a[0]) * e; cam.cy = a.a[1] + (a.b[1] - a.a[1]) * e; cam.k = Math.exp(a.a[2] + (a.b[2] - a.a[2]) * e - a.dip * Math.sin(Math.PI * p));
      if (p >= 1) { cam.anim = null; a.done && a.done(); }
    } else if (cam.vx || cam.vy) {
      cam.cx -= cam.vx / cam.k; cam.cy -= cam.vy / cam.k; cam.vx *= 0.92; cam.vy *= 0.92; if (Math.abs(cam.vx) + Math.abs(cam.vy) < 0.15) cam.vx = cam.vy = 0; clampCam();
    }
    if (tour && tour.on && !tour.paused && tour.wait && ts >= tour.wait) { tour.wait = 0; tourNext(); }
  }
  function loop(ts) {
    raf = 0; if (destroyed) return; if (!root.isConnected) { destroy(); return; }
    if (!t0) t0 = ts;
    const need = motion || dirty || cam.anim || cam.vx || cam.vy || (tour && tour.on);
    if (need) { if (ts - last >= (motion ? 28 : 0) || cam.anim) { last = ts; step(ts); draw(ts); dirty = false; } raf = requestAnimationFrame(loop); }
  }

  /* ---------- selección y tarjeta ---------- */
  const stLine = (o) => ST.map((s, i) => (o.st && o.st[i] ? `${nf(o.st[i])} ${s.l.toLowerCase()}` : "")).filter(Boolean).join(" · ");
  function info(o) {
    if (!o) return { t: "", s: "", open: false };
    if (o.t === "per") return { t: o.label, s: `${nf(o.n)} bienes en ${nf(o.ar.size)} ${o.ar.size === 1 ? "lugar" : "lugares"}${o.fin ? " · inventario terminado" : ""}${stLine(o) ? " · " + stLine(o) : ""}`, open: "Abrir persona" };
    if (o.t === "area") return { t: o.label, s: `${nf(o.n)} bienes · ${nf(o.pe.size)} ${o.pe.size === 1 ? "resguardante" : "resguardantes"}${stLine(o) ? " · " + stLine(o) : ""}`, open: "Abrir lugar" };
    if (o.t === "lista") return { t: o.label, s: `Lista de bajas · ${nf(o.n)} bienes`, open: "Abrir lista" };
    if (o.t === "item") { const x = G.items[o.i], p = G.pl[G.IP[o.i]], a = G.al[G.IA[o.i]]; return { t: "Marbete " + x.mb, s: `${x.ds ? x.ds + " · " : ""}${p.label} · ${a.label} · ${(ST[x.s] || ST[0]).l.toLowerCase()}${x.baja ? " · en baja" : ""}${x.foto ? " · con foto" : ""}`, open: "Abrir bien" }; }
    return { t: "Inventario", s: `${nf(G.n)} bienes conectados`, open: false };
  }
  function openSel(o) {
    o = o || sel; if (!o || !opts.onOpen) return;
    if (o.t === "item") opts.onOpen("item", G.items[o.i].k); else if (o.t === "per") opts.onOpen("per", o.key); else if (o.t === "area") opts.onOpen("area", o.key); else if (o.t === "lista") opts.onOpen("lista", o.key);
  }
  function drawCard() {
    const c = $q(".cbx-info"), i = info(sel); if (!sel || (tour && tour.on)) { c.hidden = true; return; }
    c.hidden = false; c.innerHTML = `<div class="cbx-t"><b>${esc(i.t)}</b><small>${esc(i.s)}</small></div>${i.open ? `<button type="button" class="cbx-open" data-a="open">${esc(i.open)}</button>` : ""}<button type="button" class="cbx-x" data-a="close" aria-label="Cerrar">✕</button>`;
  }
  function select(o, fly) {
    sel = o || null; hover = null; drawCard();
    $q(".cbx-stat").style.opacity = sel || (tour && tour.on) ? 0 : 1;
    if (o && fly) { const p = o.t === "item" ? [G.IX[o.i], G.IY[o.i]] : [o.x, o.y]; flyTo(p[0], p[1], o.t === "item" ? fitK * 9 : o.t === "per" ? clamp(Math.min(S.w, S.h) * 0.4 / o.R, fitK, fitK * 14) : fitK * 3, 1.1, 0.2); }
    kick();
  }
  function hit(px, py, touch) {
    if (!G) return null; const tol = touch ? 24 : 13, zr = cam.k / fitK; let best = null, bd = 1e9;
    for (const h of G.hubs) { if (h._x == null) continue; const d = Math.hypot(h._x - px, h._y - py), rp = Math.max(9, (h._s || 20) * 0.3); if (d <= rp + tol * 0.5) { const sc = d - rp * 0.5 - (h.t === "core" ? 6 : 0); if (sc < bd) { bd = sc; best = h; } } }
    if (zr > 2.2) { const r2 = (tol * 0.62) ** 2; for (let i = 0; i < G.n; i++) { const dx = SX(G.IX[i]) - px, dy = SY(G.IY[i]) - py, d2 = dx * dx + dy * dy; if (d2 <= r2 && Math.sqrt(d2) - 8 < bd) { bd = Math.sqrt(d2) - 8; best = itemObj(i); } } }
    return best;
  }

  /* ---------- recorrido entrelazado ---------- */
  function buildTour() {
    const stops = [{ k: "core", h: G.core, x: 0, y: 0 }], vA = new Set(), vP = new Set(), areas = G.al.slice().sort((a, b) => b.n - a.n);
    let cur = areas[0], loops = 0;
    while (cur && loops < 7) {
      loops++; vA.add(cur); stops.push({ k: "area", h: cur, x: cur.x, y: cur.y });
      let p = null, pc = -1; for (const [pk, c] of cur.pe) { const q = G.P.get(pk); if (!vP.has(q) && c > pc) { pc = c; p = q; } }
      let nextA = null;
      if (p) {
        vP.add(p); stops.push({ k: "per", h: p, x: p.x, y: p.y });
        let ii = p.ix.find((i) => G.items[i].a === cur.key && (G.items[i].foto || G.items[i].baja)); if (ii == null) ii = p.ix.find((i) => G.items[i].a === cur.key);
        if (ii != null && loops % 2) stops.push({ k: "item", h: itemObj(ii), x: G.IX[ii], y: G.IY[ii] });
        let bc = -1; for (const [ak, c] of p.ar) { const a = G.al[G.aIdx.get(ak)]; if (!vA.has(a) && c > bc) { bc = c; nextA = a; } }
      }
      cur = nextA || areas.find((a) => !vA.has(a));
    }
    if (G.li[0]) stops.push({ k: "lista", h: G.li[0], x: G.li[0].x, y: G.li[0].y });
    stops.push({ k: "core", h: G.core, x: 0, y: 0, end: true });
    return stops;
  }
  function capText(s) {
    const h = s.h;
    if (s.k === "core") return s.end ? { t: "Todo conectado", s: "Así se entrelaza el inventario: cada persona toca varios lugares y cada lugar tiene varias personas." } : { t: "Inventario completo", s: `${nf(G.n)} bienes, ${nf(G.pl.length)} resguardantes y ${nf(G.al.length)} áreas. Vamos a recorrerlo siguiendo los hilos.` };
    if (s.k === "area") return { t: h.label, s: `Un lugar con ${nf(h.n)} bienes que comparten ${nf(h.pe.size)} ${h.pe.size === 1 ? "persona" : "personas"}.` };
    if (s.k === "per") return { t: h.label, s: `${nf(h.n)} bienes repartidos en ${nf(h.ar.size)} ${h.ar.size === 1 ? "lugar" : "lugares"}. Por sus bienes se llega al siguiente lugar.` };
    if (s.k === "item") { const i = info(h); return { t: i.t, s: i.s }; }
    return { t: h.label, s: `Lista de bajas con ${nf(h.n)} bienes.` };
  }
  function drawCap() {
    const c = $q(".cbx-cap"); if (!tour || !tour.on) { c.hidden = true; return; }
    const s = tour.stops[tour.i], x = capText(s), canOpen = s.k !== "core";
    c.hidden = false;
    c.innerHTML = `<div class="cbx-row"><div class="cbx-t"><b>${esc(x.t)}</b><small>${esc(x.s)}</small></div>${canOpen ? `<button type="button" class="cbx-open" data-a="topen">Abrir</button>` : ""}</div>
      <div class="cbx-row"><div class="cbx-dots">${tour.stops.map((_, j) => `<i class="${j < tour.i ? "d" : j === tour.i ? "c" : ""}"></i>`).join("")}</div><button type="button" class="cbx-x" data-a="tpause" aria-label="${tour.paused ? "Seguir" : "Pausar"}">${tour.paused ? "▶" : "❚❚"}</button><button type="button" class="cbx-x" data-a="tnext" aria-label="Siguiente">⏭</button><button type="button" class="cbx-x" data-a="tend" aria-label="Terminar">✕</button></div>`;
  }
  function stopView(s) {
    if (s.k === "core") return [0, 0, fitK];
    if (s.k === "area") return [s.x, s.y, fitK * 3.2];
    if (s.k === "per") return [s.x, s.y, clamp(Math.min(S.w, S.h) * 0.42 / s.h.R, fitK, fitK * 14)];
    if (s.k === "item") return [s.x, s.y, fitK * 10];
    return [s.x, s.y, fitK * 3];
  }
  function tourGo(i) {
    tour.i = i; const s = tour.stops[i], v = stopView(s), d = Math.hypot((v[0] - cam.cx) * cam.k, (v[1] - cam.cy) * cam.k), dur = clamp(1.5 + 0.9 * Math.log(1 + d / S.w), 1.5, 3.4);
    sel = null; drawCard(); drawCap(); tour.wait = 0;
    flyTo(v[0], v[1], v[2], dur, clamp(0.3 * Math.log(1 + d / (S.w * 0.5)), 0.05, 0.9), () => { if (tour && tour.on) tour.wait = performance.now() + (motion ? 3400 : 2600); });
    kick();
  }
  function tourNext() { if (!tour || !tour.on) return; if (tour.i >= tour.stops.length - 1) { tourEnd(); return; } tourGo(tour.i + 1); }
  function tourStart() {
    if (!G) return; if (tour && tour.on) { tourEnd(); return; }
    tour = { on: true, paused: false, i: 0, stops: buildTour(), wait: 0 };
    const b = $q('[data-a="tour"]'); b.textContent = "Detener"; $q(".cbx-stat").style.opacity = 0; cam.vx = cam.vy = 0; tourGo(0);
  }
  function tourEnd() {
    if (!tour) return; const was = tour.on; tour.on = false; tour = null; cam.anim = null; drawCap(); $q('[data-a="tour"]').textContent = "Recorrido"; $q(".cbx-stat").style.opacity = sel ? 0 : 1;
    if (was) { const f = fitView(); flyTo(f[0], f[1], f[2], 1.4, 0, null); } kick();
  }
  function tourPause() { if (!tour) return; tour.paused = !tour.paused; if (!tour.paused && !cam.anim && !tour.wait) tour.wait = performance.now() + 600; drawCap(); }

  /* ---------- gestos (pensados para iPhone) ---------- */
  const ptrs = new Map(); let pinch = 0, moved = 0, tapT = 0, tapP = null, lm = 0;
  const rel = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const userMove = () => { if (tour && tour.on) tourEnd(); cam.anim = null; };
  cv.addEventListener("pointerdown", (e) => {
    if (!G) return; try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    ptrs.set(e.pointerId, rel(e)); cam.vx = cam.vy = 0;
    if (ptrs.size === 1) { moved = 0; lm = e.timeStamp; } else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); moved += 20; }
  });
  cv.addEventListener("pointermove", (e) => {
    if (!G) return;
    if (!ptrs.has(e.pointerId)) { if (e.pointerType === "mouse") { const p = rel(e), h = hit(p[0], p[1], false); if (h !== hover && !(h && hover && h.t === hover.t && h.i === hover.i && h.key === hover.key)) { hover = h; cv.style.cursor = h ? "pointer" : "grab"; kick(); } } return; }
    const p = rel(e), o = ptrs.get(e.pointerId); ptrs.set(e.pointerId, p);
    if (ptrs.size === 1) {
      const dx = p[0] - o[0], dy = p[1] - o[1]; moved += Math.abs(dx) + Math.abs(dy); if (moved > 8) userMove();
      if (moved > 8) { cam.cx -= dx / cam.k; cam.cy -= dy / cam.k; const dt = Math.max(8, e.timeStamp - lm); cam.vx = cam.vx * 0.5 + (dx / dt * 16) * 0.5; cam.vy = cam.vy * 0.5 + (dy / dt * 16) * 0.5; clampCam(); kick(); }
      lm = e.timeStamp;
    } else if (ptrs.size === 2) {
      userMove(); const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (pinch > 0) zoomAt(mx, my, cam.k * (d / pinch)); pinch = d; moved += 10; cam.vx = cam.vy = 0;
    }
  });
  const up = (e) => {
    if (!ptrs.has(e.pointerId)) return; const wasOne = ptrs.size === 1; ptrs.delete(e.pointerId); pinch = 0;
    if (ptrs.size === 1) { /* queda un dedo: sigue como arrastre */ return; }
    if (!wasOne) return;
    if (moved < 9 && e.type === "pointerup") {
      const p = rel(e), now = e.timeStamp;
      if (tapP && now - tapT < 320 && Math.hypot(p[0] - tapP[0], p[1] - tapP[1]) < 28) { tapT = 0; userMove(); flyZoom(p[0], p[1], cam.k * 2.4); return; }
      tapT = now; tapP = p;
      const h = hit(p[0], p[1], e.pointerType !== "mouse"); if (tour && tour.on) tourEnd(); select(h && h.t !== "core" ? h : null, false);
    }
  };
  function flyZoom(sx, sy, nk) { nk = clamp(nk, fitK * 0.55, fitK * 60); const wx = (sx - S.w / 2) / cam.k + cam.cx, wy = (sy - S.h / 2) / cam.k + cam.cy; flyTo(wx - (sx - S.w / 2) / nk, wy - (sy - S.h / 2) / nk, nk, 0.45, 0); }
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("wheel", (e) => { e.preventDefault(); userMove(); const p = rel(e); zoomAt(p[0], p[1], cam.k * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))); }, { passive: false });
  for (const n of ["gesturestart", "gesturechange", "gestureend"]) root.addEventListener(n, (e) => e.preventDefault());
  root.addEventListener("contextmenu", (e) => e.preventDefault());
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]"); if (!b) return; const a = b.dataset.a;
    if (a === "zi") { userMove(); flyZoom(S.w / 2, S.h / 2, cam.k * 1.7); }
    else if (a === "zo") { userMove(); flyZoom(S.w / 2, S.h / 2, cam.k / 1.7); }
    else if (a === "fit") { userMove(); const f = fitView(); select(null); flyTo(f[0], f[1], f[2], 0.9, 0); }
    else if (a === "filt") { filt = (filt + 1) % FILT.length; b.textContent = FILT[filt].n; b.classList.toggle("on", filt > 0); kick(); }
    else if (a === "tour") tourStart();
    else if (a === "open") openSel();
    else if (a === "close") select(null);
    else if (a === "tpause") tourPause();
    else if (a === "tnext") { if (tour) { tour.wait = 0; cam.anim = null; tourNext(); } }
    else if (a === "tend") tourEnd();
    else if (a === "topen") { const s = tour && tour.stops[tour.i]; if (s && s.k !== "core") openSel(s.h); }
  });
  const ro = "ResizeObserver" in window ? new ResizeObserver(() => resize()) : null; if (ro) ro.observe(root); else window.addEventListener("resize", resize);

  /* ---------- arranque ---------- */
  function setData(d, keep) {
    const selKey = sel && { t: sel.t, key: sel.key, k: sel.t === "item" ? G.items[sel.i].k : null };
    G = build(d); stat(); sel = null;
    if (selKey) { if (selKey.t === "item") { const i = G.byK.get(selKey.k); if (i != null) sel = itemObj(i); } else sel = (selKey.t === "per" ? G.P.get(selKey.key) : selKey.t === "area" ? G.A.get(selKey.key) : G.li.find((l) => l.key === selKey.key)) || null; }
    const ld = $q(".cbx-ld"); if (ld) ld.remove();
    if (!keep) { cam.set = 0; t0 = 0; } resize(); if (!keep && S.w) { const f = fitView(); cam.cx = f[0]; cam.cy = f[1]; cam.k = f[2]; cam.set = 1; } drawCard(); kick();
  }
  function destroy() { destroyed = true; if (raf) cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect(); else window.removeEventListener("resize", resize); }
  setTimeout(() => { if (!destroyed) setData(data, false); }, 20);
  return {
    destroy, setData: (d) => setData(d, true), tour: tourStart, fit: () => { const f = fitView(); flyTo(f[0], f[1], f[2], 0.6, 0); },
    select: (kind, key) => { const o = !G ? null : kind === "per" ? G.P.get(key) : kind === "area" ? G.A.get(key) : kind === "lista" ? G.li.find((l) => l.key === key) : G.byK.has(key) ? itemObj(G.byK.get(key)) : null; if (o) select(o, true); return !!o; },
    _dbg: { get G() { return G; }, cam, get sel() { return sel; }, get tour() { return tour; }, get fitK() { return fitK; }, hit, info, get filt() { return filt; }, draw: () => draw(performance.now()), S, flyTo, pos },
  };
}
window.Cerebro = { mount };
})();
