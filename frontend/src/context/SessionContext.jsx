import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getCurrentUser, prepareCsrf, logoutAccount } from '../services/auth.service.js';
import { api } from '../services/api.js';

const SessionContext = createContext(null);

function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const interceptor = api.interceptors.response.use(response => response, error => {
      if (error.response?.status === 401) {
        setUser(null); setStatus('anonymous');
        delete api.defaults.headers.common['X-CSRF-Token'];
      }
      return Promise.reject(error);
    });
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  const refreshSession = useCallback(async (signal) => {
    try {
      const current = await getCurrentUser(signal);
      if (signal?.aborted) return null;
      if (!current) throw new Error('Session could not be confirmed.');
      await prepareCsrf();
      if (signal?.aborted) return null;
      setUser(current);
      setStatus('authenticated');
      return current;
    } catch (error) {
      if (signal?.aborted) return null;
      setUser(null);
      if (error.response?.status === 401) { setStatus('anonymous'); return null; }
      setStatus('error');
      throw error;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshSession(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [refreshSession]);

  async function signOut() {
    await prepareCsrf();
    await logoutAccount();
    delete api.defaults.headers.common['X-CSRF-Token'];
    setUser(null);
    setStatus('anonymous');
  }

  return <SessionContext.Provider value={{ user, status, refreshSession, signOut }}>{children}</SessionContext.Provider>;
}

function useSession() { return useContext(SessionContext); }

export { SessionProvider, useSession };
