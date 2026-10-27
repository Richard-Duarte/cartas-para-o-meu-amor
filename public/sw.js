/*
 * Service worker do Carta para o meu amor.
 *
 * Regras (seguras para cartas, login e pagamento):
 * - Páginas (HTML): sempre da rede. Sem rede, mostra /offline.html. HTML nunca
 *   é guardado em cache (pode conter dados da conta).
 * - /api, /_serverFn (dados, login, Mercado Pago, rastreio), /__grok e
 *   qualquer outro domínio: o SW não toca, vai direto à rede.
 * - /assets/* (arquivos com hash do build): cache-first.
 * - Ícones e fontes locais pequenas: stale-while-revalidate.
 * - Cada deploy registra /sw.js?v=<build>; os caches levam essa versão no nome
 *   e os antigos são apagados na ativação.
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "v1";
const PREFIX = "cartas-";
const SHELL = `${PREFIX}shell-${VERSION}`;
const STATIC = `${PREFIX}static-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const SHELL_FILES = [
  OFFLINE_URL,
  "/icons/icon-192-v2.png",
  "/icons/favicon-32-v2.png",
  "/manifest.webmanifest?v=2",
];
const MAX_STATIC = 150;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(SHELL_FILES.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, STATIC]);
      for (const key of await caches.keys()) {
        if (key.startsWith(PREFIX) && !keep.has(key)) await caches.delete(key);
      }
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {}
      }
      await self.clients.claim();
    })(),
  );
});

function neverTouch(url) {
  const p = url.pathname;
  return (
    p.startsWith("/api/") ||
    p.startsWith("/_serverFn") ||
    p.startsWith("/__grok") ||
    p.startsWith("/auth/") ||
    p === "/sw.js" ||
    url.searchParams.has("install")
  );
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") {
    cache.put(request, res.clone()).then(() => trim(STATIC, MAX_STATIC));
  }
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok && res.type === "basic") cache.put(request, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || network;
}

async function networkFirstPage(event) {
  try {
    const preload = await event.preloadResponse;
    if (preload) return preload;
    return await fetch(event.request);
  } catch {
    const offline = await caches.match(OFFLINE_URL);
    return offline || new Response("Sem conexão", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (neverTouch(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(event));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.pathname.startsWith("/icons/") || url.pathname === "/favicon.ico") {
    event.respondWith(staleWhileRevalidate(request));
  }
  // Todo o resto (mídia, modelos 3D, imagens de mensageiros…) segue o cache normal do navegador.
});
