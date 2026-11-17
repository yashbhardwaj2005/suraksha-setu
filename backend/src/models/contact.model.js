import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, minLength: 2, maxLength: 80 },
    relationship: { type: String, required: true, trim: true, maxLength: 50 },
    phone: { type: String, required: true, trim: true, match: /^\+?[0-9]{10,15}$/ },
    consentStatus: { type: String, enum: ["PENDING", "CONSENTED", "REVOKED"], default: "PENDING" },
}, { timestamps: true });

const EmergencyContact = mongoose.model("EmergencyContact", contactSchema);

export default EmergencyContact;
