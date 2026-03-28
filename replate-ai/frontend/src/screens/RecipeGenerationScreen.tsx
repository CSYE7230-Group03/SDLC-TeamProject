import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  generateRecipes,
  saveRecipeToHistory,
  getUserInventory,
  markRecipeAsCooked,
  createGroceryList,
  getAuthToken,
  Recipe,
  InventoryItem,
} from "../services/api";

const PLACEHOLDER_TOKEN = "placeholder-token";
const CACHE_KEY_RECOMMENDATIONS = "replate_cached_recommendations";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeGeneration">;

// ---------------------------------------------------------------------------
// Feasibility helpers
// ---------------------------------------------------------------------------

interface FeasibilityResult {
  available: string[];
  missing: string[];
  percentage: number;
  label: "feasible" | "partial" | "not-feasible";
}

/** Normalize an ingredient name for fuzzy matching. */
function norm(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

/** Common pantry staples that most households have - treat as "available" */
const PANTRY_STAPLES = [
  "salt", "pepper", "blackpepper", "water", "oil", "cookingoil", "oliveoil",
  "vegetableoil", "butter", "garlic", "onion", "soysauce", "ketchup",
  "mayonnaise", "mustard", "vinegar", "sugar", "honey", "lemonjuice",
  "flour", "rice", "pasta", "spaghetti", "noodles", "bread", "egg", "eggs",
  "milk", "cream", "cheese", "parmesan", "ginger", "cumin", "paprika",
  "oregano", "basil", "thyme", "rosemary", "cinnamon", "nutmeg"
].map(norm);

/**
 * Compare a recipe's required ingredients against the user's inventory.
 * Uses simple substring matching so "chicken breast" matches "chicken".
 * Pantry staples are always considered "available".
 */
function checkFeasibility(
  recipe: Recipe,
  inventory: InventoryItem[]
): FeasibilityResult {
  const recipeIngredients = recipe.ingredients ?? [];
  if (recipeIngredients.length === 0) {
    return { available: [], missing: [], percentage: 100, label: "feasible" };
  }

  const usableInventory = inventory
    .filter((i) => !i.isExpired)
    .map((i) => norm(i.ingredientName));

  const available: string[] = [];
  const missing: string[] = [];

  for (const ri of recipeIngredients) {
    const rNorm = norm(ri.name);
    
    // Check if it's a pantry staple (always available)
    const isPantryStaple = PANTRY_STAPLES.some(
      (ps) => ps.includes(rNorm) || rNorm.includes(ps)
    );
    
    // Check if it's in user's inventory
    const inInventory = usableInventory.some(
      (inv) => inv.includes(rNorm) || rNorm.includes(inv)
    );
    
    if (isPantryStaple || inInventory) {
      available.push(ri.name);
    } else {
      missing.push(ri.name);
    }
  }

  const percentage = Math.round(
    (available.length / recipeIngredients.length) * 100
  );

  let label: FeasibilityResult["label"] = "not-feasible";
  if (percentage === 100) label = "feasible";
  else if (percentage >= 50) label = "partial";

  return { available, missing, percentage, label };
}

const BADGE_COLORS = {
  feasible: { bg: "#E8F5E9", text: "#2E7D32", border: "#A5D6A7" },
  partial: { bg: "#FFF8E1", text: "#F57F17", border: "#FFE082" },
  "not-feasible": { bg: "#FFEBEE", text: "#C62828", border: "#EF9A9A" },
};

const BADGE_LABELS = {
  feasible: "Ready to cook",
  partial: "Partially feasible",
  "not-feasible": "Missing ingredients",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RecipeGenerationScreen({ route, navigation }: Props) {
  const { ingredients } = route.params;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [creatingList, setCreatingList] = useState(false);

  useEffect(() => {
    loadData();
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate("RecipeHistory")}
          style={{ marginRight: 16, flexDirection: "row", alignItems: "center", gap: 5 }}
        >
          <Text style={{ fontSize: 16 }}>⏱</Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#1A1A1A" }}>History</Text>
        </TouchableOpacity>
      ),
    });
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [recipeRes, inventoryRes] = await Promise.all([
        // Preferences are loaded server-side from the user's profile.
        generateRecipes(ingredients, undefined, 5),
        getUserInventory(),
      ]);

      if (recipeRes.success && recipeRes.recipes.length > 0) {
        setRecipes(recipeRes.recipes);
        
        // Update cache for Home screen - take first 3 recipes
        const topRecipes = recipeRes.recipes.slice(0, 3);
        await AsyncStorage.setItem(
          CACHE_KEY_RECOMMENDATIONS,
          JSON.stringify(topRecipes)
        );
      } else {
        Alert.alert("No Recipes", "Could not generate recipes. Please try again.");
      }

      if (inventoryRes.success) {
        setInventory(inventoryRes.items);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function showRecipeDetails(recipe: Recipe) {
    setSelectedRecipe(recipe);
    try {
      await saveRecipeToHistory(recipe, PLACEHOLDER_TOKEN);
    } catch {
      // fail silently
    }
  }

  function closeDetails() {
    setSelectedRecipe(null);
  }

  function renderFeasibilityBadge(feasibility: FeasibilityResult) {
    const colors = BADGE_COLORS[feasibility.label];
    return (
      <View
        style={[
          styles.badge,
          { backgroundColor: colors.bg, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.badgeText, { color: colors.text }]}>
          {BADGE_LABELS[feasibility.label]} ({feasibility.percentage}%)
        </Text>
      </View>
    );
  }

  function renderRecipeCard({ item }: { item: Recipe }) {
    const feasibility = checkFeasibility(item, inventory);
    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => showRecipeDetails(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardRow}>
          {item.image && (
            <Image
              source={{ uri: item.image }}
              style={styles.recipeThumb}
              resizeMode="cover"
            />
          )}
          <View style={styles.recipeContent}>
            <Text style={styles.recipeTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {renderFeasibilityBadge(feasibility)}
            <View style={styles.recipeMetadata}>
              {item.readyInMinutes && (
                <Text style={styles.metadataText}>⏱️ {item.readyInMinutes} min</Text>
              )}
              {item.servings && (
                <Text style={styles.metadataText}>👥 {item.servings}</Text>
              )}
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text style={styles.loadingText}>Generating recipes...</Text>
      </View>
    );
  }

  // Detail view
  if (selectedRecipe) {
    const feasibility = checkFeasibility(selectedRecipe, inventory);
    return (
      <View style={styles.container}>
        <ScrollView style={styles.detailsContainer}>
          <TouchableOpacity style={styles.backButton} onPress={closeDetails}>
            <Text style={styles.backButtonText}>← Back to Recipes</Text>
          </TouchableOpacity>

          {selectedRecipe.image && (
            <Image
              source={{ uri: selectedRecipe.image }}
              style={styles.detailsImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.detailsContent}>
            <Text style={styles.detailsTitle}>{selectedRecipe.title}</Text>
            {renderFeasibilityBadge(feasibility)}

            <View style={styles.detailsMetadata}>
              {selectedRecipe.readyInMinutes && (
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Cook Time</Text>
                  <Text style={styles.metadataValue}>{selectedRecipe.readyInMinutes} min</Text>
                </View>
              )}
              {selectedRecipe.servings && (
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Servings</Text>
                  <Text style={styles.metadataValue}>{selectedRecipe.servings}</Text>
                </View>
              )}
            </View>

            {selectedRecipe.summary && (
              <>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.sectionText}>
                  {selectedRecipe.summary.replace(/<[^>]*>/g, "")}
                </Text>
              </>
            )}

            {/* Ingredients with availability indicators */}
            {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>
                  Ingredients ({feasibility.available.length}/{selectedRecipe.ingredients.length} available)
                </Text>
                {selectedRecipe.ingredients.map((ing, idx) => {
                  const isAvailable = feasibility.available.some(
                    (a) => norm(a) === norm(ing.name)
                  );
                  return (
                    <View key={idx} style={styles.ingredientRow}>
                      <Text style={styles.ingredientIcon}>
                        {isAvailable ? "✅" : "❌"}
                      </Text>
                      <Text
                        style={[
                          styles.ingredientItem,
                          !isAvailable && styles.missingIngredient,
                        ]}
                      >
                        {ing.name} ({ing.amount} {ing.unit || ""})
                      </Text>
                    </View>
                  );
                })}
              </>
            )}

            {/* Missing ingredients summary */}
            {feasibility.missing.length > 0 && (
              <>
                <View style={styles.missingBox}>
                  <Text style={styles.missingTitle}>
                    Missing Ingredients ({feasibility.missing.length})
                  </Text>
                  <Text style={styles.missingList}>
                    {feasibility.missing.join(", ")}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.groceryListButton,
                    creatingList && styles.groceryListButtonDisabled,
                  ]}
                  onPress={async () => {
                    if (creatingList || !selectedRecipe) return;
                    setCreatingList(true);
                    try {
                      const missingIngredients = (selectedRecipe.ingredients ?? []).filter(
                        (ing) => feasibility.missing.some((m) => norm(m) === norm(ing.name))
                      );
                      const result = await createGroceryList({
                        recipeId: selectedRecipe.id,
                        recipeTitle: selectedRecipe.title,
                        missingIngredients,
                      });
                      if (result.success && result.list) {
                        navigation.navigate("GroceryList", {
                          listId: result.list.id,
                          recipeTitle: selectedRecipe.title,
                        });
                      } else {
                        Alert.alert("Error", result.error ?? "Could not create grocery list.");
                      }
                    } catch {
                      Alert.alert("Error", "Network error. Please try again.");
                    } finally {
                      setCreatingList(false);
                    }
                  }}
                  disabled={creatingList}
                >
                  {creatingList ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.groceryListButtonText}>📋 Create Grocery List</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Instructions</Text>
                {selectedRecipe.instructions.map((instr, idx) => (
                  <Text key={idx} style={styles.instructionItem}>
                    {idx + 1}. {instr}
                  </Text>
                ))}
              </>
            )}

            {selectedRecipe.sourceUrl && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                  Alert.alert("Recipe Source", "Open in browser?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Open", onPress: () => {} },
                  ]);
                }}
              >
                <Text style={styles.linkButtonText}>View Full Recipe</Text>
              </TouchableOpacity>
            )}

            {/* Select Recipe Button */}
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                Alert.alert(
                  "Recipe Selected",
                  `You selected "${selectedRecipe.title}". Ready to cook?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Start Cooking",
                      onPress: async () => {
                        try {
                          // Deduct ingredients from inventory
                          const result = await markRecipeAsCooked(
                            selectedRecipe.ingredients || []
                          );
                          
                          if (result.success) {
                            // Navigate to CookingComplete screen
                            navigation.navigate("CookingComplete", {
                              recipe: {
                                title: selectedRecipe.title,
                                image: selectedRecipe.image,
                                ingredients: selectedRecipe.ingredients,
                              },
                              deducted: result.deducted,
                              skipped: result.skipped,
                            });
                          } else {
                            Alert.alert("Error", result.error || "Failed to update inventory");
                          }
                        } catch (err) {
                          Alert.alert("Error", "Could not update inventory. Please try again.");
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.selectButtonText}>✓ Select This Recipe</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Recipe list view
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generated Recipes</Text>
      <Text style={styles.subtitle}>
        Found {recipes.length} recipes with your ingredients
      </Text>

      {recipes.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No recipes found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRecipeCard}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF8" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: "#555555" },
  emptyText: { fontSize: 16, color: "#999999", marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#555555",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },

  // Recipe card - horizontal layout with small image
  recipeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  recipeThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#e0e0e0",
    marginRight: 12,
  },
  recipeContent: { flex: 1 },
  recipeTitle: { fontSize: 15, fontWeight: "600", color: "#1A1A1A", marginBottom: 6 },
  recipeMetadata: { flexDirection: "row", gap: 10, marginTop: 4 },
  metadataText: { fontSize: 12, color: "#555555" },
  chevron: { fontSize: 24, color: "#CCCCCC", marginLeft: 8 },

  // Feasibility badge
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },

  // Detail view
  detailsContainer: { flex: 1 },
  backButton: { paddingHorizontal: 16, paddingVertical: 12, marginTop: 8 },
  backButtonText: { color: "#1A1A1A", fontSize: 14, fontWeight: "600" },
  detailsImage: { width: "100%", height: 280, backgroundColor: "#e0e0e0" },
  detailsContent: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  detailsMetadata: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  metadataItem: { flex: 1 },
  metadataLabel: {
    fontSize: 11,
    color: "#999999",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  metadataValue: { fontSize: 16, fontWeight: "600", color: "#1A1A1A" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 16,
    marginBottom: 10,
  },
  sectionText: { fontSize: 14, color: "#555555", lineHeight: 22 },

  // Ingredient rows with availability
  ingredientRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  ingredientIcon: { fontSize: 14, marginRight: 8 },
  ingredientItem: { fontSize: 13, color: "#555555", lineHeight: 20, flex: 1 },
  missingIngredient: { color: "#D32F2F" },

  // Missing ingredients summary box
  missingBox: {
    backgroundColor: "#FFF8E1",
    borderWidth: 1,
    borderColor: "#FFE082",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  missingTitle: { fontSize: 14, fontWeight: "600", color: "#F57F17", marginBottom: 4 },
  missingList: { fontSize: 13, color: "#795548", lineHeight: 20 },
  groceryListButton: {
    backgroundColor: "#1A1A1A",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  groceryListButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  groceryListButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  instructionItem: { fontSize: 13, color: "#555555", marginBottom: 10, lineHeight: 20 },
  linkButton: {
    backgroundColor: "#1A1A1A",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  linkButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  selectButton: {
    backgroundColor: "#1A1A1A",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  selectButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  retryButton: {
    backgroundColor: "#1A1A1A",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
