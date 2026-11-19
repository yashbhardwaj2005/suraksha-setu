import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { listContacts, createContact, deleteContact, inviteContact, inspectInvitation, acceptInvitation, listConnections, revokeConnection } from "../controllers/contact.controller.js";
import { rateLimit } from "express-rate-limit";
import { requireCsrf } from "../middlewares/csrf.js";

const contactRouter = Router();
const invitationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false });

contactRouter.use(requireAuth);
contactRouter.get("/", listContacts);
contactRouter.get("/connections", listConnections);
contactRouter.post("/invitations/inspect", requireCsrf, invitationLimiter, inspectInvitation);
contactRouter.post("/invitations/accept", requireCsrf, invitationLimiter, acceptInvitation);
contactRouter.post("/connections/:contactId/revoke", requireCsrf, revokeConnection);
contactRouter.post("/", requireCsrf, createContact);
contactRouter.post("/:contactId/invite", requireCsrf, invitationLimiter, inviteContact);
contactRouter.delete("/:contactId", requireCsrf, deleteContact);

export default contactRouter;
