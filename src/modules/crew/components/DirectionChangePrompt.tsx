import { Navigation, X } from "lucide-react";
import { useState } from "react";
import Button from "@/components/ui/Button";

interface DirectionChangePromptProps {
  currentDirection: "TO_TOWN" | "FROM_TOWN";
  toTownLabel: string;
  fromTownLabel: string;
  onConfirm: (newDirection: "TO_TOWN" | "FROM_TOWN") => void;
  onDismiss: () => void;
  isUpdating?: boolean;
}

export function DirectionChangePrompt({
  currentDirection,
  toTownLabel,
  fromTownLabel,
  onConfirm,
  onDismiss,
  isUpdating = false,
}: DirectionChangePromptProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss();
  };

  const newDirection = currentDirection === "TO_TOWN" ? "FROM_TOWN" : "TO_TOWN";
  const newDirectionLabel =
    newDirection === "TO_TOWN" ? toTownLabel : fromTownLabel;

  return (
    <div className="rounded-[var(--radius-xl)] border border-blue-500/30 bg-blue-500/10 p-4">
      <div className="flex items-start gap-3">
        <Navigation className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-blue-200">
              Direction change detected
            </h3>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 text-blue-200/60 hover:text-blue-200 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-sm text-blue-200/80">
            It looks like you've turned around. Did you change direction to{" "}
            {newDirectionLabel}?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onConfirm(newDirection)}
              isLoading={isUpdating}
              className="bg-blue-500/20 border-blue-500/30 text-blue-200 hover:bg-blue-500/30"
            >
              Yes, update to {newDirectionLabel}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              disabled={isUpdating}
              className="text-blue-200/60 hover:text-blue-200"
            >
              No, keep current
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
