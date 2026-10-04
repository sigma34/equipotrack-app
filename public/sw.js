// Lumo - service worker (versión 1)
// Estrategia "red primero": siempre intenta traer la versión más nueva y
// solo usa la copia guardada si no hay internet. Así NO se queda pegada una
// versión vieja después de desplegar. Nunca toca llamadas a Supabase ni a
// otros dominios: solo archivos de la propia app (mismo dominio).
const CACHE = "lumo-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/dashboard")) return; // el dashboard siempre en vivo
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/")))
  );
});
