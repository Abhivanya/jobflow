import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "./errors";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken() {
  return randomBytes(32).toString("hex");
}

export function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_MINUTES * 60,
  });
}

export function readAccessToken(token: string) {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof decoded === "string" || typeof decoded.sub !== "string") {
      throw new Error("bad token");
    }
    return decoded.sub;
  } catch {
    throw new HttpError(401, "UNAUTHENTICATED", "Sign in to continue");
  }
}
