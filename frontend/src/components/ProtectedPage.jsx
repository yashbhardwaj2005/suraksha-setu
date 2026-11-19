import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import Icon from './Icon.jsx';

function ProtectedPage({ children }) {
  const { status, refreshSession } = useSession();
  const location = useLocation();
  if (status === 'loading') return <div className="page-loading" role="status"><span className="loading-ring" />Opening your space…</div>;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ returnTo: location.pathname }} />;
  if (status === 'error') return <div className="page-content"><section className="empty-state card"><Icon name="wifi" size={32} /><h1>Let’s reconnect.</h1><p>We could not check your session. Check your connection and try again.</p><button className="button button-primary" onClick={() => refreshSession().catch(() => {})}>Try again</button><a href="tel:112" className="text-link">Call 112 for urgent help</a></section></div>;
  return children;
}

export default ProtectedPage;
