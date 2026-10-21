import { useEffect, useRef, useState } from 'react';
import { checkHealth, getApiError } from '../services/api.js';

function useHealthCheck() {
  const [state, setState] = useState({ status: 'idle', checkedAt: null, error: '' });
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function run() {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setState({ status: 'loading', checkedAt: null, error: '' });
    try {
      const result = await checkHealth(request.signal);
      if (!request.signal.aborted) setState({ status: 'success', error: '', ...result });
    } catch (error) {
      if (!request.signal.aborted) setState({ status: 'error', checkedAt: null, error: getApiError(error) });
    }
  }

  return { ...state, run };
}

export default useHealthCheck;
