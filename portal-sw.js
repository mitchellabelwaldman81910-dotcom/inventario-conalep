/* Portal de inventario CONALEP: permite abrir el portal sin internet con la última copia.
   Siempre intenta primero la red (así nunca se queda una versión vieja) y solo usa la copia si no hay conexión.
   No toca /api/ (datos) ni /app/ (la app de celular tiene su propio service worker). */
const CACHE = "portal-v3";
const SHELL = ["/", "/assets/p.css", "/assets/fx.js", "/assets/qr.js", "/assets/data.js", "/assets/brain.js", "/assets/files.js", "/assets/ui.js", "/assets/shell.js", "/assets/views.js", "/assets/logo.png",
  "/assets/fonts/BricolageGrotesque-Regular.woff", "/assets/fonts/BricolageGrotesque-Bold.woff", "/assets/fonts/BigShoulders-Bold.woff", "/assets/fonts/BigShoulders-Regular.woff"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("portal-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url); if (u.origin !== location.origin) return;
  if (u.pathname.startsWith("/api/") || u.pathname.startsWith("/app/")) return;
  const key = req.mode === "navigate" ? "/" : u.pathname;
  e.respondWith(fetch(req).then((r) => { if (r.ok && (req.mode === "navigate" || SHELL.includes(u.pathname) || u.pathname.startsWith("/vendor/") || u.pathname.startsWith("/assets/"))) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(key, cp)); } return r; })
    .catch(() => caches.match(key).then((m) => m || caches.match(req)).then((m) => m || new Response("Sin conexión", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }))));
});
