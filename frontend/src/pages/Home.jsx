import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { Badge, Card } from '../components/ui.jsx';

function Home() {
  return <div className="page-content home-page">
    <div className="home-hero">
      <div className="home-hero-copy">
        <Badge tone="teal">FOR CAMPUSES & THEIR COMMUNITIES</Badge>
        <h1>Your safety.<br /><span>A shared responsibility.</span></h1>
        <p>A thoughtful space for trusted contacts, verified community volunteers, and permission-based emergency support.</p>
        <div className="hero-actions"><Link className="button button-primary" to="/register">Explore account setup <Icon name="arrow" size={17} /></Link><Link className="text-link" to="/login">Already have an account?</Link></div>
        <p className="hero-footnote"><Icon name="lock" size={15} /> Your location should always have a clear purpose and a clear end.</p>
      </div>
      <Card className="home-flow-card">
        <div className="section-heading"><span className="icon-box"><Icon name="shield" size={24} /></span><Badge>Planned SOS flow</Badge></div>
        <h2>Ask for help.<br />Stay in control.</h2>
        <ol className="home-steps">
          <li><span>01</span><div><h3>Choose to share</h3><p>Location permission is requested when you activate an SOS.</p></div></li>
          <li><span>02</span><div><h3>Connect with a responder</h3><p>Only an assigned, authorized volunteer can receive your exact location.</p></div></li>
          <li><span>03</span><div><h3>End the sharing</h3><p>Cancelling or resolving an SOS revokes live-location access.</p></div></li>
        </ol>
        <p className="planned-note">These emergency features are planned for later phases and are not active yet.</p>
      </Card>
    </div>
    <div className="home-principles">
      <div><Icon name="shield" /><h2>Trust is reviewed.</h2><p>Volunteer registration does not equal verification. Administrators review applications before approval.</p></div>
      <div><Icon name="lock" /><h2>Consent comes first.</h2><p>Contacts must consent to alerts. Exact locations are never intended for public access.</p></div>
      <div><Icon name="phone" /><h2>112 stays within reach.</h2><p>This college prototype cannot guarantee assistance or message delivery. For an emergency in India, call 112.</p></div>
    </div>
    <div className="preview-banner"><Icon name="info" /><p><strong>Phase 2 development preview.</strong> Login and registration screens are available for form checks. Accounts, authentication, and volunteer approvals are not connected yet.</p></div>
  </div>;
}

export default Home;
