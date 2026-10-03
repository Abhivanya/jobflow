import type { Request, Response } from "express";
import { currentUser } from "../middleware/auth";
import * as resumes from "../services/resume.service";
import { ok } from "../utils/http";

export async function list(req: Request, res: Response) {
  ok(res, { resumes: await resumes.listResumes(currentUser(req).id) });
}

export async function upload(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ success: false, error: { code: "BAD_FILE", message: "Choose a file first", details: [] } });
    return;
  }
  resumes.assertUpload(req.file);
  const label = typeof req.body?.label === "string" ? req.body.label : undefined;
  ok(res, { resume: await resumes.saveUpload(currentUser(req).id, req.file, label) }, 201);
}

export async function download(req: Request, res: Response) {
  const file = await resumes.downloadResume(currentUser(req).id, String(req.params.id));
  res.download(file.filePath, file.name);
}

export async function remove(req: Request, res: Response) {
  await resumes.removeResume(currentUser(req).id, String(req.params.id));
  ok(res, { deleted: true });
}

export async function makeDefault(req: Request, res: Response) {
  ok(res, { resume: await resumes.makeDefault(currentUser(req).id, String(req.params.id)) });
}

export async function tailor(req: Request, res: Response) {
  const resumeId = typeof req.body?.resumeId === "string" ? req.body.resumeId : undefined;
  ok(res, { resume: await resumes.tailorResume(currentUser(req).id, String(req.params.jobId), resumeId) }, 201);
}
