import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import User from "../src/models/user.model.js";
import EmergencyContact from "../src/models/contact.model.js";
import SOS from "../src/models/sos.model.js";
import { sessionSecret } from "../src/config/session.js";

const databaseName = "ss_share_test_" + Date.now().toString(36) + "_" + randomBytes(4).toString("hex");
const origin = process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5173";
let server;
let baseUrl;
let owner;
let recipient;
let stranger;
let contactId;
let sosId;

async function makeClient(name) {
    const user = await User.create({ name, email: name.toLowerCase() + "@example.invalid", passwordHash: "fictional-unused-hash" });
    const token = jwt.sign({ sub: user.id, version: user.authVersion }, sessionSecret, { expiresIn: "10m" });
    const client = { user, cookies: "suraksha_session=" + token };
    const csrf = await fetch(baseUrl + "/api/v1/auth/csrf", { headers: { Cookie: client.cookies } });
    client.csrf = (await csrf.json()).data.csrfToken;
    client.cookies += "; " + csrf.headers.getSetCookie()[0].split(";")[0];
    return client;
}

async function request(client, path, method = "GET", body, includeCsrf = true) {
    const headers = { Origin: origin, "Content-Type": "application/json" };
    if (client) { headers.Cookie = client.cookies; if (includeCsrf) headers["X-CSRF-Token"] = client.csrf; }
    const response = await fetch(baseUrl + "/api/v1" + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
}

async function connectRecipient(id) {
    const invite = await request(owner, "/contacts/" + id + "/invite", "POST");
    assert.equal(invite.status, 200);
    const accepted = await request(recipient, "/contacts/invitations/accept", "POST", { token: invite.data.data.token });
    assert.equal(accepted.status, 200);
}

before(async () => {
    assert.ok(process.env.MONGODB_URI, "Use the configured, local-only MongoDB URI");
    await mongoose.connect(process.env.MONGODB_URI, { dbName: databaseName, serverSelectionTimeoutMS: 7000 });
    assert.equal(mongoose.connection.db.databaseName, databaseName);
    await Promise.all([User.init(), EmergencyContact.init(), SOS.init()]);
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    baseUrl = "http://127.0.0.1:" + server.address().port;
    owner = await makeClient("FictionalOwner");
    recipient = await makeClient("FictionalRecipient");
    stranger = await makeClient("FictionalStranger");
});

after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) {
        assert.ok(/^ss_share_test_[a-z0-9]+_[a-f0-9]{8}$/.test(databaseName));
        assert.equal(mongoose.connection.db.databaseName, databaseName);
        await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
});

test("contacts are private, consent cannot be injected, and invitation requests need CSRF", async () => {
    let result = await request(owner, "/contacts", "POST", { name: "Fictional Contact", relationship: "Friend", phone: "+12025550123", recipientId: recipient.user.id, consentStatus: "CONSENTED" });
    assert.equal(result.status, 201);
    contactId = result.data.data.contact._id;
    assert.equal(result.data.data.contact.consentStatus, "PENDING");
    assert.equal(result.data.data.contact.recipientId, null);
    assert.deepEqual((await request(stranger, "/contacts")).data.data.contacts, []);
    assert.equal((await request(owner, "/contacts/" + contactId + "/invite", "POST", {}, false)).status, 403);
    assert.equal((await request(stranger, "/contacts/" + contactId + "/invite", "POST")).status, 409);
});

test("invitations are hashed, replaceable, self-protected, single-use and recipient-consented", async () => {
    const first = await request(owner, "/contacts/" + contactId + "/invite", "POST");
    const token = first.data.data.token;
    assert.match(token, /^[a-f0-9]{64}$/);
    const stored = await EmergencyContact.findById(contactId).select("+invitationHash");
    assert.notEqual(stored.invitationHash, token);
    assert.ok(stored.invitationExpiresAt > new Date());
    const list = await request(owner, "/contacts");
    assert.ok(!JSON.stringify(list.data).includes(token));
    assert.ok(!JSON.stringify(list.data).includes(stored.invitationHash));
    const second = await request(owner, "/contacts/" + contactId + "/invite", "POST");
    assert.equal((await request(recipient, "/contacts/invitations/inspect", "POST", { token })).status, 404);
    const current = second.data.data.token;
    assert.equal((await request(owner, "/contacts/invitations/accept", "POST", { token: current })).status, 404);
    const inspect = await request(recipient, "/contacts/invitations/inspect", "POST", { token: current });
    assert.equal(inspect.status, 200);
    assert.equal(inspect.data.data.ownerName, owner.user.name);
    assert.equal((await request(recipient, "/contacts/invitations/accept", "POST", { token: current })).status, 200);
    assert.equal((await request(stranger, "/contacts/invitations/accept", "POST", { token: current })).status, 404);
    assert.equal((await request(recipient, "/contacts/connections")).data.data.connections.length, 1);
});

