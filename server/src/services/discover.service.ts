import { employmentTypes, type EmploymentType } from "../constants";
import { Job } from "../models/Job";
import { HttpError } from "../utils/errors";
import { rememberJson } from "./cache";
import { htmlToText } from "./htmlText";
import { findSkillsInText } from "./skills";

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category?: string;
  tags?: string[];
  job_type?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
}

function mapType(value: string | undefined): EmploymentType | null {
  if (!value) return null;
  return employmentTypes.find((type) => type === value) ?? null;
}

function mapJob(job: RemotiveJob) {
  const description = htmlToText(job.description || "");
  const tags = Array.isArray(job.tags) ? job.tags : [];
  const preferredSkills = findSkillsInText(tags.join("\n")).slice(0, 12);
  return {
    externalId: String(job.id),
    title: job.title,
    company: job.company_name,
    location: job.candidate_required_location || "Remote",
    url: job.url,
    description: description.slice(0, 50000),
    employmentType: mapType(job.job_type),
    salaryText: job.salary || "",
    preferredSkills,
    category: job.category || "",
    source: "remotive" as const,
  };
}

export async function searchRemotive(search = "", category = "") {
  const key = `remotive:${category}:${search}`.toLowerCase();
  return rememberJson(key, 60 * 60 * 6, async () => {
    const url = new URL("https://remotive.com/api/remote-jobs");
    if (search) url.searchParams.set("search", search);
    if (category) url.searchParams.set("category", category);
    url.searchParams.set("limit", "20");
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new HttpError(502, "REMOTIVE", "Remotive did not respond. Try again later.");
    const body = (await response.json()) as { jobs?: RemotiveJob[] };
    return (body.jobs ?? []).slice(0, 20).map(mapJob);
  });
}

export async function saveRemotiveJob(
  userId: string,
  input: {
    externalId: string;
    title: string;
    company: string;
    location: string;
    url: string;
    description: string;
    employmentType: EmploymentType | null;
    salaryText: string;
    preferredSkills: string[];
  },
) {
  const url = new URL(input.url);
  if (url.hostname !== "remotive.com") {
    throw new HttpError(400, "BAD_URL", "That listing is not a Remotive link");
  }
  const existing = await Job.findOne({ userId, source: "remotive", externalId: input.externalId, deletedAt: null });
  if (existing) return existing;

  return Job.create({
    userId,
    company: input.company,
    title: input.title,
    location: input.location,
    url: input.url,
    description: htmlToText(input.description),
    employmentType: input.employmentType,
    salaryText: input.salaryText,
    preferredSkills: input.preferredSkills,
    source: "remotive",
    externalId: input.externalId,
    saved: true,
  });
}
