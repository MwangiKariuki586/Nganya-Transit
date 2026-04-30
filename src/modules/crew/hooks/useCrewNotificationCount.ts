import { useEffect, useState } from 'react'
import { useAuthSession } from '@/hooks/useAuthSession'
import { getUnreadNotificationCountServerFn } from '@/shared/server-fns/crew-notifications'

export function useCrewNotificationCount() {
  const { session } = useAuthSession()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const accessToken = session?.access_token
    if (!accessToken) return

    getUnreadNotificationCountServerFn({ data: { accessToken } })
      .then(({ count }) => setUnreadCount(count))
      .catch(() => {})
  }, [session?.access_token])

  return unreadCount
}
