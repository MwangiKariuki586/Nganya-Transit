import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, MapPin, Minus, Plus, Radio, ShieldAlert } from 'lucide-react'
import StagePicker from '@/components/features/StagePicker'
import Button from '@/components/ui/Button'
import { stageRepository } from '@/entities/stage/repository'
import { crewLiveService } from '@/features/crew-live/services/crew-live-service'
import { nganyaRegistrationService } from '@/features/nganya-registration/services/nganya-registration-service'
import { CrewActiveSessionBanner } from '@/modules/crew/components/CrewActiveSessionBanner'
import { CrewReadinessCard } from '@/modules/crew/components/CrewReadinessCard'
import { DirectionToggle, type CrewDirectionValue } from '@/modules/crew/components/DirectionToggle'
import { SeatsQuickButtons } from '@/modules/crew/components/SeatsQuickButtons'
import {
  clearCrewActiveSessionId,
  readCrewSetupDraft,
  writeCrewActiveSessionId,
  writeCrewSetupDraft,
} from '@/modules/crew/lib/storage'

type PermissionStateLocal = 'prompt' | 'granted' | 'denied' | 'unsupported'
type NetworkStateLocal = 'healthy' | 'poor' | 'offline'

interface Coords {
  lat: number
  lng: number
  accuracy: number | null
}

interface StageOption {
  id: string
  name: string
  location: unknown
}

interface StartStageChoice {
  id: string
  name: string
  source: 'auto' | 'manual'
}

function clampSeats(value: number) {
  return Math.max(0, Math.min(20, value))
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString()
}

function getDirectionLabels(corridorName: string | null | undefined) {
  return {
    toTown: '? Town',
    fromTown: corridorName ? `? ${corridorName}` : '? Terminal',
  }
}

function parsePoint(location: unknown): { lat: number, lng: number } | null {
  if (!location) return null

  if (typeof location === 'string') {
    const pointMatch = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i)
    if (pointMatch) {
      return { lng: Number(pointMatch[1]), lat: Number(pointMatch[2]) }
    }

    try {
      const parsed = JSON.parse(location)
      if (parsed?.type === 'Point' && Array.isArray(parsed.coordinates) && parsed.coordinates.length >= 2) {
        return { lng: Number(parsed.coordinates[0]), lat: Number(parsed.coordinates[1]) }
      }
    } catch {
      return null
    }
  }

  if (typeof location === 'object' && location !== null) {
    const geo = location as any
    if (geo?.type === 'Point' && Array.isArray(geo.coordinates) && geo.coordinates.length >= 2) {
      return { lng: Number(geo.coordinates[0]), lat: Number(geo.coordinates[1]) }
    }

    if (typeof geo.lat === 'number' && typeof geo.lng === 'number') {
      return { lat: geo.lat, lng: geo.lng }
    }

    if (typeof geo.latitude === 'number' && typeof geo.longitude === 'number') {
      return { lat: geo.latitude, lng: geo.longitude }
    }
  }

  return null
}

function getDistanceKm(from: Coords, to: { lat: number, lng: number }) {
  const toRad = (degrees: number) => degrees * (Math.PI / 180)
  const earthKm = 6371
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * earthKm * Math.asin(Math.sqrt(a))
}

function detectNearestStage(stages: StageOption[], coords: Coords | null): StartStageChoice | null {
  if (!coords || !stages.length) return null

  let bestStage: StageOption | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const stage of stages) {
    const stagePoint = parsePoint(stage.location)
    if (!stagePoint) continue

    const distance = getDistanceKm(coords, stagePoint)
    if (distance < bestDistance) {
      bestDistance = distance
      bestStage = stage
    }
  }

  if (!bestStage) return null

  return {
    id: bestStage.id,
    name: bestStage.name,
    source: 'auto',
  }
}

function getLocationPoint(coords: Coords) {
  return `POINT(${coords.lng} ${coords.lat})`
}

function getGpsQuality(accuracy: number | null): 'good' | 'weak' | null {
  if (accuracy == null || !Number.isFinite(accuracy)) return null
  return accuracy <= 50 ? 'good' : 'weak'
}

