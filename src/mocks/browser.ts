import { setupWorker } from 'msw/browser'
import { handlers, sessionsListError } from './handlers'

const worker = setupWorker(...handlers)

/**
 * Starts the dev-only Service Worker mock.
 * Open the app with `?mock=sessions-error` to fail the first sessions list request.
 */
export function startMockWorker(): Promise<unknown> {
  if (new URLSearchParams(window.location.search).get('mock') === 'sessions-error') {
    worker.use(sessionsListError({ once: true }))
  }

  return worker.start({ onUnhandledRequest: 'bypass' })
}
