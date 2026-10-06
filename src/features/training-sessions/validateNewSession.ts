import type { NewSessionInput } from './types'

/** Raw form values; empty fields are ''. */
export interface NewSessionFormValues {
  title: string
  /** `datetime-local` value, `YYYY-MM-DDTHH:mm`, interpreted in local time. */
  startsAtLocal: string
}

export type NewSessionFieldErrors = Partial<Record<'title' | 'startsAt', string>>

export type NewSessionValidationResult =
  | { ok: true; input: NewSessionInput }
  | { ok: false; errors: NewSessionFieldErrors }

const TITLE_MIN_LENGTH = 3
const TITLE_MAX_LENGTH = 80

export function validateNewSession(
  values: NewSessionFormValues,
  nowMs: number,
): NewSessionValidationResult {
  const errors: NewSessionFieldErrors = {}

  const title = values.title.trim()
  if (title.length === 0) {
    errors.title = 'Enter a title (3–80 characters).'
  } else if (title.length < TITLE_MIN_LENGTH || title.length > TITLE_MAX_LENGTH) {
    errors.title = 'Title must be between 3 and 80 characters.'
  }

  // A date-time string without an offset is parsed as local time (ECMAScript).
  const startsAtMs = values.startsAtLocal === '' ? Number.NaN : new Date(values.startsAtLocal).getTime()
  if (values.startsAtLocal === '' || Number.isNaN(startsAtMs)) {
    errors.startsAt = 'Choose a start date and time.'
  } else if (startsAtMs <= nowMs) {
    errors.startsAt = 'Start date and time must be in the future.'
  }

  if (errors.title !== undefined || errors.startsAt !== undefined) {
    return { ok: false, errors }
  }

  return { ok: true, input: { title, startsAt: new Date(startsAtMs).toISOString() } }
}
