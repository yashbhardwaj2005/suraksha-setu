import mongoose from "mongoose";

const sosSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["ACTIVE", "ACCEPTED", "RESPONDING", "RESOLVED", "CANCELLED"], default: "ACTIVE", index: true },
    isOpen: { type: Boolean, default: true, index: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    accuracy: { type: Number, min: 0 },
    assignedVolunteerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

sosSchema.index({ userId: 1, isOpen: 1 }, { unique: true, partialFilterExpression: { isOpen: true } });

const SOS = mongoose.model("SOS", sosSchema);

export default SOS;
