/**
 * useCorridorLiveBroadcast — Supabase Realtime Broadcast subscription for a corridor.
 *
 * Subscribes to the `corridor:{corridorId}:live` channel that the
 * live-location-ingest Edge Function broadcasts to after each accepted upload.
 *
 * Design:
 *   - One channel per corridor, scoped to the active corridor id
 *   - Cleans up and re-subscribes when corridorId changes
 *   - Prevents duplicate subscriptions (channel name is deterministic)
 *   - Tracks connection state: connecting → connected → disconnected → reconnecting
 *   - On reconnect: calls onReconnect() so the consumer can refresh server state
 *   - Only subscribes when isActive is true (overlay open, map visible)
 *   - Broadcast failure does not break the map — CDC fallback remains in useTracking
 *
 * Broadcast payload shape (from live-location-ingest Edge Function):
 * {
 *   type: 'LIVE_LOCATION_UPDATED'
 *   session_id: string
 *   nganya_id: string
 *   corridor_id: string
 *   lat: number
 *   lng: number
 *   accuracy_m: number | null
 *   speed_mps: number | null
 *   heading: number | null
 *   last_ping_at: string   // ISO
 *   client_state: string
 *   source: 'CREW_GPS'
 * }
 */

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BroadcastConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'

export interface LiveLocationBroadcastPayload {
  type: 'LIVE_LOCATION_UPDATED'
  session_id: string
  nganya_id: string
  corridor_id: string
  lat: number
  lng: number
  accuracy_m: number | null
  speed_mps: number | null
  heading: number | null
  last_ping_at: string
  client_state: string
  source: 'CREW_GPS'
}

export interface UseCorridorLiveBroadcastOptions {
  corridorId: string | null
  /** Only subscribe when true — set false when the map/overlay is not visible. */
  isActive: boolean
  /** Called for each valid LIVE_LOCATION_UPDATED broadcast received. */
  onUpdate: (payload: LiveLocationBroadcastPayload) => void
  /**
   * Called when the channel reconnects after a disconnect.
   * Consumer should refresh server state (re-fetch live sessions) to fill the gap.
   */
  onReconnect?: () => void
}

export interface UseCorridorLiveBroadcastReturn {
  connectionState: BroadcastConnectionState
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCorridorLiveBroadcast({
  corridorId,
  isActive,
  onUpdate,
  onReconnect,
}: UseCorridorLiveBroadcastOptions): UseCorridorLiveBroadcastReturn {
  const [connectionState, setConnectionState] =
    useState<BroadcastConnectionState>('idle')

  // Stable refs so event handlers don't capture stale closures
  const onUpdateRef = useRef(onUpdate)
  const onReconnectRef = useRef(onReconnect)
  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])
  useEffect(() => { onReconnectRef.current = onReconnect }, [onReconnect])

  const channelRef = useRef<RealtimeChannel | null>(null)
  const wasConnectedRef = useRef(false)

  useEffect(() => {
    if (!isActive || !corridorId) {
      setConnectionState('idle')
      return
    }

    const channelName = `corridor:${corridorId}:live`

    // Guard: if a channel for this exact name already exists, remove it first
    // so we don't accumulate duplicate subscriptions across re-renders.
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    setConnectionState('connecting')
    wasConnectedRef.current = false

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
        },
      })
      .on('broadcast', { event: 'LIVE_LOCATION_UPDATED' }, ({ payload }) => {
        // Basic shape validation before forwarding
        if (
          payload &&
          typeof payload.lat === 'number' &&
          typeof payload.lng === 'number' &&
          typeof payload.nganya_id === 'string' &&
          typeof payload.last_ping_at === 'string'
        ) {
          onUpdateRef.current(payload as LiveLocationBroadcastPayload)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          const wasConnected = wasConnectedRef.current
          wasConnectedRef.current = true
          setConnectionState('connected')
          // If this is a re-subscription after a disconnect, trigger recovery
          if (wasConnected) {
            onReconnectRef.current?.()
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionState('disconnected')
          wasConnectedRef.current = false
        } else if (status === 'CLOSED') {
          setConnectionState('disconnected')
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      setConnectionState('idle')
      wasConnectedRef.current = false
    }
  }, [corridorId, isActive])

  return { connectionState }
}
