# Project progress

Updated: 2026-10-21 (Asia/Calcutta).

## Current phase

Phase 2: authentication and dashboards — approved and in progress.
Student explicitly approved with "start phase 2" on 2026-10-21. Phase 1
implementation and automated checks were accepted at the checkpoint; the
documented browser/mobile visual QA limitation carries forward.

Phase 1 history:
Backend task 1 submitted and reviewed successfully. Student requested brief,
practical tasks without quizzes. Frontend foundation implemented and checked;
backend task 2 corrected and passed live Express + frontend Axios/proxy tests.
Backend task 3 completed by Codex at the student's explicit request after an
attempt. Configuration validation, actual startup and health integration pass.
Task 4 submitted by the student, reviewed, corrected with explicit permission,
and verified against the configured Atlas database. Task 5 JSON parsing and
centralized error middleware implemented by Codex on explicit request. All
26 backend tests pass. Phase 1 implementation/automated review is complete;
the phase checkpoint was presented and the student approved Phase 2. Browser
visual/mobile checks remain unverified and are not claimed as passed.

## Completed

- Inspected workspace: initially empty; no existing code or ancestor AGENTS.md
  found along the workspace path.
- Verified local executables: Node v24.13.1 and npm 11.8.0.
- Created permanent ownership, teaching, phase and privacy rules.
- Documented proposed architecture, models, dependencies and API contracts.
- Added root secret/build ignore rules and project README.
- Student created backend/package.json with type=module and private=true.
- Reviewed the actual package file: valid JSON, correct property types, and
  no dependencies or business logic added. Backend files were not modified.
- Implemented React/Vite frontend with Tailwind, Router, Axios, responsive
  setup workspace, reusable UI and actual manual health-check integration.
- Installed frontend dependencies and recorded their lockfile. npm reported
  no known vulnerabilities at installation time.
- Recorded the student's communication preference in AGENTS.md; no conceptual
  quiz or extra confirmation is required to receive the next practical task.
- Student installed Express and wrote src/app.js, src/index.js and correct
  dev/start scripts. Reviewed ES imports, app export and listener separation.
  Initial route mismatch was corrected by the student; real health integration
  now passes with HTTP 200 and the agreed JSON fields.
- Student explicitly authorized Codex to implement task 3. Added the empty
  env module/file contents, imported validated PORT in index.js and updated
  package scripts. No controllers, routes or business logic were changed.
- Student wrote MongoDB connection code and requested senior review/direct
  corrections. Codex fixed awaiting connection before listening, propagated
  failed connections, bounded driver server selection to 5 seconds, validated
  the URI without logging it, and sanitized startup/listener error output.
- Removed a real credential-bearing URI from .env.example (it matched .env).
  Actual .env credentials were preserved locally. Added 16 regression tests
  with Node's built-in runner; all pass. Real Atlas connection + ping passed.
- Student explicitly delegated task 5. Codex added simple named notFound and
  errorHandler middleware, the 16 KB JSON parser and app wiring, without a
  utility class or new dependency. Responses are fixed/sanitized JSON.
- Applied the student's export convention across existing frontend/backend
  source modules: declare first, export at the end. Recorded it in AGENTS.md.
  Re-ran all 26 backend tests and the frontend build after these changes: PASS.
- Phase 2 frontend: new product home at /; /login and /register form previews;
  development workspace moved to /workspace. Setup page now shows User model
  task. Phase indicators and navigation updated. All exports stay at the end.
- Reusable labelled form field, password show/hide, confirmation, role radio
  choices and client validation implemented. Preview submission does not send
  credentials, create accounts, create sessions or fake authentication.
- Phase 2 frontend build, eight validation tests and SSR checks for seven
  routes passed. Authentication API integration and browser interaction QA
  remain pending. No backend files were changed for this Phase 2 kickoff.
- Student submitted models/user.model.js and explicitly requested correction.
  Preserved their filename, added identity validation/normalization, corrected
  uppercase role/status enums, required server-owned fields, constrained
  authVersion, and protected passwordHash from default reads and JSON output.
