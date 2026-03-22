import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { getRedirectPathForAudience, getRouteAudience } from '@/shared/auth/access-policy'
import { resolveClientRole } from '@/shared/auth/guards'

interface RoleAccessBoundaryProps {
  children: ReactNode
}

export function RoleAccessBoundary({ children }: RoleAccessBoundaryProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    let cancelled = false
    const pathname = location.pathname
    const audience = getRouteAudience(pathname)

    if (audience === 'public') {
      setIsChecking(false)
      return () => {
        cancelled = true
      }
    }

    setIsChecking(true)

    void resolveClientRole().then((role) => {
      if (cancelled) return

      if (!role && audience !== 'guest') {
        void navigate({
          to: '/signin',
          search: { returnTo: pathname.startsWith('/crew') ? '/crew' : pathname },
          replace: true,
        })
        return
      }

      const redirectPath = getRedirectPathForAudience(pathname, role)
      if (redirectPath && redirectPath !== pathname) {
        void navigate({ to: redirectPath, replace: true })
        return
      }

      setIsChecking(false)
    })

    return () => {
      cancelled = true
    }
  }, [location.pathname, navigate])

  if (isChecking) {
    return <div className="min-h-screen bg-[var(--color-bg-base)]" />
  }

  return <>{children}</>
}
