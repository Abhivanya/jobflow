import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { mkdirSync } from "node:fs";
import mongoose from "mongoose";
import { clientOrigins, env } from "./config/env";
import { checkOrigin } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";
import { authRouter } from "./routes/auth.routes";
import { jobRouter } from "./routes/job.routes";
import { resumeRouter, tailorRouter } from "./routes/resume.routes";
import { applicationRouter, dashboardRouter, followUpRouter, notificationRouter, profileRouter } from "./routes/resource.routes";
import multer from "multer";
import { HttpError } from "./utils/errors";

mkdirSync(env.UPLOAD_DIR, { recursive: true });

export const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(checkOrigin);

if (env.NODE_ENV !== "test") {
  app.use((req, res, next) => {
    const started = Date.now();
    res.on("finish", () => {
      logger.info({ method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - started });
    });
    next();
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ success: true, data: { ok: mongoose.connection.readyState === 1 } });
});

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/resumes", resumeRouter);
app.use("/api/jobs", jobRouter);
app.use("/api/jobs", tailorRouter);
app.use("/api/applications", applicationRouter);
app.use("/api/follow-ups", followUpRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/dashboard", dashboardRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `Nothing at ${req.method} ${req.path}`, details: [] },
  });
});

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    next(new HttpError(400, "BAD_FILE", `Resumes need to be under ${env.MAX_UPLOAD_MB} MB`));
    return;
  }
  errorHandler(err, req, res, next);
});
