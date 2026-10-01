// Temporary retirement worker for the accidental GitHub Pages PWA preview.
// Its only purpose is to release /magina-olivo/ from the old cached app shell.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys
        .filter((key) => key.includes('magina-olivo') || key === 'magina-public-api-v1')
        .map((key) => caches.delete(key)),
    );

    await self.clients.claim();
    await self.registration.unregister();

    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      try {
        const url = new URL(client.url);
        if (url.pathname.startsWith('/magina-olivo/')) {
          url.searchParams.set('pwa-reset', Date.now().toString());
          await client.navigate(url.href);
        }
      } catch {
        // Ignore a client that cannot be navigated.
      }
    }
  })());
});
