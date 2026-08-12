import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "job-hunt.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    education_json TEXT NOT NULL DEFAULT '{}',
    stack_core_json TEXT NOT NULL DEFAULT '[]',
    stack_also_json TEXT NOT NULL DEFAULT '[]',
    other_experience_json TEXT NOT NULL DEFAULT '[]',
    bio_short TEXT NOT NULL DEFAULT '',
    bio_medium TEXT NOT NULL DEFAULT '',
    bio_long TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shipped_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    highlights_json TEXT NOT NULL DEFAULT '[]',
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS work_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS rejection_criteria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_title TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    job_url TEXT NOT NULL DEFAULT '',
    job_description TEXT NOT NULL,
    parsed_json TEXT NOT NULL DEFAULT '{}',
    match_score INTEGER,
    match_notes_json TEXT NOT NULL DEFAULT '{}',
    resume_bullets TEXT NOT NULL DEFAULT '',
    cover_letter TEXT NOT NULL DEFAULT '',
    cold_dm TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS interview_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
    job_title TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    job_description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS interview_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    type TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    answer TEXT,
    feedback_json TEXT,
    answered_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Ensure the single profile row always exists.
db.prepare(`INSERT OR IGNORE INTO profile (id) VALUES (1)`).run();

// --- Migration: per-project stack ---
const shippedProjectColumns = db.prepare(`PRAGMA table_info(shipped_projects)`).all() as { name: string }[];
if (!shippedProjectColumns.some((c) => c.name === "stack_json")) {
  db.exec(`ALTER TABLE shipped_projects ADD COLUMN stack_json TEXT NOT NULL DEFAULT '[]'`);
}

// --- Migration: profile contact info ---
const profileColumns = db.prepare(`PRAGMA table_info(profile)`).all() as { name: string }[];
if (!profileColumns.some((c) => c.name === "contact_json")) {
  db.exec(`ALTER TABLE profile ADD COLUMN contact_json TEXT NOT NULL DEFAULT '{}'`);
}

// --- Migration: application pipeline status tracking ---
// `status` originally only distinguished draft (in-progress) vs saved
// (persisted) — it now tracks the actual application pipeline stage
// (draft/applied/interviewing/rejected/offer). Both steps are safe to rerun
// on every startup: the column-add is guarded by a schema check, and the
// value rewrite is a no-op once no rows carry the old "saved" value.
const applicationColumns = db.prepare(`PRAGMA table_info(applications)`).all() as { name: string }[];
if (!applicationColumns.some((c) => c.name === "status_updated_at")) {
  db.exec(`ALTER TABLE applications ADD COLUMN status_updated_at TEXT`);
  db.exec(`UPDATE applications SET status_updated_at = updated_at WHERE status_updated_at IS NULL`);
}
db.exec(`UPDATE applications SET status = 'draft' WHERE status = 'saved'`);

// --- Migration: freeform notes per application (recruiter names, call
// times, salary discussed — anything not captured by the tailored drafts) ---
const applicationNotesColumns = db.prepare(`PRAGMA table_info(applications)`).all() as { name: string }[];
if (!applicationNotesColumns.some((c) => c.name === "notes")) {
  db.exec(`ALTER TABLE applications ADD COLUMN notes TEXT NOT NULL DEFAULT ''`);
}

// --- Automatic timestamped backup on every startup ---
// Uses better-sqlite3's online backup API rather than a raw file copy —
// journal_mode is WAL, so recent writes can still be sitting in the -wal
// file, and copying just the main .sqlite file could silently miss them.
// Fire-and-forget: doesn't block server startup. Capped to the most recent
// MAX_BACKUPS so this directory doesn't grow unbounded over time. Same
// `job-hunt.sqlite.bak-<timestamp>` naming as the pre-existing manual backup
// found in this directory, so both sort together.
const MAX_BACKUPS = 10;

function backupTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    String(d.getFullYear()) +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function pruneOldBackups() {
  const backups = fs
    .readdirSync(dataDir)
    .filter((f) => f.startsWith("job-hunt.sqlite.bak-"))
    .sort();
  const excess = backups.length - MAX_BACKUPS;
  for (const f of backups.slice(0, Math.max(excess, 0))) {
    fs.unlinkSync(path.join(dataDir, f));
  }
}

const backupPath = path.join(dataDir, `job-hunt.sqlite.bak-${backupTimestamp(new Date())}`);
db.backup(backupPath)
  .then(() => pruneOldBackups())
  .catch((err) => console.error("Startup database backup failed:", err));
