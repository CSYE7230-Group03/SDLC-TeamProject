import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { ThemeProvider, useAppTheme } from "./src/theme/ThemeProvider";

function ThemedNavigation() {
  const { theme } = useAppTheme();

  const navTheme = theme.mode === "dark" ? DarkTheme : DefaultTheme;
  return (
    <>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      <NavigationContainer
        theme={{
          ...navTheme,
          colors: {
            ...navTheme.colors,
            background: theme.colors.background,
            card: theme.colors.card,
            text: theme.colors.text,
            border: theme.colors.border,
            primary: theme.colors.primary,
          },
        }}
      >
        <AppNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedNavigation />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
