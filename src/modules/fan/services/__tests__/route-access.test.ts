import { describe, expect, it, vi, beforeEach } from "vitest";

const resolveCurrentRole = vi.fn();

vi.mock("@/shared/auth/guards", () => ({
  getHomePathForRole: (role: string) =>
    role === "crew" ? "/crew" : role === "admin" ? "/admin" : "/",
  resolveCurrentRole,
}));

describe("requireFanRouteAccess", () => {
  beforeEach(() => {
    resolveCurrentRole.mockReset();
  });

  it("allows guests through the fan route group", async () => {
    resolveCurrentRole.mockResolvedValue(null);

    const { requireFanRouteAccess } = await import(
      "@/modules/fan/services/route-access"
    );

    await expect(requireFanRouteAccess()).resolves.toBeNull();
  });

  it("redirects non-fan roles to their home route", async () => {
    resolveCurrentRole.mockResolvedValue("crew");

    const { requireFanRouteAccess } = await import(
      "@/modules/fan/services/route-access"
    );

    await expect(requireFanRouteAccess()).rejects.toMatchObject({
      options: { to: "/crew" },
    });
  });
});
