import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  getRedirectPathForAudience,
  getRouteAudience,
} from "@/shared/auth/access-policy";
import { useAuthStore } from "@/stores/useAuthStore";

interface RoleAccessBoundaryProps {
  children: ReactNode;
}

export function RoleAccessBoundary({ children }: RoleAccessBoundaryProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const resolveRole = useAuthStore((state) => state.resolveRole);
  const role = useAuthStore((state) => state.role);
  const [isChecking, setIsChecking] = useState(
    () => getRouteAudience(location.pathname) !== "public",
  );

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      const audience = getRouteAudience(location.pathname);

      // Public routes don't need role resolution
      if (audience === "public") {
        setIsChecking(false);
        return;
      }

      // Resolve role from store (with caching and deduplication)
      const resolvedRole = await resolveRole();

      if (cancelled) return;

      // Redirect unauthenticated users to signin (except guest routes)
      if (!resolvedRole && audience !== "guest") {
        void navigate({
          to: "/signin",
          search: {
            returnTo: location.pathname.startsWith("/crew")
              ? "/crew"
              : location.pathname,
          },
          replace: true,
        });
        return;
      }

      // Check if user needs to be redirected based on role
      const redirectPath = getRedirectPathForAudience(
        location.pathname,
        resolvedRole,
      );
      if (redirectPath && redirectPath !== location.pathname) {
        void navigate({ to: redirectPath, replace: true });
        return;
      }

      setIsChecking(false);
    };

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, role, navigate, resolveRole]);

  if (isChecking) {
    return <div className="min-h-screen bg-[var(--color-bg-base)]" />;
  }

  return <>{children}</>;
}
