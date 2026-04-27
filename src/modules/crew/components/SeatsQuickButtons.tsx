const seatPresets = [
  { label: '10', value: 10 },
  { label: '5', value: 5 },
  { label: '2', value: 2 },
  { label: 'Full (0 seats)', value: 0 },
] as const

interface SeatsQuickButtonsProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  isConfirmed?: boolean
}

export function SeatsQuickButtons({
  value,
  onChange,
  disabled = false,
  isConfirmed = true,
}: SeatsQuickButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {seatPresets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          className={`btn-option px-3 py-2 ${isConfirmed && value === preset.value ? 'btn-option-selected' : ''}`}
          disabled={disabled}
          onClick={() => onChange(preset.value)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
