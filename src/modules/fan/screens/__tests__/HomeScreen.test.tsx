import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomeScreen from "@/modules/fan/screens/HomeScreen";
import type { FanHomeRouteData } from "@/modules/fan/services/route-data";

const {
  mockRouterNavigate,
  mockRouterInvalidate,
  mockShowErrorToast,
  mockAddToast,
  mockFollowNganya,
  mockUnfollowNganya,
  mockSearchNganyaJourney,
  mockFetchStagePosition,
  mockFetchNganyaPosition,
  mockFetchOsrmRoute,
  mockSupabaseChannel,
  mockSupabaseRemoveChannel,
  mockScrollIntoView,
  cardRenderLog,
} = vi.hoisted(() => ({
  mockRouterNavigate: vi.fn(),
  mockRouterInvalidate: vi.fn(),
  mockShowErrorToast: vi.fn(),
  mockAddToast: vi.fn(),
  mockFollowNganya: vi.fn(),
  mockUnfollowNganya: vi.fn(),
  mockSearchNganyaJourney: vi.fn(),
  mockFetchStagePosition: vi.fn(),
  mockFetchNganyaPosition: vi.fn(),
  mockFetchOsrmRoute: vi.fn(),
  mockSupabaseChannel: vi.fn(),
  mockSupabaseRemoveChannel: vi.fn(),
  mockScrollIntoView: vi.fn(),
  cardRenderLog: [] as Array<Record<string, unknown>>,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockRouterNavigate,
  useRouter: () => ({
    navigate: mockRouterNavigate,
    invalidate: mockRouterInvalidate,
  }),
}));

vi.mock("@/components/ui/ToastContainer", () => ({
  useToast: () => ({
    showErrorToast: mockShowErrorToast,
    addToast: mockAddToast,
  }),
}));

vi.mock("@/components/ui/Card", () => ({
  __esModule: true,
  default: (props: any) => {
    cardRenderLog.push(props);
    return (
      <div data-testid={`card-${props.variant}-${props.nganya.name}`}>
        <span>{`${props.variant}:${props.nganya.name}`}</span>
        <button onClick={() => props.onFollow?.(props.nganya.id)}>
          {`follow-${props.nganya.name}`}
        </button>
        {props.primaryAction ? (
          <button onClick={() => props.primaryAction.onClick()}>
            {`card-primary-${props.nganya.name}`}
          </button>
        ) : null}
        {props.onCardClick ? (
          <button onClick={() => props.onCardClick()}>
            {`card-open-${props.nganya.name}`}
          </button>
        ) : null}
      </div>
    );
  },
}));

vi.mock("@/components/features/WhereToCard", () => ({
  __esModule: true,
  default: (props: any) => (
    <div>
      <div>{`planner-route:${props.value.toPlace?.name ?? "none"}`}</div>
      <button
        onClick={() =>
          props.onChange({
            toPlace: {
              id: "corridor-2",
              corridor_id: "corridor-2",
              name: "Ngong Road",
            },
            fromStage: { id: "stage-2", name: "Ngong Stage" },
            preference: "ANY",
            preferredNganya: null,
          })
        }
      >
        planner-change
      </button>
      <button
        onClick={() =>
          props.onSearch({
            toPlace: props.value.toPlace,
            fromStage: props.value.fromStage,
            preference: props.value.preference,
            preferredNganya: props.value.preferredNganya,
          })
        }
      >
        planner-search
      </button>
      <button onClick={() => props.onClear()}>planner-clear</button>
    </div>
  ),
}));

vi.mock("@/components/features/SearchResultsOverlayV2", () => ({
  __esModule: true,
  default: (props: any) => (
    <div>{`overlay:${props.preferredNganya?.name}:${props.toPlace?.name}`}</div>
  ),
}));

vi.mock("@/components/features/tracking/LiveCorridorMap", () => ({
  __esModule: true,
  default: (props: any) =>
    props.isActive ? (
      <div>
        <div>{`map-corridor:${props.corridorId ?? "none"}`}</div>
        <div>{`map-results:${props.journeyResults.length}`}</div>
        <div>{`route-line:${props.routeLine?.coordinates?.length ?? 0}`}</div>
        <div>{`route-eta:${props.routeEtaSeconds ?? "none"}`}</div>
        <div>{`route-distance:${props.routeDistanceMeters ?? "none"}`}</div>
        <div>{`is-routing:${String(props.isRouting)}`}</div>
        <button
          onClick={() =>
            props.onTrackNganya(
              props.journeyResults[0] ?? {
                nganya_id: "nganya-1",
                nganya_name: "Matwana Express",
                corridor_id: "corridor-1",
                corridor_name: "Thika Road",
                eta_minutes: 5,
              },
            )
          }
        >
          map-track
        </button>
      </div>
    ) : null,
}));

