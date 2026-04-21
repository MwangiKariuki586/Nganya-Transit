import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import BottomSheet from "../ui/BottomSheet";
import SearchInput from "../ui/SearchInput";
import Button from "../ui/Button";
import { useToast } from "../ui/ToastContainer";
import { getStages } from "../../lib/queries/discover";
import { supabase } from "../../lib/supabase";
import { MapPin, Navigation, AlertCircle } from "lucide-react";

interface StagePickerProps {
  isOpen: boolean;
  onClose: () => void;
  corridorId?: string;
  onSelect: (stageId: string, stageName: string) => void;
}

export default function StagePicker({
  isOpen,
  onClose,
  corridorId,
  onSelect,
}: StagePickerProps) {
  const { addToast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [stages, setStages] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setShowSuggestions(false);
      setSuggestions([]);
      getStages(corridorId)
        .then((data) => {
          setStages(data || []);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, corridorId]);

  const filtered = stages.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const findClosestStage = async () => {
    if (!corridorId) {
      addToast("Please select a route first", "error");
      return;
    }

    if (stages.length === 0) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      addToast("Location services are not supported by your browser", "error");
      return;
    }

    // Check secure context
    if (typeof window !== "undefined" && !window.isSecureContext) {
      addToast("Location requires HTTPS or localhost", "error");
      return;
    }

    // Check permission status first
    if (navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });

        if (permissionStatus.state === "denied") {
          setPermissionDenied(true);
          addToast(
            "Location permission blocked. Click the lock icon in your address bar to enable location access",
            "error",
          );
          return;
        }
      } catch (e) {
        // Permission API not supported, continue
      }
    }

    setLocationLoading(true);
    setShowSuggestions(false);
    setSuggestions([]);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        try {
          // Call RPC to get nearest stages
          const { data, error } = await (supabase.rpc as any)(
            "closest_stages",
            {
              p_corridor_id: corridorId,
              p_lat: lat,
              p_lng: lng,
              p_limit: 3,
              p_max_meters: 5000,
            },
          );

          setLocationLoading(false);

          if (error) throw error;

          if (!data || data.length === 0) {
            addToast(
              "No stages found within 5km of your location. Try searching manually or move closer to the route",
              "error",
            );
            return;
          }

          const candidates = data as any[];

          // Auto-pick logic
          const nearest = candidates[0];
          const second = candidates[1];
          const nearestDist = nearest.distance_m;

          // Auto-pick if:
          // 1. Nearest is <= 300m AND
          // 2. (No second OR second is clearly worse: diff >= 250m OR ratio >= 2.0) AND
          // 3. Accuracy is good (< 80m) or unknown
          const shouldAutoPick =
            nearestDist <= 300 &&
            (!second ||
              second.distance_m - nearestDist >= 250 ||
              second.distance_m / nearestDist >= 2.0) &&
            (!accuracy || accuracy < 80);

          if (shouldAutoPick) {
            onSelect(nearest.id, nearest.name);
            addToast(`Selected ${nearest.name}`, "success");
            return;
          }

          // Show suggestions
          setSuggestions(candidates);
          setShowSuggestions(true);
        } catch (err: any) {
          setLocationLoading(false);
          addToast(err?.message || "Failed to find nearest stages", "error");
        }
      },
      (error) => {
        setLocationLoading(false);

        if (error.code === error.PERMISSION_DENIED) {
          setPermissionDenied(true);
          addToast(
            "Location permission denied. Click the lock icon in your address bar to allow location access",
            "error",
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          addToast(
            "Location unavailable. Check that location services are enabled on your device",
            "error",
          );
        } else if (error.code === error.TIMEOUT) {
          addToast(
            "Location request timed out. Check your internet connection and try again",
            "error",
          );
        } else {
          addToast("Unable to get your location. Please try again", "error");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 300000,
      },
    );
  };

  const content = (
    <div className="flex flex-col h-full max-h-[60vh]">
      {!isLoading && !showSuggestions && (
        <Button
          variant="secondary"
          className="mb-3 shrink-0"
          onClick={findClosestStage}
          disabled={!corridorId || stages.length === 0}
          isLoading={locationLoading}
        >
          <Navigation className="w-4 h-4" />
          {!corridorId
            ? "Select a route first"
            : locationLoading
              ? "Finding closest..."
              : "Use Closest Stage"}
        </Button>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="mb-4 p-4 rounded-lg border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)]/10">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-[var(--color-accent)]" />
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Closest stage suggestions
            </h4>
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => {
                  onSelect(suggestion.id, suggestion.name);
                  setShowSuggestions(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-md bg-[var(--glass-bg)] hover:bg-[var(--glass-border)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                  <span className="text-[var(--color-text-primary)] font-medium">
                    {suggestion.name}
                  </span>
                </div>
                <span className="text-sm text-[var(--color-accent)]">
                  {formatDistance(suggestion.distance_m)}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSuggestions(false)}
            className="mt-3 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          >
            Search manually instead
          </button>
        </div>
      )}

      {!showSuggestions && (
        <>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search pickup stage..."
            className="mb-4 shrink-0"
          />

          <div className="flex-1 overflow-y-auto space-y-1">
            {isLoading ? (
              <p className="text-sm text-[var(--color-text-tertiary)] p-4 text-center">
                Loading stages...
              </p>
            ) : filtered.length > 0 ? (
              filtered.map((stage) => {
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => onSelect(stage.id, stage.name)}
                    className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--glass-bg)] transition-colors text-left"
                  >
                    <div className="p-2 rounded-full bg-[var(--glass-bg)] text-[var(--color-text-tertiary)]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[var(--color-text-primary)] font-medium">
                        {stage.name}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-[var(--color-text-tertiary)] p-4 text-center">
                No stages found.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Select Pickup Stage"
      >
        {content}
      </BottomSheet>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Pickup Stage"
      size="sm"
    >
      {content}
    </Modal>
  );
}
