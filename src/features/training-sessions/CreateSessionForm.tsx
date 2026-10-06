import { useId, useRef, useState, type FormEvent } from 'react'
import type { NewSessionInput } from './types'
import { validateNewSession, type NewSessionFieldErrors, type NewSessionFormValues } from './validateNewSession'

const EMPTY_VALUES: NewSessionFormValues = { title: '', startsAtLocal: '' }

interface CreateSessionFormProps {
  /** Resolves when the session was created; rejects when the create request failed. */
  onCreate: (input: NewSessionInput) => Promise<void>
  onCancel: () => void
}

export function CreateSessionForm({ onCreate, onCancel }: CreateSessionFormProps) {
  const [values, setValues] = useState<NewSessionFormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<NewSessionFieldErrors>({})
  const [hasSubmitError, setHasSubmitError] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const inFlightRef = useRef(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const startsAtRef = useRef<HTMLInputElement>(null)

  const titleId = useId()
  const titleErrorId = useId()
  const startsAtId = useId()
  const startsAtErrorId = useId()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlightRef.current) {
      return
    }

    setHasSubmitError(false)
    const result = validateNewSession(values, Date.now())
    if (!result.ok) {
      setErrors(result.errors)
      if (result.errors.title !== undefined) {
        titleRef.current?.focus()
      } else {
        startsAtRef.current?.focus()
      }
      return
    }

    inFlightRef.current = true
    setErrors({})
    setIsPending(true)
    try {
      await onCreate(result.input)
      setValues(EMPTY_VALUES)
    } catch {
      setHasSubmitError(true)
    } finally {
      inFlightRef.current = false
      setIsPending(false)
    }
  }

  return (
    <form className="sessions-form" noValidate onSubmit={handleSubmit}>
      <div className="sessions-field">
        <label htmlFor={titleId}>Title</label>
        <input
          ref={titleRef}
          id={titleId}
          name="title"
          type="text"
          autoComplete="off"
          value={values.title}
          onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
          aria-invalid={errors.title !== undefined ? true : undefined}
          aria-describedby={errors.title !== undefined ? titleErrorId : undefined}
        />
        <p id={titleErrorId} className="sessions-field-error" aria-live="polite">
          {errors.title}
        </p>
      </div>

      <div className="sessions-field">
        <label htmlFor={startsAtId}>Start date and time</label>
        <input
          ref={startsAtRef}
          id={startsAtId}
          name="startsAt"
          type="datetime-local"
          autoComplete="off"
          value={values.startsAtLocal}
          onChange={(event) => setValues((current) => ({ ...current, startsAtLocal: event.target.value }))}
          aria-invalid={errors.startsAt !== undefined ? true : undefined}
          aria-describedby={errors.startsAt !== undefined ? startsAtErrorId : undefined}
        />
        <p id={startsAtErrorId} className="sessions-field-error" aria-live="polite">
          {errors.startsAt}
        </p>
      </div>

      {hasSubmitError ? (
        <p role="alert" className="sessions-error-text">
          The session could not be created. Please try again.
        </p>
      ) : null}

      <div className="sessions-form-actions">
        <button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create session'}
        </button>
        {/* Unmounting the form would not cancel the request and would reset the duplicate guard. */}
        <button type="button" disabled={isPending} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