export default function CrewLiveSetupScreen() {
  const navigate = useNavigate()
  const permissionWatcherRef = useRef<PermissionStatus | null>(null)

  const [assignment, setAssignment] = useState<any>(null)
  const [registrationRequest, setRegistrationRequest] = useState<any>(null)
  const [activeSession, setActiveSession] = useState<any>(null)
  const [lastLiveAt, setLastLiveAt] = useState<string | null>(null)
  const [direction, setDirection] = useState<CrewDirectionValue | null>(null)
  const [seatsLeft, setSeatsLeft] = useState(10)
  const [permissionStatus, setPermissionStatus] = useState<PermissionStateLocal>('prompt')
  const [coords, setCoords] = useState<Coords | null>(null)
  const [lastFixAt, setLastFixAt] = useState<string | null>(null)
  const [networkStatus, setNetworkStatus] = useState<NetworkStateLocal>(
    typeof navigator === 'undefined' || navigator.onLine ? 'healthy' : 'offline',
  )
  const [networkMessage, setNetworkMessage] = useState<string | null>(null)
  const [isMobileReadinessExpanded, setIsMobileReadinessExpanded] = useState(false)
  const [isStagePickerOpen, setIsStagePickerOpen] = useState(false)
  const [stages, setStages] = useState<StageOption[]>([])
  const [selectedStartStage, setSelectedStartStage] = useState<StartStageChoice | null>(null)
  const [showAssignmentHelp, setShowAssignmentHelp] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [isEndingActive, setIsEndingActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const captureLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setPermissionStatus('unsupported')
      throw new Error('This browser does not support geolocation.')
    }

    return new Promise<Coords>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
          }

          setCoords(nextCoords)
          setPermissionStatus('granted')
          setLastFixAt(new Date().toISOString())
          setError(null)
          resolve(nextCoords)
        },
        () => {
          setPermissionStatus('denied')
          reject(new Error('Location permission is required to go Live.'))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        },
      )
    })
  }, [])

  const loadSetup = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [setupData, history, requests] = await Promise.all([
        crewLiveService.getSetupData(),
        crewLiveService.listHistory(1),
        nganyaRegistrationService.listMyRequests({ limit: 1 }),
      ])

      const draft = readCrewSetupDraft()
      const nextAssignment = setupData.assignment || null

      setAssignment(nextAssignment)
      setActiveSession(setupData.activeSession || null)
      setRegistrationRequest(requests?.[0] || null)
      setLastLiveAt(history?.[0]?.ended_at || history?.[0]?.started_at || null)
      setDirection(draft?.direction || null)
      setSeatsLeft(clampSeats(draft?.seatsLeft ?? 10))
      setShowAssignmentHelp(false)
    } catch (loadError: any) {
      setError(loadError?.message || 'Failed to load your assigned nganya.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSetup()
  }, [loadSetup])

  useEffect(() => {
    if (!assignment?.corridor_id) {
      setStages([])
      return
    }

    let active = true

    stageRepository.listByCorridor(assignment.corridor_id)
      .then((data) => {
        if (!active) return
        setStages((data || []) as StageOption[])
      })
      .catch(() => {
        if (!active) return
        setStages([])
      })

    return () => {
      active = false
    }
  }, [assignment?.corridor_id])

  useEffect(() => {
    if (typeof navigator === 'undefined') return

    const handleOnline = () => {
      setNetworkStatus('healthy')
      setNetworkMessage(null)
    }

    const handleOffline = () => {
      setNetworkStatus('offline')
      setNetworkMessage('Offline. Reconnect before starting Live.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (typeof navigator === 'undefined') return

    if (!navigator.geolocation) {
      setPermissionStatus('unsupported')
      return
    }

    if (!('permissions' in navigator) || !navigator.permissions?.query) {
      setPermissionStatus('prompt')
      return
    }

    let active = true

    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (!active) return

        permissionWatcherRef.current = status
        const nextStatus = status.state === 'granted'
          ? 'granted'
          : status.state === 'denied'
            ? 'denied'
            : 'prompt'

        setPermissionStatus(nextStatus)

        if (nextStatus === 'granted') {
          void captureLocation().catch(() => null)
        }

        status.onchange = () => {
          const updatedStatus = status.state === 'granted'
            ? 'granted'
            : status.state === 'denied'
              ? 'denied'
              : 'prompt'

          setPermissionStatus(updatedStatus)

          if (updatedStatus === 'granted') {
            void captureLocation().catch(() => null)
          }
        }
      })
      .catch(() => {
        setPermissionStatus('prompt')
      })

    return () => {
      active = false
      if (permissionWatcherRef.current) {
        permissionWatcherRef.current.onchange = null
      }
    }
  }, [captureLocation])

  useEffect(() => {
    if (!assignment) return
    writeCrewSetupDraft({
      direction,
      seatsLeft,
    })
  }, [assignment, direction, seatsLeft])

  const autoDetectedStage = useMemo(
    () => detectNearestStage(stages, coords),
    [coords, stages],
  )

  useEffect(() => {
    if (!autoDetectedStage) return

    setSelectedStartStage((current) => {
      if (current?.source === 'manual') {
        return current
      }

      if (current?.id === autoDetectedStage.id && current?.source === 'auto') {
        return current
      }

      return autoDetectedStage
    })
  }, [autoDetectedStage])

  const corridorName = assignment?.corridors?.name || registrationRequest?.corridors?.name || 'Unknown terminal'
  const directionLabels = getDirectionLabels(corridorName)
  const controlsReady = Boolean(direction && Number.isFinite(seatsLeft))
  const canStart = Boolean(assignment?.id && permissionStatus === 'granted' && controlsReady)
  const gpsQuality = getGpsQuality(coords?.accuracy ?? null)
  const mobileReadinessCollapsed = Boolean(assignment) && !isMobileReadinessExpanded
  const stickyHelperText = !assignment
    ? 'Assignment missing. Register or request mapping first.'
    : permissionStatus !== 'granted'
      ? 'Enable location to start Live.'
      : !direction
        ? 'Choose direction to continue.'
        : `${assignment.name} | ${direction === 'TO_TOWN' ? directionLabels.toTown : directionLabels.fromTown} | ${seatsLeft === 0 ? 'Full' : `${seatsLeft} seats left`}`

  const readinessItems = [
    {
      id: 'assignment',
      label: 'Assigned nganya',
      status: assignment ? 'done' : 'error',
      detail: assignment ? `${assignment.name} on ${corridorName}` : 'Missing assignment. Register or request mapping first.',
    },
    {
      id: 'location',
      label: 'Location permission',
      status: permissionStatus === 'granted'
        ? 'done'
        : permissionStatus === 'denied' || permissionStatus === 'unsupported'
          ? 'error'
          : 'pending',
      detail: permissionStatus === 'granted'
        ? 'Permission granted and ready to share only while Live.'
        : permissionStatus === 'denied'
          ? 'Permission blocked. Open settings and retry.'
          : permissionStatus === 'unsupported'
            ? 'This browser cannot provide geolocation.'
            : 'Permission not granted yet.',
    },
    {
      id: 'network',
      label: 'Network',
      status: networkStatus === 'healthy' ? 'done' : networkStatus === 'poor' ? 'warning' : 'error',
      detail: networkStatus === 'healthy'
        ? 'Connection looks stable.'
        : networkStatus === 'poor'
          ? 'Signal looks weak. Start may retry.'
          : 'Offline right now.',
    },
    {
      id: 'controls',
      label: 'Controls set',
      status: controlsReady ? 'done' : 'pending',
      detail: controlsReady
        ? `${direction === 'TO_TOWN' ? directionLabels.toTown : directionLabels.fromTown} | ${seatsLeft === 0 ? 'Full (0 seats)' : `${seatsLeft} seats left`}`
        : 'Direction is still required.',
    },
  ] as const

  const assignmentThumb = assignment?.nganya_media?.[0]?.media_url || registrationRequest?.nganya_registration_request_media?.[0]?.media_url || null
  const assignmentPlateLast4 = registrationRequest?.plate_last4 || null
  const assignmentSacco = registrationRequest?.sacco || null

  const handleStart = async () => {
    if (!assignment?.id || !assignment?.corridor_id) {
      setError('This crew account has no valid nganya assignment yet.')
      return
    }

    if (permissionStatus !== 'granted') {
      setError('Enable location before going Live.')
      return
    }

    if (!direction) {
      setError('Choose your direction before going Live.')
      return
    }

    setIsStarting(true)
    setError(null)

    try {
      const liveCoords = coords || await captureLocation()
      const session = await crewLiveService.startSession({
        nganyaId: assignment.id,
        corridorId: assignment.corridor_id,
        direction,
        seatsLeft,
        lastLocation: getLocationPoint(liveCoords),
      })

      setNetworkStatus('healthy')
      setNetworkMessage(null)
      writeCrewActiveSessionId(session.id)
      navigate({ to: '/crew/session/$id', params: { id: session.id } })
    } catch (startError: any) {
      const message = startError?.message || 'Failed to start live session.'

      if (!navigator.onLine) {
        setNetworkStatus('offline')
        setNetworkMessage('Offline. Reconnect before starting Live.')
      } else {
        setNetworkStatus('poor')
        setNetworkMessage('Start failed. Retrying after a stable signal usually fixes this.')
      }

      if (message.includes('NOT_MAPPED') || message.includes('row-level security')) {
        setError('This nganya is not linked to your crew account yet. Contact admin if the assignment is wrong.')
      } else {
        setError(message)
      }
    } finally {
      setIsStarting(false)
    }
  }

  const handleEndActiveSession = async () => {
    if (!activeSession?.id) return

    setIsEndingActive(true)
    setError(null)

    try {
      await crewLiveService.stopSession(activeSession.id)
      clearCrewActiveSessionId()
      setActiveSession(null)
      await loadSetup()
    } catch (stopError: any) {
      setError(stopError?.message || 'Failed to end the active session.')
    } finally {
      setIsEndingActive(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page-container py-10 text-sm text-[var(--color-text-secondary)]">
        Loading crew preflight...
      </div>
    )
  }

  return (
    <div className="page-container max-w-7xl py-8 md:py-10">
      <div className="mb-6 max-w-3xl">
        <p className="text-tag text-[var(--color-accent)]">Crew Live</p>
        <h1 className="text-h1 mt-2 text-white">
          {activeSession ? 'You’re currently Live' : 'Go live fast'}
        </h1>
        <p className="text-body mt-3 max-w-2xl text-[var(--color-text-secondary)]">
          {activeSession
            ? 'Resume your current session or end it before starting another one.'
            : 'Your assigned nganya is locked in. Set direction, confirm seats, allow location, then start broadcasting.'}
        </p>
      </div>

      {activeSession ? (
        <div className="space-y-4">
          <CrewActiveSessionBanner
            session={activeSession}
            isEnding={isEndingActive}
            onEnd={() => {
              void handleEndActiveSession()
            }}
          />
          {error ? (
            <div className="rounded-[var(--radius-lg)] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {error ? (
            <div className="mb-4 rounded-[var(--radius-lg)] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="xl:grid xl:grid-cols-[minmax(0,1.1fr)_390px] xl:items-start xl:gap-6">
            <div className="space-y-4">
              <section className="rounded-[28px] border border-white/[0.08] bg-[rgba(23,23,31,0.94)] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.28)] md:p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-start">
                  <div className="h-28 w-full overflow-hidden rounded-[22px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] md:h-32 md:w-44">
                    {assignmentThumb ? (
                      <img src={assignmentThumb} alt={assignment?.name || 'Assigned nganya'} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-caption text-[var(--color-text-tertiary)]">
                        No image yet
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-[999px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-1 text-caption text-[var(--color-text-secondary)]">
                        Assigned nganya
                      </div>
                      <div className="rounded-[999px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-1 text-caption text-[var(--color-text-secondary)]">
                        {corridorName}
                      </div>
                      <div className={`rounded-[999px] border px-3 py-1 text-caption ${
                        assignment?.is_verified
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                      }`}>
                        {assignment?.is_verified ? 'Verified' : 'Pending'}
                      </div>
                    </div>

                    <h2 className="mt-3 text-h2 text-white">
                      {assignment?.name || 'Assignment missing'}
                    </h2>

                    {assignment ? (
                      <>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.45)] px-4 py-3">
                            <div className="text-caption text-[var(--color-text-tertiary)]">Plate hint</div>
                            <div className="mt-1 text-sm text-[var(--color-text-primary)]">
                              {assignmentPlateLast4 ? `****${assignmentPlateLast4}` : 'Not available'}
                            </div>
                          </div>
                          <div className="rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.45)] px-4 py-3">
                            <div className="text-caption text-[var(--color-text-tertiary)]">SACCO</div>
                            <div className="mt-1 text-sm text-[var(--color-text-primary)]">
                              {assignmentSacco || 'Not provided'}
                            </div>
                          </div>
                          <div className="rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.45)] px-4 py-3 sm:col-span-2">
                            <div className="text-caption text-[var(--color-text-tertiary)]">Last live</div>
                            <div className="mt-1 text-sm text-[var(--color-text-primary)]">
                              {formatDateTime(lastLiveAt) || 'No previous live session yet'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="mt-4 text-sm text-[var(--color-accent)]"
                          onClick={() => setShowAssignmentHelp((current) => !current)}
                        >
                          Wrong assignment?
                        </button>

                        {showAssignmentHelp ? (
                          <div className="mt-2 rounded-[18px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.4)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                            Share your crew account email with a MATWANA admin if this nganya or route terminal is incorrect.
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="mt-4 rounded-[20px] border border-amber-500/25 bg-amber-500/8 p-4">
                        <div className="flex items-start gap-3">
                          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-300" />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white">No assigned nganya yet</div>
                            <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                              Register or request mapping before you can start a live session.
                            </div>
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                              <Button
                                variant="secondary"
                                className="min-h-[44px] rounded-[16px] px-4 text-sm font-semibold"
                                onClick={() => navigate({ to: '/crew/register', search: { reason: 'mapping-required' } })}
                              >
                                Register / request mapping
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {assignment && permissionStatus === 'granted' ? (
                <section className="rounded-[28px] border border-white/[0.08] bg-[rgba(23,23,31,0.94)] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.28)] md:p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-caption text-[var(--color-text-tertiary)]">Starting near</div>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                        <MapPin className="h-4 w-4 text-[var(--color-accent)]" />
                        <span>
                          {selectedStartStage ? `${selectedStartStage.name} (${selectedStartStage.source === 'auto' ? 'auto' : 'manual'})` : 'Detecting nearest stage...'}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        Auto-detected from your current location on the assigned route.
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      className="min-h-[44px] rounded-[16px] px-4 text-sm font-semibold"
                      onClick={() => setIsStagePickerOpen(true)}
                    >
                      Change
                    </Button>
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="mt-4 space-y-4 xl:sticky xl:top-[calc(var(--top-nav-height)+24px)] xl:mt-0">
              <div className="xl:hidden">
                <CrewReadinessCard
                  items={readinessItems as any}
                  permissionStatus={permissionStatus}
                  lastFixAt={lastFixAt}
                  gpsQuality={gpsQuality}
                  networkStatus={networkStatus}
                  networkMessage={networkMessage}
                  compact
                  collapsed={mobileReadinessCollapsed}
                  onToggle={assignment ? () => setIsMobileReadinessExpanded((current) => !current) : undefined}
                  onEnableLocation={() => {
                    void captureLocation().catch((permissionError: any) => {
                      setError(permissionError?.message || 'Location permission is required to go Live.')
                    })
                  }}
                />
              </div>

              <div className="hidden xl:block">
                <CrewReadinessCard
                  items={readinessItems as any}
                  permissionStatus={permissionStatus}
                  lastFixAt={lastFixAt}
                  gpsQuality={gpsQuality}
                  networkStatus={networkStatus}
                  networkMessage={networkMessage}
                  onEnableLocation={() => {
                    void captureLocation().catch((permissionError: any) => {
                      setError(permissionError?.message || 'Location permission is required to go Live.')
                    })
                  }}
                />
              </div>

              <section className="rounded-[28px] border border-white/[0.08] bg-[rgba(23,23,31,0.94)] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.28)] md:p-6">
                <div className="text-caption text-[var(--color-text-tertiary)]">Direction</div>
                <div className="mt-3">
                  <DirectionToggle
                    value={direction}
                    onChange={setDirection}
                    disabled={!assignment}
                    toTownLabel={directionLabels.toTown}
                    fromTownLabel={directionLabels.fromTown}
                  />
                </div>
                <div className="mt-3 text-body-sm text-[var(--color-text-secondary)]">
                  Choose the direction riders will see in the live feed.
                </div>
              </section>

              <section className="rounded-[28px] border border-white/[0.08] bg-[rgba(23,23,31,0.94)] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.28)] md:p-6">
                <div className="text-caption text-[var(--color-text-tertiary)]">Seats</div>
                <div className="mt-3">
                  <SeatsQuickButtons value={seatsLeft} onChange={(value) => setSeatsLeft(value)} disabled={!assignment} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-primary)]"
                    onClick={() => setSeatsLeft((current) => clampSeats(current - 1))}
                    disabled={!assignment || seatsLeft === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex-1 rounded-[16px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] px-3 py-2 text-center text-body-sm text-[var(--color-text-secondary)]">
                    {seatsLeft === 0 ? 'Full (0 seats)' : `${seatsLeft} seats left`}
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-[var(--glass-border)] bg-[rgba(10,10,15,0.55)] text-[var(--color-text-primary)]"
                    onClick={() => setSeatsLeft((current) => clampSeats(current + 1))}
                    disabled={!assignment}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 text-body-sm text-[var(--color-text-secondary)]">
                  {seatsLeft === 0
                    ? 'Full selected. Consider stopping Live when boarding is fully closed.'
                    : 'Use presets for speed. Fine adjust only when the queue changes quickly.'}
                </div>
              </section>

              <div className="hidden xl:block">
                <Button
                  variant="primary"
                  className="min-h-[48px] w-full rounded-[18px] px-4 text-sm font-semibold disabled:bg-[rgba(109,25,61,0.85)] disabled:text-[var(--color-text-secondary)] disabled:shadow-none"
                  isLoading={isStarting}
                  disabled={!canStart || isLoading}
                  onClick={handleStart}
                >
                  <Radio className="h-4 w-4" />
                  Start Live
                </Button>
              </div>
            </aside>
          </div>

          <div className="h-24 xl:hidden" />

          <div className="fixed inset-x-0 bottom-0 z-[var(--z-fab)] border-t border-[var(--glass-border)] bg-[var(--color-bg-base)]/92 px-4 py-3 backdrop-blur-xl xl:hidden">
            <div className="mx-auto max-w-7xl space-y-3">
              <div className="min-w-0">
                <div className="text-caption text-[var(--color-text-tertiary)]">Ready to go Live</div>
                <div className="truncate text-sm text-[var(--color-text-secondary)]">{stickyHelperText}</div>
              </div>
              <Button
                variant="primary"
                className="min-h-[48px] w-full rounded-[18px] px-4 text-sm font-semibold disabled:bg-[rgba(109,25,61,0.85)] disabled:text-[var(--color-text-secondary)] disabled:shadow-none"
                isLoading={isStarting}
                disabled={!canStart || isLoading}
                onClick={handleStart}
              >
                <Radio className="h-4 w-4" />
                Start Live
              </Button>
            </div>
          </div>

          {assignment ? (
            <StagePicker
              isOpen={isStagePickerOpen}
              onClose={() => setIsStagePickerOpen(false)}
              corridorId={assignment.corridor_id}
              onSelect={(stageId, stageName) => {
                setSelectedStartStage({ id: stageId, name: stageName, source: 'manual' })
                setIsStagePickerOpen(false)
              }}
            />
          ) : null}
        </>
      )}
    </div>
  )
}
