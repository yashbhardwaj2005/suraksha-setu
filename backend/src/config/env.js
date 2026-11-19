// Node loads .env before importing this module (see the package scripts).
// A serverless function never opens a port; keep local startup validation.
const rawPort = process.env.PORT?.trim() ?? (process.env.VERCEL === "1" ? "5000" : undefined);
const port = Number(rawPort);

if (!rawPort || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535. Set PORT in backend/.env.");
}

const PORT = port;

const mongodbUri = process.env.MONGODB_URI?.trim();

if (!mongodbUri || !/^mongodb(?:\+srv)?:\/\//.test(mongodbUri)) {
    throw new Error("MONGODB_URI is required and must start with mongodb:// or mongodb+srv://.");
}

const MONGODB_URI = mongodbUri;

export { PORT, MONGODB_URI };
