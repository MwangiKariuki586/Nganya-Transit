import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface SessionTimerProps {
  startedAt: string;
  className?: string;
}

export function SessionTimer({ startedAt, className = "" }: SessionTimerProps) {
  const [duration, setDuration] = useState("");

  useEffect(() => {
    const updateDuration = () => {
      const start = new Date(startedAt).getTime();
      const now = Date.now();
      const diff = now - start;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setDuration(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setDuration(`${minutes}m ${seconds}s`);
      } else {
        setDuration(`${seconds}s`);
      }
    };

    updateDuration();
    const intervalId = setInterval(updateDuration, 1000);

    return () => clearInterval(intervalId);
  }, [startedAt]);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Clock className="h-4 w-4 text-[var(--color-text-tertiary)]" />
      <span className="text-sm font-medium text-[var(--color-text-primary)]">
        {duration}
      </span>
    </div>
  );
}
