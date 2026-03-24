/**
 * AppShell - Responsive layout wrapper.
 * Renders BottomNav on mobile, TopNav on desktop.
 * Manages content area padding for fixed navigation.
 */

import type { ReactNode } from "react";
import { useMatches } from "@tanstack/react-router";
import BottomNav from "../navigation/BottomNav";
import TopNav from "../navigation/TopNav";
import { ToastProvider } from "../ui/Toast";
import { useAuthSession } from "@/hooks/useAuthSession";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const matches = useMatches();
  const currentPath = matches[matches.length - 1]?.fullPath ?? "/";
  const isCrewRoute = currentPath.startsWith("/crew");
  const isAdminRoute = currentPath.startsWith("/admin");
  const { session, profile } = useAuthSession();

  const renderTopNav = () => {
    if (isCrewRoute || isAdminRoute) return null;
    return <TopNav session={session} profile={profile} />;
  };

  const renderBottomNav = () => {
    if (isCrewRoute || isAdminRoute) return null;
    return <BottomNav session={session} profile={profile} />;
  };

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        {renderTopNav()}

        <main className="flex-1 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>

        {renderBottomNav()}
      </div>
    </ToastProvider>
  );
}
