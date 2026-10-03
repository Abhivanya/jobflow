import type { Request, Response } from "express";
import { currentUser } from "../middleware/auth";
import * as apps from "../services/application.service";
import { ok } from "../utils/http";
import { listApplicationsSchema, parseQuery } from "../validators/schemas";

export async function list(req: Request, res: Response) {
  ok(res, await apps.listApplications(currentUser(req).id, parseQuery(listApplicationsSchema, req.query)));
}

export async function create(req: Request, res: Response) {
  const result = await apps.createApplication(currentUser(req).id, req.body);
  ok(res, result, result.created ? 201 : 200);
}

export async function get(req: Request, res: Response) {
  ok(res, await apps.getApplication(currentUser(req).id, String(req.params.id)));
}

export async function update(req: Request, res: Response) {
  ok(res, { application: await apps.updateApplication(currentUser(req).id, String(req.params.id), req.body) });
}
