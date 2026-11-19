import SOS from "../models/sos.model.js";
import EmergencyContact from "../models/contact.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import { notifySafely } from "../services/notifications.js";
import { PushAttempt } from "../models/push.model.js";
import { currentVolunteer, availableRequest, withinRadius, distanceMeters, releaseExpiredAssignment, presenceLifetimeMs } from "../services/responders.js";

function sendError(res, statusCode, code, message) {
    return res.status(statusCode).json({ success: false, error: { code: code, message: message } });
}

function validateLocation(body) {
    return Number.isFinite(body?.latitude) && Number.isFinite(body?.longitude) && body.latitude >= -90 && body.latitude <= 90 && body.longitude >= -180 && body.longitude <= 180 && (body.accuracy === undefined || (Number.isFinite(body.accuracy) && body.accuracy >= 0 && body.accuracy <= 100000));
}

async function createSOS(req, res, next) {
    try {
        if (!validateLocation(req.body)) return sendError(res, 400, "VALIDATION_ERROR", "A valid latitude and longitude are required");
        const contacts = await EmergencyContact.find({ ownerId: req.user._id, consentStatus: "CONSENTED", recipientId: { $ne: null } }).select("recipientId");
        if (await SOS.exists({ userId: req.user._id, isOpen: true })) return sendError(res, 409, "ACTIVE_SOS_EXISTS", "You already have an active SOS");
        // Needing help takes priority over any volunteer availability or assignment.
        await User.updateOne({ _id: req.user._id }, { $set: { volunteerAvailable: false }, $unset: { volunteerLocation: 1, volunteerAccuracy: 1, presenceExpiresAt: 1, presenceSession: 1 } });
        await SOS.updateMany({ assignedVolunteerId: req.user._id, isOpen: true }, { $set: { status: "ACTIVE" }, $unset: { assignedVolunteerId: 1, responderExpiresAt: 1 } });
        const sos = await SOS.create({ userId: req.user._id, latitude: req.body.latitude, longitude: req.body.longitude, location: { type: "Point", coordinates: [req.body.longitude, req.body.latitude] }, accuracy: req.body.accuracy, communityRequested: req.body.requestCommunity === true, recipientIds: contacts.map(contact => contact.recipientId) });
        await notifySafely(sos);
        return res.status(201).json({ success: true, data: { sos: sos } });
    } catch (error) {
        if (error.code === 11000) return sendError(res, 409, "ACTIVE_SOS_EXISTS", "You already have an active SOS");
        return next(error);
    }
}

async function getActiveSOS(req, res, next) {
    try {
        const sos = await SOS.findOne({ userId: req.user._id, isOpen: true });
        if (!sos) return res.status(200).json({ success: true, data: { sos: null } });
        const result = sos.toObject();
        const attempts = await PushAttempt.aggregate([{ $match: { sosId: sos._id } }, { $group: { _id: "$status", count: { $sum: 1 } } }]);
        result.notifications = { attempted: attempts.reduce((total, value) => total + value.count, 0), accepted: attempts.find(value => value._id === "ACCEPTED")?.count || 0, failed: attempts.find(value => value._id === "FAILED")?.count || 0 };
        if (sos?.assignedVolunteerId) {
            const helper = await User.findById(sos.assignedVolunteerId).select("name role verificationStatus accountStatus volunteerAvailable presenceExpiresAt");
            const current = helper && helper.role === "VOLUNTEER" && helper.verificationStatus === "APPROVED" && helper.accountStatus === "ACTIVE" && helper.volunteerAvailable && helper.presenceExpiresAt > new Date() && sos.responderExpiresAt > new Date();
            result.responder = { name: helper?.name || "Community volunteer", online: Boolean(current), expiresAt: sos.responderExpiresAt };
            return res.status(200).json({ success: true, data: { sos: result } });
        }
        return res.status(200).json({ success: true, data: { sos: result } });
    } catch (error) {
        return next(error);
    }
}

async function cancelSOS(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.sosId)) return sendError(res, 404, "NOT_FOUND", "Active SOS was not found");
        const sos = await SOS.findOneAndUpdate({ _id: req.params.sosId, userId: req.user._id, isOpen: true }, { $set: { status: "CANCELLED", isOpen: false, endedAt: new Date() }, $unset: { latitude: 1, longitude: 1, location: 1, accuracy: 1, responderExpiresAt: 1 } }, { returnDocument: "after" });
        if (!sos) return sendError(res, 404, "NOT_FOUND", "Active SOS was not found");
        return res.status(200).json({ success: true, data: { sos: sos } });
    } catch (error) {
        return next(error);
    }
}

