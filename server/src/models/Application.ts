import { Schema, model, Types } from "mongoose";
import { applicationStatuses, type ApplicationStatus } from "../constants";

export interface IApplication {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  jobId: Types.ObjectId;
  resumeId: Types.ObjectId | null;
  resumeLabel: string;
  title: string;
  company: string;
  status: ApplicationStatus;
  notes: string;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", default: null },
    resumeLabel: { type: String, default: "" },
    title: { type: String, required: true },
    company: { type: String, required: true },
    status: { type: String, enum: applicationStatuses, default: "DISCOVERED" },
    notes: { type: String, default: "" },
    appliedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ userId: 1, status: 1, updatedAt: -1 });

export const Application = model<IApplication>("Application", applicationSchema);
