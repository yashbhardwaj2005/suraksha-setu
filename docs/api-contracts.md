# Proposed API contracts

Status: Phase 2 approved. Authentication contracts remain proposed; only
Phase 1 health/error endpoints are implemented. Phase 2 form previews perform
client validation without sending credentials or claiming real authentication.
Frontend health client and student-written /api/v1/health endpoint implemented.
The initial route mismatch was corrected by the student. Direct HTTP and
actual Axios through Vite proxy now pass with HTTP 200 and agreed JSON fields.
Implement other groups only in their approved phases. REST prefix: `/api/v1`.

## Current Phase 1 health contract

`GET /api/v1/health` returns HTTP 200 and exactly this minimal data shape:

```json
{ "success": true, "data": { "status": "ok" } }
```

This is HTTP liveness, not database readiness. No authentication is needed;
do not expose environment values or secrets. The frontend checks the envelope
and status value, shows malformed responses and network failures honestly,
and does not automatically retry or send any emergency requests. Development
proxy: Vite /api -> http://127.0.0.1:5000/api.

Startup configuration now loads backend/.env through native Node flags and
validates PORT before opening the HTTP listener. Bad configuration produces
a startup failure, not an HTTP response. Health response fields are unchanged.
Normal startup, invalid configuration and real frontend/proxy integration
were checked after this setup change. Initial MongoDB connection now completes
before HTTP listening, and an actual database connection/ping passed. The health
route remains HTTP liveness and does not query MongoDB or guarantee ongoing
database readiness after a later disconnect.

Task 5 implements shared JSON errors: NOT_FOUND (404), INVALID_JSON (400),
PAYLOAD_TOO_LARGE (413), UNSUPPORTED_ENCODING (415), INTERNAL_ERROR (500).
The JSON parser limits bodies to 16 KB. Error middleware sends only fixed
messages, never raw error details, stacks, URLs or request bodies. If headers
have already been sent, it delegates to Express rather than sending twice.
Live isolated HTTP tests cover the error contract, including sync/async 500s;
there are no public debug/error-generation endpoints.

## Shared conventions

### Phase 2 User model and planned account inputs

User model implemented at models/user.model.js and reviewed/tested. Fields: name, email,
passwordHash (select:false), role, accountStatus, verificationStatus,
authVersion and timestamps. Safe user summaries must omit passwordHash and
internal session fields. select:false protects default reads and a toJSON
transform additionally removes passwordHash; lean/raw data still needs the
controller whitelist. Model tests validate index declaration, not live duplicate
insertion/enforcement. Registration is the next student assignment.

Proposed registration body: name, email, password, role (USER or VOLUNTEER).
Password confirmation is client-only and is not stored. Backend normalizes
email/name, validates input, hashes passwords and sets all status/version
defaults. Reject attempts to set ADMIN, passwordHash, approval/account status
or authVersion. No arbitrary req.body spread into a User document.

Proposed password policy: registration minimum 12 characters, maximum 72
UTF-8 bytes for bcrypt; never trim passwords. Backend enforcement is mandatory
before enabling the frontend submit request. Handle duplicate-index errors as
409; unique schema options are not validation or an authorization mechanism.

Registration assignment returns 201 and a safe user summary without automatically
claiming a logged-in session. Login/session responses and CSRF token structure
must be finalized before integration. No auth route exists yet; previews do
not call the current backend's 404 endpoints with entered credentials.

Registration response proposal: { success:true, data:{ user:{ id,name,email,
role,accountStatus,verificationStatus } } }. Invalid input is 400 with code
VALIDATION_ERROR; duplicate normalized email is 409 with code EMAIL_EXISTS,
including concurrent database duplicate-key failures. Reject extra/protected
fields and non-string input before normalization, queries or bcrypt. This
public endpoint does not consume or create a logged-in session. Complete
Origin/rate-limit/CSRF policy for account flows before frontend activation.

- JSON request/response bodies, except bodyless responses. Success:
  `{ "success": true, "data": ... }`. Failure:
  `{ "success": false, "error": { "code": "...", "message": "..." } }`.
- Status codes: 200 read/update, 201 created, 204 logout/delete without a
  response body, 400 invalid input, 401 unauthenticated, 403 forbidden,
  404 absent/inaccessible resource where useful for privacy, 409 conflict,
  429 rate limit, 500 generic server failure. Never expose stack traces.
- Server derives identity from authentication. Do not accept arbitrary owner,
  approval, role escalation or assigned-responder fields from clients.
- Auth proposal: HttpOnly JWT cookie, credentials enabled on the API client,
  CSRF protection on mutations and exact origin allowlisting. Finalize in
  Phase 2 before implementation.
- Dates use ISO 8601 UTC. Phone numbers normalize to +91 followed by a valid
  Indian mobile number; formatting alone does not prove ownership or consent.
