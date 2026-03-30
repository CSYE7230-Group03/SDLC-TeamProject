export type ThemeMode = "light" | "dark" | "system";

// ─── Design Tokens ──────────────────────────────────────────────────────────
// Unified design system inspired by warm, clean recipe app aesthetic.
// Primary actions use black/dark; accent color is warm gold/amber.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  hero: { fontSize: 32, fontWeight: "800" as const, lineHeight: 38 },
  h1: { fontSize: 26, fontWeight: "700" as const, lineHeight: 32 },
  h2: { fontSize: 20, fontWeight: "700" as const, lineHeight: 26 },
  h3: { fontSize: 17, fontWeight: "600" as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: "600" as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  captionBold: { fontSize: 13, fontWeight: "600" as const, lineHeight: 18 },
  small: { fontSize: 11, fontWeight: "500" as const, lineHeight: 14 },
} as const;

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
} as const;

// ─── Theme Colors ───────────────────────────────────────────────────────────

export interface AppTheme {
  mode: Exclude<ThemeMode, "system">;
  colors: {
    background: string;
    card: string;
    border: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    primaryLight: string;
    accent: string;
    accentLight: string;
    danger: string;
    dangerLight: string;
    success: string;
    successLight: string;
    warning: string;
    warningLight: string;
    inputBg: string;
    buttonPrimary: string;
    buttonPrimaryText: string;
    buttonSecondary: string;
    buttonSecondaryText: string;
    buttonSecondaryBorder: string;
    overlay: string;
    divider: string;
  };
}

export const lightTheme: AppTheme = {
  mode: "light",
  colors: {
    background: "#FAFAF8",
    card: "#FFFFFF",
    border: "#F0EFED",
    text: "#1A1A1A",
    textSecondary: "#555555",
    textMuted: "#999999",
    primary: "#1A1A1A",
    primaryLight: "#333333",
    accent: "#D4A017",
    accentLight: "#FFF8E7",
    danger: "#D32F2F",
    dangerLight: "#FFEBEE",
    success: "#2E7D32",
    successLight: "#E8F5E9",
    warning: "#F57C00",
    warningLight: "#FFF3E0",
    inputBg: "#F5F5F3",
    buttonPrimary: "#1A1A1A",
    buttonPrimaryText: "#FFFFFF",
    buttonSecondary: "#FFFFFF",
    buttonSecondaryText: "#1A1A1A",
    buttonSecondaryBorder: "#E0E0DE",
    overlay: "rgba(0,0,0,0.5)",
    divider: "#EAEAE8",
  },
};

export const darkTheme: AppTheme = {
  mode: "dark",
  colors: {
    background: "#121212",
    card: "#1E1E1E",
    border: "#2C2C2C",
    text: "#F5F5F5",
    textSecondary: "#BBBBBB",
    textMuted: "#888888",
    primary: "#F5F5F5",
    primaryLight: "#DDDDDD",
    accent: "#E8B828",
    accentLight: "#2A2518",
    danger: "#FF6B6B",
    dangerLight: "#2A1515",
    success: "#66BB6A",
    successLight: "#1A2A1A",
    warning: "#FFB74D",
    warningLight: "#2A2015",
    inputBg: "#1A1A1A",
    buttonPrimary: "#F5F5F5",
    buttonPrimaryText: "#1A1A1A",
    buttonSecondary: "#1E1E1E",
    buttonSecondaryText: "#F5F5F5",
    buttonSecondaryBorder: "#3A3A3A",
    overlay: "rgba(0,0,0,0.7)",
    divider: "#2C2C2C",
  },
};

