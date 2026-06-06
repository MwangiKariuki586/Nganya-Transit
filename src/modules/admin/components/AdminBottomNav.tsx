import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { adminNavItems } from "@/modules/admin/components/admin-nav-items";
import { useSignOut } from "@/hooks/useSignOut";
import { getAvatarInitials } from "@/lib/formatters";
import { ProfileDropdown } from "@/components/navigation/ProfileDropdown";

interface NavProps {
  session: Session | null;
  profile: any;
}

const tabs = [
  adminNavItems[0], // Overview
  adminNavItems[4], // Live Sessions
  adminNavItems[3], // Registrations
] as const;

export default function AdminBottomNav({ session, profile }: NavProps) {
  const currentPath = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = useSignOut({ redirectTo: "/signin" });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)] lg:hidden"
      aria-label="Admin navigation"
    >
      <div className="absolute inset-0 bg-[var(--color-bg-base)]/90 backdrop-blur-lg border-t border-[var(--glass-border)]" />

      <div className="relative grid grid-cols-4 items-center px-2 h-[var(--bottom-nav-height)] pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.to;

          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-1 w-full h-12 rounded-[var(--radius-md)] transition-colors duration-150 no-underline ${
                isActive
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
              }`}
              aria-label={tab.label}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}

        {/* Profile tab */}
        <div className="relative flex flex-col items-center justify-center w-full">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex flex-col items-center justify-center gap-1 w-full h-12 rounded-[var(--radius-md)] transition-colors duration-150 cursor-pointer text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
            aria-label="Open profile menu"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <div className="w-5 h-5 rounded-full overflow-hidden border border-[var(--glass-border)]">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  className="w-full h-full object-cover"
                  alt=""
                />
              ) : (
                <div className="w-full h-full bg-[var(--glass-bg)] flex items-center justify-center text-[8px] font-bold">
                  {getAvatarInitials(profile?.handle, "AD")}
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium">Profile</span>
          </button>

          {dropdownOpen && (
            <ProfileDropdown
              profile={profile}
              profileTo="/profile"
              onSignOut={handleSignOut}
              onClose={() => setDropdownOpen(false)}
              align="right"
              upward
            />
          )}
        </div>
      </div>
    </nav>
  );
}
