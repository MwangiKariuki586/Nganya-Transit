import { describe, expect, it } from "vitest";
import {
  MATWANA_COLORWAYS,
  MATWANA_DEFAULT_COLORWAY,
  getMatwanaColorwayPreset,
  getMatwanaThemeCssVariables,
  normalizeMatwanaColorwayKey,
} from "@/shared/theme/matwana-colorways";

describe("matwana-colorways", () => {
  it("keeps the curated preset list exact", () => {
    expect(MATWANA_COLORWAYS.map((preset) => preset.name)).toEqual([
      "Mood",
      "Alcapone",
      "Harukaze",
      "Moxy",
      "Matrix",
      "Opposite",
      "Optimus Prime",
    ]);
  });

  it("maps moxy to the current default accent tokens", () => {
    const preset = getMatwanaColorwayPreset("moxy");
    const variables = getMatwanaThemeCssVariables("moxy");

    expect(preset.accent).toBe("#FF2D78");
    expect(variables["--theme-accent"]).toBe("#FF2D78");
    expect(variables["--theme-accent-rgb"]).toBe("255 45 120");
    expect(variables["--theme-accent-foreground"]).toBe("#FFFFFF");
  });

  it("returns exact curated accents for the other presets", () => {
    expect(getMatwanaColorwayPreset("mood").accent).toBe("#871599");
    expect(getMatwanaColorwayPreset("alcapone").accent).toBe("#F7F516");
    expect(getMatwanaColorwayPreset("harukaze").accent).toBe("#E7E9E1");
    expect(getMatwanaColorwayPreset("matrix").accent).toBe("#14B013");
    expect(getMatwanaColorwayPreset("opposite").accent).toBe("#FE0000");
    expect(getMatwanaColorwayPreset("optimus-prime").accent).toBe("#0C5B94");
  });

  it("falls back to moxy for invalid values", () => {
    expect(normalizeMatwanaColorwayKey("unknown")).toBe(
      MATWANA_DEFAULT_COLORWAY,
    );
    expect(getMatwanaColorwayPreset("unknown").key).toBe(
      MATWANA_DEFAULT_COLORWAY,
    );
    expect(getMatwanaThemeCssVariables("unknown")["--theme-accent"]).toBe(
      "#FF2D78",
    );
  });
});

