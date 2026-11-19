import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import Icon from './Icon.jsx';

function IncomingAlerts() {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function refresh() {
      if (document.hidden || pending) return;
      pending = true;
      try { const response = await api.get('/sos/shared', { signal: controller.signal }); if (!controller.signal.aborted && !document.hidden) setAlerts(response.data.data.alerts); }
      catch { if (!controller.signal.aborted) setAlerts([]); }
      finally { pending = false; }
    }
    refresh();
    const timer = setInterval(refresh, 10000);
    document.addEventListener('visibilitychange', refresh);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return alerts.length ? <aside className="incoming-alerts" aria-label="Incoming SOS alerts" aria-live="polite">{alerts.slice(0, 3).map(alert => <Link key={alert.id} to={'/alerts/' + alert.id}><Icon name="bell" size={18} /><span><strong>{alert.ownerName} needs support.</strong> Open their private SOS.</span><Icon name="arrow" size={18} /></Link>)}</aside> : null;
}

export default IncomingAlerts;
