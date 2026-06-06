import type { ReactNode } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import BottomNav from "@/components/navigation/BottomNav";
import TopNav from "@/components/navigation/TopNav";

interface FanRouteFrameProps {
  children: ReactNode;
}

export function FanRouteFrame({ children }: FanRouteFrameProps) {
  const { session, profile } = useAuthSession();

  return (
    <div className="min-h-screen flex flex-col bg-(--color-bg-base)">
      <TopNav session={session} profile={profile} />
      <main className="flex-1 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
      <BottomNav session={session} profile={profile} />
    </div>
  );
}
