import { Schema, model, Types } from "mongoose";
import type { ApplicationStatus } from "../constants";

export interface IApplicationEvent {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  applicationId: Types.ObjectId;
  type: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus | null;
  summary: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IApplicationEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    type: { type: String, required: true },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    summary: { type: String, required: true },
  },
  { timestamps: true },
);

eventSchema.index({ applicationId: 1, createdAt: 1 });
eventSchema.index({ userId: 1, createdAt: -1 });

export const ApplicationEvent = model<IApplicationEvent>("ApplicationEvent", eventSchema);
