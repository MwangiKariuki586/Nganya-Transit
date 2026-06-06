import { useEffect, useState } from "react";
import StagePicker from "./StagePicker";
import DestinationPicker from "./DestinationPicker";
import SpecificNganyaPicker from "./SpecificNganyaPicker";
import SearchResultsOverlayV2 from "./SearchResultsOverlayV2";
import Chip from "../ui/Chip";
import Button from "../ui/Button";
import { MapPin, Navigation, BusFront, ChevronDown, Clock, X } from "lucide-react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useRecentSearches } from "../../hooks/useRecentSearches";
import { trackEvent } from "../../lib/analytics";

export interface RideSearchPayload {
  fromStage: { id: string; name: string };
  toPlace: { id: string; name: string; corridor_id?: string };
  preference: "ANY" | "NEWEST" | "SPECIFIC";
  preferredNganya: { id: string; name: string } | null;
}

export interface PlannerFiltersValue {
  toPlace: RideSearchPayload["toPlace"] | null;
  fromStage: RideSearchPayload["fromStage"] | null;
  preference: RideSearchPayload["preference"];
  preferredNganya: RideSearchPayload["preferredNganya"];
}

interface WhereToCardProps {
  value: PlannerFiltersValue;
  onChange: (next: PlannerFiltersValue) => void;
  onSearch?: (payload: RideSearchPayload) => void;
  onClear?: () => void;
  className?: string;
}

