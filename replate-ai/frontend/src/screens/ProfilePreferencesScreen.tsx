import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { BottomTabScreenProps, useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import { TabParamList, RootStackParamList } from "../navigation/AppNavigator";
import {
  getUserProfile,
  updateUserProfile,
  saveUserDisplayName,
  DietaryPreferences,
  getAppSettings,
  updateAppSettings,
  getUserInventory,
  clearSession,
  getProfileAnalysis,
} from "../services/api";
import { useAppTheme } from "../theme/ThemeProvider";
import { ThemeMode, spacing, radii } from "../theme/theme";
import { cancelExpiryReminders, scheduleExpiryReminders } from "../services/expiryNotifications";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

type Props = BottomTabScreenProps<TabParamList, "Profile">;
type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ProfilePreferencesScreen({ navigation }: Props) {
  const { themeMode, setThemeMode, theme } = useAppTheme();
  const rootNavigation = useNavigation<RootNavProp>();
  const tabBarHeight = useBottomTabBarHeight();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [restrictionsCsv, setRestrictionsCsv] = useState("");
  const [allergiesCsv, setAllergiesCsv] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [maxCookingTime, setMaxCookingTime] = useState<string>("");

  const [expiryRemindersEnabled, setExpiryRemindersEnabled] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const [profileRes, settingsRes] = await Promise.all([getUserProfile(), getAppSettings()]);

      if (!profileRes.success) {
        Alert.alert("Error", profileRes.error || "Failed to load profile");
        return;
      }

      setDisplayName(profileRes.profile?.displayName || "");
      const prefs: DietaryPreferences | undefined = profileRes.dietaryPreferences;
      setRestrictionsCsv((prefs?.restrictions || []).join(", "));
      setAllergiesCsv((prefs?.allergies || []).join(", "));
      setSkillLevel(prefs?.skillLevel || "");
      setMaxCookingTime(prefs?.maxCookingTime ? String(prefs.maxCookingTime) : "");

      if (settingsRes.success && settingsRes.appSettings) {
        setExpiryRemindersEnabled(!!settingsRes.appSettings.notifications?.expiryRemindersEnabled);
      }
    } catch {
      Alert.alert("Connection error", "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await clearSession();
            navigation.getParent()?.reset({ index: 0, routes: [{ name: "Login" }] });
          },
        },
      ]
    );
  }

  async function viewFoodProfile() {
    setLoadingProfile(true);
    try {
      const res = await getProfileAnalysis();
      if (res.success && res.analysis) {
        rootNavigation.navigate("ProfileDetail", { analysis: res.analysis });
      } else {
        Alert.alert("Not enough data", "Add ingredients to your inventory first to generate a food profile.");
      }
    } catch {
      Alert.alert("Error", "Couldn't load your food profile. Check your connection and try again.");
    } finally {
      setLoadingProfile(false);
    }
  }

  async function save() {
    if (!displayName.trim()) {
      Alert.alert("Name required", "Please enter your display name.");
      return;
    }

    const max = maxCookingTime.trim()
      ? Number(maxCookingTime.trim())
      : null;
    if (maxCookingTime.trim() && (!Number.isFinite(max) || (max as number) <= 0)) {
      Alert.alert("Invalid time", "Cook time must be a positive number.");
      return;
    }

    setSaving(true);
    try {
      const [profileRes, settingsRes] = await Promise.all([
        updateUserProfile({
        displayName: displayName.trim(),
        dietaryPreferences: {
          restrictions: parseCsv(restrictionsCsv),
          allergies: parseCsv(allergiesCsv),
          skillLevel: skillLevel.trim(),
          maxCookingTime: max,
        },
        }),
        updateAppSettings({
          themeMode,
          notifications: {
            expiryRemindersEnabled,
            reminderLeadDays: 2,
            reminderTime: "09:00",
          },
        }),
      ]);

      if (!profileRes.success) {
        Alert.alert("Error", profileRes.error || "Failed to save profile");
        return;
      }
      if (!settingsRes.success) {
        Alert.alert("Error", settingsRes.error || "Failed to save app settings");
        return;
      }

      await saveUserDisplayName(displayName.trim());

      // Apply notification scheduling
      try {
        if (expiryRemindersEnabled) {
          const inv = await getUserInventory();
          if (inv.success) {
            await scheduleExpiryReminders({
              items: inv.items,
              leadDays: 2,
              reminderTime: "09:00",
            });
          }
        } else {
          await cancelExpiryReminders();
        }
      } catch {
        // Don't block saving on notification scheduling
      }

      Alert.alert("All saved!", "Your preferences are up to date.");
      navigation.goBack();
    } catch {
      Alert.alert("Connection error", "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.text} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top"]}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Profile & Preferences</Text>

      <TouchableOpacity
        style={[styles.foodProfileCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
        onPress={viewFoodProfile}
        activeOpacity={0.85}
        disabled={loadingProfile}
      >
        <View style={styles.foodProfileCardContent}>
          <View style={[styles.foodProfileIcon, { backgroundColor: theme.colors.accentLight }]}>
            <Ionicons name="analytics-outline" size={22} color={theme.colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.foodProfileTitle, { color: theme.colors.text }]}>My Food Profile</Text>
            <Text style={[styles.foodProfileSubtitle, { color: theme.colors.textMuted }]}>See your cooking persona & health insights</Text>
          </View>
          {loadingProfile
            ? <ActivityIndicator size="small" color={theme.colors.textMuted} />
            : <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          }
        </View>
      </TouchableOpacity>

      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Display name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="e.g. Fenil"
          placeholderTextColor={theme.mode === "dark" ? "#7f8a84" : "#999"}
          style={[styles.input, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border, color: theme.colors.text }]}
        />
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Dietary preferences</Text>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Dietary restrictions</Text>
        <TextInput
          value={restrictionsCsv}
          onChangeText={setRestrictionsCsv}
          placeholder="e.g. vegetarian, gluten free"
          placeholderTextColor={theme.mode === "dark" ? "#7f8a84" : "#999"}
          style={[styles.input, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border, color: theme.colors.text }]}
        />

        <Text style={[styles.label, { marginTop: 12, color: theme.colors.textMuted }]}>Food allergies</Text>
        <TextInput
          value={allergiesCsv}
          onChangeText={setAllergiesCsv}
          placeholder="e.g. peanuts, shellfish"
          placeholderTextColor={theme.mode === "dark" ? "#7f8a84" : "#999"}
          style={[styles.input, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border, color: theme.colors.text }]}
        />

        <Text style={[styles.label, { marginTop: 12, color: theme.colors.textMuted }]}>Cooking skill level</Text>
        <TextInput
          value={skillLevel}
          onChangeText={setSkillLevel}
          placeholder="e.g. beginner"
          placeholderTextColor={theme.mode === "dark" ? "#7f8a84" : "#999"}
          style={[styles.input, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border, color: theme.colors.text }]}
        />

        <Text style={[styles.label, { marginTop: 12, color: theme.colors.textMuted }]}>Max cook time (minutes)</Text>
        <TextInput
          value={maxCookingTime}
          onChangeText={setMaxCookingTime}
          placeholder="e.g. 30"
          keyboardType="numeric"
          placeholderTextColor={theme.mode === "dark" ? "#7f8a84" : "#999"}
          style={[styles.input, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border, color: theme.colors.text }]}
        />
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>App settings</Text>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Theme</Text>
        <View style={styles.themeRow}>
          {(["light", "dark", "system"] as ThemeMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.themeChip,
                {
                  backgroundColor: themeMode === m ? theme.colors.primary : theme.colors.inputBg,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setThemeMode(m)}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  color: themeMode === m ? theme.colors.buttonPrimaryText : theme.colors.text,
                  fontWeight: "700",
                  fontSize: 12,
                  textTransform: "capitalize",
                }}
              >
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.text }}>
              Expiry reminders
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: theme.colors.textMuted, lineHeight: 16 }}>
              Get a reminder when ingredients are close to expiring.
            </Text>
          </View>
          <Switch
            value={expiryRemindersEnabled}
            onValueChange={setExpiryRemindersEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={expiryRemindersEnabled ? theme.colors.buttonPrimaryText : theme.colors.textMuted}
            ios_backgroundColor={theme.colors.inputBg}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: theme.colors.buttonPrimary }, saving && styles.saveButtonDisabled]}
        onPress={save}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color={theme.colors.buttonPrimaryText} />
        ) : (
          <Text style={[styles.saveButtonText, { color: theme.colors.buttonPrimaryText }]}>Save Preferences</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.logoutButton, { borderColor: theme.colors.danger }]}
        onPress={handleLogout}
        activeOpacity={0.85}
      >
        <Text style={[styles.logoutButtonText, { color: theme.colors.danger }]}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl + spacing.xs },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: spacing.md },
  title: { fontSize: 22, fontWeight: "800", marginBottom: spacing.xs },
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.md + 2,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: spacing.sm + 2 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  input: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    fontSize: 14,
  },
  themeRow: {
    flexDirection: "row",
    gap: spacing.sm + 2,
    marginTop: 6,
    marginBottom: 6,
  },
  themeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  saveButton: {
    marginTop: 18,
    borderRadius: radii.lg,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { fontWeight: "800", fontSize: 15 },
  foodProfileCard: {
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.md + 2,
    borderWidth: 1,
  },
  foodProfileCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  foodProfileIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    justifyContent: "center",
    alignItems: "center",
  },
  foodProfileTitle: { fontSize: 14, fontWeight: "700" },
  foodProfileSubtitle: { fontSize: 12, marginTop: 2 },
  logoutButton: {
    marginTop: 12,
    marginBottom: spacing.xl,
    borderRadius: radii.lg,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  logoutButtonText: { fontWeight: "700", fontSize: 15 },
});

