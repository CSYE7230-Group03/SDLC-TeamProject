import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAppTheme } from "../theme/ThemeProvider";
import { spacing, radii } from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "ProfileDetail">;

export default function ProfileDetailScreen({ route, navigation }: Props) {
  const { theme } = useAppTheme();
  const { analysis } = route.params;
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  function ProgressBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
    const percentage = (value / max) * 100;
    return (
      <View style={[styles.progressBg, { backgroundColor: theme.colors.border }]}>
        <Animated.View style={[styles.progressFill, { width: `${percentage}%` as any, backgroundColor: color }]} />
      </View>
    );
  }

  // Hero card background: darker than background in both modes for visual pop
  const heroCardBg = theme.mode === "dark" ? "#0A0A0A" : "#1A1A1A";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.inputBg }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Fridge Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* Hero Card */}
        <Animated.View style={[
          styles.heroCard,
          { backgroundColor: heroCardBg },
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}>
          <View style={styles.personaIconWrap}>
            <MaterialCommunityIcons name="chef-hat" size={52} color="#ffffff" />
          </View>
          <Text style={styles.persona}>{analysis.persona}</Text>
          <Text style={styles.description}>{analysis.description}</Text>
        </Animated.View>

        {/* Stats Card */}
        <Animated.View style={[
          styles.card,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          { opacity: fadeAnim },
        ]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Your Stats</Text>

          {/* Health Score */}
          <View style={styles.statRow}>
            <View style={styles.statLabel}>
              <Ionicons name="heart" size={18} color={theme.colors.danger} />
              <Text style={[styles.statLabelText, { color: theme.colors.textSecondary }]}>Health Score</Text>
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{analysis.healthScore}/10</Text>
          </View>
          <ProgressBar value={analysis.healthScore} color={theme.colors.success} />

          {/* Diet Type */}
          <View style={[styles.statRow, { marginTop: spacing.xl }]}>
            <View style={styles.statLabel}>
              <MaterialCommunityIcons name="food-apple" size={18} color={theme.colors.warning} />
              <Text style={[styles.statLabelText, { color: theme.colors.textSecondary }]}>Diet Type</Text>
            </View>
          </View>
          <View style={styles.tagContainer}>
            <View style={[styles.tag, { backgroundColor: theme.colors.warningLight }]}>
              <Text style={[styles.tagText, { color: theme.colors.warning }]}>{analysis.dietType}</Text>
            </View>
          </View>

          {/* Cooking Style */}
          <View style={[styles.statRow, { marginTop: spacing.xl }]}>
            <View style={styles.statLabel}>
              <MaterialCommunityIcons name="chef-hat" size={18} color={theme.colors.accent} />
              <Text style={[styles.statLabelText, { color: theme.colors.textSecondary }]}>Cooking Style</Text>
            </View>
          </View>
          <View style={styles.tagContainer}>
            <View style={[styles.tag, { backgroundColor: theme.colors.accentLight }]}>
              <Text style={[styles.tagText, { color: theme.colors.accent }]}>{analysis.cookingStyle}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Fun Fact Card */}
        <Animated.View style={[
          styles.funFactCard,
          { backgroundColor: theme.colors.accentLight, borderColor: theme.colors.border },
          { opacity: fadeAnim },
        ]}>
          <View style={styles.funFactHeader}>
            <Ionicons name="bulb" size={20} color={theme.colors.warning} />
            <Text style={[styles.funFactTitle, { color: theme.colors.accent }]}>Fun Fact</Text>
          </View>
          <Text style={[styles.funFactText, { color: theme.colors.textSecondary }]}>{analysis.funFact}</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 40,
  },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },

  // ── Hero card ─────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: radii.xl,
    padding: spacing.xxl,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  personaIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  persona: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 20,
  },

  // ── Stats card ────────────────────────────────────────────────────────────
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: spacing.lg,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  statLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statLabelText: {
    fontSize: 15,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  tagText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Fun Fact card ─────────────────────────────────────────────────────────
  funFactCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
  },
  funFactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 10,
  },
  funFactTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  funFactText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
