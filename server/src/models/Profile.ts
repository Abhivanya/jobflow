import { Schema, model, Types } from "mongoose";
import type { ExperienceLevel } from "../constants";

export interface EducationItem {
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface ExperienceItem {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface ProjectItem {
  name: string;
  url: string;
  technologies: string[];
  description: string;
}

export interface CertificationItem {
  name: string;
  issuer: string;
  date: string;
}

export interface ProfileLinks {
  linkedin: string;
  github: string;
  portfolio: string;
  website: string;
}

export interface IProfile {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  headline: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  links: ProfileLinks;
  preferredRoles: string[];
  preferredLocations: string[];
  experienceLevel: ExperienceLevel | null;
  createdAt: Date;
  updatedAt: Date;
}

const educationSchema = new Schema<EducationItem>(
  {
    school: { type: String, default: "" },
    degree: { type: String, default: "" },
    field: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
  },
  { _id: false },
);

const experienceSchema = new Schema<ExperienceItem>(
  {
    company: { type: String, default: "" },
    title: { type: String, default: "" },
    location: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    current: { type: Boolean, default: false },
    description: { type: String, default: "" },
  },
  { _id: false },
);

const projectSchema = new Schema<ProjectItem>(
  {
    name: { type: String, default: "" },
    url: { type: String, default: "" },
    technologies: { type: [String], default: [] },
    description: { type: String, default: "" },
  },
  { _id: false },
);

const certificationSchema = new Schema<CertificationItem>(
  {
    name: { type: String, default: "" },
    issuer: { type: String, default: "" },
    date: { type: String, default: "" },
  },
  { _id: false },
);

const profileSchema = new Schema<IProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    headline: { type: String, default: "" },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    summary: { type: String, default: "" },
    skills: { type: [String], default: [] },
    education: { type: [educationSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },
    links: {
      linkedin: { type: String, default: "" },
      github: { type: String, default: "" },
      portfolio: { type: String, default: "" },
      website: { type: String, default: "" },
    },
    preferredRoles: { type: [String], default: [] },
    preferredLocations: { type: [String], default: [] },
    experienceLevel: { type: String, default: null },
  },
  { timestamps: true },
);

export const Profile = model<IProfile>("Profile", profileSchema);
