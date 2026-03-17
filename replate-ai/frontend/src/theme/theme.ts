export type ThemeMode = "light" | "dark" | "system";

export interface AppTheme {
  mode: Exclude<ThemeMode, "system">;
  colors: {
    background: string;
    card: string;
    border: string;
    text: string;
    textMuted: string;
    primary: string;
    primaryLight: string;
    danger: string;
    success: string;
    inputBg: string;
  };
}

export const lightTheme: AppTheme = {
  mode: "light",
  colors: {
    background: "#f8faf9",
    card: "#ffffff",
    border: "#eeeeee",
    text: "#1a1a1a",
    textMuted: "#666666",
    primary: "#2d6a4f",
    primaryLight: "#40916c",
    danger: "#D32F2F",
    success: "#4CAF50",
    inputBg: "#f6f6f6",
  },
};

export const darkTheme: AppTheme = {
  mode: "dark",
  colors: {
    background: "#0f1412",
    card: "#151b18",
    border: "#24302a",
    text: "#f4f6f5",
    textMuted: "#b7c0bb",
    primary: "#57cc99",
    primaryLight: "#80ed99",
    danger: "#ff6b6b",
    success: "#57cc99",
    inputBg: "#101614",
  },
};

