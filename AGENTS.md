# Project development rules

## Purpose and ownership

This is a learning-focused MERN college project: Community-Driven Women Safety.
Codex owns the React frontend and may implement it progressively within the
current approved phase. The student owns the Express backend. Codex teaches,
reviews actual student code, helps debug, and guides testing.

- Never automatically generate backend controllers, routes, middleware,
  services, models, sockets, or business logic.
- Ask before changing any backend file, including setup files. Basic backend
  boilerplate requires permission. Never silently overwrite student code.
- Explain concepts before implementation. Assign one small backend task,
  wait for the student to implement it, review it, explain improvements,
  and help test it. A completed task submission allows review and the next
  practical assignment; do not require conceptual quizzes to proceed.
- When stuck, offer hints first, then pseudocode. Supply full backend code
  only on explicit request.
- Initial handoff is architecture and the first backend assignment; wait for
  the student's response before scaffolding application code.

## Communication preference (updated 2026-10-21)

The student has limited time and explicitly asked to stop asking questions
and move to practical work. Keep explanations brief, skip understanding
quizzes, and give one concrete backend assignment after reviewing submitted
work. Continue authorized frontend work independently within the current approved phase.
This does not authorize Codex to write backend files or skip phase checkpoints.

The student requires all exports at the bottom of each module. Declare
functions/constants first, then use export default name or export { names }
as the last statements. Apply this convention to frontend and backend code.

### Explicit exception for environment setup

After attempting task 3, the student explicitly asked Codex to implement this
environment-configuration step. Codex may write the port configuration,
backend .env/.env.example and startup scripts and verify their behaviour.
This is permission for this setup task only. Student ownership of backend
business logic and all phase checkpoints remains in effect.

### Permission to correct submitted backend code

The student subsequently requested senior review, professional cleanup and
direct error correction of their submitted backend work. Codex may make
focused fixes and regression tests to submitted backend attempts, including models,
with a brief explanation. Review their attempt first, preserve secrets and
avoid unrelated rewrites. This does not authorize generating future backend
business logic before the student attempts it or skipping phase checkpoints.

### Explicit exception for task 5 middleware

The student explicitly requested Codex to implement Phase 1 request/error
middleware because this concept is new to them. Implement notFound,
errorHandler, JSON parsing, app wiring and relevant tests. Use simple named
functions and straightforward if statements; avoid unnecessary classes,
helpers or advanced syntax. Explain briefly after verifying the result.
Future feature business logic still follows the student-first workflow.

When a student reports edits are missing in VS Code, distinguish saved disk
contents from dirty editor buffers. Do not repeat a line-number claim based
only on disk when a screenshot contradicts it. Reconcile only the authorized
files, handle save conflicts, and verify the visible saved state.

## Six phases; no skipping

Phase 2 was explicitly approved by the student on 2026-10-21 with "start
phase 2". Begin authentication frontend work and the student-written User
model task. This approval does not authorize Phase 3 or blanket generation
of backend authentication/business logic.

1. Setup and architecture: frontend foundation; student-written Express
   startup, environment configuration, database connection, error handling,
   and health endpoint.
2. Authentication, role dashboards, volunteer verification and admin review.
3. Emergency contacts, ownership, consent and mock notifications.
4. SOS creation, cancellation, lifecycle, idempotency and access to 112.
5. Geospatial matching, Socket.IO, atomic volunteer assignment and live GPS.
6. Integration, security checks, testing, deployment and documentation.

Do not start the next phase without explicit student approval. Every phase
needs explanation, architecture discussion, frontend work, guided backend
work, testing, code review and a completion checkpoint. Phase 1 is incomplete
until both development environments have been verified.

## Stack and scope

Use React, Vite, Tailwind CSS, React Router, Axios, Node.js, Express ES
modules, MongoDB/Mongoose, JWT, bcrypt, Socket.IO, React Leaflet and OSM.
Introduce dependencies only when needed and explain them before asking the
student to install them. Keep a modular MVC structure without unnecessary
abstraction, technologies, dependencies, or unrelated features.

## Security, privacy and honest status

- This is an academic prototype, not a dependable emergency service.
- Always make `tel:112` accessible in the application. Do not claim SOS
  automatically contacts police or guarantees rescue or alert delivery.
- Use fictional test data and a mock SMS provider. No real emergency messages
  in tests. Explain costs and applicable Indian requirements before any
  real-provider activation.
- Authenticate and authorize every protected REST request and socket event.
  Client route guards alone are insufficient.
- Volunteer trust requires admin approval, not just verified email. Exclude
  unavailable, stale-location, suspended and inactive volunteers.
- Never publicly expose exact coordinates. Only the owner and appropriately
  authorized recipients may access them. Admin status access does not imply
  permission to inspect exact locations.
- Revoke live-location access at cancellation or resolution, including socket
  rooms and subsequent API requests. Keep only the most recent needed point.
- Track timestamps and stale/disconnected states. Browser GPS has no reliable
  continuous background operation. Do not imply otherwise.
- Prevent duplicate active SOS records and duplicate alert attempts. Accept
  one responder using an atomic database operation.
- Persist the SOS even if notifications fail. Distinguish queued, attempted,
  mock outcomes, provider acceptance, and confirmed delivery.
- Emergency contacts require consent and appropriate verification. Keep all
  map access protected, scoped, temporary and revocable.
- Do not log secrets, JWTs, passwords, or sensitive coordinates. Never commit
  credentials. Never put backend secrets in Vite environment variables.
- Do not claim functionality works without tests. Distinguish demo data from
  backend results. Document limits and untested behavior.

## Documentation

Maintain `docs/architecture.md`, `docs/api-contracts.md`, and
`docs/progress.md` with phase, decisions, contract status, pending work,
known issues, checks actually run, and next task. Do not store private data.
Contracts and models are proposals until discussed; documenting them does
not authorize backend implementation or advancing a phase.
