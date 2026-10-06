export const SESSION_STATUSES = ['scheduled', 'completed', 'cancelled'] as const

export type SessionStatus = (typeof SESSION_STATUSES)[number]

export interface TrainingSession {
  id: string
  title: string
  status: SessionStatus
  /** ISO 8601 UTC timestamp, for example "2026-11-02T09:30:00.000Z". */
  startsAt: string
}

export interface NewSessionInput {
  /** Already trimmed. */
  title: string
  /** ISO 8601 UTC timestamp. */
  startsAt: string
}

export type StatusFilter = 'all' | 'scheduled'
