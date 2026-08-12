export interface ShippedProject {
  id?: number;
  name: string;
  description: string;
  stack: string[];
  highlights: string[];
}

export interface FullProfile {
  name: string;
  location: string;
  title: string;
  education: {
    degree?: string;
    institution?: string;
    year?: number | string;
    note?: string;
  };
  stack: { core: string[]; also: string[] };
  other_experience: string[];
  shipped_projects: ShippedProject[];
  work_history: string[];
  contact: {
    phone: string;
    email: string;
    linkedin: string;
    github: string;
    portfolio: string;
  };
  bios: { short: string; medium: string; long: string };
  rejection_criteria: string[];
  preferences: string[];
}

export interface TailorResponse {
  jobDescription: string;
  parsed: {
    required_skills: string[];
    nice_to_haves: string[];
    seniority_level: string;
    red_flags: string[];
    role_summary: string;
  };
  match: {
    score: number;
    strong_points: string[];
    gaps: string[];
    bridging_notes: string[];
  };
  drafts: {
    resume_bullets: string[];
    cover_letter: string;
    cold_dm: string;
  };
}

export type ApplicationStatus = 'draft' | 'applied' | 'interviewing' | 'rejected' | 'offer';

export interface ApplicationSummary {
  id: number;
  job_title: string;
  company: string;
  job_url: string;
  match_score: number | null;
  status: ApplicationStatus;
  status_updated_at: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationRecord extends ApplicationSummary {
  job_description: string;
  parsed: TailorResponse['parsed'];
  match_notes: {
    strong_points: string[];
    gaps: string[];
    bridging_notes: string[];
  };
  resume_bullets: string;
  cover_letter: string;
  cold_dm: string;
  notes: string;
}

export type InterviewQuestionType = 'technical' | 'behavioral';

export interface InterviewFeedback {
  strong_points: string[];
  vague_or_weak_points: string[];
  what_a_stronger_answer_includes: string[];
  overall_note: string;
}

export interface InterviewQuestion {
  id: number;
  question: string;
  type: InterviewQuestionType;
  sort_order: number;
  answer: string | null;
  feedback: InterviewFeedback | null;
  answered_at: string | null;
}

export interface InterviewSessionSummary {
  id: number;
  application_id: number | null;
  job_title: string;
  company: string;
  created_at: string;
  question_count: number;
  answered_count: number;
}

export interface InterviewSession {
  id: number;
  application_id: number | null;
  job_title: string;
  company: string;
  job_description: string;
  created_at: string;
  questions: InterviewQuestion[];
}

export interface RecentJob {
  title: string;
  company: string | null;
  link: string;
  pubDate: string;
  sourceLabel: string;
  matchedKeywords: string[];
}

export interface RecentJobsResponse {
  jobs: RecentJob[];
  sourcesQueried: string[];
  sourceErrors: { source: string; message: string }[];
  fetchedAt: string;
  cacheAgeSeconds: number;
}
