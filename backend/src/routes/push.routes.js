import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireAuth } from "../middlewares/auth.js";
import { requireCsrf } from "../middlewares/csrf.js";
import { getPushKey, subscribePush, unsubscribePush } from "../controllers/push.controller.js";

const pushRouter = Router();
const limiter = rateLimit({ windowMs: 60000, limit: 20, standardHeaders: true, legacyHeaders: false });
pushRouter.use(requireAuth);
pushRouter.get("/key", getPushKey);
pushRouter.post("/subscriptions", requireCsrf, limiter, subscribePush);
pushRouter.delete("/subscriptions", requireCsrf, limiter, unsubscribePush);

export default pushRouter;
