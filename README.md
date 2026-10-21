# Community-Driven Women Safety

A learning-focused MERN college project for consent-based SOS requests,
verified community volunteers and authorized live-location sharing.

**Current stage: Phase 2 in progress.** Express startup, environment validation,
MongoDB connection, health/error handling, the User model and registration are
implemented. The React registration form calls the real API. Login remains a
local form preview; sessions, dashboards, volunteer approval, SOS, SMS and GPS
are upcoming. Frontend work is implemented progressively within each phase.

Frontend routes: `/` home, `/register` connected signup, `/login` preview,
`/workspace` build status and health check, `/setup` registration walkthrough,
and `/architecture` system overview. All retain access to `tel:112`.

## Run locally

Use Node 24 and two terminals. Dependencies are already installed in this
workspace; run `npm ci` inside each package for a fresh checkout.

In `backend`, create a local `.env` from `.env.example`, set `MONGODB_URI` to
your database connection string, then run:

```powershell
cd backend
npm run dev
```

The server waits for MongoDB and the User email index before listening on
`PORT` (example: 5000). Keep credentials only in the ignored `.env` file.
Startup errors are sanitized and stop the process.

In a second terminal:

```powershell
cd frontend
npm run dev
```

Open http://127.0.0.1:5173/. Vite proxies `/api` to port 5000. The optional
`FRONTEND_ORIGIN` backend setting defaults to `http://127.0.0.1:5173` and must
match the browser origin exactly for signup. Only public browser configuration
belongs in frontend environment variables. Production origins, cookies and
proxy settings still need their deployment review.

## Registration

`POST /api/v1/auth/register` accepts name, email, password and optional role
(`USER` or `VOLUNTEER`). It validates input, normalizes identity, hashes the
password once with bcrypt cost 12, and saves only explicit fields. Passwords
retain spaces and require at least 12 characters and at most 72 UTF-8 bytes.
The unique database index handles concurrent duplicates; responses omit hashes
and internal session fields. Origin/JSON guards and a process-local limit of
10 attempts per 15 minutes apply. Account creation does not sign the user in.

The frontend shows success only after a valid HTTP 201 receipt. A volunteer
account starts unapproved. Login/JWT cookies, CSRF protection for session flows,
logout and role dashboards are the next guided backend work.

## Verification

```powershell
# Inside backend: offline checks, no database credentials needed
npm test

# Inside backend: configured Atlas connection, isolated temporary database
npm run test:integration

# Inside frontend
npm test
npm run build
```

Verified: 52 offline backend tests, 5 real Atlas integration tests, 14 frontend
tests and a production build. Integration tests cover real bcrypt persistence,
unique-index enforcement, concurrent signup, unapproved volunteers and the
actual frontend Axios client. They use fictional records in a random temporary
database, verify its identity before cleanup and remove only its test users
collection. Normal application users are untouched.

Health/startup, HTTP error contracts, frontend proxy integration and earlier
server-rendered route checks also passed. Browser interaction and mobile visual
QA remain pending. The manual health check verifies HTTP liveness, not ongoing
MongoDB readiness or emergency functionality.

Codex owns frontend work. The student writes backend attempts with concise
guidance, review and correction; explicitly delegated steps are implemented by
Codex. Exports stay at the bottom. Phase 3 requires a separate approval.

- [Development rules](AGENTS.md)
- [Architecture](docs/architecture.md)
- [Implemented and proposed API contracts](docs/api-contracts.md)
- [Progress and next task](docs/progress.md)

This is an academic prototype, not an official emergency-response service.
It cannot guarantee assistance, message delivery or background GPS updates.
For emergency services in India, call **112**.
