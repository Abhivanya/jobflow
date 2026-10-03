import { describe, expect, it } from "vitest";
import { buildMatch } from "../src/services/match";

describe("buildMatch", () => {
  it("scores required skills higher and does not invent a score without requirements", () => {
    const result = buildMatch({
      profileSkills: ["TypeScript", "Cooking"],
      projectTech: ["React"],
      experience: [
        {
          company: "Northwind",
          title: "Frontend developer",
          location: "",
          startDate: "2024-01",
          endDate: "",
          current: true,
          description: "Built React screens",
        },
      ],
      resumeText: "TypeScript and React",
      requiredSkills: ["TypeScript", "Kubernetes"],
      preferredSkills: ["React"],
      keywords: ["TypeScript"],
      description: "5+ years with TypeScript",
    });

    expect(result.matchedSkills).toEqual(expect.arrayContaining(["TypeScript", "React"]));
    expect(result.missingSkills).toContain("Kubernetes");
    // TypeScript is required (2), React is preferred (1), Kubernetes is missing.
    // possible = 2 required * 2 + 1 preferred = 5, earned = 3, score = 60.
    expect(result.score).toBe(60);
    expect(result.suggestions.some((line) => line.includes("Kubernetes"))).toBe(true);
    expect(result.experienceGap).toMatch(/5 years/);
  });

  it("returns a null score when the job has no skills", () => {
    const result = buildMatch({
      profileSkills: ["React"],
      projectTech: [],
      experience: [],
      resumeText: "",
      requiredSkills: [],
      preferredSkills: [],
      keywords: [],
      description: "Come work with us",
    });
    expect(result.score).toBeNull();
  });
});
