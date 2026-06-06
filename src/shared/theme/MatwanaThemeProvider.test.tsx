import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  MatwanaThemeProvider,
  useMatwanaTheme,
} from "@/shared/theme/MatwanaThemeProvider";
import { MATWANA_COLORWAY_STORAGE_KEY } from "@/shared/theme/matwana-colorways";

function ThemeProbe() {
  const { colorway, preset, setColorway } = useMatwanaTheme();

  return (
    <div>
      <div data-testid="theme-key">{colorway}</div>
      <div data-testid="theme-name">{preset.name}</div>
      <button type="button" onClick={() => setColorway("matrix")}>
        Switch
      </button>
    </div>
  );
}

describe("MatwanaThemeProvider", () => {
  it("reads the saved preference and applies CSS variables", async () => {
    window.localStorage.setItem(MATWANA_COLORWAY_STORAGE_KEY, "mood");

    render(
      <MatwanaThemeProvider>
        <ThemeProbe />
      </MatwanaThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-key").textContent).toBe("mood");
    });

    expect(screen.getByTestId("theme-name").textContent).toBe("Mood");
    expect(
      document.documentElement.style.getPropertyValue("--theme-accent"),
    ).toBe("#871599");
  });

  it("writes a new preference and updates the document immediately", async () => {
    render(
      <MatwanaThemeProvider>
        <ThemeProbe />
      </MatwanaThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Switch" }));

    await waitFor(() => {
      expect(screen.getByTestId("theme-key").textContent).toBe("matrix");
    });

    expect(
      window.localStorage.getItem(MATWANA_COLORWAY_STORAGE_KEY),
    ).toBe("matrix");
    expect(
      document.documentElement.style.getPropertyValue("--theme-accent"),
    ).toBe("#14B013");
  });
});

