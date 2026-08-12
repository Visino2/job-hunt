import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { Button, Card, ErrorText, Field, Skeleton } from '../components/ui'
import { downloadBackup } from '../lib/backup'
import type { FullProfile } from '../types'

const emptyProfile: FullProfile = {
  name: '',
  location: '',
  title: '',
  education: {},
  stack: { core: [], also: [] },
  other_experience: [],
  shipped_projects: [],
  work_history: [],
  contact: { phone: '', email: '', linkedin: '', github: '', portfolio: '' },
  bios: { short: '', medium: '', long: '' },
  rejection_criteria: [],
  preferences: [],
}

function listToText(items: string[]): string {
  return items.join('\n')
}
function textToList(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function stackToText(items: string[]): string {
  return items.join(', ')
}
function textToStack(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <Skeleton className="mb-4 h-3 w-32" />
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<FullProfile>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backingUp, setBackingUp] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getProfile()
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const updated = await api.saveProfile(profile)
      setProfile(updated)
      setSavedAt(new Date().toLocaleTimeString())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleBackup() {
    setBackingUp(true)
    setBackupError(null)
    try {
      await downloadBackup()
    } catch (e: any) {
      setBackupError(e.message)
    } finally {
      setBackingUp(false)
    }
  }

  function updateProject(index: number, patch: Partial<FullProfile['shipped_projects'][number]>) {
    setProfile((p) => ({
      ...p,
      shipped_projects: p.shipped_projects.map((proj, i) =>
        i === index ? { ...proj, ...patch } : proj,
      ),
    }))
  }

  function addProject() {
    setProfile((p) => ({
      ...p,
      shipped_projects: [...p.shipped_projects, { name: '', description: '', stack: [], highlights: [] }],
    }))
  }

  function removeProject(index: number) {
    setProfile((p) => ({
      ...p,
      shipped_projects: p.shipped_projects.filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Your Profile</h1>
          <p className="mt-1 text-sm text-fg-muted">
            The source every draft pulls from. Keep it accurate and it keeps your applications honest.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && <span className="animate-fade-in text-sm text-fg-muted">Saved at {savedAt}</span>}
          <Button onClick={handleSave} loading={saving} disabled={loading}>
            {saving ? 'Saving…' : 'Save Profile'}
          </Button>
        </div>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {loading ? (
        <ProfileSkeleton />
      ) : (
        <div className="animate-fade-in space-y-6">
          <Section title="Data & Backups">
            <div className="flex items-center justify-between gap-4">
              <p className="max-w-prose text-sm text-fg-muted">
                Download everything this app holds (profile, saved applications, interview prep history) as one
                JSON file. The server also keeps its own automatic timestamped backups on every restart, but
                those live only on this machine.
              </p>
              <Button variant="secondary" loading={backingUp} onClick={handleBackup} className="shrink-0">
                {backingUp ? 'Preparing…' : 'Download backup (JSON)'}
              </Button>
            </div>
            {backupError && (
              <div className="mt-3">
                <ErrorText>{backupError}</ErrorText>
              </div>
            )}
          </Section>

          <Section title="Basics">
            <Field label="Name">
              <input
                className="input"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </Field>
            <Field label="Location">
              <input
                className="input"
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              />
            </Field>
            <Field label="Title">
              <input
                className="input"
                value={profile.title}
                onChange={(e) => setProfile({ ...profile, title: e.target.value })}
              />
            </Field>
          </Section>

          <Section title="Contact">
            <Field label="Phone">
              <input
                className="input"
                value={profile.contact.phone}
                onChange={(e) => setProfile({ ...profile, contact: { ...profile.contact, phone: e.target.value } })}
              />
            </Field>
            <Field label="Email">
              <input
                className="input"
                value={profile.contact.email}
                onChange={(e) => setProfile({ ...profile, contact: { ...profile.contact, email: e.target.value } })}
              />
            </Field>
            <Field label="LinkedIn">
              <input
                className="input"
                value={profile.contact.linkedin}
                onChange={(e) => setProfile({ ...profile, contact: { ...profile.contact, linkedin: e.target.value } })}
              />
            </Field>
            <Field label="GitHub">
              <input
                className="input"
                value={profile.contact.github}
                onChange={(e) => setProfile({ ...profile, contact: { ...profile.contact, github: e.target.value } })}
              />
            </Field>
            <Field label="Portfolio">
              <input
                className="input"
                value={profile.contact.portfolio}
                onChange={(e) =>
                  setProfile({ ...profile, contact: { ...profile.contact, portfolio: e.target.value } })
                }
              />
            </Field>
          </Section>

          <Section title="Education">
            <Field label="Degree">
              <input
                className="input"
                value={profile.education.degree ?? ''}
                onChange={(e) =>
                  setProfile({ ...profile, education: { ...profile.education, degree: e.target.value } })
                }
              />
            </Field>
            <Field label="Institution">
              <input
                className="input"
                value={profile.education.institution ?? ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    education: { ...profile.education, institution: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Note (e.g. unrelated to current field)">
              <input
                className="input"
                value={profile.education.note ?? ''}
                onChange={(e) =>
                  setProfile({ ...profile, education: { ...profile.education, note: e.target.value } })
                }
              />
            </Field>
          </Section>

          <Section title="Stack">
            <Field label="Core skills (one per line)">
              <textarea
                className="input h-24"
                value={listToText(profile.stack.core)}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    stack: { ...profile.stack, core: textToList(e.target.value) },
                  })
                }
              />
            </Field>
            <Field label="Also comfortable with (one per line)">
              <textarea
                className="input h-24"
                value={listToText(profile.stack.also)}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    stack: { ...profile.stack, also: textToList(e.target.value) },
                  })
                }
              />
            </Field>
            <Field label="Other experience (one per line)">
              <textarea
                className="input h-24"
                value={listToText(profile.other_experience)}
                onChange={(e) => setProfile({ ...profile, other_experience: textToList(e.target.value) })}
              />
            </Field>
          </Section>

          <Section title="Work History">
            <Field label="One entry per line">
              <textarea
                className="input h-28"
                value={listToText(profile.work_history)}
                onChange={(e) => setProfile({ ...profile, work_history: textToList(e.target.value) })}
              />
            </Field>
          </Section>

          <Section title="Shipped Projects">
            <div className="space-y-4">
              {profile.shipped_projects.map((proj, i) => (
                <div key={i} className="space-y-3 rounded-lg border border-line bg-well p-4">
                  <div className="flex justify-between gap-3">
                    <input
                      className="input font-semibold"
                      placeholder="Project name"
                      value={proj.name}
                      onChange={(e) => updateProject(i, { name: e.target.value })}
                    />
                    <Button variant="danger" className="shrink-0" onClick={() => removeProject(i)}>
                      Remove
                    </Button>
                  </div>
                  <input
                    className="input"
                    placeholder="Description"
                    value={proj.description}
                    onChange={(e) => updateProject(i, { description: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Stack (comma-separated, e.g. Flutter, Hive)"
                    value={stackToText(proj.stack)}
                    onChange={(e) => updateProject(i, { stack: textToStack(e.target.value) })}
                  />
                  <textarea
                    className="input h-20"
                    placeholder="Highlights, one per line"
                    value={listToText(proj.highlights)}
                    onChange={(e) => updateProject(i, { highlights: textToList(e.target.value) })}
                  />
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={addProject}
                className="border-dashed bg-transparent hover:bg-well"
              >
                + Add project
              </Button>
            </div>
          </Section>

          <Section title="Bios (used as style reference for generated drafts)">
            <Field label="Short">
              <textarea
                className="input h-20"
                value={profile.bios.short}
                onChange={(e) => setProfile({ ...profile, bios: { ...profile.bios, short: e.target.value } })}
              />
            </Field>
            <Field label="Medium">
              <textarea
                className="input h-28"
                value={profile.bios.medium}
                onChange={(e) => setProfile({ ...profile, bios: { ...profile.bios, medium: e.target.value } })}
              />
            </Field>
            <Field label="Long">
              <textarea
                className="input h-40"
                value={profile.bios.long}
                onChange={(e) => setProfile({ ...profile, bios: { ...profile.bios, long: e.target.value } })}
              />
            </Field>
          </Section>

          <Section title="Rejection Criteria (roles to flag/avoid)">
            <Field label="One per line">
              <textarea
                className="input h-24"
                value={listToText(profile.rejection_criteria)}
                onChange={(e) => setProfile({ ...profile, rejection_criteria: textToList(e.target.value) })}
              />
            </Field>
          </Section>

          <Section title="Preferences">
            <Field label="One per line">
              <textarea
                className="input h-24"
                value={listToText(profile.preferences)}
                onChange={(e) => setProfile({ ...profile, preferences: textToList(e.target.value) })}
              />
            </Field>
          </Section>

          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving}>
              {saving ? 'Saving…' : 'Save Profile'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-fg-muted">{title}</h2>
      <div className="space-y-4">{children}</div>
    </Card>
  )
}
