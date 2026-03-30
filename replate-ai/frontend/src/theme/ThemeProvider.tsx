import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { storageLoad, storageSave } from "../utils/appStorage";
import { darkTheme, lightTheme, ThemeMode, AppTheme } from "./theme";

const STORAGE_THEME_MODE_KEY = "replate_theme_mode";

type ThemeContextValue = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  theme: AppTheme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // "light" | "dark" | null
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await storageLoad(STORAGE_THEME_MODE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
          setThemeModeState(stored);
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const resolvedMode: "light" | "dark" =
    themeMode === "system" ? (systemScheme === "dark" ? "dark" : "light") : themeMode;

  const theme = useMemo(() => (resolvedMode === "dark" ? darkTheme : lightTheme), [resolvedMode]);

  function setThemeMode(mode: ThemeMode) {
    setThemeModeState(mode);
    storageSave(STORAGE_THEME_MODE_KEY, mode).catch(() => {});
  }

  const value = useMemo(
    () => ({ themeMode, setThemeMode, theme }),
    [themeMode, theme]
  );

  // Prevent flashing incorrect theme on first paint
  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within ThemeProvider");
  return ctx;
}

