import type { Request, Response } from "express";
import { currentUser } from "../middleware/auth";
import * as discover from "../services/discover.service";
import * as jobs from "../services/job.service";
import { importJobFromUrl } from "../services/importUrl";
import { ok } from "../utils/http";
import { discoverSchema, listJobsSchema, parseQuery } from "../validators/schemas";

export async function list(req: Request, res: Response) {
  const query = parseQuery(listJobsSchema, req.query);
  ok(res, await jobs.listJobs(currentUser(req).id, query));
}

export async function get(req: Request, res: Response) {
  ok(res, { job: await jobs.getJob(currentUser(req).id, String(req.params.id)) });
}

export async function create(req: Request, res: Response) {
  ok(res, { job: await jobs.createJob(currentUser(req).id, req.body) }, 201);
}

export async function update(req: Request, res: Response) {
  ok(res, { job: await jobs.updateJob(currentUser(req).id, String(req.params.id), req.body) });
}

export async function remove(req: Request, res: Response) {
  await jobs.removeJob(currentUser(req).id, String(req.params.id));
  ok(res, { deleted: true });
}

export async function analyze(req: Request, res: Response) {
  const forceRules = req.query.method === "rules";
  ok(res, { job: await jobs.analyze(currentUser(req).id, String(req.params.id), forceRules) });
}

export async function match(req: Request, res: Response) {
  ok(res, { job: await jobs.matchJob(currentUser(req).id, String(req.params.id), req.body.resumeId) });
}

export async function discoverJobs(req: Request, res: Response) {
  const query = parseQuery(discoverSchema, req.query);
  ok(res, { jobs: await discover.searchRemotive(query.search, query.category), attribution: "Listings from Remotive. They are delayed about 24 hours." });
}

export async function saveDiscovered(req: Request, res: Response) {
  const job = await discover.saveRemotiveJob(currentUser(req).id, req.body);
  ok(res, { job: await jobs.getJob(currentUser(req).id, job.id) }, 201);
}

export async function importUrl(req: Request, res: Response) {
  const job = await importJobFromUrl(currentUser(req).id, req.body.url);
  ok(res, { job: await jobs.getJob(currentUser(req).id, job.id) }, 201);
}
