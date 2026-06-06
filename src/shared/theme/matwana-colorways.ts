export const MATWANA_COLORWAY_STORAGE_KEY = "matwana:colorway";

export const MATWANA_COLORWAY_KEYS = [
  "mood",
  "alcapone",
  "harukaze",
  "moxy",
  "matrix",
  "opposite",
  "optimus-prime",
] as const;

export type MatwanaColorwayKey = (typeof MATWANA_COLORWAY_KEYS)[number];

export interface MatwanaColorwayPreset {
  key: MatwanaColorwayKey;
  name: string;
  accent: `#${string}`;
}

export const MATWANA_DEFAULT_COLORWAY: MatwanaColorwayKey = "moxy";

export const MATWANA_COLORWAYS: readonly MatwanaColorwayPreset[] = [
  { key: "mood", name: "Mood", accent: "#871599" },
  { key: "alcapone", name: "Alcapone", accent: "#F7F516" },
  { key: "harukaze", name: "Harukaze", accent: "#E7E9E1" },
  { key: "moxy", name: "Moxy", accent: "#FF2D78" },
  { key: "matrix", name: "Matrix", accent: "#14B013" },
  { key: "opposite", name: "Opposite", accent: "#FE0000" },
  { key: "optimus-prime", name: "Optimus Prime", accent: "#0C5B94" },
] as const;

export type MatwanaThemeCssVariables = Record<
  | "--theme-accent"
  | "--theme-accent-rgb"
  | "--theme-accent-soft"
  | "--theme-accent-glow"
  | "--theme-accent-hover"
  | "--theme-accent-foreground"
  | "--theme-accent-border"
  | "--theme-accent-border-strong"
  | "--theme-accent-subtle"
  | "--theme-accent-vignette"
  | "--theme-accent-aura"
  | "--theme-accent-shadow-soft"
  | "--theme-accent-shadow-strong",
  string
>;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);

  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase() as `#${string}`;
}

function mixChannel(base: number, target: number, amount: number) {
  return base + (target - base) * amount;
}

function mixHex(hex: string, targetHex: string, amount: number) {
  const base = hexToRgb(hex);
  const target = hexToRgb(targetHex);

  return rgbToHex(
    mixChannel(base.r, target.r, amount),
    mixChannel(base.g, target.g, amount),
    mixChannel(base.b, target.b, amount),
  );
}

function getRelativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const toLinear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function toRgba(rgb: { r: number; g: number; b: number }, alpha: number) {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function isMatwanaColorwayKey(value: string): value is MatwanaColorwayKey {
  return MATWANA_COLORWAY_KEYS.includes(value as MatwanaColorwayKey);
}

export function normalizeMatwanaColorwayKey(
  value: string | null | undefined,
): MatwanaColorwayKey {
  return value && isMatwanaColorwayKey(value) ? value : MATWANA_DEFAULT_COLORWAY;
}

export function getMatwanaColorwayPreset(
  key: string | null | undefined,
): MatwanaColorwayPreset {
  const normalized = normalizeMatwanaColorwayKey(key);
  return (
    MATWANA_COLORWAYS.find((preset) => preset.key === normalized) ??
    MATWANA_COLORWAYS.find((preset) => preset.key === MATWANA_DEFAULT_COLORWAY)!
  );
}

export function getMatwanaThemeCssVariables(
  key: string | null | undefined,
): MatwanaThemeCssVariables {
  const preset = getMatwanaColorwayPreset(key);
  const rgb = hexToRgb(preset.accent);
  const luminance = getRelativeLuminance(rgb);
  const accentHover =
    luminance > 0.72
      ? mixHex(preset.accent, "#0A0A0F", 0.16)
      : mixHex(preset.accent, "#FFFFFF", 0.12);
  const accentForeground = luminance > 0.72 ? "#0A0A0F" : "#FFFFFF";

  return {
    "--theme-accent": preset.accent,
    "--theme-accent-rgb": `${rgb.r} ${rgb.g} ${rgb.b}`,
    "--theme-accent-soft": toRgba(rgb, 0.15),
    "--theme-accent-glow": toRgba(rgb, 0.35),
    "--theme-accent-hover": accentHover,
    "--theme-accent-foreground": accentForeground,
    "--theme-accent-border": toRgba(rgb, 0.3),
    "--theme-accent-border-strong": toRgba(rgb, 0.5),
    "--theme-accent-subtle": toRgba(rgb, 0.1),
    "--theme-accent-vignette": toRgba(rgb, 0.18),
    "--theme-accent-aura": toRgba(rgb, 0.1),
    "--theme-accent-shadow-soft": toRgba(rgb, 0.25),
    "--theme-accent-shadow-strong": toRgba(rgb, 0.45),
  };
}

/**
 * A static lookup table of pre-computed CSS variables for every colorway.
 * Serialised into the inline <script> in __root.tsx so the browser can apply
 * the correct theme synchronously — before the first paint — without running
 * any colour-math at runtime.
 *
 * Exported as a plain object literal so it can be JSON.stringify'd at build
 * time and embedded directly in the script tag.
 */
export const MATWANA_COLORWAY_STATIC_MAP: Record<
  MatwanaColorwayKey,
  MatwanaThemeCssVariables
> = Object.fromEntries(
  MATWANA_COLORWAY_KEYS.map((key) => [key, getMatwanaThemeCssVariables(key)]),
) as Record<MatwanaColorwayKey, MatwanaThemeCssVariables>;

