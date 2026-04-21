const CACHE_VERSION = '2026-04-21'
const SHELL_CACHE = `caixinha-shell-${CACHE_VERSION}`
const RUNTIME_CACHE = `caixinha-runtime-${CACHE_VERSION}`
const FONT_CACHE = `caixinha-fonts-${CACHE_VERSION}`
const APP_SCOPE_URL = new URL(self.registration.scope)
const APP_ROOT_URL = new URL('./', APP_SCOPE_URL).toString()
const APP_ROOT_PATH = new URL(APP_ROOT_URL).pathname
const SHELL_ASSETS = [
  '',
  'index.html',
  'manifest.webmanifest',
  'favicon.ico',
  'favicon.svg',
  'apple-touch-icon-180x180.png',
  'pwa-64x64.png',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'maskable-icon-512x512.png',
].map((path) => new URL(path, APP_SCOPE_URL).toString())

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            const isCurrentCache =
              key === SHELL_CACHE || key === RUNTIME_CACHE || key === FONT_CACHE

            return isCurrentCache ? Promise.resolve() : caches.delete(key)
          }),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i.test(url.href)) {
    event.respondWith(cacheFirst(request, FONT_CACHE))
    return
  }

  if (url.origin !== self.location.origin || !url.pathname.startsWith(APP_ROOT_PATH)) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, RUNTIME_CACHE, APP_ROOT_URL))
    return
  }

  if (shouldCacheAsset(request, url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE))
  }
})

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName)

  try {
    const response = await fetch(request)

    cache.put(request, response.clone())
    return response
  } catch {
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    return (await caches.match(fallbackUrl)) || Response.error()
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  const networkResponsePromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone())
      return response
    })
    .catch(() => null)

  if (cachedResponse) {
    return cachedResponse
  }

  return (await networkResponsePromise) || Response.error()
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  const response = await fetch(request)

  cache.put(request, response.clone())
  return response
}

function shouldCacheAsset(request, url) {
  if (['script', 'style', 'font', 'image', 'worker'].includes(request.destination)) {
    return true
  }

  return /\.(?:css|gif|ico|jpeg|jpg|js|json|png|svg|webmanifest|woff2?)$/i.test(url.pathname)
}
