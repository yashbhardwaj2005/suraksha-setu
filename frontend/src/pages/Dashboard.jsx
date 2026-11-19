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
  const action = useRef(false);
  const mounted = useRef(true);

  async function load(signal) {
    try {
      const data = await getSafetyOverview(signal);
      if (signal?.aborted || !mounted.current) return;
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
    let requested = false;
    try {
      const location = await getCurrentLocation();
      if (!mounted.current) return;
      if (document.hidden) { setMessage('SOS was not started because you left the page. Return here to retry.'); return; }
      setBusy('create'); requested = true;
      const response = await api.post('/sos', location);
      if (mounted.current) { setActiveSOS(response.data.data.sos); setMessage('Your SOS is active. Choose a contact below, open SMS or WhatsApp, and tap Send.'); }
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
    try { await api.patch('/sos/' + activeSOS._id + '/cancel'); setActiveSOS(null); setConfirmEnd(false); setMessage('SOS ended. Your shared location is no longer accessible.'); }
    catch (error) { setMessage(getSafetyError(error)); }
    finally { action.current = false; setBusy(''); }
  }

  const connected = contacts.filter(contact => contact.consentStatus === 'CONSENTED');
  const recipients = connected.filter(contact => activeSOS?.recipientIds?.includes(contact.recipientId));
  const sharingExpired = activeSOS?.sharingExpiresAt && new Date(activeSOS.sharingExpiresAt) <= new Date();
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
  return <div className="page-content dashboard-page"><div className="page-heading"><div><p className="eyebrow">YOUR SAFETY, SIMPLIFIED</p><h1>{greeting}, {user.name.split(' ')[0]}<span className="heading-dot">.</span></h1><p>A little peace of mind. Your people are within reach.</p></div><span className="date-label">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
    {message && <p className="notice" role="status">{message}</p>}
    <div className="dashboard-grid"><section className={'card sos-card ' + (activeSOS ? 'sos-is-active' : '')}><div className="sos-heading"><span className={'badge ' + (activeSOS ? 'badge-red' : '')}><Icon name={activeSOS ? 'bell' : 'shield'} size={14} />{activeSOS ? 'SOS ACTIVE' : 'HERE WHEN YOU NEED IT'}</span><span className="sos-private"><Icon name="lock" size={14} />Private</span></div><h2>{activeSOS ? 'Your alert is active.' : 'Feeling unsafe?'}</h2><p>{activeSOS ? 'Send the prepared message to your connected contacts below.' : 'Start an SOS and share your last location with your trusted circle.'}</p>
      <div className="sos-control">{activeSOS ? <div className="sos-orb active-orb" role="status"><Icon name="bell" size={37} /><strong>SOS</strong><small>Alert active</small></div> : <button className={'sos-orb ' + (countdown !== null ? 'counting' : '')} onClick={() => countdown !== null ? setCountdown(null) : setCountdown(5)} disabled={Boolean(busy) || loading} aria-label={countdown !== null ? 'Cancel SOS countdown' : 'Start SOS with a five-second cancellation countdown'}>{busy ? <><span className="loading-ring light" /><small>{busy === 'location' ? 'Getting location…' : 'Creating alert…'}</small></> : countdown !== null ? <><strong aria-live="polite">{countdown}</strong><small>Tap to cancel</small></> : <><strong>SOS</strong><small>Tap when you need help</small></>}</button>}</div>
      {activeSOS ? <div className="sos-end-controls">{confirmEnd ? <div className="end-confirm"><strong>End this SOS and close location access?</strong><div className="button-row"><button className="button button-danger" disabled={Boolean(busy)} onClick={endSOS}>{busy === 'end' ? 'Ending…' : 'Yes, end SOS'}</button><button className="text-button" onClick={() => setConfirmEnd(false)}>Keep active</button></div></div> : <button className="button button-secondary" disabled={Boolean(busy)} onClick={() => setConfirmEnd(true)}>I’m safe — end SOS</button>}</div> : <p className="sos-caption"><Icon name="clock" size={15} />5-second countdown · Cancel anytime before it starts</p>}<div className="sos-footnote"><Icon name="info" size={17} /><p>Messages open on your phone. You must tap Send. SOS does not automatically call police.</p></div></section>
      <div className="dashboard-side"><section className="card circle-card"><div className="section-heading"><h2>Your trusted circle</h2><Link to="/contacts" className="text-link">Manage</Link></div>{loading ? <div className="compact-empty" role="status">Loading your contacts…</div> : contacts.length ? <><div className="mini-contact-list">{contacts.slice(0, 3).map((contact, index) => <div className="mini-contact" key={contact._id}><span className={'avatar avatar-' + index % 3}>{contact.name.slice(0, 1).toUpperCase()}</span><div><strong>{contact.name}</strong><span>{contact.relationship}</span></div><span className={'contact-status ' + (contact.consentStatus === 'CONSENTED' ? 'is-connected' : '')}>{contact.consentStatus === 'CONSENTED' ? 'Connected' : 'Invite needed'}</span></div>)}</div><div className="circle-summary"><Icon name="people" size={16} /><span>{connected.length} connected · {5 - contacts.length} spaces available</span></div>{connected.length === 0 && <p className="field-hint">Ask a contact to accept their invitation before sharing an SOS link.</p>}</> : <div className="compact-empty"><span className="empty-illustration"><Icon name="people" size={30} /></span><h3>Who’s in your corner?</h3><p>Add a trusted person before you need help.</p><Link className="button button-secondary" to="/contacts"><Icon name="plus" size={17} />Add your first contact</Link></div>}</section><section className="emergency-card"><span className="icon-box red-icon"><Icon name="phone" size={22} /></span><div><h2>Immediate danger?</h2><p>Don’t wait for a message.<br />Call emergency services.</p></div><a className="button button-danger" href="tel:112">Call 112</a></section></div>
    </div>
    {activeSOS && <section className="card alert-share-panel"><div className="section-heading"><div><p className="eyebrow">NEXT: SEND YOUR MESSAGE</p><h2>Let your people know.</h2></div><span className="badge badge-amber">Delivery not confirmed</span></div><p>Opening a message does not send it. Check the recipient and confirm Send in your messaging app.</p>{recipients.length && !sharingExpired ? <div className="share-contact-grid">{recipients.map(contact => <article className="share-contact" key={contact._id}><div className="contact-top"><span className="avatar">{contact.name.slice(0, 1).toUpperCase()}</span><div><h3>{contact.name}</h3><p>{contact.relationship}</p></div><a className="icon-button" aria-label={'Call ' + contact.name} href={'tel:' + contact.phone}><Icon name="phone" size={18} /></a></div><MessageActions phone={contact.phone} message={createAlertMessage(user.name, activeSOS._id, window.location.origin)} /></article>)}</div> : <div className="notice notice-warning"><p>{sharingExpired ? 'The sharing window expired. Update your location to renew it.' : 'No connected contacts were available when this SOS started. End this alert, connect a contact, then start a new SOS to include them.'} <Link to="/contacts">Manage contacts</Link></p></div>}<div className="owner-location"><div className="section-heading"><div><h3>Your last shared location</h3><p>{activeSOS.locationUpdatedAt ? 'Updated at ' + new Date(activeSOS.locationUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Location from an earlier alert'}. No background tracking.</p></div><button className="button button-secondary button-small" onClick={updateLocation} disabled={Boolean(busy)}><Icon name="refresh" size={16} />{busy === 'update' ? 'Updating…' : 'Update my location'}</button></div>{Number.isFinite(activeSOS.latitude) && <Suspense fallback={<div className="map-placeholder">Loading your private map…</div>}><LocationMap latitude={activeSOS.latitude} longitude={activeSOS.longitude} accuracy={activeSOS.accuracy} /></Suspense>}<p className="field-hint">Location links expire after one hour. Updating your location renews access; ending the SOS closes it.</p></div></section>}
    {shared.length > 0 && <section className="shared-with-you"><div className="section-heading"><div><p className="eyebrow">BE THERE FOR YOUR PEOPLE</p><h2>Shared with you</h2></div></div><div className="shared-alert-grid">{shared.map(alert => <Link className="card shared-alert-card" to={'/alerts/' + alert.id} key={alert.id}><span className="icon-box red-icon"><Icon name="bell" /></span><div><h3>{alert.ownerName} has an active SOS</h3><p>Open their private location and check in.</p></div><span className="text-link">View alert</span></Link>)}</div></section>}
    {!activeSOS && <div className="reassurance-row"><div><Icon name="location" size={19} /><span><strong>Location only when needed</strong><small>Asked for when you start an SOS</small></span></div><div><Icon name="message" size={19} /><span><strong>You choose when to send</strong><small>SMS or WhatsApp, from your phone</small></span></div><div><Icon name="lock" size={19} /><span><strong>Private by default</strong><small>Only connected contacts can view</small></span></div></div>}
  </div>;
}

export default Dashboard;
