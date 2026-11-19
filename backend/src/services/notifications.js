import { sendNotification } from "web-push";
import SOS from "../models/sos.model.js";
import User from "../models/user.model.js";
import EmergencyContact from "../models/contact.model.js";
import { PushSubscription, PushAttempt } from "../models/push.model.js";
import { nearbyVolunteers } from "./responders.js";

const pushTransport = { send: sendNotification };

function pushConfiguration() {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return null;
    return { subject: process.env.FRONTEND_ORIGIN || "https://suraksha-setu-9vq2.vercel.app", publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
}

function validSubscription(subscription) {
    try {
        if (!subscription || typeof subscription.endpoint !== "string" || subscription.endpoint.length > 2048) return false;
        const url = new URL(subscription.endpoint);
        const trusted = ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"];
        if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || (!trusted.includes(url.hostname) && !url.hostname.endsWith(".notify.windows.com"))) return false;
        const { p256dh, auth } = subscription.keys || {};
        return typeof p256dh === "string" && /^[\w-]{87}=?$/.test(p256dh) && Buffer.from(p256dh, "base64url").length === 65 && typeof auth === "string" && /^[\w-]{22}={0,2}$/.test(auth) && Buffer.from(auth, "base64url").length === 16;
    } catch { return false; }
}

async function sendSOSNotifications(sos) {
    const configuration = pushConfiguration();
    if (!configuration || !sos.isOpen || sos.sharingExpiresAt <= new Date()) return;
    const current = await SOS.exists({ _id: sos._id, isOpen: true, sharingExpiresAt: { $gt: new Date() } });
    if (!current || !await User.exists({ _id: sos.userId, accountStatus: "ACTIVE" })) return;
    const contacts = await EmergencyContact.find({ ownerId: sos.userId, consentStatus: "CONSENTED", recipientId: { $in: sos.recipientIds } }).select("recipientId");
    const volunteers = await nearbyVolunteers(sos);
    const contactIds = new Set(contacts.map(contact => String(contact.recipientId)));
    const recipients = await User.find({ _id: { $in: [...contactIds, ...volunteers.map(user => user.id)] }, accountStatus: "ACTIVE" }).select("_id");
    const subscriptions = await PushSubscription.find({ ownerId: { $in: recipients.map(user => user._id) }, expiresAt: { $gt: new Date() } }).select("+subscription").limit(100);
    await Promise.allSettled(subscriptions.map(async subscription => {
        if (!validSubscription(subscription.subscription)) return;
        let attempt;
        try {
            // The unique key claims this attempt across concurrent serverless invocations.
            attempt = await PushAttempt.create({ sosId: sos._id, subscriptionId: subscription._id, status: "ATTEMPTED", expiresAt: new Date(Date.now() + 30 * 86400000) });
        } catch (error) { if (error.code === 11000) return; throw error; }
        try {
            const contact = contactIds.has(String(subscription.ownerId));
            const payload = JSON.stringify({ title: "SurakshaSetu SOS", body: contact ? "Someone in your trusted circle needs support. Sign in to view their alert." : "A nearby SOS needs a responder. Open the app to check availability.", url: contact ? "/alerts/" + sos.id : "/volunteer", tag: "sos-" + sos.id });
            await pushTransport.send(subscription.subscription, payload, { vapidDetails: configuration, TTL: 60, urgency: "high", timeout: 2500 });
            await PushAttempt.updateOne({ _id: attempt._id }, { $set: { status: "ACCEPTED" } });
        } catch (error) {
            await PushAttempt.updateOne({ _id: attempt._id }, { $set: { status: "FAILED" } });
            if ([404, 410].includes(error.statusCode)) await PushSubscription.deleteOne({ _id: subscription._id });
        }
    }));
}

async function notifySafely(sos) {
    try { await sendSOSNotifications(sos); }
    catch { /* The persisted SOS and its in-app inbox survive notification failure. */ }
}

export { pushConfiguration, validSubscription, sendSOSNotifications, notifySafely, pushTransport };
