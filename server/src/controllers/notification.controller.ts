import type { Request, Response } from "express";
import { currentUser } from "../middleware/auth";
import * as notes from "../services/notification.service";
import { ok } from "../utils/http";
import { listQuerySchema, parseQuery } from "../validators/schemas";

export async function list(req: Request, res: Response) {
  const query = parseQuery(listQuerySchema, req.query);
  ok(res, await notes.listNotifications(currentUser(req).id, query.page, query.limit));
}

export async function unread(req: Request, res: Response) {
  ok(res, await notes.unreadCount(currentUser(req).id));
}

export async function read(req: Request, res: Response) {
  ok(res, { notification: await notes.markRead(currentUser(req).id, String(req.params.id)) });
}

export async function readAll(req: Request, res: Response) {
  await notes.markAllRead(currentUser(req).id);
  ok(res, { read: true });
}
