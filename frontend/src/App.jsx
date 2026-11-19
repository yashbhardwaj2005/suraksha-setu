import { Link, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import Home from './pages/Home.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Contacts from './pages/Contacts.jsx';
import Account from './pages/Account.jsx';
import ContactInvite from './pages/ContactInvite.jsx';
import SharedAlert from './pages/SharedAlert.jsx';
import Volunteer from './pages/Volunteer.jsx';
import ProtectedPage from './components/ProtectedPage.jsx';

function App() {
  return <Routes><Route element={<AppLayout />}>
    <Route index element={<Home />} />
    <Route path="login" element={<AuthPage mode="login" key="login" />} />
    <Route path="register" element={<AuthPage mode="register" key="register" />} />
    <Route path="dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
    <Route path="contacts" element={<ProtectedPage><Contacts /></ProtectedPage>} />
    <Route path="account" element={<ProtectedPage><Account /></ProtectedPage>} />
    <Route path="volunteer" element={<ProtectedPage><Volunteer /></ProtectedPage>} />
    <Route path="contact-invite" element={<ContactInvite />} />
    <Route path="alerts/:sosId" element={<ProtectedPage><SharedAlert /></ProtectedPage>} />
    <Route path="*" element={<div className="page-content"><section className="empty-state card"><h1>This page isn’t here.</h1><p>Head back to your safety dashboard.</p><Link className="button button-primary" to="/">Go home</Link></section></div>} />
  </Route></Routes>;
}

export default App;