vi.mock("@/lib/queries/discover", () => ({
  searchNganyaJourney: mockSearchNganyaJourney,
}));

vi.mock("@/lib/queries/tracking", () => ({
  fetchStagePosition: mockFetchStagePosition,
  fetchNganyaPosition: mockFetchNganyaPosition,
}));

vi.mock("@/lib/osrm", () => ({
  fetchOsrmRoute: mockFetchOsrmRoute,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: mockSupabaseChannel,
    removeChannel: mockSupabaseRemoveChannel,
  },
}));

vi.mock("@/lib/queries/follows", () => ({
  followNganya: mockFollowNganya,
  unfollowNganya: mockUnfollowNganya,
}));

function makeIso(minutesAgo: number) {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

function seedPlannerContext(context?: {
  toPlace?: { id: string; name: string; corridor_id?: string } | null;
  fromStage?: { id: string; name: string } | null;
  preference?: "ANY" | "NEWEST" | "SPECIFIC";
  preferredNganya?: { id: string; name: string } | null;
}) {
  if (context?.toPlace) {
    window.localStorage.setItem("whereto_toPlace", JSON.stringify(context.toPlace));
  } else {
    window.localStorage.removeItem("whereto_toPlace");
  }

  if (context?.fromStage) {
    window.localStorage.setItem(
      "whereto_fromStage",
      JSON.stringify(context.fromStage),
    );
  } else {
    window.localStorage.removeItem("whereto_fromStage");
  }

  window.localStorage.setItem(
    "whereto_preference",
    context?.preference ?? "ANY",
  );

  if (context?.preferredNganya) {
    window.localStorage.setItem(
      "whereto_preferredNganya",
      JSON.stringify(context.preferredNganya),
    );
  } else {
    window.localStorage.removeItem("whereto_preferredNganya");
  }
}

function makeHomeData(overrides: Partial<FanHomeRouteData> = {}): FanHomeRouteData {
  return {
    isAuthenticated: true,
    search: "",
    activeCorridor: null,
    activeVibe: null,
    corridors: [
      { id: "corridor-1", name: "Thika Road" },
      { id: "corridor-2", name: "Ngong Road" },
    ],
    nganyas: [
      {
        id: "nganya-1",
        name: "Matwana Express",
        slug: "matwana-express",
        corridor_id: "corridor-1",
        corridor_name: "Thika Road",
        tags: ["NEW_BUILD"],
        created_at: "2026-05-01T10:00:00.000Z",
        follower_count: 30,
        sighting_count_today: 4,
        nganya_media: [{ media_url: "https://example.com/1.jpg", media_type: "image" }],
      },
      {
        id: "nganya-2",
        name: "Ngong Star",
        slug: "ngong-star",
        corridor_id: "corridor-2",
        corridor_name: "Ngong Road",
        tags: ["LOUD"],
        created_at: "2026-05-01T09:00:00.000Z",
        follower_count: 20,
        sighting_count_today: 2,
        nganya_media: [{ media_url: "https://example.com/2.jpg", media_type: "image" }],
      },
      {
        id: "nganya-3",
        name: "CBD Runner",
        slug: "cbd-runner",
        corridor_id: "corridor-1",
        corridor_name: "Thika Road",
        tags: [],
        created_at: "2026-05-01T08:00:00.000Z",
        follower_count: 10,
        sighting_count_today: 1,
        nganya_media: [{ media_url: "https://example.com/3.jpg", media_type: "image" }],
      },
      {
        id: "nganya-4",
        name: "Route Veteran",
        slug: "route-veteran",
        corridor_id: "corridor-1",
        corridor_name: "Thika Road",
        tags: [],
        created_at: "2026-05-01T07:00:00.000Z",
        follower_count: 8,
        sighting_count_today: 1,
        nganya_media: [{ media_url: "https://example.com/4.jpg", media_type: "image" }],
      },
    ],
    liveNganyas: [
      {
        id: "live-1",
        nganya_id: "nganya-1",
        nganya_name: "Matwana Express",
        corridor_id: "corridor-1",
        corridor_name: "Thika Road",
        last_ping_at: "2026-05-01T11:58:00.000Z",
        profile_photo_url: "https://example.com/live.jpg",
        tags: ["NEW_BUILD"],
      },
    ],
    recentSightings: [
      {
        id: "s1",
        nganya_id: "nganya-1",
        corridor_id: "corridor-1",
        direction: "OUTBOUND",
        created_at: makeIso(1),
        stage: { name: "Muthaiga" },
        nganya: { name: "Matwana Express", corridors: { name: "Thika Road" } },
        user: { handle: "alice" },
      },
      {
        id: "s2",
        nganya_id: "nganya-1",
        corridor_id: "corridor-1",
        direction: "OUTBOUND",
        created_at: makeIso(2),
        stage: { name: "Muthaiga" },
        nganya: { name: "Matwana Express", corridors: { name: "Thika Road" } },
        user: { handle: "bravo" },
      },
      {
        id: "s3",
        nganya_id: "nganya-2",
        corridor_id: "corridor-2",
        direction: "INBOUND",
        created_at: makeIso(10),
        stage: { name: "Adams" },
        nganya: { name: "Ngong Star", corridors: { name: "Ngong Road" } },
        user: { handle: "charlie" },
      },
      {
        id: "s4",
        nganya_id: "nganya-4",
        corridor_id: "corridor-1",
        direction: "OUTBOUND",
        created_at: makeIso(20),
        stage: { name: "Roysambu" },
        nganya: { name: "Route Veteran", corridors: { name: "Thika Road" } },
        user: { handle: "delta" },
      },
    ],
    followedIds: new Set<string>(),
    ...overrides,
  };
}

function renderHome(
  props: Partial<Parameters<typeof HomeScreen>[0]> = {},
  dataOverrides: Partial<FanHomeRouteData> = {},
) {
  const onCorridorChange = vi.fn();
  const view = render(
    <HomeScreen
      data={makeHomeData(dataOverrides)}
      activeCorridor={null}
      onCorridorChange={onCorridorChange}
      showAllRecent={false}
      {...props}
    />,
  );

  return {
    ...view,
    onCorridorChange,
  };
}

describe("HomeScreen", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));
    window.localStorage.clear();
    seedPlannerContext();
    cardRenderLog.length = 0;
    mockRouterNavigate.mockReset();
    mockRouterInvalidate.mockReset();
    mockShowErrorToast.mockReset();
    mockAddToast.mockReset();
    mockFollowNganya.mockReset();
    mockUnfollowNganya.mockReset();
    mockSearchNganyaJourney.mockReset();
    mockFetchStagePosition.mockReset();
    mockFetchNganyaPosition.mockReset();
    mockFetchOsrmRoute.mockReset();
    mockSupabaseChannel.mockReset();
    mockSupabaseRemoveChannel.mockReset();
    mockScrollIntoView.mockReset();
    mockSearchNganyaJourney.mockResolvedValue([]);
    mockFetchStagePosition.mockResolvedValue({ lat: -1.2, lng: 36.9 });
    mockFetchNganyaPosition.mockResolvedValue({ lat: -1.25, lng: 36.95 });
    mockFetchOsrmRoute.mockResolvedValue({
      coordinates: [
        [36.95, -1.25],
        [36.9, -1.2],
      ],
      durationSeconds: 240,
      distanceMeters: 3500,
    });
    mockSupabaseChannel.mockImplementation(() => {
      const chain = {
        on: vi.fn(() => chain),
        subscribe: vi.fn(() => chain),
      };
      return chain;
    });
    if (!window.HTMLElement.prototype.scrollIntoView) {
      Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        writable: true,
        value: vi.fn(),
      });
    }
    vi
      .spyOn(window.HTMLElement.prototype, "scrollIntoView")
      .mockImplementation(mockScrollIntoView);
    vi.stubGlobal("scrollTo", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the core home sections and route cards", async () => {
    const { onCorridorChange } = renderHome();

    expect(screen.getByText("Plan fast, catch faster")).toBeTruthy();
    expect(await screen.findByText("map-corridor:none")).toBeTruthy();
    expect(screen.getByText("Recently Spotted")).toBeTruthy();
    expect(screen.queryByText("Live on this route")).toBeNull();
    expect(screen.queryByText("feature:Matwana Express")).toBeNull();
    expect(screen.queryByText(/^On your route/)).toBeNull();
    expect(screen.getByText("2 nganyas spotted in the last 15 min")).toBeTruthy();

    fireEvent.click(screen.getByText(/^High activity/));
    expect(screen.getByText("Matwana Express")).toBeTruthy();
    expect(screen.queryByText("Ngong Star")).toBeNull();

    expect(onCorridorChange).not.toHaveBeenCalled();
  });

  it("shows route-specific chips and falls back to all recent sightings when the active corridor has no matches", () => {
    renderHome(
      { activeCorridor: "corridor-1" },
      {
        liveNganyas: [],
        recentSightings: [
          {
            id: "s-only",
            nganya_id: "nganya-2",
            corridor_id: "corridor-2",
            direction: "INBOUND",
            created_at: makeIso(5),
            stage: { name: "Adams" },
            nganya: { name: "Ngong Star", corridors: { name: "Ngong Road" } },
            user: { handle: "echo" },
          },
        ],
      },
    );

    expect(screen.getByText("Recently Spotted")).toBeTruthy();
    expect(screen.queryByText("Live on this route")).toBeNull();
    expect(screen.getByText(/^On your route/)).toBeTruthy();
    expect(screen.getByText("Ngong Star")).toBeTruthy();
  });

  it("toggles recent sighting expansion through router search state", () => {
    renderHome();

    fireEvent.click(screen.getByText("See all"));
    const seeAllCall = mockRouterNavigate.mock.calls[0][0];
    expect(seeAllCall.to).toBe("/");
    expect(seeAllCall.search({ q: "mat" })).toEqual({
      q: "mat",
      recent: "all",
    });

    mockRouterNavigate.mockReset();
    renderHome({ showAllRecent: true });
    fireEvent.click(screen.getByText("Show less"));
    const showLessCall = mockRouterNavigate.mock.calls[0][0];
    expect(showLessCall.search({ q: "mat", recent: "all" })).toEqual({
      q: "mat",
      recent: undefined,
    });
  });

  it("routes the empty recent state to the spot flow", () => {
    renderHome({}, { recentSightings: [] });

    expect(screen.getByText("No recent sightings yet")).toBeTruthy();
    fireEvent.click(screen.getByText("Be the first to spot"));
    expect(mockRouterNavigate).toHaveBeenCalledWith({ to: "/spot" });
  });

  it("opens tracking overlay for a recent row when planner context can track", async () => {
    seedPlannerContext({
      toPlace: { id: "corridor-1", corridor_id: "corridor-1", name: "Thika Road" },
      fromStage: { id: "stage-1", name: "Muthaiga" },
      preference: "ANY",
    });

    const { onCorridorChange } = renderHome(
      { activeCorridor: "corridor-1" },
      { liveNganyas: [] },
    );

    await waitFor(() => {
      expect(onCorridorChange).toHaveBeenCalledWith("corridor-1");
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Track" })[0]);
    expect(
      await screen.findByText("overlay:Matwana Express:Thika Road"),
    ).toBeTruthy();
  });

  it("seeds the planner and avoids double firing when the recent row CTA is clicked", async () => {
    const { onCorridorChange } = renderHome(
      { activeCorridor: "corridor-1" },
      { liveNganyas: [] },
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Plan ride" })[0]);

    expect(mockAddToast).toHaveBeenCalledTimes(1);
    expect(mockAddToast).toHaveBeenCalledWith(
      "Route set to Thika Road. Pick your pickup stage to plan with Matwana Express.",
      "info",
    );
    expect(scrollTo).toHaveBeenCalled();

    await waitFor(() => {
      expect(onCorridorChange).toHaveBeenCalledWith("corridor-1");
    });
  });

  it("clears planner overlays on planner change and planner clear", async () => {
    seedPlannerContext({
      toPlace: { id: "corridor-1", corridor_id: "corridor-1", name: "Thika Road" },
      fromStage: { id: "stage-1", name: "Muthaiga" },
      preference: "ANY",
    });

    renderHome({ activeCorridor: "corridor-1" });

    fireEvent.click(await screen.findByText("map-track"));
    await waitFor(() => {
      expect(screen.getByText("route-line:2")).toBeTruthy();
    });

    fireEvent.click(await screen.findByText("planner-search"));
    await waitFor(() => {
      expect(screen.getByText("route-line:0")).toBeTruthy();
    });

    fireEvent.click(await screen.findByText("planner-change"));
    await waitFor(() => {
      expect(screen.getByText("planner-route:Ngong Road")).toBeTruthy();
      expect(screen.getByText("route-line:0")).toBeTruthy();
    });

    fireEvent.click(await screen.findByText("planner-clear"));
    await waitFor(() => {
      expect(screen.getByText("planner-route:none")).toBeTruthy();
      expect(screen.getByText("map-corridor:corridor-1")).toBeTruthy();
    });
  });

  it("smooth scrolls to the ride watch section when find my ride is submitted", async () => {
    seedPlannerContext({
      toPlace: { id: "corridor-1", corridor_id: "corridor-1", name: "Thika Road" },
      fromStage: { id: "stage-1", name: "Muthaiga" },
      preference: "ANY",
    });
    mockSearchNganyaJourney.mockResolvedValue([
      {
        nganya_id: "nganya-1",
        nganya_name: "Matwana Express",
        corridor_id: "corridor-1",
        corridor_name: "Thika Road",
        tags: ["NEW_BUILD"],
        eta_minutes: 6,
        confidence_level: "HIGH",
        source: "LIVE",
        last_seen_at: "2026-05-01T11:59:40.000Z",
      },
    ]);

    renderHome({ activeCorridor: "corridor-1" });

    fireEvent.click(await screen.findByText("planner-search"));

    await waitFor(() => {
      expect(
        screen.getByText("Ride watch").closest("section")?.getAttribute("style"),
      ).toContain("scroll-margin-top: calc(var(--top-nav-height) + 16px)");
    });
  });

  it("shows the connected ride-watch panel and lets the user watch a recommended ride on the existing map", async () => {
    seedPlannerContext({
      toPlace: { id: "corridor-1", corridor_id: "corridor-1", name: "Thika Road" },
      fromStage: { id: "stage-1", name: "Muthaiga" },
      preference: "ANY",
    });
    mockSearchNganyaJourney.mockResolvedValue([
      {
        nganya_id: "nganya-1",
        nganya_name: "Matwana Express",
        corridor_id: "corridor-1",
        corridor_name: "Thika Road",
        tags: ["NEW_BUILD"],
        eta_minutes: 6,
        confidence_level: "HIGH",
        source: "LIVE",
        last_seen_at: "2026-05-01T11:59:40.000Z",
      },
      {
        nganya_id: "nganya-3",
        nganya_name: "CBD Runner",
        corridor_id: "corridor-1",
        corridor_name: "Thika Road",
        tags: [],
        eta_minutes: 8,
        confidence_level: "MEDIUM",
        source: "SIGHTING",
        last_seen_at: "2026-05-01T11:57:00.000Z",
      },
    ]);

    renderHome({ activeCorridor: "corridor-1" });

    await waitFor(() => {
      expect(screen.getByText("Ride watch")).toBeTruthy();
      expect(screen.getByText("Best ride now")).toBeTruthy();
      expect(screen.getAllByText("Matwana Express").length).toBeGreaterThan(0);
      expect(screen.getByText("Backup rides")).toBeTruthy();
    });

    expect(screen.getByText("map-corridor:corridor-1").closest("section")?.getAttribute("style")).toContain(
      "scroll-margin-top: calc(var(--top-nav-height) + 16px)",
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Watch on map" })[0]);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(
        "Watching Matwana Express for your pickup.",
        "info",
      );
      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
      });
      expect(screen.getByText("Watched ride")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Refresh on map" })).toBeTruthy();
      expect(screen.getByText("route-line:2")).toBeTruthy();
      expect(screen.getByText("route-eta:240")).toBeTruthy();
      expect(screen.getByText("route-distance:3500")).toBeTruthy();
    });
  });

  it("prompts the user to switch or keep watching when the watched ride turns risky", async () => {
    vi.useRealTimers();
    seedPlannerContext({
      toPlace: { id: "corridor-1", corridor_id: "corridor-1", name: "Thika Road" },
      fromStage: { id: "stage-1", name: "Muthaiga" },
      preference: "ANY",
    });
    mockSearchNganyaJourney
      .mockResolvedValueOnce([
        {
          nganya_id: "nganya-1",
          nganya_name: "Matwana Express",
          corridor_id: "corridor-1",
          corridor_name: "Thika Road",
          tags: ["NEW_BUILD"],
          eta_minutes: 6,
          confidence_level: "HIGH",
          source: "LIVE",
          last_seen_at: "2026-05-01T11:59:40.000Z",
        },
        {
          nganya_id: "nganya-3",
          nganya_name: "CBD Runner",
          corridor_id: "corridor-1",
          corridor_name: "Thika Road",
          tags: [],
          eta_minutes: 7,
          confidence_level: "MEDIUM",
          source: "LIVE",
          last_seen_at: "2026-05-01T11:59:10.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          nganya_id: "nganya-1",
          nganya_name: "Matwana Express",
          corridor_id: "corridor-1",
          corridor_name: "Thika Road",
          tags: ["NEW_BUILD"],
          eta_minutes: 2,
          confidence_level: "HIGH",
          source: "LIVE",
          last_seen_at: "2026-05-01T11:59:40.000Z",
        },
        {
          nganya_id: "nganya-3",
          nganya_name: "CBD Runner",
          corridor_id: "corridor-1",
          corridor_name: "Thika Road",
          tags: [],
          eta_minutes: 6,
          confidence_level: "HIGH",
          source: "LIVE",
          last_seen_at: "2026-05-01T11:59:40.000Z",
        },
      ]);

    renderHome({ activeCorridor: "corridor-1" });

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: "Watch on map" }).length,
      ).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Watch on map" })[0]);
    const plannerChannel = mockSupabaseChannel.mock.results[0]?.value;
    const liveSessionRefresh = plannerChannel?.on?.mock?.calls?.[0]?.[2];
    expect(typeof liveSessionRefresh).toBe("function");
    await act(async () => {
      liveSessionRefresh();
      await new Promise((resolve) => setTimeout(resolve, 1700));
    });

    await waitFor(() => {
      expect(screen.getByText("Your watched ride is stale now.")).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "Switch to CBD Runner" }),
      ).toBeTruthy();
      expect(screen.getByRole("button", { name: "Keep watching" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Switch to CBD Runner" }));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("Switched to CBD Runner.", "success");
      expect(screen.getByText("Watching CBD Runner for Muthaiga.")).toBeTruthy();
    });
  });

  it("sends unauthenticated alert actions to sign-in from the planner panel", async () => {
    seedPlannerContext({
      toPlace: { id: "corridor-1", corridor_id: "corridor-1", name: "Thika Road" },
      fromStage: { id: "stage-1", name: "Muthaiga" },
      preference: "ANY",
    });
    mockSearchNganyaJourney.mockResolvedValue([
      {
        nganya_id: "nganya-1",
        nganya_name: "Matwana Express",
        corridor_id: "corridor-1",
        corridor_name: "Thika Road",
        tags: ["NEW_BUILD"],
        eta_minutes: 5,
        confidence_level: "HIGH",
        source: "LIVE",
        last_seen_at: "2026-05-01T11:59:40.000Z",
      },
    ]);
    renderHome({ activeCorridor: "corridor-1" }, { isAuthenticated: false });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Follow route alerts" }),
      ).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Follow route alerts" }));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(
        "Sign in to keep ride alerts on.",
        "info",
      );
      expect(mockRouterNavigate).toHaveBeenCalledWith({
        to: "/signin",
        search: { returnTo: "/" },
      });
      expect(mockFollowNganya).not.toHaveBeenCalled();
    });
  });

  it("sends unauthenticated live tracking actions to sign-in", async () => {
    seedPlannerContext({
      toPlace: { id: "corridor-1", corridor_id: "corridor-1", name: "Thika Road" },
      fromStage: { id: "stage-1", name: "Muthaiga" },
      preference: "ANY",
    });

    renderHome({ activeCorridor: "corridor-1" }, { isAuthenticated: false });

    fireEvent.click(await screen.findByText("map-track"));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(
        "Sign in to track live rides.",
        "info",
      );
      expect(mockRouterNavigate).toHaveBeenCalledWith({
        to: "/signin",
        search: { returnTo: "/" },
      });
      expect(mockFetchOsrmRoute).not.toHaveBeenCalled();
    });
  });

  it("tracks a live nganya and reuses the same route key without re-fetching OSRM", async () => {
    seedPlannerContext({
      toPlace: { id: "corridor-1", corridor_id: "corridor-1", name: "Thika Road" },
      fromStage: { id: "stage-1", name: "Muthaiga" },
      preference: "ANY",
    });

    renderHome({ activeCorridor: "corridor-1" });

    fireEvent.click(await screen.findByText("map-track"));
    await waitFor(() => {
      expect(mockFetchOsrmRoute).toHaveBeenCalledTimes(1);
      expect(screen.getByText("route-line:2")).toBeTruthy();
      expect(screen.getByText("route-eta:240")).toBeTruthy();
      expect(screen.getByText("route-distance:3500")).toBeTruthy();
    });

    fireEvent.click(await screen.findByText("map-track"));
    await waitFor(() => {
      expect(mockFetchOsrmRoute).toHaveBeenCalledTimes(1);
    });
  });

  it("falls back to a straight line and eta when OSRM fails", async () => {
    seedPlannerContext({
      toPlace: { id: "corridor-1", corridor_id: "corridor-1", name: "Thika Road" },
      fromStage: { id: "stage-1", name: "Muthaiga" },
      preference: "ANY",
    });
    mockFetchOsrmRoute.mockRejectedValueOnce(new Error("network"));

    renderHome({ activeCorridor: "corridor-1" });

    fireEvent.click(await screen.findByText("map-track"));
    await waitFor(() => {
      expect(screen.getByText("route-line:2")).toBeTruthy();
      expect(screen.getByText("route-eta:300")).toBeTruthy();
      expect(screen.getByText("route-distance:none")).toBeTruthy();
    });
  });

  it("skips route rendering when stage or nganya positions are missing", async () => {
    seedPlannerContext({
      toPlace: { id: "corridor-1", corridor_id: "corridor-1", name: "Thika Road" },
      fromStage: { id: "stage-1", name: "Muthaiga" },
      preference: "ANY",
    });
    mockFetchStagePosition.mockResolvedValueOnce(null);

    renderHome({ activeCorridor: "corridor-1" });

    fireEvent.click(await screen.findByText("map-track"));
    await waitFor(() => {
      expect(mockFetchOsrmRoute).not.toHaveBeenCalled();
      expect(screen.getByText("route-line:0")).toBeTruthy();
      expect(screen.getByText("is-routing:false")).toBeTruthy();
    });
  });

  it("follows, unfollows, and reports follow failures", async () => {
    const followedIds = new Set<string>(["nganya-1"]);
    mockUnfollowNganya.mockResolvedValue(undefined);
    mockFollowNganya.mockResolvedValue(undefined);

    const { rerender } = render(
      <HomeScreen
        data={makeHomeData({ followedIds })}
        activeCorridor="corridor-1"
        onCorridorChange={vi.fn()}
        showAllRecent={false}
      />,
    );

    fireEvent.click(screen.getAllByText("follow-Matwana Express")[0]);
    await waitFor(() => {
      expect(mockUnfollowNganya).toHaveBeenCalledWith("nganya-1");
      expect(mockRouterInvalidate).not.toHaveBeenCalled();
    });

    rerender(
      <HomeScreen
        data={makeHomeData({ followedIds: new Set<string>() })}
        activeCorridor="corridor-1"
        onCorridorChange={vi.fn()}
        showAllRecent={false}
      />,
    );

    fireEvent.click(screen.getAllByText("follow-Matwana Express")[0]);
    await waitFor(() => {
      expect(mockFollowNganya).toHaveBeenCalledWith("nganya-1");
    });

    rerender(
      <HomeScreen
        data={makeHomeData({ followedIds: new Set<string>() })}
        activeCorridor="corridor-1"
        onCorridorChange={vi.fn()}
        showAllRecent={false}
      />,
    );

    mockFollowNganya.mockRejectedValueOnce(new Error("fail"));
    fireEvent.click(screen.getAllByText("follow-Matwana Express")[0]);
    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith("Failed to update follow.");
    });
  });

  it("shows one consolidated live-route section and keeps the featured live nganya out of the lower grid", () => {
    renderHome(
      { activeCorridor: "corridor-1" },
      {
        nganyas: [
          {
            id: "nganya-1",
            name: "Matwana Express",
            slug: "matwana-express",
            corridor_id: "corridor-1",
            corridor_name: "Thika Road",
            tags: ["NEW_BUILD"],
            created_at: "2026-05-01T10:00:00.000Z",
            follower_count: 30,
            sighting_count_today: 4,
            nganya_media: [{ media_url: "https://example.com/1.jpg", media_type: "image" }],
          },
          {
            id: "nganya-5",
            name: "Newest Route",
            slug: "newest-route",
            corridor_id: "corridor-1",
            corridor_name: "Thika Road",
            tags: [],
            created_at: "2026-05-01T11:00:00.000Z",
            follower_count: 5,
            sighting_count_today: 1,
            nganya_media: [{ media_url: "https://example.com/5.jpg", media_type: "image" }],
          },
          {
            id: "nganya-3",
            name: "CBD Runner",
            slug: "cbd-runner",
            corridor_id: "corridor-1",
            corridor_name: "Thika Road",
            tags: [],
            created_at: "2026-05-01T08:00:00.000Z",
            follower_count: 10,
            sighting_count_today: 1,
            nganya_media: [{ media_url: "https://example.com/3.jpg", media_type: "image" }],
          },
          {
            id: "nganya-4",
            name: "Route Veteran",
            slug: "route-veteran",
            corridor_id: "corridor-1",
            corridor_name: "Thika Road",
            tags: [],
            created_at: "2026-05-01T07:00:00.000Z",
            follower_count: 8,
            sighting_count_today: 1,
            nganya_media: [{ media_url: "https://example.com/4.jpg", media_type: "image" }],
          },
          {
            id: "nganya-2",
            name: "Ngong Star",
            slug: "ngong-star",
            corridor_id: "corridor-2",
            corridor_name: "Ngong Road",
            tags: ["LOUD"],
            created_at: "2026-05-01T09:00:00.000Z",
            follower_count: 20,
            sighting_count_today: 2,
            nganya_media: [{ media_url: "https://example.com/2.jpg", media_type: "image" }],
          },
        ],
        liveNganyas: [
          {
            id: "live-1",
            nganya_id: "nganya-1",
            nganya_name: "Matwana Express",
            corridor_id: "corridor-1",
            corridor_name: "Thika Road",
            last_ping_at: "2026-05-01T11:58:00.000Z",
            profile_photo_url: "https://example.com/live.jpg",
            tags: ["NEW_BUILD"],
          },
          {
            id: "live-5",
            nganya_id: "nganya-5",
            nganya_name: "Newest Route",
            corridor_id: "corridor-1",
            corridor_name: "Thika Road",
            last_ping_at: "2026-05-01T11:57:00.000Z",
            profile_photo_url: "https://example.com/live-5.jpg",
            tags: [],
          },
          {
            id: "live-3",
            nganya_id: "nganya-3",
            nganya_name: "CBD Runner",
            corridor_id: "corridor-1",
            corridor_name: "Thika Road",
            last_ping_at: "2026-05-01T11:55:00.000Z",
            profile_photo_url: "https://example.com/live-3.jpg",
            tags: [],
          },
          {
            id: "live-4",
            nganya_id: "nganya-4",
            nganya_name: "Route Veteran",
            corridor_id: "corridor-1",
            corridor_name: "Thika Road",
            last_ping_at: "2026-05-01T11:54:00.000Z",
            profile_photo_url: "https://example.com/live-4.jpg",
            tags: [],
          },
        ],
      },
    );

    expect(screen.getByText("Live on this route")).toBeTruthy();
    expect(screen.queryByText("Recently Spotted")).toBeNull();
    expect(screen.getByText("feature:Matwana Express")).toBeTruthy();
    const featuredCardEntry = cardRenderLog.find(
      (entry: any) =>
        entry.variant === "feature" &&
        entry.nganya?.name === "Matwana Express",
    ) as any;
    expect(featuredCardEntry?.nganya?.imageUrl).toBe(
      "https://example.com/1.jpg",
    );

    const liveRouteSection = screen.getByText("Live on this route").closest("section");
    const routeGrid = (liveRouteSection as HTMLElement).querySelector(".grid-cards");
    const routeCardNames = within(routeGrid as HTMLElement)
      .getAllByTestId(/card-standard-/)
      .map((node) => node.textContent);
    expect(routeCardNames.join("|")).toContain("standard:Newest Route");
    expect(routeCardNames.join("|")).toContain("standard:CBD Runner");
    expect(routeCardNames.join("|")).toContain("standard:Route Veteran");
    expect(routeCardNames.join("|")).not.toContain("standard:Matwana Express");
    expect(screen.getByRole("link", { name: "View all" }).getAttribute("href")).toBe(
      "/discover?corridorId=corridor-1",
    );
  });
});
