import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import AppShell from "../components/layout/AppShell";
import { AuthSessionBridge } from "@/shared/auth/AuthSessionBridge";
import { RouteErrorFallback } from "@/components/error/RouteErrorFallback";
import { AppRenderBoundary } from "@/components/error/AppRenderBoundary";
import { ToastProvider } from "@/components/ui/ToastContainer";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MATWANA - Nairobi Nganya Culture" },
      {
        name: "description",
        content:
          "Discover, follow, and spot the dopest nganyas on Nairobi streets. MATWANA is the Gen Z hub for nganya culture.",
      },
      { name: "theme-color", content: "#0A0A0F" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
  errorComponent: ({ error, reset }) => (
    <RouteErrorFallback
      error={error}
      reset={reset}
      title="The app hit an unexpected problem"
      homeTarget="/"
      routeId="__root"
    />
  ),
});

function RootComponent() {
  return (
    <ToastProvider>
      <AuthSessionBridge />
      <AppRenderBoundary>
        <AppShell>
          <Outlet />
        </AppShell>
      </AppRenderBoundary>
    </ToastProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
