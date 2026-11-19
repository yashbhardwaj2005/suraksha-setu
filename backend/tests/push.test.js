import assert from "node:assert/strict";
import { createECDH, randomBytes } from "node:crypto";
import test from "node:test";
import { generateVAPIDKeys, generateRequestDetails } from "web-push";
import { validSubscription } from "../src/services/notifications.js";

function subscription() {
    const curve = createECDH("prime256v1"); curve.generateKeys();
    return { endpoint: "https://fcm.googleapis.com/fcm/send/fictional-offline-test", keys: { p256dh: curve.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } };
}

test("only supported HTTPS push endpoints and valid encryption key lengths are accepted", () => {
    const value = subscription();
    assert.equal(validSubscription(value), true);
    for (const endpoint of ["http://127.0.0.1/private", "https://localhost/test", "https://fcm.googleapis.com.attacker.invalid/test", "https://user:password@fcm.googleapis.com/test", "https://fcm.googleapis.com:444/test"]) assert.equal(validSubscription({ ...value, endpoint }), false);
    assert.equal(validSubscription({ ...value, keys: { p256dh: "invalid", auth: "invalid" } }), false);
});

test("the actual Web Push library encrypts and signs a request without sending it", () => {
    const keys = generateVAPIDKeys();
    const request = generateRequestDetails(subscription(), JSON.stringify({ title: "Fictional alert", url: "/dashboard" }), { vapidDetails: { subject: "https://example.invalid", ...keys }, TTL: 60, urgency: "high" });
    assert.equal(request.method, "POST");
    assert.ok(request.headers.Authorization || request.headers.authorization);
    assert.ok(Buffer.isBuffer(request.body));
    assert.ok(!request.body.toString().includes("Fictional alert"));
});
