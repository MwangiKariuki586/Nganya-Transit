import { MapPin, X, CheckCircle } from "lucide-react";
import { useState } from "react";
import Button from "@/components/ui/Button";
import type { StageArrival } from "../hooks/useStageDetection";

interface StageArrivalPromptProps {
  arrival: StageArrival;
  currentSeats: number;
  onUpdateSeats: (seats: number) => void;
  onDismiss: () => void;
  isUpdating?: boolean;
}

export function StageArrivalPrompt({
  arrival,
  currentSeats,
  onUpdateSeats,
  onDismiss,
  isUpdating = false,
}: StageArrivalPromptProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<number | null>(null);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss();
  };

  const handleConfirm = () => {
    if (selectedSeats !== null) {
      onUpdateSeats(selectedSeats);
      handleDismiss();
    }
  };

  const suggestions = [
    { seats: 0, label: "Full" },
    { seats: Math.max(0, currentSeats - 5), label: "Picked up 5" },
    { seats: Math.max(0, currentSeats - 3), label: "Picked up 3" },
    { seats: currentSeats, label: "No change" },
  ];

  const confidenceColor = {
    high: "emerald",
    medium: "blue",
    low: "amber",
  }[arrival.confidence];

  return (
    <div
      className={`rounded-[var(--radius-xl)] border border-${confidenceColor}-500/30 bg-${confidenceColor}-500/10 p-4`}
    >
      <div className="flex items-start gap-3">
        <MapPin
          className={`h-5 w-5 shrink-0 text-${confidenceColor}-400 mt-0.5`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3
                className={`text-sm font-semibold text-${confidenceColor}-200`}
              >
                Arrived at {arrival.stage.name}
              </h3>
              <p className={`text-xs text-${confidenceColor}-200/70 mt-0.5`}>
                {arrival.distance.toFixed(0)}m away • {arrival.confidence}{" "}
                confidence
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className={`shrink-0 text-${confidenceColor}-200/60 hover:text-${confidenceColor}-200 transition-colors`}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className={`mt-2 text-sm text-${confidenceColor}-200/80`}>
            Did you pick up passengers? Update your seat count:
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.label}
                type="button"
                onClick={() => setSelectedSeats(suggestion.seats)}
                className={`p-2 rounded-[var(--radius-md)] border text-sm transition-all ${
                  selectedSeats === suggestion.seats
                    ? `border-${confidenceColor}-500 bg-${confidenceColor}-500/20 text-${confidenceColor}-200`
                    : `border-${confidenceColor}-500/30 bg-${confidenceColor}-500/5 text-${confidenceColor}-200/70 hover:bg-${confidenceColor}-500/10`
                }`}
              >
                <div className="font-semibold">{suggestion.label}</div>
                <div className="text-xs opacity-70">
                  {suggestion.seats} seats left
                </div>
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleConfirm}
              disabled={selectedSeats === null || isUpdating}
              isLoading={isUpdating}
              className={`flex-1 bg-${confidenceColor}-500/20 border-${confidenceColor}-500/30 text-${confidenceColor}-200 hover:bg-${confidenceColor}-500/30`}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              disabled={isUpdating}
              className={`text-${confidenceColor}-200/60 hover:text-${confidenceColor}-200`}
            >
              Skip
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
