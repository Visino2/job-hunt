import { z } from "zod";

export const APPLICATION_STATUSES = [
  "draft",
  "applied",
  "interviewing",
  "rejected",
  "offer",
] as const;

export const shippedProjectSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  description: z.string().default(""),
  // Per-project stack — distinct from the profile-wide stack.core/also lists,
  // which aggregate across every project and can't tell the model which
  // project used which tech (e.g. Converf is Flutter, SEDL/Valura.ai are
  // React Native — without this, generated drafts have to guess).
  stack: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
});

export const fullProfileSchema = z.object({
  name: z.string().default(""),
  location: z.string().default(""),
  title: z.string().default(""),
  education: z.record(z.string(), z.unknown()).default({}),
  stack: z.object({
    core: z.array(z.string()).default([]),
    also: z.array(z.string()).default([]),
  }),
  other_experience: z.array(z.string()).default([]),
  shipped_projects: z.array(shippedProjectSchema).default([]),
  work_history: z.array(z.string()).default([]),
  contact: z
    .object({
      phone: z.string().default(""),
      email: z.string().default(""),
      linkedin: z.string().default(""),
      github: z.string().default(""),
      portfolio: z.string().default(""),
    })
    .default({ phone: "", email: "", linkedin: "", github: "", portfolio: "" }),
  bios: z.object({
    short: z.string().default(""),
    medium: z.string().default(""),
    long: z.string().default(""),
  }),
  rejection_criteria: z.array(z.string()).default([]),
  preferences: z.array(z.string()).default([]),
});

export const tailorRequestSchema = z
  .object({
    jobDescription: z.string().trim().min(1).optional(),
    jobUrl: z.string().trim().url().optional(),
  })
  .refine((v) => v.jobDescription || v.jobUrl, {
    message: "Provide jobDescription text or a jobUrl.",
  });

// What we require Claude/Gemini's JSON response to look like before we trust it.
export const tailorResultSchema = z.object({
  parsed: z.object({
    required_skills: z.array(z.string()).default([]),
    nice_to_haves: z.array(z.string()).default([]),
    seniority_level: z.string().default(""),
    red_flags: z.array(z.string()).default([]),
    role_summary: z.string().default(""),
  }),
  match: z.object({
    score: z.number().min(0).max(100),
    strong_points: z.array(z.string()).default([]),
    gaps: z.array(z.string()).default([]),
    bridging_notes: z.array(z.string()).default([]),
  }),
  drafts: z.object({
    resume_bullets: z.array(z.string()).default([]),
    cover_letter: z.string().default(""),
    cold_dm: z.string().default(""),
  }),
});

export const applicationBodySchema = z.object({
  job_title: z.string().default(""),
  company: z.string().default(""),
  job_url: z.string().default(""),
  job_description: z.string().default(""),
  parsed: z.unknown().optional(),
  match_score: z.number().nullable().optional(),
  match_notes: z.unknown().optional(),
  resume_bullets: z.string().default(""),
  cover_letter: z.string().default(""),
  cold_dm: z.string().default(""),
  status: z.enum(APPLICATION_STATUSES).default("draft"),
  notes: z.string().default(""),
});

// Dedicated schema for the status-only update endpoint (PATCH /:id/status) —
// separate from applicationBodySchema so a status change can't accidentally
// carry along an edit to the drafts/parsed content, and vice versa.
export const statusUpdateSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
});

// Dedicated schema for the notes-only update endpoint (PATCH /:id/notes) —
// same isolation rationale as statusUpdateSchema above.
export const notesUpdateSchema = z.object({
  notes: z.string().default(""),
});

// --- Interview prep (Phase 2) ---

export const INTERVIEW_QUESTION_TYPES = ["technical", "behavioral"] as const;

export const interviewQuestionResultSchema = z.object({
  question: z.string(),
  type: z.enum(INTERVIEW_QUESTION_TYPES),
});

// What we require the question-generation call to look like before we trust it.
export const interviewQuestionsResultSchema = z.object({
  questions: z.array(interviewQuestionResultSchema).min(6).max(10),
});

// What we require the per-answer feedback call to look like before we trust it.
export const interviewFeedbackResultSchema = z.object({
  strong_points: z.array(z.string()).default([]),
  vague_or_weak_points: z.array(z.string()).default([]),
  what_a_stronger_answer_includes: z.array(z.string()).default([]),
  overall_note: z.string().default(""),
});

// Mirrors tailorRequestSchema's jobDescription/jobUrl shape (kept separate
// rather than shared, since zod's .refine() wrapper isn't cleanly extendable
// and the two request bodies aren't guaranteed to stay identical) plus an
// optional link to an existing saved application.
export const interviewSessionCreateSchema = z
  .object({
    jobDescription: z.string().trim().min(1).optional(),
    jobUrl: z.string().trim().url().optional(),
    applicationId: z.number().int().positive().optional(),
  })
  .refine((v) => v.jobDescription || v.jobUrl, {
    message: "Provide jobDescription text or a jobUrl.",
  });

export const interviewAnswerSchema = z.object({
  answer: z.string().trim().min(1, "Answer cannot be empty"),
});

export type TailorResult = z.infer<typeof tailorResultSchema>;
export type FullProfileInput = z.infer<typeof fullProfileSchema>;
export type ApplicationBody = z.infer<typeof applicationBodySchema>;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type InterviewQuestionType = (typeof INTERVIEW_QUESTION_TYPES)[number];
export type InterviewQuestionsResult = z.infer<typeof interviewQuestionsResultSchema>;
export type InterviewFeedbackResult = z.infer<typeof interviewFeedbackResultSchema>;
