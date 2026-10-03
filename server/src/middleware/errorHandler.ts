import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { env } from "../config/env";
import { HttpError } from "../utils/errors";
import { logger } from "../utils/logger";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? [],
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION",
        message: "Some fields need another look",
        details: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      success: false,
      error: { code: "BAD_JSON", message: "Request body is not valid JSON", details: [] },
    });
    return;
  }

  const mongoCode = typeof err === "object" && err && "code" in err ? (err as { code?: number }).code : undefined;
  if (mongoCode === 11000) {
    res.status(409).json({
      success: false,
      error: { code: "CONFLICT", message: "That record already exists", details: [] },
    });
    return;
  }

  logger.error({ err }, "unhandled error");
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL",
      message: env.NODE_ENV === "production" ? "Something went wrong" : err instanceof Error ? err.message : "Something went wrong",
      details: [],
    },
  });
}

export function validateBody<T extends ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(
        new HttpError(
          400,
          "VALIDATION",
          "Some fields need another look",
          parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        ),
      );
      return;
    }
    req.body = parsed.data;
    next();
  };
}
