import mongoose from "mongoose";

function removePasswordHash(doc, result) {
    delete result.passwordHash;
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
}, {
    timestamps: true,
    toJSON: {
        transform: removePasswordHash,
    },
});

const User = mongoose.model("User", userSchema);

export default User;
