import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { Badge, Button, Card, EmptyState, ErrorText, Field, Input, LoadingSpinner, Skeleton, Textarea } from '../components/ui'
import type {
  ApplicationSummary,
  InterviewFeedback,
  InterviewQuestion,
  InterviewQuestionType,
  InterviewSession,
  InterviewSessionSummary,
} from '../types'

type InputMode = 'text' | 'url'
type ViewMode = 'new' | 'active' | 'review'

// Soft pacing target per question, not a hard cutoff — mirrors the pressure
// of a real spoken interview without blocking a late submission.
const QUESTION_SECONDS = 120

function QuestionTimer({ secondsLeft }: { secondsLeft: number }) {
  const expired = secondsLeft <= 0
  const low = secondsLeft <= 20 && !expired
  const mm = Math.floor(Math.max(secondsLeft, 0) / 60)
  const ss = Math.max(secondsLeft, 0) % 60
  const color = expired ? 'text-brick-700' : low ? 'text-ochre-700' : 'text-fg-subtle'
  return (
    <span
      className={`text-xs font-semibold tabular-nums ${color}`}
      title="Soft timer. You can still submit after it runs out."
    >
      {expired ? "Time's up, wrap it up" : `${mm}:${ss.toString().padStart(2, '0')}`}
    </span>
  )
}

function ChatIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M21 12a8 8 0 11-3.6-6.66M21 12l-3-1-1 3-3-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 20l1.6-4A8 8 0 0121 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function QuestionBlock({
  index,
  question,
  type,
}: {
  index: number
  question: string
  type: InterviewQuestionType
}) {
  return (
    <div className="rounded-lg border border-line bg-well p-4">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-xs font-semibold text-fg-muted">Q{index + 1}</span>
        <Badge color={type === 'technical' ? 'ink' : 'plum'} dot={false}>
          {type === 'technical' ? 'Technical' : 'Behavioral'}
        </Badge>
      </div>
      <p className="max-w-prose text-sm leading-relaxed text-fg">{question}</p>
    </div>
  )
}

function AnswerBlock({ answer }: { answer: string }) {
  return (
    <div className="ml-4 rounded-lg border border-ink-100 bg-ink-50 p-4">
      <p className="mb-1 text-xs font-semibold text-ink-700">Your answer</p>
      <p className="max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-fg">{answer}</p>
    </div>
  )
}

