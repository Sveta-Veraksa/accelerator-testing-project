import type { TrainingSession } from '../features/training-sessions/types'

export const seedSessions: readonly TrainingSession[] = [
  {
    id: 'seed-1',
    title: 'React testing fundamentals',
    status: 'scheduled',
    startsAt: '2027-03-15T09:00:00.000Z',
  },
  {
    id: 'seed-2',
    title: 'TypeScript for frontend teams',
    status: 'scheduled',
    startsAt: '2027-04-02T13:30:00.000Z',
  },
  {
    id: 'seed-3',
    title: 'Accessibility basics',
    status: 'completed',
    startsAt: '2025-11-10T10:00:00.000Z',
  },
  {
    id: 'seed-4',
    title: 'Legacy build tooling migration',
    status: 'cancelled',
    startsAt: '2025-12-05T14:00:00.000Z',
  },
]

let sessions: TrainingSession[] = [...seedSessions]

export function getMockSessions(): readonly TrainingSession[] {
  return sessions
}

export function addMockSession(session: TrainingSession): void {
  sessions = [...sessions, session]
}

export function resetMockSessions(): void {
  sessions = [...seedSessions]
}
