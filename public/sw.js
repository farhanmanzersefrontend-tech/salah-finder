self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (event.action === 'mute-azan') {
      for (const client of windows) client.postMessage({ type: 'MUTE_AZAN', token: event.notification.data?.token });
      return;
    }
    const client = windows.find(item => new URL(item.url).origin === self.location.origin);
    if (client) await client.focus();
    else await self.clients.openWindow('/');
  })());
});
