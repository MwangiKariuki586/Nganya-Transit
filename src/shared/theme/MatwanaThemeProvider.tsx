import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  MATWANA_COLORWAY_STORAGE_KEY,
  MATWANA_DEFAULT_COLORWAY,
  getMatwanaColorwayPreset,
  getMatwanaThemeCssVariables,
  normalizeMatwanaColorwayKey,
  type MatwanaColorwayKey,
  type MatwanaColorwayPreset,
} from "@/shared/theme/matwana-colorways";

interface MatwanaThemeContextValue {
  colorway: MatwanaColorwayKey;
  preset: MatwanaColorwayPreset;
  setColorway: (next: MatwanaColorwayKey) => void;
}

const MatwanaThemeContext = createContext<MatwanaThemeContextValue | undefined>(
  undefined,
);

function readStoredColorway() {
  if (typeof window === "undefined") return MATWANA_DEFAULT_COLORWAY;
  return normalizeMatwanaColorwayKey(
    window.localStorage.getItem(MATWANA_COLORWAY_STORAGE_KEY),
  );
}

export function applyMatwanaColorwayTheme(
  target: HTMLElement,
  colorway: string | null | undefined,
) {
  const variables = getMatwanaThemeCssVariables(colorway);

  Object.entries(variables).forEach(([name, value]) => {
    target.style.setProperty(name, value);
  });
}

export function MatwanaThemeProvider({ children }: { children: ReactNode }) {
  const [colorway, setColorwayState] =
    useState<MatwanaColorwayKey>(MATWANA_DEFAULT_COLORWAY);

  useEffect(() => {
    const next = readStoredColorway();
    setColorwayState(next);
    applyMatwanaColorwayTheme(document.documentElement, next);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== MATWANA_COLORWAY_STORAGE_KEY) return;
      const updated = normalizeMatwanaColorwayKey(event.newValue);
      setColorwayState(updated);
      applyMatwanaColorwayTheme(document.documentElement, updated);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    applyMatwanaColorwayTheme(document.documentElement, colorway);
  }, [colorway]);

  const setColorway = (next: MatwanaColorwayKey) => {
    const normalized = normalizeMatwanaColorwayKey(next);
    setColorwayState(normalized);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(MATWANA_COLORWAY_STORAGE_KEY, normalized);
    }
  };

  const value = useMemo<MatwanaThemeContextValue>(
    () => ({
      colorway,
      preset: getMatwanaColorwayPreset(colorway),
      setColorway,
    }),
    [colorway],
  );

  return (
    <MatwanaThemeContext.Provider value={value}>
      {children}
    </MatwanaThemeContext.Provider>
  );
}

export function useMatwanaTheme() {
  const context = useContext(MatwanaThemeContext);

  if (!context) {
    throw new Error("useMatwanaTheme must be used within MatwanaThemeProvider");
  }

  return context;
}

