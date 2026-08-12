import { useState } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

export function Button({
  variant = 'primary',
  className = '',
  children,
  loading = false,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-500 focus-visible:ring-offset-2'
  // Disabled states are their own explicit neutral treatment per variant,
  // not a blanket opacity — fading a solid brand color to 50% opacity reads
  // as broken (a washed-out, sickly version of the button) rather than
  // "intentionally inactive."
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-ink-600 text-white shadow-sm hover:bg-ink-700 active:bg-ink-800 disabled:bg-line-strong disabled:text-fg-subtle disabled:shadow-none disabled:hover:bg-line-strong',
    secondary:
      'border border-line-strong bg-surface text-fg hover:border-fg-subtle hover:bg-well disabled:border-line disabled:text-fg-subtle disabled:hover:bg-surface disabled:hover:border-line',
    danger:
      'border border-brick-100 bg-brick-50 text-brick-700 hover:bg-brick-100 disabled:border-line disabled:bg-well disabled:text-fg-subtle disabled:hover:bg-well',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading && (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface p-6 shadow-md ${className}`}>{children}</div>
}

export type BadgeColor = 'neutral' | 'ink' | 'plum' | 'forest' | 'ochre' | 'brick'

const BADGE_COLOR_CLASSES: Record<BadgeColor, string> = {
  neutral: 'bg-well text-fg-muted border-line',
  ink: 'bg-ink-50 text-ink-700 border-ink-100',
  plum: 'bg-plum-50 text-plum-700 border-plum-100',
  forest: 'bg-forest-50 text-forest-700 border-forest-100',
  ochre: 'bg-ochre-50 text-ochre-700 border-ochre-100',
  brick: 'bg-brick-50 text-brick-700 border-brick-100',
}

const BADGE_DOT_CLASSES: Record<BadgeColor, string> = {
  neutral: 'bg-fg-subtle',
  ink: 'bg-ink-600',
  plum: 'bg-plum-600',
  forest: 'bg-forest-600',
  ochre: 'bg-ochre-600',
  brick: 'bg-brick-600',
}

// dot=true for anything indicating STATE (match score, application status);
// dot=false for plain categorical labels (question type) — same distinction
// as the approved reference artifact.
export function Badge({
  children,
  color = 'neutral',
  dot = true,
}: {
  children: ReactNode
  color?: BadgeColor
  dot?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${BADGE_COLOR_CLASSES[color]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${BADGE_DOT_CLASSES[color]}`} aria-hidden="true" />}
      {children}
    </span>
  )
}

// role="status" + aria-live so screen readers announce loading state changes
// without the caller having to wire that up at every call site.
export function LoadingSpinner({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm text-fg-muted ${className}`} role="status" aria-live="polite">
      <svg className="h-4 w-4 animate-spin text-ink-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {label && <span>{label}</span>}
    </div>
  )
}

// Shimmering placeholder for list/content that's still loading from the
// server — used instead of a bare "Loading…" string.
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-shimmer rounded-md ${className}`} aria-hidden="true" />
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return <input className={`input ${className}`} {...rest} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props
  return <textarea className={`input ${className}`} {...rest} />
}

// Implicit label association (input nested inside <label>) — fully
// accessible without needing to manage matching id/htmlFor pairs.
export function Field({
  label,
  action,
  children,
}: {
  label: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-fg">{label}</span>
        {action}
      </span>
      {children}
    </label>
  )
}

// Copies fixed text to the clipboard and flips its own label to "Copied"
// briefly — self-contained so callers don't need to manage the timeout.
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API can be denied/unavailable (permissions, non-secure
      // context) — fail silently rather than surface an alarming error for
      // what's a minor convenience action.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded-md border border-line-strong bg-surface px-2 py-1 text-xs font-medium text-fg-muted transition-colors duration-150 hover:bg-well hover:text-fg"
    >
      {copied ? 'Copied' : label}
    </button>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p
      className="flex items-start gap-2 rounded-lg border border-brick-100 bg-brick-50 px-3 py-2.5 text-sm text-brick-700"
      role="alert"
    >
      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.28 11.18c.75 1.334-.213 2.987-1.744 2.987H3.72c-1.53 0-2.493-1.653-1.743-2.987l6.28-11.18zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <span>{children}</span>
    </p>
  )
}

// Designed placeholder for "nothing here yet" — an icon, a short title, a
// helper sentence, and an optional next action, instead of a bare sentence
// sitting alone on the page.
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      {icon && (
        <div className="text-fg-subtle" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-fg">{title}</p>
        {description && <p className="text-sm text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
