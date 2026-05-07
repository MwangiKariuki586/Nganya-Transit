import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import LiveCorridorMap from "@/components/features/tracking/LiveCorridorMap";

const {
  mockFetchCorridorNganyaMapPins,
  mockFetchStagePosition,
  mockChannel,
  mockRemoveChannel,
} = vi.hoisted(() => ({
  mockFetchCorridorNganyaMapPins: vi.fn(),
  mockFetchStagePosition: vi.fn(),
  mockChannel: vi.fn(),
  mockRemoveChannel: vi.fn(),
}));

vi.mock("react-map-gl/maplibre", async () => {
  const ReactModule = await import("react");

  const Map = ReactModule.forwardRef<any, any>(function MockMap(props, ref) {
    ReactModule.useImperativeHandle(ref, () => ({
      flyTo: vi.fn(),
      fitBounds: vi.fn(),
      getMap: () => ({
        isStyleLoaded: () => false,
        on: vi.fn(),
        off: vi.fn(),
        getLayer: vi.fn(),
        removeLayer: vi.fn(),
        getSource: vi.fn(),
        removeSource: vi.fn(),
        addSource: vi.fn(),
        getStyle: () => ({ layers: [] }),
        addLayer: vi.fn(),
        setPaintProperty: vi.fn(),
      }),
    }));

    return <div data-testid="mock-map">{props.children}</div>;
  });

  return {
    __esModule: true,
    default: Map,
    Marker: ({ children }: any) => <div>{children}</div>,
    NavigationControl: () => <div>nav-control</div>,
  };
});

vi.mock("@/hooks/useGeolocationStream", () => ({
  useGeolocationStream: () => ({ coords: null }),
}));

vi.mock("@/lib/queries/tracking", () => ({
  fetchCorridorNganyaMapPins: mockFetchCorridorNganyaMapPins,
  fetchStagePosition: mockFetchStagePosition,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock("@/components/features/tracking/TrackingMapMarkers", () => ({
  NganyaMarker: ({ label }: any) => <div>{label}</div>,
  StageMarker: ({ label }: any) => <div>{label}</div>,
  UserMarker: () => <div>user-marker</div>,
}));

describe("LiveCorridorMap", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));
    mockFetchStagePosition.mockReset();
    mockFetchCorridorNganyaMapPins.mockReset();
    mockChannel.mockReset();
    mockRemoveChannel.mockReset();
    mockFetchStagePosition.mockResolvedValue(null);
    mockChannel.mockImplementation(() => {
      const chain = {
        on: vi.fn(() => chain),
        subscribe: vi.fn(() => chain),
      };
      return chain;
    });
  });

  it("hides the ETA badge while stale last-known messaging is active", async () => {
    mockFetchCorridorNganyaMapPins.mockResolvedValue([
      {
        nganya_id: "nganya-1",
        nganya_name: "Matwana Express",
        profile_photo_url: null,
        position: { lat: -1.25, lng: 36.95 },
        pin_source: "SIGHTING",
        observed_at: "2026-05-01T11:45:00.000Z",
      },
    ]);

    render(
      <LiveCorridorMap
        isActive
        corridorId="corridor-1"
        corridorName="Thika Road"
        pickupStage={{ id: "stage-1", name: "Allsops" }}
        journeyResults={[
          {
            nganya_id: "nganya-1",
            nganya_name: "Matwana Express",
            corridor_id: "corridor-1",
            corridor_name: "Thika Road",
            tags: null,
            eta_minutes: 7,
            confidence_level: "MEDIUM",
            source: "SIGHTING",
            last_seen_at: "2026-05-01T11:45:00.000Z",
            profile_photo_url: null,
          },
        ]}
        onTrackNganya={vi.fn()}
        routeLine={{
          coordinates: [
            [36.95, -1.25],
            [36.9, -1.2],
          ],
        }}
        routeEtaSeconds={420}
        routeDistanceMeters={3500}
        routeSignalType="STALE"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("No fresh live signals · Showing last-known locations"),
      ).toBeTruthy();
    });

    expect(screen.queryByText(/ETA 7 min/i)).toBeNull();
    expect(screen.queryByText(/7 min estimate/i)).toBeNull();
    expect(screen.queryByText(/3.5 km/i)).toBeNull();
  });
});
