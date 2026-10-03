import type { Request, Response } from "express";
import * as auth from "../services/auth.service";
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "../utils/cookies";
import { ok } from "../utils/http";
import { currentUser } from "../middleware/auth";

function agent(req: Request) {
  return req.get("user-agent") || "";
}

export async function register(req: Request, res: Response) {
  const result = await auth.register(req.body, agent(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  ok(res, { user: result.user, devLink: result.devLink }, 201);
}

export async function login(req: Request, res: Response) {
  const result = await auth.login(req.body, agent(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  ok(res, { user: result.user });
}

export async function refresh(req: Request, res: Response) {
  const result = await auth.rotateSession(req.cookies?.[REFRESH_COOKIE], agent(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  ok(res, { refreshed: true });
}

export async function logout(req: Request, res: Response) {
  await auth.logout(req.cookies?.[REFRESH_COOKIE]);
  clearAuthCookies(res);
  ok(res, { loggedOut: true });
}

export async function me(req: Request, res: Response) {
  ok(res, { user: await auth.me(currentUser(req).id) });
}

export async function sessions(req: Request, res: Response) {
  ok(res, { sessions: await auth.listSessions(currentUser(req).id, req.cookies?.[REFRESH_COOKIE]) });
}

export async function revoke(req: Request, res: Response) {
  await auth.revokeSession(currentUser(req).id, String(req.params.id));
  ok(res, { revoked: true });
}

export async function verifyEmail(req: Request, res: Response) {
  ok(res, { user: await auth.verifyEmail(req.body.token) });
}

export async function resend(req: Request, res: Response) {
  ok(res, await auth.resendVerification(currentUser(req).id));
}

export async function forgot(req: Request, res: Response) {
  ok(res, await auth.forgotPassword(req.body.email));
}

export async function reset(req: Request, res: Response) {
  await auth.resetPassword(req.body.token, req.body.password);
  clearAuthCookies(res);
  ok(res, { reset: true });
}
