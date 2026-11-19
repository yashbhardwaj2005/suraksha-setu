import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { getSafetyError } from '../services/safety.service.js';
import { normalizePhone } from '../utils/sharing.js';
import { useSession } from '../context/SessionContext.jsx';
import Icon from '../components/Icon.jsx';
import MessageActions from '../components/MessageActions.jsx';

function Contacts() {
  const { user } = useSession();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState({ name: '', relationship: '', phone: '' });
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [invites, setInvites] = useState({});
  const [removing, setRemoving] = useState('');

  async function loadContacts(signal) {
    try { const response = await api.get('/contacts', { signal }); setContacts(response.data.data.contacts); }
    catch (error) { if (!signal?.aborted) setMessage(getSafetyError(error)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(() => { const controller = new AbortController(); loadContacts(controller.signal); return () => controller.abort(); }, []);

  async function addContact(event) {
    event.preventDefault();
    const phone = normalizePhone(values.phone);
    if (!phone) return setMessage('Enter a 10-digit Indian mobile number or include the international country code, such as +91.');
    setBusy('add'); setMessage('');
    try {
      await api.post('/contacts', { name: values.name.trim(), relationship: values.relationship.trim(), phone });
      setValues({ name: '', relationship: '', phone: '' });
      await loadContacts();
      setMessage('Contact saved. Send them an invite to connect their account.');
    } catch (error) { setMessage(getSafetyError(error)); }
    finally { setBusy(''); }
  }

  async function invite(contact) {
    setBusy(contact._id); setMessage('');
    try {
      const response = await api.post('/contacts/' + contact._id + '/invite');
      const url = new URL('/contact-invite', window.location.origin);
      url.hash = 'token=' + response.data.data.token;
      const text = `Hi ${contact.name}, it’s ${user.name}. I’d like you in my trusted circle on SurakshaSetu. Please sign in and accept this invite only if you agree to receive my SOS messages: ${url.href}\nThis invite expires in 24 hours.`;
      setInvites(current => ({ ...current, [contact._id]: text }));
    } catch (error) { setMessage(getSafetyError(error)); }
    finally { setBusy(''); }
  }

  async function removeContact(contact) {
    setBusy(contact._id);
    try { await api.delete('/contacts/' + contact._id); await loadContacts(); setRemoving(''); setMessage('Contact removed. Their access to your shared alerts has ended.'); }
    catch (error) { setMessage(getSafetyError(error)); }
    finally { setBusy(''); }
  }

  const connected = contacts.filter(contact => contact.consentStatus === 'CONSENTED').length;
  return <div className="page-content"><div className="page-heading"><div><p className="eyebrow">YOUR TRUSTED CIRCLE</p><h1>The people you count on.</h1><p>Connect up to five people you trust. They choose whether to accept your invitation.</p></div><span className="count-badge"><Icon name="people" size={17} />{contacts.length} / 5 contacts</span></div>
    {message && <p className="notice" role="status">{message}</p>}
    <div className="contacts-layout"><section className="card contact-form-card"><span className="icon-box"><Icon name="plus" /></span><h2>Add someone you trust</h2><p>Choose someone who knows you and can respond when you need them.</p><form onSubmit={addContact}><fieldset disabled={Boolean(busy) || contacts.length >= 5}><label htmlFor="contact-name">Their name<input id="contact-name" value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} placeholder="e.g. Aditi" minLength={2} maxLength={80} required autoComplete="off" /></label><label htmlFor="contact-relationship">Relationship<input id="contact-relationship" value={values.relationship} onChange={event => setValues({ ...values, relationship: event.target.value })} placeholder="e.g. Sister, friend, parent" maxLength={50} required /></label><label htmlFor="contact-phone">Mobile number<input id="contact-phone" type="tel" inputMode="tel" value={values.phone} onChange={event => setValues({ ...values, phone: event.target.value })} placeholder="+91 98765 43210" maxLength={22} required /><span className="field-hint">Include a country code for numbers outside India.</span></label><button className="button button-primary full-width" type="submit"><Icon name="plus" size={18} />{busy === 'add' ? 'Saving…' : 'Add trusted contact'}</button></fieldset></form><div className="privacy-note"><Icon name="lock" size={17} /><p>Saving a number does not notify anyone. Send an invitation, then wait for them to accept.</p></div></section>
      <section className="contact-list-panel"><div className="section-heading"><h2>Your contacts</h2><span>{connected} connected</span></div>{loading ? <div className="card skeleton-card" role="status">Loading your circle…</div> : contacts.length ? <div className="contact-stack">{contacts.map((contact, index) => <article className="card contact-card" key={contact._id}><div className="contact-top"><span className={'avatar avatar-' + index % 3}>{contact.name.slice(0, 1).toUpperCase()}</span><div className="contact-identity"><h3>{contact.name}</h3><span>{contact.relationship}</span></div><span className={'badge ' + (contact.consentStatus === 'CONSENTED' ? 'badge-teal' : 'badge-amber')}>{contact.consentStatus === 'CONSENTED' ? 'Connected' : contact.consentStatus === 'REVOKED' ? 'Access revoked' : 'Invite needed'}</span></div><a className="contact-phone" href={'tel:' + contact.phone}><Icon name="phone" size={15} />{contact.phone}</a><div className="contact-footer">{contact.consentStatus === 'CONSENTED' ? <span className="connected-note"><Icon name="check" size={16} />Connected for automatic in-app alerts</span> : <button className="button button-small button-secondary" onClick={() => invite(contact)} disabled={Boolean(busy)}><Icon name="message" size={16} />{busy === contact._id ? 'Preparing…' : 'Create invite'}</button>}<button className="text-button muted" onClick={() => setRemoving(contact._id)} disabled={Boolean(busy)}>Remove</button></div>{removing === contact._id && <div className="notice notice-warning"><p>Remove this contact and end their access to your location?</p><div className="button-row"><button className="button button-small button-danger" disabled={Boolean(busy)} onClick={() => removeContact(contact)}>Yes, remove</button><button className="text-button" onClick={() => setRemoving('')}>Keep contact</button></div></div>}{invites[contact._id] && <div className="invite-message"><strong>Your invitation is ready</strong><p>Choose an app and tap Send. Creating another invite replaces this one.</p><MessageActions phone={contact.phone} message={invites[contact._id]} /></div>}</article>)}</div> : <div className="card empty-state"><span className="empty-illustration"><Icon name="people" size={38} /></span><h2>Your circle starts here.</h2><p>Add your first trusted contact. A familiar person can make all the difference.</p></div>}<div className="tip-card"><Icon name="info" size={19} /><p>Ask your contacts to accept their invite and enable automatic notifications in My account. Saving their phone number alone cannot send free automatic SMS. <Link to="/dashboard">Back to safety home</Link></p></div></section>
    </div></div>;
}

export default Contacts;