- Never include password hashes, cookies, session tokens, or unrestricted
  precise coordinates in responses. Filter fields by role and resource access.

## Endpoints by phase

| Phase | Method and endpoint | Purpose / access |
| --- | --- | --- |
| 1 | GET /health | Public liveness only; no environment, secrets or connection strings |
| 2 | GET /auth/csrf | Issue browser CSRF token using the agreed protection scheme |
| 2 | POST /auth/register | Public signup; only USER or VOLUNTEER; 201 on creation |
| 2 | POST /auth/login | Validate credentials, set session cookie; generic invalid-credentials error |
| 2 | POST /auth/logout | Invalidate session version and clear cookie; 204 |
| 2 | GET /auth/me | Current safe user summary, role and verification status |
| 2 | POST /volunteers/me/verification-request | Volunteer submits for admin review; no automatic approval |
| 2 | GET /admin/volunteer-applications | Admin reviews pending applications |
| 2 | PATCH /admin/volunteer-applications/:userId | Admin records APPROVED/REJECTED with review details |
| 2 | PATCH /admin/users/:userId/status | Admin suspension/reactivation; disallow privilege escalation and revoke affected access |
| 3 | GET /contacts | Owner's contacts only |
| 3 | POST /contacts | Add pending-consent contact; enforce maximum 5 |
| 3 | PATCH /contacts/:contactId | Owner edit; phone changes invalidate old verification/consent |
| 3 | DELETE /contacts/:contactId | Owner delete; 204 |
| 3 | POST /contacts/:contactId/consent-invitations | Owner requests limited, mock-only invitation initially |
| 3 | POST /contact-consents/confirm | Recipient-scoped, expiring single-use proof; confirm consent/verification, never grant coordinate access |
| 3 | POST /contact-consents/revoke | Recipient-scoped revocation; stops future alerts and revokes any later access grants |
| 4 | POST /sos | Authenticated USER activation; validated location and Idempotency-Key required |
| 4 | GET /sos/active | Owner's active SOS, or data=null if none |
| 4 | GET /sos/:sosId | Owner, assigned eligible volunteer or status-only admin; filter fields per role |
| 4 | PATCH /sos/:sosId/cancel | Owner cancellation, conditional transition |
| 5 | PATCH /volunteers/me/availability | Approved active volunteer; explicit availability |
| 5 | PUT /volunteers/me/location | Eligible volunteer updates current GeoJSON point, accuracy and capture time |
| 5 | GET /volunteers/me/alerts | Current eligible nearby open requests on reconnect; approximate distances only |
| 5 | PATCH /sos/:sosId/accept | Eligible candidate, atomic assignment; 409 if already taken/ended |
| 5 | PATCH /sos/:sosId/status | Assigned eligible volunteer; RESPONDING or RESOLVED only |

No public exact-location endpoint. Contact invitation delivery and consent
proof need a separate guided design before Phase 3; the mock simulates the
recipient workflow without claiming real phone verification. Do not expose
invitation secrets or use GET requests to mutate consent. Protected contact
map access is optional later work, not an anonymous map page in this plan.

## SOS activation proposal for Phase 4

Request: `POST /api/v1/sos`, with `Idempotency-Key` scoped to the authenticated
owner, body containing `location` (GeoJSON Point), `accuracy` and `capturedAt`.
Longitude must be finite and between -180 and 180; latitude between -90 and 90.
Reject missing/stale/invalid data under a documented freshness policy. Server
records its receipt timestamp; client clocks alone are not trusted.

Return 201 when created with SOS id, status, timestamp and accurate notification
summary. An identical retry with the same key returns the same result (200)
without new notifications; reusing a key for different input returns 409.
Another active SOS also returns a controlled 409. Store the SOS before contact
notification work, so notification failure leaves a valid SOS response.

Deduplicate logical notification records by SOS/contact/channel. Provider
timeouts may have ambiguous results; do not promise exactly-once external SMS
delivery. Never label a mock result as an actual sent/delivered message.

## Socket events proposed for Phase 5

| Direction | Event | Authorization / content |
| --- | --- | --- |
| Server -> volunteer | sos:nearby | Verified, active, available, connected candidates; id and approximate distance |
| Owner -> server | sos:location:update | Owner of an open SOS; id, point, accuracy, capturedAt; validate each event |
| Server -> assigned volunteer | sos:location:updated | Exact latest point and timestamps only while current authorization holds |
| Server -> permitted participants | sos:status:updated | SOS id and valid current status; no incidental coordinates |
| Server -> participant | sos:access:revoked | Ended SOS or lost permissions; clear location state and stop sharing |

Use acknowledgements and bounded retries where needed, server timestamps to
ignore out-of-order updates, and authorization checks on every message.
Do not let clients pick arbitrary rooms. On reconnect, fetch current state;
do not replay stale emergency/location events blindly. REST stays the source
of truth when a socket status event is missed.
