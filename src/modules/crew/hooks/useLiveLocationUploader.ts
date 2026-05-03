/**
 * useLiveLocationUploader — Adaptive location upload loop for crew live sessions.
 *
 * Replaces the fixed 15 s ping interval from useSessionPing with upload logic
 * that only sends when something meaningful has changed.
 *
 * Architecture:
 *   - Watches latestPosition from the location runtime
 *   - On each new position, evaluates shouldUploadLocation()
 *   - If upload is warranted, calls the provided upload function
 *   - Maintains a latest-only pending queue: failed uploads store one point;
 *     on reconnect/resume only that latest point is sent (no stale backlog)
 *   - Tracks client visibility state (foreground / backgrounded / recovered / offline)
 *   - On tab hidden: sends a best-effort background heartbeat
 *   - On tab visible: marks state as 'recovered' so next position triggers upload
 *   - On online: flushes the pending point if one exists
 *
 * The upload function is intentionally generic — it currently calls the existing
 * pingSession service method. Unit 03 will swap it to call the Edge Function
 * without changing this hook's interface.
 *
 * Inputs:
 *   sessionId         — active session id (null = uploader is inactive)
 *   nganyaId          — for payload construction
 *   latestPosition    — from useCrewLocationRuntime
 *   locationReadiness — from useCrewLocationRuntime
 *   isSessionLive     — whether the session is currently LIVE
 *   onUpload          — async function that performs the actual network call
 *   onUploadSuccess   — called with the server response on success
 *   onUploadError     — called with the error on failure
 *
 * Returns:
 *   uploadStatus      — 'idle' | 'uploading' | 'success' | 'error' | 'offline'
 *   clientState       — 'foreground' | 'backgrounded' | 'recovered' | 'offline'
 *   lastUploadedAt    — ms timestamp of last successful upload (null if none)
 *   lastUploadAgeMs   — ms since last successful upload (0 if none)
 *   hasPendingUpload  — whether a failed upload is queued
 *   retryNow          — flush the pending upload immediately
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CrewLocationPosition, LocationReadiness } from './useCrewLocationRuntime'
import {
  shouldUploadLocation,
  normalizeLocationPayload,
  UPLOAD_THRESHOLDS,
  type ClientState,
  type LocationUploadPayload,
} from '../lib/location-upload'

// ─── Types ────────────────────────────────────────────────────────────────────

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error' | 'offline'

export interface LiveLocationUploadRequest {
  sessionId: string
  nganyaId: string
  point: LocationUploadPayload
  clientState: ClientState
}

export interface UseLiveLocationUploaderOptions {
  sessionId: string | null
  nganyaId: string | null
  latestPosition: CrewLocationPosition | null
  locationReadiness: LocationReadiness
  isSessionLive: boolean
  onUpload: (req: LiveLocationUploadRequest) => Promise<any>
  onUploadSuccess?: (result: any) => void
  onUploadError?: (error: Error) => void
}

export interface UseLiveLocationUploaderReturn {
  uploadStatus: UploadStatus
  clientState: ClientState
  lastUploadedAt: number | null
  lastUploadAgeMs: number
  hasPendingUpload: boolean
  retryNow: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveLocationUploader(
  options: UseLiveLocationUploaderOptions,
): UseLiveLocationUploaderReturn {
  const {
    sessionId,
    nganyaId,
    latestPosition,
    locationReadiness,
    isSessionLive,
    onUpload,
    onUploadSuccess,
    onUploadError,
  } = options

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [clientState, setClientState] = useState<ClientState>('foreground')
  const [lastUploadedAt, setLastUploadedAt] = useState<number | null>(null)
  const [lastUploadAgeMs, setLastUploadAgeMs] = useState(0)
  const [hasPendingUpload, setHasPendingUpload] = useState(false)

  // Refs — avoid stale closures in event handlers
  const lastUploadedPositionRef = useRef<CrewLocationPosition | null>(null)
  const lastUploadedAtRef = useRef<number | null>(null)
  const pendingPointRef = useRef<LocationUploadPayload | null>(null)
  const isUploadingRef = useRef(false)
  const isFirstUploadRef = useRef(true)
  const clientStateRef = useRef<ClientState>('foreground')
  const sessionIdRef = useRef(sessionId)
  const nganyaIdRef = useRef(nganyaId)
  const onUploadRef = useRef(onUpload)
  const onUploadSuccessRef = useRef(onUploadSuccess)
  const onUploadErrorRef = useRef(onUploadError)

  // Keep refs in sync with latest props (avoids stale closures in callbacks)
  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
  useEffect(() => { nganyaIdRef.current = nganyaId }, [nganyaId])
  useEffect(() => { onUploadRef.current = onUpload }, [onUpload])
  useEffect(() => { onUploadSuccessRef.current = onUploadSuccess }, [onUploadSuccess])
  useEffect(() => { onUploadErrorRef.current = onUploadError }, [onUploadError])

  // ── Core upload executor ───────────────────────────────────────────────────

  const executeUpload = useCallback(
    async (point: LocationUploadPayload, state: ClientState) => {
      const sid = sessionIdRef.current
      const nid = nganyaIdRef.current
      if (!sid || !nid || isUploadingRef.current) return

      isUploadingRef.current = true
      setUploadStatus('uploading')

      try {
        const result = await onUploadRef.current({ sessionId: sid, nganyaId: nid, point, clientState: state })

        // Success — update tracking state
        const now = Date.now()
        lastUploadedAtRef.current = now
        setLastUploadedAt(now)
        setUploadStatus('success')
        setHasPendingUpload(false)
        pendingPointRef.current = null
        isFirstUploadRef.current = false

        onUploadSuccessRef.current?.(result)
      } catch (err: any) {
        // Failure — store latest point as pending (latest-only: overwrite any previous)
        pendingPointRef.current = point
        setHasPendingUpload(true)
        setUploadStatus(navigator.onLine ? 'error' : 'offline')

        onUploadErrorRef.current?.(err instanceof Error ? err : new Error(String(err)))
      } finally {
        isUploadingRef.current = false
      }
    },
    [],
  )

  // ── Evaluate and upload on new position ───────────────────────────────────

  useEffect(() => {
    if (!isSessionLive || !latestPosition || locationReadiness !== 'granted') return
    if (!sessionId || !nganyaId) return

    const decision = shouldUploadLocation({
      current: latestPosition,
      lastUploaded: lastUploadedPositionRef.current,
      lastUploadedAt: lastUploadedAtRef.current,
      clientState: clientStateRef.current,
      isFirstUpload: isFirstUploadRef.current,
      isFinalUpload: false,
    })

    if (!decision.should) return

    // Capture the state at decision time before the async call
    const stateAtDecision = clientStateRef.current

    // After a recovery upload, revert to foreground
    if (stateAtDecision === 'recovered') {
      clientStateRef.current = 'foreground'
      setClientState('foreground')
    }

    // Update last uploaded position immediately (optimistic — prevents double-fire)
    lastUploadedPositionRef.current = latestPosition

    const payload = normalizeLocationPayload(latestPosition)
    void executeUpload(payload, stateAtDecision)
  }, [latestPosition, isSessionLive, locationReadiness, sessionId, nganyaId, executeUpload])

  // ── Idle heartbeat — upload even when stationary ───────────────────────────
  // Fires at IDLE_MAX_INTERVAL_MS to keep the session alive when crew isn't moving.
  // shouldUploadLocation's FOREGROUND_MAX_INTERVAL_MS handles the normal case;
  // this is a safety net for when no new GPS fixes arrive.

  useEffect(() => {
    if (!isSessionLive || !sessionId || !nganyaId) return

    const id = setInterval(() => {
      if (!latestPosition || locationReadiness !== 'granted') return
      if (isUploadingRef.current) return

      const timeSince = lastUploadedAtRef.current
        ? Date.now() - lastUploadedAtRef.current
        : Infinity

      if (timeSince >= UPLOAD_THRESHOLDS.IDLE_MAX_INTERVAL_MS) {
        lastUploadedPositionRef.current = latestPosition
        const payload = normalizeLocationPayload(latestPosition)
        void executeUpload(payload, clientStateRef.current)
      }
    }, 10_000) // check every 10 s; only fires if idle threshold exceeded

    return () => clearInterval(id)
  }, [isSessionLive, sessionId, nganyaId, latestPosition, locationReadiness, executeUpload])

  // ── Upload age ticker ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!lastUploadedAt) return
    const id = setInterval(() => {
      setLastUploadAgeMs(Date.now() - lastUploadedAt)
    }, 5_000)
    return () => clearInterval(id)
  }, [lastUploadedAt])

  // ── Visibility handling ────────────────────────────────────────────────────

  useEffect(() => {
    if (!isSessionLive) return

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clientStateRef.current = 'backgrounded'
        setClientState('backgrounded')

        // Best-effort background heartbeat — send latest position if available
        if (latestPosition && locationReadiness === 'granted' && sessionId && nganyaId) {
          lastUploadedPositionRef.current = latestPosition
          const payload = normalizeLocationPayload(latestPosition)
          void executeUpload(payload, 'backgrounded')
        }
      } else if (document.visibilityState === 'visible') {
        // Mark as recovered — next position evaluation will force an upload
        clientStateRef.current = 'recovered'
        setClientState('recovered')

        // If there's a pending point from a failed upload, retry it now
        if (pendingPointRef.current && navigator.onLine) {
          const point = pendingPointRef.current
          void executeUpload(point, 'recovered')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isSessionLive, latestPosition, locationReadiness, sessionId, nganyaId, executeUpload])

  // ── Online/offline handling ────────────────────────────────────────────────

  useEffect(() => {
    const handleOffline = () => {
      clientStateRef.current = 'offline'
      setClientState('offline')
      setUploadStatus('offline')
    }

    const handleOnline = () => {
      // Transition: offline → recovered (will trigger upload on next position)
      if (clientStateRef.current === 'offline') {
        clientStateRef.current = 'recovered'
        setClientState('recovered')
      }
      // Flush pending point immediately
      if (pendingPointRef.current) {
        const point = pendingPointRef.current
        void executeUpload(point, 'recovered')
      } else {
        setUploadStatus('idle')
      }
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [executeUpload])

  // ── Reset on session change ────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId) {
      // Session ended — reset all uploader state
      lastUploadedPositionRef.current = null
      lastUploadedAtRef.current = null
      pendingPointRef.current = null
      isUploadingRef.current = false
      isFirstUploadRef.current = true
      clientStateRef.current = 'foreground'
      setUploadStatus('idle')
      setClientState('foreground')
      setLastUploadedAt(null)
      setLastUploadAgeMs(0)
      setHasPendingUpload(false)
    } else {
      // New session — mark as first upload
      isFirstUploadRef.current = true
    }
  }, [sessionId])

  // ── retryNow ───────────────────────────────────────────────────────────────

  const retryNow = useCallback(() => {
    if (pendingPointRef.current) {
      const point = pendingPointRef.current
      void executeUpload(point, clientStateRef.current)
    } else if (latestPosition && locationReadiness === 'granted') {
      lastUploadedPositionRef.current = latestPosition
      const payload = normalizeLocationPayload(latestPosition)
      void executeUpload(payload, clientStateRef.current)
    }
  }, [latestPosition, locationReadiness, executeUpload])

  return {
    uploadStatus,
    clientState,
    lastUploadedAt,
    lastUploadAgeMs,
    hasPendingUpload,
    retryNow,
  }
}
