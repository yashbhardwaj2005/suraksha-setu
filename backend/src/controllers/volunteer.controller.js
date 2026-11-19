import User from "../models/user.model.js";
import SOS from "../models/sos.model.js";
import { randomUUID } from "node:crypto";
import { presenceLifetimeMs } from "../services/responders.js";

async function updatePresence(req, res, next) {
    try {
        if (req.body?.available === false) {
            if (req.body.sessionId !== undefined && (typeof req.body.sessionId !== "string" || req.body.sessionId.length !== 36)) return res.status(400).json({ success: false, error: { code: "INVALID_SESSION", message: "Invalid availability session" } });
            const filter = { _id: req.user._id };
            if (req.body.sessionId) filter.presenceSession = req.body.sessionId;
            const result = await User.updateOne(filter, { $set: { volunteerAvailable: false }, $unset: { volunteerLocation: 1, volunteerAccuracy: 1, presenceExpiresAt: 1, presenceSession: 1 } });
            if (result.matchedCount) await SOS.updateMany({ assignedVolunteerId: req.user._id, isOpen: true }, { $set: { status: "ACTIVE" }, $unset: { assignedVolunteerId: 1, responderExpiresAt: 1 } });
            return res.status(200).json({ success: true, data: { available: false } });
        }
        if (req.body?.available !== true || req.user.role !== "VOLUNTEER" || req.user.verificationStatus !== "APPROVED") return res.status(403).json({ success: false, error: { code: "APPROVAL_REQUIRED", message: "Switch to volunteer mode and obtain admin approval before going available" } });
        const { latitude, longitude, accuracy } = req.body;
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 200) return res.status(400).json({ success: false, error: { code: "LOCATION_INACCURATE", message: "A fresh GPS point with accuracy within 200 metres is required. Move to an open area and retry" } });
        if (await SOS.exists({ userId: req.user._id, isOpen: true })) return res.status(409).json({ success: false, error: { code: "ACTIVE_SOS_EXISTS", message: "End your own SOS before going available" } });
        const now = new Date();
        const expiresAt = new Date(now.getTime() + presenceLifetimeMs);
        const starting = req.method === "POST";
        if (!starting && (typeof req.body.sessionId !== "string" || req.body.sessionId.length !== 36)) return res.status(409).json({ success: false, error: { code: "PRESENCE_ENDED", message: "Start a new availability session" } });
        const sessionId = starting ? randomUUID() : req.body.sessionId;
        const filter = { _id: req.user._id, role: "VOLUNTEER", verificationStatus: "APPROVED", accountStatus: "ACTIVE" };
        if (!starting) filter.presenceSession = sessionId;
        const updated = await User.updateOne(filter, { $set: { presenceSession: sessionId, volunteerAvailable: true, presenceExpiresAt: expiresAt, volunteerLocation: { type: "Point", coordinates: [longitude, latitude] }, volunteerAccuracy: accuracy } });
        if (!updated.matchedCount) return res.status(403).json({ success: false, error: { code: "APPROVAL_REQUIRED", message: "Volunteer access is no longer available" } });
        // A late heartbeat cannot revive an expired assignment after another helper can claim it.
        await SOS.updateMany({ assignedVolunteerId: req.user._id, isOpen: true, responderExpiresAt: { $gt: now } }, { $set: { responderExpiresAt: expiresAt } });
        return res.status(200).json({ success: true, data: { available: true, expiresAt, sessionId } });
    } catch (error) { return next(error); }
}

export { updatePresence };
