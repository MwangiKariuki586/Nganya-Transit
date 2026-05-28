import { useEffect, useRef } from "react";

type ChannelLike = any;

type SupabaseLike = {
  channel: (name: string) => any;
  removeChannel: (channel: any) => any;
};

interface UseCorridorRealtimeRefreshOptions {
  enabled: boolean;
  corridorIds: string[];
  channelPrefix: string;
  debounceMs: number;
  onRefresh: () => void | Promise<void>;
  loadClient: () => Promise<{ supabase: SupabaseLike }>;
}

export function useCorridorRealtimeRefresh({
  enabled,
  corridorIds,
  channelPrefix,
  debounceMs,
  onRefresh,
  loadClient,
}: UseCorridorRealtimeRefreshOptions) {
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled || corridorIds.length === 0) return;

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        void onRefresh();
      }, debounceMs);
    };

    let isCancelled = false;
    let channels: ChannelLike[] = [];
    let removeChannel: ((channel: ChannelLike) => void) | null = null;

    void loadClient()
      .then(({ supabase }) => {
        if (isCancelled) return;

        removeChannel = supabase.removeChannel.bind(supabase);
        channels = corridorIds.map((corridorId) =>
          supabase
            .channel(`${channelPrefix}_${corridorId}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "live_sessions",
                filter: `corridor_id=eq.${corridorId}`,
              },
              scheduleRefresh,
            )
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "sightings",
                filter: `corridor_id=eq.${corridorId}`,
              },
              scheduleRefresh,
            )
            .subscribe(),
        );
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (removeChannel) {
        channels.forEach((channel) => removeChannel?.(channel));
      }
    };
  }, [channelPrefix, corridorIds, debounceMs, enabled, loadClient, onRefresh]);
}
