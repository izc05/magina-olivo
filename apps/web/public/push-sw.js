self.addEventListener('push', (event) => {
  const targetUrl = new URL('notificaciones', self.registration.scope).href;
  const iconUrl = new URL('brand/magina-olivo-mark.svg', self.registration.scope).href;

  event.waitUntil(
    self.registration.showNotification('Mágina Olivo', {
      body: 'Tienes un aviso nuevo. Abre Mágina Olivo para consultarlo.',
      icon: iconUrl,
      badge: iconUrl,
      tag: 'magina-olivo-alert',
      renotify: false,
      data: { url: targetUrl },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const fallbackUrl = new URL('notificaciones', self.registration.scope).href;
  const targetUrl = event.notification.data?.url || fallbackUrl;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(targetUrl);
        return;
      }
    }
    await self.clients.openWindow(targetUrl);
  })());
});
