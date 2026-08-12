import type { FullProfile } from "./profileStore.js";
import { getLlmClient } from "./llm/index.js";
import { buildProfileContext } from "./promptContext.js";
import { extractJson } from "../utils/extractJson.js";
import {
  interviewQuestionsResultSchema,
  interviewFeedbackResultSchema,
  type InterviewQuestionsResult,
  type InterviewFeedbackResult,
} from "../schemas.js";
import {
  KNOWN_MOBILE_REACT_NATIVE_QUESTIONS,
  isMobileOrReactNativeRole,
} from "../data/knownInterviewQuestions.js";

export async function generateInterviewQuestions(
  profile: FullProfile,
  jobDescription: string
): Promise<InterviewQuestionsResult> {
  const llm = getLlmClient();

  const system = `You are an experienced technical interviewer preparing a candidate for a real interview. \
Generate realistic questions this specific role would actually ask, grounded in the stack, responsibilities, \
and seniority stated in the job description — not generic interview-question-bank filler. \
Always respond with ONLY a single valid JSON object, no markdown fences, no commentary before or after.`;

  const referenceBlock = isMobileOrReactNativeRole(jobDescription)
    ? `\nREFERENCE — real questions candidates report being asked in AI-recruiter screens for mobile/React Native roles (e.g. micro1's "Zara"):
${KNOWN_MOBILE_REACT_NATIVE_QUESTIONS.map((q) => `- ${q}`).join("\n")}

Use these as grounding for realistic style and content. Include the 3-5 most relevant ones (verbatim or lightly adapted to this JD), and generate the rest fresh from the job description.\n`
    : "";

  const prompt = `CANDIDATE PROFILE:
${buildProfileContext(profile)}

JOB DESCRIPTION:
"""
${jobDescription}
"""
${referenceBlock}
Generate 6-10 likely interview questions for this specific role, mixing:
- Technical questions grounded in the specific skills/stack/responsibilities named in the job description
- Behavioral questions relevant to the seniority and nature of this role

Return a single JSON object with this exact shape:

{
  "questions": [
    { "question": string, "type": "technical" | "behavioral" }
  ]
}

Return ONLY the JSON object.`;

  // Cheap/fast tier — question generation doesn't need deep reasoning, and
  // this app runs a lot of these calls per session (up to 10). Feedback below
  // stays on the default tier since that's the part where quality matters.
  const text = await llm.complete(system, prompt, { tier: "cheap" });
  const json = extractJson(text);

  const result = interviewQuestionsResultSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      "LLM response didn't match the expected shape: " +
        result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
    );
  }

  return result.data;
}

export async function generateAnswerFeedback(
  profile: FullProfile,
  jobDescription: string,
  question: string,
  answer: string
): Promise<InterviewFeedbackResult> {
  const llm = getLlmClient();

  const system = `You are a blunt, honest interview coach. Give specific, concrete feedback — \
never generic encouragement like "great answer!" or "good job." If an answer is vague, name exactly \
what's missing: a concrete example, a metric, a named technology, a direct answer to what was actually \
asked. If an answer is genuinely strong, say specifically why — structure, evidence, relevance to the \
role — rather than just praising it. Judge the answer on its own content, but when a stronger answer \
would draw on something real from the candidate's profile, say so specifically. \
Always respond with ONLY a single valid JSON object, no markdown fences, no commentary before or after.`;

  const prompt = `CANDIDATE PROFILE (for context on what's true/available to draw on):
${buildProfileContext(profile)}

JOB DESCRIPTION:
"""
${jobDescription}
"""

INTERVIEW QUESTION:
"""
${question}
"""

CANDIDATE'S ANSWER:
"""
${answer}
"""

Evaluate this answer honestly and specifically. Return a single JSON object with this exact shape:

{
  "strong_points": string[],                    // specific things this answer did well — empty array if genuinely none
  "vague_or_weak_points": string[],              // specific gaps: missing example, missing metric, doesn't answer what was asked, too generic, etc. — empty array if genuinely none
  "what_a_stronger_answer_includes": string[],   // concrete, actionable additions specific to this question and this candidate's real background
  "overall_note": string                         // 1-2 sentence honest summary, no fluff
}

Return ONLY the JSON object.`;

  const text = await llm.complete(system, prompt);
  const json = extractJson(text);

  const result = interviewFeedbackResultSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      "LLM response didn't match the expected shape: " +
        result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
    );
  }

  return result.data;
}
