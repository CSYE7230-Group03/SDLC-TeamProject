import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "ProfileDetail">;

export default function ProfileDetailScreen({ route }: Props) {
  const { theme } = useAppTheme();
  const { analysis } = route.params;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // Progress bar component
  function ProgressBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
    const percentage = (value / max) * 100;
    return (
      <View style={[styles.progressBg, { backgroundColor: theme.colors.border }]}>
        <Animated.View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Header Card — intentionally dark in both modes */}
      <Animated.View style={[
        styles.headerCard,
        { backgroundColor: theme.mode === "dark" ? "#242424" : "#1A1A1A" },
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}>
        <Text style={styles.emoji}>{analysis.emoji}</Text>
        <Text style={styles.persona}>{analysis.persona}</Text>
        <Text style={styles.description}>{analysis.description}</Text>
      </Animated.View>

      {/* Stats Section */}
      <Animated.View style={[styles.statsCard, { backgroundColor: theme.colors.card }, { opacity: fadeAnim }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Your Stats</Text>

        {/* Health Score */}
        <View style={styles.statRow}>
          <View style={styles.statLabel}>
            <Ionicons name="heart" size={18} color="#e53935" />
            <Text style={[styles.statLabelText, { color: theme.colors.textSecondary }]}>Health Score</Text>
          </View>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{analysis.healthScore}/10</Text>
        </View>
        <ProgressBar value={analysis.healthScore} color="#4caf50" />

        {/* Diet Type */}
        <View style={[styles.statRow, { marginTop: 20 }]}>
          <View style={styles.statLabel}>
            <MaterialCommunityIcons name="food-apple" size={18} color="#ff9800" />
            <Text style={[styles.statLabelText, { color: theme.colors.textSecondary }]}>Diet Type</Text>
          </View>
        </View>
        <View style={styles.tagContainer}>
          <View style={[styles.tag, { backgroundColor: theme.colors.warningLight }]}>
            <Text style={[styles.tagText, { color: theme.colors.warning }]}>{analysis.dietType}</Text>
          </View>
        </View>

        {/* Cooking Style */}
        <View style={[styles.statRow, { marginTop: 20 }]}>
          <View style={styles.statLabel}>
            <MaterialCommunityIcons name="chef-hat" size={18} color="#9c27b0" />
            <Text style={[styles.statLabelText, { color: theme.colors.textSecondary }]}>Cooking Style</Text>
          </View>
        </View>
        <View style={styles.tagContainer}>
          <View style={[styles.tag, { backgroundColor: theme.mode === "dark" ? theme.colors.inputBg : "#f3e5f5" }]}>
            <Text style={[styles.tagText, { color: "#9c27b0" }]}>{analysis.cookingStyle}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Fun Fact */}
      <Animated.View style={[styles.funFactCard, { backgroundColor: theme.colors.accentLight }, { opacity: fadeAnim }]}>
        <View style={styles.funFactHeader}>
          <Ionicons name="bulb" size={20} color="#f57c00" />
          <Text style={[styles.funFactTitle, { color: theme.colors.accent }]}>Fun Fact</Text>
        </View>
        <Text style={[styles.funFactText, { color: theme.colors.textSecondary }]}>{analysis.funFact}</Text>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  emoji: { fontSize: 64, marginBottom: 12 },
  persona: { fontSize: 24, fontWeight: "700", color: "#fff", textAlign: "center" },
  description: { fontSize: 14, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 12, lineHeight: 20 },
  statsCard: { marginHorizontal: 16, borderRadius: 16, padding: 20 },
  sectionTitle: { fontSize: 17, fontWeight: "600", marginBottom: 16 },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  statLabelText: { fontSize: 15 },
  statValue: { fontSize: 18, fontWeight: "700" },
  progressBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  tagContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tagText: { fontSize: 14, fontWeight: "600" },
  funFactCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 20 },
  funFactHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  funFactTitle: { fontSize: 16, fontWeight: "600" },
  funFactText: { fontSize: 14, lineHeight: 22 },
});
