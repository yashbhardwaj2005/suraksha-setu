import { Card, PageIntro } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

const layers = [
  ['globe', '01', 'React frontend', 'The interface', 'Pages, forms, navigation and honest status feedback. Calls the API; never connects directly to the database.'],
  ['code', '02', 'Express backend', 'The decision maker', 'Validates requests, authenticates users, checks ownership and controls emergency state transitions.'],
  ['layers', '03', 'MongoDB Atlas', 'The source of truth', 'Stores users, contacts, SOS records and notification outcomes through Mongoose.'],
];

function Architecture() {
  return <div className="page-content"><PageIntro eyebrow="THE SYSTEM / PHASE 01" title="A clear place for every responsibility.">One frontend, one backend, one database. Add real-time capabilities only when the foundation is ready.</PageIntro>
    <div className="architecture-grid">{layers.map(([icon, number, title, subtitle, text]) => <Card key={number} className="layer-card"><div className="section-heading"><span className="icon-box"><Icon name={icon} /></span><span className="phase-number">{number}</span></div><p className="eyebrow">{subtitle}</p><h2>{title}</h2><p>{text}</p></Card>)}</div>
    <Card className="flow-card"><h2>The first request, end to end.</h2><div className="request-flow"><span>Connection check</span><Icon name="arrow" /><code>GET /api/v1/health</code><Icon name="arrow" /><span>Express handler</span><Icon name="arrow" /><span>JSON response</span></div><p>The development server forwards requests under <code>/api</code> to your backend on port 5000. No database query is needed for this liveness check.</p></Card>
    <div className="principle-grid"><Card><Icon name="lock" /><h2>Authorization stays on the server.</h2><p>Later, JWTs establish identity. Resource ownership and responder assignment determine who can view sensitive information. Hiding a frontend page alone never protects data.</p></Card><Card><Icon name="shield" /><h2>Location is permission-based.</h2><p>In a later phase, browser GPS updates go through the server to an authorized responder. Ended SOS requests revoke access. Browser background tracking is not guaranteed.</p></Card></div>
  </div>;
}

export default Architecture;
