import assert from "node:assert/strict";
import { randomBytes, createHash, createECDH } from "node:crypto";
import { once } from "node:events";
import { after, before, mock, test } from "node:test";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { generateVAPIDKeys } from "web-push";
import app from "../src/app.js";
import User from "../src/models/user.model.js";
import SOS from "../src/models/sos.model.js";
import EmergencyContact from "../src/models/contact.model.js";
import { PushSubscription, PushAttempt } from "../src/models/push.model.js";
import { sendSOSNotifications, pushTransport } from "../src/services/notifications.js";
import { sessionSecret } from "../src/config/session.js";

const databaseName = "ss_respond_test_" + Date.now().toString(36) + "_" + randomBytes(4).toString("hex");
const origin = process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5173";
let server;
let baseUrl;
let owner;
let other;
let first;
let second;
let far;
let pending;
let admin;
let recipient;
let sosId;
let send;
const location = { latitude: 0, longitude: 0, accuracy: 20 };

async function makeClient(name, role = "USER", verificationStatus = "NOT_REQUESTED") {
    const user = await User.create({ name, email: name.toLowerCase() + "@example.invalid", passwordHash: "fictional-unused", role, verificationStatus });
    const client = { user, cookies: "suraksha_session=" + jwt.sign({ sub: user.id, version: 0 }, sessionSecret, { expiresIn: "10m" }) };
    const csrf = await fetch(baseUrl + "/api/v1/auth/csrf", { headers: { Cookie: client.cookies } });
    client.csrf = (await csrf.json()).data.csrfToken;
    client.cookies += "; " + csrf.headers.getSetCookie()[0].split(";")[0];
    return client;
}

