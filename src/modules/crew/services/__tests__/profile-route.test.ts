import { describe, expect, it, vi } from "vitest";
import { getCrewProfileServerFn } from "@/shared/server-fns/crew-profile";
import { loadCrewProfileRouteData } from "@/modules/crew/services/profile-route";
import { authRequired } from "@/shared/errors/app-error";

vi.mock("@/shared/server-fns/crew-profile", () => ({
  getCrewProfileServerFn: vi.fn(),
}));

describe("loadCrewProfileRouteData", () => {
  it("redirects to sign-in when auth is missing", async () => {
    vi.mocked(getCrewProfileServerFn).mockRejectedValueOnce(
      authRequired("Invalid authentication"),
    );

    const redirectResponse = await loadCrewProfileRouteData().catch(
      (error) => error as Response & { options?: Record<string, unknown> },
    );

    expect(redirectResponse.status).toBe(307);
    expect(redirectResponse.options).toMatchObject({
      to: "/signin",
      search: { returnTo: "/crew/profile" },
      replace: true,
    });
  });

  it("returns the profile when the server function succeeds", async () => {
    vi.mocked(getCrewProfileServerFn).mockResolvedValueOnce({
      id: "profile-1",
      handle: "matwana",
      full_name: "Matwana Crew",
      avatar_url: null,
      bio: null,
      role: "crew",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: null,
      cover_media_url: null,
      cover_media_type: null,
      cover_poster_url: null,
      cover_position_x: 50,
      cover_position_y: 32,
      cover_scale: 1.08,
    });

    await expect(loadCrewProfileRouteData()).resolves.toEqual({
      profile: expect.objectContaining({
        id: "profile-1",
        handle: "matwana",
      }),
    });
  });

  it("does not redirect non-auth loader failures", async () => {
    const error = new Error("Failed to load crew profile");
    vi.mocked(getCrewProfileServerFn).mockRejectedValueOnce(error);

    await expect(loadCrewProfileRouteData()).rejects.toMatchObject({
      code: "UNKNOWN",
      message: "Failed to load crew profile",
    });
  });
});
