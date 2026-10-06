import type { StatusFilter, TrainingSession } from './types'

const startsAtFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

interface SessionListProps {
  sessions: readonly TrainingSession[]
  /** Used only to choose the empty-state message. */
  filter: StatusFilter
}

export function SessionList({ sessions, filter }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <p className="sessions-empty">
        {filter === 'scheduled' ? 'No scheduled sessions match this filter.' : 'No training sessions yet.'}
      </p>
    )
  }

  return (
    <ul className="sessions-list" aria-label="Training sessions">
      {sessions.map((session) => (
        <li key={session.id} className="sessions-item">
          <span className="sessions-title">{session.title}</span>
          <span className={`sessions-status sessions-status--${session.status}`}>{session.status}</span>
          <time className="sessions-time" dateTime={session.startsAt}>
            {startsAtFormat.format(new Date(session.startsAt))}
          </time>
        </li>
      ))}
    </ul>
  )
}
