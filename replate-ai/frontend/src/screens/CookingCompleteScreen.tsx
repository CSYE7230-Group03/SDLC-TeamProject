import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getUserInventory, InventoryItem } from "../services/api";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "CookingComplete">;

const CTA_COLOR = "#2D4A3E";

export default function CookingCompleteScreen({ route, navigation }: Props) {
  const { theme } = useAppTheme();
  const { recipe, deducted, skipped } = route.params;
  const insets = useSafeAreaInsets();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryExpanded, setInventoryExpanded] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const invChevron = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadInventory();
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  async function loadInventory() {
    try {
      const res = await getUserInventory();
      if (res.success) setInventory(res.items);
    } catch {
      // silent — inventory is non-critical here
    } finally {
      setLoading(false);
    }
  }

  function toggleInventory() {
    const next = !inventoryExpanded;
    setInventoryExpanded(next);
    Animated.timing(invChevron, {
      toValue: next ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }

  const invRotate = invChevron.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const remaining = inventory.filter((item) => item.quant > 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Cooking Complete</Text>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: theme.colors.inputBg }]}
          onPress={() => navigation.navigate("MainTabs")}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Recipe Image */}
        <View style={[styles.imageWrapper, { backgroundColor: theme.colors.border }]}>
          {recipe.image ? (
            <Image source={{ uri: recipe.image }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="restaurant" size={48} color={theme.colors.textMuted} />
            </View>
          )}
        </View>

        {/* Success Hero */}
        <Animated.View style={[styles.heroSection, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.checkCircle, { backgroundColor: theme.colors.successLight }]}>
            <Ionicons name="checkmark" size={32} color={theme.colors.success} />
          </View>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>Enjoy your meal!</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {recipe.title}
          </Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Ingredients Used */}
          {deducted.length > 0 && (
            <View style={[styles.section, { borderTopColor: theme.colors.divider }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Ingredients Used</Text>
              {deducted.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.row,
                    { borderBottomColor: theme.colors.divider },
                    idx === deducted.length - 1 && styles.rowLast,
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
                  <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{item.name}</Text>
                  <View style={styles.qtyChange}>
                    <Text style={[styles.qtyPrev, { color: theme.colors.textMuted }]}>
                      {item.previousQty}
                    </Text>
                    <Ionicons name="arrow-forward" size={13} color={theme.colors.textMuted} />
                    <Text style={[styles.qtyNew, { color: theme.colors.text }]}>{item.newQty}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Skipped */}
          {skipped.length > 0 && (
            <View style={[styles.section, { borderTopColor: theme.colors.divider }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
                Skipped ({skipped.length})
              </Text>
              <Text style={[styles.skippedText, { color: theme.colors.textMuted }]}>
                {skipped.map((s) => s.name).join(", ")}
              </Text>
            </View>
          )}

          {/* Remaining Inventory — collapsible */}
          <View style={[styles.section, { borderTopColor: theme.colors.divider }]}>
            <TouchableOpacity
              style={styles.accordionRow}
              onPress={toggleInventory}
              activeOpacity={0.7}
            >
              <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>
                Remaining Inventory
                {!loading && (
                  <Text style={[styles.sectionCount, { color: theme.colors.textMuted }]}>
                    {"  "}{remaining.length} items
                  </Text>
                )}
              </Text>
              <Animated.View style={{ transform: [{ rotate: invRotate }] }}>
                <Ionicons name="chevron-down" size={22} color={theme.colors.textMuted} />
              </Animated.View>
            </TouchableOpacity>

            {inventoryExpanded && (
              <View style={styles.accordionContent}>
                {loading ? (
                  <View style={styles.centeredPad}>
                    <ActivityIndicator color={theme.colors.primary} />
                  </View>
                ) : remaining.length === 0 ? (
                  <View style={styles.centeredPad}>
                    <Ionicons name="cube-outline" size={28} color={theme.colors.textMuted} />
                    <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                      No items remaining
                    </Text>
                  </View>
                ) : (
                  remaining.map((item) => (
                    <View
                      key={item.id}
                      style={[styles.row, { borderBottomColor: theme.colors.divider }]}
                    >
                      <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />
                      <Text style={[styles.rowLabel, { color: theme.colors.text, flex: 1 }]}>
                        {item.ingredientName}
                      </Text>
                      <Text style={[styles.qtyNew, { color: theme.colors.text }]}>
                        {item.quant}
                        <Text style={[styles.unit, { color: theme.colors.textMuted }]}>
                          {" "}{item.unit}
                        </Text>
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        </Animated.View>

        <View style={{ height: 150 }} />
      </ScrollView>

      {/* Floating CTAs */}
      <View style={[styles.ctaWrapper, { backgroundColor: theme.colors.background, paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => (navigation as any).navigate("MainTabs", { screen: "Capture" })}
          activeOpacity={0.85}
        >
          <Ionicons name="camera-outline" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Add More Ingredients</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: theme.colors.buttonSecondaryBorder }]}
          onPress={() => navigation.navigate("MainTabs")}
          activeOpacity={0.8}
        >
          <Ionicons name="home-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.secondaryBtnText, { color: theme.colors.textSecondary }]}>
            Back to Home
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // ── Image ─────────────────────────────────────────────────────────────────
  imageWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 22,
  },
  image: {
    width: "100%",
    height: 220,
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Success hero ──────────────────────────────────────────────────────────
  heroSection: {
    alignItems: "center",
    marginBottom: 8,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: {
    paddingVertical: 18,
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "500",
  },

  // ── Rows ──────────────────────────────────────────────────────────────────
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    textTransform: "capitalize",
  },
  qtyChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  qtyPrev: {
    fontSize: 14,
  },
  qtyNew: {
    fontSize: 15,
    fontWeight: "600",
  },
  unit: {
    fontSize: 13,
    fontWeight: "400",
  },
  skippedText: {
    fontSize: 15,
    lineHeight: 23,
  },

  // ── Accordion ─────────────────────────────────────────────────────────────
  accordionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accordionContent: {
    marginTop: 14,
  },
  centeredPad: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },

  // ── CTAs ──────────────────────────────────────────────────────────────────
  ctaWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: CTA_COLOR,
    paddingVertical: 17,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 17,
    borderRadius: 999,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
