import { Schema, model, Types } from "mongoose";
import { followUpStatuses, type FollowUpStatus } from "../constants";

export interface IFollowUp {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  applicationId: Types.ObjectId;
  dueAt: Date;
  message: string;
  status: FollowUpStatus;
  response: string;
  respondedAt: Date | null;
  remindedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const followUpSchema = new Schema<IFollowUp>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    dueAt: { type: Date, required: true },
    message: { type: String, default: "" },
    status: { type: String, enum: followUpStatuses, default: "scheduled" },
    response: { type: String, default: "" },
    respondedAt: { type: Date, default: null },
    remindedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

followUpSchema.index({ userId: 1, status: 1, dueAt: 1 });
followUpSchema.index({ applicationId: 1, createdAt: -1 });

export const FollowUp = model<IFollowUp>("FollowUp", followUpSchema);
