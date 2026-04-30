/**
 * TrackingMapMarkers — Uber-inspired map markers for react-map-gl/maplibre.
 *
 * Marker hierarchy:
 *
 *  NganyaMarker  — White teardrop pin; optional circular profile photo or matatu SVG.
 *    - Signal ring colour: LIVE=neon-green, ESTIMATED=amber, STALE=grey
 *    - `heading` rotates the matatu SVG only (photo stays upright)
 *    - Optional `name` shows an always-visible label above the pin
 *    - Motion trail: short fading arc behind the direction of travel (LIVE only)
 *    - Pulse halo rings on LIVE signal (removed via prefers-reduced-motion)
 *
 *  StageMarker   — MATWANA-pink teardrop with floating name label above it.
 *
 *  UserMarker    — Blue dot + accuracy ring + optional heading cone.
 *    - `accuracy` prop (metres) sizes the outer ring proportionally
 *    - `heading` prop renders a semi-transparent direction cone
 *
 * Optional `imageUrl` loads the nganya profile / cover photo inside the pin
 * (external URL from Supabase storage or CDN).
 */

import { useState, useEffect, type CSSProperties } from 'react'
import type { TrackingSignalType } from '@/lib/types/tracking'

// ─── Signal type config ───────────────────────────────────────────────────────

const SIGNAL_RING: Record<TrackingSignalType, {
  ring: string
  glow: string
  opacity: number
  pulse: boolean
}> = {
  LIVE: {
    ring: '#22c55e',
    glow: '0 0 0 1px #22c55e, 0 4px 16px rgba(34,197,94,0.55), 0 2px 6px rgba(0,0,0,0.35)',
    opacity: 1,
    pulse: true,
  },
  ESTIMATED: {
    ring: '#f59e0b',
    glow: '0 0 0 1px #f59e0b, 0 4px 12px rgba(245,158,11,0.4), 0 2px 6px rgba(0,0,0,0.3)',
    opacity: 1,
    pulse: false,
  },
  STALE: {
    ring: '#6b7280',
    glow: '0 2px 8px rgba(0,0,0,0.3)',
    opacity: 0.55,
    pulse: false,
  },
}

// ─── Matatu top-down SVG ──────────────────────────────────────────────────────

/**
 * Detailed top-down render of a Kenyan 14-seater Toyota HiAce / Nissan Caravan.
 * Front of the vehicle faces UP (North) when heading = 0°.
 * Heading rotation is applied to this SVG only — the teardrop pin does not rotate.
 *
 * Visual elements:
 *   - Cream/white body with a distinctive gold side stripe
 *   - Blue windshield (front) and tinted rear window
 *   - Three rows of side windows
 *   - Roof rack outline
 *   - Four wheels at the corners
 */
function MatatuTopDown({
  size,
  heading,
  dimmed = false,
}: {
  size: number
  heading: number | null
  dimmed?: boolean
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: heading !== null ? `rotate(${heading}deg)` : undefined,
        transition: 'transform 0.4s ease',
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      <svg
        width={size * 0.78}
        height={size * 0.78}
        viewBox="0 0 32 50"
        fill="none"
        aria-hidden="true"
      >
        {/* ── Body ─────────────────────────────────────── */}
        <rect x="5" y="2" width="22" height="46" rx="4" fill="#f0ece6" />

        {/* ── Roof rack (subtle outline on body) ────────── */}
        <rect
          x="9"
          y="6"
          width="14"
          height="34"
          rx="2"
          stroke="#c8bfb4"
          strokeWidth="0.8"
          fill="none"
        />

        {/* ── Side stripe (gold — typical Nairobi matatu) ── */}
        <rect x="5" y="19" width="22" height="5" fill="#f59e0b" opacity="0.9" />

        {/* ── Front windshield ──────────────────────────── */}
        <rect x="7" y="3" width="18" height="9" rx="2.5" fill="#7dd3fc" opacity="0.95" />

        {/* ── Rear window ──────────────────────────────── */}
        <rect x="7" y="38" width="18" height="6" rx="1.5" fill="#7dd3fc" opacity="0.6" />

        {/* ── Left side windows (3 rows) ────────────────── */}
        <rect x="4" y="13" width="4" height="4.5" rx="1" fill="#7dd3fc" opacity="0.65" />
        <rect x="4" y="26" width="4" height="4.5" rx="1" fill="#7dd3fc" opacity="0.65" />
        <rect x="4" y="33" width="4" height="4" rx="1" fill="#7dd3fc" opacity="0.5" />

        {/* ── Right side windows (3 rows) ───────────────── */}
        <rect x="24" y="13" width="4" height="4.5" rx="1" fill="#7dd3fc" opacity="0.65" />
        <rect x="24" y="26" width="4" height="4.5" rx="1" fill="#7dd3fc" opacity="0.65" />
        <rect x="24" y="33" width="4" height="4" rx="1" fill="#7dd3fc" opacity="0.5" />

        {/* ── Front grille ─────────────────────────────── */}
        <rect x="10" y="2" width="12" height="1.5" rx="0.75" fill="#b0a89c" />

        {/* ── Direction indicator triangle (front) ───────── */}
        <polygon points="16,0 14,3 18,3" fill="#f59e0b" opacity="0.9" />

        {/* ── Wheels ───────────────────────────────────── */}
        {/* Front-left */}
        <rect x="2" y="5" width="4.5" height="7" rx="1.5" fill="#1e293b" />
        {/* Front-right */}
        <rect x="25.5" y="5" width="4.5" height="7" rx="1.5" fill="#1e293b" />
        {/* Rear-left */}
        <rect x="2" y="37" width="4.5" height="8" rx="1.5" fill="#1e293b" />
        {/* Rear-right */}
        <rect x="25.5" y="37" width="4.5" height="8" rx="1.5" fill="#1e293b" />

        {/* ── Wheel hubcaps ─────────────────────────────── */}
        <circle cx="4.25" cy="8.5" r="1.2" fill="#475569" />
        <circle cx="27.75" cy="8.5" r="1.2" fill="#475569" />
        <circle cx="4.25" cy="41" r="1.2" fill="#475569" />
        <circle cx="27.75" cy="41" r="1.2" fill="#475569" />
      </svg>
    </div>
  )
}

