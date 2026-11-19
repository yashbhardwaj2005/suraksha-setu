import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { getSafetyError } from '../services/safety.service.js';
import { captureInvitation, clearInvitation } from '../utils/sharing.js';
import { useSession } from '../context/SessionContext.jsx';
import Icon from '../components/Icon.jsx';

function ContactInvite() {
  const { user, status } = useSession();
  const [token, setToken] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  useEffect(() => { setToken(captureInvitation()); }, []);
  useEffect(() => {
    if (!user || !token) return;
    const controller = new AbortController();
    api.post('/contacts/invitations/inspect', { token }, { signal: controller.signal }).then(response => setInvitation(response.data.data)).catch(error => { if (!controller.signal.aborted) setMessage(getSafetyError(error)); });
    return () => controller.abort();
  }, [user?.id, token]);
  async function accept() {
    setBusy(true);
    try { await api.post('/contacts/invitations/accept', { token }); clearInvitation(); setAccepted(true); }
    catch (error) { setMessage(getSafetyError(error)); }
    finally { setBusy(false); }
  }
  return <div className="page-content narrow-page"><section className="card invitation-card"><span className="large-icon"><Icon name={accepted ? 'check' : 'heart'} size={32} /></span><p className="eyebrow">A TRUSTED CONNECTION</p><h1>{accepted ? 'You’re connected.' : 'Someone is counting on you.'}</h1>{accepted ? <><p>You can now open their SOS links with this account. You can stop receiving shared alerts at any time from My account.</p><Link className="button button-primary" to="/dashboard">Open my safety home</Link></> : !token ? <p>Open the full invitation link from your message. If you refreshed after signing in, open the original link again.</p> : !user ? <><p>Sign in or create an account to view this invitation. Your account keeps shared locations private.</p><Link className="button button-primary" state={{ returnTo: '/contact-invite' }} to="/login">{status === 'loading' ? 'Checking session…' : 'Sign in to view invitation'}</Link><Link className="text-link" state={{ returnTo: '/contact-invite' }} to="/register">Create an account</Link></> : invitation ? <><p><strong>{invitation.ownerName}</strong> wants to add you to their safety circle. Accept only if you know them and agree to receive their SOS messages.</p><div className="privacy-note"><Icon name="lock" size={19} /><p>This does not share your own location. You can revoke this connection from My account.</p></div><button className="button button-primary" onClick={accept} disabled={busy}>{busy ? 'Connecting…' : 'I agree — accept invitation'}</button></> : !message ? <p role="status">Checking your invitation…</p> : null}{message && <p className="notice notice-error" role="alert">{message}</p>}</section></div>;
}

export default ContactInvite;
