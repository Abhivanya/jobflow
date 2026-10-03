import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env, maxUploadBytes } from "../config/env";
import { Job } from "../models/Job";
import { Profile } from "../models/Profile";
import { Resume, type IResume, type TailoredContent } from "../models/Resume";
import { HttpError } from "../utils/errors";
import { enqueue } from "../utils/queue";
import { addEvent } from "./events";
import { orderForJob } from "./match";
import { findSkillsInText, skillKey } from "./skills";

const ALLOWED = new Map<string, string[]>([
  ["application/pdf", [".pdf"]],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", [".docx"]],
  ["text/plain", [".txt"]],
]);

function present(resume: IResume) {
  return {
    id: resume._id.toString(),
    kind: resume.kind,
    label: resume.label,
    version: resume.version,
    originalName: resume.originalName,
    mimeType: resume.mimeType,
    size: resume.size,
    isDefault: resume.isDefault,
    parseStatus: resume.parseStatus,
    parseError: resume.parseError,
    jobId: resume.jobId ? resume.jobId.toString() : null,
    content: resume.content,
    createdAt: resume.createdAt,
  };
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "resume";
}

export function assertUpload(file: { mimetype: string; size: number; originalname: string }) {
  const extensions = ALLOWED.get(file.mimetype);
  const ext = path.extname(file.originalname).toLowerCase();
  if (!extensions || !extensions.includes(ext)) {
    throw new HttpError(400, "BAD_FILE", "Upload a PDF, DOCX, or TXT file");
  }
  if (file.size > maxUploadBytes) {
    throw new HttpError(400, "BAD_FILE", `Resumes need to be under ${env.MAX_UPLOAD_MB} MB`);
  }
}

function looksLike(buffer: Buffer, mime: string) {
  if (mime === "application/pdf") return buffer.subarray(0, 4).toString() === "%PDF";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return buffer.subarray(0, 2).toString() === "PK";
  }
  return !buffer.subarray(0, 800).includes(0);
}

export function storedPath(storedName: string) {
  const root = path.resolve(env.UPLOAD_DIR);
  const full = path.resolve(root, storedName);
  if (!full.startsWith(root + path.sep)) throw new HttpError(400, "BAD_FILE", "Bad file path");
  return full;
}

async function nextVersion(userId: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const latest = await Resume.findOne({ userId }).sort({ version: -1 }).select("version");
    const version = (latest?.version ?? 0) + 1;
    const clash = await Resume.exists({ userId, version });
    if (!clash) return version;
  }
  throw new HttpError(409, "CONFLICT", "Could not save a resume version. Try again.");
}

export async function parseResumeById(id: string) {
  const resume = await Resume.findById(id);
  if (!resume || resume.deletedAt || resume.parseStatus === "ready") return;
  try {
    const buffer = await readFile(storedPath(resume.storedName));
    const text = await extractText(resume.mimeType, buffer);
    resume.parsedText = text.slice(0, 200000);
    resume.parseStatus = text.trim() ? "ready" : "skipped";
    resume.parseError = "";
    await resume.save();
  } catch (err) {
    resume.parseStatus = "failed";
    resume.parseError = "Could not read text from this file";
    await resume.save();
    throw err;
  }
}

async function extractText(mime: string, buffer: Buffer) {
  if (mime === "text/plain") return buffer.toString("utf8");
  if (mime === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text || "";
    } finally {
      await parser.destroy();
    }
  }
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }
  return "";
}

export async function requeuePendingResumes() {
  const pending = await Resume.find({ parseStatus: "pending", deletedAt: null }).select("_id");
  for (const resume of pending) {
    enqueue(`resume:${resume.id}`, () => parseResumeById(resume.id), 1);
  }
}

export async function listResumes(userId: string) {
  const resumes = await Resume.find({ userId, deletedAt: null }).sort({ createdAt: -1 });
  return resumes.map(present);
}

export async function saveUpload(
  userId: string,
  file: { path: string; filename: string; originalname: string; mimetype: string; size: number },
  label?: string,
) {
  const buffer = await readFile(file.path);
  if (!looksLike(buffer, file.mimetype)) {
    await unlink(file.path).catch(() => undefined);
    throw new HttpError(400, "BAD_FILE", "The file contents do not match its type");
  }
  const count = await Resume.countDocuments({ userId, deletedAt: null, kind: "upload" });
  const resume = await Resume.create({
    userId,
    kind: "upload",
    label: label?.trim() || file.originalname,
    version: await nextVersion(userId),
    originalName: safeName(file.originalname),
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    isDefault: count === 0,
    parseStatus: "pending",
  });
  enqueue(`resume:${resume.id}`, () => parseResumeById(resume.id), 1);
  return present(resume);
}

export async function getOwnedResume(userId: string, id: string) {
  const resume = await Resume.findOne({ _id: id, userId, deletedAt: null });
  if (!resume) throw new HttpError(404, "NOT_FOUND", "Resume not found");
  return resume;
}

export async function downloadResume(userId: string, id: string) {
  const resume = await getOwnedResume(userId, id);
  return { filePath: storedPath(resume.storedName), name: resume.originalName };
}

