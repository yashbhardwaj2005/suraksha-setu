import { PORT } from "./config/env.js";
import app from "./app.js";
import connectDB from "./config/db.js";

try {
    await connectDB();

    const server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });

    server.on("error", () => {
        console.error("Unable to start HTTP server. Check whether the port is already in use.");
        process.exit(1);
    });
} catch {
    console.error("Unable to start server. Check database connectivity and server configuration.");
    process.exit(1);
}
