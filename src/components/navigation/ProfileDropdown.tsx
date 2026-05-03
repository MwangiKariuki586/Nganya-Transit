/**
 * ProfileDropdown — small popover shown when clicking the avatar in any navbar.
 * Provides "View Profile" and "Sign Out" actions.
 */

import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { User, LogOut } from "lucide-react";

interface ProfileDropdownProps {
  profile: any;
  profileTo: string;
  onSignOut: () => void;
  onClose: () => void;
  /** Alignment of the dropdown relative to the trigger */
  align?: "left" | "right";
  /** Open upward instead of downward (for bottom navbars) */
  upward?: boolean;
}

export function ProfileDropdown({
  profile,
  profileTo,
  onSignOut,
  onClose,
  align = "right",
  upward = false,
}: ProfileDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const positionClasses = [
    upward ? "bottom-full mb-2" : "top-full mt-2",
    align === "right" ? "right-0" : "left-0",
  ].join(" ");

  return (
    <div
      ref={ref}
      className={`absolute ${positionClasses} z-50 min-w-[180px] rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-lg)] backdrop-blur-xl overflow-hidden`}
      role="menu"
      aria-label="Profile menu"
    >
      {/* User info header */}
      <div className="px-4 py-3 border-b border-[var(--glass-border)]">
        <div className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
          {profile?.full_name || "User"}
        </div>
        <div className="text-[10px] text-[var(--color-text-tertiary)] truncate">
          @{profile?.handle || "user"}
        </div>
      </div>

      {/* Actions */}
      <div className="py-1">
        <Link
          to={profileTo as any}
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg)] transition-colors no-underline"
          role="menuitem"
        >
          <User className="w-4 h-4 shrink-0" />
          View Profile
        </Link>

        <button
          type="button"
          onClick={() => {
            onClose();
            onSignOut();
          }}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
          role="menuitem"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
