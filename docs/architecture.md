# Architecture proposal — Phase 1

Status: Phase 1 foundation, Phase 2 User model and public registration are
implemented. Login/session authentication and future models remain proposed.
Date: 2026-10-21.
This document covers future phases for discussion, not authorization to
implement them now. Follow the ownership and phase rules in `../AGENTS.md`.

## How the pieces communicate

```text
React in browser --HTTPS / JSON--> Express API --Mongoose--> MongoDB Atlas
React in browser <--authenticated Socket.IO--> Node HTTP server
Browser geolocation --permission + validated updates--> authenticated server
Express --notification service--> mock SMS provider (initially)
React Leaflet --> OpenStreetMap tiles (later, authorized map screen)
```

React renders pages, forms, status and maps. It never connects directly to
MongoDB or contains database credentials. Axios sends REST requests to
Express. Express authenticates, validates, authorizes and applies business
rules. Mongoose defines document shapes and sends database queries to Atlas.

REST handles durable actions: login, contacts, SOS activation and responder
acceptance. Socket.IO carries time-sensitive events and location updates;
it does not replace the database. Reconnects fetch current authorized state
through REST. Socket.IO does not durably deliver missed server events to
offline clients by default. Never label an offline volunteer as notified.

Browser geolocation requires permission and a secure context in production
(localhost is suitable for development). During an active SOS, the owner
sends coordinates with accuracy and capture time. The server validates the
point and freshness, stores the latest point with server receipt time, and
forwards it only to the assigned, currently authorized responder. Maps show
the last update and stale state. Stop watches, clear recipient state, revoke
socket membership and deny further reads when the SOS ends. No location trail
is needed. Closing or suspending the page can stop updates.

For matching, query verified, available, active volunteers with fresh
locations within a configurable 5,000 metres. Store GeoJSON as
`{ type: 'Point', coordinates: [longitude, latitude] }` and add a `2dsphere`
index. Alert candidates with approximate distance, without exact coordinates.
An atomic conditional update assigns the first eligible responder; other
accept attempts fail with a conflict. Recheck eligibility at acceptance.

Persist SOS first. Then create deduplicated notification attempts for
consenting, verified contacts. The mock SMS service simulates outcomes and
never contacts real numbers. SMS failure cannot roll back an SOS. Retry only
through controlled attempts; a provider timeout is not proof of failure or
delivery. Real providers and any protected temporary map links come later,
after costs, Indian requirements and access controls are discussed. The
initial SMS needs no coordinates or map link.

## Proposed documents and relationships

| Document | Main fields | Relationships and constraints |
| --- | --- | --- |
| User | name, normalized email, passwordHash, role, accountStatus, authVersion, embedded volunteer verification/review, availability, latest location and timestamp | Roles USER/VOLUNTEER/ADMIN. Unique email. Public registration cannot grant ADMIN or APPROVED status. Volunteer location gets a 2dsphere index; omit it until known. |
| EmergencyContact | ownerId, name, relationship, normalized phone, consentStatus, verificationStatus, consent timestamps, optional hashed expiring invitation token | Many contacts per user, maximum 5. Consent and phone verification are distinct. Only eligible contacts receive alerts; do not let owners assert someone else's consent. Enforce the limit under concurrent writes. |
| SOS | userId, status, isOpen, latestLocation, accuracy, capturedAt, receivedAt, assignedVolunteerId, requestKey, timestamps | One owner, zero or one assigned responder. Partial unique index on userId where isOpen=true; unique owner/requestKey. Terminal states set isOpen=false atomically. |
| NotificationAttempt | sosId, contactId, channel, provider, status, attemptCount, providerMessageId, timestamps, sanitized failureCode | Many per SOS; unique sos/contact/channel for logical deduplication. Mock outcomes are explicitly marked; provider acceptance is not confirmed delivery. No raw message/location logs. |

Keep volunteer fields in User initially instead of adding a separate profile
collection. This keeps role, account status and eligibility easy to review.
Do not implement indexes or schemas before their guided backend phase.
Retention periods and purge jobs must be settled before deployment; avoid
unnecessary historical location data and remove precise points when no longer
needed. Do not use automatic TTL deletion on whole contact/user documents.

## Proposed SOS lifecycle

```text
ACTIVE -> ACCEPTED -> RESPONDING -> RESOLVED
ACTIVE, ACCEPTED, RESPONDING -> CANCELLED (owner)
```

Only the eligible assigned volunteer advances ACCEPTED -> RESPONDING ->
RESOLVED. RESOLVED and CANCELLED are terminal. All transitions are conditional
on current database state. No volunteer match leaves the SOS ACTIVE with an
honest warning and access to 112; it must not imply dispatch.

## Authentication and browser security proposal

