import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { Badge } from '../components/ui.jsx';

const navigation = [
  { to: '/', label: 'Home', icon: 'shield' },
  { to: '/login', label: 'Sign in', icon: 'lock' },
  { to: '/register', label: 'Create account', icon: 'globe' },
  { to: '/workspace', label: 'Build workspace', icon: 'grid' },
  { to: '/setup', label: 'Getting started', icon: 'code' },
  { to: '/architecture', label: 'Architecture', icon: 'layers' },
];

function AppLayout() {
  const { pathname } = useLocation();
  const main = useRef(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
    const page = navigation.find((item) => item.to === pathname)?.label || 'Page not found';
    document.title = `${page} | Community Safety`;
  }, [pathname]);

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar">
      <Link className="brand" to="/" aria-label="Community Safety home"><span className="brand-icon"><Icon name="shield" size={27} /></span><span>community<span className="brand-second">safety<span className="brand-dot">.</span></span></span></Link>
      <p className="nav-caption">COMMUNITY SAFETY</p>
      <nav aria-label="Main navigation">{navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon name={item.icon} />{item.label}</NavLink>)}</nav>
      <div className="sidebar-note"><Icon name="shield" /><strong>Built with care.</strong><p>Privacy, consent, and clear communication at every step.</p></div>
      <div className="sidebar-foot"><span className="small-dot" /> Academic prototype</div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><span className="breadcrumb">Community Safety <span>/</span> Phase 02</span><div className="topbar-actions"><Badge>Development</Badge><a className="emergency-link" href="tel:112"><Icon name="phone" size={16} /><span>Call 112<span className="emergency-long"> · Emergency services</span></span></a></div></header>
      <main id="main-content" ref={main} tabIndex={-1}><Outlet /></main>
      <footer className="footer"><span>Community-Driven Women Safety</span><span>College project · Built step by step</span></footer>
    </div>
  </div>;
}

export default AppLayout;
