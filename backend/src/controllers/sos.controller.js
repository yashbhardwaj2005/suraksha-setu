import SOS from "../models/sos.model.js";
import EmergencyContact from "../models/contact.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

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
        const sos = await SOS.create({ userId: req.user._id, latitude: req.body.latitude, longitude: req.body.longitude, accuracy: req.body.accuracy, recipientIds: contacts.map(contact => contact.recipientId) });
        return res.status(201).json({ success: true, data: { sos: sos } });
    } catch (error) {
        if (error.code === 11000) return sendError(res, 409, "ACTIVE_SOS_EXISTS", "You already have an active SOS");
        return next(error);
    }
}

async function getActiveSOS(req, res, next) {
    try {
        const sos = await SOS.findOne({ userId: req.user._id, isOpen: true });
        return res.status(200).json({ success: true, data: { sos: sos } });
    } catch (error) {
        return next(error);
    }
}

async function cancelSOS(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.sosId)) return sendError(res, 404, "NOT_FOUND", "Active SOS was not found");
        const sos = await SOS.findOneAndUpdate({ _id: req.params.sosId, userId: req.user._id, isOpen: true }, { $set: { status: "CANCELLED", isOpen: false, endedAt: new Date() }, $unset: { latitude: 1, longitude: 1, accuracy: 1 } }, { returnDocument: "after" });
        if (!sos) return sendError(res, 404, "NOT_FOUND", "Active SOS was not found");
        return res.status(200).json({ success: true, data: { sos: sos } });
    } catch (error) {
        return next(error);
    }
}

async function listActiveSOS(req, res, next) {
    try {
        const requests = await SOS.find({ status: "ACTIVE", isOpen: true }).select("userId status createdAt");
        return res.status(200).json({ success: true, data: { requests: requests } });
    } catch (error) {
        return next(error);
    }
}

async function acceptSOS(req, res, next) {
    try {
        if (req.user.role !== "VOLUNTEER" || req.user.verificationStatus !== "APPROVED") return sendError(res, 403, "FORBIDDEN", "Approved volunteers only");
        const sos = await SOS.findOneAndUpdate({ _id: req.params.sosId, status: "ACTIVE", isOpen: true }, { status: "ACCEPTED", assignedVolunteerId: req.user._id }, { returnDocument: "after" });
        if (!sos) return sendError(res, 409, "UNAVAILABLE", "This SOS is no longer available");
        return res.status(200).json({ success: true, data: { sos: sos } });
    } catch (error) {
        return next(error);
    }
}

async function updateSOSLocation(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.sosId)) return sendError(res, 404, "NOT_FOUND", "Active SOS was not found");
        if (!validateLocation(req.body)) return sendError(res, 400, "VALIDATION_ERROR", "A valid location is required");
        const sos = await SOS.findOneAndUpdate({ _id: req.params.sosId, userId: req.user._id, isOpen: true }, { $set: { latitude: req.body.latitude, longitude: req.body.longitude, accuracy: req.body.accuracy, locationUpdatedAt: new Date(), sharingExpiresAt: new Date(Date.now() + 60 * 60 * 1000) } }, { returnDocument: "after" });
        if (!sos) return sendError(res, 404, "NOT_FOUND", "Active SOS was not found");
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

export { createSOS, getActiveSOS, cancelSOS, listActiveSOS, acceptSOS, updateSOSLocation, listSharedSOS, getSharedSOS };
