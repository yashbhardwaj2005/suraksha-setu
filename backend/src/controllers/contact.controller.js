import EmergencyContact from "../models/contact.model.js";

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
        const contact = await EmergencyContact.findOneAndDelete({ _id: req.params.contactId, ownerId: req.user._id });
        if (!contact) return sendError(res, 404, "NOT_FOUND", "Contact was not found");
        return res.status(204).send();
    } catch (error) {
        return next(error);
    }
}

export { listContacts, createContact, deleteContact };
