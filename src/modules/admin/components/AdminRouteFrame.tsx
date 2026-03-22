import type { ReactNode } from 'react'
import { AdminNav } from '@/modules/admin/components/AdminNav'

interface AdminRouteFrameProps {
  children: ReactNode
}

export function AdminRouteFrame({ children }: AdminRouteFrameProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-base)]">
      <AdminNav />
      <main className="flex-1">{children}</main>
    </div>
  )
}
