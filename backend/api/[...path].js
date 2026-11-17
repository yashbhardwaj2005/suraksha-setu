import app from "../src/app.js";
import connectDB from "../src/config/db.js";

async function handler(req, res) {
    await connectDB();
    return app(req, res);
}

export default handler;
