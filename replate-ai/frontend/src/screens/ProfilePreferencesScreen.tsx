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
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  getUserProfile,
  updateUserProfile,
  saveUserDisplayName,
  DietaryPreferences,
  getAppSettings,
  updateAppSettings,
  getUserInventory,
} from "../services/api";
import { useAppTheme } from "../theme/ThemeProvider";
import { ThemeMode, spacing, radii } from "../theme/theme";
import { cancelExpiryReminders, scheduleExpiryReminders } from "../services/expiryNotifications";

type Props = NativeStackScreenProps<RootStackParamList, "ProfilePreferences">;

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ProfilePreferencesScreen({ navigation }: Props) {
  const { themeMode, setThemeMode, theme } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Profile & Preferences</Text>

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
    </ScrollView>
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
});

