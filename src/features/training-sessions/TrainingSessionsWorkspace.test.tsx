import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../../App'
import { seedSessions } from '../../mocks/data'

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
})
