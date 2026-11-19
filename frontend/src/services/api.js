import axios from 'axios';

const api = axios.create({
  // Production uses the Vercel proxy so session cookies stay on this site.
  baseURL: import.meta.env?.PROD ? '/api/v1' : import.meta.env?.VITE_API_BASE_URL || '/api/v1',
  timeout: 8000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

async function checkHealth(signal) {
  const { data } = await api.get('/health', { signal });
  if (data?.success !== true || data?.data?.status !== 'ok') {
    throw new Error('The server responded, but its health response does not match the API contract.');
  }
  return { checkedAt: new Date() };
}

function getApiError(error) {
  if (error.code === 'ECONNABORTED') return 'The health check timed out. Confirm your backend is running on port 5000, then retry.';
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) return 'Health endpoint not found. Add GET /api/v1/health to your backend.';
    return 'Could not reach a healthy backend. Confirm Express is running on port 5000 and GET /api/v1/health returns the agreed JSON.';
  }
  return error.message || 'Unable to check the backend. Please retry.';
}

export { checkHealth, getApiError, api };
