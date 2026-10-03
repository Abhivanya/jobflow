import type { QueryFilter } from "mongoose";
import type { z } from "zod";
import { statusLabel } from "../constants";
import { Application, type IApplication } from "../models/Application";
import { ApplicationEvent } from "../models/ApplicationEvent";
import { Job } from "../models/Job";
import { Resume } from "../models/Resume";
import { HttpError } from "../utils/errors";
import { pageMeta } from "../utils/http";
import { addEvent } from "./events";
import { notify } from "./notification.service";
import type { applicationCreateSchema, applicationPatchSchema, listApplicationsSchema } from "../validators/schemas";

function present(app: IApplication) {
  return {
    id: app._id.toString(),
    jobId: app.jobId.toString(),
    resumeId: app.resumeId ? app.resumeId.toString() : null,
    resumeLabel: app.resumeLabel,
    title: app.title,
    company: app.company,
    status: app.status,
    notes: app.notes,
    appliedAt: app.appliedAt,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
}

async function resumeLabel(userId: string, resumeId?: string | null) {
  if (!resumeId) return { resumeId: null as string | null, resumeLabel: "" };
  const resume = await Resume.findOne({ _id: resumeId, userId, deletedAt: null });
  if (!resume) throw new HttpError(404, "NOT_FOUND", "Resume not found");
  return { resumeId: resume.id, resumeLabel: resume.label };
}

export async function listApplications(userId: string, query: z.infer<typeof listApplicationsSchema>) {
  const filter: QueryFilter<IApplication> = { userId };
  if (query.status) filter.status = query.status;
  if (query.q) {
    const pattern = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: pattern }, { company: pattern }];
  }
  const [items, total] = await Promise.all([
    Application.find(filter)
      .sort({ updatedAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Application.countDocuments(filter),
  ]);
  return { items: items.map(present), ...pageMeta(query.page, query.limit, total) };
}

export async function createApplication(userId: string, input: z.infer<typeof applicationCreateSchema>) {
  const job = await Job.findOne({ _id: input.jobId, userId, deletedAt: null });
  if (!job) throw new HttpError(404, "NOT_FOUND", "Job not found");
  const existing = await Application.findOne({ userId, jobId: job._id });
  if (existing) return { application: present(existing), created: false };

  const resume = await resumeLabel(userId, input.resumeId);
  const application = await Application.create({
    userId,
    jobId: job._id,
    resumeId: resume.resumeId,
    resumeLabel: resume.resumeLabel,
    title: job.title,
    company: job.company,
    status: input.status,
    appliedAt: input.status === "APPLIED" ? new Date() : null,
  });
  await addEvent({
    userId,
    applicationId: application.id,
    type: "created",
    toStatus: application.status,
    summary: `Started tracking ${job.title} at ${job.company}`,
  });
  return { application: present(application), created: true };
}

export async function getApplication(userId: string, id: string) {
  const application = await Application.findOne({ _id: id, userId });
  if (!application) throw new HttpError(404, "NOT_FOUND", "Application not found");
  const events = await ApplicationEvent.find({ applicationId: application._id }).sort({ createdAt: 1 });
  return {
    application: present(application),
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      summary: event.summary,
      createdAt: event.createdAt,
    })),
  };
}

export async function updateApplication(userId: string, id: string, input: z.infer<typeof applicationPatchSchema>) {
  const application = await Application.findOne({ _id: id, userId });
  if (!application) throw new HttpError(404, "NOT_FOUND", "Application not found");
  const fromStatus = application.status;

  if (input.notes !== undefined) application.notes = input.notes;
  if (input.resumeId !== undefined) {
    if (!input.resumeId) {
      application.resumeId = null;
      application.resumeLabel = "";
    } else {
      const resume = await Resume.findOne({ _id: input.resumeId, userId, deletedAt: null });
      if (!resume) throw new HttpError(404, "NOT_FOUND", "Resume not found");
      application.resumeId = resume._id;
      application.resumeLabel = resume.label;
    }
  }
  if (input.status && input.status !== application.status) {
    application.status = input.status;
    if (input.status === "APPLIED" && !application.appliedAt) application.appliedAt = new Date();
  }
  await application.save();

  if (input.status && input.status !== fromStatus) {
    await addEvent({
      userId,
      applicationId: application.id,
      type: "status_changed",
      fromStatus,
      toStatus: input.status,
      summary: `${application.company}: ${statusLabel[fromStatus]} → ${statusLabel[input.status]}`,
    });
    await notify({
      userId,
      type: "application",
      title: `${application.company} is now ${statusLabel[input.status]}`,
      body: application.title,
      link: `/applications/${application.id}`,
    });
  }

  return present(application);
}

