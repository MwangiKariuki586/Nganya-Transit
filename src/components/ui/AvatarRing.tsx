/**
 * AvatarRing — Circular progress ring around avatar with
 * a percentage pill badge centered below the ring edge.
 * Reference: Truecaller-style profile completeness indicator.
 */

export type CompletionStatus = "low" | "mid" | "high" | "complete";

export interface CompletenessData {
  percentage: number;
  status: CompletionStatus;
  missingFields: string[];
}

/** Single source of truth for completeness logic */
export function computeCompleteness(fields: {
  fullName: string;
  handle: string;
  bio: string;
  avatarUrl: string;
  coverMediaUrl: string;
}): CompletenessData {
  const checks: { label: string; done: boolean }[] = [
    { label: "Display name", done: !!fields.fullName?.trim() },
    { label: "Handle", done: !!fields.handle?.trim() },
    { label: "Bio", done: !!fields.bio?.trim() },
    { label: "Avatar", done: !!fields.avatarUrl },
    { label: "Cover media", done: !!fields.coverMediaUrl },
  ];

  const completed = checks.filter((c) => c.done).length;
  const percentage = Math.round((completed / checks.length) * 100);
  const missingFields = checks.filter((c) => !c.done).map((c) => c.label);

  let status: CompletionStatus = "low";
  if (percentage >= 100) status = "complete";
  else if (percentage >= 80) status = "high";
  else if (percentage >= 40) status = "mid";

  return { percentage, status, missingFields };
}

// ─── Color helpers ────────────────────────────────────────────
const STROKE_COLOR: Record<CompletionStatus, string> = {
  low: "#5A5A6E", // muted
  mid: "#00F0FF", // cyan
  high: "#FF2D78", // accent
  complete: "#39FF14", // green
};

const PILL_BG: Record<CompletionStatus, string> = {
  low: "rgba(90,90,110,0.85)",
  mid: "rgba(0,240,255,0.15)",
  high: "rgba(255,45,120,0.15)",
  complete: "rgba(57,255,20,0.15)",
};

const PILL_TEXT: Record<CompletionStatus, string> = {
  low: "#8B8B9E",
  mid: "#00F0FF",
  high: "#FF2D78",
  complete: "#39FF14",
};

const PILL_BORDER: Record<CompletionStatus, string> = {
  low: "rgba(90,90,110,0.4)",
  mid: "rgba(0,240,255,0.35)",
  high: "rgba(255,45,120,0.35)",
  complete: "rgba(57,255,20,0.35)",
};

// ─── Component ────────────────────────────────────────────────
interface AvatarRingProps {
  percentage: number;
  status: CompletionStatus;
  /** Avatar diameter in px */
  size?: number;
  children: React.ReactNode;
}

const STROKE_W = 3.5;
const GAP = 5; // gap between avatar edge and ring centre

export default function AvatarRing({
  percentage,
  status,
  size = 96,
  children,
}: AvatarRingProps) {
  // SVG geometry
  const svgSize = size + (STROKE_W + GAP) * 2;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const r = size / 2 + GAP + STROKE_W / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percentage));
  const dashOffset = circumference * (1 - pct / 100);

  const color = STROKE_COLOR[status];
  const isComplete = status === "complete";

  // Glow filter id (unique per instance is fine — same value always)
  const filterId = `ring-glow-${status}`;

  return (
    <div
      className="relative inline-flex flex-col items-center"
      style={{ width: svgSize }}
    >
      {/* ── Ring + Avatar ── */}
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        {/* SVG ring */}
        <svg
          width={svgSize}
          height={svgSize}
          className="absolute inset-0 pointer-events-none"
          style={{ transform: "rotate(-90deg)" }}
          aria-hidden="true"
        >
          <defs>
            {(status === "high" || status === "complete") && (
              <filter
                id={filterId}
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            )}
          </defs>

          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE_W}
          />

          {/* Progress arc */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={STROKE_W}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            filter={
              status === "high" || status === "complete"
                ? `url(#${filterId})`
                : undefined
            }
            style={{
              transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </svg>

        {/* Avatar — centred inside ring */}
        <div
          className="absolute rounded-full overflow-hidden"
          style={{
            top: STROKE_W + GAP,
            left: STROKE_W + GAP,
            width: size,
            height: size,
          }}
        >
          {children}
        </div>
      </div>

      {/* ── Percentage pill — sits just below the ring ── */}
      <div
        className="flex items-center justify-center rounded-full font-semibold"
        style={{
          marginTop: -10, // overlap the bottom of the ring slightly
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 2,
          paddingBottom: 2,
          fontSize: 11,
          lineHeight: "16px",
          letterSpacing: "0.02em",
          background: PILL_BG[status],
          color: PILL_TEXT[status],
          border: `1px solid ${PILL_BORDER[status]}`,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow:
            status === "complete"
              ? "0 0 8px rgba(57,255,20,0.3)"
              : status === "high"
                ? "0 0 8px rgba(255,45,120,0.25)"
                : "none",
          zIndex: 10,
          position: "relative",
        }}
      >
        {isComplete ? "✓ 100%" : `${pct}%`}
      </div>
    </div>
  );
}