function FeedbackBlock({ feedback }: { feedback: InterviewFeedback }) {
  return (
    <div className="ml-4 space-y-3 rounded-lg border border-line bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Feedback</p>
      {feedback.strong_points.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-forest-700">Strong</p>
          <ul className="mt-1 max-w-prose list-disc space-y-0.5 pl-5 text-sm text-fg-muted">
            {feedback.strong_points.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {feedback.vague_or_weak_points.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-ochre-700">Vague / weak</p>
          <ul className="mt-1 max-w-prose list-disc space-y-0.5 pl-5 text-sm text-fg-muted">
            {feedback.vague_or_weak_points.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {feedback.what_a_stronger_answer_includes.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-fg">A stronger answer would include</p>
          <ul className="mt-1 max-w-prose list-disc space-y-0.5 pl-5 text-sm text-fg-muted">
            {feedback.what_a_stronger_answer_includes.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {feedback.overall_note && (
        <p className="max-w-prose border-t border-line pt-3 text-sm italic text-fg-muted">{feedback.overall_note}</p>
      )}
    </div>
  )
}

// Renders one already-answered question: normally the answer + feedback with
// an "Edit answer" action, or — while this specific question is the one being
// edited — an inline form in its place. Used by both the in-progress history
// slice (active mode) and the read-only-except-editable past session view
// (review mode), so editing behaves identically in both places.
function AnsweredQuestionCard({
  index,
  q,
  isEditing,
  editText,
  editSubmitting,
  editError,
  onStartEdit,
  onChangeEditText,
  onCancelEdit,
  onSubmitEdit,
}: {
  index: number
  q: InterviewQuestion
  isEditing: boolean
  editText: string
  editSubmitting: boolean
  editError: string | null
  onStartEdit: () => void
  onChangeEditText: (text: string) => void
  onCancelEdit: () => void
  onSubmitEdit: () => void
}) {
  return (
    <div className="animate-fade-in space-y-2">
      <QuestionBlock index={index} question={q.question} type={q.type} />
      {isEditing ? (
        <Card className="ml-4 space-y-3">
          <Field label="Edit your answer">
            <Textarea className="h-32" value={editText} onChange={(e) => onChangeEditText(e.target.value)} />
          </Field>
          <div className="flex items-center gap-3">
            <Button onClick={onSubmitEdit} loading={editSubmitting} disabled={!editText.trim()}>
              {editSubmitting ? 'Getting feedback…' : 'Resubmit Answer'}
            </Button>
            <Button variant="secondary" onClick={onCancelEdit} disabled={editSubmitting}>
              Cancel
            </Button>
            {editSubmitting && <LoadingSpinner label="Evaluating your answer…" />}
          </div>
          {editError && <ErrorText>{editError}</ErrorText>}
        </Card>
      ) : (
        <>
          {q.answer && <AnswerBlock answer={q.answer} />}
          {q.feedback && <FeedbackBlock feedback={q.feedback} />}
          <div className="ml-4">
            <Button variant="secondary" onClick={onStartEdit}>
              Edit answer
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default function InterviewPrepPage() {
  const location = useLocation()
  const [sessions, setSessions] = useState<InterviewSessionSummary[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [applications, setApplications] = useState<ApplicationSummary[]>([])
  const [mode, setMode] = useState<ViewMode>('new')
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS)

  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [jobDescription, setJobDescription] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [linkedApplicationId, setLinkedApplicationId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const [answerText, setAnswerText] = useState('')
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [answerError, setAnswerError] = useState<string | null>(null)

  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null)
  const [editAnswerText, setEditAnswerText] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [addingToNotes, setAddingToNotes] = useState(false)
  const [addToNotesMessage, setAddToNotesMessage] = useState<string | null>(null)

  function refreshSessions() {
    setSessionsLoading(true)
    api
      .listInterviewSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setSessionsLoading(false))
  }

  useEffect(() => {
    refreshSessions()
    api.listApplications().then(setApplications).catch(() => {})
  }, [])

  // Resets on every new question so the countdown always starts fresh —
  // keyed on the session id too, since a freshly generated session and a
  // resumed one can both land on currentIndex 0.
  useEffect(() => {
    if (mode !== 'active' || !activeSession) return
    if (currentIndex >= activeSession.questions.length) return
    setSecondsLeft(QUESTION_SECONDS)
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [mode, activeSession?.id, currentIndex])

  function resetEditState() {
    setEditingQuestionId(null)
    setEditAnswerText('')
    setEditError(null)
  }

  function startNewSession() {
    setMode('new')
    setActiveSession(null)
    setCurrentIndex(0)
    setJobDescription('')
    setJobUrl('')
    setLinkedApplicationId('')
    setGenerateError(null)
    setAnswerText('')
    setAnswerError(null)
    resetEditState()
  }

  async function openPastSession(id: number) {
    setReviewLoading(true)
    setReviewError(null)
    try {
      const session = await api.getInterviewSession(id)
      setActiveSession(session)
      setAnswerText('')
      setAnswerError(null)
      setAddToNotesMessage(null)
      resetEditState()

      // Resume position is derived from persisted data every time, not
      // carried over in memory — the first question with no stored answer
      // is where the user left off. Fully-answered sessions have no such
      // question and fall through to the read-only summary.
      const firstUnanswered = session.questions.findIndex((q) => !q.answer)
      if (firstUnanswered === -1) {
        setMode('review')
      } else {
        setCurrentIndex(firstUnanswered)
        setMode('active')
      }
    } catch (e: any) {
      setReviewError(e.message)
    } finally {
      setReviewLoading(false)
    }
  }

  // Handoff from the Saved page's "Start Interview Prep" button, which
  // navigates here with the freshly created session id in router state.
  // Cleared from history immediately after so a later back/refresh doesn't
  // re-trigger it.
  useEffect(() => {
    const state = location.state as { openSessionId?: number } | null
    if (state?.openSessionId) {
      openPastSession(state.openSessionId)
      window.history.replaceState({}, '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  async function addTakeawaysToNotes() {
    if (!activeSession?.application_id) return
    const lines = activeSession.questions
      .map((q, i) => ({ i, note: q.feedback?.overall_note }))
      .filter((x): x is { i: number; note: string } => Boolean(x.note))
      .map((x) => `Q${x.i + 1}: ${x.note}`)
    if (lines.length === 0) return

    setAddingToNotes(true)
    setAddToNotesMessage(null)
    try {
      const app = await api.getApplication(activeSession.application_id)
      const block = `--- Interview prep takeaways (${new Date().toLocaleDateString()}) ---\n${lines.join('\n')}`
      const newNotes = app.notes ? `${app.notes}\n\n${block}` : block
      await api.updateApplicationNotes(activeSession.application_id, newNotes)
      setAddToNotesMessage('Added to application notes.')
    } catch (e: any) {
      setAddToNotesMessage(e.message)
    } finally {
      setAddingToNotes(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const session = await api.createInterviewSession({
        jobDescription: inputMode === 'text' ? jobDescription : undefined,
        jobUrl: inputMode === 'url' ? jobUrl : undefined,
        applicationId: linkedApplicationId ? Number(linkedApplicationId) : undefined,
      })
      setActiveSession(session)
      setCurrentIndex(0)
      setMode('active')
      resetEditState()
      refreshSessions()
    } catch (e: any) {
      setGenerateError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSubmitAnswer() {
    if (!activeSession) return
    const question = activeSession.questions[currentIndex]
    if (!question) return

    setSubmittingAnswer(true)
    setAnswerError(null)
    try {
      const updated = await api.submitInterviewAnswer(question.id, answerText)
      setActiveSession({
        ...activeSession,
        questions: activeSession.questions.map((q, i) => (i === currentIndex ? updated : q)),
      })
      setAnswerText('')
      setCurrentIndex((i) => i + 1)
      refreshSessions()
    } catch (e: any) {
      setAnswerError(e.message)
    } finally {
      setSubmittingAnswer(false)
    }
  }

  function handleEndSession() {
    refreshSessions()
    setAddToNotesMessage(null)
    setMode('review')
  }

  function startEditingAnswer(q: InterviewQuestion) {
    setEditingQuestionId(q.id)
    setEditAnswerText(q.answer ?? '')
    setEditError(null)
  }

  async function submitEditedAnswer() {
    if (!activeSession || editingQuestionId === null) return
    setEditSubmitting(true)
    setEditError(null)
    try {
      const updated = await api.submitInterviewAnswer(editingQuestionId, editAnswerText)
      setActiveSession({
        ...activeSession,
        questions: activeSession.questions.map((q) => (q.id === editingQuestionId ? updated : q)),
      })
      resetEditState()
      // Doesn't change the answered count (the question was already answered),
      // but keeps the sidebar's summary metadata consistent regardless.
      refreshSessions()
    } catch (e: any) {
      setEditError(e.message)
    } finally {
      setEditSubmitting(false)
    }
  }

  const generateDisabled =
    generating || (inputMode === 'text' ? !jobDescription.trim() : !jobUrl.trim())

  return (
    <div className="grid grid-cols-1 gap-6 pb-16 lg:grid-cols-[320px_1fr]">
      <section className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Interview Prep</h1>
          <p className="mt-1 text-sm text-fg-muted">Real questions, honest feedback, no fluff.</p>
        </div>
        <Button variant="secondary" className="w-full" onClick={startNewSession}>
          + New Session
        </Button>

        {reviewError && <ErrorText>{reviewError}</ErrorText>}

        {sessionsLoading && (
          <div className="space-y-2 pt-1">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-xl border border-line bg-surface p-3">
                <Skeleton className="mb-2 h-4 w-3/4" />
                <Skeleton className="mb-2 h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        )}

        {!sessionsLoading && sessions.length === 0 && (
          <div className="pt-1">
            <EmptyState
              icon={<ChatIcon />}
              title="No sessions yet"
              description="Paste a job description to generate your first set of practice questions."
            />
          </div>
        )}

        {!sessionsLoading && sessions.length > 0 && (
          <ul className="space-y-2 pt-1">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => openPastSession(s.id)}
                  disabled={reviewLoading}
                  className={`block w-full rounded-xl border px-3.5 py-3 text-left text-sm shadow-sm transition-colors duration-150 disabled:opacity-50 ${
                    activeSession?.id === s.id
                      ? 'border-ink-600 bg-ink-50'
                      : 'border-line bg-surface hover:border-line-strong'
                  }`}
                >
                  <span className="block font-semibold text-fg">{s.job_title || 'Untitled role'}</span>
                  <span className="block text-fg-muted">{s.company || 'Unknown company'}</span>
                  <span className="text-xs tabular-nums text-fg-subtle">
                    {s.answered_count}/{s.question_count} answered
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        {mode === 'new' && (
          <Card className="animate-fade-in space-y-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Generate questions for a role
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                One question at a time, with a soft timer, similar pacing to a live AI screen.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant={inputMode === 'text' ? 'primary' : 'secondary'}
                onClick={() => setInputMode('text')}
                type="button"
              >
                Paste text
              </Button>
              <Button
                variant={inputMode === 'url' ? 'primary' : 'secondary'}
                onClick={() => setInputMode('url')}
                type="button"
              >
                From URL
              </Button>
            </div>

            {inputMode === 'text' ? (
              <Field label="Job description">
                <Textarea
                  className="h-40"
                  placeholder="Paste the full job description here…"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </Field>
            ) : (
              <Field label="Job posting URL">
                <Input
                  placeholder="https://…"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                />
              </Field>
            )}

            <Field label="Link to a saved application (optional)">
              <select
                className="input"
                value={linkedApplicationId}
                onChange={(e) => setLinkedApplicationId(e.target.value)}
              >
                <option value="">None</option>
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.company || 'Unknown company'} ({a.job_title || 'Untitled role'})
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex items-center gap-3">
              <Button onClick={handleGenerate} loading={generating} disabled={generateDisabled}>
                {generating ? 'Generating…' : 'Generate Questions'}
              </Button>
              {generating && <LoadingSpinner label="This can take a few seconds…" />}
            </div>

            {generateError && <ErrorText>{generateError}</ErrorText>}
          </Card>
        )}

        {mode === 'active' && activeSession && (
          <div className="animate-fade-in space-y-4">
            <Card className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-fg">{activeSession.job_title || 'Untitled role'}</h2>
                <p className="text-sm text-fg-muted">{activeSession.company}</p>
              </div>
              <Button variant="secondary" onClick={handleEndSession}>
                End session
              </Button>
            </Card>

            {currentIndex < activeSession.questions.length ? (
              <Card className="animate-fade-in space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    Question {currentIndex + 1} of {activeSession.questions.length}
                  </span>
                  <QuestionTimer secondsLeft={secondsLeft} />
                </div>
                <QuestionBlock
                  index={currentIndex}
                  question={activeSession.questions[currentIndex].question}
                  type={activeSession.questions[currentIndex].type}
                />
                <Field label="Your answer">
                  <Textarea
                    className="h-32"
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Type your answer as you'd say it out loud…"
                  />
                </Field>
                <div className="flex items-center gap-3">
                  <Button onClick={handleSubmitAnswer} loading={submittingAnswer} disabled={!answerText.trim()}>
                    {submittingAnswer ? 'Getting feedback…' : 'Submit Answer'}
                  </Button>
                  {submittingAnswer && <LoadingSpinner label="Evaluating your answer…" />}
                </div>
                {answerError && <ErrorText>{answerError}</ErrorText>}
              </Card>
            ) : (
              <Card className="animate-fade-in space-y-3 text-center">
                <p className="font-semibold text-fg">Session complete. No more questions.</p>
                <Button variant="secondary" onClick={handleEndSession}>
                  Done
                </Button>
              </Card>
            )}
          </div>
        )}

        {mode === 'review' && activeSession && (
          <div className="animate-fade-in space-y-4">
            <Card className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-fg">{activeSession.job_title || 'Untitled role'}</h2>
                  <p className="text-sm text-fg-muted">{activeSession.company}</p>
                  <p className="mt-1 text-xs tabular-nums text-fg-subtle">
                    {activeSession.questions.filter((q) => q.answer).length}/{activeSession.questions.length} answered.
                    You can edit any answered question below
                  </p>
                </div>
                {activeSession.application_id && activeSession.questions.some((q) => q.feedback?.overall_note) && (
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Button variant="secondary" loading={addingToNotes} onClick={addTakeawaysToNotes}>
                      {addingToNotes ? 'Adding…' : 'Add takeaways to application notes'}
                    </Button>
                    {addToNotesMessage && (
                      <span className="animate-fade-in text-xs font-medium text-forest-700">
                        {addToNotesMessage}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {activeSession.questions.map((q, i) =>
              q.answer ? (
                <AnsweredQuestionCard
                  key={q.id}
                  index={i}
                  q={q}
                  isEditing={editingQuestionId === q.id}
                  editText={editAnswerText}
                  editSubmitting={editSubmitting}
                  editError={editError}
                  onStartEdit={() => startEditingAnswer(q)}
                  onChangeEditText={setEditAnswerText}
                  onCancelEdit={resetEditState}
                  onSubmitEdit={submitEditedAnswer}
                />
              ) : (
                <div key={q.id} className="space-y-2">
                  <QuestionBlock index={i} question={q.question} type={q.type} />
                  <p className="ml-4 text-sm italic text-fg-subtle">Not answered</p>
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  )
}
