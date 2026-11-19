import { api } from './api.js';

function supportsPush() {
  return typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function enablePush() {
  if (!supportsPush()) throw new Error('Notifications are unavailable in this browser. On iPhone, add this site to your Home Screen and open it there.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser settings, then retry.');
  const response = await api.get('/push/key');
  const publicKey = response.data.data.publicKey;
  if (!publicKey) throw new Error('Push alerts are not configured yet. In-app requests still work.');
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const encoded = publicKey.replace(/-/g, '+').replace(/_/g, '/');
    const key = Uint8Array.from(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')), value => value.charCodeAt(0));
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  }
  await api.post('/push/subscriptions', subscription.toJSON());
  return subscription;
}

async function disablePush() {
  if (!supportsPush()) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  try { await api.delete('/push/subscriptions', { data: { endpoint: subscription.endpoint } }); }
  finally { await subscription.unsubscribe(); }
}

export { supportsPush, enablePush, disablePush };
