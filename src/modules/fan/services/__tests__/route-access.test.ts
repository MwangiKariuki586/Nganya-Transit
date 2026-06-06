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

describe("requireAuthenticatedFanRouteAccess", () => {
  beforeEach(() => {
    resolveCurrentRole.mockReset();
  });

  it("allows authenticated fans through account-only fan routes", async () => {
    resolveCurrentRole.mockResolvedValue("fan");

    const { requireAuthenticatedFanRouteAccess } = await import(
      "@/modules/fan/services/route-access"
    );

    await expect(
      requireAuthenticatedFanRouteAccess("/following"),
    ).resolves.toBe("fan");
  });

  it("redirects guests to sign-in with the original fan route", async () => {
    resolveCurrentRole.mockResolvedValue(null);

    const { requireAuthenticatedFanRouteAccess } = await import(
      "@/modules/fan/services/route-access"
    );

    await expect(
      requireAuthenticatedFanRouteAccess("/spot"),
    ).rejects.toMatchObject({
      options: {
        to: "/signin",
        search: { returnTo: "/spot" },
      },
    });
  });

  it("redirects authenticated non-fan roles to their home route", async () => {
    resolveCurrentRole.mockResolvedValue("admin");

    const { requireAuthenticatedFanRouteAccess } = await import(
      "@/modules/fan/services/route-access"
    );

    await expect(
      requireAuthenticatedFanRouteAccess("/following"),
    ).rejects.toMatchObject({
      options: { to: "/admin" },
    });
  });
});
