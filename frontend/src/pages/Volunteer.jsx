import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { api } from '../services/api.js';
import { getCurrentLocation, getSafetyError } from '../services/safety.service.js';
import Icon from '../components/Icon.jsx';
import NotificationSettings from '../components/NotificationSettings.jsx';

const LocationMap = lazy(() => import('../components/LocationMap.jsx'));

function Volunteer() {
  const { user, refreshSession } = useSession();
  const [available, setAvailable] = useState(false);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState([]);
  const [assignment, setAssignment] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const session = useRef(null);
  const run = useRef(0);
  const updateBusy = useRef(false);
  const mounted = useRef(true);

  function stop() {
    run.current += 1;
    const old = session.current; session.current = null;
    if (mounted.current) { setAvailable(false); setStarting(false); setRequests([]); setAssignment(null); }
    if (old) {
      // Keepalive lets a best-effort offline update finish when this page closes.
      fetch(api.defaults.baseURL + '/sos/volunteer/presence', { method: 'PATCH', credentials: 'include', keepalive: true, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': api.defaults.headers.common['X-CSRF-Token'] || '' }, body: JSON.stringify({ available: false, sessionId: old }) }).catch(() => {});
    }
  }

  useEffect(() => {
    mounted.current = true;
    function onHidden() { if (document.hidden) { stop(); setMessage('Availability paused because you left this screen. Return and go available again.'); } }
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', stop);
    return () => { mounted.current = false; stop(); document.removeEventListener('visibilitychange', onHidden); window.removeEventListener('pagehide', stop); };
  }, []);
  useEffect(() => { if (user.role !== 'VOLUNTEER' || user.verificationStatus !== 'APPROVED') stop(); }, [user.role, user.verificationStatus]);

  async function checkRequests(generation = run.current) {
    try {
      const [inbox, current] = await Promise.all([api.get('/sos/volunteer/requests'), api.get('/sos/volunteer/assignment')]);
      if (!mounted.current || generation !== run.current || document.hidden) return;
      setRequests(inbox.data.data.requests); setAssignment(current.data.data.alert); setCheckedAt(new Date()); setMessage('');
    } catch (error) {
      if (!mounted.current || generation !== run.current) return;
      setAssignment(null); setRequests([]); setMessage(getSafetyError(error));
      if ([401, 403].includes(error.response?.status)) stop();
    }
  }

  async function start() {
    const generation = ++run.current;
    setStarting(true); setMessage('');
    try {
      const location = await getCurrentLocation();
      if (!mounted.current || generation !== run.current || document.hidden) return;
      const response = await api.post('/sos/volunteer/presence', { ...location, available: true });
      const id = response.data.data.sessionId;
      if (!mounted.current || generation !== run.current || document.hidden) { await api.patch('/sos/volunteer/presence', { available: false, sessionId: id }); return; }
      session.current = id; setAvailable(true); setLastUpdate(new Date()); await checkRequests(generation);
    } catch (error) { if (mounted.current && generation === run.current) setMessage(error.response ? getSafetyError(error) : error.message); }
    finally { if (mounted.current && generation === run.current) setStarting(false); }
  }

  useEffect(() => {
    if (!available) return;
    const generation = run.current;
    async function heartbeat() {
      if (updateBusy.current || document.hidden || !session.current) return;
      updateBusy.current = true;
      try {
        const point = await getCurrentLocation();
        if (generation !== run.current || document.hidden) return;
        await api.patch('/sos/volunteer/presence', { ...point, available: true, sessionId: session.current });
        if (mounted.current && generation === run.current) { setLastUpdate(new Date()); await checkRequests(generation); }
      } catch (error) {
        if (mounted.current && generation === run.current) { stop(); setMessage(error.response ? getSafetyError(error) : error.message || 'Location update failed. Go available again when connected.'); }
      } finally { updateBusy.current = false; }
    }
    const locationTimer = setInterval(heartbeat, 20000);
    const inboxTimer = setInterval(() => checkRequests(generation), 5000);
    return () => { clearInterval(locationTimer); clearInterval(inboxTimer); };
  }, [available]);

  async function switchToVolunteer() {
    setBusy('mode');
    try { await api.patch('/auth/mode', { role: 'VOLUNTEER' }); await refreshSession(); }
    catch (error) { setMessage(getSafetyError(error)); }
    finally { setBusy(''); }
  }

  async function act(id, action) {
    setBusy(action + id); setMessage('');
    try {
      await api.patch('/sos/' + id + '/' + action);
      setConfirmRelease(false); await checkRequests();
    } catch (error) { setMessage(getSafetyError(error)); setAssignment(null); }
    finally { setBusy(''); }
  }

  const approved = user.verificationStatus === 'APPROVED';
  return <div className="page-content"><div className="page-heading"><div><p className="eyebrow">COMMUNITY RESPONDERS</p><h1>Be nearby. Be there.</h1><p>Help someone within 5 km when you are available and able to respond safely.</p></div><Link className="button button-secondary" to="/dashboard">I need help</Link></div>{message && <p className="notice" role="status">{message}</p>}
    {user.role === 'ADMIN' ? <section className="card empty-state"><h2>Review your community</h2><p>Approve volunteer applications from My account. Administrators do not receive private SOS locations.</p><Link className="button button-primary" to="/account">Review applications</Link></section> : user.role !== 'VOLUNTEER' ? <section className="card empty-state"><span className="icon-box"><Icon name="heart" /></span><h2>One account. Two ways to take part.</h2><p>Switch to volunteer mode when you can help. Your contacts and approval stay with your account.</p><button className="button button-primary" onClick={switchToVolunteer} disabled={Boolean(busy)}>Switch to volunteer mode</button></section> : !approved ? <section className="card empty-state"><span className="icon-box"><Icon name="shield" /></span><h2>{user.verificationStatus === 'PENDING' ? 'Your application is under review.' : 'Get approved before responding.'}</h2><p>Volunteer access needs administrator approval. You can still use SOS for yourself.</p><Link className="button button-primary" to="/account">{user.verificationStatus === 'PENDING' ? 'View volunteer status' : 'Request volunteer approval'}</Link></section> : <>
      <section className="card availability-card"><div><span className={'badge ' + (available ? 'badge-teal' : '')}><Icon name="wifi" size={15} />{available ? 'AVAILABLE NEARBY' : 'OFFLINE'}</span><h2>{available ? 'Your community can reach you.' : 'Ready to lend a hand?'}</h2><p>Keep this screen open and allow location. Your GPS is updated every 20 seconds; without a fresh update, availability expires within 90 seconds.</p>{lastUpdate && available && <p className="field-hint" role="status">Location saved at {lastUpdate.toLocaleTimeString()}. Leaving this screen pauses availability.</p>}</div><button className={'button ' + (available ? 'button-secondary' : 'button-primary')} disabled={starting || Boolean(busy)} onClick={available ? stop : start}>{starting ? 'Getting your location...' : available ? 'Go offline' : 'Go available'}</button></section>
      {assignment && available ? <section className="card responder-assignment"><div className="section-heading"><div><p className="eyebrow">YOUR ACCEPTED REQUEST</p><h2>{assignment.ownerName} needs support.</h2></div><span className="badge badge-teal">{assignment.status === 'RESPONDING' ? 'On your way' : 'Accepted by you'}</span></div><p>This location is private. Respond only if it is safe; call 112 when emergency services are needed.</p><Suspense fallback={<div className="map-placeholder">Loading private map...</div>}><LocationMap latitude={assignment.latitude} longitude={assignment.longitude} accuracy={assignment.accuracy} label="Last shared SOS location" /></Suspense><p className="field-hint">Last updated {new Date(assignment.locationUpdatedAt).toLocaleTimeString()}{Date.now() - new Date(assignment.locationUpdatedAt).getTime() > 120000 ? ' - location may be stale.' : '.'} Accuracy: {Math.round(assignment.accuracy || 0)} m. Access ends if this assignment expires or the owner ends sharing.</p><div className="button-row">{assignment.status === 'ACCEPTED' && <button className="button button-primary" disabled={Boolean(busy)} onClick={() => act(assignment.id, 'respond')}>I am on my way</button>}<a href="tel:112" className="button button-danger">Call 112</a><button className="text-button" onClick={() => setConfirmRelease(true)} disabled={Boolean(busy)}>I cannot respond</button></div>{confirmRelease && <div className="notice"><p>Release this request so another nearby volunteer can accept?</p><div className="button-row"><button className="button button-secondary" disabled={Boolean(busy)} onClick={() => act(assignment.id, 'release')}>Release request</button><button className="text-button" onClick={() => setConfirmRelease(false)}>Keep helping</button></div></div>}</section> : <section className="card nearby-requests"><div className="section-heading"><div><p className="eyebrow">YOUR AREA</p><h2>Nearby requests</h2></div>{available && <button className="text-button" onClick={() => checkRequests()} disabled={Boolean(busy)}>Refresh</button>}</div>{available && checkedAt && <p className="field-hint">Checked {checkedAt.toLocaleTimeString()} - refreshes every 5 seconds.</p>}{available && requests.length ? <ul className="request-list">{requests.map(request => <li key={request.id}><span className="icon-box red-icon"><Icon name="bell" /></span><div><h3>Someone nearby needs help</h3><p>About {(request.distanceMeters / 1000).toFixed(1)} km away - {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p><span className="field-hint">Exact location unlocks only if you accept.</span></div><button className="button button-primary" disabled={Boolean(busy)} onClick={() => act(request.id, 'accept')}>Accept request</button></li>)}</ul> : <div className="compact-empty"><Icon name="heart" size={30} /><h3>{available ? 'No requests nearby right now.' : 'Go available to receive requests.'}</h3><p>{available ? 'New requests appear automatically. Stay here while you can help.' : 'Only approved, available volunteers with a fresh location can receive SOS requests.'}</p></div>}</section>}
    </>}
    <NotificationSettings />
  </div>;
}

export default Volunteer;
