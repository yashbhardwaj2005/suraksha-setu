import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { register } from "../controllers/auth.controller.js";
import registrationGuard from "../middlewares/registrationGuard.js";

const authRouter = Router();

const registrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many registration attempts. Please try again later" },
    },
});

authRouter.post("/register", registrationGuard, registrationLimiter, register);

export { registrationLimiter };
export default authRouter;
