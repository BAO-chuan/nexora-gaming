/* Nexora Gaming v2.6.10 — Real Web Push Service Worker */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { body: event.data ? event.data.text() : 'Bạn có thông báo mới từ Nexora.' }; }
  const title = data.title || 'Nexora Gaming';
  const options = {
    body: data.body || 'Bạn có thông báo mới.',
    tag: data.tag || 'nexora-notification',
    renotify: true,
    data: { url: data.url || './dashboard.html' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './dashboard.html', self.location.origin).href;
  event.waitUntil((async () => {
    const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      if ('focus' in client) {
        try { await client.navigate(target); } catch {}
        return client.focus();
      }
    }
    return clients.openWindow ? clients.openWindow(target) : undefined;
  })());
});
