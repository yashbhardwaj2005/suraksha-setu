import { api } from './api.js';

async function registerAccount(values, signal) {
  const response = await api.post('/auth/register', {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    role: values.role,
  }, { signal: signal });

  const user = response.data?.data?.user;
  if (response.status !== 201 || response.data?.success !== true || !user ||
      typeof user.id !== 'string' || !user.id || typeof user.name !== 'string' ||
      typeof user.email !== 'string' || !['USER', 'VOLUNTEER'].includes(user.role) ||
      user.accountStatus !== 'ACTIVE' || user.verificationStatus !== 'NOT_REQUESTED') {
    throw new Error('Registration could not be confirmed.');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus,
    verificationStatus: user.verificationStatus,
  };
}

async function loginAccount(values, signal) {
  const response = await api.post('/auth/login', {
    email: values.email.trim().toLowerCase(),
    password: values.password,
  }, { signal: signal });
  const user = response.data?.data?.user;
  if (response.status !== 200 || response.data?.success !== true || !user?.id) {
    throw new Error('Sign-in could not be confirmed.');
  }
  return user;
}

async function getCurrentUser(signal) {
  const response = await api.get('/auth/me', { signal: signal });
  return response.data?.data?.user || null;
}

async function prepareCsrf() {
  const response = await api.get('/auth/csrf');
  const token = response.data?.data?.csrfToken;
  if (!token || typeof token !== 'string') throw new Error('Could not prepare a secure session request.');
  api.defaults.headers.common['X-CSRF-Token'] = token;
}

async function logoutAccount() {
  await api.post('/auth/logout');
}

function getRegistrationError(error) {
  const status = error.response?.status;
  if (status === 400) return 'Please check your name, email, password and selected role.';
  if (status === 403) return 'Account setup is unavailable from this address. Use the configured application URL.';
  if (status === 404) return 'Registration is not available on the connected server yet.';
  if (status === 409) return 'An account with this email already exists.';
  if (status === 429) return 'Too many registration attempts. Please wait before trying again.';
  if (!error.response) return 'Registration could not be confirmed. Check your connection before retrying.';
  return 'Registration could not be confirmed. Please try again later.';
}

export { registerAccount, loginAccount, getCurrentUser, prepareCsrf, logoutAccount, getRegistrationError };
