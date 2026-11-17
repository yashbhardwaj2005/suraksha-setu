import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import authRouter from "./routes/auth.routes.js";
import contactRouter from "./routes/contact.routes.js";
import sosRouter from "./routes/sos.routes.js";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5173";

app.use(helmet());
app.use(cors({ origin: frontendOrigin, credentials: true, methods: ["GET", "POST", "PATCH", "DELETE"], allowedHeaders: ["Content-Type", "X-CSRF-Token"] }));
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());
app.get("/api/v1/health", (req, res) => res.status(200).json({ success: true, data: { status: "ok" } }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/contacts", contactRouter);
app.use("/api/v1/sos", sosRouter);
app.use(notFound);
app.use(errorHandler);

export default app;
