import app from "../src/app.js";
import connectDB from "../src/config/db.js";

async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    try {
        await connectDB();
    } catch (error) {
        let reason = "Check database configuration and index permissions.";
        if (error.name === "MongooseServerSelectionError") reason = "Check Atlas cluster availability and network access.";
        if (error.code === 18 || error.code === 8000) reason = "Check database authentication.";
        console.error("Database initialization failed. " + reason);
        return res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "Database is temporarily unavailable. Please try again later" } });
    }
    return app(req, res);
}

export default handler;
