import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/AppNavigator";
import { markRecipeAsCooked } from "../services/api";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeDetail">;

const CTA_COLOR = "#2D4A3E";

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const { theme } = useAppTheme();
  const { recipe } = route.params;
  const insets = useSafeAreaInsets();

  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);
  const [directionsExpanded, setDirectionsExpanded] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);

  const ingredChevron = useRef(new Animated.Value(0)).current;
  const dirsChevron = useRef(new Animated.Value(1)).current;

  function toggleIngredients() {
    const next = !ingredientsExpanded;
    setIngredientsExpanded(next);
    Animated.timing(ingredChevron, {
      toValue: next ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }

  function toggleDirections() {
    const next = !directionsExpanded;
    setDirectionsExpanded(next);
    Animated.timing(dirsChevron, {
      toValue: next ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }

  async function handleStartCooking() {
    try {
      const result = await markRecipeAsCooked(recipe.ingredients || []);
      if (result.success) {
        navigation.navigate("CookingComplete", {
          recipe: {
            title: recipe.title,
            image: recipe.image,
            ingredients: recipe.ingredients,
          },
          deducted: result.deducted || [],
          skipped: result.skipped || [],
        });
      } else {
        Alert.alert("Error", result.error || "Failed to update inventory");
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  }

  const ingredRotate = ingredChevron.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const dirsRotate = dirsChevron.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const hasIngredients = (recipe.ingredients?.length ?? 0) > 0;
  const hasInstructions = (recipe.instructions?.length ?? 0) > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.inputBg }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Recipes</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title + Rating */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={3}>
            {recipe.title}
          </Text>
          <View style={styles.ratingBox}>
            <Ionicons name="star" size={18} color="#F5A623" />
            <Text style={[styles.ratingText, { color: theme.colors.text }]}>4.7</Text>
          </View>
          {/* rating field not in type yet — hardcoded 4.7 placeholder */}
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          {recipe.readyInMinutes != null && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {recipe.readyInMinutes} min
              </Text>
            </View>
          )}
          {recipe.readyInMinutes != null && recipe.servings != null && (
            <View style={[styles.metaDot, { backgroundColor: theme.colors.divider }]} />
          )}
          {recipe.servings != null && (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="chart-bar" size={16} color={theme.colors.textMuted} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                Medium
              </Text>
            </View>
          )}
        </View>

        {/* Image */}
        <View style={[styles.imageWrapper, { backgroundColor: theme.colors.border }]}>
          {recipe.image ? (
            <Image source={{ uri: recipe.image }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="restaurant" size={48} color={theme.colors.textMuted} />
            </View>
          )}
          {recipe.servings != null && (
            <View style={styles.badgeOverlay} pointerEvents="none">
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Serves {recipe.servings}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Description</Text>
          <Text
            style={[styles.bodyText, { color: theme.colors.textSecondary }]}
            numberOfLines={descExpanded ? undefined : 3}
          >
            {recipe.title} is a delightful dish that brings together fresh ingredients in a
            harmonious blend of flavors and textures. Whether served as a weeknight dinner or a
            weekend treat, this recipe is sure to impress everyone at the table.
          </Text>
          <TouchableOpacity onPress={() => setDescExpanded(!descExpanded)} activeOpacity={0.7}>
            <Text style={[styles.showMore, { color: theme.colors.text }]}>
              {descExpanded ? "Show less" : "Show more"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Ingredients Accordion */}
        {hasIngredients && (
          <View style={[styles.section, { borderTopWidth: 1, borderTopColor: theme.colors.divider }]}>
            <TouchableOpacity
              style={styles.accordionRow}
              onPress={toggleIngredients}
              activeOpacity={0.7}
            >
              <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>
                Ingredients
              </Text>
              <Animated.View style={{ transform: [{ rotate: ingredRotate }] }}>
                <Ionicons name="chevron-down" size={22} color={theme.colors.textMuted} />
              </Animated.View>
            </TouchableOpacity>
            {ingredientsExpanded && (
              <View style={styles.accordionContent}>
                {recipe.ingredients!.map((ing, idx) => (
                  <View key={idx} style={styles.ingredientRow}>
                    <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />
                    <Text style={[styles.bodyText, { color: theme.colors.textSecondary, flex: 1 }]}>
                      {ing.name}
                      {ing.amount
                        ? ` — ${ing.amount}${ing.unit ? " " + ing.unit : ""}`
                        : ""}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Directions Accordion */}
        {hasInstructions && (
          <View style={[styles.section, { borderTopWidth: 1, borderTopColor: theme.colors.divider }]}>
            <TouchableOpacity
              style={styles.accordionRow}
              onPress={toggleDirections}
              activeOpacity={0.7}
            >
              <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>
                Directions
              </Text>
              <Animated.View style={{ transform: [{ rotate: dirsRotate }] }}>
                <Ionicons name="chevron-down" size={22} color={theme.colors.textMuted} />
              </Animated.View>
            </TouchableOpacity>
            {directionsExpanded && (
              <View style={styles.accordionContent}>
                <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
                  {recipe.instructions!.join(" ")}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Floating CTA */}
      <View style={[styles.ctaWrapper, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleStartCooking}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Start Cooking</Text>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },

  // ── Scroll content ────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // ── Title + rating ────────────────────────────────────────────────────────
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 4,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // ── Meta row ─────────────────────────────────────────────────────────────
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 14,
    fontWeight: "500",
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 2,
  },

  // ── Image ─────────────────────────────────────────────────────────────────
  imageWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 22,
  },
  image: {
    width: "100%",
    height: 260,
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  badgeOverlay: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  badge: {
    backgroundColor: "rgba(28, 28, 28, 0.82)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: {
    paddingVertical: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 23,
  },
  showMore: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 6,
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
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // ── Floating CTA ──────────────────────────────────────────────────────────
  ctaWrapper: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
  },
  ctaButton: {
    backgroundColor: CTA_COLOR,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
