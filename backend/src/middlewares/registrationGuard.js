// Browser requests come through the same-origin Vite proxy in development.
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5173";

function registrationGuard(req, res, next) {
    const origin = req.get("Origin");

    if ((origin && origin !== frontendOrigin) || (!origin && req.get("Sec-Fetch-Site") === "cross-site")) {
        return res.status(403).json({
            success: false,
            error: { code: "ORIGIN_NOT_ALLOWED", message: "This origin is not allowed to register accounts" },
        });
    }

    if (!req.is("application/json")) {
        return res.status(415).json({
            success: false,
            error: { code: "JSON_REQUIRED", message: "Send the request as application/json" },
        });
    }

    return next();
}

export default registrationGuard;
