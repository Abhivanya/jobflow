import type { ApplicationStatus } from "../constants";
import { ApplicationEvent } from "../models/ApplicationEvent";

export function addEvent(input: {
  userId: string;
  applicationId: string;
  type: string;
  fromStatus?: ApplicationStatus | null;
  toStatus?: ApplicationStatus | null;
  summary: string;
}) {
  return ApplicationEvent.create({
    userId: input.userId,
    applicationId: input.applicationId,
    type: input.type,
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus ?? null,
    summary: input.summary,
  });
}
