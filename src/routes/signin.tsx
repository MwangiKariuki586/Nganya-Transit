import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import Button from "../components/ui/Button";
import { LogIn, Mail, Lock, ChevronLeft } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  enforceGuestOnlyRoute,
  getHomePathForRole,
  resolveClientRole,
} from "@/shared/auth/guards";
import { syncAuthSessionCookie } from "@/shared/auth/session-cookie";
import { useAuthStore } from "@/stores/useAuthStore";

export const Route = createFileRoute("/signin")({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: typeof search.returnTo === "string" ? search.returnTo : undefined,
  }),
  beforeLoad: async () => {
    await enforceGuestOnlyRoute();
  },
  component: SignInScreen,
});

function SignInScreen() {
  const navigate = useNavigate();
  const router = useRouter();
  const { addToast } = useToast();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) throw signInError;

      syncAuthSessionCookie(data.session ?? null);

      // Invalidate cached role on auth state change
      useAuthStore.getState().invalidateRole();
      await router.invalidate();

      const role = await resolveClientRole();
      const returnTo = search.returnTo;

      if (returnTo?.startsWith("/crew")) {
        navigate({ to: "/crew" });
        return;
      }

      if (returnTo && returnTo.startsWith("/")) {
        window.location.assign(returnTo);
        return;
      }

      navigate({ to: role ? getHomePathForRole(role) : "/" });
    } catch (err: any) {
      addToast(
        err.message || "Failed to sign in. Please check your credentials.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-var(--top-nav-height)-var(--bottom-nav-height))] flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-2xl bg-(--color-accent) flex items-center justify-center shadow-(--glow-accent) rotate-3">
              <LogIn className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-h2">Welcome back</h1>
          <p className="text-body text-(--color-text-secondary)">
            Sign in to your Matwana account
          </p>
        </div>

        <div className="p-8 rounded-xl bg-(--glass-bg) border border-(--glass-border) backdrop-blur-xl">
          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-(--color-text-primary) mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-(--color-text-tertiary)">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-11 pr-4 py-3 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--glass-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-(--color-text-primary) mb-2">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-(--color-text-tertiary)">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="w-full pl-11 pr-4 py-3 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--glass-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] focus:shadow-[var(--glow-accent-sm)] transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full h-12"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-(--color-text-tertiary)">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-(--color-accent) font-semibold hover:underline"
              >
                Sign up now
              </Link>
            </p>

            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
