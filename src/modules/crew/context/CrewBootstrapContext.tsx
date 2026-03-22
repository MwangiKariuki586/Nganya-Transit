import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCrewBootstrapServerFn } from '@/shared/server-fns/crew-bootstrap'
import { writeCrewBootstrapCache } from '@/modules/crew/services/bootstrap-cache'
import type { CrewBootstrapSnapshot } from '@/shared/types/crew-bootstrap'

interface CrewBootstrapContextValue {
  snapshot: CrewBootstrapSnapshot
  isRefreshing: boolean
  refresh: () => Promise<CrewBootstrapSnapshot>
  setSnapshot: (value: CrewBootstrapSnapshot) => void
}

const CrewBootstrapContext = createContext<CrewBootstrapContextValue | null>(null)

interface CrewBootstrapProviderProps {
  initialSnapshot: CrewBootstrapSnapshot
  children: ReactNode
}

export function CrewBootstrapProvider({
  initialSnapshot,
  children,
}: CrewBootstrapProviderProps) {
  const [snapshot, setSnapshotState] = useState(initialSnapshot)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const setSnapshot = useCallback((value: CrewBootstrapSnapshot) => {
    setSnapshotState(value)
    writeCrewBootstrapCache(value)
  }, [])

  const refresh = useCallback(async () => {
    setIsRefreshing(true)

    try {
      const nextSnapshot = await getCrewBootstrapServerFn()
      setSnapshot(nextSnapshot)
      return nextSnapshot
    } finally {
      setIsRefreshing(false)
    }
  }, [setSnapshot])

  useEffect(() => {
    setSnapshotState(initialSnapshot)
    writeCrewBootstrapCache(initialSnapshot)
  }, [initialSnapshot])

  useEffect(() => {
    if (!initialSnapshot.userId) {
      return
    }

    void refresh()
  }, [initialSnapshot.userId, refresh])

  const value = useMemo<CrewBootstrapContextValue>(() => ({
    snapshot,
    isRefreshing,
    refresh,
    setSnapshot,
  }), [isRefreshing, refresh, setSnapshot, snapshot])

  return (
    <CrewBootstrapContext.Provider value={value}>
      {children}
    </CrewBootstrapContext.Provider>
  )
}

export function useCrewBootstrap() {
  const context = useContext(CrewBootstrapContext)
  if (!context) {
    throw new Error('useCrewBootstrap must be used within CrewBootstrapProvider')
  }

  return context
}