- bcrypt hashes passwords; JWTs identify authenticated sessions, not blanket
  permission to access resources. Fetch current account status/role for
  sensitive actions. Never trust role, owner or assignment supplied by clients.
- Prefer a short-lived JWT in an HttpOnly cookie, Secure over production HTTPS.
  Avoid persistent bearer tokens in localStorage. No refresh-token system in
  the initial MVP. Increment a stored authVersion at logout to invalidate old
  tokens (this simple design signs the user out on all devices).
- Use an explicit CORS origin allowlist plus credentials. CORS is a browser
  access policy, not authentication or CSRF protection.
- For cookie authentication, validate Origin and use a session-bound CSRF
  token on state-changing REST requests. No state changes via GET. Design
  cookie settings and socket handshake Origin checks with the deployment
  topology before Phase 2. Cross-site cookies may require SameSite=None;
  browser third-party cookie restrictions make same-site custom domains or
  a same-origin proxy preferable for the final deployment.
- Verify socket identity and per-event authorization, reject arbitrary room
  joins and revoked sessions, and disconnect invalidated sockets. Restrict
  rooms on SOS assignment and ending, even when a JWT has not expired.
- Admin sees necessary operational status, not unrestricted precise locations.
  No anonymous coordinate endpoints or public coordinate-bearing URLs.
- Rate limits and input limits apply to auth, contact invitations, SOS and GPS.
  Frontend route guards are navigation aids; backend checks enforce security.

## Planned folder responsibilities

```text
frontend/
  src/
    components/   # reusable buttons, cards, inputs and feedback
    pages/        # route screens, added in their respective phases
    layouts/      # shared navigation and page frames
    hooks/        # reusable client behaviour, GPS later
    context/      # auth state later
    services/     # Axios API client; socket client later
    utils/        # small formatting/validation helpers
    App.jsx
    main.jsx
  public/
  package.json
backend/          # student work plus explicitly delegated/reviewed Codex changes
  src/
    controllers/  # request/response handlers
    models/       # Mongoose schemas
    routes/       # endpoint declarations
    middlewares/  # auth, authorization, validation, error handling
    services/     # matching and modular notifications later
    sockets/      # socket authentication/events later
    utils/        # small shared helpers
    config/       # environment validation and database connection
    app.js        # configure Express without opening a network port
    index.js      # connect dependencies and start HTTP server
  package.json
docs/
```

The tree is the target structure. Frontend components, pages, layouts, hooks,
services, App.jsx and main.jsx now exist. Other directories are added when
needed; backend now contains the student-created package/lockfile, Express
dependency, src/app.js and src/index.js. The student corrected the initial
health route naming mismatch; /api/v1/health passed direct and frontend
Axios/proxy integration. At the student's explicit request, Codex implemented
task 3 environment setup: native --env-file loading in dev/start scripts,
src/config/env.js validation and a numeric PORT import in index.js. Missing,
blank, noninteger or out-of-range ports throw before the listener is opened.
Actual startup and real Axios/proxy health checks passed using isolated ports.
No dependency was added. This exception does not transfer backend ownership.

## Reviewed MongoDB startup implementation

Student installed Mongoose and wrote db.js; on explicit request Codex corrected
the submitted code. env.js now also validates/exports MONGODB_URI without
printing it. db.js awaits mongoose.connect with serverSelectionTimeoutMS=5000
and lets rejection propagate. index.js awaits connectDB before app.listen;
startup and listener failures log generic messages and exit nonzero. The
selection timeout is not a strict upper bound on DNS resolution time.

The real URI was removed from .env.example; only .env contains credentials.
The real configured Atlas connection and ping passed with approved networking.
Sixteen built-in Node regression tests verify setup/error/ordering behaviour;
the startup unit tests use controlled database and listener mocks. Real HTTP
health is checked separately. No model/business logic or emergency feature
was implemented in that task.

## Phase 1 request/error middleware

At the student's explicit request, Codex implemented task 5 with simple named
functions and if statements. The order in app.js is express.json (16kb limit),
routes, notFound, errorHandler. notFound sends static JSON 404; errorHandler
has four arguments, safely maps body-parser errors to 400/413/415 and uses a
generic 500 otherwise. It delegates when headers were already sent. No raw
errors, submitted bodies or request URLs are included in JSON responses.
No AppError class, utility framework or dependency was introduced.

Ten middleware tests plus sixteen startup tests pass. HTTP tests bind isolated
loopback servers, exercise the actual app and middleware, and close them.
Sync/async exception routes exist only in a separate test app. Phase 1 browser
verification remained pending at that checkpoint. The student subsequently
approved Phase 2; the current kickoff status is recorded below.

## Phase 1 review and coding convention

