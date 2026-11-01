/* =================== v11: asistente de voz — te pregunta artículo por artículo =================== */
// La app pregunta en voz alta «Artículo 730, 390: silla de paleta. ¿Se encuentra?» y marca según lo que respondas.
// Entiende respuestas naturales: «sí, aquí está», «no lo encuentro», «está pero roto», «luego lo busco», «¿dónde está?»,
// «repite», «el anterior», «deshaz», «ve al 730390», «nota: le falta una pata», «¿cuántos faltan?», «pausa», «termina».
const VA = { on: false, kind: "per", ctx: "", list: [], i: 0, rec: null, listening: false, speaking: false, paused: false, gen: 0, sayId: 0, quiet: 0, bad: 0, log: [], area: "", wake: null, timer: 0, heard: "", got: "", done: 0 };
const vaName = (tok) => (VA.kind === "room" ? C.owner(tok) : VA.ctx);
const vaPend = () => VA.list.filter((t) => !C.getMark(vaName(t), t));
const vaTok = () => VA.list[VA.i];
function vaSpokenMb(tok) {
  const mb = String(mbOf(tok));
  if (/^\d{6}$/.test(mb)) return mb.slice(0, 3) + ", " + mb.slice(3);
  if (/^\d+$/.test(mb)) return mb.length > 4 ? mb.replace(/(\d{3})(?=\d)/g, "$1, ") : mb;
  return mb.split("").join(" ");
}
function vaDesc(tok) { let d = String(descOf(tok) || "").replace(/\s+/g, " ").trim(); if (d.length > 70) d = d.slice(0, 70).replace(/\s+\S*$/, ""); return d.toLowerCase(); }
function vaParse(txt) {
  const t = vnorm(txt); if (!t) return null;
  const w = t.split(" "), ph = " " + t + " ", has = (...a) => a.some((x) => (x.includes(" ") ? ph.includes(" " + x + " ") : w.includes(x)));
  const nm = t.match(/^(nota|anota|observacion|observaciones|apunta)\s+(.+)$/); if (nm) return { k: "note", note: nm[2] };
  const digits = t.replace(/[^0-9 ]/g, " ").trim(), joined = digits.replace(/\s+/g, "");
  if (joined.length >= 4 && joined.length <= 8 && (has("ve", "ir", "busca", "buscar", "marbete", "brinca", "salta a", "vamos al") || /^[0-9 ]+$/.test(t))) return { k: "goto", mb: joined };
  if (has("pausa", "detente", "deten", "alto", "espera", "esperate", "silencio", "para", "callate")) return { k: "pause" };
  if (has("termina", "terminar", "finaliza", "finalizar", "ya acabe", "ya termine", "salir", "cierra", "cerrar")) return { k: "end" };
  if (has("deshaz", "deshacer", "corrige", "corregir", "me equivoque", "equivocacion", "borra", "quita la marca")) return { k: "undo" };
  if (has("ayuda", "que puedo decir", "opciones", "comandos", "como funciona")) return { k: "help" };
  if (has("cuantos", "cuantas", "cuanto", "llevo", "faltan", "avance", "progreso", "cuantos quedan")) return { k: "progress" };
  if (has("donde", "que area", "en que lugar", "ubicacion", "en que salon")) return { k: "where" };
  if (has("detalles", "detalle", "descripcion", "que es", "mas informacion", "datos", "marca", "modelo", "serie", "describe", "describelo")) return { k: "details" };
  if (has("repite", "repetir", "repitelo", "otra vez", "de nuevo", "no escuche", "no te escuche", "cual", "como dijiste", "mande", "perdon")) return { k: "repeat" };
  if (has("anterior", "atras", "regresa", "regresar", "el de antes", "vuelve", "retrocede")) return { k: "prev" };
  if (has("no se", "no lo se", "luego lo busco", "lo busco", "despues", "luego", "siguiente", "salta", "saltar", "saltalo", "otro", "pasa", "pasale", "omite", "omitir", "todavia no se", "mas tarde")) {
    if (!has("no se encuentra", "no se ve")) return { k: "skip" };
  }
  const c = has("malo", "mala", "roto", "rota", "danado", "danada", "descompuesto", "descompuesta", "no sirve", "no funciona", "deteriorado", "deteriorada", "quebrado", "quebrada", "estropeado") ? "M"
    : has("regular", "mas o menos", "maso", "desgastado", "desgastada", "gastado", "viejo", "vieja") ? "R"
    : has("bueno", "buena", "buen estado", "perfecto", "excelente", "nuevo", "nueva") ? "B" : "";
  const absent = has("no esta", "no se encuentra", "no lo veo", "no la veo", "no lo encuentro", "no la encuentro", "no hay", "no aparece", "no existe", "falta", "faltante", "ausente", "perdido", "perdida", "extraviado", "extraviada", "negativo", "tampoco", "nop", "nel") || (w[0] === "no" && !c);
  if (absent) return { k: "mark", e: "no" };
  if (c || has("si", "esta", "aqui", "presente", "lo tengo", "la tengo", "lo veo", "la veo", "se encuentra", "correcto", "afirmativo", "ok", "okay", "listo", "claro", "exacto", "ya", "simon", "aja", "encontrado", "existe")) return { k: "mark", e: "si", c };
  return null;
}
/* ---------- habla y escucha ---------- */
function vaSay(txt, done) {
  const ss = window.speechSynthesis, my = ++VA.sayId;
  vaStopRec(); vaUI();
  if (!ss || typeof SpeechSynthesisUtterance === "undefined") { VA.speaking = false; done && setTimeout(done, 300); return; }
  try {
    ss.cancel(); VA.speaking = true; vaUI();
    const u = new SpeechSynthesisUtterance(txt); u.lang = "es-MX"; u.rate = 1.02;
    try { const vs = ss.getVoices(); const v = vs.find((x) => /^es[-_]MX/i.test(x.lang)) || vs.find((x) => /^es/i.test(x.lang)); if (v) u.voice = v; } catch (e) {}
    let fired = false; const tm = setTimeout(() => fin(), Math.min(16000, 1800 + txt.length * 90));
    const fin = () => { if (fired) return; fired = true; clearTimeout(tm); if (my !== VA.sayId) return; VA.speaking = false; vaUI(); done && done(); };
    u.onend = fin; u.onerror = fin; ss.speak(u);
  } catch (e) { VA.speaking = false; done && done(); }
}
function vaStopRec() { const r = VA.rec; VA.rec = null; VA.listening = false; if (r) { r.onend = null; r.onresult = null; r.onerror = null; try { r.abort(); } catch (e) {} } }
function vaListen() {
  clearTimeout(VA.timer);
  if (!VA.on || VA.paused || VA.listening || VA.speaking || !SRC) { vaUI(); return; }
  if (($("sheet") && $("sheet").open) || !$("scan").hidden) { VA.timer = setTimeout(vaListen, 700); return; }
  const gen = VA.gen; let rec, got = false, err = "";
  try { rec = new SRC(); } catch (e) { vaNoMic("Este navegador no deja usar el micrófono. Responde con los botones."); return; }
  rec.lang = "es-MX"; rec.continuous = false; rec.interimResults = false; rec.maxAlternatives = 4;
  rec.onresult = (ev) => { if (gen !== VA.gen) return; got = true; const r = ev.results[ev.results.length - 1], alts = []; for (let i = 0; i < r.length; i++) alts.push(r[i].transcript); VA.quiet = 0; vaHear(alts); };
  rec.onerror = (ev) => { err = (ev && ev.error) || "error"; };
  rec.onend = () => {
    if (VA.rec === rec) { VA.rec = null; VA.listening = false; }
    if (gen !== VA.gen || !VA.on || got || VA.paused) { vaUI(); return; }
    if (err === "not-allowed" || err === "service-not-allowed") { vaNoMic("Permite el micrófono para que te escuche (candado de la barra del navegador). Mientras, responde con los botones."); return; }
    if (err === "audio-capture") { vaNoMic("No encontré micrófono. Responde con los botones."); return; }
    if (err === "network") { vaNoMic("Para escucharte, este navegador necesita internet. Responde con los botones."); return; }
    VA.quiet++;
    if (VA.quiet === 4) { const tok = vaTok(); vaSay("¿Sigues ahí? " + (tok ? "¿El artículo " + vaSpokenMb(tok) + " se encuentra?" : ""), vaListen); return; }
    if (VA.quiet >= 9) { vaPause("Pausé porque no escuché respuesta. Toca «Seguir» cuando quieras."); return; }
    VA.timer = setTimeout(vaListen, 250);
  };
  VA.rec = rec; VA.listening = true; vaUI();
  try { rec.start(); } catch (e) { VA.rec = null; VA.listening = false; VA.timer = setTimeout(vaListen, 700); }
}
function vaNoMic(msg) { VA.mic = false; vaStopRec(); vaUI(msg); }
/* ---------- preguntar y responder ---------- */
function vaQuestion(tok) {
  const ar = areaOf(tok) || "", pre = ar && ar !== VA.area ? "En " + scase(ar).toLowerCase() + ". " : ""; VA.area = ar;
  const d = vaDesc(tok);
  return pre + "Artículo " + vaSpokenMb(tok) + (d ? ": " + d : "") + ". ¿Se encuentra?";
}
function vaAsk(lead) {
  if (!VA.on) return;
  const tok = vaNext();
  if (!tok) { vaFinish(lead); return; }
  VA.bad = 0; vaUI();
  vaSay((lead ? lead + " " : "") + vaQuestion(tok), vaListen);
}
// el actual si sigue pendiente; si no, el siguiente pendiente (dando la vuelta)
function vaNext() {
  if (!VA.list.length) return null;
  for (let k = 0; k < VA.list.length; k++) { const j = (VA.i + k) % VA.list.length, t = VA.list[j]; if (!C.getMark(vaName(t), t)) { VA.i = j; return t; } }
  return null;
}
function vaMark(e, c, how) {
  const tok = vaTok(); if (!tok) return;
  const name = vaName(tok), prev = C.getMark(name, tok);
  C.markTo(name, tok, e, c ? { c } : {});
  if (e === "no") FX.hit("stamp");
  VA.log.unshift({ tok, name, prev: prev ? { e: prev.e, c: prev.c || "", n: prev.n || "" } : null, e, c, how, at: Date.now() }); VA.log = VA.log.slice(0, 30);
  VA.done++; VA.i = (VA.i + 1) % Math.max(1, VA.list.length);
  const said = e === "no" ? "No está." : "Presente" + (c ? ", " + CONDN[c].toLowerCase() : "") + ".";
  VA.got = said;
  setTimeout(() => vaAsk(said), e === "si" ? 380 : 120); // deja sonar el tono de presente antes de hablar
}
function vaUndo() {
  const l = VA.log.shift(); if (!l) { vaSay("No hay nada que deshacer.", vaListen); return; }
  C.markTo(l.name, l.tok, l.prev ? l.prev.e : null, l.prev ? { c: l.prev.c, n: l.prev.n } : {}, true);
  VA.i = Math.max(0, VA.list.indexOf(l.tok)); VA.done = Math.max(0, VA.done - 1); VA.area = "";
  VA.got = "Deshecho"; FX.hit("undo"); vaAsk("Deshecho.");
}
function vaHear(alts) {
  VA.heard = (alts[0] || "").slice(0, 80);
  let cmd = null; for (const a of alts) { cmd = vaParse(a); if (cmd) break; }
  const tok = vaTok();
  if (!cmd) {
    VA.bad++; VA.got = ""; vaUI();
    if (VA.bad >= 2) { VA.bad = 0; vaSay("No te entendí. Responde sí, no, o siguiente.", vaListen); } else VA.timer = setTimeout(vaListen, 150);
    return;
  }
  VA.bad = 0;
  const S2 = (txt) => vaSay(txt, vaListen);
  switch (cmd.k) {
    case "mark": vaMark(cmd.e, cmd.c, "voz"); return;
    case "skip": { const left = vaPend().length; if (left <= 1) { VA.got = ""; S2("Es el último que queda. ¿Se encuentra?"); return; } VA.i = (VA.i + 1) % VA.list.length; VA.got = "Para después"; vaAsk("Lo dejo para después."); return; }
    case "repeat": VA.area = ""; VA.got = ""; vaAsk(""); return;
    case "prev": { const l = VA.log[0]; if (!l) { S2("Todavía no hay uno anterior. ¿Se encuentra este?"); return; } VA.got = "Anterior"; vaUndo(); return; }
    case "undo": vaUndo(); return;
    case "where": { const ar = tok ? areaOf(tok) : ""; VA.got = ""; S2(ar ? "Está registrado en " + scase(ar).toLowerCase() + ". ¿Se encuentra?" : "No tiene área registrada. ¿Se encuentra?"); return; }
    case "details": { if (!tok) return; const m = metaOf(tok), r = C.row(tok), imp = cell(r, K.IM); VA.got = ""; S2(vaDesc(tok) + ". " + (m ? m.replace(/·/g, ",") + ". " : "Sin marca ni serie registradas. ") + (imp ? "Valor " + money0(imp) + ". " : "") + "¿Se encuentra?"); return; }
    case "progress": { const p = vaPend().length, tot = VA.list.length; VA.got = ""; S2("Llevas " + (tot - p) + " de " + tot + ". Faltan " + p + ". ¿Se encuentra este?"); return; }
    case "help": VA.got = ""; S2("Responde sí, no, o siguiente. También: está pero roto, ¿dónde está?, detalles, repite, deshaz, ve al número, nota y lo que quieras anotar, pausa o termina. ¿Se encuentra?"); return;
    case "pause": vaPause(); return;
    case "end": vaFinish("Terminamos por ahora."); return;
    case "goto": { const j = VA.list.findIndex((t) => String(mbOf(t)) === cmd.mb); if (j < 0) { VA.got = ""; S2("El marbete " + cmd.mb.split("").join(" ") + " no está en esta lista. ¿Se encuentra el actual?"); return; } VA.i = j; VA.area = ""; VA.got = "Ir al " + cmd.mb; const t2 = VA.list[j]; if (C.getMark(vaName(t2), t2)) { S2("Ese ya está revisado como " + (C.getMark(vaName(t2), t2).e === "si" ? "presente" : "no está") + ". Sigo con los pendientes."); VA.i = (j + 1) % VA.list.length; return; } vaAsk(""); return; }
    case "note": { if (!tok) return; const name = vaName(tok), m = C.getMark(name, tok), n = (cmd.note.charAt(0).toUpperCase() + cmd.note.slice(1)).slice(0, 300); if (m) C.markTo(name, tok, m.e, { n }); else VA.note = n; VA.got = "Nota guardada"; S2("Anotado. ¿Se encuentra?"); return; }
  }
}
const money0 = (v) => { const n = Number(String(v).replace(/[^0-9.]/g, "")); return n ? Math.round(n).toLocaleString("es-MX") + " pesos" : String(v); };
// si se dictó una nota antes de marcar, se guarda con la marca
{ const raw2 = C.markTo; C.markTo = function (name, tok, e, patch, quiet) { if (VA.on && VA.note && e && tok === vaTok()) { patch = Object.assign({}, patch || {}, { n: VA.note }); VA.note = ""; return raw2.call(this, name, tok, e, patch, quiet); } return raw2.apply(this, arguments); }; }
function vaPause(msg) {
  VA.paused = true; VA.gen++; clearTimeout(VA.timer); vaStopRec(); VA.sayId++;
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
  VA.speaking = false; vaUI(msg || "En pausa.");
}
function vaResume() { if (!VA.on) return; VA.paused = false; VA.quiet = 0; VA.area = ""; FX.unlock(); vaAsk(""); }
function vaFinish(lead) {
  vaPause(); VA.finished = true;
  const p = vaPend().length, tot = VA.list.length, si = VA.list.filter((t) => C.getMark(vaName(t), t)?.e === "si").length, no = VA.list.filter((t) => C.getMark(vaName(t), t)?.e === "no").length;
  const txt = (lead ? lead + " " : "") + (p ? "Revisaste " + (tot - p) + " de " + tot + ". Quedan " + p + " pendientes." : "¡Listo! Revisaste todo: " + si + (si === 1 ? " presente" : " presentes") + " y " + no + (no === 1 ? " que no está." : " que no están."));
  vaUI(txt); vaSayOnly(txt);
}
function vaSayOnly(txt) { const p = VA.paused; VA.paused = true; vaSay(txt, () => { VA.paused = p; vaUI(); }); }
/* ---------- pantalla ---------- */
function vaOpen(kind, ctx) {
  if (VA.on) return;
  const list = kind === "room" ? C.areaSummary(ctx).pend.slice() : C.summaryOf(ctx).pend.slice();
  if (!list.length) { snack("No hay pendientes aquí.", { icon: "check" }); return; }
  list.sort((a, b) => (areaOf(a) || "").localeCompare(areaOf(b) || "", "es") || String(mbOf(a)).localeCompare(String(mbOf(b)), "es", { numeric: true }));
  Object.assign(VA, { on: true, kind, ctx, list, i: 0, paused: false, finished: false, quiet: 0, bad: 0, log: [], area: "", heard: "", got: "", done: 0, note: "", mic: !!SRC });
  VA.gen++;
  let el = $("asst"); if (!el) { el = document.createElement("div"); el.id = "asst"; el.className = "asst"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Revisión por voz"); document.body.appendChild(el); }
  el.hidden = false;
  el.innerHTML = `<div class="va-top"><button class="gb" type="button" data-act="vaclose" aria-label="Cerrar la revisión por voz">${ic("x")}</button><div class="g-t"><b>${esc(kind === "room" ? scase(ctx) : hname(ctx))}</b><small>Revisión por voz</small></div><button class="gb" type="button" data-act="vahelp" aria-label="Qué puedo decir">${ic("help")}</button></div>
    <div class="g-prog"><div class="g-bar"><i id="vaBar"></i></div><div class="g-pn" id="vaPn"></div></div>
    <div class="va-stage"><div class="va-card" id="vaCard"></div><div class="va-ear" id="vaEar" aria-live="polite"></div></div>
    <div class="va-btns"><button type="button" class="btn dan" data-act="vano">${ic("x")}No está</button><button type="button" class="btn pri" data-act="vasi">${ic("check")}Sí, está</button></div>
    <div class="va-sec"><button type="button" data-act="vaskip">${ic("next")}<span>Después</span></button><button type="button" data-act="varep">${ic("sound")}<span>Repetir</span></button><button type="button" data-act="vaundo">${ic("undo")}<span>Deshacer</span></button><button type="button" data-act="vapause" id="vaPz">${ic("mic")}<span>Pausa</span></button></div>`;
  pushLayer("asst", vaClose);
  FX.unlock(); FX.hit("whoosh");
  (async () => { try { VA.wake = await navigator.wakeLock?.request("screen"); } catch (e) { VA.wake = null; } })();
  const intro = "Revisión por voz" + (kind === "room" ? " de " + scase(ctx).toLowerCase() : " de " + hname(ctx)) + ". Son " + list.length + (list.length === 1 ? " pendiente" : " pendientes") + ". " + (SRC ? "Respóndeme sí, no, o siguiente." : "Responde con los botones.");
  vaAsk(intro);
}
function vaClose() {
  dropLayer("asst");
  VA.on = false; VA.gen++; clearTimeout(VA.timer); vaStopRec(); VA.sayId++; VA.speaking = false;
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
  try { VA.wake && VA.wake.release(); } catch (e) {} VA.wake = null;
  const el = $("asst"); if (el) { el.hidden = true; el.innerHTML = ""; }
  if (VA.done) snack(VA.done + (VA.done === 1 ? " artículo revisado" : " artículos revisados") + " por voz", { icon: "mic" });
  refresh();
}
function vaUI(msg) {
  const el = $("asst"); if (!el || el.hidden || !VA.on) return;
  const tot = VA.list.length, pend = vaPend().length, rev = tot - pend, tok = VA.finished ? null : vaTok();
  $("vaBar").style.width = pct(rev, tot) + "%";
  $("vaPn").innerHTML = `<b>${fmtN(rev)}</b> de ${fmtN(tot)} revisados · ${pend ? (pend === 1 ? "queda 1" : "quedan " + fmtN(pend)) : "¡todo revisado!"}`;
  const card = $("vaCard");
  if (tok && !C.getMark(vaName(tok), tok)) {
    const sig = tok; if (card.dataset.tok !== sig) {
      card.dataset.tok = sig; const ar = areaOf(tok);
      card.innerHTML = `${ar ? `<span class="tg w">${ic("pin")}${esc(scase(ar))}</span>` : ""}<div class="va-q">¿Se encuentra?</div><div class="g-mb disp">${esc(mbOf(tok))}</div><div class="g-d">${esc(descOf(tok))}</div><div class="g-m">${esc(metaOf(tok))}</div>${VA.kind === "room" ? `<div class="g-m">${ic("user")} ${esc(tcase(C.owner(tok)))}</div>` : ""}`;
      if (FX.motion) { card.classList.remove("in"); void card.offsetWidth; card.classList.add("in"); }
    }
  } else {
    card.dataset.tok = "";
    card.innerHTML = `<div class="va-fin">${ring(pct(rev, tot), "big", pct(rev, tot) + "<small>%</small>")}<h2>${pend ? "En pausa" : "¡Revisaste todo!"}</h2><p class="muted">${pend ? fmtN(pend) + " pendientes por revisar." : "Ve el resumen para finalizar."}</p><button type="button" class="btn pri blk" data-act="vasum">${ic("flag")}Ver resumen</button>${pend ? `<button type="button" class="btn blk" data-act="varesume" style="margin-top:8px">${ic("mic")}Seguir preguntando</button>` : ""}</div>`;
    FX.fill(card);
  }
  const ear = $("vaEar");
  const state = VA.paused ? "pause" : VA.speaking ? "say" : VA.listening ? "listen" : "wait";
  const label = { pause: "En pausa", say: "Preguntando…", listen: "Te escucho", wait: VA.mic === false ? "Responde con los botones" : "Un momento…" }[state];
  ear.className = "va-ear " + state;
  ear.innerHTML = `<i class="vp" aria-hidden="true"></i><div><b>${label}</b>${VA.heard ? `<span>Escuché: «${esc(VA.heard)}»${VA.got ? " → <strong>" + esc(VA.got) + "</strong>" : ""}</span>` : `<span>${VA.mic === false ? "Esta pantalla también funciona sin voz." : "Di «sí», «no» o «siguiente»"}</span>`}${msg ? `<span class="va-msg">${esc(msg)}</span>` : ""}</div>`;
  const pz = $("vaPz"); if (pz) { pz.innerHTML = VA.paused ? ic("mic") + "<span>Seguir</span>" : ic("pause") + "<span>Pausa</span>"; pz.dataset.act = VA.paused ? "varesume" : "vapause"; }
  el.querySelectorAll(".va-btns button,[data-act=vaskip],[data-act=varep]").forEach((b) => (b.disabled = !tok || VA.finished));
}
function vaTap(fn) { VA.paused = false; VA.finished = false; VA.gen++; vaStopRec(); VA.sayId++; try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {} VA.speaking = false; VA.heard = ""; FX.unlock(); fn(); }
document.addEventListener("visibilitychange", () => { if (document.hidden && VA.on && !VA.paused) vaPause("Pausé porque saliste de la app."); });
Object.assign(A, {
  vavoice: () => vaOpen(U.view === "room" ? "room" : "per", U.cur),
  vaclose: () => closeLayer("asst"),
  vasi: () => vaTap(() => vaMark("si", "", "toque")),
  vano: () => vaTap(() => vaMark("no", "", "toque")),
  vaskip: () => vaTap(() => { if (vaPend().length > 1) { VA.i = (VA.i + 1) % VA.list.length; VA.got = "Para después"; vaAsk("Lo dejo para después."); } else vaAsk(""); }),
  varep: () => vaTap(() => { VA.area = ""; vaAsk(""); }),
  vaundo: () => vaTap(vaUndo),
  vapause: () => vaPause(),
  varesume: () => { VA.finished = false; vaResume(); },
  vasum: () => { const ctx = VA.ctx, kind = VA.kind; closeThen("asst", () => { if (kind === "per") { U.cur = ctx; go("sum"); } }); },
  vahelp: () => { vaPause(); sheet.open((box) => { box.innerHTML = `<div class="sh-head"><div class="t"><div class="sh-d" style="font-size:1.25rem">${ic("mic")} Qué puedo decir</div></div><button type="button" class="sh-x" data-act="close" aria-label="Cerrar">${ic("x")}</button></div>
    <ul class="hl-l">${[["«Sí», «aquí está», «lo tengo»", "lo marca presente"], ["«No», «no lo encuentro», «falta»", "lo marca que no está"], ["«Está pero roto» / «regular»", "presente con su estado"], ["«Siguiente», «luego lo busco»", "lo deja para después"], ["«Repite», «¿cuál?»", "vuelve a preguntar"], ["«¿Dónde está?»", "te dice su área"], ["«Detalles»", "marca, modelo, serie y valor"], ["«Deshaz», «el anterior»", "corrige la última respuesta"], ["«Ve al 730390»", "salta a ese marbete"], ["«Nota: le falta una pata»", "guarda una observación"], ["«¿Cuántos faltan?»", "te dice el avance"], ["«Pausa», «termina»", "se detiene"]].map(([a, b]) => `<li>${ic("check")}<span><b>${a}</b> ${b}</span></li>`).join("")}</ul>
    <p class="tiny" style="margin-top:10px">Funciona mejor en Chrome de Android, con buena señal. Si no te escucha, usa los botones: la app sigue preguntando en voz alta.</p>`; }, { onclose: () => { if (VA.on && !VA.finished) vaResume(); } }); },
});
