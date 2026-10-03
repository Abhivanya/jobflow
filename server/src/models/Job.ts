import { Schema, model, Types } from "mongoose";
import { employmentTypes, jobSources, type EmploymentType, type JobSource } from "../constants";

export interface JobAnalysis {
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequirements: string[];
  educationRequirements: string[];
  responsibilities: string[];
  keywords: string[];
  technologies: string[];
  seniority: string;
  method: "rules" | "openai";
  note: string;
  analyzedAt: Date;
}

export interface JobMatch {
  score: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  matchedKeywords: string[];
  experienceGap: string;
  suggestions: string[];
  resumeId: string | null;
  createdAt: Date;
}

export interface IJob {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  company: string;
  title: string;
  location: string;
  employmentType: EmploymentType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryText: string;
  url: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  source: JobSource;
  externalId: string | null;
  saved: boolean;
  analysis: JobAnalysis | null;
  lastMatch: JobMatch | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    company: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    location: { type: String, default: "" },
    employmentType: { type: String, enum: [...employmentTypes, null], default: null },
    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    salaryText: { type: String, default: "" },
    url: { type: String, default: "" },
    description: { type: String, default: "" },
    requiredSkills: { type: [String], default: [] },
    preferredSkills: { type: [String], default: [] },
    source: { type: String, enum: jobSources, default: "manual" },
    externalId: { type: String, default: null },
    saved: { type: Boolean, default: false },
    analysis: { type: Schema.Types.Mixed, default: null },
    lastMatch: { type: Schema.Types.Mixed, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

jobSchema.index({ userId: 1, deletedAt: 1, createdAt: -1 });
jobSchema.index({ userId: 1, saved: 1, createdAt: -1 });
jobSchema.index(
  { userId: 1, source: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: "string" } } },
);

export const Job = model<IJob>("Job", jobSchema);
