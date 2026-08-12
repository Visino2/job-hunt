// One-time seed: loads Victor's profile (as provided) into the SQLite store.
// Safe to re-run — it overwrites the existing profile row and replaces
// shipped_projects / work_history / rejection_criteria / preferences.
import { db } from "../db.js";

const profile = {
  name: "Victor Aba",
  location: "Lagos, Nigeria",
  title: "Mobile Developer (React Native / Flutter) | Founder, Whealve Technology",
  education: {
    degree: "B.Sc. Zoology",
    institution: "University of Ilorin",
    year: 2021,
    note: "Self-taught software developer; degree is unrelated to current field",
  },
  stack: {
    core: ["React Native", "Flutter", "TypeScript", "Firebase", "REST APIs"],
    also: ["Node.js", "Expo", "WebSockets", "Amazon SES", "SQL/Firestore"],
  },
  other_experience: [
    "Android POS/EMV work with Sunmi, Clover, and PAX terminals",
    "Drips Network Stellar Wave open-source contributor (GitHub: Visino2) — resolved PR #470, Fundable-Protocol/stellar_client_os",
  ],
  shipped_projects: [
    {
      name: "Converf",
      description: "Construction QAQC/inspection app, live on the App Store",
      highlights: [
        "Offline-first architecture with field-level (not just document-level) conflict resolution for sync",
        "Built and shipped solo end-to-end",
        "Used in real construction site inspection workflows",
      ],
    },
    {
      name: "FinWise",
      description: "Personal finance app with biometric authentication",
      highlights: [
        "Biometric auth implementation",
        "Handles sensitive financial data securely",
      ],
    },
    {
      name: "Valura.ai internship project",
      description: "Real-time crypto trading panel, UAE-based wealth-tech startup",
      highlights: [
        "Node.js/TypeScript WebSocket server + Expo/React Native client",
        "All automated verification gates passing, documentation committed",
      ],
    },
  ],
  work_history: [
    "SEDL Inc.",
    "TechNova Solutions",
    "ContentQ / HNG Internship",
    "LiquidClips — ongoing revenue-share maintenance partnership (Whop, 20% monthly)",
  ],
  bios: {
    short:
      "Mobile developer (React Native/Flutter) based in Lagos, founder of Whealve Technology. Shipped Converf (construction QAQC, live on the App Store) and FinWise (personal finance with biometric auth).",
    medium:
      "I'm Victor Aba, a self-taught mobile developer based in Lagos and founder of Whealve Technology. I specialize in React Native and Flutter with TypeScript, Firebase, and REST APIs. I've shipped two production apps — Converf, an offline-first construction QAQC/inspection app live on the App Store, and FinWise, a personal finance app with biometric authentication. I recently completed a real-time crypto trading panel internship project for Valura.ai, a UAE-based wealth-tech startup, building both the Node.js/TypeScript WebSocket server and the Expo/React Native client.",
    long:
      "I'm Victor Aba, a mobile developer and founder of Whealve Technology, based in Lagos, Nigeria. I'm self-taught in software development (my degree is actually in Zoology from the University of Ilorin) and have built my career around shipping real, production-grade mobile apps rather than credentials. My core stack is React Native and Flutter with TypeScript, Firebase, and REST APIs. I've shipped Converf, an offline-first construction QAQC/inspection app live on the App Store with field-level conflict resolution for sync — a genuinely hard offline-data problem I solved from scratch. I also built FinWise, a personal finance app with biometric authentication handling sensitive financial data. Most recently, I completed a technical internship assignment for Valura.ai, a UAE-based wealth-tech startup, building a real-time crypto trading panel with a Node.js/TypeScript WebSocket server and an Expo/React Native client, passing all automated verification gates. I also maintain LiquidClips under a revenue-share partnership, and I've done Android POS/EMV integration work with Sunmi, Clover, and PAX terminals. I lead with what I've shipped, not years of experience.",
  },
  rejection_criteria: [
    "Native Android-only roles requiring deep Kotlin/Java specialization (I'm React Native/Flutter, not native Android)",
    "Roles requiring existing US work authorization / US citizenship",
    "Roles requiring on-site relocation that conflicts with Estonia MSc relocation plan (Tartu/TalTech, target September intake)",
    "Unpaid 'trial project' recruitment scams — vet any suspicious outreach before responding",
  ],
  preferences: [
    "Remote-first or Lagos/Nigeria-based roles preferred",
    "Fintech, wealth-tech, and mobile-first product companies are a strong fit",
    "Comfortable with contract, internship-to-hire, or full-time",
    "Open to EMEA remote (per Hostaway-type applications)",
  ],
};

const upsertProfile = db.prepare(`
  UPDATE profile SET
    name = @name,
    location = @location,
    title = @title,
    education_json = @education_json,
    stack_core_json = @stack_core_json,
    stack_also_json = @stack_also_json,
    other_experience_json = @other_experience_json,
    bio_short = @bio_short,
    bio_medium = @bio_medium,
    bio_long = @bio_long,
    updated_at = datetime('now')
  WHERE id = 1
`);

const run = db.transaction(() => {
  upsertProfile.run({
    name: profile.name,
    location: profile.location,
    title: profile.title,
    education_json: JSON.stringify(profile.education),
    stack_core_json: JSON.stringify(profile.stack.core),
    stack_also_json: JSON.stringify(profile.stack.also),
    other_experience_json: JSON.stringify(profile.other_experience),
    bio_short: profile.bios.short,
    bio_medium: profile.bios.medium,
    bio_long: profile.bios.long,
  });

  db.prepare(`DELETE FROM shipped_projects`).run();
  const insertProject = db.prepare(
    `INSERT INTO shipped_projects (name, description, highlights_json, sort_order) VALUES (?, ?, ?, ?)`
  );
  profile.shipped_projects.forEach((p, i) =>
    insertProject.run(p.name, p.description, JSON.stringify(p.highlights), i)
  );

  db.prepare(`DELETE FROM work_history`).run();
  const insertWork = db.prepare(`INSERT INTO work_history (entry, sort_order) VALUES (?, ?)`);
  profile.work_history.forEach((entry, i) => insertWork.run(entry, i));

  db.prepare(`DELETE FROM rejection_criteria`).run();
  const insertRejection = db.prepare(
    `INSERT INTO rejection_criteria (text, sort_order) VALUES (?, ?)`
  );
  profile.rejection_criteria.forEach((text, i) => insertRejection.run(text, i));

  db.prepare(`DELETE FROM preferences`).run();
  const insertPref = db.prepare(`INSERT INTO preferences (text, sort_order) VALUES (?, ?)`);
  profile.preferences.forEach((text, i) => insertPref.run(text, i));
});

run();
console.log("Profile seeded for", profile.name);
