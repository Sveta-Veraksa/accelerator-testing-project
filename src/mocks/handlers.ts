// Provisional contract, see tasks/training-sessions/implementation-plan.md G-3.
// Mock only: not a confirmed backend contract.
import { http, HttpResponse, type RequestHandler } from 'msw'
import type { TrainingSession } from '../features/training-sessions/types'
import { addMockSession, getMockSessions } from './data'

const SESSIONS_PATH = '/api/sessions'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export const handlers: RequestHandler[] = [
  http.get(SESSIONS_PATH, () => HttpResponse.json(getMockSessions())),

  http.post(SESSIONS_PATH, async ({ request }) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return HttpResponse.json({ message: 'Request body must be JSON.' }, { status: 400 })
    }

    if (
      !isRecord(body) ||
      typeof body.title !== 'string' ||
      typeof body.startsAt !== 'string' ||
      Number.isNaN(Date.parse(body.startsAt))
    ) {
      return HttpResponse.json(
        { message: 'Expected { title: string, startsAt: ISO date string }.' },
        { status: 400 },
      )
    }

    const session: TrainingSession = {
      id: crypto.randomUUID(),
      title: body.title,
      status: 'scheduled',
      startsAt: body.startsAt,
    }
    addMockSession(session)

    return HttpResponse.json(session, { status: 201 })
  }),
]

export function sessionsListError(options?: { once?: boolean }): RequestHandler {
  return http.get(
    SESSIONS_PATH,
    () => HttpResponse.json({ message: 'Internal server error' }, { status: 500 }),
    { once: options?.once ?? false },
  )
}
