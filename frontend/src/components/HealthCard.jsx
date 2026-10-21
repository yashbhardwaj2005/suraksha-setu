import useHealthCheck from '../hooks/useHealthCheck.js';
import { Badge, Button, Card } from './ui.jsx';
import Icon from './Icon.jsx';

function HealthCard() {
  const health = useHealthCheck();
  const labels = { idle: 'Not checked', loading: 'Checking', success: 'API reachable', error: 'Check failed' };
  return <Card className="health-card" aria-labelledby="health-heading">
    <div className="section-heading"><span className="icon-box"><Icon name="activity" /></span><Badge tone={health.status === 'success' ? 'teal' : 'neutral'}>{labels[health.status]}</Badge></div>
    <h2 id="health-heading">Connect the foundation.</h2>
    <p>Check your Express health endpoint when your local server is ready.</p>
    <div className="endpoint"><span>GET</span><code>/api/v1/health</code></div>
    <Button variant="secondary" onClick={health.run} disabled={health.status === 'loading'}><Icon name="activity" />{health.status === 'loading' ? 'Checking backend…' : 'Check backend connection'}<Icon name="arrow" size={16} /></Button>
    <div className="health-feedback" role="status" aria-live="polite">
      {health.status === 'idle' && <p>No request has been sent yet.</p>}
      {health.status === 'loading' && <p>Waiting for the health response…</p>}
      {health.status === 'error' && <p className="error-text">{health.error}</p>}
      {health.status === 'success' && <p className="success-text">Health response verified at {health.checkedAt.toLocaleTimeString()}. This checks HTTP only, not MongoDB, GPS, SMS or emergency readiness.</p>}
    </div>
  </Card>;
}

export default HealthCard;
