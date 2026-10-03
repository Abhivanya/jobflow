import type { Request, Response } from "express";
import { currentUser } from "../middleware/auth";
import * as profiles from "../services/profile.service";
import { ok } from "../utils/http";

export async function get(req: Request, res: Response) {
  ok(res, { profile: await profiles.getOrCreateProfile(currentUser(req).id) });
}

export async function update(req: Request, res: Response) {
  ok(res, { profile: await profiles.updateProfile(currentUser(req).id, req.body) });
}
