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
import { ThemeMode } from "../theme/theme";
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
      Alert.alert("Error", "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!displayName.trim()) {
      Alert.alert("Invalid", "Display name is required");
      return;
    }

    const max = maxCookingTime.trim()
      ? Number(maxCookingTime.trim())
      : null;
    if (maxCookingTime.trim() && (!Number.isFinite(max) || (max as number) <= 0)) {
      Alert.alert("Invalid", "Max cooking time must be a positive number");
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

      Alert.alert("Saved", "Preferences updated successfully");
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Could not connect to the server");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Profile & Preferences</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
        Update your profile and dietary preferences. Recommendations will adapt automatically.
      </Text>

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

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>Restrictions (comma-separated)</Text>
        <TextInput
          value={restrictionsCsv}
          onChangeText={setRestrictionsCsv}
          placeholder="e.g. vegetarian, gluten free"
          placeholderTextColor={theme.mode === "dark" ? "#7f8a84" : "#999"}
          style={[styles.input, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border, color: theme.colors.text }]}
        />

        <Text style={[styles.label, { marginTop: 12, color: theme.colors.textMuted }]}>Allergies (comma-separated)</Text>
        <TextInput
          value={allergiesCsv}
          onChangeText={setAllergiesCsv}
          placeholder="e.g. peanuts, shellfish"
          placeholderTextColor={theme.mode === "dark" ? "#7f8a84" : "#999"}
          style={[styles.input, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border, color: theme.colors.text }]}
        />

        <Text style={[styles.label, { marginTop: 12, color: theme.colors.textMuted }]}>Skill level</Text>
        <TextInput
          value={skillLevel}
          onChangeText={setSkillLevel}
          placeholder="e.g. beginner"
          placeholderTextColor={theme.mode === "dark" ? "#7f8a84" : "#999"}
          style={[styles.input, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border, color: theme.colors.text }]}
        />

        <Text style={[styles.label, { marginTop: 12, color: theme.colors.textMuted }]}>Max cooking time (minutes)</Text>
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
                  color: themeMode === m ? "#fff" : theme.colors.text,
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
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={save}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const PRIMARY = "#1A1A1A";
const BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#1A1A1A";
const TEXT_MID = "#555555";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 28 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: BG },
  loadingText: { marginTop: 12, color: TEXT_MID },
  title: { fontSize: 22, fontWeight: "800", color: TEXT_DARK },
  subtitle: { marginTop: 6, fontSize: 13, color: TEXT_MID, lineHeight: 18 },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: TEXT_DARK, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: "600", color: TEXT_MID, marginBottom: 6 },
  input: {
    backgroundColor: "#f6f6f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    fontSize: 14,
    color: TEXT_DARK,
  },
  themeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    marginBottom: 6,
  },
  themeChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  saveButton: {
    marginTop: 18,
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});

