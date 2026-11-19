import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useSession } from '../context/SessionContext.jsx';
import IncomingAlerts from '../components/IncomingAlerts.jsx';

const navigation = [{ to: '/dashboard', label: 'Safety home', icon: 'home' }, { to: '/contacts', label: 'Trusted contacts', icon: 'people' }, { to: '/volunteer', label: 'Volunteer', icon: 'heart' }, { to: '/account', label: 'My account', icon: 'user' }];

function AppLayout() {
  const { pathname } = useLocation();
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const main = useRef(null);
  const [notice, setNotice] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
    document.title = (navigation.find(item => item.to === pathname)?.label || 'Your people. Within reach.') + ' | SurakshaSetu';
    setNotice('');
  }, [pathname]);
  async function handleSignOut() {
    setSigningOut(true);
    try { await signOut(); navigate('/'); }
    catch { setNotice('Could not sign out. Check your connection and retry.'); }
    finally { setSigningOut(false); }
  }
  const brand = <Link className="brand" to={user ? '/dashboard' : '/'} aria-label="SurakshaSetu home"><span className="brand-icon"><Icon name="shield" size={25} /></span><span>Suraksha<span>Setu</span><small>SAFER TOGETHER.</small></span></Link>;
  return <div className={'app-shell ' + (user ? 'signed-in' : 'public-shell')}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    {user && <aside className="sidebar">{brand}<div className="sidebar-label">YOUR SAFETY SPACE</div><nav aria-label="Main navigation">{navigation.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => 'nav-link ' + (isActive ? 'active' : '')}><Icon name={item.icon} /><span>{item.label}</span></NavLink>)}</nav><div className="sidebar-emergency"><span className="icon-box"><Icon name="phone" /></span><h2>Need urgent help?</h2><p>For emergency services in India, call 112.</p><a href="tel:112" className="button button-secondary">Call 112</a></div><div className="sidebar-profile"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><span>{user.role === 'VOLUNTEER' ? 'Community volunteer' : 'Community member'}</span></div><button className="icon-button" aria-label="Sign out" onClick={handleSignOut} disabled={signingOut}><Icon name="logout" size={18} /></button></div></aside>}
    <div className="main-shell"><header className="topbar">{user ? <div className="topbar-heading"><Icon name="shield" size={17} /><span className="desktop-heading">Your private safety space</span><span className="mobile-heading">SurakshaSetu</span></div> : brand}<div className="topbar-actions"><a className="emergency-link" href="tel:112"><Icon name="phone" size={17} />Call 112</a>{!user && <Link className="button button-secondary" to="/login">Sign in</Link>}{user && <Link className="avatar mobile-avatar" aria-label="My account" to="/account">{user.name.slice(0, 1).toUpperCase()}</Link>}</div></header>
      {notice && <p className="notice notice-error" role="alert">{notice}</p>}
      <main id="main-content" ref={main} tabIndex={-1}>{user && <IncomingAlerts key={user.id} />}<Outlet /></main>
      <footer className="footer"><span><Icon name="shield" size={14} />SurakshaSetu · Academic prototype</span><span>Emergency services: <a href="tel:112">112</a></span></footer>
    </div>
    {user && <nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'active' : ''}><Icon name={item.icon} size={21} /><span>{item.label === 'Trusted contacts' ? 'Contacts' : item.label === 'Safety home' ? 'Home' : item.label === 'Volunteer' ? 'Volunteer' : 'Account'}</span></NavLink>)}</nav>}
  </div>;
}

export default AppLayout;
