import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { listContacts, createContact, deleteContact } from "../controllers/contact.controller.js";
import { requireCsrf } from "../middlewares/csrf.js";

const contactRouter = Router();

contactRouter.use(requireAuth);
contactRouter.get("/", listContacts);
contactRouter.post("/", requireCsrf, createContact);
contactRouter.delete("/:contactId", requireCsrf, deleteContact);

export default contactRouter;