// ─── Motion trail ─────────────────────────────────────────────────────────────

/**
 * A short fading gradient trail behind the marker in the opposite direction
 * of travel. Only shown when signalType is LIVE.
 */
function MotionTrail({ heading }: { heading: number | null }) {
  if (heading === null) return null

  // Trail extends opposite to direction of travel
  const trailAngle = (heading + 180) % 360

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 3,
        height: 28,
        marginLeft: -1.5,
        marginTop: 0,
        transformOrigin: 'top center',
        transform: `rotate(${trailAngle}deg)`,
        background:
          'linear-gradient(to bottom, rgba(34,197,94,0.6) 0%, rgba(34,197,94,0) 100%)',
        borderRadius: 2,
        pointerEvents: 'none',
      }}
    />
  )
}

// ─── Name chips above pins (nganya + stage) ────────────────────────────────
/** Shared label style so matatu and stage names align visually on the map. */
function getMarkerNameChipStyle(kind: 'nganya' | 'stage'): CSSProperties {
  return {
    backgroundColor: 'rgba(10, 10, 15, 0.96)',
    color: '#f4f4f5',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.03em',
    padding: '6px 12px',
    minWidth: 36,
    minHeight: 28,
    borderRadius: 10,
    whiteSpace: 'nowrap',
    maxWidth: 160,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1.35,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    boxSizing: 'border-box',
    marginBottom: 6,
    backdropFilter: 'blur(10px)',
    boxShadow: '0 2px 14px rgba(0,0,0,0.55)',
    pointerEvents: 'none',
    border:
      kind === 'nganya'
        ? '1px solid rgba(57, 255, 20, 0.4)'
        : '1px solid rgba(255, 45, 120, 0.55)',
  }
}

// ─── Teardrop pin shell ───────────────────────────────────────────────────────

