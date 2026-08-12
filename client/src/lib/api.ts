import { clearStoredPassword, getStoredPassword } from './auth'
import type {
  ApplicationRecord,
  ApplicationStatus,
  ApplicationSummary,
  FullProfile,
  InterviewQuestion,
  InterviewSession,
  InterviewSessionSummary,
  RecentJobsResponse,
  TailorResponse,
} from '../types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const stored = getStoredPassword()
  const res = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(stored ? { 'x-app-password': stored } : {}),
    },
    ...init,
  })
  if (res.status === 401) {
    // Stored password is stale/wrong (or the deployed app password
    // rotated) — clear it and reload so LoginGate re-prompts, rather than
    // limping along with a confusing string of failed requests.
    clearStoredPassword()
    window.location.reload()
    throw new Error('Session expired. Reloading…')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  getProfile: () => request<FullProfile>('/profile'),
  saveProfile: (profile: FullProfile) =>
    request<FullProfile>('/profile', { method: 'PUT', body: JSON.stringify(profile) }),

  tailor: (input: { jobDescription?: string; jobUrl?: string }) =>
    request<TailorResponse>('/tailor', { method: 'POST', body: JSON.stringify(input) }),

  listApplications: () => request<ApplicationSummary[]>('/applications'),
  getApplication: (id: number) => request<ApplicationRecord>(`/applications/${id}`),
  createApplication: (record: Partial<ApplicationRecord>) =>
    request<ApplicationRecord>('/applications', { method: 'POST', body: JSON.stringify(record) }),
  updateApplication: (id: number, record: Partial<ApplicationRecord>) =>
    request<ApplicationRecord>(`/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(record),
    }),
  deleteApplication: (id: number) =>
    request<void>(`/applications/${id}`, { method: 'DELETE' }),
  updateApplicationStatus: (id: number, status: ApplicationStatus) =>
    request<ApplicationRecord>(`/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  updateApplicationNotes: (id: number, notes: string) =>
    request<ApplicationRecord>(`/applications/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),

  listInterviewSessions: () => request<InterviewSessionSummary[]>('/interview/sessions'),
  getInterviewSession: (id: number) => request<InterviewSession>(`/interview/sessions/${id}`),
  createInterviewSession: (input: { jobDescription?: string; jobUrl?: string; applicationId?: number }) =>
    request<InterviewSession>('/interview/sessions', { method: 'POST', body: JSON.stringify(input) }),
  submitInterviewAnswer: (questionId: number, answer: string) =>
    request<InterviewQuestion>(`/interview/questions/${questionId}/answer`, {
      method: 'PATCH',
      body: JSON.stringify({ answer }),
    }),

  getRecentJobs: (refresh?: boolean) =>
    request<RecentJobsResponse>(`/jobs/recent${refresh ? '?refresh=1' : ''}`),
}
