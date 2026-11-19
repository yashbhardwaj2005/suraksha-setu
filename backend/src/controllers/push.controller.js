import { createHash } from "node:crypto";
import { PushSubscription } from "../models/push.model.js";
import { pushConfiguration, validSubscription } from "../services/notifications.js";

function getPushKey(req, res) {
    const configuration = pushConfiguration();
    return res.status(200).json({ success: true, data: { publicKey: configuration?.publicKey || null } });
}

async function subscribePush(req, res, next) {
    try {
        if (!pushConfiguration()) return res.status(503).json({ success: false, error: { code: "PUSH_UNAVAILABLE", message: "Push notifications are not configured. In-app alerts remain available" } });
        if (!validSubscription(req.body)) return res.status(400).json({ success: false, error: { code: "INVALID_SUBSCRIPTION", message: "A supported browser push subscription is required" } });
        const endpointHash = createHash("sha256").update(req.body.endpoint).digest("hex");
        const existing = await PushSubscription.exists({ endpointHash });
        if (!existing && await PushSubscription.countDocuments({ ownerId: req.user._id }) >= 5) return res.status(409).json({ success: false, error: { code: "DEVICE_LIMIT", message: "You can connect up to five notification devices" } });
        await PushSubscription.findOneAndUpdate({ endpointHash }, { $set: { ownerId: req.user._id, subscription: { endpoint: req.body.endpoint, keys: { p256dh: req.body.keys.p256dh, auth: req.body.keys.auth } }, expiresAt: new Date(Date.now() + 60 * 86400000) } }, { upsert: true });
        return res.status(204).send();
    } catch (error) { return next(error); }
}

async function unsubscribePush(req, res, next) {
    try {
        if (typeof req.body?.endpoint !== "string") return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "A device endpoint is required" } });
        const endpointHash = createHash("sha256").update(req.body.endpoint).digest("hex");
        await PushSubscription.deleteOne({ ownerId: req.user._id, endpointHash });
        return res.status(204).send();
    } catch (error) { return next(error); }
}

export { getPushKey, subscribePush, unsubscribePush };
