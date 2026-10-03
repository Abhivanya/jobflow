import { Schema, model, Types } from "mongoose";

export interface IRefreshSession {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBy: Types.ObjectId | null;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
}

const refreshSchema = new Schema<IRefreshSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBy: { type: Schema.Types.ObjectId, default: null },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true },
);

refreshSchema.index({ userId: 1, expiresAt: 1 });

export const RefreshSession = model<IRefreshSession>("RefreshSession", refreshSchema);
