/**
 * AppShell - Responsive layout wrapper.
 * Neutral root wrapper for cross-app concerns.
 */

import type { ReactNode } from "react";
import { ToastProvider } from "../ui/Toast";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return <ToastProvider>{children}</ToastProvider>;
}
