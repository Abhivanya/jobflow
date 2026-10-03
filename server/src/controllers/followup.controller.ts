import type { Request, Response } from "express";
import { currentUser } from "../middleware/auth";
import * as followUps from "../services/followup.service";
import { ok } from "../utils/http";

export async function list(req: Request, res: Response) {
  ok(res, { followUps: await followUps.listFollowUps(currentUser(req).id) });
}

export async function create(req: Request, res: Response) {
  ok(res, { followUp: await followUps.createFollowUp(currentUser(req).id, req.body) }, 201);
}

export async function update(req: Request, res: Response) {
  ok(res, { followUp: await followUps.updateFollowUp(currentUser(req).id, String(req.params.id), req.body) });
}
