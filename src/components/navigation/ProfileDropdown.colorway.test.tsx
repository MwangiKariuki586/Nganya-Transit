import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileDropdown } from "@/components/navigation/ProfileDropdown";
import { MatwanaThemeProvider } from "@/shared/theme/MatwanaThemeProvider";
import { MATWANA_COLORWAY_STORAGE_KEY } from "@/shared/theme/matwana-colorways";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    onClick,
    ...props
  }: ComponentProps<"a"> & { to?: string }) => (
    <a href="#" onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

describe("ProfileDropdown colorway picker", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the colorway menu and updates the local theme immediately", async () => {
    render(
      <MatwanaThemeProvider>
        <ProfileDropdown
          profile={{ full_name: "Logan", handle: "alcapone" }}
          profileTo="/profile"
          onSignOut={vi.fn()}
          onClose={vi.fn()}
        />
      </MatwanaThemeProvider>,
    );

    expect(screen.getByText("MATWANA Colorway")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "MATWANA Colorway: Moxy. Activate to change.",
      }),
    );

    fireEvent.click(
      screen.getByRole("option", { name: "Choose Optimus Prime colorway" }),
    );

    await waitFor(() => {
      expect(
        window.localStorage.getItem(MATWANA_COLORWAY_STORAGE_KEY),
      ).toBe("optimus-prime");
    });

    expect(
      document.documentElement.style.getPropertyValue("--theme-accent"),
    ).toBe("#0C5B94");
  });
});
