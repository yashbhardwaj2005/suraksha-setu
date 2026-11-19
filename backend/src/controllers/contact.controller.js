import EmergencyContact from "../models/contact.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import { createHash, randomBytes } from "node:crypto";

function sendError(res, statusCode, code, message) {
    return res.status(statusCode).json({ success: false, error: { code: code, message: message } });
}

async function listContacts(req, res, next) {
    try {
        const contacts = await EmergencyContact.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: { contacts: contacts } });
    } catch (error) {
        return next(error);
    }
}

async function createContact(req, res, next) {
    try {
        const { name, relationship, phone } = req.body || {};
        if (typeof name !== "string" || typeof relationship !== "string" || typeof phone !== "string") return sendError(res, 400, "VALIDATION_ERROR", "Name, relationship and phone are required");
        const count = await EmergencyContact.countDocuments({ ownerId: req.user._id });
        if (count >= 5) return sendError(res, 409, "CONTACT_LIMIT", "You can add up to five emergency contacts");
        const contact = await EmergencyContact.create({ ownerId: req.user._id, name: name.trim(), relationship: relationship.trim(), phone: phone.trim() });
        return res.status(201).json({ success: true, data: { contact: contact } });
    } catch (error) {
        if (error.name === "ValidationError") return sendError(res, 400, "VALIDATION_ERROR", "Contact details are invalid");
        return next(error);
    }
}

async function deleteContact(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.contactId)) return sendError(res, 404, "NOT_FOUND", "Contact was not found");
        const contact = await EmergencyContact.findOneAndDelete({ _id: req.params.contactId, ownerId: req.user._id });
        if (!contact) return sendError(res, 404, "NOT_FOUND", "Contact was not found");
        return res.status(204).send();
    } catch (error) {
        return next(error);
    }
}

async function inviteContact(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.contactId)) return sendError(res, 404, "NOT_FOUND", "Contact was not found");
        const token = randomBytes(32).toString("hex");
        const contact = await EmergencyContact.findOneAndUpdate(
            { _id: req.params.contactId, ownerId: req.user._id, consentStatus: { $ne: "CONSENTED" } },
            { $set: { invitationHash: createHash("sha256").update(token).digest("hex"), invitationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), consentStatus: "PENDING", recipientId: null, consentedAt: null } },
            { returnDocument: "after" },
        );
        if (!contact) return sendError(res, 409, "INVITE_UNAVAILABLE", "This contact is unavailable or already connected");
        return res.status(200).json({ success: true, data: { token, expiresAt: contact.invitationExpiresAt } });
    } catch (error) { return next(error); }
}

function invitationQuery(req) {
    const token = req.body?.token;
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null;
    return { invitationHash: createHash("sha256").update(token).digest("hex"), invitationExpiresAt: { $gt: new Date() }, consentStatus: "PENDING", ownerId: { $ne: req.user._id } };
}

async function inspectInvitation(req, res, next) {
    try {
        const query = invitationQuery(req);
        const contact = query ? await EmergencyContact.findOne(query) : null;
        if (!contact) return sendError(res, 404, "INVITE_UNAVAILABLE", "This invitation is invalid, expired, already accepted, or belongs to you");
        const owner = await User.findById(contact.ownerId).select("name accountStatus");
        if (!owner || owner.accountStatus !== "ACTIVE") return sendError(res, 404, "INVITE_UNAVAILABLE", "This invitation is no longer available");
        return res.status(200).json({ success: true, data: { ownerName: owner.name, expiresAt: contact.invitationExpiresAt } });
    } catch (error) { return next(error); }
}

async function acceptInvitation(req, res, next) {
    try {
        const query = invitationQuery(req);
        if (!query) return sendError(res, 404, "INVITE_UNAVAILABLE", "This invitation is no longer available");
        const contact = await EmergencyContact.findOneAndUpdate(query,
            { $set: { recipientId: req.user._id, consentStatus: "CONSENTED", consentedAt: new Date() }, $unset: { invitationHash: 1, invitationExpiresAt: 1 } }, { returnDocument: "after" });
        if (!contact) return sendError(res, 404, "INVITE_UNAVAILABLE", "This invitation is no longer available");
        return res.status(200).json({ success: true, data: { consentStatus: contact.consentStatus } });
    } catch (error) { return next(error); }
}

async function listConnections(req, res, next) {
    try {
        const contacts = await EmergencyContact.find({ recipientId: req.user._id, consentStatus: "CONSENTED" }).populate("ownerId", "name accountStatus");
        const connections = contacts.filter(contact => contact.ownerId?.accountStatus === "ACTIVE").map(contact => ({ id: contact._id, ownerName: contact.ownerId.name, connectedAt: contact.consentedAt }));
        return res.status(200).json({ success: true, data: { connections } });
    } catch (error) { return next(error); }
}

async function revokeConnection(req, res, next) {
    try {
        if (!mongoose.isValidObjectId(req.params.contactId)) return sendError(res, 404, "NOT_FOUND", "Connection was not found");
        const contact = await EmergencyContact.findOneAndUpdate({ _id: req.params.contactId, recipientId: req.user._id, consentStatus: "CONSENTED" }, { $set: { consentStatus: "REVOKED" } }, { returnDocument: "after" });
        if (!contact) return sendError(res, 404, "NOT_FOUND", "Connection was not found");
        return res.status(204).send();
    } catch (error) { return next(error); }
}

export { listContacts, createContact, deleteContact, inviteContact, inspectInvitation, acceptInvitation, listConnections, revokeConnection };
