import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Radio, Square } from "lucide-react";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface CrewActiveSessionBannerProps {
  session: any;
  isEnding?: boolean;
  onEnd: () => void;
}

export function CrewActiveSessionBanner({
  session,
  isEnding = false,
  onEnd,
}: CrewActiveSessionBannerProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <section className="rounded-[24px] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-4 shadow-[var(--glow-accent-sm)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              <Radio className="h-4 w-4 text-[var(--color-accent)]" />
              <span>You are currently Live</span>
            </div>
            <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {session?.nganyas?.name || "Mapped nganya"} |{" "}
              {session?.nganyas?.corridors?.name || "Unknown corridor"}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              to="/crew/session/$id"
              params={{ id: session.id }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-[18px] bg-[var(--color-accent)] px-4 text-sm font-semibold text-white no-underline"
            >
              Resume session
            </Link>
            <Button
              variant="secondary"
              className="min-h-[44px] rounded-[18px] px-4 text-sm font-semibold"
              isLoading={isEnding}
              onClick={() => setShowConfirm(true)}
            >
              <Square className="h-4 w-4" />
              End session
            </Button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        isOpen={showConfirm}
        variant="danger"
        title="End live session?"
        message="This will stop your live broadcast. Riders will no longer see your location. You can start a new session at any time."
        confirmText="End session"
        cancelText="Keep live"
        onConfirm={() => {
          setShowConfirm(false);
          onEnd();
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
