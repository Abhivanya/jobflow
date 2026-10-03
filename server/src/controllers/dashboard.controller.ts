import type { Request, Response } from "express";
import { currentUser } from "../middleware/auth";
import { dashboard } from "../services/dashboard.service";
import { ok } from "../utils/http";

export async function get(req: Request, res: Response) {
  ok(res, await dashboard(currentUser(req).id));
}