async function listActiveSOS(req, res, next) {
    try {
        const volunteer = await currentVolunteer(req.user._id);
        if (!volunteer?.volunteerLocation) return sendError(res, 403, "PRESENCE_REQUIRED", "Go available with a fresh location to receive nearby requests");
        await releaseExpiredAssignment(req.user._id);
        const busy = await SOS.exists({ assignedVolunteerId: req.user._id, isOpen: true, responderExpiresAt: { $gt: new Date() } });
        if (busy) return res.status(200).json({ success: true, data: { requests: [] } });
        const requests = await SOS.find({ ...availableRequest(), userId: { $ne: req.user._id }, location: { $nearSphere: { $geometry: volunteer.volunteerLocation, $maxDistance: 5000 } } }).select("userId status createdAt locationUpdatedAt latitude longitude").populate("userId", "accountStatus").limit(20);
        return res.status(200).json({ success: true, data: { requests: requests.filter(sos => sos.userId?.accountStatus === "ACTIVE").map(sos => ({ id: sos.id, status: "ACTIVE", createdAt: sos.createdAt, locationUpdatedAt: sos.locationUpdatedAt, distanceMeters: Math.round(distanceMeters(volunteer.volunteerLocation.coordinates, [sos.longitude, sos.latitude]) / 100) * 100 })) } });
    } catch (error) {
        return next(error);
    }
}

async function acceptSOS(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.sosId)) return sendError(res, 404, "NOT_FOUND", "Request was not found");
        const volunteer = await currentVolunteer(req.user._id);
        if (!volunteer?.volunteerLocation) return sendError(res, 403, "PRESENCE_REQUIRED", "Only available approved volunteers with fresh GPS can accept");
        if (await SOS.exists({ userId: req.user._id, isOpen: true })) return sendError(res, 409, "ACTIVE_SOS_EXISTS", "End your own SOS before responding to another person");
        await releaseExpiredAssignment(req.user._id);
        const candidate = await SOS.findById(req.params.sosId).select("userId");
        if (!candidate || !await User.exists({ _id: candidate.userId, accountStatus: "ACTIVE" })) return sendError(res, 409, "UNAVAILABLE", "This SOS is no longer available");
        const sos = await SOS.findOneAndUpdate({ _id: req.params.sosId, ...availableRequest(), userId: { $ne: req.user._id }, location: withinRadius(volunteer.volunteerLocation) }, { $set: { status: "ACCEPTED", assignedVolunteerId: req.user._id, responderExpiresAt: new Date(Date.now() + presenceLifetimeMs) } }, { returnDocument: "after" });
        if (!sos) return sendError(res, 409, "UNAVAILABLE", "This SOS is no longer available");
        return getAssignedSOS(req, res, next);
    } catch (error) {
        if (error.code === 11000) return sendError(res, 409, "RESPONDER_BUSY", "You already have an assignment. Release it before accepting another");
        return next(error);
    }
}

async function updateSOSLocation(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.sosId)) return sendError(res, 404, "NOT_FOUND", "Active SOS was not found");
        if (!validateLocation(req.body)) return sendError(res, 400, "VALIDATION_ERROR", "A valid location is required");
        const sos = await SOS.findOneAndUpdate({ _id: req.params.sosId, userId: req.user._id, isOpen: true }, { $set: { latitude: req.body.latitude, longitude: req.body.longitude, location: { type: "Point", coordinates: [req.body.longitude, req.body.latitude] }, accuracy: req.body.accuracy, locationUpdatedAt: new Date(), sharingExpiresAt: new Date(Date.now() + 60 * 60 * 1000) } }, { returnDocument: "after" }).select("+location");
        if (!sos) return sendError(res, 404, "NOT_FOUND", "Active SOS was not found");
        await notifySafely(sos);
        return res.status(200).json({ success: true, data: { sos } });
    } catch (error) { return next(error); }
}

async function listSharedSOS(req, res, next) {
    try {
        const contacts = await EmergencyContact.find({ recipientId: req.user._id, consentStatus: "CONSENTED" }).select("ownerId");
        const requests = await SOS.find({ userId: { $in: contacts.map(contact => contact.ownerId) }, recipientIds: req.user._id, isOpen: true, sharingExpiresAt: { $gt: new Date() } }).select("userId status createdAt locationUpdatedAt sharingExpiresAt").populate("userId", "name accountStatus");
        const alerts = requests.filter(sos => sos.userId?.accountStatus === "ACTIVE").map(sos => ({ id: sos._id, ownerName: sos.userId.name, status: sos.status, createdAt: sos.createdAt, locationUpdatedAt: sos.locationUpdatedAt, sharingExpiresAt: sos.sharingExpiresAt }));
        return res.status(200).json({ success: true, data: { alerts } });
    } catch (error) { return next(error); }
}

