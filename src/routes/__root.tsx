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
import { MatwanaThemeProvider } from "@/shared/theme/MatwanaThemeProvider";
import {
  MATWANA_COLORWAY_STATIC_MAP,
  MATWANA_COLORWAY_STORAGE_KEY,
  MATWANA_DEFAULT_COLORWAY,
} from "@/shared/theme/matwana-colorways";

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
    <MatwanaThemeProvider>
      <ToastProvider>
        <AuthSessionBridge />
        <AppRenderBoundary>
          <AppShell>
            <Outlet />
          </AppShell>
        </AppRenderBoundary>
      </ToastProvider>
    </MatwanaThemeProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  // Serialised once at module evaluation time — zero runtime cost.
  const themeInitScript = `(function(){try{var MAP=${JSON.stringify(MATWANA_COLORWAY_STATIC_MAP)};var KEY="${MATWANA_COLORWAY_STORAGE_KEY}";var DEFAULT="${MATWANA_DEFAULT_COLORWAY}";var stored=localStorage.getItem(KEY);var vars=MAP[stored]||MAP[DEFAULT];var root=document.documentElement;for(var k in vars){root.style.setProperty(k,vars[k]);}}catch(e){}})();`;

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
        {/* Blocking script: applies stored colorway CSS variables before first paint,
            preventing the flash of the default theme. The lookup table is pre-computed
            at build time so no colour math runs in the browser. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
