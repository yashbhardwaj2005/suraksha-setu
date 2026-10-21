import { Link } from 'react-router-dom';
import { Badge, Card, PageIntro } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

function Setup() {
  return <div className="page-content">
    <PageIntro eyebrow="BACKEND LEARNING / PHASE 02" title="Registration, from input to database.">Registration is implemented and tested. Review how input becomes a safe account before moving to sign-in and sessions.</PageIntro>
    <div className="setup-grid">
      <Card className="instruction-card"><Badge tone="teal">TASK 02 IMPLEMENTED</Badge><h2>POST /api/v1/auth/register</h2><p>The route applies an Origin/JSON guard and request limit, then runs the registration controller. Passwords are hashed with bcrypt before the User document is saved.</p>
        <ol className="task-list">
          <li><strong>Validate before database work.</strong><p>Only name, email, password and optional role are accepted. Identity fields are normalized; passwords keep their spaces and require 12 characters minimum and 72 UTF-8 bytes maximum.</p></li>
          <li><strong>Keep permissions server-controlled.</strong><p>Public roles are USER or VOLUNTEER. Admin signup and injected status/hash/version fields are rejected. New volunteers remain NOT_REQUESTED, without responder access.</p></li>
          <li><strong>Hash, then save allowed fields.</strong><p><code>bcrypt.hash(password, 12)</code> creates the hash. <code>User.create</code> receives only named allowed fields. Startup waits for the unique email index before accepting requests.</p></li>
          <li><strong>Return a safe receipt.</strong><p>HTTP 201 includes only id, name, email, role, accountStatus and verificationStatus. Bad input returns 400; existing/racing duplicate email returns 409; throttled requests return 429. Unexpected failures use the central error handler.</p></li>
        </ol>
        <p className="task-hint"><Icon name="info" size={17} />The registration form is connected and creates real accounts only after server confirmation. It does not issue JWTs or sign anyone in. Login, protected dashboards and volunteer review are the next Phase 2 steps.</p>
      </Card>
      <div className="setup-side"><Card><span className="icon-box"><Icon name="code" /></span><h2>The health contract</h2><p>Expected response from your server:</p><pre><code>{'{\n  "success": true,\n  "data": {\n    "status": "ok"\n  }\n}'}</code></pre><div className="endpoint"><span>GET</span><code>/api/v1/health</code></div></Card>
        <Card className="test-card"><h2>Verification results</h2><p>52 offline backend tests, 5 isolated Atlas integration tests, and 14 frontend tests pass. Live tests cover the unique email index, simultaneous signup, real bcrypt persistence and the actual frontend API client.</p><a className="text-link" href="https://github.com/kelektiv/node.bcrypt.js" target="_blank" rel="noreferrer">bcrypt documentation <Icon name="arrow" size={16} /></a><Link className="button button-secondary" to="/workspace">Back to workspace <Icon name="arrow" size={16} /></Link></Card></div>
    </div>
  </div>;
}

export default Setup;
