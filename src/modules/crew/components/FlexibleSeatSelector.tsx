import { Minus, Plus } from "lucide-react";
import { useState, useEffect } from "react";

interface FlexibleSeatSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  maxSeats?: number;
  minSeats?: number;
  className?: string;
}

export function FlexibleSeatSelector({
  value,
  onChange,
  disabled = false,
  maxSeats = 33,
  minSeats = 0,
  className = "",
}: FlexibleSeatSelectorProps) {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const clamp = (num: number) => Math.max(minSeats, Math.min(maxSeats, num));

  const handleIncrement = () => {
    const newValue = clamp(value + 1);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = clamp(value - 1);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Only update if it's a valid number
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      onChange(clamp(num));
    }
  };

  const handleInputBlur = () => {
    // Ensure input shows the clamped value
    setInputValue(value.toString());
  };

  const getStatusColor = () => {
    if (value === 0) return "text-red-400";
    if (value <= 5) return "text-amber-400";
    if (value <= 15) return "text-blue-400";
    return "text-emerald-400";
  };

  const getStatusText = () => {
    if (value === 0) return "Full";
    if (value === maxSeats) return "Empty";
    if (value <= 5) return "Almost Full";
    if (value <= 15) return "Half Full";
    return "Available";
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Counter */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= minSeats}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-text-primary)] transition-all hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Decrease seats"
        >
          <Minus className="h-6 w-6" />
        </button>

        <div className="flex-1 text-center">
          <input
            type="number"
            aria-label="Seats remaining"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            disabled={disabled}
            min={minSeats}
            max={maxSeats}
            className="w-full bg-transparent text-center text-5xl font-bold text-[var(--color-text-primary)] outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <div className="mt-1 text-sm text-[var(--color-text-tertiary)]">
            seats left
          </div>
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= maxSeats}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--color-text-primary)] transition-all hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Increase seats"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Status Badge */}
      <div className="text-center">
        <span
          className={`inline-block rounded-full px-4 py-1.5 text-sm font-semibold ${getStatusColor()}`}
        >
          {getStatusText()}
        </span>
      </div>

      {/* Quick Jump Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => onChange(0)}
          disabled={disabled}
          className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
        >
          Full
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.floor(maxSeats * 0.25))}
          disabled={disabled}
          className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
        >
          1/4
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.floor(maxSeats * 0.5))}
          disabled={disabled}
          className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
        >
          1/2
        </button>
        <button
          type="button"
          onClick={() => onChange(maxSeats)}
          disabled={disabled}
          className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
        >
          Empty
        </button>
      </div>

      {/* Capacity Info */}
      <div className="text-center text-xs text-[var(--color-text-tertiary)]">
        Capacity: {maxSeats} passengers • {value === 0 ? "No" : value} seat
        {value !== 1 ? "s" : ""} available
      </div>
    </div>
  );
}
