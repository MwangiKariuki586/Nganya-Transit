import type { ReactNode } from 'react'

interface AdminStatusBadgeProps {
  tone?: 'neutral' | 'accent' | 'green' | 'amber' | 'red'
  children: ReactNode
}

const toneClasses = {
  neutral: 'border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-secondary)]',
  accent: 'border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  green: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
  amber: 'border-amber-500/25 bg-amber-500/10 text-amber-200',
  red: 'border-red-500/25 bg-red-500/10 text-red-200',
} as const

export function AdminStatusBadge({
  tone = 'neutral',
  children,
}: AdminStatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-[999px] border px-2.5 py-1 text-caption ${toneClasses[tone]}`}>
      {children}
    </span>
  )
}
