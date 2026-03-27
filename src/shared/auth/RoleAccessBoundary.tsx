import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { getRedirectPathForAudience, getRouteAudience } from '@/shared/auth/access-policy'
import { resolveClientRole } from '@/shared/auth/guards'
import type { AppRole } from '@/shared/types/rbac'

interface RoleAccessBoundaryProps {
  children: ReactNode
}

export function RoleAccessBoundary({ children }: RoleAccessBoundaryProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(() => getRouteAudience(location.pathname) !== 'public')
  const [resolvedRole, setResolvedRole] = useState<AppRole | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    const audience = getRouteAudience(location.pathname)

    void resolveClientRole().then((role) => {
      if (cancelled) return

      setResolvedRole(role)

      if (audience === 'public') {
        setIsChecking(false)
        return
      }

      if (!role && audience !== 'guest') {
        void navigate({
          to: '/signin',
          search: { returnTo: location.pathname.startsWith('/crew') ? '/crew' : location.pathname },
          replace: true,
        })
        return
      }

      const redirectPath = getRedirectPathForAudience(location.pathname, role)
      if (redirectPath && redirectPath !== location.pathname) {
        void navigate({ to: redirectPath, replace: true })
        return
      }

      setIsChecking(false)
    })

    return () => {
      cancelled = true
    }
  }, [navigate])

  useEffect(() => {
    if (resolvedRole === undefined) {
      return
    }

    const audience = getRouteAudience(location.pathname)
    if (audience === 'public') {
      setIsChecking(false)
      return
    }

    if (!resolvedRole && audience !== 'guest') {
      void navigate({
        to: '/signin',
        search: { returnTo: location.pathname.startsWith('/crew') ? '/crew' : location.pathname },
        replace: true,
      })
      return
    }

    const redirectPath = getRedirectPathForAudience(location.pathname, resolvedRole ?? null)
    if (redirectPath && redirectPath !== location.pathname) {
      void navigate({ to: redirectPath, replace: true })
      return
    }

    setIsChecking(false)
  }, [location.pathname, navigate, resolvedRole])

  if (isChecking) {
    return <div className="min-h-screen bg-[var(--color-bg-base)]" />
  }

  return <>{children}</>
}
