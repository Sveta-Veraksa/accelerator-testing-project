import { SESSION_STATUSES, type NewSessionInput, type SessionStatus, type TrainingSession } from './types'

const SESSIONS_PATH = '/api/sessions'

/** Request-boundary failure. The message is technical and never shown to the user verbatim. */
export class SessionsApiError extends Error {
  readonly status: number | undefined

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'SessionsApiError'
    this.status = status
  }
}

function sessionsUrl(): URL {
  return new URL(SESSIONS_PATH, window.location.origin)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSessionStatus(value: unknown): value is SessionStatus {
  return SESSION_STATUSES.some((status) => status === value)
}

function toTrainingSession(value: unknown): TrainingSession {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.startsAt !== 'string' ||
    Number.isNaN(Date.parse(value.startsAt)) ||
    !isSessionStatus(value.status)
  ) {
    throw new SessionsApiError('Malformed training session in response body')
  }

  return { id: value.id, title: value.title, status: value.status, startsAt: value.startsAt }
}

async function request(input: URL, init: RequestInit): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(input, init)
  } catch (error) {
    if (init.signal?.aborted) {
      throw error
    }
    throw new SessionsApiError('Network request failed')
  }

  if (!response.ok) {
    throw new SessionsApiError(`Request failed with status ${response.status}`, response.status)
  }

  try {
    return await response.json()
  } catch {
    throw new SessionsApiError('Response body is not valid JSON', response.status)
  }
}

export async function fetchSessions(signal?: AbortSignal): Promise<TrainingSession[]> {
  const body = await request(sessionsUrl(), { method: 'GET', signal })
  if (!Array.isArray(body)) {
    throw new SessionsApiError('Expected an array of training sessions')
  }
  return body.map(toTrainingSession)
}

export async function createSession(input: NewSessionInput): Promise<TrainingSession> {
  const body = await request(sessionsUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: input.title, startsAt: input.startsAt }),
  })
  return toTrainingSession(body)
}
