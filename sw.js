/* Service worker: guarda la app para abrirla sin internet. Nunca toca /api (los datos viven en la app, en IndexedDB). */
const V = "inv-app-v2";
const SHELL = ["./", "./index.html", "./app.css", "./core.js", "./fx.js", "./app.js", "./qrdec.js", "./manifest.webmanifest",
  "./fonts/BricolageGrotesque-Regular.woff", "./fonts/BricolageGrotesque-Bold.woff", "./fonts/BigShoulders-Bold.woff",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/") || !u.pathname.startsWith("/app/")) return;
  // las fuentes casi nunca cambian: primero la copia guardada
  if (u.pathname.includes("/fonts/")) { e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(V).then((x) => x.put(r, c)); } return res; }))); return; }
  // lo demás: primero la red (así las actualizaciones llegan); si no hay internet, la copia guardada
  e.respondWith(
    fetch(r).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || (r.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});