- Added 11 User model regression tests; all 37 backend tests pass. Tests use
  async document.validate (validateSync is deprecated in the installed Mongoose).
  No database documents were created and live unique-index enforcement is
  not yet tested. Next assignment is registration, not automatic controller code.
- Student explicitly delegated registration implementation after creating
  controller/route files. Codex completed registration, guard/rate limiter,
  router mounting, bcrypt cost 12, duplicate handling and safe user receipt.
  db.js now waits for User.init so the email index is ready before listening.
- Frontend registration now makes the real POST, shows loading/errors and
  confirms creation only from a valid 201 receipt. No login/JWT/session is
  fabricated. Login remains a non-submitting preview. No plaintext credentials
  are persisted by the frontend.
- Verification: 52 offline backend tests, 14 frontend tests and 5 real Atlas
  integration tests passed. Live tests use a random temporary database and
  remove only its users collection after asserting the exact generated DB
  identity. Actual frontend Axios client roundtrip and duplicate feedback pass.
- IDE sync resolved after the user unlocked Windows: saved the tested controller
  over the partial buffer and resolved the newer-file conflict. Corrected the
  current project's dirty User model, removing a pre-save hook that would hash
  an already hashed password again. Both buffers now match tested disk source;
  no unsaved markers remain. The old ULTIMATE-BACKEND-COHORT model was untouched.

## Phase 1 checklist

- [x] Inspect workspace and installed Node/npm.
- [x] Propose architecture, model relationships, REST APIs and folder layout.
- [x] Record development rules and initial documentation.
- [x] Architecture/model/API proposals documented and development direction
      discussed. Final auth/cookie details remain a pre-implementation Phase 2 decision.
- [x] Student initializes backend package and enables ES modules (task 1).
- [x] Review student's package.json (quiz skipped at student's request).
- [x] Codex initializes React/Vite, Tailwind, routing, layout/UI primitives,
      API utility and environment example within Phase 1.
- [x] Student installs Express and Mongoose. CORS revisited before enabling
      separate-origin access; current local frontend uses a same-origin proxy.
- [x] Student creates app.js/index.js and dev/start scripts.
- [x] Student corrects health route path and integration check passes.
- [x] Environment configuration and startup validation (Codex implemented
      this task with explicit student permission).
- [x] MongoDB Atlas connection reviewed, corrected and verified.
- [x] Request parsing, not-found and error middleware (Codex implemented
      task 5 with explicit student permission); 26 backend tests pass.
- [x] Verify frontend build/start and backend start, health and error responses;
      verify database connection and predictable failure on invalid config.
- [x] Review Phase 1 code, record results and present the phase checkpoint.
- [x] Explicit Phase 2 approval after the completion checkpoint.

## Phase 2 checklist

- [x] Record approval and keep backend student-owned.
- [x] Build landing and login/register interface previews with client checks.
- [x] Student writes User model; Codex reviews, corrects and tests it.
- [x] Registration validation, bcrypt hashing, guards and duplicate handling.
- [x] Sync current-project controller/model buffers with tested disk source;
      verify saved state after the user unlocked Windows.
- [ ] Cookie JWT authentication, CSRF protection, session check and logout.
- [ ] Auth context, protected frontend routes and role dashboards connected
      to genuine backend sessions (no fake login or stored bearer tokens).
- [ ] Volunteer verification request and admin approval/rejection workflow.
- [ ] Role/resource restrictions, suspended-account behaviour and API tests.
- [ ] Phase 2 integration/browser checks and completion checkpoint.

## Phase 2 task 1: User model (reviewed, corrected, tested)

Implemented at backend/src/models/user.model.js, preserving student's filename.
A schema defines fields and validation;
the model uses that schema to work with user documents. Future registration
flow: validate request -> hash password -> create User -> return safe summary.
No request/response feature or account creation exists in this task.

Fields:

| Field | Requirements |
| --- | --- |
| name | Required String, trim, 2..80 characters |
| email | Required String, trim, lowercase, maximum 254 characters, basic email format, unique index |
| passwordHash | Required String, select:false; never store a real plaintext password |
| role | Required enum USER/VOLUNTEER/ADMIN, default USER |
| accountStatus | Required enum ACTIVE/SUSPENDED, default ACTIVE |
| verificationStatus | Required enum NOT_REQUESTED/PENDING/APPROVED/REJECTED, default NOT_REQUESTED |
| authVersion | Required nonnegative integer Number, default 0 |
| timestamps | Schema option timestamps:true |