async function request(client, path, method = "GET", body, csrf = true) {
    const headers = { Origin: origin, "Content-Type": "application/json" };
    if (client) { headers.Cookie = client.cookies; if (csrf) headers["X-CSRF-Token"] = client.csrf; }
    const response = await fetch(baseUrl + "/api/v1" + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
}

async function online(client, longitude = 0.01) {
    const result = await request(client, "/sos/volunteer/presence", "POST", { ...location, longitude, available: true });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    client.sessionId = result.data.data.sessionId;
    return result;
}

async function create(client = owner, community = true) {
    const result = await request(client, "/sos", "POST", { ...location, requestCommunity: community });
    assert.equal(result.status, 201, JSON.stringify(result.data));
    return result.data.data.sos._id;
}

before(async () => {
    assert.ok(process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI, { dbName: databaseName, serverSelectionTimeoutMS: 7000 });
    assert.equal(mongoose.connection.db.databaseName, databaseName);
    await Promise.all([User.init(), SOS.init(), EmergencyContact.init(), PushSubscription.init(), PushAttempt.init()]);
    const keys = generateVAPIDKeys(); process.env.VAPID_PUBLIC_KEY = keys.publicKey; process.env.VAPID_PRIVATE_KEY = keys.privateKey;
    send = mock.method(pushTransport, "send", async () => ({ statusCode: 201 }));
    server = app.listen(0, "127.0.0.1"); await once(server, "listening"); baseUrl = "http://127.0.0.1:" + server.address().port;
    owner = await makeClient("FictionalOwner"); other = await makeClient("FictionalOther");
    first = await makeClient("FictionalFirst", "VOLUNTEER", "APPROVED"); second = await makeClient("FictionalSecond", "VOLUNTEER", "APPROVED");
    far = await makeClient("FictionalFar", "VOLUNTEER", "APPROVED"); pending = await makeClient("FictionalPending", "VOLUNTEER", "PENDING");
    admin = await makeClient("FictionalAdmin", "ADMIN"); recipient = await makeClient("FictionalRecipient");
});

after(async () => {
    mock.restoreAll();
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) {
        assert.match(databaseName, /^ss_respond_test_[a-z0-9]+_[a-f0-9]{8}$/);
        assert.equal(mongoose.connection.db.databaseName, databaseName);
        await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
});

test("the same account can switch modes, retain approval, and cannot become an admin", async () => {
    let result = await request(first, "/auth/mode", "PATCH", { role: "USER" });
    assert.equal(result.status, 200); assert.equal(result.data.data.user.verificationStatus, "APPROVED");
    assert.equal((await request(first, "/auth/mode", "PATCH", { role: "ADMIN" })).status, 400);
    assert.equal((await request(first, "/auth/mode", "PATCH", { role: "VOLUNTEER" })).status, 200);
    assert.equal((await request(first, "/auth/mode", "PATCH", { role: "USER" }, false)).status, 403);
    assert.equal((await request(admin, "/auth/mode", "PATCH", { role: "VOLUNTEER" })).status, 400);
    assert.equal((await request(other, "/auth/volunteer-verification", "POST")).status, 200);
    assert.equal((await request(owner, "/auth/volunteer-applications")).status, 403);
    assert.equal((await request(admin, "/auth/volunteer-applications/" + other.user.id, "PATCH", { verificationStatus: "APPROVED" })).status, 200);
    assert.equal((await request(admin, "/auth/volunteer-applications/bad-id", "PATCH", { verificationStatus: "APPROVED" })).status, 404);
});

test("presence requires approval, CSRF and accurate GPS; coordinates never leak in session data", async () => {
    assert.equal((await request(null, "/sos/volunteer/requests")).status, 401);
    assert.equal((await request(pending, "/sos/volunteer/presence", "POST", { ...location, available: true })).status, 403);
    assert.equal((await request(first, "/sos/volunteer/presence", "POST", { ...location, available: true }, false)).status, 403);
    assert.equal((await request(first, "/sos/volunteer/presence", "POST", { ...location, accuracy: 201, available: true })).status, 400);
    await online(first); await online(second, 0.02); await online(far, 1);
    const stored = await User.findById(first.user.id).select("+volunteerLocation");
    assert.deepEqual([...stored.volunteerLocation.coordinates], [0.01, 0]);
    const me = (await request(first, "/auth/me")).data.data.user;
    assert.equal(me.volunteerAvailable, true); assert.ok(!JSON.stringify(me).includes("coordinates")); assert.ok(!JSON.stringify(me).includes("sessionId"));
});

test("only fresh nearby volunteers see opted-in requests, with distance but no victim coordinates", async () => {
    sosId = await create();
    const inbox = await request(first, "/sos/volunteer/requests");
    assert.equal(inbox.status, 200); assert.equal(inbox.data.data.requests[0].id, sosId);
    assert.equal(inbox.data.data.requests[0].distanceMeters, 1100);
    assert.ok(!/latitude|longitude|coordinates|userId/.test(JSON.stringify(inbox.data)));
    assert.deepEqual((await request(far, "/sos/volunteer/requests")).data.data.requests, []);
    assert.equal((await request(pending, "/sos/volunteer/requests")).status, 403);
    await User.updateOne({ _id: first.user.id }, { presenceExpiresAt: new Date(Date.now() - 1) });
    assert.equal((await request(first, "/sos/volunteer/requests")).status, 403);
    await online(first);
    await SOS.updateOne({ _id: sosId }, { locationUpdatedAt: new Date(Date.now() - 121000) });
    assert.deepEqual((await request(first, "/sos/volunteer/requests")).data.data.requests, []);
    await request(owner, "/sos/" + sosId + "/location", "PATCH", location);
    const privateId = await create(other, false);
    assert.ok(!(await request(first, "/sos/volunteer/requests")).data.data.requests.some(value => value.id === privateId));
    assert.equal((await request(first, "/sos/" + privateId + "/accept", "PATCH")).status, 409);
    await request(other, "/sos/" + privateId + "/cancel", "PATCH");
});

test("two responders race for one SOS: one wins and only that helper gets its exact location", async () => {
    const results = await Promise.all([request(first, "/sos/" + sosId + "/accept", "PATCH"), request(second, "/sos/" + sosId + "/accept", "PATCH")]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    const winner = results[0].status === 200 ? first : second;
    const loser = winner === first ? second : first;
    assert.equal((await request(winner, "/sos/volunteer/assignment")).data.data.alert.latitude, 0);
    assert.equal((await request(loser, "/sos/volunteer/assignment")).data.data.alert, null);
    assert.equal((await request(admin, "/sos/volunteer/assignment")).status, 403);
    assert.equal((await request(winner, "/sos/" + sosId + "/respond", "PATCH")).status, 200);
    const own = (await request(owner, "/sos/active")).data.data.sos;
    assert.equal(own.responder.name, winner.user.name); assert.equal(own.status, "RESPONDING");
    assert.ok(!own.responder.volunteerLocation);
    await request(winner, "/sos/" + sosId + "/release", "PATCH");
});

test("one responder cannot accept two simultaneous assignments", async () => {
    const otherId = await create(other);
    const results = await Promise.all([request(first, "/sos/" + sosId + "/accept", "PATCH"), request(first, "/sos/" + otherId + "/accept", "PATCH")]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    const current = (await request(first, "/sos/volunteer/assignment")).data.data.alert;
    await request(first, "/sos/" + current.id + "/release", "PATCH");
    await request(other, "/sos/" + otherId + "/cancel", "PATCH");
});

test("offline and expired leases revoke access; late heartbeats cannot restore a stopped session", async () => {
    await request(first, "/sos/" + sosId + "/accept", "PATCH");
    const oldSession = first.sessionId;
    await request(first, "/sos/volunteer/presence", "PATCH", { available: false, sessionId: oldSession });
    assert.equal((await request(first, "/sos/volunteer/assignment")).status, 403);
    assert.equal((await request(first, "/sos/volunteer/presence", "PATCH", { ...location, available: true, sessionId: oldSession })).status, 403);
    const stored = await User.findById(first.user.id).select("+volunteerLocation"); assert.equal(stored.volunteerLocation, undefined);
    await SOS.updateOne({ _id: sosId }, { responderExpiresAt: new Date(Date.now() - 1) });
    await online(first);
    assert.equal((await request(first, "/sos/volunteer/assignment")).data.data.alert, null);
    assert.equal((await request(second, "/sos/" + sosId + "/accept", "PATCH")).status, 200);
    assert.equal((await request(first, "/sos/volunteer/assignment")).data.data.alert, null);
    await request(second, "/sos/" + sosId + "/release", "PATCH");
});

test("community withdrawal, mode switching and cancellation revoke private location access", async () => {
    await request(first, "/sos/" + sosId + "/accept", "PATCH");
    assert.equal((await request(other, "/sos/" + sosId + "/community", "PATCH", { enabled: false })).status, 404);
    await request(owner, "/sos/" + sosId + "/community", "PATCH", { enabled: false });
    assert.equal((await request(first, "/sos/volunteer/assignment")).data.data.alert, null);
    await request(owner, "/sos/" + sosId + "/community", "PATCH", { enabled: true });
    await request(first, "/sos/" + sosId + "/accept", "PATCH");
    await request(first, "/auth/mode", "PATCH", { role: "USER" });
    assert.equal((await request(first, "/sos/volunteer/assignment")).status, 403);
    assert.equal((await SOS.findById(sosId)).assignedVolunteerId, null);
    await request(first, "/auth/mode", "PATCH", { role: "VOLUNTEER" }); await online(first);
    await request(first, "/sos/" + sosId + "/accept", "PATCH");
    await request(owner, "/sos/" + sosId + "/cancel", "PATCH");
    assert.equal((await request(first, "/sos/volunteer/assignment")).data.data.alert, null);
    const ended = await SOS.findById(sosId).select("+location");
    for (const field of ["latitude", "longitude", "accuracy", "location"]) assert.equal(ended[field], undefined);
});

test("needing help overrides volunteer work without blocking an SOS", async () => {
    const otherId = await create(other);
    await request(first, "/sos/" + otherId + "/accept", "PATCH");
    const emergencyId = await create(first);
    assert.equal((await SOS.findById(otherId)).status, "ACTIVE");
    assert.equal((await User.findById(first.user.id)).volunteerAvailable, false);
    assert.equal((await request(first, "/auth/mode", "PATCH", { role: "VOLUNTEER" })).status, 409);
    await request(first, "/sos/" + emergencyId + "/cancel", "PATCH");
    await request(other, "/sos/" + otherId + "/cancel", "PATCH");
});

test("automatic push uses consented recipients, sends no coordinates and claims each attempt once", async () => {
    const curve = createECDH("prime256v1"); curve.generateKeys();
    const subscription = { endpoint: "https://fcm.googleapis.com/fcm/send/fictional-test", keys: { p256dh: curve.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } };
    assert.equal((await request(recipient, "/push/subscriptions", "POST", { ...subscription, endpoint: "http://127.0.0.1/private" })).status, 400);
    assert.equal((await request(recipient, "/push/subscriptions", "POST", subscription, false)).status, 403);
    assert.equal((await request(recipient, "/push/subscriptions", "POST", subscription)).status, 204);
    await EmergencyContact.create({ ownerId: owner.user.id, recipientId: recipient.user.id, name: "Fictional contact", relationship: "Friend", phone: "+12025550123", consentStatus: "CONSENTED", consentedAt: new Date() });
    const id = await create(owner);
    const sos = await SOS.findById(id).select("+location");
    await Promise.all([sendSOSNotifications(sos), sendSOSNotifications(sos)]);
    assert.equal(send.mock.callCount(), 1);
    const payload = JSON.parse(send.mock.calls[0].arguments[1]);
    assert.equal(payload.url, "/alerts/" + id); assert.ok(!/latitude|longitude|coordinates/.test(JSON.stringify(payload)));
    assert.equal((await PushAttempt.findOne({ sosId: id })).status, "ACCEPTED");
    await request(owner, "/sos/" + id + "/cancel", "PATCH");
    send.mock.mockImplementation(async () => { throw new Error("fictional provider failure"); });
    const failedId = await create(owner);
    assert.equal((await SOS.findById(failedId)).isOpen, true);
    assert.equal((await PushAttempt.findOne({ sosId: failedId })).status, "FAILED");
    const summary = (await request(owner, "/sos/active")).data.data.sos.notifications;
    assert.equal(summary.failed, 1); assert.equal(summary.accepted, 0);
    await request(owner, "/sos/" + failedId + "/cancel", "PATCH");
    const hash = createHash("sha256").update(subscription.endpoint).digest("hex");
    assert.ok(await PushSubscription.exists({ endpointHash: hash }));
    await request(recipient, "/push/subscriptions", "DELETE", { endpoint: subscription.endpoint });
    assert.equal(await PushSubscription.countDocuments({ endpointHash: hash }), 0);
});
