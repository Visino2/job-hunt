#!/usr/bin/env tsx
// Regression check for the "drafts must not overclaim beyond match.gaps" rule
// added to the tailoring prompt in src/services/claude.ts. Rerun this any time
// that prompt changes, and especially after switching LLM_PROVIDER — a weaker
// or different model is the most likely way this constraint quietly breaks.
//
// Usage:
//   npm run check-overclaims                # check every saved application
//   npm run check-overclaims -- 3 4 5        # check specific application ids
//
// Can also be imported and used directly against a raw drafts object (e.g. from
// a one-off /api/tailor response that hasn't been saved yet) via checkDrafts().

import { db } from "../src/db.js";

interface MatchNotes {
  strong_points?: string[];
  gaps?: string[];
  bridging_notes?: string[];
}

interface ApplicationRow {
  id: number;
  job_title: string;
  company: string;
  match_notes_json: string;
  resume_bullets: string;
  cover_letter: string;
  cold_dm: string;
}

interface Failure {
  rule: string;
  line: string;
}

interface CheckResult {
  id: number | "unsaved";
  label: string;
  failures: Failure[];
}

// --- 1. Fixed keyword sweep --------------------------------------------

const BANNED_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "led a team", re: /\bled a team\b/i },
  { label: "managed team/engineers", re: /\bmanaged (a |an )?(team|engineers?)\b/i },
  { label: "proven leadership", re: /\bproven (leadership|track record of leading)\b/i },
  { label: "expert in", re: /\bexpert in\b/i },
  { label: "years-of-experience figure", re: /\b\d+\+?\s*years?\b/i },
  { label: "compliance-standard claim", re: /\b(SOC ?2|ISO ?27001|PCI[- ]DSS)\b.*(certifi|complian|achiev)/i },
  { label: "MAU/user-count figure", re: /\b[\d,]+\+?\s*(MAU|users|monthly active)/i },
  { label: "scaled app to N users", re: /\bscaled?\s+(the\s+|a\s+)?(app|product|platform|system)\s+to\b/i },
  { label: "hired claim", re: /\bI'?ve hired\b|\bhired (and|\d)/i },
  { label: "mentored/trained team claim", re: /\b(mentored|trained)\s+(a |an )?team\b/i },
  { label: "unqualified 'I have managed' claim", re: /\bI (have |'ve )?managed\b/i },
  { label: "unqualified 'certified in' claim", re: /\bcertified in\b/i },
  {
    label: "unhedged 'formal engineering manager' claim",
    re: /\bformal engineering manager\b(?!.*(rather than|not|don't|isn't|wasn't|instead of))/i,
  },
];

function scanBannedPatterns(text: string): Failure[] {
  const failures: Failure[] = [];
  for (const { label, re } of BANNED_PATTERNS) {
    const match = text.match(re);
    if (match) {
      const line = lineContaining(text, match.index ?? 0);
      failures.push({ rule: `banned pattern: ${label}`, line });
    }
  }
  return failures;
}

// --- 2. Cross-check drafts against this application's own match.gaps --

const HEDGE_MARKERS = [
  "rather than", "cannot", "can't", "don't", "doesn't", "isn't", "wasn't",
  "no formal", "not a ", "not an ", "without", "lack", "lacking", "haven't",
  "outside my", "not claim", "no direct", "omit", "not currently",
  "haven't yet", "instead of", "not have", "don't carry", "don't have",
  "i know this", "outside", "not my", "isn't my",
];

// Deliberately narrow. Generic self-description ("I'm a React Native
// developer", "I am reaching out", "I've shipped X") must NOT match here —
// only phrasing that asserts capability/scale/tenure at the thing the gap
// says is missing. This is the gate that keeps the check from flagging every
// honest mention of a skill the candidate genuinely has.
const CLAIM_MARKERS = [
  "i have", "i've", "expert in", "expertise in", "proven", "certified",
  "specialize in", "specialized in", "strong background in",
  "deep expertise", "extensive experience", "track record of",
  "years of experience", "led ", "managed", "achieved", "delivered",
  "scaled", "hired", "mentored", "trained a", "responsible for managing",
  "direct experience", "formal experience",
];

const STOP_WORDS = new Set([
  "the", "a", "an", "of", "in", "on", "for", "with", "and", "or", "to", "is",
  "are", "as", "that", "this", "by", "at", "not", "no", "does", "have", "has",
  "was", "were", "been", "its", "who", "how", "see", "saw", "own", "via",
  "per", "use", "used", "your", "you",
]);

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Cover letters hedge once per paragraph, not once per sentence — so hedge
// detection needs paragraph-level scope, not just the single sentence.
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// Strips the negation lead-in off a gap description to get its topic, e.g.
// "No formal 1+ year engineering management experience" -> "formal 1+ year
// engineering management experience". Gaps are often phrased "A rather than
// B" / "A instead of B", where A is the candidate's real (true) skill
// mentioned for contrast and B is the actual deficit — in that case the
// topic we care about is B, not A, or every honest mention of the real skill
// would falsely read as touching the gap.
function gapSubject(gap: string): string {
  const contrast = gap.match(/\b(?:rather than|instead of)\s+(.+)$/i);
  if (contrast) return contrast[1].trim();

  return gap
    .replace(
      /^(no|not|lacks?|missing|absent|does not have|doesn't have)\s+(direct |explicit |formal |professional |prior |mentioned )*/i,
      ""
    )
    .replace(/^(experience (with|in|of)|evidence of|prior)\s+/i, "")
    .trim();
}

function significantWords(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

// Word-boundary containment, not substring — "product" must not match inside
// "production", "team" must not match inside "steamed".
function containsWord(text: string, word: string): boolean {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
}

function hasHedge(text: string): boolean {
  const lower = text.toLowerCase();
  return HEDGE_MARKERS.some((h) => lower.includes(h));
}

function hasClaimMarker(text: string): boolean {
  const lower = text.toLowerCase();
  return CLAIM_MARKERS.some((m) => lower.includes(m));
}

function lineContaining(text: string, index: number): string {
  const start = text.lastIndexOf("\n", index) + 1;
  const endNewline = text.indexOf("\n", index);
  const end = endNewline === -1 ? text.length : endNewline;
  return text.slice(start, end).trim();
}

// For each gap, check whether the draft makes an affirmative capability claim
// (per CLAIM_MARKERS) about that gap's topic, in a paragraph that never hedges
// it. Fixed keyword regex catches known overclaim phrasings; this catches the
// same failure mode for gaps whose specific wording we didn't anticipate.
// Heuristic, not semantic — see header comment for what this can't catch.
function crossCheckGaps(draftText: string, gaps: string[]): Failure[] {
  const failures: Failure[] = [];
  const paragraphs = splitParagraphs(draftText);

  for (const gap of gaps) {
    const words = significantWords(gapSubject(gap));
    if (words.length === 0) continue;
    const threshold = Math.min(2, words.length);

    for (const paragraph of paragraphs) {
      if (hasHedge(paragraph)) continue; // hedged somewhere in this block — fine

      for (const sentence of splitSentences(paragraph)) {
        if (!hasClaimMarker(sentence)) continue; // no capability claim being made at all
        const overlap = words.filter((w) => containsWord(sentence, w)).length;
        if (overlap >= threshold) {
          failures.push({
            rule: `unhedged capability claim touching on gap: "${gap}"`,
            line: sentence,
          });
        }
      }
    }
  }
  return failures;
}

// --- Runner --------------------------------------------------------------

export function checkDrafts(input: {
  id: number | "unsaved";
  label: string;
  gaps: string[];
  resumeBullets: string;
  coverLetter: string;
  coldDm: string;
}): CheckResult {
  const combinedDraftText = [input.resumeBullets, input.coverLetter, input.coldDm].join("\n");

  const failures = [
    ...scanBannedPatterns(combinedDraftText),
    ...crossCheckGaps(combinedDraftText, input.gaps),
  ];

  // De-dupe: the same offending sentence can trip both checks.
  const seen = new Set<string>();
  const deduped = failures.filter((f) => {
    const key = f.rule + "|" + f.line;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { id: input.id, label: input.label, failures: deduped };
}

function loadApplications(ids: number[]): ApplicationRow[] {
  if (ids.length === 0) {
    return db
      .prepare(
        `SELECT id, job_title, company, match_notes_json, resume_bullets, cover_letter, cold_dm
         FROM applications ORDER BY id`
      )
      .all() as ApplicationRow[];
  }
  const placeholders = ids.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT id, job_title, company, match_notes_json, resume_bullets, cover_letter, cold_dm
       FROM applications WHERE id IN (${placeholders}) ORDER BY id`
    )
    .all(...ids) as ApplicationRow[];
}

function main() {
  const args = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
  const rows = loadApplications(args);

  if (rows.length === 0) {
    console.log(args.length > 0 ? "No matching saved applications found for those ids." : "No saved applications found.");
    process.exit(0);
  }

  let anyFailed = false;

  for (const row of rows) {
    const matchNotes: MatchNotes = JSON.parse(row.match_notes_json || "{}");
    const result = checkDrafts({
      id: row.id,
      label: `${row.company || "Unknown company"} — ${row.job_title || "Untitled role"}`,
      gaps: matchNotes.gaps ?? [],
      resumeBullets: row.resume_bullets,
      coverLetter: row.cover_letter,
      coldDm: row.cold_dm,
    });

    if (result.failures.length === 0) {
      console.log(`[PASS] #${result.id} ${result.label}`);
    } else {
      anyFailed = true;
      console.log(`[FAIL] #${result.id} ${result.label} — ${result.failures.length} issue(s)`);
      for (const f of result.failures) {
        console.log(`  - ${f.rule}`);
        console.log(`    "${f.line}"`);
      }
    }
  }

  console.log();
  console.log(anyFailed ? "Overclaim check: FAILED — see issues above." : "Overclaim check: all clear.");
  process.exit(anyFailed ? 1 : 0);
}

// Only run the CLI when this file is executed directly (`tsx check-overclaims.ts`),
// not when checkDrafts() is imported elsewhere — importing must not have side effects.
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main();
}