Hints: mongoose.Schema, required, trim, lowercase, enum, default, minLength,
maxLength, match, select, unique, Number.isInteger and mongoose.model.
Declare schema/model first and finish with export default User. No new package,
controller, route, pre-save hashing hook or real user insertion is needed.

Keep verificationStatus flat for this first model to reduce nested schema
complexity; admin review metadata can be added in a later guided Phase 2 task.
Schema role enums do not authorize public signup as ADMIN; future registration
must allow only USER/VOLUNTEER and set status/version fields on the server.
unique:true creates an index, not a Mongoose validation rule; later duplicate
email tests must exercise the actual database index.

Review actual submitted code before the next task. Start testing with
fictional documents and validation, without saving real plaintext passwords.

Review: original model lacked name/email limits and email normalization,
passwordHash selection protection, required state fields and integer/range
validation for authVersion. Lowercase roles/statuses conflicted with the
agreed uppercase contract. Codex corrected these on request and added a simple
named JSON transform that removes passwordHash even from newly created
documents. select:false controls default database reads; it alone would not
sanitize an immediate User.create response. Future controllers still return
explicit safe summaries, especially for lean queries which bypass transforms.
The file ends with a named User declaration followed by export default User.

## Phase 2 task 2: registration (implemented, tested and saved in the IDE)

Objective: build one POST /api/v1/auth/register endpoint. Flow: validate input
-> normalize identity -> hash password -> create User -> return safe summary.

Student explicitly requested implementation. Codex installed bcrypt
(password hashing, work factor 12) and express-rate-limit (abuse control), wrote
src/controllers/auth.controller.js and src/routes/auth.routes.js, and mounts
the router before notFound in app.js. Exports are at the bottom; controller uses
plain if statements, named functions and explicit fields, without utility classes.

- Accept only name/email/password/optional role, validate types and document
  limits before database or hashing work, normalize name/email. Do not trim
  passwords; require minimum 12 characters and maximum 72 UTF-8 bytes.
- Public role is USER or VOLUNTEER only, default USER. Reject ADMIN and all
  client-supplied passwordHash/accountStatus/verificationStatus/authVersion.
- Use bcrypt.hash(password, 12). Call User.create with explicit allowed fields,
  not req.body. Default account/verification/version fields remain server-owned.
- HTTP 201: { success:true, data:{ user:{ id,name,email,role,accountStatus,
  verificationStatus } } }. Never return plaintext/hash/internal version.
- Invalid input: 400 / VALIDATION_ERROR. Duplicate normalized email: 409 /
  EMAIL_EXISTS, including database code 11000 (prechecks alone race). Unknown
  errors go to next(error). Keep all error messages free of submitted secrets.
- No JWT, auto-login or authenticated state changes in this task. The login
  preview remains non-submitting. Registration is connected with strict JSON, exact browser Origin checks
  and a 10-attempt/IP/15-minute process-local limiter. It consumes no auth
  session and creates no cookie. Login/logout still require their planned
  session-bound CSRF protection before being connected.
- Test fictional member/volunteer, duplicates, bad types/passwords, role
  escalation and protected-field injection. Use an isolated test database
  before automated persistence/duplicate-index tests; do not clear real users.

Implemented guard permits missing Origin for API clients such as Postman,
rejects unknown/null browser origins and cross-site requests missing Origin,
and accepts application/json only. FRONTEND_ORIGIN defaults to
http://127.0.0.1:5173; configure an exact origin for another application URL.
No CORS middleware is needed for the current Vite same-origin proxy. Rate
limits are single-process/in-memory; deployment must verify proxy/IP handling
before changing trust proxy or claiming shared limits across instances.

Completed flow: input validation -> normalized duplicate precheck -> bcrypt
hash -> explicit User.create -> safe 201 DTO. MongoDB 11000 is also handled
for races. User.init is awaited at startup before HTTP listening. No admin
signup, approval assignment, JWTs or automatic sign-in were added.

