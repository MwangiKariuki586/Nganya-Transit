import { Check, Circle } from "lucide-react";

interface CompletenessItem {
  label: string;
  done: boolean;
}

interface ProfileCompletenessProps {
  fullName: string;
  handle: string;
  bio: string;
  avatarUrl: string;
  coverMediaUrl: string;
}

export default function ProfileCompleteness({
  fullName,
  handle,
  bio,
  avatarUrl,
  coverMediaUrl,
}: ProfileCompletenessProps) {
  const items: CompletenessItem[] = [
    { label: "Display name set", done: !!fullName?.trim() },
    { label: "Handle chosen", done: !!handle?.trim() },
    { label: "Bio written", done: !!bio?.trim() },
    { label: "Avatar uploaded", done: !!avatarUrl },
    { label: "Cover media added", done: !!coverMediaUrl },
  ];

  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const percent = Math.round((completed / total) * 100);

  const isComplete = percent === 100;

  const barColor = isComplete
    ? "bg-[var(--color-green)]"
    : percent >= 60
      ? "bg-[var(--color-accent)]"
      : "bg-[var(--color-warning)]";

  const labelColor = isComplete
    ? "text-[var(--color-green)]"
    : percent >= 60
      ? "text-[var(--color-accent)]"
      : "text-[var(--color-warning)]";

  return (
    <div className="p-4 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          Profile Completeness
        </p>
        <span className={`text-sm font-bold font-mono ${labelColor}`}>
          {percent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Checklist */}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            {item.done ? (
              <Check className="w-4 h-4 text-[var(--color-green)] shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
            )}
            <span
              className={`text-xs ${
                item.done
                  ? "text-[var(--color-text-secondary)] line-through"
                  : "text-[var(--color-text-secondary)]"
              }`}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      {isComplete && (
        <p className="mt-3 text-xs text-center text-[var(--color-green)] font-semibold">
          🎉 Profile complete!
        </p>
      )}
    </div>
  );
}
