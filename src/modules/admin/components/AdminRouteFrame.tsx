import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAuthSession } from "@/hooks/useAuthSession";
import { AdminContentLoadingScreen } from "@/modules/admin/components/AdminContentLoadingScreen";
import { AdminNav } from "@/modules/admin/components/AdminNav";
import { AdminSidebar } from "@/modules/admin/components/AdminSidebar";
import AdminBottomNav from "@/modules/admin/components/AdminBottomNav";

interface AdminRouteFrameProps {
  children: ReactNode;
}

export function AdminRouteFrame({ children }: AdminRouteFrameProps) {
  const { session, profile } = useAuthSession();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const previousPathnameRef = useRef(pathname);
  const [isSwitchingPage, setIsSwitchingPage] = useState(false);

  useEffect(() => {
    if (!pathname.startsWith("/admin")) {
      previousPathnameRef.current = pathname;
      setIsSwitchingPage(false);
      return;
    }

    if (previousPathnameRef.current === pathname) {
      return;
    }

    previousPathnameRef.current = pathname;
    setIsSwitchingPage(true);

    const timeout = window.setTimeout(() => {
      setIsSwitchingPage(false);
    }, 220);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      <div className="flex min-h-screen">
        <AdminSidebar session={session} profile={profile} />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AdminNav session={session} profile={profile} />
          <main className="flex-1 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+16px)] lg:pb-0">
            {isSwitchingPage ? (
              <AdminContentLoadingScreen />
            ) : (
              <div key={pathname}>{children}</div>
            )}
          </main>
        </div>
      </div>

      <AdminBottomNav session={session} profile={profile} />
    </div>
  );
}
