import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { getCurrentUser, prepareCsrf, logoutAccount } from '../services/auth.service.js';
import { Card, PageIntro } from '../components/ui.jsx';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [activeSOS, setActiveSOS] = useState(null);
  const [message, setMessage] = useState('');

  async function loadDashboard() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      await prepareCsrf();
      const [contactResponse, sosResponse] = await Promise.all([api.get('/contacts'), api.get('/sos/active')]);
      setContacts(contactResponse.data?.data?.contacts || []);
      setActiveSOS(sosResponse.data?.data?.sos || null);
    } catch (error) {
      setMessage('Please sign in to access your dashboard.');
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  async function addContact(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.post('/contacts', { name: form.get('name'), relationship: form.get('relationship'), phone: form.get('phone') });
      event.currentTarget.reset();
      setMessage('Emergency contact added.');
      loadDashboard();
    } catch (error) {
      setMessage(error.response?.data?.error?.message || 'Could not add contact.');
    }
  }

  async function sendSOS() {
    if (!navigator.geolocation) return setMessage('Location is not available in this browser. Call 112 if this is an emergency.');
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const response = await api.post('/sos', { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
        setActiveSOS(response.data.data.sos);
        setMessage('SOS created. Call 112 for emergency services.');
      } catch (error) {
        setMessage(error.response?.data?.error?.message || 'Could not create SOS.');
      }
    }, () => setMessage('Location permission is required to create an SOS. Call 112 if this is an emergency.'));
  }

  async function cancelSOS() {
    try {
      await api.patch(`/sos/${activeSOS._id}/cancel`);
      setActiveSOS(null);
      setMessage('SOS cancelled.');
    } catch (error) {
      setMessage('Could not cancel SOS.');
    }
  }

  async function requestVerification() {
    try {
      const response = await api.post('/auth/volunteer-verification');
      setUser(response.data.data.user);
      setMessage('Verification request sent for admin review.');
    } catch (error) {
      setMessage(error.response?.data?.error?.message || 'Could not request verification.');
    }
  }

  async function signOut() {
    await logoutAccount();
    setUser(null);
    setContacts([]);
    setActiveSOS(null);
    setMessage('Signed out.');
  }

  if (!user) return <div className="page-content"><PageIntro eyebrow="ACCOUNT" title="Your safety dashboard">{message || 'Sign in to manage emergency contacts and your account.'}</PageIntro><Link className="button button-primary" to="/login">Sign in</Link></div>;

  return <div className="page-content">
    <PageIntro eyebrow="SAFETY DASHBOARD" title={`Welcome, ${user.name}`}>Role: {user.role}. Account status: {user.accountStatus}. Volunteer status: {user.verificationStatus}.</PageIntro>
    <div className="overview-grid">
      <Card><h2>Emergency SOS</h2><p>{activeSOS ? `Status: ${activeSOS.status}` : 'No active SOS.'}</p><div className="dashboard-actions">{activeSOS ? <button className="button button-secondary" onClick={cancelSOS}>Cancel SOS</button> : <button className="button button-primary" onClick={sendSOS}>Share location & create SOS</button>}<a className="button button-secondary" href="tel:112">Call 112</a></div></Card>
      <Card><h2>Account</h2><p>{user.email}</p>{user.role === 'VOLUNTEER' && user.verificationStatus !== 'APPROVED' && <button className="button button-secondary" onClick={requestVerification}>Request verification</button>}<button className="button button-secondary" onClick={signOut}>Sign out</button></Card>
    </div>
    <div className="section-title"><div><p className="eyebrow">EMERGENCY CONTACTS</p><h2>Your trusted circle</h2></div></div>
    <div className="overview-grid"><Card><form onSubmit={addContact}><input name="name" placeholder="Name" required /><input name="relationship" placeholder="Relationship" required /><input name="phone" placeholder="Phone number" required /><button className="button button-primary" type="submit">Add contact</button></form></Card><Card><ul className="contact-list">{contacts.length ? contacts.map((contact) => <li key={contact._id}>{contact.name} · {contact.relationship} · {contact.phone}</li>) : <li>No contacts yet.</li>}</ul></Card></div>
    {message && <p className="dashboard-message" role="status">{message}</p>}
  </div>;
}

export default Dashboard;
