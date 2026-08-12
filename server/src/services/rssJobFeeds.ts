// Lightweight "recent jobs" sourcing from free public RSS feeds — no paid
// APIs, no scraping of sites that block it. Verified live sources only:
// RemoteOK's RSS now 403s (bot-blocked) and Remotive's free API doesn't
// actually honor its category/search filters, so neither is used here.
//
// Matching is a simple keyword pass against title + description, not a
// Claude/Gemini call — this stays free and fast, and results are cached
// (see CACHE_TTL_MS) rather than re-fetched on every page load, to be a
// good citizen of these feeds.

interface FeedSource {
  label: string;
  url: string;
}

const SOURCES: FeedSource[] = [
  {
    label: "We Work Remotely",
    url: "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
  },
  {
    label: "We Work Remotely",
    url: "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
  },
  {
    label: "Jobicy",
    url: "https://jobicy.com/?feed=job_feed&job_categories=dev",
  },
];

// "react native"/"flutter" are the actual target stack; the rest are
// broadened per product decision, since strict-only matching returns ~0
// results most days. Primary matches are called out distinctly in the UI.
const PRIMARY_KEYWORDS = ["react native", "flutter"];
const SECONDARY_KEYWORDS = ["typescript", "mobile", "ios", "android", "javascript"];

const MATCH_WINDOW_HOURS = 24;
const MAX_RESULTS = 30;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface MatchedJob {
  title: string;
  company: string | null;
  link: string;
  pubDate: string; // ISO
  sourceLabel: string;
  matchedKeywords: string[];
}

export interface SourceError {
  source: string;
  message: string;
}

export interface RecentJobsResult {
  jobs: MatchedJob[];
  sourcesQueried: string[];
  sourceErrors: SourceError[];
  fetchedAt: string; // ISO
  cacheAgeSeconds: number;
}

function decodeXmlText(raw: string): string {
  let text = raw.trim();
  const cdata = text.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) text = cdata[1];
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXmlText(match[1]) : null;
}

interface RawItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

function parseRssItems(xml: string): RawItem[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const items: RawItem[] = [];
  for (const block of blocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    if (!title || !link) continue;
    items.push({
      title,
      link,
      pubDate: extractTag(block, "pubDate") ?? "",
      description: extractTag(block, "description") ?? "",
    });
  }
  return items;
}

// We Work Remotely titles follow "Company: Job Title" — Jobicy's don't, so
// company stays null there rather than guessing wrong.
function splitCompanyFromTitle(raw: string): { company: string | null; title: string } {
  const idx = raw.indexOf(": ");
  if (idx > 0 && idx < 80) {
    return { company: raw.slice(0, idx).trim(), title: raw.slice(idx + 2).trim() };
  }
  return { company: null, title: raw };
}

// Word-boundary matching, not plain substring — "ios" as a bare .includes()
// also matches inside "ratios"/"scenarios"/"portfolios", and "mobile" matches
// inside "automobile". Both showed up as false positives in a live test run.
function matchKeywords(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  return [...PRIMARY_KEYWORDS, ...SECONDARY_KEYWORDS].filter((kw) => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`).test(text);
  });
}

function isWithinWindow(pubDate: string, hours: number): boolean {
  const t = Date.parse(pubDate);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= hours * 60 * 60 * 1000;
}

async function fetchSource(source: FeedSource): Promise<MatchedJob[]> {
  const res = await fetch(source.url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
  });

  if (!res.ok) {
    throw new Error(`${source.label} feed returned HTTP ${res.status}`);
  }

  const xml = await res.text();
  const rawItems = parseRssItems(xml);
  if (rawItems.length === 0) {
    throw new Error(`${source.label} feed returned no parseable items — its format may have changed`);
  }

  const jobs: MatchedJob[] = [];
  for (const item of rawItems) {
    if (!isWithinWindow(item.pubDate, MATCH_WINDOW_HOURS)) continue;
    const matchedKeywords = matchKeywords(item.title, item.description);
    if (matchedKeywords.length === 0) continue;

    const { company, title } = splitCompanyFromTitle(item.title);
    const parsedDate = new Date(item.pubDate);
    jobs.push({
      title,
      company,
      link: item.link,
      pubDate: Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
      sourceLabel: source.label,
      matchedKeywords,
    });
  }
  return jobs;
}

async function fetchAndBuildResult(): Promise<RecentJobsResult> {
  const settled = await Promise.allSettled(SOURCES.map((s) => fetchSource(s)));

  const jobs: MatchedJob[] = [];
  const sourceErrors: SourceError[] = [];

  settled.forEach((outcome, i) => {
    const source = SOURCES[i];
    if (outcome.status === "fulfilled") {
      jobs.push(...outcome.value);
    } else {
      const message = outcome.reason?.message ?? "Unknown error";
      // Collapse duplicate errors from the same source (WWR has 2 feed URLs).
      if (!sourceErrors.some((e) => e.source === source.label && e.message === message)) {
        sourceErrors.push({ source: source.label, message });
      }
    }
  });

  jobs.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));

  return {
    jobs: jobs.slice(0, MAX_RESULTS),
    sourcesQueried: [...new Set(SOURCES.map((s) => s.label))],
    sourceErrors,
    fetchedAt: new Date().toISOString(),
    cacheAgeSeconds: 0,
  };
}

let cache: { result: RecentJobsResult; fetchedAtMs: number } | null = null;

export async function getRecentMatchedJobs(forceRefresh = false): Promise<RecentJobsResult> {
  if (!forceRefresh && cache && Date.now() - cache.fetchedAtMs < CACHE_TTL_MS) {
    return { ...cache.result, cacheAgeSeconds: Math.round((Date.now() - cache.fetchedAtMs) / 1000) };
  }
  const result = await fetchAndBuildResult();
  cache = { result, fetchedAtMs: Date.now() };
  return result;
}
