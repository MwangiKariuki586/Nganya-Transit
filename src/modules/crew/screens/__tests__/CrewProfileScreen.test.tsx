import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrewProfileScreen } from "@/modules/crew/screens/CrewProfileScreen";

const mockInvalidate = vi.fn();
const mockUseLoaderData = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    invalidate: mockInvalidate,
  }),
}));

vi.mock("@/routes/(crew)/crew/profile", () => ({
  Route: {
    useLoaderData: () => mockUseLoaderData(),
  },
}));

vi.mock("@/shared/server-fns/crew-profile", () => ({
  updateCrewProfileServerFn: vi.fn(),
}));

vi.mock("@/lib/storage/profile-media", () => ({
  replaceAvatar: vi.fn(),
  replaceCoverMedia: vi.fn(),
}));

vi.mock("@/hooks/useAuthSession", () => ({
  useAuthSession: () => ({
    session: {
      user: { id: "user-1" },
      access_token: "token-1",
    },
  }),
}));

vi.mock("@/components/ui/ToastContainer", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock("@/modules/crew/context/CrewBootstrapContext", () => ({
  useCrewBootstrap: () => ({
    snapshot: {
      bootstrap: {
        assignment: null,
      },
    },
  }),
}));

vi.mock("@/lib/utils/retry", () => ({
  retryWithBackoff: vi.fn(),
  isNetworkError: vi.fn(() => false),
}));

vi.mock("@/lib/utils/image-compress", () => ({
  compressImage: vi.fn(),
  formatFileSize: vi.fn(() => "1 MB"),
}));

vi.mock("@/shared/supabase/browser-client", () => ({
  browserSupabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ count: 0 })),
      })),
    })),
  },
}));

vi.mock("@/components/ui/UploadProgress", () => ({
  default: () => null,
}));

vi.mock("@/components/ui/ConfirmDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/ui/AvatarRing", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  computeCompleteness: () => ({ percentage: 0, status: "incomplete" }),
}));

vi.mock("@/components/ui/MediaLightbox", () => ({
  __esModule: true,
  default: () => null,
}));

