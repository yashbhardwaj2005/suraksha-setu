function registrationGuard(req, res, next) {
    const allowedOrigin = process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5173";
    const origin = req.get("Origin");
    if (origin && origin !== allowedOrigin) return res.status(403).json({ success: false, error: { code: "ORIGIN_NOT_ALLOWED", message: "This origin is not allowed" } });
    if (!origin && req.get("Sec-Fetch-Site") === "cross-site") return res.status(403).json({ success: false, error: { code: "ORIGIN_NOT_ALLOWED", message: "This origin is not allowed" } });
    if (!req.is("application/json")) return res.status(415).json({ success: false, error: { code: "JSON_REQUIRED", message: "Send application/json" } });
    return next();
}

export default registrationGuard;
