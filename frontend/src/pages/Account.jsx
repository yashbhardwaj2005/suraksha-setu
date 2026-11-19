import { useEffect, useState } from 'react';
import { useSession } from '../context/SessionContext.jsx';
import { api } from '../services/api.js';
import { getSafetyError } from '../services/safety.service.js';
import Icon from '../components/Icon.jsx';

function Account() {
  const { user, refreshSession } = useSession();
  const [connections, setConnections] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const controller = new AbortController(); api.get('/contacts/connections', { signal: controller.signal }).then(response => setConnections(response.data.data.connections)).catch(error => { if (!controller.signal.aborted) setMessage(getSafetyError(error)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, []);
  async function revoke(id) {
    setBusy(true);
    try { await api.post('/contacts/connections/' + id + '/revoke'); setConnections(connections.filter(value => value.id !== id)); setMessage('Connection revoked. You can no longer open their shared location.'); }
    catch (error) { setMessage(getSafetyError(error)); }
    finally { setBusy(false); }
  }
  async function requestVerification() {
    setBusy(true);
    try { await api.post('/auth/volunteer-verification'); await refreshSession(); setMessage('Your verification request is awaiting admin review.'); }
    catch (error) { setMessage(getSafetyError(error)); }
    finally { setBusy(false); }
  }
  return <div className="page-content"><div className="page-heading"><div><p className="eyebrow">MY ACCOUNT</p><h1>Your space. Your choices.</h1><p>Manage your identity and the connections you have accepted.</p></div></div>{message && <p className="notice" role="status">{message}</p>}<div className="account-grid"><section className="card account-profile"><span className="avatar avatar-large">{user.name.slice(0, 1).toUpperCase()}</span><h2>{user.name}</h2><p>{user.email}</p><span className="badge badge-teal">{user.role === 'VOLUNTEER' ? 'Volunteer' : user.role === 'ADMIN' ? 'Administrator' : 'Community member'}</span>{user.role === 'VOLUNTEER' && <div className="volunteer-status"><h3>Volunteer verification</h3><p>{user.verificationStatus === 'APPROVED' ? 'Your application is approved.' : user.verificationStatus === 'PENDING' ? 'An administrator is reviewing your application.' : 'Volunteer access requires administrator approval.'}</p>{['NOT_REQUESTED', 'REJECTED'].includes(user.verificationStatus) && <button className="button button-secondary" disabled={busy} onClick={requestVerification}>Request verification</button>}</div>}</section><section className="card"><div className="section-heading"><h2>People you support</h2><Icon name="heart" /></div><p>These are the people whose contact invitations you accepted.</p>{loading ? <p className="small-loading" role="status">Loading connections…</p> : connections.length ? <ul className="connection-list">{connections.map(connection => <li key={connection.id}><span className="avatar">{connection.ownerName.slice(0, 1).toUpperCase()}</span><div><strong>{connection.ownerName}</strong><span>You can receive their shared SOS alerts</span></div><button className="text-button danger-text" disabled={busy} onClick={() => revoke(connection.id)}>Revoke</button></li>)}</ul> : <div className="compact-empty"><Icon name="people" size={30} /><p>You haven’t accepted any contact invitations yet.</p></div>}<div className="privacy-note"><Icon name="lock" size={18} /><p>Revoking removes your permission to view their location, even if you still have an old SOS link.</p></div></section></div><section className="privacy-banner"><Icon name="shield" size={24} /><div><h3>Location sharing stays in your control.</h3><p>An SOS shares your last location point, not continuous background tracking. End your SOS to close access. For emergency services, call <a href="tel:112">112</a>.</p></div></section></div>;
}

export default Account;
