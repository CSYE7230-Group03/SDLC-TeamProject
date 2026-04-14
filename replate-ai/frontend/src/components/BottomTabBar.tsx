import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";

// ─── Design tokens ────────────────────────────────────────────────────────────
const GREEN_DARK = "#2D5A27";
const CARD_WHITE = "#FFFFFF";
const TEXT_SECONDARY = "#666666";

const TABS = [
  { key: "home", label: "Home", icon: "home" as const, route: "Home" },
  { key: "inventory", label: "Inventory", icon: "layers" as const, route: "Inventory" },
  { key: "capture", label: "Capture", icon: "camera" as const, route: "Capture" },
  { key: "history", label: "History", icon: "time" as const, route: "History" },
  { key: "profile", label: "Profile", icon: "person" as const, route: "Profile" },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const activeRouteName = state.routes[state.index]?.name ?? "";

  function getActiveKey(): TabKey {
    switch (activeRouteName) {
      case "Home": return "home";
      case "Inventory": return "inventory";
      case "Capture": return "capture";
      case "History": return "history";
      case "Profile": return "profile";
      default: return "home";
    }
  }

  const activeTab = getActiveKey();

  function handleTabPress(key: TabKey) {
    switch (key) {
      case "home":
        navigation.navigate("Home");
        break;
      case "inventory":
        navigation.navigate("Inventory");
        break;
      case "capture":
        navigation.navigate("Capture");
        break;
      case "history":
        navigation.navigate("History");
        break;
      case "profile":
        navigation.navigate("Profile");
        break;
    }
  }

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8 }]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const isCapture = tab.key === "capture";

        if (isCapture) {
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.8}
            >
              <View style={styles.captureTabButton}>
                <Ionicons name="camera" size={24} color={CARD_WHITE} />
              </View>
              <Text style={styles.tabLabel}>{tab.label}</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab.key)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isActive ? tab.icon : (`${tab.icon}-outline` as any)}
              size={22}
              color={isActive ? GREEN_DARK : TEXT_SECONDARY}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.tabActiveDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: CARD_WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  captureTabButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: GREEN_DARK,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -24,
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: TEXT_SECONDARY,
  },
  tabLabelActive: {
    color: GREEN_DARK,
    fontWeight: "700",
  },
  tabActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GREEN_DARK,
    marginTop: 2,
  },
});
