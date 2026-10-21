import { Link } from 'react-router-dom';
import { Badge, Card, PageIntro } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

function Setup() {
  return <div className="page-content">
    <PageIntro eyebrow="BACKEND LEARNING / PHASE 02" title="Turn valid input into a safe account.">Your User model passed review. Next, build registration: validate the request, hash the password, save the user, and return a safe summary.</PageIntro>
    <div className="setup-grid">
      <Card className="instruction-card"><Badge tone="teal">PHASE 2 / TASK 02</Badge><h2>Build POST /api/v1/auth/register.</h2><p>Install bcrypt in backend. It hashes passwords so the database does not need the original password. Create controllers/auth.controller.js and routes/auth.routes.js, then mount the router before notFound in app.js.</p>
        <ol className="task-list">
          <li><strong>Validate before querying or hashing.</strong><p>Accept only name, email, password and optional role. Require strings with the agreed name/email rules; normalize name and email, but never trim passwords. Passwords need at least 12 characters and at most 72 UTF-8 bytes.</p></li>
          <li><strong>Protect role and status fields.</strong><p>Only USER and VOLUNTEER may register publicly. Default to USER when role is omitted. Reject ADMIN and client-supplied passwordHash, accountStatus, verificationStatus or authVersion.</p></li>
          <li><strong>Hash and create the user explicitly.</strong><p>Use <code>bcrypt.hash</code> with work factor 12, then <code>User.create</code> with named allowed fields. Leave default status fields to the model. Do not pass the whole request body into create.</p></li>
          <li><strong>Return safe JSON and handle duplicates.</strong><p>Success: HTTP 201 with <code>{'{ success: true, data: { user } }'}</code>. Return only id, name, email, role, accountStatus and verificationStatus. Invalid input returns 400; duplicate email returns 409, including MongoDB duplicate-key errors. Forward unexpected errors with <code>next(error)</code>.</p></li>
        </ol>
        <p className="task-hint"><Icon name="info" size={17} />Use fictional test users. Registration does not issue JWTs or automatically sign anyone in. The frontend remains a preview until request/security integration is reviewed. Export functions and the router at the bottom.</p>
      </Card>
      <div className="setup-side"><Card><span className="icon-box"><Icon name="code" /></span><h2>The health contract</h2><p>Expected response from your server:</p><pre><code>{'{\n  "success": true,\n  "data": {\n    "status": "ok"\n  }\n}'}</code></pre><div className="endpoint"><span>GET</span><code>/api/v1/health</code></div></Card>
        <Card className="test-card"><h2>Check the registration cases</h2><p>Test USER and VOLUNTEER, normalized duplicate emails, invalid passwords, ADMIN attempts and server-owned fields. Responses must never contain passwordHash or the original password.</p><a className="text-link" href="https://github.com/kelektiv/node.bcrypt.js" target="_blank" rel="noreferrer">bcrypt documentation <Icon name="arrow" size={16} /></a><Link className="button button-secondary" to="/workspace">Back to workspace <Icon name="arrow" size={16} /></Link></Card></div>
    </div>
  </div>;
}

export default Setup;
