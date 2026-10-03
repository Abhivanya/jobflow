import type { QueryFilter } from "mongoose";
import type { z } from "zod";
import { Application } from "../models/Application";
import { Job, type IJob } from "../models/Job";
import { Profile } from "../models/Profile";
import { Resume } from "../models/Resume";
import { HttpError } from "../utils/errors";
import { pageMeta } from "../utils/http";
import { analyzeJob } from "./analyze";
import { addEvent } from "./events";
import { htmlToText } from "./htmlText";
import { buildMatch, projectSkills } from "./match";
import type { jobPatchSchema, jobSchema, listJobsSchema } from "../validators/schemas";

type JobInput = z.infer<typeof jobSchema>;
type JobQuery = z.infer<typeof listJobsSchema>;

function snippet(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
}

function present(job: IJob, full = false) {
  return {
    id: job._id.toString(),
    company: job.company,
    title: job.title,
    location: job.location,
    employmentType: job.employmentType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryText: job.salaryText,
    url: job.url,
    description: full ? job.description : snippet(job.description),
    requiredSkills: job.requiredSkills,
    preferredSkills: job.preferredSkills,
    source: job.source,
    externalId: job.externalId,
    saved: job.saved,
    analysis: job.analysis,
    lastMatch: job.lastMatch,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listJobs(userId: string, query: JobQuery) {
  const filter: QueryFilter<IJob> = { userId, deletedAt: null };
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ title: pattern }, { company: pattern }, { location: pattern }];
  }
  if (query.saved) filter.saved = query.saved === "true";
  if (query.employmentType) filter.employmentType = query.employmentType;
  if (query.source) filter.source = query.source;

  const direction = query.order === "asc" ? 1 : -1;
  const [items, total] = await Promise.all([
    Job.find(filter)
      .sort({ [query.sort]: direction })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Job.countDocuments(filter),
  ]);

  return { items: items.map((job) => present(job)), ...pageMeta(query.page, query.limit, total) };
}

export async function getJob(userId: string, id: string) {
  const job = await Job.findOne({ _id: id, userId, deletedAt: null });
  if (!job) throw new HttpError(404, "NOT_FOUND", "Job not found");
  return present(job, true);
}

export async function createJob(userId: string, input: JobInput) {
  const job = await Job.create({
    ...input,
    userId,
    description: htmlToText(input.description),
    source: "manual",
  });
  return present(job, true);
}

export async function updateJob(userId: string, id: string, input: z.infer<typeof jobPatchSchema>) {
  const patch = { ...input };
  if (typeof patch.description === "string") patch.description = htmlToText(patch.description);
  const job = await Job.findOneAndUpdate({ _id: id, userId, deletedAt: null }, patch, { new: true });
  if (!job) throw new HttpError(404, "NOT_FOUND", "Job not found");
  return present(job, true);
}

export async function removeJob(userId: string, id: string) {
  const job = await Job.findOneAndUpdate({ _id: id, userId, deletedAt: null }, { deletedAt: new Date() });
  if (!job) throw new HttpError(404, "NOT_FOUND", "Job not found");
}

export async function analyze(userId: string, id: string, forceRules: boolean) {
  const job = await Job.findOne({ _id: id, userId, deletedAt: null });
  if (!job) throw new HttpError(404, "NOT_FOUND", "Job not found");
  const analysis = await analyzeJob(job.title, job.description, forceRules);
  job.analysis = { ...analysis, analyzedAt: new Date() };
  if (job.requiredSkills.length === 0) job.requiredSkills = analysis.requiredSkills;
  if (job.preferredSkills.length === 0) job.preferredSkills = analysis.preferredSkills;
  await job.save();
  return present(job, true);
}

export async function matchJob(userId: string, id: string, resumeId?: string) {
  const job = await Job.findOne({ _id: id, userId, deletedAt: null });
  if (!job) throw new HttpError(404, "NOT_FOUND", "Job not found");
  const profile = await Profile.findOne({ userId });
  const resume = resumeId
    ? await Resume.findOne({ _id: resumeId, userId, deletedAt: null })
    : await Resume.findOne({ userId, deletedAt: null, isDefault: true });
  if (resumeId && !resume) throw new HttpError(404, "NOT_FOUND", "Resume not found");

  const required = [...job.requiredSkills, ...(job.analysis?.requiredSkills ?? [])];
  const preferred = [...job.preferredSkills, ...(job.analysis?.preferredSkills ?? [])];
  const result = buildMatch({
    profileSkills: profile?.skills ?? [],
    projectTech: profile ? projectSkills(profile.projects) : [],
    experience: profile?.experience ?? [],
    resumeText: resume?.parsedText ?? "",
    requiredSkills: required,
    preferredSkills: preferred,
    keywords: job.analysis?.keywords ?? [],
    description: job.description,
  });

  job.lastMatch = { ...result, resumeId: resume ? resume.id : null, createdAt: new Date() };
  await job.save();

  const application = await Application.findOne({ userId, jobId: job._id });
  if (application) {
    await addEvent({
      userId,
      applicationId: application.id,
      type: "resume_matched",
      summary:
        result.score === null
          ? `Checked overlap for ${job.title}. No skill list to score yet.`
          : `Overlap for ${job.title} is ${result.score} out of 100.`,
    });
  }

  return present(job, true);
}
