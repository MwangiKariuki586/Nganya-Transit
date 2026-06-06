export type PermissionStateLocal = "prompt" | "granted" | "denied" | "unsupported";
export type NetworkStateLocal = "healthy" | "poor" | "offline";

export interface Coords {
  lat: number;
  lng: number;
  accuracy: number | null;
}

export interface StageOption {
  id: string;
  name: string;
  location: unknown;
}

export interface StartStageChoice {
  id: string;
  name: string;
  source: "auto" | "manual";
}
