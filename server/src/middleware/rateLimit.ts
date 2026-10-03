import rateLimit from "express-rate-limit";
import { env } from "../config/env";

function limited(limit: number, windowMs: number) {
  return rateLimit({
    windowMs,
    limit: env.NODE_ENV === "test" ? 1000 : limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: { code: "RATE_LIMIT", message: "Too many attempts. Wait a bit and try again.", details: [] },
      });
    },
  });
}

export const authLimiter = limited(20, 15 * 60 * 1000);
export const analyzeLimiter = limited(30, 60 * 60 * 1000);
export const discoverLimiter = limited(30, 60 * 60 * 1000);