Real integration script: npm run test:integration. It uses the local URI's
cluster with a generated community_safety_test_ database name (34 ASCII
characters, within the observed Atlas limit). Before cleanup it verifies the
exact generated name/prefix, then drops only the owned users collection and
disconnects. No production user collection is accessed. Both frontend and
backend dependencies must be installed for the client roundtrip test.

## First backend assignment (implementation reviewed)

Objective: create only the backend package and enable ES modules.

From the project root, the student runs:

```powershell
mkdir backend
cd backend
npm init -y
```

Then edit backend/package.json to set `"type": "module"` and
`"private": true`. Understand that `type` enables import/export for .js files;
`private` prevents accidental npm publication. No dependencies, routes,
database setup or HTTP server in this task. No request-response flow exists
yet; this prepares the package that will later run Express.

Review checks completed by Codex from backend: `npm pkg get type private`
returned type=module and private=true. A Node check parsed the package as JSON
and asserted those exact values and types successfully. An ES module import
smoke check passed using `--input-type=module`; this explicitly selects module
mode and is not a test of a student-written .js module, which does not exist yet.

Student submitted the task and Codex reviewed the actual file. Proceed to
the next practical assignment without an understanding quiz, as requested.

Review outcome: no corrections required for task 1. The default failing test
script from npm init is a placeholder, not an application test. The current
main=index.js is harmless for this private package; future launch scripts will
explicitly target src/index.js. No corrections required.

## Backend task 2: Express startup and health endpoint

Objective: make one real HTTP request work; no database or business logic yet.
Express maps a request method/path to a handler that sends a response.
Flow: browser/Postman -> GET /api/v1/health -> Express -> HTTP 200 JSON.

Student implementation requirements:

1. Run `npm install express` from backend. Express supplies routing and
   request/response helpers. No additional dependency is needed for this task.
2. Create src/app.js: import Express, create an app, register the health GET
   handler, and export the app. Keep listening out of this file.
3. Create src/index.js: import the app with its .js extension and listen on
   port 5000. A fixed local port is fine for this first task; environment
   validation is a subsequent Phase 1 assignment.
4. The health route returns HTTP 200 and
   `{ "success": true, "data": { "status": "ok" } }`.
5. Add package scripts: dev=`node --watch src/index.js` and
   start=`node src/index.js`. Run `npm run dev`.
6. Verify http://127.0.0.1:5000/api/v1/health in browser/Postman, then try
   Check backend connection in the frontend. Submit the files for review.

Hints only: default Express import, app factory, app.get, res.json,
export default, and app.listen. No backend implementation written by Codex.

### Task 2 review (correction completed)

- Correct: Express app creation/export, .js import, listener in index.js,
  port 5000, start/dev scripts, HTTP 200 and success/data.status response.
- Extra top-level message in health response is acceptable; the client checks
  success and data.status and does not forbid extra harmless fields.
- Initial bug: backend registered /api/v1/health-check while the frontend
  requested /api/v1/health. Student changed the backend route to /api/v1/health.
- Retest passed for both direct HTTP and actual Axios through Vite's proxy.
  Codex changed no backend files. Task 2 complete; proceed to environment setup.

## Backend task 3: environment configuration and startup validation

Objective: replace the hardcoded port with validated environment configuration.
No additional npm dependency is needed: Node 24 has native --env-file support.
Flow: npm script -> load .env -> import/validate config -> start Express ->
health request -> HTTP 200. Invalid configuration stops before the listener.

Implementation requirements (completed by Codex with explicit permission):

1. backend/.env and backend/.env.example with PORT=5000 only for now. The real
   .env is already covered by root .gitignore. Never commit actual secrets.
2. backend/src/config/env.js: require a nonblank PORT, convert it to a number,
   ensure an integer in 1..65535, throw a clear error otherwise, and export
   numeric PORT. Hints: process.env.PORT, Number, Number.isInteger, throw Error.
3. Import PORT in index.js and remove the hardcoded declaration.
4. Scripts: dev=`node --env-file=.env --watch src/index.js`;
   start=`node --env-file=.env src/index.js`.
