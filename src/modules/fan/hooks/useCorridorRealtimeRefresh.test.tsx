import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCorridorRealtimeRefresh } from "./useCorridorRealtimeRefresh";

function createMockSupabase() {
  const removeChannel = vi.fn();
  const channels: Array<{ callbacks: Array<() => void>; channel: any }> = [];

  const supabase = {
    channel: vi.fn((name: string) => {
      const callbacks: Array<() => void> = [];
      const channel = {
        name,
        on: vi.fn(
          (
            _event: "postgres_changes",
            _filter: unknown,
            callback: () => void,
          ) => {
            callbacks.push(callback);
            return channel;
          },
        ),
        subscribe: vi.fn(() => channel),
      };
      channels.push({ callbacks, channel });
      return channel;
    }),
    removeChannel,
  };

  return { supabase, channels, removeChannel };
}

describe("useCorridorRealtimeRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("subscribes per corridor and debounces refresh calls", async () => {
    const { supabase, channels } = createMockSupabase();
    const onRefresh = vi.fn();

    renderHook(() =>
      useCorridorRealtimeRefresh({
        enabled: true,
        corridorIds: ["c1", "c2"],
        channelPrefix: "fan_test",
        debounceMs: 1500,
        onRefresh,
        loadClient: () => Promise.resolve({ supabase }),
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(supabase.channel).toHaveBeenCalledTimes(2);

    act(() => {
      channels[0]?.callbacks[0]?.();
      channels[0]?.callbacks[1]?.();
      vi.advanceTimersByTime(1499);
    });
    expect(onRefresh).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("removes subscribed channels on unmount", async () => {
    const { supabase, channels, removeChannel } = createMockSupabase();

    const view = renderHook(() =>
      useCorridorRealtimeRefresh({
        enabled: true,
        corridorIds: ["c1"],
        channelPrefix: "fan_test",
        debounceMs: 250,
        onRefresh: vi.fn(),
        loadClient: () => Promise.resolve({ supabase }),
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    view.unmount();
    expect(removeChannel).toHaveBeenCalledWith(channels[0]?.channel);
  });
});
