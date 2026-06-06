import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import {
  MATWANA_COLORWAYS,
  type MatwanaColorwayPreset,
} from "@/shared/theme/matwana-colorways";
import { useMatwanaTheme } from "@/shared/theme/MatwanaThemeProvider";
import BottomSheet from "@/components/ui/BottomSheet";

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

/**
 * A single row in the dropdown/sheet list.
 * Shows: swatch · full name · checkmark (if selected)
 */
function ColorwayRow({
  preset,
  selected,
  onSelect,
}: {
  preset: MatwanaColorwayPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={`Choose ${preset.name} colorway`}
      onClick={onSelect}
      className={[
        "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left",
        "transition-colors duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-elevated)]",
        selected
          ? "bg-[var(--color-accent-soft)] text-[var(--color-text-primary)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--color-text-primary)]",
      ].join(" ")}
    >
      {/* Color swatch */}
      <span
        className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
        style={{ backgroundColor: preset.accent }}
        aria-hidden="true"
      />

      {/* Full theme name — never truncated */}
      <span className="flex-1 text-sm font-medium leading-none">
        {preset.name}
      </span>

      {/* Checkmark — always present in DOM, invisible when not selected */}
      <Check
        className={[
          "h-3.5 w-3.5 shrink-0 transition-opacity duration-150",
          selected ? "opacity-100 text-[var(--color-accent)]" : "opacity-0",
        ].join(" ")}
        aria-hidden="true"
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section variant (settings page — unchanged full-card grid)
// ---------------------------------------------------------------------------

function SectionColorwayOption({
  preset,
  selected,
  onSelect,
}: {
  preset: MatwanaColorwayPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Choose ${preset.name} colorway`}
      className={`group rounded-[20px] border bg-[var(--glass-bg)] p-4 text-left transition-all duration-200 ${
        selected
          ? "border-[var(--color-accent)] shadow-[var(--glow-accent-sm)]"
          : "border-[var(--glass-border)] hover:border-[var(--color-accent)]/35 hover:bg-[var(--glass-bg-strong)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 shrink-0 rounded-full border border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
              style={{ backgroundColor: preset.accent }}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              {preset.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{
                backgroundColor: preset.accent,
                color:
                  preset.key === "alcapone" || preset.key === "harukaze"
                    ? "#0A0A0F"
                    : "#FFFFFF",
                boxShadow: `0 0 18px color-mix(in srgb, ${preset.accent} 40%, transparent)`,
              }}
            >
              Accent
            </span>
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {preset.accent}
            </span>
          </div>
        </div>

        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
            selected
              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
              : "border-[var(--glass-border)] text-transparent"
          }`}
          aria-hidden="true"
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Menu variant — compact dropdown selector
// ---------------------------------------------------------------------------

/**
 * The scrollable list of colorway options, shared between the inline dropdown
 * and the mobile BottomSheet.
 */
function ColorwayOptionList({
  currentColorway,
  onSelect,
}: {
  currentColorway: string;
  onSelect: (key: MatwanaColorwayPreset["key"]) => void;
}) {
  return (
    <div
      role="listbox"
      aria-label="MATWANA Colorway options"
      className="flex flex-col gap-0.5"
    >
      {MATWANA_COLORWAYS.map((preset) => (
        <ColorwayRow
          key={preset.key}
          preset={preset}
          selected={preset.key === currentColorway}
          onSelect={() => onSelect(preset.key)}
        />
      ))}
    </div>
  );
}

function MenuColorwaySelector() {
  const { colorway, preset, setColorway } = useMatwanaTheme();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Detect mobile breakpoint (matches Tailwind's `sm` = 640px)
  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 640);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Compute portal dropdown position from trigger rect
  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  // Reposition on open and on scroll/resize
  useEffect(() => {
    if (!open || isMobile) return;
    updateDropdownPosition();
    window.addEventListener("scroll", updateDropdownPosition, true);
    window.addEventListener("resize", updateDropdownPosition);
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [open, isMobile, updateDropdownPosition]);

  // Close desktop dropdown on outside click
  useEffect(() => {
    if (!open || isMobile) return;
    function handlePointer(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [open, isMobile]);

  // Close on Escape (desktop)
  useEffect(() => {
    if (!open || isMobile) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, isMobile]);

  function handleSelect(key: MatwanaColorwayPreset["key"]) {
    setColorway(key);
    setOpen(false);
  }

  // Desktop portal dropdown — rendered at document.body to escape overflow:hidden.
  // data-colorway-portal tells ProfileDropdown's outside-click handler to ignore
  // mousedown events that land here, so the portal isn't torn down before click fires.
  const desktopDropdown =
    open && !isMobile && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={dropdownRef}
            data-colorway-portal=""
            style={dropdownStyle}
            className={[
              "rounded-[var(--radius-md)] border border-[var(--glass-border)]",
              "bg-[var(--color-bg-elevated)] shadow-[var(--shadow-lg)] backdrop-blur-xl",
            ].join(" ")}
          >
            <div className="max-h-[260px] overflow-y-auto overscroll-contain p-1.5">
              <ColorwayOptionList
                currentColorway={colorway}
                onSelect={handleSelect}
              />
            </div>
          </div>,
          document.body,
        )
      : null;

  // Mobile BottomSheet — portals directly to document.body (BottomSheet's own
  // createPortal), but carries data-colorway-portal on its root element so
  // ProfileDropdown's outside-click handler knows to ignore it.
  const mobileSheet = isMobile ? (
    <BottomSheet
      isOpen={open}
      onClose={() => setOpen(false)}
      title="MATWANA Colorway"
      rootProps={
        { "data-colorway-portal": "" } as React.HTMLAttributes<HTMLDivElement>
      }
    >
      <ColorwayOptionList currentColorway={colorway} onSelect={handleSelect} />
    </BottomSheet>
  ) : null;

  return (
    <>
      {/* ── Collapsed trigger row ── */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`MATWANA Colorway: ${preset.name}. Activate to change.`}
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2",
          "transition-colors duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-elevated)]",
          open
            ? "bg-[var(--glass-bg-strong)]"
            : "hover:bg-[var(--glass-bg-strong)]",
        ].join(" ")}
      >
        {/* Current swatch */}
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
          style={{ backgroundColor: preset.accent }}
          aria-hidden="true"
        />

        {/* Current name */}
        <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)]">
          {preset.name}
        </span>

        {/* Chevron */}
        <ChevronDown
          className={[
            "h-3.5 w-3.5 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>

      {desktopDropdown}
      {mobileSheet}
    </>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface MatwanaColorwayPickerProps {
  variant?: "section" | "menu";
}

export function MatwanaColorwayPicker({
  variant = "section",
}: MatwanaColorwayPickerProps) {
  const { colorway, setColorway } = useMatwanaTheme();

  if (variant === "menu") {
    return (
      <section className="border-b border-[var(--glass-border)] px-4 py-3">
        {/* Section label */}
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          MATWANA Colorway
        </p>

        {/* Compact dropdown selector */}
        <MenuColorwaySelector />
      </section>
    );
  }

  // ── Section variant (settings page) — unchanged ──
  return (
    <section className="mt-8">
      <div className="mb-4">
        <p className="text-tag text-[var(--color-accent)]">MATWANA Colorway</p>
        <h2 className="mt-1 text-h3 text-[var(--color-text-primary)]">
          Choose your MATWANA colorway.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          Personalize the accent vibe only. The dark glass base, spacing,
          typography, and semantic system colors stay unchanged.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MATWANA_COLORWAYS.map((preset) => (
          <SectionColorwayOption
            key={preset.key}
            preset={preset}
            selected={preset.key === colorway}
            onSelect={() => setColorway(preset.key)}
          />
        ))}
      </div>
    </section>
  );
}
