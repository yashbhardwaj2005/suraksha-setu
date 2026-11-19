import { api } from './api.js';

async function getSafetyOverview(signal) {
  const [contacts, sos, shared] = await Promise.all([
    api.get('/contacts', { signal }), api.get('/sos/active', { signal }), api.get('/sos/shared', { signal }),
  ]);
  return { contacts: contacts.data.data.contacts, sos: sos.data.data.sos, shared: shared.data.data.alerts };
}

function getSafetyError(error) {
  const status = error.response?.status;
  if (status === 401) return 'Your session has ended. Please sign in again.';
  if (status === 403) return 'This request could not be verified. Refresh the page and try again.';
  if (status === 429) return 'Too many attempts. Please wait before trying again.';
  if (status === 503 || !error.response) return 'We could not reach the server. Check your connection. Call 112 if you need urgent help.';
  return error.response?.data?.error?.message || 'Something went wrong. Please try again.';
}

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Your browser cannot get a location. Call 112 for urgent help.'));
    navigator.geolocation.getCurrentPosition(position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }), error => {
      reject(new Error(error.code === 1 ? 'Location permission was denied. Allow location in your browser settings, then try again. You can still call 112.' : 'Your location could not be found. Move to an open area and retry, or call 112.'));
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
  });
}

export { getSafetyOverview, getSafetyError, getCurrentLocation };
