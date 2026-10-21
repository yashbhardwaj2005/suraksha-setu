# Community-Driven Women Safety

A learning-focused MERN college project for consent-based SOS requests,
verified community volunteers, and authorized live-location sharing.

**Current stage:** Phase 2 approved and in progress. The React frontend foundation is implemented:
workspace, getting-started and architecture routes; responsive shared layout;
reusable UI components; and an actual API health check. The student has
implemented Express startup and `/api/v1/health`; direct HTTP and frontend
Axios/proxy integration passed. Environment configuration and MongoDB startup
are implemented; real Atlas connection/ping passed. JSON parsing and consistent
error middleware are implemented and tested. Phase 1 final review/browser
checks: automated verification passes; browser visual checks remain pending.
Phase 2 adds the product home and login/register form previews. These check
input locally and never submit credentials or create a session. Real
authentication, dashboards, SOS, SMS and GPS are not implemented yet.

Frontend routes: `/` home; `/login` and `/register` form previews;
`/workspace` build status and health check; `/setup` current backend task;
`/architecture` system overview. All retain access to tel:112.

## Run the frontend locally

From the repository root:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173/. For a production build, run `npm run build` from
frontend. Dependency installation has already been completed in this workspace;
`npm ci` is useful for a fresh checkout.

Frontend environment variables are optional locally; see `frontend/.env.example`.
The default API base is `/api/v1`; Vite proxies `/api` to
`http://127.0.0.1:5000`. Only public browser configuration belongs in Vite env
variables. Final production API/cookie configuration is deferred to its phase.

The health check stays **Not checked** until clicked and requires
`GET /api/v1/health` to return HTTP 200 and
`{ "success": true, "data": { "status": "ok" } }`.
An unreachable server or malformed response is shown as an error. A successful
health check does not verify MongoDB or emergency functionality.

## Current backend task

Task 3 completed by Codex with explicit student permission: backend/.env and
.env.example contain PORT=5000; src/config/env.js validates it; index.js imports
the numeric port; dev/start scripts load .env with Node's --env-file flag.
Run `npm run dev` from backend after configuring a real local MONGODB_URI.
Startup now waits for MongoDB; failures stop startup with sanitized messages.
Student's task 4 code was reviewed and corrected on explicit request. The
example environment file contains no credentials. Task 5 was explicitly
delegated to Codex and is complete: 16 KB JSON parser, not-found handler,
and safe 400/404/413/415/500 responses. Phase 1 code review passed and the
student approved Phase 2.
Student owns future backend attempts; Codex may review and correct submitted
work as requested, without skipping phases.

Phase 2 User model at `backend/src/models/user.model.js` is reviewed, corrected
and tested. Current student task: registration endpoint with bcrypt hashing,
explicit allowed input fields, safe responses and duplicate-email handling.
See `docs/progress.md` for requirements. Controllers/routes are not built yet.

Run `npm test` from backend for 37 startup/config, HTTP error and User model tests. They
use controlled mocks and fictional configuration; no Atlas credentials or
real alerts are needed.

## Verification

Production frontend build passed. Server-rendered route smoke checks passed
for all three pages and the 404, including the 112 link. API client checks
covered valid/malformed health responses and timeout feedback. Local Vite
HTTP checks returned 200 for the three routes and the main module. Backend
proxy failure was observed as expected before Express implementation.
After the student's submission, live Express tests confirmed HTTP 200 on
`/health-check` and 404 on the agreed `/health`. An actual Axios request
through Vite confirmed the same mismatch and correct error feedback. Both
temporary test servers were closed. The student then corrected the route;
direct HTTP and actual Axios through Vite proxy passed with the real Express
app. These integration checks used isolated ephemeral loopback ports.
After environment setup, native .env loading, valid port bounds and ten bad
or missing configuration cases passed. Actual index.js startup and the real
Axios/Vite health flow passed again. Temporary test servers were closed.
Task 4: all 16 regression tests passed, and an approved real Atlas connection
and ping passed. No documents were read or written by that database check.
Task 5: all 26 combined tests passed, including real HTTP checks for parsing,
body limits, not-found, unsupported encoding and safe sync/async exceptions.
Frontend `npm test` runs eight client-validation tests. Frontend build and
seven-route SSR checks passed at the Phase 2 kickoff. These do not verify
real registration or browser/mobile interaction; those checks remain pending.

Phase 1 review: exports moved to the end of frontend/backend source modules;
all 26 tests and production build still pass. Browser QA was interrupted by
desktop activity and the isolated preview browser was unavailable. No visual
or mobile browser pass is claimed. The student subsequently approved Phase 2.
Visual/mobile and interactive browser QA remain pending.
User model review: 37 combined backend tests pass, including eleven model
checks with fictional documents. No user records were saved by these tests;
live duplicate-index tests will follow with registration in an isolated DB.

Codex implements the frontend progressively. The student implements the
backend with explanation, small assignments, code review and testing.
Each of the six phases needs explicit approval before proceeding.

- [Permanent development rules](AGENTS.md)
- [Architecture and dependency plan](docs/architecture.md)
- [Proposed API contracts](docs/api-contracts.md)
- [Progress and first backend task](docs/progress.md)

This is an academic prototype, not an official emergency-response service.
It cannot guarantee assistance, message delivery, or background GPS updates.
For emergency services in India, call **112**.
