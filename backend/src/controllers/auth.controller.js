import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import SOS from "../models/sos.model.js";
import mongoose from "mongoose";
import { PushSubscription } from "../models/push.model.js";
import { sessionSecret } from "../config/session.js";

function sendError(res, statusCode, code, message) {
    return res.status(statusCode).json({ success: false, error: { code: code, message: message } });
}

function getSafeUser(user) {
    return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, accountStatus: user.accountStatus, verificationStatus: user.verificationStatus, volunteerAvailable: Boolean(user.volunteerAvailable && user.presenceExpiresAt > new Date()), presenceExpiresAt: user.presenceExpiresAt };
}

function createSession(res, user) {
    const token = jwt.sign({ sub: user._id.toString(), version: user.authVersion }, sessionSecret, { expiresIn: "8h" });
    const sameSite = process.env.COOKIE_SAME_SITE === "none" ? "none" : "lax";
    res.cookie("suraksha_session", token, { httpOnly: true, sameSite: sameSite, secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000, path: "/" });
}

async function register(req, res, next) {
    try {
        if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return sendError(res, 400, "VALIDATION_ERROR", "Request body must be a JSON object");
        const allowedFields = ["name", "email", "password", "role"];
        for (const field of Object.keys(req.body)) {
            if (!allowedFields.includes(field)) return sendError(res, 400, "VALIDATION_ERROR", "Only name, email, password and role are accepted");
        }
        const { name, email, password } = req.body;
        const role = req.body.role === undefined ? "USER" : req.body.role;
        if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") return sendError(res, 400, "VALIDATION_ERROR", "Name, email and password must be strings");
        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();
        if (normalizedName.length < 2 || normalizedName.length > 80 || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || password.length < 12 || Buffer.byteLength(password, "utf8") > 72 || !["USER", "VOLUNTEER"].includes(role)) {
            return sendError(res, 400, "VALIDATION_ERROR", "Registration details are invalid");
        }
        if (await User.exists({ email: normalizedEmail })) return sendError(res, 409, "EMAIL_EXISTS", "An account with this email already exists");
        const user = await User.create({ name: normalizedName, email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12), role: role });
        return res.status(201).json({ success: true, data: { user: getSafeUser(user) } });
    } catch (error) {
        if (error.code === 11000) return sendError(res, 409, "EMAIL_EXISTS", "An account with this email already exists");
        if (error.name === "ValidationError") return sendError(res, 400, "VALIDATION_ERROR", "Registration details are invalid");
        return next(error);
    }
}

async function login(req, res, next) {
    try {
        const { email, password } = req.body || {};
        if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) return sendError(res, 400, "VALIDATION_ERROR", "Email and password are required");
        const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
        if (!user || user.accountStatus !== "ACTIVE" || !(await bcrypt.compare(password, user.passwordHash))) return sendError(res, 401, "INVALID_CREDENTIALS", "Email or password is incorrect");
        createSession(res, user);
        return res.status(200).json({ success: true, data: { user: getSafeUser(user) } });
    } catch (error) {
        return next(error);
    }
}

function me(req, res) {
    return res.status(200).json({ success: true, data: { user: getSafeUser(req.user) } });
}

async function logout(req, res, next) {
    try {
        await User.updateOne({ _id: req.user._id }, { $inc: { authVersion: 1 }, $set: { volunteerAvailable: false }, $unset: { volunteerLocation: 1, volunteerAccuracy: 1, presenceExpiresAt: 1, presenceSession: 1 } });
        await PushSubscription.deleteMany({ ownerId: req.user._id });
        const sameSite = process.env.COOKIE_SAME_SITE === "none" ? "none" : "lax";
        res.clearCookie("suraksha_session", { httpOnly: true, sameSite: sameSite, secure: process.env.NODE_ENV === "production", path: "/" });
        return res.status(204).send();
    } catch (error) {
        return next(error);
    }
}

async function requestVolunteerVerification(req, res, next) {
    try {
        if (req.user.role === "ADMIN") return sendError(res, 403, "FORBIDDEN", "Administrator accounts cannot apply as volunteers");
        if (!["NOT_REQUESTED", "REJECTED"].includes(req.user.verificationStatus)) return sendError(res, 409, "VERIFICATION_EXISTS", "A verification request is already being reviewed");
        req.user.verificationStatus = "PENDING";
        await req.user.save();
        return res.status(200).json({ success: true, data: { user: getSafeUser(req.user) } });
    } catch (error) {
        return next(error);
    }
}

async function listVolunteerApplications(req, res, next) {
    try {
        const users = await User.find({ role: { $ne: "ADMIN" }, verificationStatus: "PENDING" });
        return res.status(200).json({ success: true, data: { users: users.map(getSafeUser) } });
    } catch (error) {
        return next(error);
    }
}

async function reviewVolunteer(req, res, next) {
    try {
        const status = req.body?.verificationStatus;
        if (!["APPROVED", "REJECTED"].includes(status)) return sendError(res, 400, "VALIDATION_ERROR", "Choose APPROVED or REJECTED");
        if (!mongoose.isValidObjectId(req.params.userId)) return sendError(res, 404, "NOT_FOUND", "Volunteer was not found");
        const user = await User.findOne({ _id: req.params.userId, role: { $ne: "ADMIN" }, accountStatus: "ACTIVE" });
        if (!user) return sendError(res, 404, "NOT_FOUND", "Volunteer was not found");
        user.verificationStatus = status;
        if (status !== "APPROVED") { user.volunteerAvailable = false; user.volunteerLocation = undefined; user.volunteerAccuracy = undefined; user.presenceExpiresAt = undefined; user.presenceSession = undefined; }
        await user.save();
        return res.status(200).json({ success: true, data: { user: getSafeUser(user) } });
    } catch (error) {
        return next(error);
    }
}

async function switchMode(req, res, next) {
    try {
        const role = req.body?.role;
        if (req.user.role === "ADMIN" || !["USER", "VOLUNTEER"].includes(role)) return sendError(res, 400, "INVALID_MODE", "Choose personal or volunteer mode");
        if (role === "VOLUNTEER" && await SOS.exists({ userId: req.user._id, isOpen: true })) return sendError(res, 409, "ACTIVE_SOS_EXISTS", "End your own SOS before volunteering");
        const user = await User.findByIdAndUpdate(req.user._id, { $set: { role, volunteerAvailable: false }, $unset: { volunteerLocation: 1, volunteerAccuracy: 1, presenceExpiresAt: 1, presenceSession: 1 } }, { returnDocument: "after" });
        await SOS.updateMany({ assignedVolunteerId: req.user._id, isOpen: true }, { $set: { status: "ACTIVE" }, $unset: { assignedVolunteerId: 1, responderExpiresAt: 1 } });
        return res.status(200).json({ success: true, data: { user: getSafeUser(user) } });
    } catch (error) { return next(error); }
}

export { register, login, me, logout, requestVolunteerVerification, listVolunteerApplications, reviewVolunteer, switchMode };