describe("CrewProfileScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:cover-preview"),
      revokeObjectURL: vi.fn(),
    });
    mockInvalidate.mockReset();
    mockUseLoaderData.mockReturnValue({
      profile: {
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
      },
    });
  });

  it("updates the cover preview after selecting a file in edit mode", () => {
    render(<CrewProfileScreen />);

    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));

    const coverInput = screen.getByLabelText(/change cover/i);
    const coverFile = new File(["cover"], "cover.jpg", { type: "image/jpeg" });

    fireEvent.change(coverInput, { target: { files: [coverFile] } });

    expect(coverInput.getAttribute("type")).toBe("file");
    expect(coverInput.getAttribute("accept")).toBe("image/jpeg,image/png,image/webp");
    expect(screen.getByAltText("Cover").getAttribute("src")).toBe(
      "blob:cover-preview",
    );
    expect(
      screen.getByRole("button", { name: /save cover photo/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /discard cover change/i }),
    ).toBeTruthy();
  });

  it("uploads avatar independently after confirmation", async () => {
    mockUseLoaderData.mockReturnValue({
      profile: {
        id: "profile-1",
        handle: "matwana",
        full_name: "Matwana Crew",
        avatar_url: "https://example.com/original-avatar.jpg",
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
      },
    });

    const { retryWithBackoff } = await import("@/lib/utils/retry");
    const { compressImage } = await import("@/lib/utils/image-compress");
    const { replaceAvatar } = await import("@/lib/storage/profile-media");
    const { updateCrewProfileServerFn } = await import(
      "@/shared/server-fns/crew-profile"
    );

    vi.mocked(retryWithBackoff).mockImplementation(async (fn: any) => fn());
    vi.mocked(compressImage).mockResolvedValue(
      new File(["avatar"], "avatar.jpg", { type: "image/jpeg" }),
    );
    vi.mocked(replaceAvatar).mockResolvedValue({
      url: "https://example.com/uploaded-avatar.jpg",
      path: "avatars/user-1/avatar.jpg",
      type: "image",
    });
    vi.mocked(updateCrewProfileServerFn).mockResolvedValue(undefined as never);

    render(<CrewProfileScreen />);

    const avatar = screen.getByAltText("matwana") as HTMLImageElement;
    expect(avatar.src).toBe("https://example.com/original-avatar.jpg");

    const uploadInput = document.getElementById(
      "avatar-upload-input",
    ) as HTMLInputElement;
    const avatarFile = new File(["avatar"], "avatar.jpg", {
      type: "image/jpeg",
    });

    fireEvent.change(uploadInput, { target: { files: [avatarFile] } });

    expect(
      screen.getByRole("button", { name: /confirm avatar change/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /discard avatar change/i }),
    ).toBeTruthy();
    expect((screen.getByAltText("matwana") as HTMLImageElement).src).toBe(
      "blob:cover-preview",
    );

    fireEvent.click(
      screen.getByRole("button", { name: /confirm avatar change/i }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /confirm avatar change/i })).toBeNull();
      expect((screen.getByAltText("matwana") as HTMLImageElement).src).toBe(
        "https://example.com/uploaded-avatar.jpg",
      );
      expect(replaceAvatar).toHaveBeenCalled();
      expect(updateCrewProfileServerFn).toHaveBeenCalledWith({
        data: {
          accessToken: "token-1",
          avatar_url: "https://example.com/uploaded-avatar.jpg",
        },
      });
      expect(mockInvalidate).toHaveBeenCalled();
    });
  });

  it("discards a selected cover change", () => {
    mockUseLoaderData.mockReturnValue({
      profile: {
        id: "profile-1",
        handle: "matwana",
        full_name: "Matwana Crew",
        avatar_url: null,
        bio: null,
        role: "crew",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: null,
        cover_media_url: "https://example.com/cover.jpg",
        cover_media_type: "image",
        cover_poster_url: null,
        cover_position_x: 50,
        cover_position_y: 32,
        cover_scale: 1.08,
      },
    });

    render(<CrewProfileScreen />);

    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));

    const coverInput = screen.getByLabelText(/change cover/i);
    const coverFile = new File(["cover"], "cover.jpg", { type: "image/jpeg" });

    fireEvent.change(coverInput, { target: { files: [coverFile] } });
    expect(screen.getByAltText("Cover").getAttribute("src")).toBe(
      "blob:cover-preview",
    );

    fireEvent.click(screen.getByRole("button", { name: /discard cover change/i }));

    expect(screen.getByAltText("Cover").getAttribute("src")).toBe(
      "https://example.com/cover.jpg",
    );
  });

  it("uploads cover media independently after confirmation", async () => {
    mockUseLoaderData.mockReturnValue({
      profile: {
        id: "profile-1",
        handle: "matwana",
        full_name: "Matwana Crew",
        avatar_url: null,
        bio: null,
        role: "crew",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: null,
        cover_media_url: "https://example.com/cover.jpg",
        cover_media_type: "image",
        cover_poster_url: null,
        cover_position_x: 50,
        cover_position_y: 32,
        cover_scale: 1.08,
      },
    });

    const { retryWithBackoff } = await import("@/lib/utils/retry");
    const { compressImage } = await import("@/lib/utils/image-compress");
    const { replaceCoverMedia } = await import("@/lib/storage/profile-media");
    const { updateCrewProfileServerFn } = await import(
      "@/shared/server-fns/crew-profile"
    );

    vi.mocked(retryWithBackoff).mockImplementation(async (fn: any) => fn());
    vi.mocked(compressImage).mockResolvedValue(
      new File(["cover"], "cover.jpg", { type: "image/jpeg" }),
    );
    vi.mocked(replaceCoverMedia).mockResolvedValue({
      url: "https://example.com/uploaded-cover.jpg",
      path: "covers/user-1/cover.jpg",
      type: "image",
    });
    vi.mocked(updateCrewProfileServerFn).mockResolvedValue(undefined as never);

    render(<CrewProfileScreen />);

    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));

    const coverInput = screen.getByLabelText(/change cover/i);
    const coverFile = new File(["cover"], "cover.jpg", { type: "image/jpeg" });

    fireEvent.change(coverInput, { target: { files: [coverFile] } });
    fireEvent.click(screen.getByRole("button", { name: /save cover photo/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /save cover photo/i })).toBeNull();
      expect(screen.getByAltText("Cover").getAttribute("src")).toBe(
        "https://example.com/uploaded-cover.jpg",
      );
      expect(replaceCoverMedia).toHaveBeenCalled();
      expect(updateCrewProfileServerFn).toHaveBeenCalledWith({
        data: {
          accessToken: "token-1",
          cover_media_url: "https://example.com/uploaded-cover.jpg",
          cover_media_type: "image",
        },
      });
      expect(mockInvalidate).toHaveBeenCalled();
    });
  });
});
