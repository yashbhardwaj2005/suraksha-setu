// Node loads .env before importing this module (see the package scripts).
const rawPort = process.env.PORT?.trim();
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
