import { useState } from 'react'
import { api } from '../lib/api'
import { Badge, Button, Card, CopyButton, ErrorText, Field, Input, LoadingSpinner, Textarea } from '../components/ui'
import type { BadgeColor } from '../components/ui'
import RecentJobs from '../components/RecentJobs'
import { downloadTextAsPdf } from '../lib/pdf'
import type { RecentJob, TailorResponse } from '../types'

type InputMode = 'text' | 'url'

function scoreColor(score: number): BadgeColor {
  if (score >= 75) return 'forest'
  if (score >= 50) return 'ochre'
  return 'brick'
}

export default function TailorPage() {
  const [mode, setMode] = useState<InputMode>('text')
  const [jobDescription, setJobDescription] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TailorResponse | null>(null)

  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [resumeBullets, setResumeBullets] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [coldDm, setColdDm] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  async function handleAnalyze() {
    setLoading(true)
    setError(null)
    setResult(null)
    setSavedMessage(null)
    setJobTitle('')
    setCompany('')
    try {
      const res = await api.tailor(
        mode === 'text' ? { jobDescription } : { jobUrl },
      )
      setResult(res)
      setResumeBullets(res.drafts.resume_bullets.join('\n'))
      setCoverLetter(res.drafts.cover_letter)
      setColdDm(res.drafts.cold_dm)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleTailorFromRecent(job: RecentJob) {
    setMode('url')
    setJobUrl(job.link)
    setJobTitle(job.title)
    setCompany(job.company ?? '')
    setResult(null)
    setError(null)
    setSavedMessage(null)
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)
    setSavedMessage(null)
    try {
      await api.createApplication({
        job_title: jobTitle,
        company,
        job_url: mode === 'url' ? jobUrl : '',
        job_description: result.jobDescription,
        parsed: result.parsed,
        match_score: result.match.score,
        match_notes: {
          strong_points: result.match.strong_points,
          gaps: result.match.gaps,
          bridging_notes: result.match.bridging_notes,
        },
        resume_bullets: resumeBullets,
        cover_letter: coverLetter,
        cold_dm: coldDm,
        status: 'draft',
      })
      setSavedMessage('Saved. Find it under the Saved tab.')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Tailor an Application</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Paste a job description and get an honest match score, real gaps, and a draft in your own voice.
        </p>
      </div>

      <RecentJobs onTailor={handleTailorFromRecent} />

      <Card className="space-y-4">
        <div className="flex gap-2">
          <Button variant={mode === 'text' ? 'primary' : 'secondary'} onClick={() => setMode('text')}>
            Paste text
          </Button>
          <Button variant={mode === 'url' ? 'primary' : 'secondary'} onClick={() => setMode('url')}>
            From URL
          </Button>
        </div>

        {mode === 'text' ? (
          <Field label="Job description">
            <Textarea
              className="h-48"
              placeholder="Paste the full job description here…"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </Field>
        ) : (
          <Field label="Job posting URL">
            <Input placeholder="https://…" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} />
          </Field>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleAnalyze}
            disabled={loading || (mode === 'text' ? !jobDescription.trim() : !jobUrl.trim())}
          >
            {loading ? 'Analyzing…' : 'Analyze & Tailor'}
          </Button>
          {loading && <LoadingSpinner label="Parsing the job description and scoring your match…" />}
        </div>

        {error && <ErrorText>{error}</ErrorText>}
      </Card>

      {result && (
        <div className="animate-fade-in space-y-6">
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-fg">{result.parsed.role_summary}</h2>
                <p className="mt-0.5 text-sm text-fg-muted">Seniority: {result.parsed.seniority_level}</p>
              </div>
              <Badge color={scoreColor(result.match.score)}>{result.match.score}/100 match</Badge>
            </div>

            {result.parsed.red_flags.length > 0 && (
              <div className="rounded-lg border border-brick-100 bg-brick-50 p-4">
                <p className="text-sm font-semibold text-brick-700">Red flags</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-brick-700">
                  {result.parsed.red_flags.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-fg">Required skills</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-fg-muted">
                  {result.parsed.required_skills.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-fg">Nice-to-haves</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-fg-muted">
                  {result.parsed.nice_to_haves.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-fg-muted">
              Honest Match Notes
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-forest-700">Where you're strong</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-fg-muted">
                  {result.match.strong_points.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-ochre-700">Gaps &amp; bridging sentences</p>
                <ul className="mt-1.5 space-y-2.5 text-sm text-fg-muted">
                  {result.match.gaps.map((g, i) => (
                    <li key={i}>
                      <span className="font-medium text-fg">{g}</span>
                      {result.match.bridging_notes[i] && (
                        <p className="mt-0.5 text-fg-subtle">→ {result.match.bridging_notes[i]}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
              Drafts (edit freely before saving)
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Job title">
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </Field>
              <Field label="Company">
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
              </Field>
            </div>

            <Field label="Resume bullets (one per line)" action={<CopyButton text={resumeBullets} />}>
              <Textarea className="h-32" value={resumeBullets} onChange={(e) => setResumeBullets(e.target.value)} />
            </Field>

            <Field
              label="Cover letter"
              action={
                <div className="flex items-center gap-1.5">
                  <CopyButton text={coverLetter} />
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    onClick={() =>
                      downloadTextAsPdf(
                        coverLetter,
                        `${(company || 'cover-letter').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-cover-letter.pdf`,
                      )
                    }
                  >
                    Download PDF
                  </Button>
                </div>
              }
            >
              <Textarea className="h-56" value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
            </Field>

            <Field label="Cold DM variant" action={<CopyButton text={coldDm} />}>
              <Textarea className="h-24" value={coldDm} onChange={(e) => setColdDm(e.target.value)} />
            </Field>

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} loading={saving}>
                {saving ? 'Saving…' : 'Save this version'}
              </Button>
              {savedMessage && (
                <span className="animate-fade-in text-sm font-medium text-forest-700">{savedMessage}</span>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
