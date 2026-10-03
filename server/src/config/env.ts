import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

// Local dev reads the repo .env. Docker and CI already inject variables, and
// anything already set in the process wins so tests are not overwritten.
function loadLocalEnv() {
  const path = resolve(__dirname, "../../../.env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadLocalEnv();

const raw = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || "4000",
  MONGO_URI: process.env.MONGO_URI,
  REDIS_URL: process.env.REDIS_URL || undefined,
  CLIENT_ORIGINS: process.env.CLIENT_ORIGINS || "http://localhost:5173",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  ACCESS_TOKEN_MINUTES: process.env.ACCESS_TOKEN_MINUTES || "15",
  REFRESH_TOKEN_DAYS: process.env.REFRESH_TOKEN_DAYS || "7",
  COOKIE_SECURE: process.env.COOKIE_SECURE || undefined,
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",
  MAX_UPLOAD_MB: process.env.MAX_UPLOAD_MB || "5",
  SMTP_HOST: process.env.SMTP_HOST || undefined,
  SMTP_PORT: process.env.SMTP_PORT || undefined,
  SMTP_USER: process.env.SMTP_USER || undefined,
  SMTP_PASS: process.env.SMTP_PASS || undefined,
  MAIL_FROM: process.env.MAIL_FROM || "JobFlow <no-reply@localhost>",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
};

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().min(1).max(65535),
  MONGO_URI: z.string().min(1),
  REDIS_URL: z.string().min(1).optional(),
  CLIENT_ORIGINS: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  ACCESS_TOKEN_MINUTES: z.coerce.number().int().min(5).max(60),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(30),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  UPLOAD_DIR: z.string().min(1),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(10),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1),
  OPENAI_BASE_URL: z.string().min(1),
});

const parsed = schema.safeParse(raw);

if (!parsed.success) {
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Environment is invalid. Compare your .env with .env.example.");
}

export const env = parsed.data;

export const clientOrigins = env.CLIENT_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const maxUploadBytes = env.MAX_UPLOAD_MB * 1024 * 1024;

export function cookieSecure() {
  if (env.COOKIE_SECURE === "true") return true;
  if (env.COOKIE_SECURE === "false") return false;
  return env.NODE_ENV === "production";
}
