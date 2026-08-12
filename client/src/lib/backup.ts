import { getStoredPassword } from './auth'

// Fetches the full data export and saves it as a local JSON file via a
// throwaway object URL + anchor click — no server-side file writing needed.
export async function downloadBackup() {
  const stored = getStoredPassword()
  const res = await fetch('/api/export', {
    headers: stored ? { 'x-app-password': stored } : {},
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Export failed: ${res.status}`)
  }
  const text = await res.text()
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const date = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `job-hunt-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
