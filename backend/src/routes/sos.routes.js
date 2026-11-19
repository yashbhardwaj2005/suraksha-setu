import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { createSOS, getActiveSOS, cancelSOS, listActiveSOS, acceptSOS, updateSOSLocation, listSharedSOS, getSharedSOS, getAssignedSOS, respondToSOS, releaseSOS, setCommunitySharing } from "../controllers/sos.controller.js";
import { updatePresence } from "../controllers/volunteer.controller.js";
import { requireCsrf } from "../middlewares/csrf.js";

const sosRouter = Router();
const sosLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 12, keyGenerator: req => req.user.id, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: "RATE_LIMITED", message: "Too many SOS attempts. Call 112 for urgent help and retry later" } } });
const presenceLimiter = rateLimit({ windowMs: 60000, limit: 30, keyGenerator: req => req.user.id, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: "RATE_LIMITED", message: "Location updates are too frequent. Wait a moment and retry" } } });

sosRouter.use(requireAuth);
sosRouter.post("/", requireCsrf, sosLimiter, createSOS);
sosRouter.get("/active", getActiveSOS);
sosRouter.get("/shared", listSharedSOS);
sosRouter.get("/:sosId/shared", getSharedSOS);
sosRouter.patch("/:sosId/location", requireCsrf, updateSOSLocation);
sosRouter.patch("/:sosId/cancel", requireCsrf, cancelSOS);
sosRouter.get("/volunteer/requests", requireRole("VOLUNTEER"), listActiveSOS);
sosRouter.patch("/volunteer/presence", requireCsrf, presenceLimiter, updatePresence);
sosRouter.post("/volunteer/presence", requireRole("VOLUNTEER"), requireCsrf, presenceLimiter, updatePresence);
sosRouter.get("/volunteer/assignment", requireRole("VOLUNTEER"), getAssignedSOS);
sosRouter.patch("/:sosId/accept", requireRole("VOLUNTEER"), requireCsrf, acceptSOS);
sosRouter.patch("/:sosId/respond", requireRole("VOLUNTEER"), requireCsrf, respondToSOS);
sosRouter.patch("/:sosId/release", requireCsrf, releaseSOS);
sosRouter.patch("/:sosId/community", requireCsrf, setCommunitySharing);

export default sosRouter;
