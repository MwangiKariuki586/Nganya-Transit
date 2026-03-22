import type { ReactNode } from 'react'
import { CrewFooter } from '@/modules/crew/components/CrewFooter'
import { CrewNav } from '@/modules/crew/components/CrewNav'

interface CrewRouteFrameProps {
  children: ReactNode
}

export function CrewRouteFrame({ children }: CrewRouteFrameProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-base)]">
      <CrewNav />
      <main className="flex-1">{children}</main>
      <CrewFooter />
    </div>
  )
}
