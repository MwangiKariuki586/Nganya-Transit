import type { ReactNode } from 'react'

interface AdminStatCardProps {
  label: string
  value: string | number
  helper?: string
  icon?: ReactNode
  accent?: 'accent' | 'green' | 'amber' | 'cyan'
}

const accentStyles = {
  accent: 'text-[var(--color-accent)] bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20',
  green: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  amber: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  cyan: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
} as const

export function AdminStatCard({
  label,
  value,
  helper,
  icon,
  accent = 'accent',
}: AdminStatCardProps) {
  return (
    <section className="rounded-[24px] border border-[var(--glass-border)] bg-[rgba(23,23,31,0.94)] p-5 shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-caption text-[var(--color-text-tertiary)]">{label}</div>
          <div className="mt-2 text-h2 text-white">{value}</div>
          {helper ? (
            <div className="mt-2 text-body-sm text-[var(--color-text-secondary)]">{helper}</div>
          ) : null}
        </div>
        {icon ? (
          <div className={`rounded-[18px] border px-3 py-2 ${accentStyles[accent]}`}>
            {icon}
          </div>
        ) : null}
      </div>
    </section>
  )
}