5. Test normal health response, invalid PORT=abc and PORT=70000, and missing
   or blank PORT. Invalid values must fail before opening a listener. Restore
   PORT=5000, then submit files for review. Do not paste real secrets.

MongoDB setup comes after this task. Student's .env, .env.example and env.js
were empty when inspected. Codex added PORT=5000 to both environment files,
implemented nonblank/integer/range checks in env.js, imported the exported
PORT before app startup and updated the scripts. No dependencies were added.
The exception is recorded in AGENTS.md and applies only to this setup step.

## Backend task 4: MongoDB Atlas connection (reviewed and verified)

Purpose: give the backend durable storage and establish the database connection
before opening the HTTP listener. No request controller/model work yet.
Flow: load/validate config -> await connectDB -> start HTTP -> handle requests.

1. Student installs mongoose in backend. Mongoose manages MongoDB connections
   and later provides document schemas; student installed it before review.
2. Prepare Atlas cluster, database user restricted to this project's database,
   and current-IP access entry. Obtain the application's connection string;
   keep credentials local. No Atlas account changes performed by Codex.
3. Add real MONGODB_URI to backend/.env and an empty MONGODB_URI placeholder to
   .env.example. Extend env.js to require/export a nonblank URI without printing
   its contents on errors. Do not put database credentials in the frontend.
4. Write src/config/db.js with an exported async connectDB function awaiting
   mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 }). This is a
   suggested development timeout, not a reliability guarantee.
5. Await connectDB before app.listen in index.js. Catch initial failures,
   print a generic sanitized failure message and exit with code 1. Do not log
   the raw URI or raw driver error, which may contain connection details.
6. Test valid connection/health and missing URI/invalid credentials; failures
   must prevent initial listening. Submit code, never real .env secrets.

References checked: https://mongoosejs.com/docs/connections.html and
https://www.mongodb.com/docs/atlas/connect-to-database-deployment/.
Review found connectDB was not awaited, its catch swallowed failures and logged
raw errors, URI configuration was not validated, and the example held real
credentials. Student explicitly authorized professional cleanup/corrections;
Codex fixed the submitted code and added regression coverage. No models or
backend business features were generated.

Live Atlas connection/ping succeeded after approved network access. The first
sandboxed network check stalled and was stopped; it was not a database failure.
Driver server selection timeout is 5 seconds, but DNS resolution can take
longer; do not treat that setting as a strict total startup deadline.

## Backend task 5: JSON parsing and centralized errors (implemented and tested)

Goal: keep API failure responses predictable without revealing internals.
Flow: JSON parser -> route -> not-found handler -> error handler.

Student explicitly requested Codex implementation with simple syntax. Codex
created src/middlewares/notFound.js and errorHandler.js, then wired
app.js: express.json({ limit: '16kb' }) before routes, notFound after routes,
four-argument errorHandler last. Preserve health behaviour. No dependency needed.

Implemented error shape: { success: false, error: { code, message } }.
Unknown routes: 404 / NOT_FOUND. Malformed JSON: 400 / INVALID_JSON.
Oversized JSON: 413 / PAYLOAD_TOO_LARGE. Unexpected errors: 500 / INTERNAL_ERROR
with a generic message. Do not trust arbitrary error messages, expose stacks,
or log request bodies/credentials. Delegate to next(err) if headers were sent.
Unsupported charset/compression also returns safe 415 / UNSUPPORTED_ENCODING.

Tests passed for health 200, unknown route JSON 404, malformed JSON 400,
oversized body 413, unsupported charset/compression 415, valid body parsing,
unexpected sync/async failures 500 and delegation after headers were sent.
Failure routes exist only in an isolated test app, not the public API.

Same-origin Vite proxy means a CORS package is not needed for this current
development flow. Configure and verify explicit origin/cookie rules before
separate-origin access/authentication, as already planned.

## Verification actually performed

- Workspace inventory and ancestor-rule inspection: completed.
- Node/npm version commands: completed successfully.
- Official documentation checked for tooling, geospatial ordering, Socket.IO
  delivery limits, geolocation, cookies and CSRF.
