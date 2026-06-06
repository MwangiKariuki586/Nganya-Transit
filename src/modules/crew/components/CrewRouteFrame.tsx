import type { ReactNode } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import CrewBottomNav from "@/modules/crew/components/CrewBottomNav";
import { CrewFooter } from "@/modules/crew/components/CrewFooter";
import { CrewNav } from "@/modules/crew/components/CrewNav";
import { CrewBootstrapProvider } from "@/modules/crew/context/CrewBootstrapContext";
import type { CrewBootstrapSnapshot } from "@/shared/types/crew-bootstrap";

interface CrewRouteFrameProps {
  initialSnapshot: CrewBootstrapSnapshot;
  children: ReactNode;
}

export function CrewRouteFrame({
  initialSnapshot,
  children,
}: CrewRouteFrameProps) {
  const { session, profile } = useAuthSession();

  return (
    <CrewBootstrapProvider initialSnapshot={initialSnapshot}>
      <div className="flex min-h-screen flex-col bg-[var(--color-bg-base)]">
        <CrewNav session={session} profile={profile} />
        <main className="flex-1 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
        <CrewFooter />
        <CrewBottomNav session={session} profile={profile} />
      </div>
    </CrewBootstrapProvider>
  );
}
