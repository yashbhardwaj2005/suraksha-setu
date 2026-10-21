import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import HealthCard from '../components/HealthCard.jsx';
import { Badge, Card, PageIntro } from '../components/ui.jsx';

const phases = [
  ['01', 'A strong foundation', 'Setup & architecture', 'Implemented'],
  ['02', 'Know your community', 'Authentication & verification', 'In progress'],
  ['03', 'Your trusted circle', 'Contacts & consent', 'Upcoming'],
  ['04', 'Make help accessible', 'SOS activation & cancellation', 'Upcoming'],
  ['05', 'Stay connected', 'Matching & live location', 'Upcoming'],
  ['06', 'Bring it all together', 'Testing & deployment', 'Upcoming'],
];

function Workspace() {
  return <div className="page-content">
    <PageIntro eyebrow="AUTHENTICATION / PHASE 02" title="Know your community.">The User model is reviewed. Next comes registration, followed by sign-in, roles and volunteer verification.</PageIntro>
    <div className="overview-grid">
      <Card className="feature-card">
        <div className="feature-top"><Badge tone="light">CURRENT MILESTONE</Badge><Icon name="layers" size={25} /></div>
        <h2>Give every account<br />a clear role.</h2>
        <p>The model now validates account fields and protects password hashes. Build registration next, with explicit input checks and password hashing.</p>
        <Link className="button button-white" to="/setup">Open registration task <Icon name="arrow" size={17} /></Link>
        <div className="feature-footer"><span className="feature-line" /> Phase 2 of 6 <span>Authentication & verification</span></div>
      </Card>
      <HealthCard />
    </div>
    <div className="section-title"><div><p className="eyebrow">THE BUILD PLAN</p><h2>Small steps. A shared direction.</h2></div><span className="muted-text">Each phase has its own checkpoint.</span></div>
    <div className="phase-grid">{phases.map(([number, title, detail, status]) => <Card key={number} className={`phase-card ${number === '02' ? 'current-phase' : ''}`}><div className="phase-top"><span className="phase-number">{number}</span><Badge tone={number === '02' ? 'teal' : 'neutral'}>{status}</Badge></div><h3>{title}</h3><p>{detail}</p></Card>)}</div>
    <div className="prototype-note"><Icon name="info" /><p><strong>A learning project, built responsibly.</strong> SOS, notifications and location sharing are not available in this phase. This prototype cannot guarantee assistance. For an emergency in India, call <a href="tel:112">112</a>.</p></div>
  </div>;
}

export default Workspace;
