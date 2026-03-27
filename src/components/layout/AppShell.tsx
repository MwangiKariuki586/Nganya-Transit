/**
 * AppShell - Responsive layout wrapper.
 * Neutral root wrapper for cross-app concerns.
 */

import type { ReactNode } from "react";
import { ToastProvider } from "../ui/Toast";
import { QueryProvider } from "@/shared/query/QueryProvider";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <QueryProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryProvider>
  );
}
