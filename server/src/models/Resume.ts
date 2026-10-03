import { Schema, model, Types } from "mongoose";

export interface TailoredContent {
  targetTitle: string;
  targetCompany: string;
  note: string;
  headline: string;
  summary: string;
  skills: string[];
  experience: Array<{
    company: string;
    title: string;
    dates: string;
    description: string;
    relevant: boolean;
  }>;
  projects: Array<{ name: string; description: string; technologies: string[] }>;
  education: Array<{ school: string; degree: string; field: string }>;
}

export interface IResume {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  kind: "upload" | "tailored";
  label: string;
  version: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  isDefault: boolean;
  parsedText: string;
  parseStatus: "pending" | "ready" | "failed" | "skipped";
  parseError: string;
  jobId: Types.ObjectId | null;
  content: TailoredContent | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const resumeSchema = new Schema<IResume>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ["upload", "tailored"], required: true },
    label: { type: String, required: true },
    version: { type: Number, required: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    isDefault: { type: Boolean, default: false },
    parsedText: { type: String, default: "" },
    parseStatus: { type: String, enum: ["pending", "ready", "failed", "skipped"], default: "pending" },
    parseError: { type: String, default: "" },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", default: null },
    content: { type: Schema.Types.Mixed, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

resumeSchema.index({ userId: 1, deletedAt: 1, createdAt: -1 });
resumeSchema.index({ userId: 1, version: 1 }, { unique: true });

export const Resume = model<IResume>("Resume", resumeSchema);
