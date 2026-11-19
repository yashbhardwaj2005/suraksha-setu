import User from "../models/user.model.js";
import SOS from "../models/sos.model.js";

const radiusMeters = 5000;
const presenceLifetimeMs = 90000;
const locationLifetimeMs = 120000;

function approvedPresence(now = new Date()) {
    return { role: "VOLUNTEER", verificationStatus: "APPROVED", accountStatus: "ACTIVE", volunteerAvailable: true, presenceExpiresAt: { $gt: now } };
}

function availableRequest(now = new Date()) {
    return { isOpen: true, communityRequested: true, sharingExpiresAt: { $gt: now }, locationUpdatedAt: { $gt: new Date(now.getTime() - locationLifetimeMs) }, accuracy: { $lte: 1000 }, $or: [{ status: "ACTIVE" }, { status: { $in: ["ACCEPTED", "RESPONDING"] }, responderExpiresAt: { $lte: now } }] };
}

function withinRadius(point) {
    return { $geoWithin: { $centerSphere: [point.coordinates, radiusMeters / 6371008.8] } };
}

function distanceMeters(a, b) {
    const radians = Math.PI / 180;
    const deltaLatitude = (b[1] - a[1]) * radians;
    const deltaLongitude = (b[0] - a[0]) * radians;
    const value = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(a[1] * radians) * Math.cos(b[1] * radians) * Math.sin(deltaLongitude / 2) ** 2;
    return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, value)));
}

async function currentVolunteer(userId) {
    await clearStalePresence();
    return User.findOne({ _id: userId, ...approvedPresence() }).select("+volunteerLocation +volunteerAccuracy");
}

async function clearStalePresence() {
    await User.updateMany({ volunteerAvailable: true, presenceExpiresAt: { $lte: new Date() } }, { $set: { volunteerAvailable: false }, $unset: { volunteerLocation: 1, volunteerAccuracy: 1, presenceExpiresAt: 1, presenceSession: 1 } });
}

async function nearbyVolunteers(sos) {
    if (!sos.communityRequested || !sos.isOpen || !["ACTIVE", "ACCEPTED", "RESPONDING"].includes(sos.status) || (sos.status !== "ACTIVE" && sos.responderExpiresAt > new Date()) || !sos.location || !Number.isFinite(sos.accuracy) || sos.accuracy > 1000 || sos.locationUpdatedAt < new Date(Date.now() - locationLifetimeMs)) return [];
    await clearStalePresence();
    const busy = await SOS.find({ isOpen: true, assignedVolunteerId: { $ne: null }, responderExpiresAt: { $gt: new Date() } }).distinct("assignedVolunteerId");
    return User.find({ ...approvedPresence(), _id: { $ne: sos.userId, $nin: busy }, volunteerLocation: { $nearSphere: { $geometry: sos.location, $maxDistance: radiusMeters } } }).select("_id").limit(20);
}

async function releaseExpiredAssignment(userId) {
    await SOS.updateMany({ assignedVolunteerId: userId, isOpen: true, responderExpiresAt: { $lte: new Date() } }, { $set: { status: "ACTIVE" }, $unset: { assignedVolunteerId: 1, responderExpiresAt: 1 } });
}

export { radiusMeters, presenceLifetimeMs, locationLifetimeMs, approvedPresence, availableRequest, withinRadius, distanceMeters, currentVolunteer, nearbyVolunteers, releaseExpiredAssignment };
