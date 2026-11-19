import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { getSafetyError } from '../services/safety.service.js';
import Icon from '../components/Icon.jsx';

const LocationMap = lazy(() => import('../components/LocationMap.jsx'));

function SharedAlert() {
  const { sosId } = useParams();
  const [alert, setAlert] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      if (document.hidden) { setAlert(null); return; }
      try { const response = await api.get('/sos/' + sosId + '/shared', { signal: controller.signal }); if (!controller.signal.aborted && !document.hidden) { setAlert(response.data.data.alert); setMessage(''); } }
      catch (error) { if (!controller.signal.aborted) { setAlert(null); setMessage([404, 410].includes(error.response?.status) ? 'This alert has ended, expired, or is not shared with this account.' : getSafetyError(error)); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    refresh();
    const interval = setInterval(refresh, 15000);
    document.addEventListener('visibilitychange', refresh);
    return () => { controller.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  }, [sosId]);
  const stale = alert && Date.now() - new Date(alert.locationUpdatedAt).getTime() > 2 * 60 * 1000;
  return <div className="page-content"><Link className="back-link" to="/dashboard">Back to safety home</Link><div className="page-heading"><div><p className="eyebrow">SHARED WITH YOU</p><h1>{alert ? alert.ownerName + ' needs support.' : 'A private SOS alert.'}</h1><p>This is a last shared location, not live background tracking.</p></div><a className="button button-danger" href="tel:112"><Icon name="phone" size={18} />Call 112</a></div>{loading ? <div className="card empty-state" role="status"><span className="loading-ring" /><p>Checking your access…</p></div> : alert ? <section className="card shared-location"><div className="section-heading"><h2>Last shared location</h2><span className={'badge ' + (stale ? 'badge-amber' : 'badge-teal')}>{stale ? 'Location may be stale' : 'Recently updated'}</span></div><Suspense fallback={<div className="map-placeholder">Loading map…</div>}><LocationMap latitude={alert.latitude} longitude={alert.longitude} accuracy={alert.accuracy} label={alert.ownerName + ' — last shared location'} /></Suspense><div className="location-meta"><span><Icon name="clock" size={16} />Updated {new Date(alert.locationUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span>Approx. accuracy: {Math.round(alert.accuracy || 0)} m</span><span>Access expires at {new Date(alert.sharingExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div><p className="privacy-note">Call or message your contact directly to check on them. Access is checked every 15 seconds while this page is visible.</p></section> : <section className="card empty-state"><span className="large-icon"><Icon name="lock" size={30} /></span><h2>Location unavailable</h2><p role="status">{message}</p><p>Use the same account you used to accept your contact invitation.</p></section>}</div>;
}

export default SharedAlert;
