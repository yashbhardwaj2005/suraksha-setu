import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { getSafetyError } from '../services/safety.service.js';
import Icon from './Icon.jsx';

function VolunteerReview() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  async function load(signal) {
    setLoading(true); setMessage('');
    try {
      const response = await api.get('/auth/volunteer-applications', { signal });
      if (!signal?.aborted) setApplications(response.data.data.users);
    } catch (error) { if (!signal?.aborted) setMessage(getSafetyError(error)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, []);
  async function review(id, verificationStatus) {
    setBusy(id); setMessage('');
    try {
      await api.patch('/auth/volunteer-applications/' + id, { verificationStatus });
      setApplications(current => current.filter(person => person.id !== id));
      setMessage(verificationStatus === 'APPROVED' ? 'Volunteer approved.' : 'Application rejected.');
    } catch (error) { setMessage(getSafetyError(error)); }
    finally { setBusy(''); }
  }
  return <section className="card volunteer-review"><div className="section-heading"><div><p className="eyebrow">ADMIN REVIEW</p><h2>Community volunteers</h2></div><button className="text-button" onClick={() => load()} disabled={loading || Boolean(busy)}>Refresh</button></div><p>Review identity and suitability through your college process before approving. An application or email alone does not establish trust.</p>{message && <p className="notice" role="status">{message}</p>}{loading ? <p role="status">Loading applications...</p> : applications.length ? <ul className="connection-list">{applications.map(person => <li key={person.id}><span className="avatar"><Icon name="heart" size={19} /></span><div><strong>{person.name}</strong><span>{person.email}</span><span>{person.accountStatus === 'ACTIVE' ? 'Awaiting review' : 'Account suspended'}</span></div><div className="button-row"><button className="button button-primary button-small" disabled={Boolean(busy) || person.accountStatus !== 'ACTIVE'} onClick={() => review(person.id, 'APPROVED')}>Approve</button><button className="text-button danger-text" disabled={Boolean(busy)} onClick={() => review(person.id, 'REJECTED')}>Reject</button></div></li>)}</ul> : <p className="compact-empty">No pending applications. New volunteer requests will appear here.</p>}</section>;
}

export default VolunteerReview;
