/**
 * ConfidenceBadge — Trust indicator for sighting accuracy.
 * Levels: low (amber), med (cyan), high (green).
 */

interface ConfidenceBadgeProps {
    level: 'low' | 'med' | 'high'
    className?: string
}

const config = {
    low: { label: 'Low', color: 'var(--color-confidence-low)', bg: 'var(--color-warning-soft)' },
    med: { label: 'Med', color: 'var(--color-confidence-med)', bg: 'var(--color-cyan-soft)' },
    high: { label: 'High', color: 'var(--color-confidence-high)', bg: 'var(--color-green-soft)' },
}

export default function ConfidenceBadge({ level, className = '' }: ConfidenceBadgeProps) {
    const { label, color, bg } = config[level]

    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-full)] text-[10px] font-bold tracking-wide uppercase ${className}`}
            style={{ color, backgroundColor: bg }}
            title={`Confidence: ${label}`}
        >
            {/* Indicator dot */}
            <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: color }}
            />
            {label}
        </span>
    )
}
