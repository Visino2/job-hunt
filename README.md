# Job Hunt Assistant

A local, personal job-hunting assistant. Phase 1 (Application Tailoring Tool) is implemented.

## Stack

- `server/` — Node.js + TypeScript + Express + SQLite (`better-sqlite3`), wraps the Claude API
- `client/` — React + TypeScript + Tailwind (Vite)

## Setup

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
# edit .env and add your ANTHROPIC_API_KEY (https://console.anthropic.com/settings/keys)
npm run seed   # loads your profile (currently hardcoded in src/services/profileSeed.ts) into SQLite
npm run dev    # starts on http://localhost:4000
```

The SQLite database lives at `server/data/job-hunt.sqlite` — nothing leaves your machine except calls to the Anthropic API.

### 2. Frontend

```bash
cd client
npm install
npm run dev    # starts on http://localhost:5173, proxies /api to :4000
```

Open http://localhost:5173.

## Using it

1. **Profile tab** — review/edit your stored profile (work history, shipped projects, skills, bios, rejection criteria, preferences). It's pre-seeded from the data you gave at setup; edit and hit "Save Profile" any time.
2. **Tailor tab** — paste a job description (or a URL — best-effort fetch, falls back to asking you to paste text if the page is JS-rendered) and hit "Analyze & Tailor". This calls Claude once to:
   - parse the JD into required skills / nice-to-haves / seniority / red flags (checked against your rejection criteria)
   - score your match against your real profile with honest strong points and gaps
   - draft resume bullets, a cover letter, and a cold-DM variant in your voice
3. Edit any of the generated drafts inline, fill in job title/company, and click **Save this version**.
4. **Saved tab** — browse and delete saved application drafts.

## Notes / limitations (Phase 1)

- No auth, no deployment — this is meant to run on `localhost` only.
- URL fetching is best-effort HTML-strip; JS-rendered job boards (e.g. some LinkedIn/Greenhouse pages) will fail — paste the text instead.
- `ANTHROPIC_API_KEY` is read from `server/.env`, never hardcoded or committed (`.env` is gitignored).

## Coming in later phases

- **Phase 2** — interview prep simulator (generate likely questions, run a mock interview chat loop with per-answer feedback).
- **Phase 3** — job discovery from RSS/public APIs, auto-scoring, auto-run Phase 1 tailoring above a threshold, and an email summary via SMTP/Nodemailer for your review. Never auto-applies.