All existing application modules now put exports after their declarations,
as requested by the student; imports and exported names are unchanged.
The 26 backend tests and frontend build passed after normalization. Backend
health and frontend startup are verified. Browser navigation/visual checking
was interrupted by desktop activity and the isolated IAB fallback was not
available, so browser/mobile visual QA remains unverified. Phase 1 code and
automated review are ready for the user's completion checkpoint. Phase 2
backend authentication and role dashboards were not started at that checkpoint.
Separate app creation from server startup so later tests can exercise Express
without starting the production listener. Node's HTTP server will host both
Express and Socket.IO in Phase 5.

## Dependency plan: introduce only at the relevant phase

| When | Frontend dependency | Purpose |
| --- | --- | --- |
| Phase 1 | react, react-dom | Components and browser rendering |
| Phase 1 development | vite, @vitejs/plugin-react | Development server, React tooling and production build |
| Phase 1 development | tailwindcss, @tailwindcss/vite | Consistent utility styles through the Vite plugin |
| Phase 1 | react-router-dom | Page routing and shared layouts |
| Phase 1 | axios | Central API client with consistent errors and cookie configuration |
| Phase 5 | socket.io-client | Authenticated real-time updates |
| Phase 5 | react-leaflet, leaflet | Authorized location map and OpenStreetMap attribution |

| When | Backend dependency | Purpose |
| --- | --- | --- |
| Phase 1 | express | HTTP endpoints and middleware |
| Phase 1 | mongoose | MongoDB connection and document models |
| Phase 1 | cors | Explicit allowed frontend origins |
| Phase 2 | bcrypt, jsonwebtoken | Password hashing and JWT signing/verification |
| Phase 2 | cookie-parser | Parse cookies for the proposed authentication design |
| Phase 2 onward | helmet, express-rate-limit | Security headers and endpoint abuse limits |
| When HTTP tests are introduced | supertest (development) | Exercise the Express app through HTTP assertions |
| Phase 5 | socket.io | Authenticated server events and rooms |

Current local tools: Node v24.13.1 and npm 11.8.0, observed 2026-10-21.
Use Node's native `--watch`, `--env-file` and `node:test` where suitable;
nodemon, dotenv and a separate test runner are unnecessary initially. Browser
geolocation and the mock SMS adapter need no extra npm package. Recheck
compatible package versions before actual installation.

## Implemented Phase 1 frontend

- React/Vite with Tailwind's Vite plugin, React Router and Axios installed;
  exact dependency resolution is recorded in frontend/package-lock.json.
- Routes: `/` (development workspace), `/setup` (current backend assignment),
  `/architecture`, and a catch-all 404. These are Phase 1 setup screens, not
  the Phase 2 product landing page or role dashboards.
- Responsive navigation, shared page frame, reusable cards/buttons/badges,
  local SVG icons, keyboard focus/skip link and reduced-motion styles.
- All screens expose tel:112 and make the academic/development stage clear.
- Axios uses VITE_API_BASE_URL or /api/v1, credentials and an eight-second
  timeout. A manual, cancellable health check validates the exact response
  envelope before showing API reachable. No auth endpoints or CSRF are
  implemented yet; finalize them before adding mutations.
- Vite proxies /api to http://127.0.0.1:5000 for local development. This is
  development routing, not production CORS or authentication configuration.
- No sockets, map packages, GPS watches, demo people, fabricated status
  statistics, or emergency activation functionality were added.
- Frontend build, server-rendered route checks, API adapter smoke checks and
  local HTTP serving checks passed. Browser visual/interaction QA is pending
  because the connected browser inventory was empty.

## Phase 2 kickoff

Student explicitly approved Phase 2. Product home is now /; login/register
previews live at /login and /register; the existing developer workspace is
/workspace. Labelled fields, password visibility, confirmation, role choices
and client validation are implemented. Submit checks locally only; it sends
no credentials and clears password fields after a valid preview submission.
No session, dashboard access or successful authentication is fabricated.

The first student task is models/User.js with name, email, passwordHash, role,
accountStatus, flat verificationStatus, authVersion and timestamps. Keeping
verificationStatus flat makes this initial schema easier to read. Admin review
metadata is deferred to its later Phase 2 assignment. Hashing and controllers
are not implemented in this task; passwordHash never means storing plaintext.

Backend authorization will enforce public USER/VOLUNTEER signup, server-owned
status fields and administrator-only verification. Planned auth flow remains
short-lived HttpOnly cookie JWT, server session-version checks, same-origin
development requests through Vite, and CSRF/Origin validation on mutations.
No localStorage bearer token or refresh-token system is introduced. Cookie,
CSRF, production-origin and auth failure contracts must be finalized with the
student before that backend assignment and frontend API integration.

