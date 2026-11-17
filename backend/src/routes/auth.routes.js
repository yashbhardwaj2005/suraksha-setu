import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { register, login, me, logout, requestVolunteerVerification, listVolunteerApplications, reviewVolunteer } from "../controllers/auth.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import registrationGuard from "../middlewares/registrationGuard.js";
import { createCsrfToken, requireCsrf } from "../middlewares/csrf.js";

const authRouter = Router();
const registrationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: "RATE_LIMITED", message: "Too many registration attempts. Please try again later" } } });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: "RATE_LIMITED", message: "Too many sign-in attempts. Please try again later" } } });

authRouter.post("/register", registrationGuard, registrationLimiter, register);
authRouter.post("/login", registrationGuard, loginLimiter, login);
authRouter.get("/me", requireAuth, me);
authRouter.get("/csrf", requireAuth, createCsrfToken);
authRouter.post("/logout", requireAuth, requireCsrf, logout);
authRouter.post("/volunteer-verification", requireAuth, requireCsrf, requestVolunteerVerification);
authRouter.get("/volunteer-applications", requireAuth, requireRole("ADMIN"), listVolunteerApplications);
authRouter.patch("/volunteer-applications/:userId", requireAuth, requireRole("ADMIN"), requireCsrf, reviewVolunteer);

export { registrationLimiter, loginLimiter };
export default authRouter;
