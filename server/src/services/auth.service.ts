import { env } from "../config/env";
import { Profile } from "../models/Profile";
import { RefreshSession } from "../models/RefreshSession";
import { User } from "../models/User";
import { HttpError } from "../utils/errors";
import { checkPassword, hashPassword } from "../utils/password";
import { randomToken, sha256, signAccessToken } from "../utils/tokens";
import { queueEmail } from "./mailer";

function publicUser(user: { id: string; name: string; email: string; emailVerifiedAt: Date | null }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

function previewLink(path: string) {
  if (env.NODE_ENV === "production") return undefined;
  return path;
}

async function issueSession(userId: string, userAgent: string) {
  const refreshToken = randomToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  await RefreshSession.create({
    userId,
    tokenHash: sha256(refreshToken),
    expiresAt,
    userAgent: userAgent.slice(0, 240),
  });
  return {
    accessToken: signAccessToken(userId),
    refreshToken,
  };
}

export async function register(input: { name: string; email: string; password: string }, userAgent: string) {
  const email = input.email.toLowerCase();
  const existing = await User.findOne({ email }).select("_id");
  if (existing) throw new HttpError(409, "EMAIL_TAKEN", "An account with that email already exists");

  const verifyToken = randomToken();
  const user = await User.create({
    name: input.name,
    email,
    passwordHash: await hashPassword(input.password),
    emailVerifyTokenHash: sha256(verifyToken),
  });
  await Profile.create({ userId: user._id });

  const link = `${env.CLIENT_ORIGINS.split(",")[0]}/verify-email?token=${verifyToken}`;
  queueEmail(email, "Verify your JobFlow email", `Open this link to verify your email:\n\n${link}\n`);

  const session = await issueSession(user.id, userAgent);
  return {
    user: publicUser(user),
    ...session,
    devLink: previewLink(link),
  };
}

export async function login(input: { email: string; password: string }, userAgent: string) {
  const user = await User.findOne({ email: input.email.toLowerCase() }).select("+passwordHash name email emailVerifiedAt");
  if (!user || !(await checkPassword(input.password, user.passwordHash))) {
    throw new HttpError(401, "BAD_LOGIN", "Email or password is wrong");
  }
  const session = await issueSession(user.id, userAgent);
  return { user: publicUser(user), ...session };
}

export async function rotateSession(refreshToken: string | undefined, userAgent: string) {
  if (!refreshToken) throw new HttpError(401, "UNAUTHENTICATED", "Sign in to continue");
  const tokenHash = sha256(refreshToken);
  const current = await RefreshSession.findOne({ tokenHash });
  if (!current) throw new HttpError(401, "UNAUTHENTICATED", "Sign in to continue");

  if (current.revokedAt) {
    await RefreshSession.updateMany({ userId: current.userId, revokedAt: null }, { revokedAt: new Date() });
    throw new HttpError(401, "SESSION_REUSED", "This session was already used. Sign in again.");
  }
  if (current.expiresAt.getTime() < Date.now()) {
    throw new HttpError(401, "UNAUTHENTICATED", "Sign in to continue");
  }

  const next = await issueSession(current.userId.toString(), userAgent);
  current.revokedAt = new Date();
  const created = await RefreshSession.findOne({ tokenHash: sha256(next.refreshToken) });
  current.replacedBy = created?._id ?? null;
  await current.save();
  return next;
}

export async function logout(refreshToken: string | undefined) {
  if (!refreshToken) return;
  await RefreshSession.updateOne({ tokenHash: sha256(refreshToken), revokedAt: null }, { revokedAt: new Date() });
}

export async function listSessions(userId: string, refreshToken: string | undefined) {
  const currentHash = refreshToken ? sha256(refreshToken) : "";
  const sessions = await RefreshSession.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  return sessions.map((session) => ({
    id: session.id,
    userAgent: session.userAgent,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    current: session.tokenHash === currentHash,
  }));
}

export async function revokeSession(userId: string, sessionId: string) {
  const session = await RefreshSession.findOne({ _id: sessionId, userId, revokedAt: null });
  if (!session) throw new HttpError(404, "NOT_FOUND", "Session not found");
  session.revokedAt = new Date();
  await session.save();
}

export async function me(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Sign in to continue");
  return publicUser(user);
}

export async function verifyEmail(token: string) {
  const user = await User.findOne({ emailVerifyTokenHash: sha256(token) }).select("+emailVerifyTokenHash");
  if (!user) throw new HttpError(400, "BAD_TOKEN", "This verification link is invalid or already used");
  user.emailVerifiedAt = new Date();
  user.emailVerifyTokenHash = null;
  await user.save();
  return publicUser(user);
}

export async function resendVerification(userId: string) {
  const user = await User.findById(userId).select("+emailVerifyTokenHash");
  if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Sign in to continue");
  if (user.emailVerifiedAt) return { alreadyVerified: true as const, devLink: undefined };
  const verifyToken = randomToken();
  user.emailVerifyTokenHash = sha256(verifyToken);
  await user.save();
  const link = `${env.CLIENT_ORIGINS.split(",")[0]}/verify-email?token=${verifyToken}`;
  queueEmail(user.email, "Verify your JobFlow email", `Open this link to verify your email:\n\n${link}\n`);
  return { alreadyVerified: false as const, devLink: previewLink(link) };
}

export async function forgotPassword(email: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+resetTokenHash");
  let devLink: string | undefined;
  if (user) {
    const token = randomToken();
    user.resetTokenHash = sha256(token);
    user.resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const link = `${env.CLIENT_ORIGINS.split(",")[0]}/reset-password?token=${token}`;
    queueEmail(user.email, "Reset your JobFlow password", `This link expires in one hour:\n\n${link}\n`);
    devLink = previewLink(link);
  }
  return {
    message: "If that email is registered, a reset link is on the way.",
    devLink,
  };
}

export async function resetPassword(token: string, password: string) {
  const user = await User.findOne({
    resetTokenHash: sha256(token),
    resetTokenExpiresAt: { $gt: new Date() },
  }).select("+passwordHash +resetTokenHash");
  if (!user) throw new HttpError(400, "BAD_TOKEN", "This reset link is invalid or expired");
  user.passwordHash = await hashPassword(password);
  user.resetTokenHash = null;
  user.resetTokenExpiresAt = null;
  await user.save();
  await RefreshSession.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
}
