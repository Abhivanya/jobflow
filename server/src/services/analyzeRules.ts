import { findSkillsInText, uniqueByKey } from "./skills";

export interface AnalysisResult {
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequirements: string[];
  educationRequirements: string[];
  responsibilities: string[];
  keywords: string[];
  technologies: string[];
  seniority: "intern" | "junior" | "mid" | "senior" | "lead" | "unknown";
  method: "rules" | "openai";
  note: string;
}

type Section = "required" | "preferred" | "responsibilities" | "other";

function sectionFor(line: string): Section | null {
  const value = line.toLowerCase();
  if (/responsibilit|what you.?ll do|what you'll do|the role|duties/.test(value)) return "responsibilities";
  if (/preferred|nice to have|bonus|plus if/.test(value)) return "preferred";
  if (/requirement|qualification|what you.?ll need|must have|we.?re looking/.test(value)) return "required";
  return null;
}

function bullets(lines: string[], start: number, section: Section) {
  const picked: string[] = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i]?.trim() ?? "";
    if (!line) continue;
    if (sectionFor(line)) break;
    if (/^[-*•]/.test(line) || section !== "other") {
      const clean = line.replace(/^[-*•]\s*/, "").trim();
      if (clean.length > 2 && clean.length < 240) picked.push(clean);
    }
    if (picked.length >= 12) break;
  }
  return picked;
}

function seniorityFrom(title: string, body: string): AnalysisResult["seniority"] {
  const probe = (text: string): AnalysisResult["seniority"] | null => {
    const value = text.toLowerCase();
    if (/\b(staff|principal|lead|head of)\b/.test(value)) return "lead";
    if (/\bsenior\b|\bsr\.?\b/.test(value)) return "senior";
    if (/\bmid[- ]?level\b|\bintermediate\b/.test(value)) return "mid";
    if (/\bjunior\b|\bjr\.?\b/.test(value)) return "junior";
    if (/\bintern\b/.test(value)) return "intern";
    return null;
  };
  return probe(title) || probe(body) || "unknown";
}

export function analyzeWithRules(title: string, description: string): AnalysisResult {
  const lines = description.split(/\r?\n/).map((line) => line.trim());
  let required: string[] = [];
  let preferred: string[] = [];
  let responsibilities: string[] = [];

  lines.forEach((line, index) => {
    const section = sectionFor(line);
    if (section === "required") required = required.concat(bullets(lines, index + 1, section));
    if (section === "preferred") preferred = preferred.concat(bullets(lines, index + 1, section));
    if (section === "responsibilities") responsibilities = responsibilities.concat(bullets(lines, index + 1, section));
  });

  const technologies = findSkillsInText(`${title}\n${description}`);
  const requiredText = required.join("\n");
  const preferredText = preferred.join("\n");
  const requiredSkills = uniqueByKey(findSkillsInText(requiredText).concat(required.length ? [] : technologies.slice(0, 8)));
  const preferredSkills = uniqueByKey(findSkillsInText(preferredText)).filter(
    (skill) => !requiredSkills.some((item) => item.toLowerCase() === skill.toLowerCase()),
  );

  const experienceRequirements = Array.from(
    description.matchAll(/(\d+\s*\+?\s*(?:-|to)\s*\d+\s*(?:years|yrs)|\d+\s*\+?\s*(?:years|yrs))/gi),
  ).map((match) => match[0].replace(/\s+/g, " ").trim());

  const educationRequirements: string[] = [];
  if (/bachelor|b\.s\.|b\.sc|undergraduate degree/i.test(description)) educationRequirements.push("Bachelor's degree");
  if (/master|m\.s\.|m\.sc/i.test(description)) educationRequirements.push("Master's degree");
  if (/\bph\.?d\b|doctorate/i.test(description)) educationRequirements.push("PhD");

  return {
    requiredSkills: uniqueByKey(requiredSkills).slice(0, 20),
    preferredSkills: preferredSkills.slice(0, 20),
    experienceRequirements: Array.from(new Set(experienceRequirements)).slice(0, 6),
    educationRequirements,
    responsibilities: Array.from(new Set(responsibilities)).slice(0, 12),
    keywords: technologies.slice(0, 20),
    technologies,
    seniority: seniorityFrom(title, description),
    method: "rules",
    note: "Parsed on the server with keyword rules. It can miss wording that is not in the skill list.",
  };
}
