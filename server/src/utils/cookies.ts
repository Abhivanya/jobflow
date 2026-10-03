import type { CookieOptions, Response } from "express";
import { cookieSecure, env } from "../config/env";

export const ACCESS_COOKIE = "jf_access";
export const REFRESH_COOKIE = "jf_refresh";

function base(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeMs,
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, base(env.ACCESS_TOKEN_MINUTES * 60 * 1000));
  res.cookie(REFRESH_COOKIE, refreshToken, base(env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000));
}

export function clearAuthCookies(res: Response) {
  const options = { path: "/", sameSite: "lax" as const, secure: cookieSecure() };
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
}
