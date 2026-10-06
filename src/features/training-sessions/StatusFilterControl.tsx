import type { StatusFilter } from './types'

const FILTER_OPTIONS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
]

interface StatusFilterControlProps {
  value: StatusFilter
  onChange: (next: StatusFilter) => void
}

export function StatusFilterControl({ value, onChange }: StatusFilterControlProps) {
  return (
    <fieldset className="sessions-filter">
      <legend>Status</legend>
      {FILTER_OPTIONS.map((option) => (
        <label key={option.value} className="sessions-filter-option">
          <input
            type="radio"
            name="status-filter"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}
