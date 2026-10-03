import type { z } from "zod";
import { Profile, type IProfile } from "../models/Profile";
import type { profileSchema } from "../validators/schemas";

type ProfileInput = z.infer<typeof profileSchema>;

function present(profile: IProfile) {
  return {
    id: profile._id.toString(),
    headline: profile.headline,
    phone: profile.phone,
    location: profile.location,
    summary: profile.summary,
    skills: profile.skills,
    education: profile.education,
    experience: profile.experience,
    projects: profile.projects,
    certifications: profile.certifications,
    links: profile.links,
    preferredRoles: profile.preferredRoles,
    preferredLocations: profile.preferredLocations,
    experienceLevel: profile.experienceLevel,
    updatedAt: profile.updatedAt,
  };
}

export async function getOrCreateProfile(userId: string) {
  const existing = await Profile.findOne({ userId });
  if (existing) return present(existing);
  const created = await Profile.create({ userId });
  return present(created);
}

export async function updateProfile(userId: string, input: ProfileInput) {
  const profile = await Profile.findOneAndUpdate({ userId }, input, { new: true, upsert: true, setDefaultsOnInsert: true });
  return present(profile);
}
