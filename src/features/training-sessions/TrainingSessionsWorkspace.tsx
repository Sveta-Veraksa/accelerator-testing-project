import { useEffect, useId, useState } from 'react'
import { CreateSessionForm } from './CreateSessionForm'
import { SessionList } from './SessionList'
import { createSession, fetchSessions } from './sessionsApi'
import { StatusFilterControl } from './StatusFilterControl'
import type { NewSessionInput, StatusFilter, TrainingSession } from './types'
import './TrainingSessionsWorkspace.css'

type ListState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'success'; sessions: TrainingSession[] }

export function TrainingSessionsWorkspace() {
  const [listState, setListState] = useState<ListState>({ kind: 'loading' })
  const [reloadToken, setReloadToken] = useState(0)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  // The form must stay mounted while a create request is pending (AC-CREATE-5).
  const [isCreatePending, setIsCreatePending] = useState(false)
  const createFormId = useId()

  useEffect(() => {
    const controller = new AbortController()
    fetchSessions(controller.signal).then(
      (sessions) => {
        if (!controller.signal.aborted) {
          setListState({ kind: 'success', sessions })
        }
      },
      () => {
        if (!controller.signal.aborted) {
          setListState({ kind: 'error' })
        }
      },
    )
    return () => controller.abort()
  }, [reloadToken])

  function handleRetry() {
    setListState({ kind: 'loading' })
    setReloadToken((current) => current + 1)
  }

  async function handleCreate(input: NewSessionInput) {
    setIsCreatePending(true)
    try {
      const created = await createSession(input)
      setListState((current) =>
        current.kind === 'success' ? { kind: 'success', sessions: [...current.sessions, created] } : current,
      )
      setIsCreateOpen(false)
    } finally {
      setIsCreatePending(false)
    }
  }

  function renderContent() {
    if (listState.kind === 'loading') {
      return <p role="status">Loading sessions…</p>
    }

    if (listState.kind === 'error') {
      return (
        <div role="alert" className="sessions-load-error">
          <p className="sessions-error-text">Sessions could not be loaded. Check your connection and try again.</p>
          <button type="button" onClick={handleRetry}>
            Try again
          </button>
        </div>
      )
    }

    const visibleSessions =
      filter === 'scheduled'
        ? listState.sessions.filter((session) => session.status === 'scheduled')
        : listState.sessions

    return (
      <>
        <div className="sessions-toolbar">
          <StatusFilterControl value={filter} onChange={setFilter} />
          <button
            type="button"
            aria-expanded={isCreateOpen}
            aria-controls={createFormId}
            disabled={isCreatePending}
            onClick={() => setIsCreateOpen((current) => !current)}
          >
            New session
          </button>
        </div>
        {isCreateOpen ? (
          <section id={createFormId} aria-label="New session">
            <CreateSessionForm onCreate={handleCreate} onCancel={() => setIsCreateOpen(false)} />
          </section>
        ) : null}
        <SessionList sessions={visibleSessions} filter={filter} />
      </>
    )
  }

  return (
    <main className="sessions-workspace">
      <h1>Training sessions</h1>
      {renderContent()}
    </main>
  )
}
