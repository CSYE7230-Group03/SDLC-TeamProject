import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getRecipeHistory, RecipeHistoryItem } from "../services/api";
import { useAppTheme } from "../theme/ThemeProvider";

// PLACEHOLDER: Replace with `await getAuth().currentUser?.getIdToken()` from "firebase/auth"
// once auth (#33) is merged.
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

type Props = NativeStackScreenProps<RootStackParamList, "RecipeHistory">;

export default function RecipeHistoryScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const [recipes, setRecipes] = useState<RecipeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeHistoryItem | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      setLoading(true);
      const response = await getRecipeHistory(PLACEHOLDER_TOKEN);
      if (response.success) {
        setRecipes(response.recipes);
      }
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  function renderRecipeCard({ item }: { item: RecipeHistoryItem }) {
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
            <Text style={styles.cardImagePlaceholderText}>🍽️</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
          <View style={styles.cardBadges}>
            {item.readyInMinutes && (
              <View style={[styles.badge, { backgroundColor: theme.colors.inputBg }]}>
                <Text style={[styles.badgeText, { color: theme.colors.text }]}>⏱ {item.readyInMinutes} min</Text>
              </View>
            )}
            {item.servings && (
              <View style={[styles.badge, { backgroundColor: theme.colors.inputBg }]}>
                <Text style={[styles.badgeText, { color: theme.colors.text }]}>👤 {item.servings}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardDate, { color: theme.colors.textMuted }]}>{formatDate(item.savedAt)}</Text>
        </View>
        <Text style={[styles.cardChevron, { color: theme.colors.textMuted }]}>›</Text>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading history...</Text>
      </View>
    );
  }

  if (selectedRecipe) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backRow} onPress={() => setSelectedRecipe(null)}>
            <Text style={[styles.backArrow, { color: theme.colors.text }]}>‹</Text>
            <Text style={[styles.backText, { color: theme.colors.text }]}>Back</Text>
          </TouchableOpacity>

          {selectedRecipe.image ? (
            <Image
              source={{ uri: selectedRecipe.image }}
              style={[styles.detailImage, { backgroundColor: theme.colors.border }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.detailImagePlaceholder, { backgroundColor: theme.colors.border }]}>
              <Text style={styles.detailImagePlaceholderText}>🍽️</Text>
            </View>
          )}

          <View style={[styles.detailContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.detailTitle, { color: theme.colors.text }]}>{selectedRecipe.title}</Text>

            <View style={[styles.detailMetaRow, { borderBottomColor: theme.colors.border }]}>
              {selectedRecipe.readyInMinutes && (
                <View style={[styles.detailMetaChip, { backgroundColor: theme.colors.inputBg }]}>
                  <Text style={styles.detailMetaIcon}>⏱</Text>
                  <View>
                    <Text style={[styles.detailMetaValue, { color: theme.colors.text }]}>{selectedRecipe.readyInMinutes} min</Text>
                    <Text style={[styles.detailMetaSubLabel, { color: theme.colors.textSecondary }]}>Cook Time</Text>
                  </View>
                </View>
              )}
              {selectedRecipe.servings && (
                <View style={[styles.detailMetaChip, { backgroundColor: theme.colors.inputBg }]}>
                  <Text style={styles.detailMetaIcon}>👤</Text>
                  <View>
                    <Text style={[styles.detailMetaValue, { color: theme.colors.text }]}>{selectedRecipe.servings} servings</Text>
                    <Text style={[styles.detailMetaSubLabel, { color: theme.colors.textSecondary }]}>Servings</Text>
                  </View>
                </View>
              )}
            </View>

            {selectedRecipe.summary && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About</Text>
                <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
                  {selectedRecipe.summary.replace(/<[^>]*>/g, "")}
                </Text>
              </View>
            )}

            {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Ingredients</Text>
                {selectedRecipe.ingredients.map((ing, idx) => (
                  <View key={idx} style={styles.ingredientRow}>
                    <View style={[styles.ingredientDot, { backgroundColor: theme.colors.accent }]} />
                    <Text style={[styles.ingredientText, { color: theme.colors.textSecondary }]}>
                      {ing.name}
                      {ing.amount ? ` — ${ing.amount}${ing.unit ? " " + ing.unit : ""}` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Instructions</Text>
                {selectedRecipe.instructions.map((step, idx) => (
                  <View key={idx} style={styles.stepRow}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.colors.buttonPrimary }]}>
                      <Text style={styles.stepNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.colors.textSecondary }]}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (recipes.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No saved recipes yet</Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          Recipes you view will appear here so you can easily find them again.
        </Text>
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: theme.colors.buttonPrimary }]}
          onPress={() => navigation.navigate("Capture")}
        >
          <Text style={styles.emptyButtonText}>Generate Recipes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={recipes}
        keyExtractor={(item) => item.historyId || item.id.toString()}
        renderItem={renderRecipeCard}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={[styles.listCount, { color: theme.colors.textMuted }]}>
            {recipes.length} saved recipe{recipes.length !== 1 ? "s" : ""}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },

  // List
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
  },
  listCount: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: "500",
  },

  // Card
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
  cardImage: {
    width: 88,
    height: 88,
  },
  cardImagePlaceholder: {
    width: 88,
    height: 88,
    justifyContent: "center",
    alignItems: "center",
  },
  cardImagePlaceholderText: {
    fontSize: 26,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
    lineHeight: 20,
  },
  cardBadges: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 5,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  cardDate: {
    fontSize: 11,
  },
  cardChevron: {
    fontSize: 24,
    paddingRight: 14,
    fontWeight: "300",
  },

  // Empty state
  emptyIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 28,
  },
  emptyButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  // Detail view
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 2,
  },
  backArrow: {
    fontSize: 26,
    lineHeight: 26,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
  },
  detailImage: {
    width: "100%",
    height: 230,
  },
  detailImagePlaceholder: {
    width: "100%",
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  detailImagePlaceholderText: {
    fontSize: 52,
  },
  detailContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 14,
    lineHeight: 28,
  },
  detailMetaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  detailMetaChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  detailMetaIcon: {
    fontSize: 18,
  },
  detailMetaValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  detailMetaSubLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  ingredientText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  stepNumberText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
});
