import type { ExperienceItem, ProjectItem } from "../models/Profile";
import { findSkillsInText, skillKey, uniqueByKey } from "./skills";

export interface MatchInput {
  profileSkills: string[];
  projectTech: string[];
  experience: ExperienceItem[];
  resumeText: string;
  requiredSkills: string[];
  preferredSkills: string[];
  keywords: string[];
  description: string;
}

export interface MatchResult {
  score: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  matchedKeywords: string[];
  experienceGap: string;
  suggestions: string[];
}

function parseLooseDate(value: string) {
  if (!/^\d{4}(-\d{2}){0,2}$/.test(value)) return null;
  const [year, month = "1"] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function yearsFromExperience(experience: ExperienceItem[]) {
  let months = 0;
  let missingDates = false;
  for (const role of experience) {
    const start = parseLooseDate(role.startDate);
    if (!start) {
      if (role.company || role.title) missingDates = true;
      continue;
    }
    const end = role.current || !role.endDate ? new Date() : parseLooseDate(role.endDate);
    if (!end) {
      missingDates = true;
      continue;
    }
    months += Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
  }
  return { years: Math.round((months / 12) * 10) / 10, missingDates };
}

function yearsAsked(description: string) {
  const values = Array.from(description.matchAll(/(\d+)\s*\+?\s*(?:years|yrs)/gi)).map((match) => Number(match[1]));
  if (!values.length) return null;
  return Math.max(...values);
}

export function buildMatch(input: MatchInput): MatchResult {
  const owned = new Map<string, string>();
  for (const skill of [...input.profileSkills, ...input.projectTech, ...findSkillsInText(input.resumeText)]) {
    const key = skillKey(skill);
    if (key && !owned.has(key)) owned.set(key, skill);
  }

  const required = uniqueByKey(input.requiredSkills);
  const preferred = uniqueByKey(input.preferredSkills).filter((skill) => !required.some((item) => skillKey(item) === skillKey(skill)));
  const matchedSkills = uniqueByKey([...required, ...preferred].filter((skill) => owned.has(skillKey(skill))));
  const missingSkills = required.filter((skill) => !owned.has(skillKey(skill)));

  const possible = required.length * 2 + preferred.length;
  const earned = required.filter((skill) => owned.has(skillKey(skill))).length * 2 + preferred.filter((skill) => owned.has(skillKey(skill))).length;
  const score = possible === 0 ? null : Math.round((earned / possible) * 100);

  const resume = input.resumeText.toLowerCase();
  const matchedKeywords = uniqueByKey(input.keywords).filter((keyword) => {
    const needle = keyword.toLowerCase();
    return needle.length > 1 && resume.includes(needle);
  });

  const asked = yearsAsked(input.description);
  const have = yearsFromExperience(input.experience);
  let experienceGap = "";
  if (asked && have.years > 0 && have.years + 0.2 < asked) {
    experienceGap = `The posting asks for about ${asked} years. The dates on your profile add up to about ${have.years}.`;
  } else if (asked && have.missingDates && have.years === 0) {
    experienceGap = "The posting mentions years of experience, but the roles on your profile are missing dates, so I did not guess.";
  }

  const suggestions = missingSkills.slice(0, 6).map((skill) => `If you have actually used ${skill}, add it to your profile or resume. Leave it off if you have not.`);
  if (score === null) {
    suggestions.unshift("This posting has no skill list yet. Run analysis, or type the skills yourself, before treating the overlap as useful.");
  }

  return {
    score,
    matchedSkills,
    missingSkills,
    matchedKeywords,
    experienceGap,
    suggestions,
  };
}

export function orderForJob<T>(items: T[], score: (item: T) => number) {
  return items
    .map((item, index) => ({ item, index, score: score(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}

export function projectSkills(projects: ProjectItem[]) {
  return projects.flatMap((project) => project.technologies);
}
