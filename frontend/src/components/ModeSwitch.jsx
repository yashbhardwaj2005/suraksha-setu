import { useState } from 'react';
import { useSession } from '../context/SessionContext.jsx';
import { api } from '../services/api.js';
import { getSafetyError } from '../services/safety.service.js';

function ModeSwitch() {
  const { user, refreshSession } = useSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function change(role) {
    if (role === user.role) return;
    setBusy(true); setMessage('');
    try { await api.patch('/auth/mode', { role }); await refreshSession(); setMessage('Mode updated. Your contacts and approval are unchanged.'); }
    catch (error) { setMessage(getSafetyError(error)); }
    finally { setBusy(false); }
  }
  if (user.role === 'ADMIN') return null;
  return <section className="card mode-card"><p className="eyebrow">ONE ACCOUNT. TWO WAYS TO TAKE PART.</p><h2>Choose your mode.</h2><p>Use personal mode for your safety, or volunteer mode when you can help. Switching ends volunteer availability and releases any request you were helping with. SOS remains accessible in both modes.</p><div className="mode-options"><button className={'button ' + (user.role === 'USER' ? 'button-primary' : 'button-secondary')} aria-pressed={user.role === 'USER'} disabled={busy} onClick={() => change('USER')}>Personal safety</button><button className={'button ' + (user.role === 'VOLUNTEER' ? 'button-primary' : 'button-secondary')} aria-pressed={user.role === 'VOLUNTEER'} disabled={busy} onClick={() => change('VOLUNTEER')}>Volunteer</button></div>{message && <p className="notice" role="status">{message}</p>}</section>;
}

export default ModeSwitch;
