import { useEffect, useState, type ReactNode } from 'react'
import { Button, Card, ErrorText, Field, Input, LoadingSpinner } from './ui'
import { getStoredPassword, setStoredPassword } from '../lib/auth'

// Wraps the whole app. Checks the server once on load: if it hasn't set
// APP_PASSWORD (normal local dev), renders children immediately with no
// prompt at all. If it has, shows a one-field password form until a
// correct password is entered — no accounts, no sessions beyond localStorage.
export default function LoginGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'open' | 'locked' | 'unlocked'>('checking')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data: { authRequired: boolean }) => {
        if (!data.authRequired) {
          setStatus('open')
          return
        }
        // A stored password from a previous visit is trusted optimistically
        // here — if it's actually stale, the first real API call will 401
        // and api.ts's request() handles bouncing back to this screen.
        setStatus(getStoredPassword() ? 'unlocked' : 'locked')
      })
      .catch(() => setStatus('open')) // can't reach the server at all — let the rest of the app surface that error normally
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        setError('Incorrect password.')
        return
      }
      setStoredPassword(password)
      setStatus('unlocked')
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <LoadingSpinner label="Loading…" />
      </div>
    )
  }

  if (status === 'open' || status === 'unlocked') {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <Card className="w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-fg">Job Hunt Assistant</h1>
          <p className="mt-1 text-sm text-fg-muted">Enter the password to continue.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Password">
            <Input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" className="w-full" loading={submitting} disabled={!password}>
            {submitting ? 'Checking…' : 'Continue'}
          </Button>
          {error && <ErrorText>{error}</ErrorText>}
        </form>
      </Card>
    </div>
  )
}
