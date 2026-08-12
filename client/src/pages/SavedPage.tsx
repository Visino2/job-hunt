import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import {
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  ErrorText,
  Field,
  LoadingSpinner,
  Skeleton,
  Textarea,
} from '../components/ui'
import type { BadgeColor } from '../components/ui'
import { downloadTextAsPdf } from '../lib/pdf'
import type { ApplicationRecord, ApplicationStatus, ApplicationSummary } from '../types'

const STATUS_OPTIONS: ApplicationStatus[] = ['draft', 'applied', 'interviewing', 'rejected', 'offer']

type SortMode = 'updated' | 'stale'

const FOLLOW_UP_STATUSES: ApplicationStatus[] = ['applied', 'interviewing']
const FOLLOW_UP_THRESHOLD_DAYS = 7

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

function formatDaysSince(iso: string): string {
  const days = daysSince(iso)
  if (days === 0) return 'Status changed today'
  if (days === 1) return '1 day since status change'
  return `${days} days since status change`
}

function isFollowUpDue(status: ApplicationStatus, statusUpdatedAt: string): boolean {
  return FOLLOW_UP_STATUSES.includes(status) && daysSince(statusUpdatedAt) > FOLLOW_UP_THRESHOLD_DAYS
}

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  draft: 'Draft',
  applied: 'Applied',
  interviewing: 'Interviewing',
  rejected: 'Rejected',
  offer: 'Offer',
}

const STATUS_BADGE_COLOR: Record<ApplicationStatus, BadgeColor> = {
  draft: 'neutral',
  applied: 'ink',
  interviewing: 'plum',
  rejected: 'brick',
  offer: 'forest',
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge color={STATUS_BADGE_COLOR[status]}>{STATUS_LABEL[status]}</Badge>
}

function InboxIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M3 7l2-3h14l2 3M3 7v11a2 2 0 002 2h14a2 2 0 002-2V7M3 7h18M8 11h8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CursorIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 3l14 7-6 2-2 6-6-15z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function SavedPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ApplicationSummary[]>([])
  const [sortMode, setSortMode] = useState<SortMode>('updated')
  const [selected, setSelected] = useState<ApplicationRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [prepStarting, setPrepStarting] = useState(false)

  const [notesDraft, setNotesDraft] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)
  const [notesSavedAt, setNotesSavedAt] = useState<number | null>(null)

  function refresh() {
    setLoading(true)
    api
      .listApplications()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(refresh, [])

  const sortedItems =
    sortMode === 'stale'
      ? [...items].sort((a, b) => daysSince(b.status_updated_at) - daysSince(a.status_updated_at))
      : items

  async function openItem(id: number) {
    setError(null)
    try {
      const record = await api.getApplication(id)
      setSelected(record)
      setNotesDraft(record.notes)
      setNotesError(null)
      setNotesSavedAt(null)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function saveNotes() {
    if (!selected) return
    setNotesSaving(true)
    setNotesError(null)
    try {
      const updated = await api.updateApplicationNotes(selected.id, notesDraft)
      setSelected({ ...selected, notes: updated.notes })
      setNotesSavedAt(Date.now())
    } catch (e: any) {
      setNotesError(e.message)
    } finally {
      setNotesSaving(false)
    }
  }

  async function deleteItem(id: number) {
    if (!confirm('Delete this saved application?')) return
    setDeleting(true)
    try {
      await api.deleteApplication(id)
      if (selected?.id === id) setSelected(null)
      refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  async function startInterviewPrep() {
    if (!selected || !selected.job_description.trim()) return
    setPrepStarting(true)
    setError(null)
    try {
      const session = await api.createInterviewSession({
        jobDescription: selected.job_description,
        applicationId: selected.id,
      })
      navigate('/interview', { state: { openSessionId: session.id } })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setPrepStarting(false)
    }
  }

  async function changeStatus(status: ApplicationStatus) {
    if (!selected) return
    setStatusSaving(true)
    setError(null)
    try {
      const updated = await api.updateApplicationStatus(selected.id, status)
      setSelected({ ...selected, status: updated.status, status_updated_at: updated.status_updated_at })
      refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setStatusSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 pb-16 lg:grid-cols-[320px_1fr]">
      <section className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Saved Applications</h1>
          <p className="mt-1 text-sm text-fg-muted">Every application you've tailored, tracked to offer.</p>
        </div>
        {error && <ErrorText>{error}</ErrorText>}

        {loading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-line bg-surface p-3">
                <Skeleton className="mb-2 h-4 w-3/4" />
                <Skeleton className="mb-2 h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <EmptyState
            icon={<InboxIcon />}
            title="Nothing saved yet"
            description="Tailor an application and save it to build your tracker here."
          />
        )}

        {!loading && items.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-fg-muted">Sort</span>
              <Button
                variant={sortMode === 'updated' ? 'primary' : 'secondary'}
                onClick={() => setSortMode('updated')}
                className="px-2.5 py-1 text-xs"
              >
                Recently updated
              </Button>
              <Button
                variant={sortMode === 'stale' ? 'primary' : 'secondary'}
                onClick={() => setSortMode('stale')}
                className="px-2.5 py-1 text-xs"
              >
                Days since update
              </Button>
            </div>

            <ul className="space-y-2">
              {sortedItems.map((item) => {
                const followUpDue = isFollowUpDue(item.status, item.status_updated_at)
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => openItem(item.id)}
                      className={`block w-full rounded-xl border px-3.5 py-3 text-left text-sm shadow-sm transition-colors duration-150 ${
                        selected?.id === item.id
                          ? 'border-ink-600 bg-ink-50'
                          : 'border-line bg-surface hover:border-line-strong'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-fg">{item.job_title || 'Untitled role'}</span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {followUpDue && <Badge color="ochre">Follow-up?</Badge>}
                          <StatusBadge status={item.status} />
                        </div>
                      </div>
                      <span className="block text-fg-muted">{item.company || 'Unknown company'}</span>
                      <div className="flex items-center gap-2 text-xs tabular-nums text-fg-subtle">
                        {item.match_score !== null && <span>Match: {item.match_score}/100</span>}
                        <span>{formatDaysSince(item.status_updated_at)}</span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <section>
        {!selected && (
          <EmptyState
            icon={<CursorIcon />}
            title="Select a saved application"
            description="Pick one from the list to view its drafts and update its status."
          />
        )}
        {selected && (
          <Card className="animate-fade-in space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-fg">{selected.job_title || 'Untitled role'}</h2>
                <p className="text-sm text-fg-muted">{selected.company}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="secondary"
                  loading={prepStarting}
                  disabled={!selected.job_description.trim()}
                  onClick={startInterviewPrep}
                  title={
                    selected.job_description.trim()
                      ? undefined
                      : 'No job description saved on this application'
                  }
                >
                  {prepStarting ? 'Starting…' : 'Start Interview Prep'}
                </Button>
                <Button variant="danger" loading={deleting} onClick={() => deleteItem(selected.id)}>
                  Delete
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-well px-3.5 py-2.5">
              <label className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-fg">Status</span>
                <select
                  className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-fg transition-colors focus:border-ink-600 focus:outline-none focus:ring-2 focus:ring-ink-100"
                  value={selected.status}
                  disabled={statusSaving}
                  onChange={(e) => changeStatus(e.target.value as ApplicationStatus)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <StatusBadge status={selected.status} />
              {isFollowUpDue(selected.status, selected.status_updated_at) && (
                <Badge color="ochre">Follow-up?</Badge>
              )}
              {statusSaving ? (
                <LoadingSpinner label="Saving…" />
              ) : (
                <span className="text-xs tabular-nums text-fg-subtle">
                  Updated {new Date(selected.status_updated_at).toLocaleString()} ·{' '}
                  {formatDaysSince(selected.status_updated_at)}
                </span>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Resume bullets</p>
                <CopyButton text={selected.resume_bullets} />
              </div>
              <pre className="max-w-prose whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg-muted">
                {selected.resume_bullets}
              </pre>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Cover letter</p>
                <div className="flex items-center gap-1.5">
                  <CopyButton text={selected.cover_letter} />
                  <Button
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    onClick={() =>
                      downloadTextAsPdf(
                        selected.cover_letter,
                        `${(selected.company || 'cover-letter').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-cover-letter.pdf`,
                      )
                    }
                  >
                    Download PDF
                  </Button>
                </div>
              </div>
              <pre className="max-w-prose whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg-muted">
                {selected.cover_letter}
              </pre>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Cold DM</p>
                <CopyButton text={selected.cold_dm} />
              </div>
              <pre className="max-w-prose whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg-muted">
                {selected.cold_dm}
              </pre>
            </div>

            <div>
              <Field label="Notes">
                <Textarea
                  className="h-28"
                  placeholder="Recruiter name, call times, salary discussed, anything not captured above…"
                  value={notesDraft}
                  onChange={(e) => {
                    setNotesDraft(e.target.value)
                    setNotesSavedAt(null)
                  }}
                />
              </Field>
              <div className="mt-2 flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={saveNotes}
                  loading={notesSaving}
                  disabled={notesDraft === selected.notes}
                >
                  {notesSaving ? 'Saving…' : 'Save notes'}
                </Button>
                {notesSavedAt && !notesSaving && (
                  <span className="animate-fade-in text-sm font-medium text-forest-700">Saved</span>
                )}
              </div>
              {notesError && (
                <div className="mt-2">
                  <ErrorText>{notesError}</ErrorText>
                </div>
              )}
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}
