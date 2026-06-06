import type { PlannerRideOption } from "@/modules/fan/services/planner-assist";

export type RecentSightingFilter = "ALL" | "ON_ROUTE" | "HIGH_ACTIVITY";

export interface AggregatedRecentSightingRow {
  key: string;
  nganyaId: string;
  slug: string;
  nganyaName: string;
  corridorId: string | null;
  corridorName: string;
  direction: string | null;
  directionLabel: string | null;
  stageName: string | null;
  lastSeenAt: string;
  lastSeenMinutes: number;
  sightingsCountRecent: number;
  distinctUsersCount: number;
  confidenceLevel: "HIGH" | "MED" | "LOW";
  signalLabel: string;
  statusTone: "hot" | "warm" | "stale";
  onRoute: boolean;
}

export interface BrowseCardActionItem {
  id: string;
  slug: string;
  name: string;
  corridorId: string | null;
  corridorName: string;
  isLive: boolean;
}

export interface PlannerRiskPrompt {
  key: string;
  reason: "risky" | "stale" | "missing";
  alternative: PlannerRideOption | null;
}

export interface HomePlannerSeedTarget {
  id: string;
  name: string;
  corridorId: string | null;
  corridorName: string;
}
