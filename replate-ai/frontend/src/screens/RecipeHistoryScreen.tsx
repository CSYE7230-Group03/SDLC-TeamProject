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
        style={styles.card}
        onPress={() => setSelectedRecipe(item)}
        activeOpacity={0.85}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.cardImagePlaceholderText}>🍽️</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.cardBadges}>
            {item.readyInMinutes && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>⏱ {item.readyInMinutes} min</Text>
              </View>
            )}
            {item.servings && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>👤 {item.servings}</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDate}>{formatDate(item.savedAt)}</Text>
        </View>
        <Text style={styles.cardChevron}>›</Text>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  if (selectedRecipe) {
    return (
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backRow} onPress={() => setSelectedRecipe(null)}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {selectedRecipe.image ? (
            <Image
              source={{ uri: selectedRecipe.image }}
              style={styles.detailImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.detailImagePlaceholder}>
              <Text style={styles.detailImagePlaceholderText}>🍽️</Text>
            </View>
          )}

          <View style={styles.detailContent}>
            <Text style={styles.detailTitle}>{selectedRecipe.title}</Text>

            <View style={styles.detailMetaRow}>
              {selectedRecipe.readyInMinutes && (
                <View style={styles.detailMetaChip}>
                  <Text style={styles.detailMetaIcon}>⏱</Text>
                  <View>
                    <Text style={styles.detailMetaValue}>{selectedRecipe.readyInMinutes} min</Text>
                    <Text style={styles.detailMetaSubLabel}>Cook Time</Text>
                  </View>
                </View>
              )}
              {selectedRecipe.servings && (
                <View style={styles.detailMetaChip}>
                  <Text style={styles.detailMetaIcon}>👤</Text>
                  <View>
                    <Text style={styles.detailMetaValue}>{selectedRecipe.servings} servings</Text>
                    <Text style={styles.detailMetaSubLabel}>Servings</Text>
                  </View>
                </View>
              )}
            </View>

            {selectedRecipe.summary && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.sectionText}>
                  {selectedRecipe.summary.replace(/<[^>]*>/g, "")}
                </Text>
              </View>
            )}

            {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                {selectedRecipe.ingredients.map((ing, idx) => (
                  <View key={idx} style={styles.ingredientRow}>
                    <View style={styles.ingredientDot} />
                    <Text style={styles.ingredientText}>
                      {ing.name}
                      {ing.amount ? ` — ${ing.amount}${ing.unit ? " " + ing.unit : ""}` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Instructions</Text>
                {selectedRecipe.instructions.map((step, idx) => (
                  <View key={idx} style={styles.stepRow}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
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
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No saved recipes yet</Text>
        <Text style={styles.emptySubtitle}>
          Recipes you view will appear here so you can easily find them again.
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate("Capture")}
        >
          <Text style={styles.emptyButtonText}>Generate Recipes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={recipes}
        keyExtractor={(item) => item.historyId || item.id.toString()}
        renderItem={renderRecipeCard}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.listCount}>
            {recipes.length} saved recipe{recipes.length !== 1 ? "s" : ""}
          </Text>
        }
      />
    </View>
  );
}

const PRIMARY = "#6C63FF";
const BG = "#F4F4F8";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#1A1A2E";
const TEXT_MID = "#5C5C7A";
const TEXT_LIGHT = "#9999BB";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  centered: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: TEXT_MID,
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
    color: TEXT_LIGHT,
    marginBottom: 4,
    fontWeight: "500",
  },

  // Card
  card: {
    backgroundColor: CARD_BG,
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
    backgroundColor: "#EDEDF5",
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
    color: TEXT_DARK,
    marginBottom: 6,
    lineHeight: 20,
  },
  cardBadges: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 5,
  },
  badge: {
    backgroundColor: "#F0EEFF",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: "500",
  },
  cardDate: {
    fontSize: 11,
    color: TEXT_LIGHT,
  },
  cardChevron: {
    fontSize: 24,
    color: TEXT_LIGHT,
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
    color: TEXT_DARK,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: TEXT_MID,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 28,
  },
  emptyButton: {
    backgroundColor: PRIMARY,
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
    color: PRIMARY,
    lineHeight: 26,
  },
  backText: {
    fontSize: 15,
    color: PRIMARY,
    fontWeight: "600",
  },
  detailImage: {
    width: "100%",
    height: 230,
    backgroundColor: "#EDEDF5",
  },
  detailImagePlaceholder: {
    width: "100%",
    height: 180,
    backgroundColor: "#EDEDF5",
    justifyContent: "center",
    alignItems: "center",
  },
  detailImagePlaceholderText: {
    fontSize: 52,
  },
  detailContent: {
    backgroundColor: CARD_BG,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT_DARK,
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
    borderBottomColor: "#EDEDF5",
  },
  detailMetaChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0EEFF",
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
    color: TEXT_DARK,
  },
  detailMetaSubLabel: {
    fontSize: 11,
    color: TEXT_MID,
    marginTop: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 14,
    color: TEXT_MID,
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
    backgroundColor: PRIMARY,
    flexShrink: 0,
  },
  ingredientText: {
    fontSize: 14,
    color: TEXT_MID,
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
    backgroundColor: PRIMARY,
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
    color: TEXT_MID,
    lineHeight: 22,
  },
});
