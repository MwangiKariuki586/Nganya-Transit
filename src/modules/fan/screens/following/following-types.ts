import type { PlannerStorageContext } from "@/modules/fan/services/planner-storage";
import type { FollowingRouteData } from "@/modules/fan/services/route-data";

export const RECENT_WINDOW_MS = 90 * 60 * 1000;

export type DashboardStatus = "LIVE_NOW" | "RECENTLY_SEEN" | "OFFLINE";

export type PlannerContext = PlannerStorageContext;

export interface DashboardItem {
  id: string;
  slug: string;
  name: string;
  corridorId: string | null;
  corridorName: string;
  tags: string[];
  imageUrl: string;
  followers: number;
  isVerified: boolean;
  followCreatedAt: string | null;
  notifyLive: boolean;
  status: DashboardStatus;
  statusLabel: string;
  trustLabel: string;
  statusAt: string | null;
  liveSession: any | null;
  recentSighting: any | null;
  directionLabel: string | null;
  matchLabel: string | null;
  stageLabel: string | null;
  reasonLabel?: string;
  sharedTag?: string | null;
  matchesPlannerRoute: boolean;
  matchesPreferredNganya: boolean;
  sortScore: number;
}

export interface FollowingScreenProps {
  data: FollowingRouteData;
}