export default function WhereToCard({
  value,
  onChange,
  onSearch,
  onClear,
  className,
}: WhereToCardProps) {
  const isMobile = useIsMobile();
  const [isCompact, setIsCompact] = useState(false);

  // Pickers state
  const [isStagePickerOpen, setStagePickerOpen] = useState(false);
  const [isDestPickerOpen, setDestPickerOpen] = useState(false);
  const [isSpecificPickerOpen, setSpecificPickerOpen] = useState(false);
  const [isResultsOpen, setResultsOpen] = useState(false);

  const { recents, addRecent, clearRecents } = useRecentSearches();

  const { toPlace, fromStage, preference, preferredNganya } = value;

  useEffect(() => {
    if (isMobile && toPlace && fromStage) {
      setIsCompact(true);
    }
  }, [isMobile, toPlace?.id, fromStage?.id]);

  const handlePreferenceSelect = (val: "ANY" | "NEWEST" | "SPECIFIC") => {
    onChange({
      ...value,
      preference: val,
      preferredNganya: val === "SPECIFIC" ? value.preferredNganya : null,
    });

    if (val === "SPECIFIC" && toPlace && fromStage) setSpecificPickerOpen(true);
  };

  const handleClear = () => {
    onChange({
      toPlace: null,
      fromStage: null,
      preferredNganya: null,
      preference: "ANY",
    });
    setIsCompact(false);
    setResultsOpen(false);
    onClear?.();
  };

  const handleSearch = () => {
    if (!fromStage || !toPlace) return;

    const payload: RideSearchPayload = {
      fromStage,
      toPlace,
      preference,
      preferredNganya,
    };

    trackEvent({
      event: "ride_search_started",
      properties: {
        from_stage_id: fromStage.id,
        to_corridor_id: toPlace.corridor_id || toPlace.id,
        preference,
        has_preferred_nganya: !!preferredNganya,
      },
    });

    addRecent(payload);

    if (onSearch) {
      onSearch(payload);
      if (isMobile) {
        setIsCompact(true);
      }
      return;
    }

    setResultsOpen(true);
  };

  /** Replay a recent search without re-opening pickers. */
  const handleReplayRecent = (payload: RideSearchPayload) => {
    onChange({
      toPlace: payload.toPlace,
      fromStage: payload.fromStage,
      preference: payload.preference,
      preferredNganya: payload.preferredNganya,
    });

    trackEvent({
      event: "ride_search_started",
      properties: {
        from_stage_id: payload.fromStage.id,
        to_corridor_id: payload.toPlace.corridor_id || payload.toPlace.id,
        preference: payload.preference,
        source: "recent_repeat",
      },
    });

    addRecent(payload);

    if (onSearch) {
      onSearch(payload);
      if (isMobile) setIsCompact(true);
      return;
    }
    setResultsOpen(true);
  };

  const canSearch = fromStage !== null && toPlace !== null;
  const summaryText = `${toPlace?.name || "Route"} • ${fromStage?.name || "Stage"} • ${
    preference === "SPECIFIC"
      ? `Specific: ${preferredNganya?.name || "Pick"}`
      : preference === "NEWEST"
        ? "Newest"
        : "Any"
  }`;

  // Compact summary (mobile, after search has been triggered)
  if (isMobile && isCompact && toPlace && fromStage) {
    return (
      <div
        className={`bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-4 md:p-6 shadow-sm ${className ?? ""}`}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-sm text-[var(--color-text-primary)] font-medium truncate">
            {summaryText}
          </p>
          <button
            type="button"
            onClick={() => setIsCompact(false)}
            className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors shrink-0"
          >
            Edit
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            className="flex-1"
            disabled={!canSearch}
            onClick={handleSearch}
          >
            Find my ride
          </Button>
          <Button variant="ghost" className="shrink-0" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-4 md:p-6 shadow-sm flex flex-col ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex gap-2 flex-col">
          <h2 className="text-h3 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-[var(--color-accent)]" />
            Plan your ride
          </h2>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Pick terminal route first, then pickup stage.
          </p>
        </div>
        {(toPlace || fromStage || preferredNganya || preference !== "ANY") && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Recent searches strip */}
      {recents.length > 0 && !toPlace && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" /> Recent
            </p>
            <button
              type="button"
              onClick={clearRecents}
              className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors flex items-center gap-0.5"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {recents.slice(0, 1).map((recent, idx) => (
              <button
                key={`${recent.fromStage.id}-${recent.toPlace.id}-${idx}`}
                type="button"
                onClick={() => handleReplayRecent(recent)}
                className="w-full flex items-center justify-between p-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-body)] border border-[var(--color-line)] hover:border-[var(--color-accent-soft)] transition-colors text-left group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-3.5 h-3.5 shrink-0 text-[var(--color-text-tertiary)]" />
                  <span className="text-sm text-[var(--color-text-primary)] truncate">
                    {recent.toPlace.name}
                  </span>
                  <span className="text-[var(--color-text-tertiary)] text-xs shrink-0">
                    from
                  </span>
                  <span className="text-sm text-[var(--color-text-secondary)] truncate">
                    {recent.fromStage.name}
                  </span>
                </div>
                <span className="text-xs text-[var(--color-accent)] shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Repeat
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <div className="space-y-4 flex-1">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setDestPickerOpen(true)}
            className="w-full flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-body)] border border-[var(--color-line)] hover:border-[var(--color-accent-soft)] transition-colors text-left"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-2 h-2 rounded-full shrink-0 bg-[var(--color-accent)] ml-1 mr-1" />
              <span
                className={`truncate ${toPlace ? "text-[var(--color-text-primary)] font-medium" : "text-[var(--color-text-tertiary)]"}`}
              >
                {toPlace ? toPlace.name : "1. Route / headed to"}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 shrink-0 text-[var(--color-text-tertiary)]" />
          </button>

          <button
            type="button"
            onClick={() => setStagePickerOpen(true)}
            disabled={!toPlace}
            className={`w-full flex items-center justify-between p-3 rounded-[var(--radius-md)] border transition-colors text-left ${!toPlace ? "bg-[var(--glass-bg)] border-[var(--color-line)] opacity-50 cursor-not-allowed" : "bg-[var(--color-bg-body)] border-[var(--color-line)] hover:border-[var(--color-accent-soft)]"}`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <MapPin className="w-4 h-4 shrink-0 text-[var(--color-text-tertiary)]" />
              <span
                className={`truncate ${fromStage ? "text-[var(--color-text-primary)] font-medium" : "text-[var(--color-text-tertiary)]"}`}
              >
                {fromStage ? fromStage.name : "2. Pickup stage on this route"}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 shrink-0 text-[var(--color-text-tertiary)]" />
          </button>

          {preference === "SPECIFIC" && (
            <button
              type="button"
              onClick={() => setSpecificPickerOpen(true)}
              disabled={!fromStage || !toPlace}
              className={`w-full flex items-center justify-between p-3 rounded-[var(--radius-md)] border transition-colors text-left ${
                !fromStage || !toPlace
                  ? "bg-[var(--glass-bg)] border-[var(--color-line)] opacity-50 cursor-not-allowed"
                  : "bg-[var(--color-bg-body)] border-[var(--color-line)] hover:border-[var(--color-accent-soft)]"
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <BusFront className="w-4 h-4 shrink-0 text-[var(--color-text-tertiary)]" />
                <span
                  className={`truncate ${preferredNganya ? "text-[var(--color-text-primary)] font-medium" : "text-[var(--color-text-tertiary)]"}`}
                >
                  {preferredNganya
                    ? preferredNganya.name
                    : "3. Specific nganya (optional)"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 shrink-0 text-[var(--color-text-tertiary)]" />
            </button>
          )}
        </div>

        <div>
          <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider font-semibold">
            Preference
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Chip
              label="Any"
              variant="route"
              isActive={preference === "ANY"}
              onClick={() => handlePreferenceSelect("ANY")}
            />
            <Chip
              label="Newest"
              variant="vibe"
              isActive={preference === "NEWEST"}
              color={
                preference === "NEWEST" ? "var(--color-accent)" : undefined
              }
              onClick={() => handlePreferenceSelect("NEWEST")}
            />
            <button
              type="button"
              onClick={() => handlePreferenceSelect("SPECIFIC")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 border ${
                preference === "SPECIFIC"
                  ? "bg-[var(--glass-bg)] border-[var(--color-green)] text-[var(--color-green)]"
                  : "bg-transparent border-[var(--color-line)] text-[var(--color-text-secondary)] hover:border-[var(--color-line-strong)]"
              }`}
            >
              <BusFront className="w-3.5 h-3.5" />
              Specific
            </button>
          </div>
        </div>

        </div>

        <div className="sticky bottom-3 z-10 md:static mt-6">
          <Button
            variant="primary"
            className="w-full"
            disabled={!canSearch}
            onClick={handleSearch}
          >
            Find my ride
          </Button>
        </div>
      </div>

      <DestinationPicker
        isOpen={isDestPickerOpen}
        onClose={() => setDestPickerOpen(false)}
        onSelect={(id, name, corridor_id) => {
          onChange({
            ...value,
            toPlace: { id, name, corridor_id },
          });
          setDestPickerOpen(false);
        }}
      />

      <StagePicker
        isOpen={isStagePickerOpen}
        onClose={() => setStagePickerOpen(false)}
        corridorId={toPlace?.corridor_id}
        onSelect={(id, name) => {
          onChange({
            ...value,
            fromStage: { id, name },
          });
          setStagePickerOpen(false);
          if (preference === "SPECIFIC") {
            setSpecificPickerOpen(true);
          }
        }}
      />

      <SpecificNganyaPicker
        isOpen={isSpecificPickerOpen}
        onClose={() => setSpecificPickerOpen(false)}
        corridorId={toPlace?.corridor_id}
        onSelect={(id, name) => {
          onChange({
            ...value,
            preference: "SPECIFIC",
            preferredNganya: { id, name },
          });
          setSpecificPickerOpen(false);
        }}
      />

      {!onSearch && isResultsOpen && fromStage && toPlace && (
        <SearchResultsOverlayV2
          isOpen={isResultsOpen}
          onClose={() => setResultsOpen(false)}
          fromStage={fromStage}
          toPlace={toPlace}
          preference={preference}
          preferredNganya={preferredNganya}
        />
      )}
    </div>
  );
}
