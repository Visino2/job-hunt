import { Router } from "express";
import { db } from "../db.js";
import { getProfile } from "../services/profileStore.js";

export const exportRouter = Router();

// A single portable JSON dump of everything this app holds — profile,
// every saved application, every interview prep session with its
// questions/answers/feedback. Meant as a manual "download my data"
// safety net alongside the automatic startup backups in db.ts, which
// only live on this machine.
exportRouter.get("/", (_req, res) => {
  const profile = getProfile();

  const applicationRows = db.prepare(`SELECT * FROM applications ORDER BY id`).all() as any[];
  const applications = applicationRows.map((row) => ({
    ...row,
    parsed: JSON.parse(row.parsed_json),
    match_notes: JSON.parse(row.match_notes_json),
  }));

  const sessionRows = db.prepare(`SELECT * FROM interview_sessions ORDER BY id`).all() as any[];
  const questionRows = db
    .prepare(`SELECT * FROM interview_questions ORDER BY session_id, sort_order`)
    .all() as any[];
  const interview_sessions = sessionRows.map((session) => ({
    ...session,
    questions: questionRows
      .filter((q) => q.session_id === session.id)
      .map((q) => ({ ...q, feedback: q.feedback_json ? JSON.parse(q.feedback_json) : null })),
  }));

  res.json({
    exported_at: new Date().toISOString(),
    profile,
    applications,
    interview_sessions,
  });
});
