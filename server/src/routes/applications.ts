import { Router } from "express";
import { db } from "../db.js";
import { applicationBodySchema, statusUpdateSchema, notesUpdateSchema } from "../schemas.js";

export const applicationsRouter = Router();

applicationsRouter.get("/", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT id, job_title, company, job_url, match_score, status, status_updated_at, created_at, updated_at
       FROM applications ORDER BY updated_at DESC`
    )
    .all();
  res.json(rows);
});

applicationsRouter.get("/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM applications WHERE id = ?`).get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    ...row,
    parsed: JSON.parse(row.parsed_json),
    match_notes: JSON.parse(row.match_notes_json),
  });
});

applicationsRouter.post("/", (req, res) => {
  const parsed = applicationBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid application payload", issues: parsed.error.issues });
    return;
  }
  const b = parsed.data;

  const info = db
    .prepare(
      `INSERT INTO applications
        (job_title, company, job_url, job_description, parsed_json, match_score, match_notes_json,
         resume_bullets, cover_letter, cold_dm, status, status_updated_at, notes)
       VALUES (@job_title, @company, @job_url, @job_description, @parsed_json, @match_score, @match_notes_json,
               @resume_bullets, @cover_letter, @cold_dm, @status, datetime('now'), @notes)`
    )
    .run({
      job_title: b.job_title,
      company: b.company,
      job_url: b.job_url,
      job_description: b.job_description,
      parsed_json: JSON.stringify(b.parsed ?? {}),
      match_score: b.match_score ?? null,
      match_notes_json: JSON.stringify(b.match_notes ?? {}),
      resume_bullets: b.resume_bullets,
      cover_letter: b.cover_letter,
      cold_dm: b.cold_dm,
      status: b.status,
      notes: b.notes,
    });

  const row = db.prepare(`SELECT * FROM applications WHERE id = ?`).get(info.lastInsertRowid);
  res.status(201).json(row);
});

applicationsRouter.put("/:id", (req, res) => {
  const parsed = applicationBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid application payload", issues: parsed.error.issues });
    return;
  }
  const b = parsed.data;

  db.prepare(
    `UPDATE applications SET
       job_title = @job_title, company = @company, job_url = @job_url,
       job_description = @job_description, parsed_json = @parsed_json,
       match_score = @match_score, match_notes_json = @match_notes_json,
       resume_bullets = @resume_bullets, cover_letter = @cover_letter, cold_dm = @cold_dm,
       status = @status, updated_at = datetime('now')
     WHERE id = @id`
  ).run({
    id: req.params.id,
    job_title: b.job_title,
    company: b.company,
    job_url: b.job_url,
    job_description: b.job_description,
    parsed_json: JSON.stringify(b.parsed ?? {}),
    match_score: b.match_score ?? null,
    match_notes_json: JSON.stringify(b.match_notes ?? {}),
    resume_bullets: b.resume_bullets,
    cover_letter: b.cover_letter,
    cold_dm: b.cold_dm,
    status: b.status,
  });

  const row = db.prepare(`SELECT * FROM applications WHERE id = ?`).get(req.params.id);
  res.json(row);
});

// Dedicated status-transition endpoint — separate from PUT so a status change
// never has to carry (or accidentally overwrite) the drafts/parsed content,
// and updates status_updated_at, which the general PUT deliberately doesn't.
applicationsRouter.patch("/:id/status", (req, res) => {
  const parsed = statusUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid status payload", issues: parsed.error.issues });
    return;
  }

  const info = db
    .prepare(
      `UPDATE applications SET status = ?, status_updated_at = datetime('now') WHERE id = ?`
    )
    .run(parsed.data.status, req.params.id);

  if (info.changes === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const row = db.prepare(`SELECT * FROM applications WHERE id = ?`).get(req.params.id);
  res.json(row);
});

// Dedicated notes-only update endpoint — isolated from the general PUT for
// the same reason as /status: an inline notes save shouldn't require (or
// risk overwriting) the drafts/parsed content, and vice versa.
applicationsRouter.patch("/:id/notes", (req, res) => {
  const parsed = notesUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid notes payload", issues: parsed.error.issues });
    return;
  }

  const info = db
    .prepare(`UPDATE applications SET notes = ? WHERE id = ?`)
    .run(parsed.data.notes, req.params.id);

  if (info.changes === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const row = db.prepare(`SELECT * FROM applications WHERE id = ?`).get(req.params.id);
  res.json(row);
});

applicationsRouter.delete("/:id", (req, res) => {
  db.prepare(`DELETE FROM applications WHERE id = ?`).run(req.params.id);
  res.status(204).end();
});
