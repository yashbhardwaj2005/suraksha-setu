import assert from "node:assert/strict";
import { once } from "node:events";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import bcrypt from "bcrypt";
import app from "../src/app.js";
import User from "../src/models/user.model.js";
import { registrationLimiter } from "../src/routes/auth.routes.js";

let server;
let baseUrl;
let users;

function registrationData() {
    return { name: "Fictional Student", email: "student@example.invalid", password: "fictional-password-123" };
}

async function postRegistration(body, headers = {}) {
    return fetch(baseUrl + "/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
    });
}

before(async () => {
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = "http://127.0.0.1:" + server.address().port;
});

after(async () => {
    await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    });
});

beforeEach(() => {
    users = new Map();
    registrationLimiter.resetKey("127.0.0.1");
    mock.method(User, "exists", async (query) => users.has(query.email));
    mock.method(User, "create", async (data) => {
        const user = new User(data);
        await user.validate();
        users.set(user.email, user);
        return user;
    });
});

afterEach(() => {
    mock.restoreAll();
});

test("registration hashes the password, normalizes identity and returns only safe fields", async () => {
    const input = registrationData();
    input.name = "  Fictional Student  ";
    input.email = "  STUDENT@EXAMPLE.INVALID  ";
    const response = await postRegistration(input);
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("set-cookie"), null);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.deepEqual(Object.keys(body.data.user).sort(), ["id", "name", "email", "role", "accountStatus", "verificationStatus", "volunteerAvailable"].sort());
    assert.equal(body.data.user.name, "Fictional Student");
    assert.equal(body.data.user.email, "student@example.invalid");
    assert.equal(body.data.user.role, "USER");
    assert.equal(body.data.user.accountStatus, "ACTIVE");
    assert.equal(body.data.user.verificationStatus, "NOT_REQUESTED");
    const stored = users.get("student@example.invalid");
    assert.notEqual(stored.passwordHash, input.password);
    assert.equal(bcrypt.getRounds(stored.passwordHash), 12);
    assert.equal(await bcrypt.compare(input.password, stored.passwordHash), true);
    assert.equal(JSON.stringify(body).includes(input.password), false);
    assert.equal(JSON.stringify(body).includes(stored.passwordHash), false);
});

test("volunteers register without being approved", async () => {
    const response = await postRegistration({ ...registrationData(), role: "VOLUNTEER" });
    assert.equal(response.status, 201);
    const user = (await response.json()).data.user;
    assert.equal(user.role, "VOLUNTEER");
    assert.equal(user.verificationStatus, "NOT_REQUESTED");
});

test("normalized duplicate email returns 409 without hashing/creating again", async () => {
    assert.equal((await postRegistration(registrationData())).status, 201);
    const response = await postRegistration({ ...registrationData(), email: " STUDENT@EXAMPLE.INVALID " });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error.code, "EMAIL_EXISTS");
    assert.equal(User.create.mock.callCount(), 1);
});

test("a database duplicate-key race returns safe 409", async () => {
    User.create.mock.mockImplementation(async () => {
        const error = new Error("private-duplicate-details");
        error.code = 11000;
        throw error;
    });
    const response = await postRegistration(registrationData());
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.error.code, "EMAIL_EXISTS");
    assert.ok(!JSON.stringify(body).includes("private-duplicate"));
});

test("bad input types and limits are rejected before database calls", async () => {
    const cases = [
        {}, [], null,
        { ...registrationData(), name: "A" },
        { ...registrationData(), name: "x".repeat(81) },
        { ...registrationData(), email: "not-an-email" },
        { ...registrationData(), email: { $ne: null } },
        { ...registrationData(), name: 123 },
        { ...registrationData(), password: 123 },
        { ...registrationData(), password: "too-short" },
        { ...registrationData(), password: "x".repeat(73) },
        { ...registrationData(), password: "🔒".repeat(19) },
        { ...registrationData(), role: "ADMIN" },
        { ...registrationData(), role: "user" },
        { ...registrationData(), role: null },
    ];
    for (const input of cases) {
        registrationLimiter.resetKey("127.0.0.1");
        const response = await postRegistration(input);
        assert.equal(response.status, 400);
        assert.equal((await response.json()).success, false);
    }
    assert.equal(User.exists.mock.callCount(), 0);
    assert.equal(User.create.mock.callCount(), 0);
});

test("server-owned and unknown fields cannot be injected", async () => {
    for (const field of ["passwordHash", "accountStatus", "verificationStatus", "authVersion", "__proto__"]) {
        const response = await postRegistration({ ...registrationData(), [field]: "untrusted" });
        assert.equal(response.status, 400);
        assert.equal((await response.json()).error.code, "VALIDATION_ERROR");
    }
    assert.equal(User.exists.mock.callCount(), 0);
});

test("unknown browser origins and cross-site requests are rejected", async () => {
    let response = await postRegistration(registrationData(), { Origin: "https://untrusted.example.invalid" });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, "ORIGIN_NOT_ALLOWED");
    response = await postRegistration(registrationData(), { "Sec-Fetch-Site": "cross-site" });
    assert.equal(response.status, 403);
    assert.equal(User.exists.mock.callCount(), 0);
});

test("configured frontend Origin is allowed", async () => {
    const origin = process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5173";
    const response = await postRegistration(registrationData(), { Origin: origin });
    assert.equal(response.status, 201);
});

test("HTML form submissions are rejected without querying users", async () => {
    const response = await fetch(baseUrl + "/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "name=Fictional&email=student%40example.invalid&password=fictional-password",
    });
    assert.equal(response.status, 415);
    assert.equal((await response.json()).error.code, "JSON_REQUIRED");
    assert.equal(User.exists.mock.callCount(), 0);
});

test("unexpected database failures return generic 500", async () => {
    User.exists.mock.mockImplementation(async () => { throw new Error("private-database-details"); });
    const response = await postRegistration(registrationData());
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
});

test("model validation errors return generic validation feedback", async () => {
    User.create.mock.mockImplementation(async () => {
        const error = new Error("private-validation-input");
        error.name = "ValidationError";
        throw error;
    });
    const response = await postRegistration(registrationData());
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.message, "Registration details are invalid");
});

test("password spaces are preserved when hashing", async () => {
    const password = "  fictional password  ";
    const response = await postRegistration({ ...registrationData(), password: password });
    assert.equal(response.status, 201);
    const stored = users.get("student@example.invalid");
    assert.equal(await bcrypt.compare(password, stored.passwordHash), true);
    assert.equal(await bcrypt.compare(password.trim(), stored.passwordHash), false);
});

test("registration is limited to 10 attempts per IP per window", async () => {
    for (let count = 0; count < 10; count += 1) {
        assert.equal((await postRegistration({})).status, 400);
    }
    const response = await postRegistration({});
    assert.equal(response.status, 429);
    assert.equal((await response.json()).error.code, "RATE_LIMITED");
    assert.ok(Number(response.headers.get("retry-after")) > 0);
});

test("GET never creates an account", async () => {
    const response = await fetch(baseUrl + "/api/v1/auth/register");
    assert.equal(response.status, 404);
    assert.equal(User.create.mock.callCount(), 0);
});
