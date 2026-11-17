import SOS from "../models/sos.model.js";

function sendError(res, statusCode, code, message) {
    return res.status(statusCode).json({ success: false, error: { code: code, message: message } });
}

function validateLocation(body) {
    return Number.isFinite(body?.latitude) && Number.isFinite(body?.longitude) && body.latitude >= -90 && body.latitude <= 90 && body.longitude >= -180 && body.longitude <= 180;
}

async function createSOS(req, res, next) {
    try {
        if (!validateLocation(req.body)) return sendError(res, 400, "VALIDATION_ERROR", "A valid latitude and longitude are required");
        const sos = await SOS.create({ userId: req.user._id, latitude: req.body.latitude, longitude: req.body.longitude, accuracy: req.body.accuracy });
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
        const sos = await SOS.findOneAndUpdate({ _id: req.params.sosId, userId: req.user._id, isOpen: true }, { status: "CANCELLED", isOpen: false }, { new: true });
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
        const sos = await SOS.findOneAndUpdate({ _id: req.params.sosId, status: "ACTIVE", isOpen: true }, { status: "ACCEPTED", assignedVolunteerId: req.user._id }, { new: true });
        if (!sos) return sendError(res, 409, "UNAVAILABLE", "This SOS is no longer available");
        return res.status(200).json({ success: true, data: { sos: sos } });
    } catch (error) {
        return next(error);
    }
}

export { createSOS, getActiveSOS, cancelSOS, listActiveSOS, acceptSOS };
