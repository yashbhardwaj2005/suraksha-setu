import mongoose from "mongoose";

function removePasswordHash(doc, result) {
    delete result.passwordHash;
    delete result.volunteerLocation;
    delete result.volunteerAccuracy;
    delete result.presenceSession;
    return result;
}

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minLength: 2,
        maxLength: 80,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        maxLength: 254,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: {
        type: String,
        required: true,
        select: false,
    },
    role: {
        type: String,
        required: true,
        enum: ["USER", "ADMIN", "VOLUNTEER"],
        default: "USER",
    },
    accountStatus: {
        type: String,
        required: true,
        enum: ["ACTIVE", "SUSPENDED"],
        default: "ACTIVE",
    },
    verificationStatus: {
        type: String,
        required: true,
        enum: ["NOT_REQUESTED", "PENDING", "APPROVED", "REJECTED"],
        default: "NOT_REQUESTED",
    },
    authVersion: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        validate: {
            validator: Number.isInteger,
            message: "authVersion must be an integer",
        },
    },
    volunteerAvailable: { type: Boolean, default: false },
    presenceSession: { type: String, select: false },
    presenceExpiresAt: { type: Date },
    volunteerLocation: {
        type: new mongoose.Schema({ type: { type: String, enum: ["Point"], required: true }, coordinates: { type: [Number], required: true } }, { _id: false }),
        select: false,
    },
    volunteerAccuracy: { type: Number, min: 0, select: false },
}, {
    timestamps: true,
    toJSON: {
        transform: removePasswordHash,
    },
});

userSchema.index({ volunteerLocation: "2dsphere" });

const User = mongoose.model("User", userSchema);

export default User;
