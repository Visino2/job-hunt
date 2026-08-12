import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Badge, Button, Card, ErrorText, LoadingSpinner, Skeleton } from '../components/ui'
import type { RecentJob, RecentJobsResponse } from '../types'

const PRIMARY_KEYWORDS = new Set(['react native', 'flutter'])

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  const minutes = Math.round(ms / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function formatCacheAge(seconds: number): string {
  if (seconds < 60) return 'updated just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `updated ${minutes}m ago`
  return `updated ${Math.round(minutes / 60)}h ago`
}

function JobRow({ job, onTailor }: { job: RecentJob; onTailor: (job: RecentJob) => void }) {
  return (
    <div className="rounded-lg border border-line bg-well p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={job.link}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-fg hover:text-ink-700 hover:underline"
          >
            {job.title}
          </a>
          <p className="mt-0.5 text-sm text-fg-muted">
            {job.company ?? 'Unknown company'} · {job.sourceLabel} · {formatRelativeTime(job.pubDate)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.matchedKeywords.map((kw) => (
              <Badge key={kw} color={PRIMARY_KEYWORDS.has(kw) ? 'ink' : 'neutral'} dot={false}>
                {kw}
              </Badge>
            ))}
          </div>
        </div>
        <Button variant="secondary" onClick={() => onTailor(job)} className="shrink-0">
          Tailor this
        </Button>
      </div>
    </div>
  )
}

export default function RecentJobs({ onTailor }: { onTailor: (job: RecentJob) => void }) {
  const [data, setData] = useState<RecentJobsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load(refresh = false) {
    setLoading(true)
    setError(null)
    api
      .getRecentJobs(refresh)
      .then(setData)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const coverageNote =
    data && data.sourcesQueried.length > 0
      ? `Showing results from ${data.sourcesQueried.join(' and ')}. For broader coverage, search LinkedIn/Wellfound manually.`
      : null

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
            Recent Matches (last 24h)
          </h2>
          {data && !loading && (
            <p className="mt-0.5 text-xs text-fg-subtle">{formatCacheAge(data.cacheAgeSeconds)}</p>
          )}
        </div>
        <Button variant="secondary" onClick={() => load(true)} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {coverageNote && <p className="text-xs text-fg-subtle">{coverageNote}</p>}

      {loading && !data && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-line bg-well p-4">
              <Skeleton className="mb-2 h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      )}

      {loading && data && <LoadingSpinner label="Refreshing…" />}

      {error && <ErrorText>{error}</ErrorText>}

      {data && data.sourceErrors.length > 0 && (
        <div className="rounded-lg border border-ochre-100 bg-ochre-50 p-3 text-sm text-ochre-700">
          <p className="font-semibold">Some sources didn't respond:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {data.sourceErrors.map((e, i) => (
              <li key={i}>
                {e.source}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data && !loading && data.jobs.length === 0 && data.sourceErrors.length < data.sourcesQueried.length && (
        <p className="text-sm text-fg-muted">
          No React Native / Flutter / mobile listings matched in the last 24 hours. That's normal, these feeds
          run low volume for this stack most days. Try refreshing later, or search LinkedIn/Wellfound manually.
        </p>
      )}

      {data && data.jobs.length > 0 && (
        <div className="space-y-2">
          {data.jobs.map((job) => (
            <JobRow key={job.link} job={job} onTailor={onTailor} />
          ))}
        </div>
      )}
    </Card>
  )
}