async function getSharedSOS(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.sosId)) return sendError(res, 404, "NOT_FOUND", "This alert is not available to your account");
        const sos = await SOS.findOne({ _id: req.params.sosId, recipientIds: req.user._id });
        if (!sos) return sendError(res, 404, "NOT_FOUND", "This alert is not available to your account");
        const contact = await EmergencyContact.exists({ ownerId: sos.userId, recipientId: req.user._id, consentStatus: "CONSENTED" });
        const owner = await User.findById(sos.userId).select("name accountStatus");
        if (!contact || !owner || owner.accountStatus !== "ACTIVE") return sendError(res, 404, "NOT_FOUND", "This alert is not available to your account");
        if (!sos.isOpen || !sos.sharingExpiresAt || sos.sharingExpiresAt <= new Date()) return sendError(res, 410, "SHARING_ENDED", "Location sharing has ended or expired");
        return res.status(200).json({ success: true, data: { alert: { id: sos._id, ownerName: owner.name, status: sos.status, latitude: sos.latitude, longitude: sos.longitude, accuracy: sos.accuracy, createdAt: sos.createdAt, locationUpdatedAt: sos.locationUpdatedAt, sharingExpiresAt: sos.sharingExpiresAt } } });
    } catch (error) { return next(error); }
}

async function getAssignedSOS(req, res, next) {
    try {
        const volunteer = await currentVolunteer(req.user._id);
        if (!volunteer) return sendError(res, 403, "PRESENCE_REQUIRED", "Go available again to check your assignment");
        const sos = await SOS.findOne({ assignedVolunteerId: req.user._id, isOpen: true, communityRequested: true, status: { $in: ["ACCEPTED", "RESPONDING"] }, responderExpiresAt: { $gt: new Date() }, sharingExpiresAt: { $gt: new Date() } }).populate("userId", "name accountStatus");
        const alert = sos?.userId?.accountStatus === "ACTIVE" ? { id: sos.id, ownerName: sos.userId.name, status: sos.status, latitude: sos.latitude, longitude: sos.longitude, accuracy: sos.accuracy, locationUpdatedAt: sos.locationUpdatedAt, sharingExpiresAt: sos.sharingExpiresAt } : null;
        return res.status(200).json({ success: true, data: { alert } });
    } catch (error) { return next(error); }
}

async function respondToSOS(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.sosId)) return sendError(res, 404, "NOT_FOUND", "Request was not found");
        if (!await currentVolunteer(req.user._id)) return sendError(res, 403, "PRESENCE_REQUIRED", "Fresh volunteer presence is required");
        const result = await SOS.updateOne({ _id: req.params.sosId, assignedVolunteerId: req.user._id, isOpen: true, communityRequested: true, responderExpiresAt: { $gt: new Date() }, sharingExpiresAt: { $gt: new Date() }, status: { $in: ["ACCEPTED", "RESPONDING"] } }, { $set: { status: "RESPONDING" } });
        if (!result.matchedCount) return sendError(res, 409, "UNAVAILABLE", "This assignment is no longer available");
        return getAssignedSOS(req, res, next);
    } catch (error) { return next(error); }
}

async function releaseSOS(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.sosId)) return sendError(res, 404, "NOT_FOUND", "Request was not found");
        const result = await SOS.updateOne({ _id: req.params.sosId, assignedVolunteerId: req.user._id, isOpen: true }, { $set: { status: "ACTIVE" }, $unset: { assignedVolunteerId: 1, responderExpiresAt: 1 } });
        if (!result.matchedCount) return sendError(res, 409, "UNAVAILABLE", "This assignment has already ended");
        return res.status(204).send();
    } catch (error) { return next(error); }
}

async function setCommunitySharing(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.sosId)) return sendError(res, 404, "NOT_FOUND", "Request was not found");
        if (typeof req.body?.enabled !== "boolean") return sendError(res, 400, "VALIDATION_ERROR", "Choose whether to request community help");
        const change = { $set: { communityRequested: req.body.enabled } };
        if (!req.body.enabled) { change.$set.status = "ACTIVE"; change.$unset = { assignedVolunteerId: 1, responderExpiresAt: 1 }; }
        const sos = await SOS.findOneAndUpdate({ _id: req.params.sosId, userId: req.user._id, isOpen: true }, change, { returnDocument: "after" }).select("+location");
        if (!sos) return sendError(res, 404, "NOT_FOUND", "Your active SOS was not found");
        if (req.body.enabled) await notifySafely(sos);
        return res.status(200).json({ success: true, data: { sos } });
    } catch (error) { return next(error); }
}

export { createSOS, getActiveSOS, cancelSOS, listActiveSOS, acceptSOS, updateSOSLocation, listSharedSOS, getSharedSOS, getAssignedSOS, respondToSOS, releaseSOS, setCommunitySharing };
