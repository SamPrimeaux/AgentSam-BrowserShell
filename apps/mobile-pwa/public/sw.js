/**
 * Minimal offline shell for the PWA lane.
 * Capability semantics stay in the adapter; this file only caches the shell
 * so `backgroundExecution` and offline support can be measured honestly.
 */
const CACHE = 'agentsam-pwa-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request).catch(() => caches.match('/index.html'))),
  );
});

self.addEventListener('periodicsync', (event) => {
  // AgentSam background tasks are identified by BackgroundTaskRequest.id.
  event.waitUntil(self.clients.matchAll().then((clients) => clients.forEach((client) => client.postMessage({ type: 'agentsam:background', tag: event.tag }))));
});
