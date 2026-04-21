import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrewProfileScreen } from "@/modules/crew/screens/CrewProfileScreen";

const mockNavigate = vi.fn();
const mockUseLoaderData = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
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
    });
    mockNavigate.mockReset();
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
    expect(screen.getByText(/you have unsaved changes/i)).toBeTruthy();
  });

  it("lets the user drag the cover image to reposition it", () => {
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

    const coverImage = screen.getByAltText("Cover");
    Object.defineProperty(coverImage, "naturalWidth", {
      configurable: true,
      value: 1600,
    });
    Object.defineProperty(coverImage, "naturalHeight", {
      configurable: true,
      value: 1200,
    });

    fireEvent.load(coverImage);

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 400,
      height: 200,
      top: 0,
      left: 0,
      right: 400,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(coverImage, { clientX: 100, clientY: 60 });
    fireEvent.pointerMove(window, { clientX: 108, clientY: 80 });
    fireEvent.pointerUp(window, { clientX: 108, clientY: 80 });

    expect((coverImage as HTMLImageElement).style.objectPosition).toBe(
      "25% 15.870967741935484%",
    );
  });

  it("shows a zoom control in edit mode", () => {
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

    const slider = screen.getByLabelText(/cover zoom/i);
    expect((slider as HTMLInputElement).value).toBe("1.08");

    fireEvent.change(slider, { target: { value: "1.18" } });

    expect((slider as HTMLInputElement).value).toBe("1.18");
    expect(screen.getByText("118%")).toBeTruthy();
  });

  it("resets cover framing and supports nudge controls", () => {
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

    const coverImage = screen.getByAltText("Cover") as HTMLImageElement;
    const slider = screen.getByLabelText(/zoom/i);

    fireEvent.click(screen.getByRole("button", { name: /nudge cover right/i }));
    fireEvent.click(screen.getByRole("button", { name: /nudge cover down/i }));
    fireEvent.change(slider, { target: { value: "1.2" } });

    expect(coverImage.style.objectPosition).toBe("52% 34%");
    expect(screen.getByText("120%")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /reset framing/i }));

    expect(coverImage.style.objectPosition).toBe("50% 32%");
    expect((slider as HTMLInputElement).value).toBe("1.08");
    expect(screen.getByText("108%")).toBeTruthy();
  });

  it("supports keyboard nudging only while the cover editor is active", () => {
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

    const coverImage = screen.getByAltText("Cover") as HTMLImageElement;
    fireEvent.keyDown(coverImage, { key: "ArrowRight" });
    expect(coverImage.style.objectPosition).toBe("50% 32%");

    fireEvent.click(screen.getByRole("button", { name: /edit profile/i }));

    coverImage.focus();
    fireEvent.keyDown(coverImage, { key: "ArrowRight" });
    fireEvent.keyDown(coverImage, { key: "ArrowDown", shiftKey: true });

    expect(coverImage.style.objectPosition).toBe("52% 38%");
  });

  it("cleans up dragging after pointer cancellation", () => {
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

    const coverImage = screen.getByAltText("Cover");
    Object.defineProperty(coverImage, "naturalWidth", {
      configurable: true,
      value: 1600,
    });
    Object.defineProperty(coverImage, "naturalHeight", {
      configurable: true,
      value: 1200,
    });

    fireEvent.load(coverImage);

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 400,
      height: 200,
      top: 0,
      left: 0,
      right: 400,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(coverImage, {
      clientX: 100,
      clientY: 60,
      pointerId: 1,
    });
    fireEvent.pointerCancel(coverImage, { pointerId: 1 });
    fireEvent.pointerMove(window, {
      clientX: 140,
      clientY: 100,
      pointerId: 1,
    });

    expect((coverImage as HTMLImageElement).style.objectPosition).toBe(
      "50% 32%",
    );
  });
});
