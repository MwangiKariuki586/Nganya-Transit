import { useState, useCallback } from 'react';
import type { RideSearchPayload } from '@/components/features/WhereToCard';

const STORAGE_KEY = 'ride_recent_searches_v1';
const MAX_ITEMS = 5;

function readStored(): RideSearchPayload[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RideSearchPayload[]) : [];
  } catch {
    return [];
  }
}

function writeStored(items: RideSearchPayload[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Silently ignore quota errors.
  }
}

export interface UseRecentSearchesReturn {
  recents: RideSearchPayload[];
  addRecent: (payload: RideSearchPayload) => void;
  clearRecents: () => void;
}

/**
 * Maintains a list of the last N ride search payloads.
 * Duplicates (same fromStage + toPlace) are collapsed to keep the
 * most-recently used entry at the top.
 */
export function useRecentSearches(): UseRecentSearchesReturn {
  const [recents, setRecents] = useState<RideSearchPayload[]>(() => readStored());

  const addRecent = useCallback((payload: RideSearchPayload) => {
    setRecents((prev) => {
      const deduped = prev.filter(
        (r) =>
          !(r.fromStage.id === payload.fromStage.id && r.toPlace.id === payload.toPlace.id),
      );
      const next = [payload, ...deduped].slice(0, MAX_ITEMS);
      writeStored(next);
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setRecents([]);
  }, []);

  return { recents, addRecent, clearRecents };
}
