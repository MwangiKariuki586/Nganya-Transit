import { MapPin, Navigation, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Coords } from "../hooks/useGeolocation";
import type { Stage } from "../hooks/useStageDetection";

interface LiveMapViewProps {
  currentPosition: Coords | null;
  stages: Stage[];
  currentStage: Stage | null;
  otherCrew?: Array<{
    id: string;
    name: string;
    position: { lat: number; lng: number };
    seatsLeft: number;
  }>;
  className?: string;
}

export function LiveMapView({
  currentPosition,
  stages,
  currentStage,
  otherCrew = [],
  className = "",
}: LiveMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Placeholder for map integration (Mapbox, Google Maps, Leaflet, etc.)
  // This would be implemented with actual mapping library

  return (
    <div
      className={`rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] overflow-hidden ${className}`}
    >
      <div className="p-4 border-b border-[var(--glass-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Live Map
        </h3>
      </div>

      <div
        ref={mapContainerRef}
        className="relative h-[400px] bg-[var(--color-bg-body)]"
      >
        {/* Map placeholder - integrate with mapping library */}
        <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-tertiary)]">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Map integration pending</p>
            <p className="text-xs mt-1">Mapbox/Google Maps/Leaflet</p>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <Navigation className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            <span className="text-[var(--color-text-secondary)]">
              Your position
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[var(--color-text-secondary)]">Stages</span>
          </div>
          {otherCrew.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Users className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[var(--color-text-secondary)]">
                Other crew
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
