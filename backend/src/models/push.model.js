import mongoose from "mongoose";

const pushSchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpointHash: { type: String, required: true, unique: true },
    subscription: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
    expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });

const attemptSchema = new mongoose.Schema({
    sosId: { type: mongoose.Schema.Types.ObjectId, ref: "SOS", required: true, index: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ["ATTEMPTED", "ACCEPTED", "FAILED"], required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });
attemptSchema.index({ sosId: 1, subscriptionId: 1 }, { unique: true });

const PushSubscription = mongoose.model("PushSubscription", pushSchema);
const PushAttempt = mongoose.model("PushAttempt", attemptSchema);

export { PushSubscription, PushAttempt };
