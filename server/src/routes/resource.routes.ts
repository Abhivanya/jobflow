import { Router } from "express";
import * as apps from "../controllers/application.controller";
import * as followUps from "../controllers/followup.controller";
import * as notes from "../controllers/notification.controller";
import * as dashboard from "../controllers/dashboard.controller";
import * as profiles from "../controllers/profile.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/errorHandler";
import { wrap } from "../middleware/wrap";
import {
  applicationCreateSchema,
  applicationPatchSchema,
  followUpCreateSchema,
  followUpPatchSchema,
  profileSchema,
} from "../validators/schemas";

export const profileRouter = Router();
profileRouter.use(requireAuth);
profileRouter.get("/", wrap(profiles.get));
profileRouter.put("/", validateBody(profileSchema), wrap(profiles.update));

export const applicationRouter = Router();
applicationRouter.use(requireAuth);
applicationRouter.get("/", wrap(apps.list));
applicationRouter.post("/", validateBody(applicationCreateSchema), wrap(apps.create));
applicationRouter.get("/:id", wrap(apps.get));
applicationRouter.patch("/:id", validateBody(applicationPatchSchema), wrap(apps.update));

export const followUpRouter = Router();
followUpRouter.use(requireAuth);
followUpRouter.get("/", wrap(followUps.list));
followUpRouter.post("/", validateBody(followUpCreateSchema), wrap(followUps.create));
followUpRouter.patch("/:id", validateBody(followUpPatchSchema), wrap(followUps.update));

export const notificationRouter = Router();
notificationRouter.use(requireAuth);
notificationRouter.get("/", wrap(notes.list));
notificationRouter.get("/unread-count", wrap(notes.unread));
notificationRouter.post("/read-all", wrap(notes.readAll));
notificationRouter.patch("/:id/read", wrap(notes.read));

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);
dashboardRouter.get("/", wrap(dashboard.get));
