import { db } from "../db.js";
import type { FullProfileInput } from "../schemas.js";

export type FullProfile = FullProfileInput;
export type ShippedProject = FullProfile["shipped_projects"][number];

export function getProfile(): FullProfile {
  const row = db.prepare(`SELECT * FROM profile WHERE id = 1`).get() as any;

  const projects = db
    .prepare(`SELECT id, name, description, stack_json, highlights_json FROM shipped_projects ORDER BY sort_order`)
    .all() as any[];
  const work = db
    .prepare(`SELECT entry FROM work_history ORDER BY sort_order`)
    .all() as any[];
  const rejections = db
    .prepare(`SELECT text FROM rejection_criteria ORDER BY sort_order`)
    .all() as any[];
  const prefs = db
    .prepare(`SELECT text FROM preferences ORDER BY sort_order`)
    .all() as any[];

  return {
    name: row.name,
    location: row.location,
    title: row.title,
    education: JSON.parse(row.education_json),
    stack: {
      core: JSON.parse(row.stack_core_json),
      also: JSON.parse(row.stack_also_json),
    },
    other_experience: JSON.parse(row.other_experience_json),
    shipped_projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      stack: JSON.parse(p.stack_json),
      highlights: JSON.parse(p.highlights_json),
    })),
    work_history: work.map((w) => w.entry),
    contact: JSON.parse(row.contact_json),
    bios: { short: row.bio_short, medium: row.bio_medium, long: row.bio_long },
    rejection_criteria: rejections.map((r) => r.text),
    preferences: prefs.map((p) => p.text),
  };
}

export function saveProfile(profile: FullProfile): FullProfile {
  const update = db.prepare(`
    UPDATE profile SET
      name = @name, location = @location, title = @title,
      education_json = @education_json,
      stack_core_json = @stack_core_json,
      stack_also_json = @stack_also_json,
      other_experience_json = @other_experience_json,
      contact_json = @contact_json,
      bio_short = @bio_short, bio_medium = @bio_medium, bio_long = @bio_long,
      updated_at = datetime('now')
    WHERE id = 1
  `);

  const run = db.transaction(() => {
    update.run({
      name: profile.name,
      location: profile.location,
      title: profile.title,
      education_json: JSON.stringify(profile.education ?? {}),
      stack_core_json: JSON.stringify(profile.stack?.core ?? []),
      stack_also_json: JSON.stringify(profile.stack?.also ?? []),
      other_experience_json: JSON.stringify(profile.other_experience ?? []),
      contact_json: JSON.stringify(profile.contact ?? {}),
      bio_short: profile.bios?.short ?? "",
      bio_medium: profile.bios?.medium ?? "",
      bio_long: profile.bios?.long ?? "",
    });

    db.prepare(`DELETE FROM shipped_projects`).run();
    const insertProject = db.prepare(
      `INSERT INTO shipped_projects (name, description, stack_json, highlights_json, sort_order) VALUES (?, ?, ?, ?, ?)`
    );
    (profile.shipped_projects ?? []).forEach((p, i) =>
      insertProject.run(p.name, p.description, JSON.stringify(p.stack ?? []), JSON.stringify(p.highlights ?? []), i)
    );

    db.prepare(`DELETE FROM work_history`).run();
    const insertWork = db.prepare(`INSERT INTO work_history (entry, sort_order) VALUES (?, ?)`);
    (profile.work_history ?? []).forEach((entry, i) => insertWork.run(entry, i));

    db.prepare(`DELETE FROM rejection_criteria`).run();
    const insertRejection = db.prepare(
      `INSERT INTO rejection_criteria (text, sort_order) VALUES (?, ?)`
    );
    (profile.rejection_criteria ?? []).forEach((text, i) => insertRejection.run(text, i));

    db.prepare(`DELETE FROM preferences`).run();
    const insertPref = db.prepare(`INSERT INTO preferences (text, sort_order) VALUES (?, ?)`);
    (profile.preferences ?? []).forEach((text, i) => insertPref.run(text, i));
  });

  run();
  return getProfile();
}
