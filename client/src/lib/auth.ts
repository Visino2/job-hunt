// Single shared-password gate — no per-user accounts, since this app has
// exactly one intended user. No-ops entirely when the deployed server
// hasn't set APP_PASSWORD (local dev is unaffected).
const STORAGE_KEY = 'jha_app_password'

export function getStoredPassword(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setStoredPassword(password: string) {
  localStorage.setItem(STORAGE_KEY, password)
}

export function clearStoredPassword() {
  localStorage.removeItem(STORAGE_KEY)
}
