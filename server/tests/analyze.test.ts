import { describe, expect, it } from "vitest";
import { analyzeWithRules } from "../src/services/analyzeRules";

const posting = `
Senior Backend Engineer

Requirements
- 5+ years of experience with Node.js
- Strong TypeScript
- MongoDB and Redis

Preferred
- Kubernetes
- AWS

Responsibilities
- Design APIs
- Review pull requests

Bachelor's degree in Computer Science or equivalent experience
`;

describe("analyzeWithRules", () => {
  it("pulls skills, years, and seniority out of a posting", () => {
    const result = analyzeWithRules("Senior Backend Engineer", posting);
    expect(result.method).toBe("rules");
    expect(result.seniority).toBe("senior");
    expect(result.requiredSkills).toEqual(expect.arrayContaining(["Node.js", "TypeScript", "MongoDB", "Redis"]));
    expect(result.preferredSkills).toEqual(expect.arrayContaining(["Kubernetes", "AWS"]));
    expect(result.experienceRequirements.some((item) => item.includes("5"))).toBe(true);
    expect(result.educationRequirements).toContain("Bachelor's degree");
    expect(result.responsibilities.some((item) => item.includes("Design APIs"))).toBe(true);
  });
});
