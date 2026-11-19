import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { createSOS, getActiveSOS, cancelSOS, listActiveSOS, acceptSOS, updateSOSLocation, listSharedSOS, getSharedSOS } from "../controllers/sos.controller.js";
import { requireCsrf } from "../middlewares/csrf.js";

const sosRouter = Router();

sosRouter.use(requireAuth);
sosRouter.post("/", requireCsrf, createSOS);
sosRouter.get("/active", getActiveSOS);
sosRouter.get("/shared", listSharedSOS);
sosRouter.get("/:sosId/shared", getSharedSOS);
sosRouter.patch("/:sosId/location", requireCsrf, updateSOSLocation);
sosRouter.patch("/:sosId/cancel", requireCsrf, cancelSOS);
sosRouter.get("/volunteer/requests", requireRole("VOLUNTEER"), listActiveSOS);
sosRouter.patch("/:sosId/accept", requireRole("VOLUNTEER"), requireCsrf, acceptSOS);

export default sosRouter;
