import { render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockNavigate,
  mockLoadFanHomeRouteData,
  mockRouteUseLoaderData,
  mockRouteUseSearch,
  mockHomeScreen,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLoadFanHomeRouteData: vi.fn(),
  mockRouteUseLoaderData: vi.fn(),
  mockRouteUseSearch: vi.fn(),
  mockHomeScreen: vi.fn(),
}));

type OnCorridorChange = (corridorId: string | null) => void;

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: Record<string, unknown>) => ({
    ...config,
    useLoaderData: mockRouteUseLoaderData,
    useSearch: mockRouteUseSearch,
  }),
  useNavigate: () => mockNavigate,
}));

vi.mock("@/modules/fan/services/route-data", () => ({
  loadFanHomeRouteData: mockLoadFanHomeRouteData,
}));

vi.mock("@/modules/fan/screens/HomeScreen", () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockHomeScreen(props);
    return <div>mock-home-screen</div>;
  },
  HomeScreenSkeleton: () => <div>mock-home-skeleton</div>,
}));

import { Route } from "@/routes/(fan)/index";

describe("fan home route", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLoadFanHomeRouteData.mockReset();
    mockRouteUseLoaderData.mockReset();
    mockRouteUseSearch.mockReset();
    mockHomeScreen.mockReset();
  });

  it("normalizes supported search params", () => {
    expect(
      Route.validateSearch?.({
        q: "matatu",
        corridor: "corridor-1",
        vibe: "NEW_BUILD",
        recent: "all",
        ignored: "value",
      }),
    ).toEqual({
      q: "matatu",
      corridor: "corridor-1",
      vibe: "NEW_BUILD",
      recent: "all",
    });

    expect(
      Route.validateSearch?.({
        q: 42,
        corridor: false,
        vibe: {},
        recent: "recent",
      }),
    ).toEqual({
      q: undefined,
      corridor: undefined,
      vibe: undefined,
      recent: undefined,
    });
  });

  it("maps loader deps from the search state", () => {
    expect(
      Route.loaderDeps?.({
        search: {
          q: " route 11 ",
          corridor: "corridor-2",
          vibe: "LOUD",
        },
      } as never),
    ).toEqual({
      q: " route 11 ",
      corridor: "corridor-2",
      vibe: "LOUD",
    });

    expect(
      Route.loaderDeps?.({
        search: {},
      } as never),
    ).toEqual({
      q: "",
      corridor: null,
      vibe: null,
    });
  });

  it("passes shared fan context into the route loader", async () => {
    const shared = { corridors: [{ id: "c1" }], liveNganyas: [{ id: "l1" }] };
    mockLoadFanHomeRouteData.mockResolvedValue({ ok: true });

    const result = await Route.loader?.({
      deps: { q: "mat", corridor: "corridor-1", vibe: "NEW_BUILD" },
      context: { fanShared: shared },
    } as never);

    expect(mockLoadFanHomeRouteData).toHaveBeenCalledWith(
      {
        search: "mat",
        corridorId: "corridor-1",
        vibe: "NEW_BUILD",
      },
      shared,
    );
    expect(result).toEqual({ ok: true });
  });

  it("wires HomeScreen props from route state", () => {
    mockRouteUseLoaderData.mockReturnValue({ rows: [] });
    mockRouteUseSearch.mockReturnValue({
      q: "old",
      corridor: "corridor-9",
      vibe: "LOUD",
      recent: "all",
    });

    render(<Route.component />);

    expect(screen.getByText("mock-home-screen")).toBeTruthy();
    const props = mockHomeScreen.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(props.data).toEqual({ rows: [] });
    expect(props.activeCorridor).toBe("corridor-9");
    expect(props.showAllRecent).toBe(true);
    expect(props.onSearchChange).toBeUndefined();
  });

  it("updates corridor search state without disturbing unrelated params", () => {
    mockRouteUseLoaderData.mockReturnValue({ rows: [] });
    mockRouteUseSearch.mockReturnValue({});

    render(<Route.component />);
    const props = mockHomeScreen.mock.calls.at(-1)?.[0] as Record<string, unknown>;

    act(() => {
      (props.onCorridorChange as OnCorridorChange)("corridor-5");
    });

    const setCall = mockNavigate.mock.calls[0][0];
    expect(setCall.search({ q: "mat", recent: "all" })).toEqual({
      q: "mat",
      recent: "all",
      corridor: "corridor-5",
    });

    act(() => {
      (props.onCorridorChange as OnCorridorChange)(null);
    });

    const clearCall = mockNavigate.mock.calls[1][0];
    expect(clearCall.search({ q: "mat", recent: "all" })).toEqual({
      q: "mat",
      recent: "all",
      corridor: undefined,
    });
  });

  it("renders the pending skeleton", () => {
    render(<Route.pendingComponent />);
    expect(screen.getByText("mock-home-skeleton")).toBeTruthy();
  });
});