Proposed registration password policy: at least 12 characters and at most 72
UTF-8 bytes, without trimming passwords. The byte limit matches bcrypt's input
limit and is checked client-side now; backend enforcement is still required.
Login requires credentials without applying registration-only name/role checks.
Client validation is feedback only, not a backend security boundary.

Eight validation tests, production build and seven-route SSR checks pass.
Browser/mobile visual and interaction checks remain pending. Role dashboards,
protected routes, real account creation and volunteer approval are not built.

References: https://mongoosejs.com/docs/validation.html and
https://github.com/kelektiv/node.bcrypt.js#security-issues-and-concerns.

### User model review (before registration)

Student submitted backend/src/models/user.model.js; Codex corrected it with
explicit authorization. This lowercase dotted filename is retained for their
familiar style. The actual schema now matches the required fields/defaults,
normalizes name/email, validates basic email/lengths and integer authVersion,
and declares the unique email index. passwordHash has select:false and a
simple named toJSON transform removes it from serialized documents. Explicit
response whitelists are still required; raw/lean results bypass that protection.

Eleven offline model tests pass alongside the existing 26 tests. Async
document.validate is used because validateSync emits a deprecation warning in
the installed Mongoose. No model documents were persisted by these tests;
actual unique-index enforcement is deferred to isolated registration tests.
Next student task: registration with bcrypt, explicit input/role allowlisting,
server-controlled status fields and safe 201/400/409 responses. No JWT/session
issuance or frontend auth activation is part of that assignment.

## Implemented Phase 2 registration

The student explicitly delegated registration after attempting the controller.
This section supersedes the kickoff preview/registration-pending notes above.
The model remains backend/src/models/user.model.js. New dependencies are
bcrypt (password hashing) and express-rate-limit (request throttling).
JWT/cookie-parser are not installed for this task; HTTP tests use node:test
and real loopback HTTP rather than requiring supertest.

Request flow: 16 KB JSON parser -> /api/v1/auth router -> registrationGuard
-> registrationLimiter -> register controller -> User model/MongoDB -> safe
201 receipt. Errors use the existing central handler. Exports stay at module
ends; simple named functions and ordinary if statements keep the flow readable.

The controller accepts only name/email/password/optional role, validates before
DB/hash work, trims name, lowercases/normalizes email, and preserves password
spaces. Password policy is 12 characters minimum and 72 UTF-8 bytes maximum.
It hashes once with bcrypt cost 12; the model has no pre-save hashing hook.
Only explicit fields reach User.create. Public role is USER or VOLUNTEER;
protected status/version/hash input and ADMIN are rejected. New volunteers
remain NOT_REQUESTED. Responses return only id/name/email/role/accountStatus/
verificationStatus. No cookies, sessions or approval are issued.

db.js now awaits User.init after connecting and before the listener starts.
The unique email index handles races; both the preliminary duplicate lookup
and duplicate-key catch return controlled 409 responses. Failed index readiness
prevents startup. Real concurrent-signup tests prove one account is persisted.

The guard requires application/json and checks an exact Origin against optional
FRONTEND_ORIGIN (default http://127.0.0.1:5173). Origin-less CLI requests are
allowed unless Fetch Metadata says cross-site. A process-local limiter allows
10 attempts per IP in 15 minutes. Shared storage/trusted proxy settings need
deployment review. Session-bound CSRF for upcoming login/logout/authenticated
mutations is still required; registration neither reads nor creates sessions.

Frontend /register uses the real Axios service with explicit request fields,
loading/abort handling and safe error feedback. It confirms creation only from
a validated 201 response and clears passwords on success. Network timeouts are
shown as unconfirmed because creation may have completed. /login remains a
local preview. No session state or bearer token is fabricated or persisted.

Verification: 52 offline backend tests, 14 frontend tests, production build,
and 5 isolated real Atlas integration checks pass. Live tests verify persisted
bcrypt hashes, hidden default hash queries, unique index/races, unapproved
volunteers and actual frontend Axios roundtrips. They use a generated temporary
database, assert its exact identity before cleanup, remove only its users
collection, then close HTTP/database connections. Browser/mobile interaction
and visual QA remain pending.

The controller and current-project model's unsaved VS Code buffers were synced
with tested source after the user unlocked Windows. A duplicate model hash hook
was removed. Saved disk equality and no unsaved-file markers were verified.
Login/JWT sessions, logout, protected dashboards and volunteer approval are
the next guided Phase 2 tasks; Phase 3 has not been approved.

## Official references checked during planning

- https://vite.dev/guide/
- https://expressjs.com/en/starter/installing/
- https://www.mongodb.com/docs/manual/geospatial-queries/
- https://socket.io/docs/v4/delivery-guarantees/
- https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies
- https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- https://nodejs.org/api/cli.html
