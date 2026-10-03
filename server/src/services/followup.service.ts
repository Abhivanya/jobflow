import type { z } from "zod";
import { FollowUp, type IFollowUp } from "../models/FollowUp";
import { Application } from "../models/Application";
import { HttpError } from "../utils/errors";
import { addEvent } from "./events";
import { notify } from "./notification.service";
import type { followUpCreateSchema, followUpPatchSchema } from "../validators/schemas";

function present(item: IFollowUp, extra?: { title?: string; company?: string }) {
  return {
    id: item._id.toString(),
    applicationId: item.applicationId.toString(),
    dueAt: item.dueAt,
    message: item.message,
    status: item.status,
    response: item.response,
    respondedAt: item.respondedAt,
    remindedAt: item.remindedAt,
    title: extra?.title ?? "",
    company: extra?.company ?? "",
    createdAt: item.createdAt,
  };
}

export async function listFollowUps(userId: string) {
  const items = await FollowUp.find({ userId }).sort({ dueAt: 1 }).limit(100);
  const apps = await Application.find({ _id: { $in: items.map((item) => item.applicationId) } }).select("title company");
  const byId = new Map(apps.map((app) => [app.id, app]));
  return items.map((item) => {
    const app = byId.get(item.applicationId.toString());
    return present(item, { title: app?.title, company: app?.company });
  });
}

export async function createFollowUp(userId: string, input: z.infer<typeof followUpCreateSchema>) {
  const application = await Application.findOne({ _id: input.applicationId, userId });
  if (!application) throw new HttpError(404, "NOT_FOUND", "Application not found");
  const followUp = await FollowUp.create({
    userId,
    applicationId: application._id,
    dueAt: new Date(input.dueAt),
    message: input.message,
    status: "scheduled",
  });
  if (application.status === "APPLIED" || application.status === "APPLYING") {
    application.status = "FOLLOW_UP";
    await application.save();
  }
  await addEvent({
    userId,
    applicationId: application.id,
    type: "follow_up_scheduled",
    summary: `Follow-up scheduled for ${application.company}`,
  });
  return present(followUp, { title: application.title, company: application.company });
}

export async function updateFollowUp(userId: string, id: string, input: z.infer<typeof followUpPatchSchema>) {
  const followUp = await FollowUp.findOne({ _id: id, userId });
  if (!followUp) throw new HttpError(404, "NOT_FOUND", "Follow-up not found");
  const application = await Application.findOne({ _id: followUp.applicationId, userId });
  if (input.message !== undefined) followUp.message = input.message;
  if (input.dueAt) followUp.dueAt = new Date(input.dueAt);
  if (input.status) followUp.status = input.status;
  if (input.response !== undefined) followUp.response = input.response;
  if (input.respondedAt !== undefined) followUp.respondedAt = input.respondedAt ? new Date(input.respondedAt) : null;
  if (input.response && followUp.status === "scheduled") followUp.status = "done";
  await followUp.save();

  if (application && input.status === "sent") {
    await addEvent({
      userId,
      applicationId: application.id,
      type: "follow_up_sent",
      summary: `Follow-up marked sent for ${application.company}`,
    });
  }
  if (application && input.response) {
    await addEvent({
      userId,
      applicationId: application.id,
      type: "recruiter_response",
      summary: `Recruiter response on ${application.company}`,
    });
    await notify({
      userId,
      type: "recruiter",
      title: `Response from ${application.company}`,
      body: input.response.slice(0, 180),
      link: `/applications/${application.id}`,
    });
  }
  return present(followUp, { title: application?.title, company: application?.company });
}
