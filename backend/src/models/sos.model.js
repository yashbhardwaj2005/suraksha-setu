import mongoose from "mongoose";

function requiresLocation() { return this.isOpen; }

const sosSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["ACTIVE", "ACCEPTED", "RESPONDING", "RESOLVED", "CANCELLED"], default: "ACTIVE", index: true },
    isOpen: { type: Boolean, default: true, index: true },
    latitude: { type: Number, required: requiresLocation, min: -90, max: 90 },
    longitude: { type: Number, required: requiresLocation, min: -180, max: 180 },
    accuracy: { type: Number, min: 0 },
    location: { type: new mongoose.Schema({ type: { type: String, enum: ["Point"], required: true }, coordinates: { type: [Number], required: true } }, { _id: false }), select: false },
    communityRequested: { type: Boolean, default: false },
    recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    locationUpdatedAt: { type: Date, default: Date.now },
    sharingExpiresAt: { type: Date, default: function sharingExpiry() { return new Date(Date.now() + 60 * 60 * 1000); } },
    endedAt: { type: Date },
    assignedVolunteerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    responderExpiresAt: { type: Date },
}, { timestamps: true });

sosSchema.index({ userId: 1, isOpen: 1 }, { unique: true, partialFilterExpression: { isOpen: true } });
sosSchema.index({ location: "2dsphere" });
sosSchema.index({ assignedVolunteerId: 1 }, { unique: true, partialFilterExpression: { isOpen: true, assignedVolunteerId: { $type: "objectId" } } });

const SOS = mongoose.model("SOS", sosSchema);

export default SOS;
