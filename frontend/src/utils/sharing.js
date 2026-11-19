let pendingInvitation = '';

function normalizePhone(value) {
  const phone = value.trim().replace(/[\s()-]/g, '');
  if (/^[6-9]\d{9}$/.test(phone)) return '+91' + phone;
  if (/^\+[1-9]\d{9,14}$/.test(phone)) return phone;
  return null;
}

function getMessageLinks(phone, message) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return { sms: 'sms:' + normalized + '?body=' + encodeURIComponent(message), whatsapp: 'https://wa.me/' + normalized.slice(1) + '?text=' + encodeURIComponent(message) };
}

function createAlertMessage(name, alertId, origin) {
  if (!/^[a-f\d]{24}$/i.test(alertId)) throw new Error('Invalid alert');
  const url = new URL('/alerts/' + alertId, origin);
  return `I need help. This is ${name}. Please call me and check my last shared location: ${url.href}\nSign in with the account you connected to my trusted contacts. If urgent, call 112.`;
}

function captureInvitation() {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
  if (token && /^[a-f\d]{64}$/.test(token)) {
    pendingInvitation = token;
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  }
  return pendingInvitation;
}

function clearInvitation() { pendingInvitation = ''; }

export { normalizePhone, getMessageLinks, createAlertMessage, captureInvitation, clearInvitation };