- At initial planning handoff, six documentation/config files existed and no
  application directory was scaffolded. Student subsequently created backend.
- Task 1 package configuration checks passed as described above. The backend
  directory contains the student's package.json, unchanged by Codex.
- Frontend npm install: completed after sandbox blocked initial registry
  access; approved elevated retry succeeded. Zero known vulnerabilities
  reported for the installed dependency tree at installation time.
- `npm run build`: PASS (Vite 8.3.5; 88 modules transformed).
- Server-rendered smoke checks: PASS for /, /setup, /architecture and 404;
  all include tel:112. Initial workspace correctly renders Not checked.
- API adapter smoke checks: PASS for valid health contract, credentials,
  malformed response rejection and timeout feedback. These used simulated
  responses and do not prove backend integration.
- Vite development startup: PASS. HTTP 200 for /, /setup, /architecture and
  /src/main.jsx. /api/v1/health returned HTTP 502 as expected without a backend.
- Connected browser inventory was empty. Visual/mobile/browser interaction
  QA could not be performed. Responsive CSS exists but is not visually verified.
- Before task 4, no database connections, real SMS sends or GPS operations
  had been performed. Task 4 adds only database connection/ping, not messages/GPS.
  Backend files were not changed by Codex during tasks 1 and 2. Task 3 setup
  changes were explicitly requested by the student and are recorded above.
- Task 2 live review: imported the student's Express app and started it on
  an ephemeral loopback port. GET /api/v1/health-check passed HTTP 200 and
  response-field assertions; GET /api/v1/health returned 404, confirming the bug.
- Task 2 frontend integration: started actual Vite with its proxy targeting
  that ephemeral backend port; frontend HTTP serving returned 200. Actual
  Axios health request through Vite returned 404, and the client's error
  feedback correctly identified the missing endpoint. No mocked response was
  used in this check. Both temporary test servers were closed afterward.
- After student's correction: GET /api/v1/health returned HTTP 200 with
  success=true and data.status=ok. Actual frontend checkHealth via Axios and
  Vite proxy reached the student's Express app and returned a checkedAt date.
  Used ephemeral loopback ports for isolated integration, then closed both
  servers. This validates the app/proxy flow, not database or browser UI.
- Task 3 native .env loading: PASS, yields numeric PORT=5000.
- Task 3 startup rejection: PASS for missing, empty, whitespace-only, abc,
  0, -1, 65536, 70000, fractional 5000.5 and Infinity. Each actual index.js
  subprocess exited with code 1 and the expected configuration error before
  emitting its listening message.
- Task 3 valid configuration: PASS for 1, 5000, 65535 and whitespace-padded
  5000. No real .env edits were needed for negative tests; isolated subprocess
  environments supplied the test values.
- Task 3 real startup: launched actual index.js using --env-file=.env with an
  isolated port override. Direct health and actual Axios/Vite proxy health
  passed. Closed Vite and terminated only the spawned test child afterward.
- Editor synchronization repair: user's screenshot showed a three-line dirty
  env.js buffer despite validated contents on disk. Inspected the actual VS
  Code window using Computer Use, replaced that buffer with validated config,
  and resolved the newer-on-disk save conflict. Also saved the matching
  PORT=5000 buffers in .env and .env.example and resolved their conflicts.
  Final screenshot confirms env.js validation is visible, with no unsaved
  markers remaining. Rechecked saved contents, native .env loading, and all
  ten invalid startup cases: PASS. No application feature or phase changed.
- Task 4 npm test: PASS, 16 checks covering asynchronous connection ordering,
  DB failure/no listener, sanitized driver/listener errors, invalid PORT and
  URI cases, and a credential-free .env.example. Database startup tests use
  controlled mocks and do not send alerts or read production collections.
- Task 4 live Atlas check: PASS, actual mongoose.connect plus database ping;
  closed the test connection afterward. No documents were read or written.
- Verified actual VS Code shows the updated saved index.js and existing user
  development terminal logs database connection before port 5000 listening.
