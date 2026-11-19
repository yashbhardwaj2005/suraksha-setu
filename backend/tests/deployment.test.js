import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, mock, test } from "node:test";
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../src/models/user.model.js";

// Exercise the actual serverless entry without a local .env or listening port.
process.env.VERCEL = "1";
process.env.NODE_ENV = "production";
process.env.MONGODB_URI = "mongodb://example.invalid/deployment_test";
process.env.JWT_SECRET = "fictional-deployment-test-secret-at-least-32-characters";
process.env.FRONTEND_ORIGIN = "https://suraksha-setu-9vq2.vercel.app";
delete process.env.PORT;
delete process.env.COOKIE_SAME_SITE;

const { default: handler } = await import("../api/index.js");
let server;
let baseUrl;
let failDatabase = false;
let user;
const password = "fictional-login-password-123";
const origin = process.env.FRONTEND_ORIGIN;

before(async () => {
    user = new User({ name: "Fictional Student", email: "student@example.invalid", passwordHash: await bcrypt.hash(password, 4) });
    mock.method(mongoose, "connect", async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        if (failDatabase) throw new Error("private-database-details");
        mongoose.connection.readyState = 1;
    });
    mock.method(User, "init", async () => {
        await new Promise(resolve => setTimeout(resolve, 40));
    });
    mock.method(User, "findOne", query => ({ select: async () => query.email === user.email ? user : null }));
    mock.method(User, "findById", async id => id === user.id ? user : null);
    mock.method(User, "updateOne", async () => { user.authVersion += 1; });
    const gateway = express();
    gateway.use(handler);
    server = gateway.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = "http://127.0.0.1:" + server.address().port;
});

after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    mongoose.connection.readyState = 0;
    mock.restoreAll();
});

test("concurrent serverless requests share database and index initialization without PORT", async () => {
    const responses = await Promise.all([fetch(baseUrl + "/api/v1/health"), fetch(baseUrl + "/api/v1/health")]);
    for (const response of responses) {
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.deepEqual(await response.json(), { success: true, data: { status: "ok" } });
    }
    assert.equal(mongoose.connect.mock.callCount(), 1);
    assert.equal(User.init.mock.callCount(), 1);
    await fetch(baseUrl + "/api/v1/health");
    assert.equal(mongoose.connect.mock.callCount(), 1);
    assert.equal(User.init.mock.callCount(), 1);
});

test("database failures return safe JSON and a later invocation can reconnect", async () => {
    const log = mock.method(console, "error", () => {});
    mongoose.connection.readyState = 0;
    failDatabase = true;
    const response = await fetch(baseUrl + "/api/v1/health");
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { success: false, error: { code: "DATABASE_UNAVAILABLE", message: "Database is temporarily unavailable. Please try again later" } });
    assert.equal(log.mock.callCount(), 1);
    assert.ok(!log.mock.calls[0].arguments.join(" ").includes("private-database-details"));
    log.mock.restore();
    failDatabase = false;
    assert.equal((await fetch(baseUrl + "/api/v1/health")).status, 200);
});

test("production login, session restoration, CSRF and logout work through the serverless entry", async () => {
    assert.equal((await fetch(baseUrl + "/api/v1/auth/me")).status, 401);
    const login = await fetch(baseUrl + "/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify({ email: " STUDENT@EXAMPLE.INVALID ", password }),
    });
    assert.equal(login.status, 200);
    assert.equal(login.headers.get("access-control-allow-origin"), origin);
    assert.equal(login.headers.get("access-control-allow-credentials"), "true");
    const sessionHeader = login.headers.getSetCookie()[0];
    assert.match(sessionHeader, /HttpOnly/i);
    assert.match(sessionHeader, /Secure/i);
    assert.match(sessionHeader, /SameSite=Lax/i);
    assert.ok(!sessionHeader.includes("Domain="));
    const receipt = await login.json();
    assert.equal(receipt.data.user.email, user.email);
    assert.equal(receipt.data.user.passwordHash, undefined);
    const sessionCookie = sessionHeader.split(";")[0];
    const me = await fetch(baseUrl + "/api/v1/auth/me", { headers: { Cookie: sessionCookie } });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).data.user.id, user.id);
    const csrf = await fetch(baseUrl + "/api/v1/auth/csrf", { headers: { Cookie: sessionCookie } });
    assert.equal(csrf.status, 200);
    const csrfToken = (await csrf.json()).data.csrfToken;
    const cookie = sessionCookie + "; " + csrf.headers.getSetCookie()[0].split(";")[0];
    const headers = { Cookie: cookie, Origin: origin, "X-CSRF-Token": csrfToken };
    const rejected = await fetch(baseUrl + "/api/v1/auth/logout", { method: "POST", headers: { ...headers, Origin: "https://untrusted.example.invalid" } });
    assert.equal(rejected.status, 403);
    const logout = await fetch(baseUrl + "/api/v1/auth/logout", { method: "POST", headers });
    assert.equal(logout.status, 204);
    assert.match(logout.headers.get("set-cookie"), /suraksha_session=;/);
    assert.equal((await fetch(baseUrl + "/api/v1/auth/me", { headers: { Cookie: sessionCookie } })).status, 401);
});

test("wrong credentials remain a controlled 401 and foreign origins cannot log in", async () => {
    const options = { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email: user.email, password: "wrong-fictional-password" }) };
    const rejected = await fetch(baseUrl + "/api/v1/auth/login", options);
    assert.equal(rejected.status, 401);
    assert.equal(rejected.headers.get("set-cookie"), null);
    assert.equal((await fetch(baseUrl + "/api/v1/auth/login", { ...options, headers: { ...options.headers, Origin: "https://untrusted.example.invalid" } })).status, 403);
});

test("Vercel login throttling distinguishes clients behind the platform proxy", async () => {
    const options = { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, "X-Forwarded-For": "203.0.113.8" }, body: "{}" };
    for (let count = 0; count < 10; count += 1) {
        assert.equal((await fetch(baseUrl + "/api/v1/auth/login", options)).status, 400);
    }
    assert.equal((await fetch(baseUrl + "/api/v1/auth/login", options)).status, 429);
    const otherClient = { ...options, headers: { ...options.headers, "X-Forwarded-For": "203.0.113.9" } };
    assert.equal((await fetch(baseUrl + "/api/v1/auth/login", otherClient)).status, 400);
});
