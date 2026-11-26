/* Service worker de La Forja: app completa offline + caché del modelo de cámara. */

/* Estos dos valores los reemplaza el build (ver vite.config.ts). */
const BUILD_ID = "__BUILD_ID__";
const PRECACHE_URLS = "__PRECACHE_URLS__";

const SHELL_PREFIX = "forja-shell-";
const SHELL_CACHE = `${SHELL_PREFIX}${BUILD_ID}`;

/* El modelo pesa ~20 MB: su caché sobrevive entre versiones de la app. */
const MODEL_CACHE = "forja-model-v1";

const SHELL_FILES = ["/", "/index.html", "/manifest.webmanifest", "/favicon.svg"];

/* MediaPipe: motor WASM (jsDelivr) y modelo de pose (Google Storage). */
function isMediaPipeAsset(url) {
  return (
    (url.hostname === "cdn.jsdelivr.net" &&
      url.pathname.startsWith("/npm/@mediapipe/")) ||
    (url.hostname === "storage.googleapis.com" &&
      url.pathname.startsWith("/mediapipe-models/"))
  );
}

self.addEventListener("install", (event) => {
  const urls = [
    ...SHELL_FILES,
    ...(Array.isArray(PRECACHE_URLS) ? PRECACHE_URLS : []),
  ];

  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      /* Cada archivo por separado: si uno falla, los demás se guardan. */
      .then((cache) =>
        Promise.all(urls.map((url) => cache.add(url).catch(() => undefined))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== MODEL_CACHE &&
                key !== SHELL_CACHE &&
                (key.startsWith(SHELL_PREFIX) || key.startsWith("forja-model-")),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/* Vercel responde index.html a rutas que no existen: eso nunca debe guardarse como JS o CSS. */
function isCacheable(response) {
  const type = response.headers.get("content-type") || "";
  return response.ok && !type.includes("text/html");
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (isCacheable(response)) {
    cache.put(request, response.clone());
  }

  return response;
}

async function networkFirstPage(request) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put("/index.html", response.clone());
    }

    return response;
  } catch {
    return (await cache.match("/index.html")) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (isMediaPipeAsset(url)) {
    event.respondWith(cacheFirst(request, MODEL_CACHE));
    return;
  }

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  /* Archivos con hash de Vite y recursos estáticos: cache primero. */
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});