- After task 4 cleanup, frontend production build passed again. Direct health
  on the user's running configured backend at port 5000 and actual frontend
  Axios through an isolated Vite proxy both passed; closed only the temporary
  Vite test server and preserved the user's development process.
- Task 5 npm test: PASS, 26 total (16 startup/config and 10 middleware/HTTP).
  HTTP tests start and close isolated loopback servers and need no real
  database credentials. Exact JSON assertions verify sensitive test details
  and request contents are absent from responses. No new dependency added.
- Phase 1 review after export normalization: npm test PASS (26/26), frontend
  npm run build PASS. Running backend health returned HTTP 200. Frontend
  npm run dev started successfully at http://127.0.0.1:5173/ for QA.
- Browser QA attempted in a separate Brave tab while preserving Atlas. Native
  automation was interrupted by user input/focus changes and did not complete
  navigation to the app. Isolated IAB fallback returned Browser is not available.
  No desktop/mobile visual or interactive browser result is claimed. Core
  setup was verified through earlier HTTP, SSR and real Axios/proxy checks.
- Phase 2 kickoff: npm run build PASS (93 modules); frontend npm test PASS
  (8 tests). Cases cover valid roles, rejected ADMIN input, names, email,
  password confirmation/minimum, bcrypt UTF-8 72-byte limit and login fields.
- Phase 2 SSR checks PASS for /, /login, /register, /workspace, /setup,
  /architecture and 404, all retaining tel:112. Checked masked password fields,
  no ADMIN role option, confirmation/volunteer controls and explicit preview
  notices. SSR is not browser interaction or responsive visual verification.
- User model review: npm test PASS (37/37). Eleven new tests exercise defaults,
  normalization, required identity/hash fields, name/email limits, allowed and
  rejected enum values, nonnegative integer authVersion, JSON redaction, unique
  email index declaration, timestamp paths and omission of a plaintext password
  schema field. Async validation avoids installed Mongoose deprecation warnings.
- Registration: backend npm test PASS (52/52); frontend npm test PASS (14/14)
  and production build PASS. Unit HTTP registration tests mock persistence but
  use real bcrypt. Tests cover allowed types/roles, protected-field injection,
  cost/space-preserving hashing, duplicate precheck and race code, safe DTO,
  Origin/JSON guards, 10-attempt throttling, sanitized failures and no cookies.
- Real Atlas registration integration PASS (5/5): hash persisted and compared,
  default query hides hash, actual unique index rejects duplicates, simultaneous
  POSTs yield one 201/one 409 with one record, volunteer remains unapproved,
  and the real frontend API client handles creation/duplicate feedback.
- The initial integration setup failed on Atlas's DB-name length limit before
  data creation; shortened the generated suffix and reran successfully. Test
  collections were cleaned up and connections/HTTP test listeners closed.
- Windows locked during the final editor synchronization check; no UI input
  was sent after detecting the lock. After the user's unlock reply, synchronized
  controller/model buffers and confirmed both saved files match tested source.
  Explorer shows no unsaved files. No unrelated old-project file was changed.

## Pending decisions and known limitations

- Future model/API/security details remain proposals. User schema and public
  registration are implemented; cookie authentication and approval are pending.
- Current dependencies are installed and locked. Introduce future backend
  dependencies with their guided task or explicit delegation.
- Confirm frontend/backend origins and cookie/CSRF deployment topology before
  authentication; do not assume cross-site cookies work in all browsers.
- Set location freshness/rate limits and retention policy in relevant phases.
- Design contact consent proof before Phase 3. Mock outcomes are simulated.
- Frontend runs with `cd frontend` then `npm run dev`; student backend has
  working health integration and environment-aware start/dev scripts.
- Frontend browser visual/interaction verification remains pending.
- Phase 1 implementation/automated checks complete and Phase 2 approved.
  Visual/mobile browser QA remains an explicit limitation
  and can be done when browser control is available, before product deployment.

## Next step

The editor synchronization is complete. Next feature is login/JWT cookie sessions and logout,
guided step by step with Origin/CSRF/rate-limit rules before frontend activation.
No quizzes or automatic backend generation. Use simple syntax and exports
at the bottom. Do not start Phase 3 without the required approval.
