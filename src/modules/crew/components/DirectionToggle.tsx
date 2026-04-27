export type CrewDirectionValue = 'TO_TOWN' | 'FROM_TOWN'

interface DirectionToggleProps {
  value: CrewDirectionValue | null
  onChange: (value: CrewDirectionValue) => void
  disabled?: boolean
  toTownLabel?: string
  fromTownLabel?: string
}

export function DirectionToggle({
  value,
  onChange,
  disabled = false,
  toTownLabel = 'To Town',
  fromTownLabel = 'From Town',
}: DirectionToggleProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        type="button"
        className={`btn-option px-3 py-2 ${value === 'TO_TOWN' ? 'btn-option-selected' : ''}`}
        disabled={disabled}
        onClick={() => onChange('TO_TOWN')}
      >
        {toTownLabel}
      </button>
      <button
        type="button"
        className={`btn-option px-3 py-2 ${value === 'FROM_TOWN' ? 'btn-option-selected' : ''}`}
        disabled={disabled}
        onClick={() => onChange('FROM_TOWN')}
      >
        {fromTownLabel}
      </button>
    </div>
  )
}
