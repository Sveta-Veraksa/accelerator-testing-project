import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import App from '../../App'
import { seedSessions } from '../../mocks/data'
import { server } from '../../mocks/node'
import type { TrainingSession } from './types'

function titlesWhere(predicate: (status: string) => boolean): string[] {
  return seedSessions.filter((session) => predicate(session.status)).map((session) => session.title)
}

describe('TrainingSessionsWorkspace', () => {
  it('shows loaded sessions and filters them by Scheduled', async () => {
    const user = userEvent.setup()
    const allTitles = titlesWhere(() => true)
    const scheduledTitles = titlesWhere((status) => status === 'scheduled')
    const otherTitles = titlesWhere((status) => status !== 'scheduled')
    // Guard: the filter assertions below are meaningless without both groups.
    expect(scheduledTitles.length).toBeGreaterThan(0)
    expect(otherTitles.length).toBeGreaterThan(0)

    render(<App />)

    // Loading first, then the loaded list.
    expect(screen.getByRole('status').textContent).toBe('Loading sessions…')
    const list = await screen.findByRole('list', { name: 'Training sessions' })
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(within(list).getAllByRole('listitem')).toHaveLength(seedSessions.length)
    for (const title of allTitles) {
      expect(screen.getByText(title)).toBeTruthy()
    }

    // "All" is selected by default and every status is visible.
    const allOption = screen.getByRole<HTMLInputElement>('radio', { name: 'All' })
    const scheduledOption = screen.getByRole<HTMLInputElement>('radio', { name: 'Scheduled' })
    expect(allOption.checked).toBe(true)
    expect(scheduledOption.checked).toBe(false)

    // "Scheduled" hides completed and cancelled sessions.
    await user.click(scheduledOption)
    expect(scheduledOption.checked).toBe(true)
    for (const title of scheduledTitles) {
      expect(screen.getByText(title)).toBeTruthy()
    }
    for (const title of otherTitles) {
      expect(screen.queryByText(title)).toBeNull()
    }

    // Back to "All" shows every session again.
    await user.click(allOption)
    expect(allOption.checked).toBe(true)
    for (const title of allTitles) {
      expect(screen.getByText(title)).toBeTruthy()
    }
  })

  it('sends exactly one create request while it is pending, even via Cancel or New session', async () => {
    const user = userEvent.setup()
    const firstTitle = 'First pending session'
    const createdSession: TrainingSession = {
      id: 'created-1',
      title: firstTitle,
      status: 'scheduled',
      startsAt: '2099-01-01T10:00:00.000Z',
    }
    let postCount = 0
    let releaseCreate: () => void = () => {}
    const createGate = new Promise<void>((resolve) => {
      releaseCreate = resolve
    })
    server.use(
      http.post('/api/sessions', async () => {
        postCount += 1
        await createGate
        return HttpResponse.json(createdSession, { status: 201 })
      }),
    )

    async function fillAndSubmit(title: string) {
      const titleInput = screen.getByLabelText('Title')
      await user.clear(titleInput)
      await user.type(titleInput, title)
      // user-event is unreliable for datetime-local in jsdom (plan R-4).
      fireEvent.change(screen.getByLabelText('Start date and time'), { target: { value: '2099-01-01T10:00' } })
      await user.click(screen.getByRole('button', { name: /Create session|Creating…/ }))
    }

    render(<App />)
    await screen.findByRole('list', { name: 'Training sessions' })
    const newSessionToggle = screen.getByRole<HTMLButtonElement>('button', { name: 'New session' })

    await user.click(newSessionToggle)
    await fillAndSubmit(firstTitle)
    await screen.findByRole('button', { name: 'Creating…' })
    expect(postCount).toBe(1)

    // Neither control may unmount the pending form and allow a second submission.
    const cancelButton = screen.getByRole<HTMLButtonElement>('button', { name: 'Cancel' })
    expect(cancelButton.disabled).toBe(true)
    expect(newSessionToggle.disabled).toBe(true)
    // Review S-1 scenario: Cancel, reopen via New session, submit again.
    await user.click(cancelButton)
    await user.click(newSessionToggle)
    await fillAndSubmit('Second pending session')
    expect(postCount).toBe(1)

    releaseCreate()
    await waitFor(() => expect(screen.queryByRole('region', { name: 'New session' })).toBeNull())
    expect(screen.getByText(firstTitle)).toBeTruthy()
    expect(screen.queryByText('Second pending session')).toBeNull()
    expect(newSessionToggle.disabled).toBe(false)
    expect(postCount).toBe(1)
  })
})