export async function removeResume(userId: string, id: string) {
  const resume = await getOwnedResume(userId, id);
  const wasDefault = resume.isDefault;
  resume.deletedAt = new Date();
  resume.isDefault = false;
  await resume.save();
  await unlink(storedPath(resume.storedName)).catch(() => undefined);
  if (!wasDefault) return;
  const another = await Resume.findOne({ userId, deletedAt: null }).sort({ createdAt: -1 });
  if (another) {
    another.isDefault = true;
    await another.save();
  }
}

export async function makeDefault(userId: string, id: string) {
  const resume = await getOwnedResume(userId, id);
  await Resume.updateMany({ userId, deletedAt: null }, { isDefault: false });
  resume.isDefault = true;
  await resume.save();
  return present(resume);
}

function datesFor(start: string, end: string, current: boolean) {
  if (!start && !end) return "";
  if (current) return `${start || "?"} – present`;
  return `${start || "?"} – ${end || "?"}`;
}

export async function tailorResume(userId: string, jobId: string, resumeId?: string) {
  const job = await Job.findOne({ _id: jobId, userId, deletedAt: null });
  if (!job) throw new HttpError(404, "NOT_FOUND", "Job not found");
  const profile = await Profile.findOne({ userId });
  if (!profile) throw new HttpError(400, "NO_PROFILE", "Add a profile before tailoring a resume");

  let resumeText = "";
  if (resumeId) {
    const resume = await getOwnedResume(userId, resumeId);
    resumeText = resume.parsedText;
  }

  const wanted = [...job.requiredSkills, ...(job.analysis?.requiredSkills ?? []), ...job.preferredSkills, ...(job.analysis?.preferredSkills ?? [])];
  const wantedKeys = new Set(wanted.map(skillKey));
  const textSkills = findSkillsInText(`${job.title}\n${job.description}`);
  for (const skill of textSkills) wantedKeys.add(skillKey(skill));

  const relevant = (text: string) => {
    const keys = findSkillsInText(text).map(skillKey);
    return keys.some((key) => wantedKeys.has(key)) || wanted.some((skill) => text.toLowerCase().includes(skill.toLowerCase()));
  };

  const skills = orderForJob(profile.skills, (skill) => {
    let score = wantedKeys.has(skillKey(skill)) ? 2 : 0;
    if (resumeText.toLowerCase().includes(skill.toLowerCase())) score += 1;
    return score;
  });
  const experience = orderForJob(profile.experience, (role) => (relevant(`${role.title} ${role.description} ${role.company}`) ? 1 : 0));
  const projects = orderForJob(profile.projects, (project) => {
    const tech = project.technologies.map(skillKey);
    return tech.some((key) => wantedKeys.has(key)) || relevant(project.description) ? 1 : 0;
  });

  const content: TailoredContent = {
    targetTitle: job.title,
    targetCompany: job.company,
    note: "Tailored for this job by reordering your existing profile. Nothing new was written in.",
    headline: profile.headline || profile.preferredRoles[0] || "",
    summary: profile.summary,
    skills,
    experience: experience.map((role) => ({
      company: role.company,
      title: role.title,
      dates: datesFor(role.startDate, role.endDate, role.current),
      description: role.description,
      relevant: relevant(`${role.title} ${role.description}`),
    })),
    projects: projects.map((project) => ({
      name: project.name,
      description: project.description,
      technologies: project.technologies,
    })),
    education: profile.education.map((item) => ({
      school: item.school,
      degree: item.degree,
      field: item.field,
    })),
  };

  const text = renderTailored(content, profile.location);
  await mkdir(env.UPLOAD_DIR, { recursive: true });
  const storedName = `${randomUUID()}.txt`;
  await writeFile(storedPath(storedName), text, "utf8");

  const resume = await Resume.create({
    userId,
    kind: "tailored",
    label: `${job.company} — ${job.title}`,
    version: await nextVersion(userId),
    originalName: safeName(`${job.company}-${job.title}.txt`),
    storedName,
    mimeType: "text/plain",
    size: Buffer.byteLength(text),
    isDefault: false,
    parsedText: text,
    parseStatus: "ready",
    jobId: job._id,
    content,
  });

  const { Application } = await import("../models/Application");
  const application = await Application.findOne({ userId, jobId: job._id });
  if (application) {
    await addEvent({
      userId,
      applicationId: application.id,
      type: "resume_tailored",
      summary: `Tailored a resume for ${job.title} at ${job.company}`,
    });
  }

  return present(resume);
}

function renderTailored(content: TailoredContent, location: string) {
  const lines = [
    content.headline,
    location,
    "",
    content.note,
    "",
    content.summary,
    "",
    "Skills",
    content.skills.join(", "),
    "",
    "Experience",
  ];
  for (const role of content.experience) {
    lines.push(`${role.title} — ${role.company} ${role.relevant ? "(relevant)" : ""}`.trim());
    if (role.dates) lines.push(role.dates);
    if (role.description) lines.push(role.description);
    lines.push("");
  }
  lines.push("Projects");
  for (const project of content.projects) {
    lines.push(project.name);
    if (project.technologies.length) lines.push(project.technologies.join(", "));
    if (project.description) lines.push(project.description);
    lines.push("");
  }
  lines.push("Education");
  for (const item of content.education) {
    lines.push([item.degree, item.field, item.school].filter(Boolean).join(", "));
  }
  return lines.join("\n").trim() + "\n";
}
