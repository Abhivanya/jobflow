import nodemailer from "nodemailer";
import { env } from "../config/env";
import { enqueue } from "../utils/queue";
import { logger } from "../utils/logger";

async function deliver(to: string, subject: string, text: string) {
  if (!env.SMTP_HOST) {
    if (env.NODE_ENV !== "production") logger.info({ to, subject, text }, "smtp not configured");
    else logger.info({ to, subject }, "smtp not configured");
    return;
  }
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: env.MAIL_FROM, to, subject, text });
}

export function queueEmail(to: string, subject: string, text: string) {
  enqueue(`mail:${to}:${subject}:${text.slice(0, 24)}`, () => deliver(to, subject, text), 3);
}
