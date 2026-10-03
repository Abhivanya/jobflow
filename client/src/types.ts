export const statuses = [
  "DISCOVERED",
  "SAVED",
  "APPLYING",
  "APPLIED",
  "FOLLOW_UP",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

export type AppStatus = (typeof statuses)[number];

export const statusLabel: Record<AppStatus, string> = {
  DISCOVERED: "Discovered",
  SAVED: "Saved",
  APPLYING: "Applying",
  APPLIED: "Applied",
  FOLLOW_UP: "Follow up",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const employmentTypes = ["full_time", "part_time", "contract", "internship", "freelance"] as const;
export type EmploymentType = (typeof employmentTypes)[number];

export const employmentLabel: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

export interface Profile {
  id: string;
  headline: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  education: Array<{ school: string; degree: string; field: string; startDate: string; endDate: string }>;
  experience: Array<{
    company: string;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
  }>;
  projects: Array<{ name: string; url: string; technologies: string[]; description: string }>;
  certifications: Array<{ name: string; issuer: string; date: string }>;
  links: { linkedin: string; github: string; portfolio: string; website: string };
  preferredRoles: string[];
  preferredLocations: string[];
  experienceLevel: "intern" | "junior" | "mid" | "senior" | "lead" | null;
}

export interface Resume {
  id: string;
  kind: "upload" | "tailored";
  label: string;
  version: number;
  originalName: string;
  mimeType: string;
  size: number;
  isDefault: boolean;
  parseStatus: "pending" | "ready" | "failed" | "skipped";
  parseError: string;
  jobId: string | null;
  content: {
    note: string;
    headline: string;
    summary: string;
    skills: string[];
    experience: Array<{ company: string; title: string; dates: string; description: string; relevant: boolean }>;
  } | null;
  createdAt: string;
}

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
}

export interface JobMatch {
  score: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  matchedKeywords: string[];
  experienceGap: string;
  suggestions: string[];
  resumeId: string | null;
}

export interface Job {
  id: string;
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
  source: "manual" | "url" | "remotive";
  saved: boolean;
  analysis: JobAnalysis | null;
  lastMatch: JobMatch | null;
  createdAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  resumeId: string | null;
  resumeLabel: string;
  title: string;
  company: string;
  status: AppStatus;
  notes: string;
  appliedAt: string | null;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  summary: string;
  fromStatus: AppStatus | null;
  toStatus: AppStatus | null;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  applicationId: string;
  dueAt: string;
  message: string;
  status: "scheduled" | "sent" | "done" | "skipped";
  response: string;
  respondedAt: string | null;
  title: string;
  company: string;
}

export interface Notice {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}
