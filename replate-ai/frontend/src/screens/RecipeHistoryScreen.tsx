import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  Animated,
} from "react-native";

const CTA_COLOR = "#2D4A3E";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabScreenProps, useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { TabParamList } from "../navigation/AppNavigator";
import { getRecipeHistory, RecipeHistoryItem } from "../services/api";
import { useAppTheme } from "../theme/ThemeProvider";

const PLACEHOLDER_TOKEN = "placeholder-token";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Props = BottomTabScreenProps<TabParamList, "History">;

// ── Detail view ──────────────────────────────────────────────────────────────

function RecipeDetail({
  recipe,
  onBack,
  tabBarHeight,
}: {
  recipe: RecipeHistoryItem;
  onBack: () => void;
  tabBarHeight: number;
}) {
  const { theme } = useAppTheme();
  const [descExpanded, setDescExpanded] = useState(false);
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);
  const [directionsExpanded, setDirectionsExpanded] = useState(true);

  const ingredChevron = useRef(new Animated.Value(0)).current;
  const dirsChevron = useRef(new Animated.Value(1)).current;

  function toggleIngredients() {
    const next = !ingredientsExpanded;
    setIngredientsExpanded(next);
    Animated.timing(ingredChevron, { toValue: next ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }

  function toggleDirections() {
    const next = !directionsExpanded;
    setDirectionsExpanded(next);
    Animated.timing(dirsChevron, { toValue: next ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }

  const ingredRotate = ingredChevron.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const dirsRotate = dirsChevron.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  const cleanSummary = recipe.summary?.replace(/<[^>]*>/g, "").trim() ?? "";
  const hasIngredients = (recipe.ingredients?.length ?? 0) > 0;
  const hasInstructions = (recipe.instructions?.length ?? 0) > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.inputBg }]}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>History</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.detailScroll, { paddingBottom: tabBarHeight + 24 }]}
      >
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

        {/* Title */}
        <Text style={[styles.detailTitle, { color: theme.colors.text }]}>{recipe.title}</Text>

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
          {recipe.savedAt && (
            <>
              {(recipe.readyInMinutes != null || recipe.servings != null) && (
                <View style={[styles.metaDot, { backgroundColor: theme.colors.divider }]} />
              )}
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {formatDate(recipe.savedAt)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Description / Summary */}
        {cleanSummary.length > 0 && (
          <View style={[styles.section, { borderTopColor: theme.colors.divider }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Description</Text>
            <Text
              style={[styles.bodyText, { color: theme.colors.textSecondary }]}
              numberOfLines={descExpanded ? undefined : 3}
            >
              {cleanSummary}
            </Text>
            <TouchableOpacity onPress={() => setDescExpanded(!descExpanded)} activeOpacity={0.7}>
              <Text style={[styles.showMore, { color: theme.colors.text }]}>
                {descExpanded ? "Show less" : "Show more"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Ingredients Accordion */}
        {hasIngredients && (
          <View style={[styles.section, { borderTopColor: theme.colors.divider }]}>
            <TouchableOpacity style={styles.accordionRow} onPress={toggleIngredients} activeOpacity={0.7}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>Ingredients</Text>
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
                      {ing.amount ? ` — ${ing.amount}${ing.unit ? " " + ing.unit : ""}` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Directions Accordion */}
        {hasInstructions && (
          <View style={[styles.section, { borderTopColor: theme.colors.divider }]}>
            <TouchableOpacity style={styles.accordionRow} onPress={toggleDirections} activeOpacity={0.7}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>Directions</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

export default function RecipeHistoryScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const [recipes, setRecipes] = useState<RecipeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeHistoryItem | null>(null);

  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    try {
      setLoading(true);
      const response = await getRecipeHistory(PLACEHOLDER_TOKEN);
      if (response.success) setRecipes(response.recipes);
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  const renderRecipeCard = useCallback(function ({ item }: { item: RecipeHistoryItem }) {
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.card }]}
        onPress={() => setSelectedRecipe(item)}
        activeOpacity={0.85}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImagePlaceholder, { backgroundColor: theme.colors.border }]}>
            <Ionicons name="restaurant-outline" size={26} color={theme.colors.textMuted} />
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.cardMeta}>
            {item.readyInMinutes != null && (
              <View style={styles.cardMetaItem}>
                <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
                <Text style={[styles.cardMetaText, { color: theme.colors.textSecondary }]}>
                  {item.readyInMinutes} min
                </Text>
              </View>
            )}
            {item.readyInMinutes != null && item.servings != null && (
              <View style={[styles.cardMetaDot, { backgroundColor: theme.colors.divider }]} />
            )}
            {item.servings != null && (
              <View style={styles.cardMetaItem}>
                <Ionicons name="person-outline" size={12} color={theme.colors.textMuted} />
                <Text style={[styles.cardMetaText, { color: theme.colors.textSecondary }]}>
                  {item.servings}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardDate, { color: theme.colors.textMuted }]}>
            {formatDate(item.savedAt)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} style={styles.cardChevron} />
      </TouchableOpacity>
    );
  }, [theme]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]} edges={["top"]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading history...</Text>
      </SafeAreaView>
    );
  }

  if (selectedRecipe) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        onBack={() => setSelectedRecipe(null)}
        tabBarHeight={tabBarHeight}
      />
    );
  }

  if (recipes.length === 0) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]} edges={["top"]}>
        <Ionicons name="document-text-outline" size={52} color={theme.colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No saved recipes yet</Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          Recipes you view will appear here so you can easily find them again.
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate("Capture")}
        >
          <Text style={styles.emptyButtonText}>Generate Recipes</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      <FlatList
        data={recipes}
        keyExtractor={(item) => item.historyId || item.id.toString()}
        renderItem={renderRecipeCard}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 16 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={[styles.listCount, { color: theme.colors.textMuted }]}>
            {recipes.length} saved recipe{recipes.length !== 1 ? "s" : ""}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: { marginTop: 12, fontSize: 15 },

  // ── Header ─────────────────────────────────────────────────────────────────
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
  headerSpacer: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: "600" },

  // ── Detail scroll ──────────────────────────────────────────────────────────
  detailScroll: { paddingHorizontal: 20, paddingTop: 4 },

  // ── Image ─────────────────────────────────────────────────────────────────
  imageWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 18,
  },
  image: { width: "100%", height: 240 },
  imagePlaceholder: { justifyContent: "center", alignItems: "center" },
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
  badgeText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },

  // ── Detail title + meta ────────────────────────────────────────────────────
  detailTitle: {
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 14, fontWeight: "500" },
  metaDot: { width: 4, height: 4, borderRadius: 2, marginHorizontal: 2 },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: {
    paddingVertical: 18,
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  bodyText: { fontSize: 15, lineHeight: 23 },
  showMore: { fontSize: 14, fontWeight: "700", marginTop: 6 },

  // ── Accordion ─────────────────────────────────────────────────────────────
  accordionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accordionContent: { marginTop: 14 },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },

  // ── List ──────────────────────────────────────────────────────────────────
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  listCount: { fontSize: 13, marginBottom: 4, fontWeight: "500" },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImage: { width: 88, height: 88 },
  cardImagePlaceholder: {
    width: 88,
    height: 88,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 12 },
  cardTitle: { fontSize: 15, fontWeight: "600", marginBottom: 6, lineHeight: 20 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  cardMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMetaText: { fontSize: 12, fontWeight: "500" },
  cardMetaDot: { width: 3, height: 3, borderRadius: 1.5 },
  cardDate: { fontSize: 11 },
  cardChevron: { paddingRight: 14 },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 28,
  },
  emptyButton: {
    backgroundColor: CTA_COLOR,
    paddingVertical: 15,
    paddingHorizontal: 36,
    borderRadius: 999,
  },
  emptyButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
