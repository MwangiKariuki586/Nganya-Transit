import type { ReactNode } from 'react'
import { useAuthSession } from '@/hooks/useAuthSession'
import { AdminNav } from '@/modules/admin/components/AdminNav'
import AdminBottomNav from '@/modules/admin/components/AdminBottomNav'

interface AdminRouteFrameProps {
  children: ReactNode
}

export function AdminRouteFrame({ children }: AdminRouteFrameProps) {
  const { session, profile } = useAuthSession()

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-base)]">
      <AdminNav session={session} profile={profile} />
      <main className="flex-1">{children}</main>
      <AdminBottomNav session={session} profile={profile} />
    </div>
  )
}
