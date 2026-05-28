import type {
  FanCorridorRecord,
  FanLiveNganyaRecord,
  FanNganyaRecord,
  FanRecentSightingRecord,
} from "@/modules/fan/lib/fan-data";

export type SpotStep = "where" | "which" | "evidence" | "confirm";
export type SignalQuality = "HIGH" | "MEDIUM" | "LOW";

export interface PlannerPlace {
  id: string;
  name: string;
  corridor_id?: string;
}

export interface CorridorSuggestion {
  corridorId: string | null;
  corridorName: string | null;
  source: "planner" | "location" | null;
}

export interface StageMatch {
  id: string;
  name: string;
  distance_m: number;
}

export interface SpotCandidate extends FanNganyaRecord {
  id: string;
  corridorName: string;
  liveCue: FanLiveNganyaRecord | null;
  recentCue: FanRecentSightingRecord | null;
  isFollowed: boolean;
  lastSeenAt: string | null;
  rank: number;
}

export type SpotSelectedCorridor = FanCorridorRecord | null;
export type SpotSelectedNganya = FanNganyaRecord | null;
export type SpotDuplicateSighting = FanRecentSightingRecord | null;

export interface SpotDraft {
  corridorId: string | null;
  direction: string | null;
  nganyaId: string | null;
  note: string;
  evidenceTags: string[];
  photoName: string | null;
}

export interface QualitySummary {
  level: SignalQuality;
  score: number;
  reasons: string[];
  factors: Array<{
    label: string;
    passed: boolean;
    detail: string;
  }>;
}

export const STEP_ORDER: SpotStep[] = ["where", "which", "evidence", "confirm"];

export const CONTEXT_TAGS = [
  "Loud sound",
  "Crowded",
  "Empty",
  "At stage",
  "Moving fast",
  "Traffic",
  "Parked",
  "Queueing",
] as const;
