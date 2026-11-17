import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { sessionSecret } from "../config/session.js";

function sendUnauthorized(res) {
    return res.status(401).json({ success: false, error: { code: "UNAUTHENTICATED", message: "Sign in is required" } });
}

async function requireAuth(req, res, next) {
    try {
        const token = req.cookies?.suraksha_session;
        if (!token) return sendUnauthorized(res);
        const payload = jwt.verify(token, sessionSecret);
        const user = await User.findById(payload.sub);
        if (!user || user.accountStatus !== "ACTIVE" || user.authVersion !== payload.version) return sendUnauthorized(res);
        req.user = user;
        return next();
    } catch (error) {
        return sendUnauthorized(res);
    }
}

function requireRole(...roles) {
    return function checkRole(req, res, next) {
        if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "You do not have permission for this action" } });
        return next();
    };
}

export { requireAuth, requireRole };
