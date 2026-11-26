/* Service worker de La Forja: shell offline + caché del modelo de cámara. */
const VERSION = "v1";
const SHELL_CACHE = `forja-shell-${VERSION}`;
const MODEL_CACHE = `forja-model-${VERSION}`;

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
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch(() => undefined)
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
            .filter((key) => ![SHELL_CACHE, MODEL_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.ok) {
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
