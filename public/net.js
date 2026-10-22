/* Conexión del generador con el servidor de Netlify: pantalla de acceso con contraseña,
   base de datos compartida (misma interfaz que usaba la página de Claude) y ficha de cada QR. */
(() => {
  "use strict";
  const TK = "cnlp_token", UK = "cnlp_user";
  let TOK = "", NAME = "";
  try { TOK = localStorage.getItem(TK) || ""; NAME = localStorage.getItem(UK) || ""; } catch (e) {}
  const FICHA = /^#m[A-Za-z0-9]+$/;
  const $q = (s) => document.querySelector(s);
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

  let loginRes; const loggedIn = new Promise((r) => (loginRes = r));
  let appRes; const appGo = new Promise((r) => (appRes = r));
  if (!FICHA.test(location.hash)) appRes();

  /* ---------- llamadas al servidor ---------- */
  async function raw(route, body, auth = true) {
    let r;
    try {
      r = await fetch("/api/" + route, {
        method: "POST",
        headers: { "content-type": "application/json", ...(auth && TOK ? { authorization: "Bearer " + TOK } : {}) },
        body: JSON.stringify(body || {}),
      });
    } catch (e) { throw { code: "unavailable", message: "Sin conexión con el servidor." }; }
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (r.status === 401 && auth) { dropSession(); throw { code: "unauthenticated", message: "Tu sesión venció. Entra de nuevo y repite el cambio." }; }
    if (!r.ok) throw { code: j.code || "error", message: j.error || "Error del servidor." };
    return j;
  }
  const api = (body) => raw("db", body);

  /* ---------- pantalla de acceso ---------- */
  let gate = null;
  const css = `
  #gate,#fichaV{position:fixed;inset:0;z-index:99999;background:var(--bg,#fff);color:var(--ink,#141817);font-family:var(--sans,system-ui,sans-serif);overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px}
  #gate[hidden],#fichaV[hidden]{display:none!important}
  #gate .box,#fichaV .box{width:100%;max-width:380px}
  #fichaV .box{max-width:600px}
  #gate img{height:46px;display:block;margin:0 auto 14px}
  #gate h1{font-size:1.05rem;font-weight:700;text-align:center;margin:0 0 4px}
  #gate p{color:var(--muted,#66706c);font-size:.82rem;text-align:center;margin:0 0 22px}
  #gate label{display:block;font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#66706c);margin:14px 0 6px}
  #gate select,#gate input{width:100%;font:inherit;font-size:.95rem;padding:11px 12px;border:1px solid var(--line,#e1e5e3);border-radius:8px;background:var(--soft,#f4f6f5);color:inherit}
  #gate button{width:100%;margin-top:20px;font:inherit;font-weight:600;padding:12px;border:0;border-radius:8px;background:var(--green,#006b54);color:var(--on-green,#fff);cursor:pointer}
  #gate button:disabled{opacity:.6;cursor:wait}
  #gate .err{color:#c0392b;font-size:.84rem;margin-top:14px;min-height:1.2em;text-align:center}
  #fichaV .mb{margin-top:18px;font:600 .82rem ui-monospace,Menlo,monospace;color:var(--green,#006b54)}
  #fichaV h2{font-size:1.3rem;line-height:1.3;margin:6px 0 18px}
  #fichaV dl{margin:0;display:grid;grid-template-columns:minmax(0,11rem) 1fr;gap:10px 16px;border-top:1px solid var(--line,#e1e5e3);padding-top:16px}
  #fichaV dt{font-size:.68rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted,#66706c);padding-top:3px}
  #fichaV dd{margin:0;overflow-wrap:anywhere}
  @media(max-width:460px){#fichaV dl{grid-template-columns:1fr;gap:2px}#fichaV dd{margin-bottom:12px}}
  #fichaV .go{display:inline-block;margin-top:26px;padding:11px 18px;border:0;border-radius:8px;background:var(--green,#006b54);color:var(--on-green,#fff);font:inherit;font-weight:600;cursor:pointer}
  #outBtn{margin-left:8px;font:inherit;font-size:.7rem;padding:4px 9px;border:1px solid var(--line,#e1e5e3);border-radius:999px;background:transparent;color:var(--muted,#66706c);cursor:pointer;vertical-align:middle}`;

  function buildGate() {
    if (gate) return gate;
    const st = el("style"); st.textContent = css; document.head.appendChild(st);
    gate = el("div"); gate.id = "gate"; gate.hidden = true;
    const box = el("div", "box");
    const lg = $q("#logoHdr"); if (lg && lg.src) { const i = el("img"); i.src = lg.src; i.alt = "CONALEP"; box.appendChild(i); }
    box.append(el("h1", "", "CONALEP Servicios Administrativos"), el("p", "", "Inventario de mobiliario y equipo · acceso restringido"));
    const f = el("form");
    const l1 = el("label", "", "Usuario"), sel = el("select");
    ["Juan Moreno", "Mitchell"].forEach((n) => { const o = el("option", "", n); o.value = n; sel.appendChild(o); });
    const l2 = el("label", "", "Contraseña"), pw = el("input"); pw.type = "password"; pw.autocomplete = "current-password"; pw.required = true;
    const btn = el("button", "", "Entrar"); btn.type = "submit";
    const err = el("div", "err"); err.setAttribute("role", "alert");
    f.append(l1, sel, l2, pw, btn, err); box.appendChild(f); gate.appendChild(box); document.body.appendChild(gate);
    f.onsubmit = async (e) => {
      e.preventDefault(); err.textContent = ""; btn.disabled = true; btn.textContent = "Entrando…";
      try {
        const r = await raw("login", { username: sel.value, password: pw.value }, false);
        TOK = r.token; NAME = r.user;
        try { localStorage.setItem(TK, TOK); localStorage.setItem(UK, NAME); } catch (e2) {}
        pw.value = ""; gate.hidden = true; document.body.style.overflow = ""; sessionOk();
      } catch (e2) { err.textContent = e2.message || "No se pudo entrar."; }
      btn.disabled = false; btn.textContent = "Entrar";
    };
    return gate;
  }
  function showGate() { buildGate().hidden = false; document.body.style.overflow = "hidden"; setTimeout(() => gate.querySelector("input")?.focus(), 50); }
  function dropSession() { TOK = ""; NAME = ""; try { localStorage.removeItem(TK); localStorage.removeItem(UK); } catch (e) {} showGate(); }

  let first = true;
  function sessionOk() {
    if (first) { first = false; loginRes(); addOut(); }
    route();
  }
  function addOut() {
    const w = $q(".who"); if (!w || $q("#outBtn")) return;
    const b = el("button", "", "Salir · " + NAME); b.id = "outBtn"; b.type = "button";
    b.onclick = () => { try { localStorage.removeItem(TK); localStorage.removeItem(UK); } catch (e) {} location.reload(); };
    w.appendChild(b);
  }

  /* ---------- ficha de un artículo (al escanear su QR) ---------- */
  let fv = null;
  async function route() {
    if (!FICHA.test(location.hash)) { if (fv) fv.hidden = true; document.body.style.overflow = gate && !gate.hidden ? "hidden" : ""; return; }
    const tok = location.hash.slice(1);
    if (!fv) { fv = el("div"); fv.id = "fichaV"; document.body.appendChild(fv); }
    fv.hidden = false; document.body.style.overflow = "hidden";
    fv.innerHTML = ""; const box = el("div", "box"); fv.appendChild(box);
    const lg = $q("#logoHdr"); if (lg && lg.src) { const i = el("img"); i.src = lg.src; i.alt = "CONALEP"; i.style.height = "42px"; box.appendChild(i); }
    box.appendChild(el("p", "", "Cargando…"));
    let r; try { r = await raw("item", { tok }); } catch (e) { box.lastChild.textContent = e.message || "No se pudo cargar."; return; }
    box.innerHTML = ""; if (lg && lg.src) { const i = el("img"); i.src = lg.src; i.alt = "CONALEP"; i.style.height = "42px"; box.appendChild(i); }
    if (!r.found) box.appendChild(el("p", "", "No encontré este artículo en el inventario."));
    else {
      const H = r.h, [n, ...v] = r.row, di = H.findIndex((h) => /descrip/i.test(h)), ki = H.findIndex((h) => /marbete/i.test(h));
      box.append(el("div", "mb", "MARBETE " + (v[ki >= 0 ? ki : 0] || "") + " · No. " + n), el("h2", "", v[di] || "Artículo " + n));
      const dl = el("dl"); H.forEach((h, i) => { if (v[i]) dl.append(el("dt", "", h), el("dd", "", v[i])); }); box.appendChild(dl);
    }
    const go = el("button", "go", "Abrir el inventario completo"); go.type = "button";
    go.onclick = () => { history.replaceState(null, "", location.pathname); fv.hidden = true; document.body.style.overflow = ""; appRes(); };
    box.appendChild(go);
  }
  window.addEventListener("hashchange", () => { if (!first) route(); });

  /* ---------- base de datos con la misma interfaz que usaba la página de Claude ---------- */
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const merge = (d, s) => { for (const [k, v] of Object.entries(s)) { if (isObj(v) && isObj(d[k])) merge(d[k], v); else d[k] = v; } return d; };
  const cols = {}; // colecciones con suscripción: {docs:Map, v, subs:Set}
  const mkDoc = (id, data) => ({ id, exists: !!data, data: () => data || undefined });
  const mkSnap = (docs) => ({ docs: docs.map((d) => mkDoc(d.id, d.data)), size: docs.length, empty: !docs.length });
  const snapOfCol = (c) => mkSnap([...c.docs].map(([id, data]) => ({ id, data })));
  async function loadCol(name) {
    const c = cols[name]; const r = await api({ op: "list", collection: name });
    c.docs = new Map(r.docs.map((d) => [d.id, d.data])); c.v = r.v; c.ready = true; emit(name);
  }
  function emit(name) { const c = cols[name]; const s = snapOfCol(c); c.subs.forEach((f) => { try { f.ok(s); } catch (e) { console.error(e); } }); }
  async function poll() {
    if (document.hidden || !TOK) return;
    for (const name of Object.keys(cols)) {
      const c = cols[name]; if (!c.ready) continue;
      try { const r = await api({ op: "version", collection: name }); if (r.v !== c.v) await loadCol(name); } catch (e) {}
    }
  }
  setInterval(poll, 20000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });

  function afterWrite(col, id, data, op, res) {
    const c = cols[col]; if (!c || !c.ready) return;
    if (res.prev === c.v) { // nadie más escribió entre tanto: aplicar localmente, sin volver a bajar todo
      if (op === "set") c.docs.set(id, data); else c.docs.set(id, merge(c.docs.get(id) || {}, JSON.parse(JSON.stringify(data))));
      c.v = res.v; emit(col);
    } else loadCol(col).catch(() => {});
  }
  function docRef(path) {
    const [col, id] = path.split("/");
    return {
      id, path,
      async get() { const r = await api({ op: "get", path }); return mkDoc(id, r.exists ? r.data : null); },
      async set(data) { const r = await api({ op: "set", path, data }); afterWrite(col, id, data, "set", r); },
      async update(data) { const r = await api({ op: "update", path, data }); afterWrite(col, id, data, "update", r); },
      async delete() { const r = await api({ op: "delete", path }); const c = cols[col]; if (c && c.ready) { c.docs.delete(id); c.v = r.v; emit(col); } },
    };
  }
  function query(collection, q) {
    return {
      where: (f, op, v) => query(collection, { ...q, where: [f, op, v] }),
      orderBy: (f, dir) => query(collection, { ...q, orderBy: [f, dir || "asc"] }),
      limit: (n) => query(collection, { ...q, limit: n }),
      async get() { const r = await api({ op: "query", collection, ...q }); return mkSnap(r.docs); },
      onSnapshot(ok, bad) { this.get().then(ok, bad); return () => {}; },
    };
  }
  const db = {
    doc: docRef,
    collection(name) {
      return {
        doc: (id) => docRef(name + "/" + id),
        where: (f, op, v) => query(name, { where: [f, op, v] }),
        orderBy: (f, d) => query(name, { orderBy: [f, d || "asc"] }),
        limit: (n) => query(name, { limit: n }),
        get: () => query(name, {}).get(),
        onSnapshot(ok, bad) {
          const c = (cols[name] = cols[name] || { docs: new Map(), v: "", subs: new Set(), ready: false });
          const sub = { ok, bad }; c.subs.add(sub);
          if (c.ready) setTimeout(() => ok(snapOfCol(c)), 0); else loadCol(name).catch((e) => { try { bad && bad(e); } catch (e2) {} });
          return () => c.subs.delete(sub);
        },
      };
    },
  };
  const user = { id: async () => NAME, profiles: async (ids) => Object.fromEntries(ids.map((i) => [i, { name: i }])) };
  const downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data], { type: /\.json$/i.test(filename) ? "application/json" : "application/octet-stream" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    },
  };
  window.claude = {
    use: async (name) => {
      if (name === "db") { await loggedIn; await appGo; return db; }
      if (name === "user") { await loggedIn; return user; }
      if (name === "downloads") return downloads;
      return null;
    },
  };

  /* ---------- arranque: ¿ya hay sesión válida? ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    buildGate();
    if (!TOK) { showGate(); return; }
    try { const r = await raw("me", {}); NAME = r.user; sessionOk(); }
    catch (e) { if (e.code !== "unauthenticated") { showGate(); } }
  });
})();
