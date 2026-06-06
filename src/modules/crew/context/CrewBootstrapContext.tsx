import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCrewBootstrapServerFn } from "@/shared/server-fns/crew-bootstrap";
import type { CrewBootstrapSnapshot } from "@/shared/types/crew-bootstrap";

interface CrewBootstrapContextValue {
  snapshot: CrewBootstrapSnapshot;
  isRefreshing: boolean;
  refresh: () => Promise<CrewBootstrapSnapshot>;
  invalidate: () => void;
  setSnapshot: (value: CrewBootstrapSnapshot) => void;
}

const CrewBootstrapContext = createContext<CrewBootstrapContextValue | null>(
  null,
);

interface CrewBootstrapProviderProps {
  initialSnapshot: CrewBootstrapSnapshot;
  children: ReactNode;
}

export function CrewBootstrapProvider({
  initialSnapshot,
  children,
}: CrewBootstrapProviderProps) {
  const [snapshot, setSnapshotState] = useState(initialSnapshot);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const nextSnapshot = await getCrewBootstrapServerFn();
      setSnapshotState(nextSnapshot);
      return nextSnapshot;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const invalidate = useCallback(() => {
    setSnapshotState(initialSnapshot);
  }, [initialSnapshot]);

  const setSnapshot = useCallback(
    (value: CrewBootstrapSnapshot) => {
      setSnapshotState(value);
    },
    [],
  );

  const value = useMemo<CrewBootstrapContextValue>(
    () => ({
      snapshot,
      isRefreshing,
      refresh,
      invalidate,
      setSnapshot,
    }),
    [snapshot, isRefreshing, refresh, invalidate, setSnapshot],
  );

  return (
    <CrewBootstrapContext.Provider value={value}>
      {children}
    </CrewBootstrapContext.Provider>
  );
}

export function useCrewBootstrap() {
  const context = useContext(CrewBootstrapContext);
  if (!context) {
    throw new Error(
      "useCrewBootstrap must be used within CrewBootstrapProvider",
    );
  }

  return context;
}
