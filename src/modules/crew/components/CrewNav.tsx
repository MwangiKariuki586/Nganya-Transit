import { useMemo } from "react";
import { Radio, History, LogOut, Shield, User, Zap } from "lucide-react";
import { Link, useMatches, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useCrewBootstrap } from "@/modules/crew/context/CrewBootstrapContext";
import { getCrewStatusState } from "@/modules/crew/services/route-access";
import { clearAuthSessionCookie } from "@/shared/auth/session-cookie";
import { useCrewStore } from "@/stores/useCrewStore";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Session } from "@supabase/supabase-js";

interface NavProps {
  session: Session | null;
  profile: any;
}

export function CrewNav({ session, profile }: NavProps) {
  const matches = useMatches();
  const navigate = useNavigate();
  const currentPath = matches[matches.length - 1]?.fullPath ?? "/crew/live";
  const { snapshot } = useCrewBootstrap();
  const crewState = getCrewStatusState(snapshot);

  const showRegisterEntry =
    crewState === "UNREGISTERED" ||
    crewState === "PENDING_APPROVAL" ||
    crewState === "NEEDS_INFO" ||
    crewState === "REJECTED";

  const navItems = useMemo(() => {
    const primaryItem = showRegisterEntry
      ? { to: "/crew/register", label: "Register", icon: Shield }
      : { to: "/crew/live", label: "Live", icon: Radio };

    return [
      primaryItem,
      { to: "/crew/history", label: "History", icon: History },
    ] as const;
  }, [showRegisterEntry]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearAuthSessionCookie();
    useCrewStore.getState().invalidateBootstrap();
    useAuthStore.getState().invalidateRole();
    navigate({ to: "/signin" });
  };

  return (
    <header
      className="hidden md:block sticky top-0 z-[var(--z-nav)]"
      role="banner"
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-[var(--color-bg-base)]/80 backdrop-blur-xl border-b border-[var(--glass-border)]" />

      <div className="relative page-container flex items-center justify-between h-[var(--top-nav-height)]">
        {/* Logo */}
        <Link
          to="/crew/live"
          className="flex items-center gap-2 no-underline group"
        >
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-accent)] flex items-center justify-center shadow-[var(--glow-accent-sm)]">
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-display text-lg font-bold text-[var(--color-text-primary)] tracking-tight group-hover:text-[var(--color-accent)] transition-colors">
              MATWANA Crew
            </span>
            <div className="text-caption text-[var(--color-text-tertiary)]">
              Operations
            </div>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1" aria-label="Crew navigation">
          {navItems.map((item) => {
            const isActive = currentPath === item.to;
            const isRegister = item.to === "/crew/register";

            if (isRegister && showRegisterEntry) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-sm font-semibold shadow-[var(--glow-accent-sm)] hover:shadow-[var(--glow-accent)] hover:bg-[var(--color-accent-hover)] transition-all duration-150 no-underline"
                >
                  <Shield className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-150 no-underline ${
                  isActive
                    ? "text-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)]"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          {/* Auth Status */}
          <div className="ml-4 pl-4 border-l border-[var(--glass-border)] flex items-center gap-3">
            {session ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 p-1 pr-3 rounded-[var(--radius-full)] bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all no-underline group"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden border border-[var(--glass-border)]">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.handle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[var(--color-text-tertiary)] bg-gradient-to-br from-[var(--glass-bg)] to-transparent">
                        {profile?.handle?.substring(0, 2).toUpperCase() || "??"}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                    @{profile?.handle || "user"}
                  </span>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-[var(--radius-md)] text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-red-500/10 transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/signin"
                  className="inline-flex items-center px-4 py-2 rounded-[var(--radius-md)] text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all no-underline"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center px-4 py-2 rounded-[var(--radius-md)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border-hover)] text-white text-sm font-bold hover:bg-[var(--color-accent)] hover:border-transparent transition-all shadow-[var(--shadow-sm)] no-underline"
                >
                  Join
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
