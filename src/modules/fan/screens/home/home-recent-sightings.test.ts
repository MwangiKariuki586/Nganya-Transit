import { describe, expect, it, vi } from "vitest";
import {
  aggregateRecentSightings,
  countHighActivityRecentSightings,
  countOnRouteRecentSightings,
  filterAggregatedRecentSightings,
  filterRecentSightingsByCorridor,
  getRecencyLabel,
} from "./home-recent-sightings";

function makeIso(minutesAgo: number) {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

describe("home recent sightings helpers", () => {
  it("filters sightings by the active corridor id and route label", () => {
    const filtered = filterRecentSightingsByCorridor({
      recentSightings: [
        { id: "1", corridor_id: "c1" },
        { id: "2", corridor_name: "Ngong Road" },
        { id: "3", corridor_name: "Thika Road" },
      ],
      activeCorridor: "c1",
      activeCorridorName: "Ngong Road",
    });

    expect(filtered.map((row) => row.id)).toEqual(["1", "2"]);
  });

  it("aggregates fresh sightings and prioritizes on-route rows", () => {
    vi.setSystemTime(new Date("2026-05-17T10:00:00.000Z"));

    const aggregated = aggregateRecentSightings({
      activeCorridor: "c1",
      corridors: [
        { id: "c1", name: "Thika Road" },
        { id: "c2", name: "Ngong Road" },
      ],
      sightings: [
        {
          nganya_id: "n1",
          corridor_id: "c1",
          direction: "OUTBOUND",
          created_at: makeIso(1),
          nganya: { name: "Matwana Express" },
          stage: { name: "Muthaiga" },
          user: { handle: "alice" },
        },
        {
          nganya_id: "n1",
          corridor_id: "c1",
          direction: "OUTBOUND",
          created_at: makeIso(2),
          nganya: { name: "Matwana Express" },
          stage: { name: "Muthaiga" },
          user: { handle: "bravo" },
        },
        {
          nganya_id: "n2",
          corridor_id: "c2",
          direction: "INBOUND",
          created_at: makeIso(4),
          nganya: { name: "Ngong Star" },
          stage: { name: "Adams" },
          user: { handle: "charlie" },
        },
        {
          nganya_id: "n3",
          corridor_id: "c2",
          created_at: makeIso(20),
          nganya: { name: "Expired Row" },
          user: { handle: "delta" },
        },
      ],
    });

    expect(aggregated).toHaveLength(2);
    expect(aggregated[0]?.nganyaId).toBe("n1");
    expect(aggregated[0]?.distinctUsersCount).toBe(2);
    expect(aggregated[0]?.signalLabel).toBe("2 riders confirmed");
    expect(countOnRouteRecentSightings(aggregated)).toBe(1);
    expect(countHighActivityRecentSightings(aggregated)).toBe(1);
    expect(
      filterAggregatedRecentSightings(aggregated, "HIGH_ACTIVITY").map(
        (row) => row.nganyaId,
      ),
    ).toEqual(["n1"]);
  });

  it("formats recent labels consistently", () => {
    vi.setSystemTime(new Date("2026-05-17T10:00:00.000Z"));
    expect(getRecencyLabel(1, makeIso(1))).toBe("Just now");
    expect(getRecencyLabel(15, makeIso(15))).toBe("15 min ago");
  });
});