function TearDropPin({
  size = 52,
  bgColor = '#ffffff',
  ringColor = '#22c55e',
  ringWidth = 3,
  boxShadow,
  opacity = 1,
  pulse = false,
  children,
}: {
  size?: number
  bgColor?: string
  ringColor?: string
  ringWidth?: number
  boxShadow?: string
  opacity?: number
  pulse?: boolean
  children: React.ReactNode
}) {
  const tailW = Math.round(size * 0.22)
  const tailH = Math.round(size * 0.28)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity,
        filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.4))',
      }}
    >
      {/* LIVE pulse halo */}
      {pulse && (
        <span
          className="animate-ping"
          style={{
            position: 'absolute',
            width: size + 20,
            height: size + 20,
            borderRadius: '50%',
            backgroundColor: ringColor,
            opacity: 0.15,
            top: -10,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Circular head */}
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: bgColor,
          border: `${ringWidth}px solid ${ringColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: boxShadow ?? '0 2px 8px rgba(0,0,0,0.35)',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>

      {/* Pointed tail */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: `${tailW}px solid transparent`,
          borderRight: `${tailW}px solid transparent`,
          borderTop: `${tailH}px solid ${bgColor}`,
          marginTop: -1,
        }}
      />
    </div>
  )
}

// ─── NganyaMarker ─────────────────────────────────────────────────────────────

interface NganyaMarkerProps {
  signalType: TrackingSignalType
  /** Compass heading in degrees [0-360). null = stationary / unknown. */
  heading?: number | null
  size?: number
  /** Public image URL — shows circular photo instead of matatu SVG when load succeeds */
  imageUrl?: string | null
  /** When set, a name chip is always shown above the pin (map picker UX) */
  name?: string | null
}

function PinFace({
  size,
  heading,
  dimmed,
  imageUrl,
  imgFailed,
  onImgError,
}: {
  size: number
  heading: number | null
  dimmed: boolean
  imageUrl: string | null
  imgFailed: boolean
  onImgError: () => void
}) {
  const showPhoto = imageUrl && !imgFailed

  if (showPhoto) {
    return (
      <img
        src={imageUrl}
        alt=""
        width={Math.round(size * 0.9)}
        height={Math.round(size * 0.9)}
        onError={onImgError}
        style={{
          width: size * 0.9,
          height: size * 0.9,
          borderRadius: '50%',
          objectFit: 'cover',
          objectPosition: 'center',
          display: 'block',
          opacity: dimmed ? 0.55 : 1,
        }}
      />
    )
  }

  return (
    <MatatuTopDown
      size={size}
      heading={heading}
      dimmed={dimmed}
    />
  )
}

export function NganyaMarker({
  signalType,
  heading = null,
  size = 52,
  imageUrl = null,
  name = null,
}: NganyaMarkerProps) {
  const cfg = SIGNAL_RING[signalType]
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setImgFailed(false)
  }, [imageUrl])

  const label = name?.trim() ?? ''
  const showLabel = label.length > 0

  const pinBlock = (
    <div style={{ position: 'relative' }}>
      {signalType === 'LIVE' && <MotionTrail heading={heading} />}

      <TearDropPin
        size={size}
        bgColor="#ffffff"
        ringColor={cfg.ring}
        ringWidth={signalType === 'STALE' ? 2 : 3}
        boxShadow={cfg.glow}
        opacity={cfg.opacity}
        pulse={cfg.pulse}
      >
        <PinFace
          size={size}
          heading={heading}
          dimmed={signalType === 'STALE'}
          imageUrl={imageUrl}
          imgFailed={imgFailed}
          onImgError={() => setImgFailed(true)}
        />
      </TearDropPin>
    </div>
  )

  if (!showLabel) {
    return pinBlock
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={getMarkerNameChipStyle('nganya')}>
        {label}
      </div>
      {pinBlock}
    </div>
  )
}

// ─── StageMarker ──────────────────────────────────────────────────────────────

interface StageMarkerProps {
  name: string
  size?: number
}

export function StageMarker({ name, size = 40 }: StageMarkerProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Floating name label above the pin */}
      <div style={getMarkerNameChipStyle('stage')}>
        {name}
      </div>

      <TearDropPin
        size={size}
        bgColor="#ff2d78"
        ringColor="#ff2d78"
        ringWidth={0}
        boxShadow="0 4px 16px rgba(255,45,120,0.6)"
      >
        {/* Map pin icon */}
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="white" aria-hidden="true">
          <path d="M12 2C8.686 2 6 4.686 6 8c0 5 6 12 6 12s6-7 6-12c0-3.314-2.686-6-6-6zm0 8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
        </svg>
      </TearDropPin>
    </div>
  )
}

// ─── UserMarker ───────────────────────────────────────────────────────────────

interface UserMarkerProps {
  /**
   * GPS accuracy in metres. Sizes the outer accuracy ring.
   * null = unknown accuracy; renders a fixed-size ripple.
   */
  accuracy?: number | null
  /**
   * Device compass heading in degrees [0-360). Renders a direction cone when set.
   * null = heading unavailable (omits the cone).
   */
  heading?: number | null
}

/**
 * Map accuracy (metres) to an outer ring pixel diameter.
 * 10m → ~24px, 50m → ~40px, 200m → ~60px. Clamped to [24, 80].
 */
function accuracyToDiameter(accuracy: number): number {
  // Rough proportional mapping — not pixel-perfect geographically,
  // but gives a clear visual impression of accuracy quality
  return Math.min(80, Math.max(24, 24 + accuracy * 0.28))
}

export function UserMarker({ accuracy = null, heading = null }: UserMarkerProps) {
  const outerDiam = accuracy !== null ? accuracyToDiameter(accuracy) : 52
  const containerSize = Math.max(outerDiam, 60) // big enough for cone too

  return (
    <div
      style={{
        position: 'relative',
        width: containerSize,
        height: containerSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Accuracy ring — sized by GPS accuracy */}
      <div
        style={{
          position: 'absolute',
          width: outerDiam,
          height: outerDiam,
          borderRadius: '50%',
          backgroundColor: 'rgba(59,130,246,0.12)',
          border: '1.5px solid rgba(59,130,246,0.3)',
        }}
      />

      {/* Slow outer pulse */}
      <span
        className="animate-ping"
        style={{
          position: 'absolute',
          width: outerDiam,
          height: outerDiam,
          borderRadius: '50%',
          backgroundColor: 'rgba(59,130,246,0.08)',
          animationDuration: '2.5s',
          pointerEvents: 'none',
        }}
      />

      {/* Heading cone — semi-transparent wedge pointing direction of travel */}
      {heading !== null && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 0,
            height: 0,
            transformOrigin: 'bottom center',
            transform: `translate(-50%, -100%) rotate(${heading}deg)`,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderBottom: '28px solid rgba(59,130,246,0.35)',
            marginTop: -8,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Core blue dot */}
      <span
        style={{
          position: 'relative',
          zIndex: 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          border: '3px solid #ffffff',
          boxShadow:
            '0 0 0 2px rgba(59,130,246,0.45), 0 2px 10px rgba(0,0,0,0.4)',
          flexShrink: 0,
        }}
      />
    </div>
  )
}
