import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useCrewStore } from "@/stores/useCrewStore";
import type { CrewBootstrapSnapshot } from "@/shared/types/crew-bootstrap";

interface CrewBootstrapContextValue {
  snapshot: CrewBootstrapSnapshot;
  isRefreshing: boolean;
  refresh: () => Promise<CrewBootstrapSnapshot>;
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
  // Use Zustand store instead of manual useState/useEffect
  const bootstrap = useCrewStore((state) => state.bootstrap);
  const isRefreshing = useCrewStore((state) => state.isRefreshing);
  const fetchBootstrap = useCrewStore((state) => state.fetchBootstrap);
  const setBootstrap = useCrewStore((state) => state.setBootstrap);

  // Initialize store with initialSnapshot if store is empty
  useEffect(() => {
    if (!bootstrap && initialSnapshot.userId) {
      setBootstrap(initialSnapshot);
    }
  }, [bootstrap, initialSnapshot, setBootstrap]);

  // Refresh bootstrap data when userId changes
  useEffect(() => {
    if (initialSnapshot.userId) {
      void fetchBootstrap();
    }
  }, [initialSnapshot.userId, fetchBootstrap]);

  // Map store methods to context interface
  const refresh = useCallback(async () => {
    return fetchBootstrap();
  }, [fetchBootstrap]);

  const setSnapshot = useCallback(
    (value: CrewBootstrapSnapshot) => {
      setBootstrap(value);
    },
    [setBootstrap],
  );

  // Use bootstrap from store, fallback to initialSnapshot if store is empty
  const snapshot = bootstrap ?? initialSnapshot;

  const value = useMemo<CrewBootstrapContextValue>(
    () => ({
      snapshot,
      isRefreshing,
      refresh,
      setSnapshot,
    }),
    [snapshot, isRefreshing, refresh, setSnapshot],
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
