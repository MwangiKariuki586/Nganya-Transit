import { Users, TrendingDown, AlertCircle, UserPlus } from "lucide-react";

interface QuickSeatPresetsProps {
  onSelect: (seats: number, label: string) => void;
  disabled?: boolean;
  maxSeats?: number;
  className?: string;
}

export function QuickSeatPresets({
  onSelect,
  disabled = false,
  maxSeats = 33,
  className = "",
}: QuickSeatPresetsProps) {
  const presets = [
    { seats: 0, label: "Full", icon: AlertCircle, color: "red" },
    {
      seats: Math.floor(maxSeats * 0.15),
      label: "Almost full",
      icon: TrendingDown,
      color: "amber",
    },
    {
      seats: Math.floor(maxSeats * 0.5),
      label: "Half full",
      icon: Users,
      color: "blue",
    },
    { seats: maxSeats, label: "Empty", icon: UserPlus, color: "green" },
  ];

  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {presets.map((preset) => {
        const Icon = preset.icon;
        const colorClasses = {
          red: "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20",
          amber:
            "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20",
          blue: "border-blue-500/30 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20",
          green:
            "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20",
        };

        return (
          <button
            key={preset.label}
            type="button"
            onClick={() => onSelect(preset.seats, preset.label)}
            disabled={disabled}
            className={`flex flex-col items-center gap-2 p-3 rounded-[var(--radius-md)] border transition-all ${
              colorClasses[preset.color as keyof typeof colorClasses]
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Icon className="h-5 w-5" />
            <div className="text-center">
              <div className="text-sm font-semibold">{preset.label}</div>
              <div className="text-xs opacity-80">{preset.seats} seats</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
