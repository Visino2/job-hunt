import type { FullProfile } from "./profileStore.js";
import { getLlmClient } from "./llm/index.js";
import { buildProfileContext } from "./promptContext.js";
import { extractJson } from "../utils/extractJson.js";
import { tailorResultSchema, type TailorResult } from "../schemas.js";

export type { TailorResult } from "../schemas.js";

export async function tailorApplication(
  profile: FullProfile,
  jobDescription: string
): Promise<TailorResult> {
  const llm = getLlmClient();

  const system = `You are a blunt, honest career assistant helping a mobile developer tailor job applications. \
You write in the candidate's own voice using the bios/highlights they've given you as style reference — never invent achievements, employers, metrics, or skills that aren't in their profile. \
If the profile doesn't support a claim the job description wants, say so as a gap rather than papering over it. \
Always respond with ONLY a single valid JSON object, no markdown fences, no commentary before or after.`;

  const prompt = `CANDIDATE PROFILE:
${buildProfileContext(profile)}

JOB DESCRIPTION:
"""
${jobDescription}
"""

Do the following and return it as a single JSON object with this exact shape:

{
  "parsed": {
    "required_skills": string[],
    "nice_to_haves": string[],
    "seniority_level": string,
    "red_flags": string[],          // check job description against the candidate's rejection_criteria and preferences; list anything that conflicts (e.g. "native Android-only", "requires US work authorization"), or an empty array if none
    "role_summary": string          // 1-2 sentence plain-language summary of the role
  },
  "match": {
    "score": number,                // 0-100 honest match score against the candidate's actual profile
    "strong_points": string[],      // specific, concrete overlaps between profile and job requirements
    "gaps": string[],               // specific, honest gaps — skills/experience the job wants that the profile doesn't clearly show
    "bridging_notes": string[]      // one short suggested sentence per gap the candidate could use to honestly bridge it (e.g. reframing adjacent experience), same length as gaps
  },
  "drafts": {
    "resume_bullets": string[],     // 4-6 tailored resume bullets, written in the candidate's voice, based only on their real shipped_projects/work_history
    "cover_letter": string,         // full cover letter draft, in the candidate's voice (use the medium/long bio as style reference), 3-4 short paragraphs
    "cold_dm": string               // short (under 100 words) cold outreach DM variant for a recruiter or hiring manager, casual but professional
  }
}

CONSTRAINT ON DRAFTS: For every item in match.gaps, the drafts must not describe
that skill/experience more strongly than the corresponding match.bridging_notes
entry does. If bridging_notes hedges a claim (e.g. "reframe X as adjacent to Y",
"cannot honestly claim Z"), the drafts must carry that same hedge — never upgrade
a bridged gap into an unqualified claim of proficiency, "led," "managed," "expert
in," "proven," or years-of-experience figures that aren't in the candidate's
profile. The drafts are downstream of match, not independent of it.

Return ONLY the JSON object.`;

  const text = await llm.complete(system, prompt);
  const json = extractJson(text);

  const result = tailorResultSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      "LLM response didn't match the expected shape: " +
        result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
    );
  }

  return result.data;
}
