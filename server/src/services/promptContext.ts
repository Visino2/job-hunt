import type { FullProfile } from "./profileStore.js";

// Shared candidate-profile context block used by every prompt that needs the
// LLM to reason honestly about what the candidate can actually claim
// (tailoring, interview feedback, and anything else added later).
export function buildProfileContext(profile: FullProfile): string {
  return JSON.stringify(
    {
      name: profile.name,
      location: profile.location,
      title: profile.title,
      education: profile.education,
      stack: profile.stack,
      other_experience: profile.other_experience,
      shipped_projects: profile.shipped_projects,
      work_history: profile.work_history,
      bios: profile.bios,
      rejection_criteria: profile.rejection_criteria,
      preferences: profile.preferences,
    },
    null,
    2
  );
}
