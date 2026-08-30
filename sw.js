// sw.js — DOAFX Service Worker

const CACHE_NAME = 'doafx-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/tokens.css',
  '/css/base.css',
  '/css/components.css',
  '/css/landing.css',
  '/public/icons/icon-192.png',
  '/public/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first for navigation/API calls, cache-first for static assets.
// This keeps signals/timers always fresh while letting the app shell load offline.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return; // never cache POST/PATCH etc (Supabase writes)

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // don't intercept Supabase/API calls

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached); // offline fallback to cache

      return cached || fetchPromise;
    })
  );
});

// ===== PUSH NOTIFICATIONS =====

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'DOAFX', body: event.data ? event.data.text() : 'New update' };
  }

  const title = data.title || 'DOAFX — New Signal';
  const options = {
    body: data.body || 'A new trade signal has been sent.',
    icon: '/public/icons/icon-192.png',
    badge: '/public/icons/icon-192.png',
    data: { url: data.url || '/dashboard/index.html' },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard/index.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes('/dashboard/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});