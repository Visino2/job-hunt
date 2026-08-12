import { Router } from "express";
import { db } from "../db.js";
import { getProfile } from "../services/profileStore.js";
import { generateInterviewQuestions, generateAnswerFeedback } from "../services/interview.js";
import { fetchJobDescriptionFromUrl } from "../services/jobFetch.js";
import { interviewSessionCreateSchema, interviewAnswerSchema } from "../schemas.js";

export const interviewRouter = Router();

interviewRouter.get("/sessions", (_req, res) => {
  const sessions = db
    .prepare(
      `SELECT s.id, s.application_id, s.job_title, s.company, s.created_at,
              COUNT(q.id) AS question_count,
              SUM(CASE WHEN q.answer IS NOT NULL THEN 1 ELSE 0 END) AS answered_count
       FROM interview_sessions s
       LEFT JOIN interview_questions q ON q.session_id = s.id
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    )
    .all();
  res.json(sessions);
});

interviewRouter.get("/sessions/:id", (req, res) => {
  const session = db
    .prepare(`SELECT * FROM interview_sessions WHERE id = ?`)
    .get(req.params.id) as any;
  if (!session) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const questions = db
    .prepare(
      `SELECT id, question, type, sort_order, answer, feedback_json, answered_at
       FROM interview_questions WHERE session_id = ? ORDER BY sort_order`
    )
    .all(req.params.id) as any[];

  res.json({
    ...session,
    questions: questions.map((q) => ({
      ...q,
      feedback: q.feedback_json ? JSON.parse(q.feedback_json) : null,
    })),
  });
});

interviewRouter.post("/sessions", async (req, res) => {
  const parsed = interviewSessionCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
    return;
  }
  const { jobDescription, jobUrl, applicationId } = parsed.data;

  try {
    let text = jobDescription?.trim() ?? "";
    if (!text && jobUrl) {
      text = await fetchJobDescriptionFromUrl(jobUrl);
    }

    let jobTitle = "";
    let company = "";
    if (applicationId) {
      const app = db
        .prepare(`SELECT job_title, company FROM applications WHERE id = ?`)
        .get(applicationId) as any;
      if (!app) {
        res.status(400).json({ error: `No saved application with id ${applicationId}` });
        return;
      }
      jobTitle = app.job_title;
      company = app.company;
    }

    const profile = getProfile();
    const { questions } = await generateInterviewQuestions(profile, text);

    const sessionId = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO interview_sessions (application_id, job_title, company, job_description)
           VALUES (?, ?, ?, ?)`
        )
        .run(applicationId ?? null, jobTitle, company, text);

      const insertQuestion = db.prepare(
        `INSERT INTO interview_questions (session_id, question, type, sort_order) VALUES (?, ?, ?, ?)`
      );
      questions.forEach((q, i) => insertQuestion.run(info.lastInsertRowid, q.question, q.type, i));

      return info.lastInsertRowid;
    })();

    const savedQuestions = db
      .prepare(
        `SELECT id, question, type, sort_order, answer, feedback_json, answered_at
         FROM interview_questions WHERE session_id = ? ORDER BY sort_order`
      )
      .all(sessionId) as any[];

    res.status(201).json({
      id: sessionId,
      application_id: applicationId ?? null,
      job_title: jobTitle,
      company,
      job_description: text,
      questions: savedQuestions.map((q) => ({ ...q, feedback: null })),
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Failed to generate interview questions." });
  }
});

interviewRouter.patch("/questions/:id/answer", async (req, res) => {
  const parsed = interviewAnswerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid answer payload", issues: parsed.error.issues });
    return;
  }

  const question = db
    .prepare(
      `SELECT q.id, q.question, s.job_description
       FROM interview_questions q
       JOIN interview_sessions s ON s.id = q.session_id
       WHERE q.id = ?`
    )
    .get(req.params.id) as any;

  if (!question) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  try {
    const profile = getProfile();
    const feedback = await generateAnswerFeedback(
      profile,
      question.job_description,
      question.question,
      parsed.data.answer
    );

    db.prepare(
      `UPDATE interview_questions SET answer = ?, feedback_json = ?, answered_at = datetime('now') WHERE id = ?`
    ).run(parsed.data.answer, JSON.stringify(feedback), req.params.id);

    const updated = db
      .prepare(
        `SELECT id, question, type, sort_order, answer, feedback_json, answered_at
         FROM interview_questions WHERE id = ?`
      )
      .get(req.params.id) as any;

    res.json({ ...updated, feedback: JSON.parse(updated.feedback_json) });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Failed to generate feedback." });
  }
});
