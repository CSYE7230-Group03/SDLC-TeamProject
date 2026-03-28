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

type Props = NativeStackScreenProps<RootStackParamList, "ProfileDetail">;

const PRIMARY = "#1A1A1A";
const BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#1A1A1A";
const TEXT_MID = "#555555";
const ACCENT = "#D4A017";
const BORDER = "#F0EFED";

export default function ProfileDetailScreen({ route }: Props) {
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
      <View style={styles.progressBg}>
        <Animated.View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <Animated.View style={[styles.headerCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.emoji}>{analysis.emoji}</Text>
        <Text style={styles.persona}>{analysis.persona}</Text>
        <Text style={styles.description}>{analysis.description}</Text>
      </Animated.View>

      {/* Stats Section */}
      <Animated.View style={[styles.statsCard, { opacity: fadeAnim }]}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        
        {/* Health Score */}
        <View style={styles.statRow}>
          <View style={styles.statLabel}>
            <Ionicons name="heart" size={18} color="#e53935" />
            <Text style={styles.statLabelText}>Health Score</Text>
          </View>
          <Text style={styles.statValue}>{analysis.healthScore}/10</Text>
        </View>
        <ProgressBar value={analysis.healthScore} color="#4caf50" />

        {/* Diet Type */}
        <View style={[styles.statRow, { marginTop: 20 }]}>
          <View style={styles.statLabel}>
            <MaterialCommunityIcons name="food-apple" size={18} color="#ff9800" />
            <Text style={styles.statLabelText}>Diet Type</Text>
          </View>
        </View>
        <View style={styles.tagContainer}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{analysis.dietType}</Text>
          </View>
        </View>

        {/* Cooking Style */}
        <View style={[styles.statRow, { marginTop: 20 }]}>
          <View style={styles.statLabel}>
            <MaterialCommunityIcons name="chef-hat" size={18} color="#9c27b0" />
            <Text style={styles.statLabelText}>Cooking Style</Text>
          </View>
        </View>
        <View style={styles.tagContainer}>
          <View style={[styles.tag, { backgroundColor: "#f3e5f5" }]}>
            <Text style={[styles.tagText, { color: "#9c27b0" }]}>{analysis.cookingStyle}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Fun Fact */}
      <Animated.View style={[styles.funFactCard, { opacity: fadeAnim }]}>
        <View style={styles.funFactHeader}>
          <Ionicons name="bulb" size={20} color="#f57c00" />
          <Text style={styles.funFactTitle}>Fun Fact</Text>
        </View>
        <Text style={styles.funFactText}>{analysis.funFact}</Text>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  headerCard: {
    backgroundColor: PRIMARY,
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  emoji: { fontSize: 64, marginBottom: 12 },
  persona: { fontSize: 24, fontWeight: "700", color: "#fff", textAlign: "center" },
  description: { fontSize: 14, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 12, lineHeight: 20 },
  statsCard: { backgroundColor: CARD_BG, marginHorizontal: 16, borderRadius: 16, padding: 20 },
  sectionTitle: { fontSize: 17, fontWeight: "600", color: "#1A1A1A", marginBottom: 16 },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  statLabelText: { fontSize: 15, color: TEXT_MID },
  statValue: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
  progressBg: { height: 8, backgroundColor: "#F0EFED", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  tagContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  tag: { backgroundColor: "#fff3e0", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tagText: { fontSize: 14, fontWeight: "600", color: "#f57c00" },
  funFactCard: { backgroundColor: "#FFF8E7", marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 20 },
  funFactHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  funFactTitle: { fontSize: 16, fontWeight: "600", color: "#D4A017" },
  funFactText: { fontSize: 14, color: TEXT_MID, lineHeight: 22 },
});
