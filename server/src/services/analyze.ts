import { z } from "zod";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { analyzeWithRules, type AnalysisResult } from "./analyzeRules";

const analysisSchema = z.object({
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  experienceRequirements: z.array(z.string()).default([]),
  educationRequirements: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  seniority: z.enum(["intern", "junior", "mid", "senior", "lead", "unknown"]).default("unknown"),
});

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    requiredSkills: { type: "array", items: { type: "string" } },
    preferredSkills: { type: "array", items: { type: "string" } },
    experienceRequirements: { type: "array", items: { type: "string" } },
    educationRequirements: { type: "array", items: { type: "string" } },
    responsibilities: { type: "array", items: { type: "string" } },
    keywords: { type: "array", items: { type: "string" } },
    technologies: { type: "array", items: { type: "string" } },
    seniority: { type: "string", enum: ["intern", "junior", "mid", "senior", "lead", "unknown"] },
  },
  required: [
    "requiredSkills",
    "preferredSkills",
    "experienceRequirements",
    "educationRequirements",
    "responsibilities",
    "keywords",
    "technologies",
    "seniority",
  ],
};

function clip(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean).slice(0, 20);
}

// Only the job text is sent. Profile and resume stay on our server.
async function analyzeWithOpenAI(title: string, description: string): Promise<AnalysisResult> {
  const response = await fetch(`${env.OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Extract only facts that are written in the job description. If a field is not stated, return an empty array or unknown. Do not invent skills, years, or degrees.",
        },
        {
          role: "user",
          content: `Title: ${title}\n\nDescription:\n${description.slice(0, 12000)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "job_analysis",
          strict: true,
          schema: responseSchema,
        },
      },
    }),
  });

  if (response.status === 429) {
    throw new Error("rate_limited");
  }
  if (!response.ok) {
    throw new Error(`openai_${response.status}`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty_openai_response");
  const parsed = analysisSchema.safeParse(JSON.parse(content));
  if (!parsed.success) throw new Error("invalid_openai_response");

  return {
    requiredSkills: clip(parsed.data.requiredSkills),
    preferredSkills: clip(parsed.data.preferredSkills),
    experienceRequirements: clip(parsed.data.experienceRequirements),
    educationRequirements: clip(parsed.data.educationRequirements),
    responsibilities: clip(parsed.data.responsibilities),
    keywords: clip(parsed.data.keywords),
    technologies: clip(parsed.data.technologies),
    seniority: parsed.data.seniority,
    method: "openai",
    note: `Parsed with OpenAI (${env.OPENAI_MODEL}). Read it before you trust it. The model can still miss or over-read a line.`,
  };
}

export async function analyzeJob(title: string, description: string, forceRules = false) {
  if (!forceRules && env.OPENAI_API_KEY) {
    try {
      return await analyzeWithOpenAI(title, description);
    } catch (err) {
      logger.warn({ err }, "openai analysis failed, using rules");
      const fallback = analyzeWithRules(title, description);
      const reason = err instanceof Error && err.message === "rate_limited" ? "OpenAI rate limited the request." : "OpenAI did not return a usable result.";
      fallback.note = `${reason} Showing the local rules parse instead.`;
      return fallback;
    }
  }
  return analyzeWithRules(title, description);
}
