import { randomBytes, timingSafeEqual } from "node:crypto";

function createCsrfToken(req, res) {
    const token = randomBytes(32).toString("hex");
    res.cookie("suraksha_csrf", token, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 8 * 60 * 60 * 1000,
        path: "/",
    });
    return res.status(200).json({ success: true, data: { csrfToken: token } });
}

function requireCsrf(req, res, next) {
    const origin = req.get("Origin");
    const allowedOrigin = process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5173";
    const cookieToken = req.cookies?.suraksha_csrf;
    const headerToken = req.get("X-CSRF-Token");
    if (!origin || origin !== allowedOrigin || !cookieToken || !headerToken || cookieToken.length !== headerToken.length || !timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
        return res.status(403).json({ success: false, error: { code: "CSRF_REJECTED", message: "Request could not be verified" } });
    }
    return next();
}

export { createCsrfToken, requireCsrf };
