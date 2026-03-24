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
  const baseClass = 'flex min-h-[48px] items-center justify-center rounded-[18px] border px-3 py-2 text-sm font-semibold transition-all duration-200'
  const activeClass = 'border-[var(--color-accent)]  text-white shadow-[0_0_28px_rgba(255,45,120,0.22)]'
  const idleClass = 'border-[var(--glass-border)] bg-white/[0.04] text-[var(--color-text-primary)] hover:border-[var(--glass-border-hover)] hover:bg-white/[0.06]'

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        type="button"
        className={`${baseClass} ${value === 'TO_TOWN' ? activeClass : idleClass} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        disabled={disabled}
        onClick={() => onChange('TO_TOWN')}
      >
        {toTownLabel}
      </button>
      <button
        type="button"
        className={`${baseClass} ${value === 'FROM_TOWN' ? activeClass : idleClass} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        disabled={disabled}
        onClick={() => onChange('FROM_TOWN')}
      >
        {fromTownLabel}
      </button>
    </div>
  )
}
