import type { NextFunction, Request, Response } from "express";
import { clientOrigins, env } from "../config/env";
import { User } from "../models/User";
import { HttpError } from "../utils/errors";
import { ACCESS_COOKIE } from "../utils/cookies";
import { readAccessToken } from "../utils/tokens";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export function currentUser(req: Request) {
  if (!req.user) throw new HttpError(401, "UNAUTHENTICATED", "Sign in to continue");
  return req.user;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (!token) throw new HttpError(401, "UNAUTHENTICATED", "Sign in to continue");
    const userId = readAccessToken(token);
    const user = await User.findById(userId).select("email name emailVerifiedAt");
    if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Sign in to continue");
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: Boolean(user.emailVerifiedAt),
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function checkOrigin(req: Request, _res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }
  const origin = req.get("origin");
  if (!origin) {
    if (env.NODE_ENV === "production") {
      next(new HttpError(403, "BAD_ORIGIN", "Missing request origin"));
      return;
    }
    next();
    return;
  }
  if (!clientOrigins.includes(origin)) {
    next(new HttpError(403, "BAD_ORIGIN", "Request origin is not allowed"));
    return;
  }
  next();
}
