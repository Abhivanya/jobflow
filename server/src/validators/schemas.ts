import { z } from "zod";
import { applicationStatuses, employmentTypes, experienceLevels, followUpStatuses, jobSources } from "../constants";
import { HttpError } from "../utils/errors";

const looseDate = z.string().trim().regex(/^$|^\d{4}(-\d{2}){0,2}$/, "Use a date like 2024-05");
const optionalUrl = z
  .string()
  .trim()
  .max(200)
  .refine((value) => value === "" || /^https?:\/\/\S+$/.test(value), "Start the link with http:// or https://");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email(),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(/[A-Za-z]/, "Include a letter")
    .regex(/[0-9]/, "Include a number"),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(72),
});

export const forgotSchema = z.object({
  email: z.email(),
});

export const resetSchema = z.object({
  token: z.string().min(20),
  password: registerSchema.shape.password,
});

export const verifySchema = z.object({
  token: z.string().min(20),
});

const educationSchema = z.object({
  school: z.string().trim().max(120).default(""),
  degree: z.string().trim().max(120).default(""),
  field: z.string().trim().max(120).default(""),
  startDate: looseDate.default(""),
  endDate: looseDate.default(""),
});

const experienceSchema = z.object({
  company: z.string().trim().max(120).default(""),
  title: z.string().trim().max(120).default(""),
  location: z.string().trim().max(120).default(""),
  startDate: looseDate.default(""),
  endDate: looseDate.default(""),
  current: z.boolean().default(false),
  description: z.string().trim().max(2000).default(""),
});

const projectSchema = z.object({
  name: z.string().trim().max(120).default(""),
  url: optionalUrl.default(""),
  technologies: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  description: z.string().trim().max(2000).default(""),
});

const certificationSchema = z.object({
  name: z.string().trim().max(120).default(""),
  issuer: z.string().trim().max(120).default(""),
  date: looseDate.default(""),
});

const skillList = z.array(z.string().trim().min(1).max(40)).max(60);

export const profileSchema = z.object({
  headline: z.string().trim().max(120).default(""),
  phone: z.string().trim().max(40).default(""),
  location: z.string().trim().max(80).default(""),
  summary: z.string().trim().max(2000).default(""),
  skills: skillList.default([]),
  education: z.array(educationSchema).max(20).default([]),
  experience: z.array(experienceSchema).max(30).default([]),
  projects: z.array(projectSchema).max(30).default([]),
  certifications: z.array(certificationSchema).max(30).default([]),
  links: z
    .object({
      linkedin: optionalUrl.default(""),
      github: optionalUrl.default(""),
      portfolio: optionalUrl.default(""),
      website: optionalUrl.default(""),
    })
    .default({ linkedin: "", github: "", portfolio: "", website: "" }),
  preferredRoles: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  preferredLocations: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  experienceLevel: z.enum(experienceLevels).nullable().default(null),
});

export const jobSchema = z.object({
  company: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(140),
  location: z.string().trim().max(120).default(""),
  employmentType: z.enum(employmentTypes).nullable().default(null),
  salaryMin: z.number().int().nonnegative().nullable().default(null),
  salaryMax: z.number().int().nonnegative().nullable().default(null),
  salaryText: z.string().trim().max(80).default(""),
  url: optionalUrl.default(""),
  description: z.string().trim().max(50000).default(""),
  requiredSkills: skillList.default([]),
  preferredSkills: skillList.default([]),
  saved: z.boolean().default(false),
});

export const jobPatchSchema = jobSchema.partial();

export const listJobsSchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(["createdAt", "title", "company"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  saved: z.enum(["true", "false"]).optional(),
  employmentType: z.enum(employmentTypes).optional(),
  source: z.enum(jobSources).optional(),
});

export const discoverSchema = z.object({
  search: z.string().trim().max(80).optional(),
  category: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{0,40}$/)
    .optional(),
});

export const saveRemotiveSchema = z.object({
  externalId: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(180),
  company: z.string().trim().min(1).max(160),
  location: z.string().trim().max(180).default(""),
  url: z.string().trim().url(),
  description: z.string().trim().max(50000).default(""),
  employmentType: z.enum(employmentTypes).nullable().default(null),
  salaryText: z.string().trim().max(80).default(""),
  preferredSkills: skillList.default([]),
});

export const importUrlSchema = z.object({
  url: z.string().trim().url(),
});

export const matchSchema = z.object({
  resumeId: z.string().trim().optional(),
});

export const applicationCreateSchema = z.object({
  jobId: z.string().trim().min(1),
  resumeId: z.string().trim().optional(),
  status: z.enum(applicationStatuses).default("DISCOVERED"),
});

export const applicationPatchSchema = z.object({
  status: z.enum(applicationStatuses).optional(),
  notes: z.string().trim().max(2000).optional(),
  resumeId: z.string().trim().nullable().optional(),
});

export const listApplicationsSchema = z.object({
  status: z.enum(applicationStatuses).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const followUpCreateSchema = z.object({
  applicationId: z.string().trim().min(1),
  dueAt: z.iso.datetime(),
  message: z.string().trim().max(2000).default(""),
});

export const followUpPatchSchema = z.object({
  status: z.enum(followUpStatuses).optional(),
  message: z.string().trim().max(2000).optional(),
  dueAt: z.iso.datetime().optional(),
  response: z.string().trim().max(2000).optional(),
  respondedAt: z.iso.datetime().nullable().optional(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export function parseQuery<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new HttpError(
      400,
      "VALIDATION",
      "Some filters are not valid",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }
  return parsed.data;
}
