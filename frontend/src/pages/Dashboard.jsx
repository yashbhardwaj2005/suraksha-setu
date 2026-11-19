import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { getSafetyOverview, getSafetyError, getCurrentLocation } from '../services/safety.service.js';
import { useSession } from '../context/SessionContext.jsx';
import { createAlertMessage } from '../utils/sharing.js';
import Icon from '../components/Icon.jsx';
import MessageActions from '../components/MessageActions.jsx';

const LocationMap = lazy(() => import('../components/LocationMap.jsx'));

function Dashboard() {
  const { user } = useSession();
  const [contacts, setContacts] = useState([]);
  const [activeSOS, setActiveSOS] = useState(null);
  const [shared, setShared] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [requestCommunity, setRequestCommunity] = useState(true);
  const action = useRef(false);
  const version = useRef(0);
  const mounted = useRef(true);

  async function load(signal) {
    const current = version.current;
    try {
      const data = await getSafetyOverview(signal);
      if (signal?.aborted || !mounted.current || current !== version.current) return;
      setContacts(data.contacts); setActiveSOS(data.sos); setShared(data.shared);
    } catch (error) { if (!signal?.aborted && mounted.current) setMessage(getSafetyError(error)); }
    finally { if (!signal?.aborted && mounted.current) setLoading(false); }
  }
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    load(controller.signal);
    function onVisible() { if (!document.hidden) load(controller.signal); }
    document.addEventListener('visibilitychange', onVisible);
    return () => { mounted.current = false; controller.abort(); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function poll() {
      if (document.hidden || action.current || pending) return;
      const current = version.current; pending = true;
      try {
        const [own, incoming] = await Promise.all([api.get('/sos/active', { signal: controller.signal }), api.get('/sos/shared', { signal: controller.signal })]);
        if (!controller.signal.aborted && current === version.current && !document.hidden) { setActiveSOS(own.data.data.sos); setShared(incoming.data.data.alerts); }
      } catch (error) { if (!controller.signal.aborted) setMessage(getSafetyError(error)); }
      finally { pending = false; }
    }
    const timer = setInterval(poll, 5000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);
  useEffect(() => {
    const id = activeSOS?._id;
    if (!id) return;
    let stopped = false;
    let updating = false;
    async function savePoint() {
      if (document.hidden || action.current || updating) return;
      updating = true;
      try {
        const point = await getCurrentLocation();
        if (stopped || document.hidden) return;
        const response = await api.patch('/sos/' + id + '/location', point);
        if (!stopped && mounted.current) setActiveSOS(current => current?._id === id ? { ...current, ...response.data.data.sos } : current);
      } catch (error) { if (!stopped) setMessage('Your SOS remains active, but location did not update. ' + (error.response ? getSafetyError(error) : error.message)); }
      finally { updating = false; }
    }
    const timer = setInterval(savePoint, 20000);
    function onVisible() { if (!document.hidden) savePoint(); }
    document.addEventListener('visibilitychange', onVisible);
    return () => { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [activeSOS?._id]);
  useEffect(() => {
    if (countdown === null) return;
    function cancelWhenHidden() { if (document.hidden) { setCountdown(null); setMessage('Countdown cancelled because you left this page.'); } }
    document.addEventListener('visibilitychange', cancelWhenHidden);
    if (countdown === 0) { setCountdown(null); activateSOS(); }
    const timer = countdown > 0 ? setTimeout(() => setCountdown(value => value === null ? null : value - 1), 1000) : null;
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', cancelWhenHidden); };
  }, [countdown]);

  async function activateSOS() {
    if (action.current) return;
    action.current = true; setBusy('location'); setMessage('');
    version.current += 1;
    let requested = false;
    try {
      const location = await getCurrentLocation();
      if (!mounted.current) return;
      if (document.hidden) { setMessage('SOS was not started because you left the page. Return here to retry.'); return; }
      setBusy('create'); requested = true;
      const response = await api.post('/sos', { ...location, requestCommunity });
      if (mounted.current) { setActiveSOS(response.data.data.sos); setMessage('Your SOS is active. Connected contacts can see it automatically. Nearby approved volunteers can receive your community request when enabled. Push alerts depend on recipient notification settings.'); }
    } catch (error) {
      if (mounted.current) {
        setMessage(requested && !error.response ? 'The request was not confirmed. Checking for an active SOS before you retry. Call 112 if you need urgent help.' : error.response ? getSafetyError(error) : error.message);
        if (requested) await load();
      }
    } finally { action.current = false; if (mounted.current) setBusy(''); }
  }

  async function updateLocation() {
    if (action.current) return;
    action.current = true; setBusy('update'); setMessage('');
    try {
      const point = await getCurrentLocation();
      const response = await api.patch('/sos/' + activeSOS._id + '/location', point);
      setActiveSOS(response.data.data.sos); setMessage('Your latest location is updated. Your connected contacts can open the same alert link.');
    } catch (error) { setMessage(error.response ? getSafetyError(error) : error.message); }
    finally { action.current = false; setBusy(''); }
  }

  async function endSOS() {
    if (action.current) return;
    action.current = true; setBusy('end');
    version.current += 1;
    try { await api.patch('/sos/' + activeSOS._id + '/cancel'); setActiveSOS(null); setConfirmEnd(false); setMessage('SOS ended. Your shared location is no longer accessible.'); }
    catch (error) { setMessage(getSafetyError(error)); }
    finally { action.current = false; setBusy(''); }
  }

  async function toggleCommunity() {
    setBusy('community'); action.current = true; version.current += 1;
    try { const response = await api.patch('/sos/' + activeSOS._id + '/community', { enabled: !activeSOS.communityRequested }); setActiveSOS(response.data.data.sos); setMessage(response.data.data.sos.communityRequested ? 'Nearby responder matching is enabled.' : 'Community sharing ended. Volunteer location access is revoked.'); }
    catch (error) { setMessage(getSafetyError(error)); }
    finally { setBusy(''); action.current = false; }
  }

  const connected = contacts.filter(contact => contact.consentStatus === 'CONSENTED');
  const recipients = connected.filter(contact => activeSOS?.recipientIds?.includes(contact.recipientId));
  const sharingExpired = activeSOS?.sharingExpiresAt && new Date(activeSOS.sharingExpiresAt) <= new Date();
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
  return <div className="page-content dashboard-page"><div className="page-heading"><div><p className="eyebrow">YOUR SAFETY, SIMPLIFIED</p><h1>{greeting}, {user.name.split(' ')[0]}<span className="heading-dot">.</span></h1><p>A little peace of mind. Your people are within reach.</p></div><span className="date-label">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
    {message && <p className="notice" role="status">{message}</p>}
    <div className="dashboard-grid"><section className={'card sos-card ' + (activeSOS ? 'sos-is-active' : '')}><div className="sos-heading"><span className={'badge ' + (activeSOS ? 'badge-red' : '')}><Icon name={activeSOS ? 'bell' : 'shield'} size={14} />{activeSOS ? 'SOS ACTIVE' : 'HERE WHEN YOU NEED IT'}</span><span className="sos-private"><Icon name="lock" size={14} />Private</span></div><h2>{activeSOS ? 'Your alert is active.' : 'Feeling unsafe?'}</h2><p>{activeSOS ? 'Connected contacts can see your alert. Nearby responders can help when community sharing is enabled.' : 'Alert your connected contacts and request help from approved volunteers nearby.'}</p>
      {!activeSOS && <label className="community-options"><input type="checkbox" checked={requestCommunity} disabled={Boolean(busy) || countdown !== null} onChange={event => setRequestCommunity(event.target.checked)} /><span>Also request nearby volunteer help<small>Within 5 km. Only the responder who accepts can view your exact location.</small></span></label>}<div className="sos-control">{activeSOS ? <div className="sos-orb active-orb" role="status"><Icon name="bell" size={37} /><strong>SOS</strong><small>Alert active</small></div> : <button className={'sos-orb ' + (countdown !== null ? 'counting' : '')} onClick={() => countdown !== null ? setCountdown(null) : setCountdown(5)} disabled={Boolean(busy) || loading} aria-label={countdown !== null ? 'Cancel SOS countdown' : 'Start SOS with a five-second cancellation countdown'}>{busy ? <><span className="loading-ring light" /><small>{busy === 'location' ? 'Getting location…' : 'Creating alert…'}</small></> : countdown !== null ? <><strong aria-live="polite">{countdown}</strong><small>Tap to cancel</small></> : <><strong>SOS</strong><small>Tap when you need help</small></>}</button>}</div>
      {activeSOS ? <div className="sos-end-controls">{confirmEnd ? <div className="end-confirm"><strong>End this SOS and close location access?</strong><div className="button-row"><button className="button button-danger" disabled={Boolean(busy)} onClick={endSOS}>{busy === 'end' ? 'Ending…' : 'Yes, end SOS'}</button><button className="text-button" onClick={() => setConfirmEnd(false)}>Keep active</button></div></div> : <button className="button button-secondary" disabled={Boolean(busy)} onClick={() => setConfirmEnd(true)}>I’m safe — end SOS</button>}</div> : <p className="sos-caption"><Icon name="clock" size={15} />5-second countdown · Cancel anytime before it starts</p>}<div className="sos-footnote"><Icon name="info" size={17} /><p>In-app alerts are automatic. Push needs contacts to enable notifications. SOS does not call police.</p></div></section>
      <div className="dashboard-side"><section className="card circle-card"><div className="section-heading"><h2>Your trusted circle</h2><Link to="/contacts" className="text-link">Manage</Link></div>{loading ? <div className="compact-empty" role="status">Loading your contacts…</div> : contacts.length ? <><div className="mini-contact-list">{contacts.slice(0, 3).map((contact, index) => <div className="mini-contact" key={contact._id}><span className={'avatar avatar-' + index % 3}>{contact.name.slice(0, 1).toUpperCase()}</span><div><strong>{contact.name}</strong><span>{contact.relationship}</span></div><span className={'contact-status ' + (contact.consentStatus === 'CONSENTED' ? 'is-connected' : '')}>{contact.consentStatus === 'CONSENTED' ? 'Connected' : 'Invite needed'}</span></div>)}</div><div className="circle-summary"><Icon name="people" size={16} /><span>{connected.length} connected · {5 - contacts.length} spaces available</span></div>{connected.length === 0 && <p className="field-hint">Ask a contact to accept their invitation before sharing an SOS link.</p>}</> : <div className="compact-empty"><span className="empty-illustration"><Icon name="people" size={30} /></span><h3>Who’s in your corner?</h3><p>Add a trusted person before you need help.</p><Link className="button button-secondary" to="/contacts"><Icon name="plus" size={17} />Add your first contact</Link></div>}</section><section className="emergency-card"><span className="icon-box red-icon"><Icon name="phone" size={22} /></span><div><h2>Immediate danger?</h2><p>Don’t wait for a message.<br />Call emergency services.</p></div><a className="button button-danger" href="tel:112">Call 112</a></section></div>
    </div>
    {activeSOS && <section className="card community-status"><div className="section-heading"><div><p className="eyebrow">NEARBY RESPONDERS</p><h2>{!activeSOS.communityRequested ? 'Community help is off.' : activeSOS.responder?.online ? activeSOS.responder.name + (activeSOS.status === 'RESPONDING' ? ' is on their way.' : ' accepted your request.') : 'Your nearby help request is open.'}</h2></div><span className={'badge ' + (activeSOS.responder?.online ? 'badge-teal' : 'badge-amber')}>{activeSOS.responder?.online ? 'Responder connected' : 'No responder confirmed'}</span></div><p>{activeSOS.communityRequested ? 'Available, approved volunteers within 5 km can see your request. Only one can accept and open your exact location. Acceptance does not guarantee arrival; call 112 if you need urgent help.' : 'Your connected contacts still have access. Enable community help to include nearby approved volunteers.'}</p>{activeSOS.assignedVolunteerId && !activeSOS.responder?.online && <p className="notice notice-warning">The previous responder is disconnected or their availability expired. Do not assume they are coming.</p>}{activeSOS.accuracy > 1000 && <p className="notice notice-warning">GPS accuracy is too low for nearby matching. Try updating your location in an open area.</p>}<p className="field-hint">Automatic push: {activeSOS.notifications?.accepted || 0} accepted by push services, {activeSOS.notifications?.failed || 0} failed. Provider acceptance does not confirm that someone saw the alert. In-app requests remain available.</p><button className="button button-secondary" disabled={Boolean(busy)} onClick={toggleCommunity}>{activeSOS.communityRequested ? 'Stop community sharing' : 'Request nearby help'}</button></section>}
    {activeSOS && <section className="card alert-share-panel"><div className="section-heading"><div><p className="eyebrow">EXTRA WAYS TO REACH YOUR CONTACTS</p><h2>Call or message directly, too.</h2></div><span className="badge badge-amber">Delivery not confirmed</span></div><p>Your in-app SOS is already shared. These optional SMS and WhatsApp drafts still require you to confirm Send; they are separate from automatic app notifications.</p>{recipients.length && !sharingExpired ? <div className="share-contact-grid">{recipients.map(contact => <article className="share-contact" key={contact._id}><div className="contact-top"><span className="avatar">{contact.name.slice(0, 1).toUpperCase()}</span><div><h3>{contact.name}</h3><p>{contact.relationship}</p></div><a className="icon-button" aria-label={'Call ' + contact.name} href={'tel:' + contact.phone}><Icon name="phone" size={18} /></a></div><MessageActions phone={contact.phone} message={createAlertMessage(user.name, activeSOS._id, window.location.origin)} /></article>)}</div> : <div className="notice notice-warning"><p>{sharingExpired ? 'The sharing window expired. Update your location to renew it.' : 'No connected contacts were available when this SOS started. End this alert, connect a contact, then start a new SOS to include them.'} <Link to="/contacts">Manage contacts</Link></p></div>}<div className="owner-location"><div className="section-heading"><div><h3>Your last shared location</h3><p>{activeSOS.locationUpdatedAt ? 'Updated at ' + new Date(activeSOS.locationUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Location from an earlier alert'}. Updates every 20 seconds while this screen is open.</p></div><button className="button button-secondary button-small" onClick={updateLocation} disabled={Boolean(busy)}><Icon name="refresh" size={16} />{busy === 'update' ? 'Updating…' : 'Update my location'}</button></div>{Number.isFinite(activeSOS.latitude) && <Suspense fallback={<div className="map-placeholder">Loading your private map…</div>}><LocationMap latitude={activeSOS.latitude} longitude={activeSOS.longitude} accuracy={activeSOS.accuracy} /></Suspense>}<p className="field-hint">Location links expire after one hour. Updating your location renews access; ending the SOS closes it.</p></div></section>}
    {shared.length > 0 && <section className="shared-with-you"><div className="section-heading"><div><p className="eyebrow">BE THERE FOR YOUR PEOPLE</p><h2>Shared with you</h2></div></div><div className="shared-alert-grid">{shared.map(alert => <Link className="card shared-alert-card" to={'/alerts/' + alert.id} key={alert.id}><span className="icon-box red-icon"><Icon name="bell" /></span><div><h3>{alert.ownerName} has an active SOS</h3><p>Open their private location and check in.</p></div><span className="text-link">View alert</span></Link>)}</div></section>}
    <section className="card community-callout"><span className="icon-box"><Icon name="heart" size={25} /></span><div><p className="eyebrow">COMMUNITY SUPPORT</p><h2>One community. Here for each other.</h2><p>Switch to volunteer mode when you can help. Approved, available volunteers receive nearby requests automatically.</p></div><Link className="button button-secondary" to="/volunteer">Community responders</Link></section>
    {!activeSOS && <div className="reassurance-row"><div><Icon name="location" size={19} /><span><strong>Location only when needed</strong><small>Asked for when you start an SOS</small></span></div><div><Icon name="message" size={19} /><span><strong>Automatic app alerts</strong><small>Optional SMS and WhatsApp backup</small></span></div><div><Icon name="lock" size={19} /><span><strong>Private by default</strong><small>Connected contacts and your accepted responder</small></span></div></div>}
  </div>;
}

export default Dashboard;
