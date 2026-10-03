export const employmentTypes = ["full_time", "part_time", "contract", "internship", "freelance"] as const;
export const experienceLevels = ["intern", "junior", "mid", "senior", "lead"] as const;
export const applicationStatuses = [
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
export const followUpStatuses = ["scheduled", "sent", "done", "skipped"] as const;
export const jobSources = ["manual", "url", "remotive"] as const;

export type EmploymentType = (typeof employmentTypes)[number];
export type ExperienceLevel = (typeof experienceLevels)[number];
export type ApplicationStatus = (typeof applicationStatuses)[number];
export type FollowUpStatus = (typeof followUpStatuses)[number];
export type JobSource = (typeof jobSources)[number];

export const statusLabel: Record<ApplicationStatus, string> = {
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