test("expired invitations cannot create a connection", async () => {
    const saved = await request(owner, "/contacts", "POST", { name: "Other Fictional Contact", relationship: "Friend", phone: "+12025550124" });
    const invite = await request(owner, "/contacts/" + saved.data.data.contact._id + "/invite", "POST");
    await EmergencyContact.updateOne({ _id: saved.data.data.contact._id }, { invitationExpiresAt: new Date(Date.now() - 1) });
    assert.equal((await request(stranger, "/contacts/invitations/accept", "POST", { token: invite.data.data.token })).status, 404);
});

test("only the connected recipient can view a current SOS; listings never contain coordinates", async () => {
    const created = await request(owner, "/sos", "POST", { latitude: 0, longitude: 0, accuracy: 30 });
    assert.equal(created.status, 201);
    sosId = created.data.data.sos._id;
    assert.deepEqual(created.data.data.sos.recipientIds, [recipient.user.id]);
    assert.equal((await request(null, "/sos/" + sosId + "/shared")).status, 401);
    assert.equal((await request(stranger, "/sos/" + sosId + "/shared")).status, 404);
    const shared = await request(recipient, "/sos/" + sosId + "/shared");
    assert.equal(shared.status, 200);
    assert.equal(shared.data.data.alert.latitude, 0);
    const listing = await request(recipient, "/sos/shared");
    assert.equal(listing.data.data.alerts.length, 1);
    assert.ok(!JSON.stringify(listing.data).includes("latitude"));
    assert.ok(!JSON.stringify(listing.data).includes("longitude"));
    assert.equal((await request(owner, "/sos", "POST", { latitude: 0, longitude: 0 })).status, 409);
});

test("only the owner updates the latest location and renews an expired sharing window", async () => {
    assert.equal((await request(recipient, "/sos/" + sosId + "/location", "PATCH", { latitude: 1, longitude: 1 })).status, 404);
    assert.equal((await request(owner, "/sos/" + sosId + "/location", "PATCH", { latitude: 999, longitude: 1 })).status, 400);
    await SOS.updateOne({ _id: sosId }, { sharingExpiresAt: new Date(Date.now() - 1) });
    assert.equal((await request(recipient, "/sos/" + sosId + "/shared")).status, 410);
    assert.equal((await request(recipient, "/sos/shared")).data.data.alerts.length, 0);
    const updated = await request(owner, "/sos/" + sosId + "/location", "PATCH", { latitude: 1, longitude: 1, accuracy: 50 });
    assert.equal(updated.status, 200);
    assert.equal((await request(recipient, "/sos/" + sosId + "/shared")).data.data.alert.latitude, 1);
});

test("recipient revocation and owner deletion immediately close location access", async () => {
    assert.equal((await request(stranger, "/contacts/connections/" + contactId + "/revoke", "POST")).status, 404);
    assert.equal((await request(recipient, "/contacts/connections/" + contactId + "/revoke", "POST")).status, 204);
    assert.equal((await request(recipient, "/sos/" + sosId + "/shared")).status, 404);
    await connectRecipient(contactId);
    assert.equal((await request(recipient, "/sos/" + sosId + "/shared")).status, 200);
    assert.equal((await request(owner, "/contacts/" + contactId, "DELETE")).status, 204);
    assert.equal((await request(recipient, "/sos/" + sosId + "/shared")).status, 404);
    const saved = await request(owner, "/contacts", "POST", { name: "Fictional Contact", relationship: "Friend", phone: "+12025550123" });
    contactId = saved.data.data.contact._id;
    await connectRecipient(contactId);
});

test("ending SOS revokes recipient access and deletes stored exact coordinates", async () => {
    assert.equal((await request(recipient, "/sos/" + sosId + "/shared")).status, 200);
    assert.equal((await request(stranger, "/sos/" + sosId + "/cancel", "PATCH")).status, 404);
    const ended = await request(owner, "/sos/" + sosId + "/cancel", "PATCH");
    assert.equal(ended.status, 200);
    assert.equal(ended.data.data.sos.latitude, undefined);
    assert.equal((await request(recipient, "/sos/" + sosId + "/shared")).status, 410);
    const stored = await SOS.findById(sosId);
    assert.equal(stored.latitude, undefined);
    assert.equal(stored.longitude, undefined);
    assert.equal((await request(owner, "/sos/active")).data.data.sos, null);
});
