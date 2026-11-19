self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { /* Show a generic alert for invalid payloads. */ }
  const url = /^\/alerts\/[a-f0-9]{24}$/.test(data.url) || data.url === '/volunteer' ? data.url : '/dashboard';
  event.waitUntil(self.registration.showNotification('SurakshaSetu SOS', {
    body: typeof data.body === 'string' ? data.body.slice(0, 200) : 'A safety request is waiting. Open the app to check.',
    icon: '/icon.svg', badge: '/icon.svg',
    tag: typeof data.tag === 'string' ? data.tag.slice(0, 60) : 'suraksha-alert',
    data: { url },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data?.url;
  const url = new URL(/^\/alerts\/[a-f0-9]{24}$/.test(path) || path === '/volunteer' ? path : '/dashboard', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(url); return existing.focus(); }
    return self.clients.openWindow(url);
  })());
});
