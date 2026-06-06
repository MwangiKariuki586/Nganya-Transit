import { Minus, Plus } from "lucide-react";
import { useState, useEffect } from "react";

interface FlexibleSeatSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  maxSeats?: number;
  minSeats?: number;
  className?: string;
  /** Sync state shown below the selector */
  syncStatus?: "synced" | "saving" | "offline" | "error";
  /** ISO timestamp of last edit (seat or direction) — shown as relative time when provided */
  lastSeatUpdateAt?: string | null;
}

export function FlexibleSeatSelector({
  value,
  onChange,
  disabled = false,
  maxSeats = 33,
  minSeats = 0,
  className = "",
  syncStatus,
  lastSeatUpdateAt,
}: FlexibleSeatSelectorProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [relativeTime, setRelativeTime] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  // Keep relative time fresh
  useEffect(() => {
    if (!lastSeatUpdateAt) {
      setRelativeTime(null);
      return;
    }
    const update = () => {
      const diffMs = Date.now() - new Date(lastSeatUpdateAt).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 10) setRelativeTime("just now");
      else if (diffSec < 60) setRelativeTime(`${diffSec}s ago`);
      else if (diffSec < 3600)
        setRelativeTime(`${Math.floor(diffSec / 60)}m ago`);
      else setRelativeTime(`${Math.floor(diffSec / 3600)}h ago`);
    };
    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, [lastSeatUpdateAt]);

  const clamp = (num: number) => Math.max(minSeats, Math.min(maxSeats, num));

  const handleIncrement = () => onChange(clamp(value + 1));
  const handleDecrement = () => onChange(clamp(value - 1));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) onChange(clamp(num));
  };

  const handleInputBlur = () => setInputValue(value.toString());

  const getStatusColor = () => {
    if (value === 0) return "text-red-400";
    if (value <= 5) return "text-[var(--color-warning)]";
    if (value <= 15) return "text-[var(--color-cyan)]";
    return "text-[var(--color-success)]";
  };

  const getStatusText = () => {
    if (value === 0) return "Full";
    if (value === maxSeats) return "Empty";
    if (value <= 5) return "Almost Full";
    if (value <= 15) return "Half Full";
    return "Available";
  };

  // Sync status line
  const syncLine = (() => {
    if (syncStatus === "saving")
      return {
        text: "Saving seat update…",
        color: "text-[var(--color-text-tertiary)]",
      };
    if (syncStatus === "offline")
      return {
        text: "Offline — will retry",
        color: "text-[var(--color-warning)]",
      };
    if (syncStatus === "error")
      return {
        text: "Sync failed — will retry",
        color: "text-[var(--color-warning)]",
      };
    if (syncStatus === "synced" && relativeTime)
      return {
        text: `Last update: ${relativeTime}`,
        color: "text-[var(--color-text-tertiary)]",
      };
    if (syncStatus === "synced")
      return { text: "Synced", color: "text-[var(--color-text-tertiary)]" };
    return null;
  })();

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

      {/* Sync metadata */}
      {syncLine ? (
        <div className={`text-center text-xs ${syncLine.color}`}>
          {syncLine.text}
        </div>
      ) : null}
    </div>
  );
}
