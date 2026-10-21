import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/user.model.js";
import { api } from "../../frontend/src/services/api.js";
import { registerAccount, getRegistrationError } from "../../frontend/src/services/auth.service.js";

// Use the configured cluster, but never its application database/collection.
const databaseName = "community_safety_test_" + randomUUID().replaceAll("-", "").slice(0, 12);
let connectionUri;
try {
    connectionUri = new URL(process.env.MONGODB_URI);
} catch {
    throw new Error("A valid local MONGODB_URI is required for isolated integration tests");
}
connectionUri.pathname = "/" + databaseName;
let server;
let baseUrl;

function input(email) {
    return { name: "Fictional Integration User", email: email, password: "fictional-password-123" };
}

async function register(body) {
    return fetch(baseUrl + "/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

before(async () => {
    try {
        await mongoose.connect(connectionUri.toString(), { serverSelectionTimeoutMS: 5000 });
        assert.equal(mongoose.connection.name, databaseName);
        await User.init();
        server = app.listen(0, "127.0.0.1");
        await once(server, "listening");
        baseUrl = "http://127.0.0.1:" + server.address().port;
    } catch {
        throw new Error("Isolated registration setup failed. Check network access and test database permissions.");
    }
});

after(async () => {
    try {
        if (server) await new Promise((resolve) => server.close(resolve));
        if (mongoose.connection.readyState === 1) {
            if (mongoose.connection.name !== databaseName || !databaseName.startsWith("community_safety_test_")) {
                throw new Error("Refused cleanup outside the generated test database");
            }
            // Delete only this run's users collection inside its generated DB.
            const exists = await mongoose.connection.db.listCollections({ name: "users" }).hasNext();
            if (exists) await mongoose.connection.db.collection("users").drop();
        }
    } catch {
        throw new Error("Isolated test collection cleanup failed. Check test database permissions.");
    } finally {
        await mongoose.disconnect();
    }
});

test("real registration persists a bcrypt hash and normalized identity", async () => {
    const data = input("  REAL-FLOW@EXAMPLE.INVALID  ");
    const response = await register(data);
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("set-cookie"), null);
    const safe = (await response.json()).data.user;
    const stored = await User.findOne({ email: "real-flow@example.invalid" }).select("+passwordHash");
    assert.ok(stored);
    assert.equal(await bcrypt.compare(data.password, stored.passwordHash), true);
    assert.equal(bcrypt.getRounds(stored.passwordHash), 12);
    assert.equal(safe.passwordHash, undefined);
    assert.equal(safe.authVersion, undefined);
    const normallySelected = await User.findOne({ email: "real-flow@example.invalid" });
    assert.equal(normallySelected.passwordHash, undefined);
});

test("real database unique index rejects duplicate email", async () => {
    const response = await register(input("REAL-FLOW@example.invalid"));
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error.code, "EMAIL_EXISTS");
    const original = await User.findOne({ email: "real-flow@example.invalid" }).select("+passwordHash");
    await assert.rejects(() => User.create({
        name: "Fictional Duplicate", email: original.email, passwordHash: original.passwordHash,
    }), (error) => error.code === 11000);
});

test("simultaneous registration creates exactly one account", async () => {
    const data = input("concurrent@example.invalid");
    const responses = await Promise.all([register(data), register(data)]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
    assert.equal(await User.countDocuments({ email: data.email }), 1);
});

test("real volunteer signup keeps verification unapproved", async () => {
    const response = await register({ ...input("volunteer@example.invalid"), role: "VOLUNTEER" });
    assert.equal(response.status, 201);
    const stored = await User.findOne({ email: "volunteer@example.invalid" });
    assert.equal(stored.role, "VOLUNTEER");
    assert.equal(stored.verificationStatus, "NOT_REQUESTED");
    assert.equal(stored.authVersion, 0);
});

test("actual frontend client creates an account and handles duplicate feedback", async () => {
    const originalBaseUrl = api.defaults.baseURL;
    const originalOrigin = api.defaults.headers.common.Origin;
    api.defaults.baseURL = baseUrl + "/api/v1";
    api.defaults.headers.common.Origin = process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5173";
    const values = { ...input("frontend-roundtrip@example.invalid"), role: "USER" };
    try {
        const user = await registerAccount(values);
        assert.equal(user.email, values.email);
        assert.equal(user.role, "USER");
        assert.equal(user.passwordHash, undefined);
        await assert.rejects(() => registerAccount(values), (error) => {
            assert.equal(error.response.status, 409);
            assert.match(getRegistrationError(error), /already exists/);
            return true;
        });
    } finally {
        api.defaults.baseURL = originalBaseUrl;
        if (originalOrigin === undefined) delete api.defaults.headers.common.Origin;
        else api.defaults.headers.common.Origin = originalOrigin;
    }
});
