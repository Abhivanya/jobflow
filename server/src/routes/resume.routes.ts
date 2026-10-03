import { randomUUID } from "node:crypto";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { env } from "../config/env";
import * as resumes from "../controllers/resume.controller";
import { requireAuth } from "../middleware/auth";
import { wrap } from "../middleware/wrap";
import { matchSchema } from "../validators/schemas";
import { validateBody } from "../middleware/errorHandler";

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, env.UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
});

export const resumeRouter = Router();
resumeRouter.use(requireAuth);
resumeRouter.get("/", wrap(resumes.list));
resumeRouter.post("/", upload.single("file"), wrap(resumes.upload));
resumeRouter.get("/:id/download", wrap(resumes.download));
resumeRouter.patch("/:id/default", wrap(resumes.makeDefault));
resumeRouter.delete("/:id", wrap(resumes.remove));

export const tailorRouter = Router();
tailorRouter.use(requireAuth);
tailorRouter.post("/:jobId/tailor", validateBody(matchSchema), wrap(resumes.tailor));
