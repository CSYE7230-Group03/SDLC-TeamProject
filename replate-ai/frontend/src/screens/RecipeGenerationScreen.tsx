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
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { generateRecipes, saveRecipeToHistory, Recipe } from "../services/api";

// PLACEHOLDER: Replace with `await getAuth().currentUser?.getIdToken()` from "firebase/auth"
// once auth (#33) is merged.
const PLACEHOLDER_TOKEN = "placeholder-token";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeGeneration">;

export default function RecipeGenerationScreen({ route, navigation }: Props) {
  const { ingredients } = route.params;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    loadRecipes();
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate("RecipeHistory")}
          style={{ marginRight: 16, flexDirection: "row", alignItems: "center", gap: 5 }}
        >
          <Text style={{ fontSize: 16 }}>⏱</Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#6C63FF" }}>History</Text>
        </TouchableOpacity>
      ),
    });
  }, []);

  async function loadRecipes() {
    try {
      setLoading(true);
      const response = await generateRecipes(ingredients, {}, 5);
      if (response.success && response.recipes.length > 0) {
        setRecipes(response.recipes);
      } else {
        Alert.alert("No Recipes", "Could not generate recipes. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to generate recipes. Please try again.");
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

  function renderRecipeCard({ item }: { item: Recipe }) {
    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => showRecipeDetails(item)}
        activeOpacity={0.8}
      >
        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={styles.recipeImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.recipeContent}>
          <Text style={styles.recipeTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.recipeMetadata}>
            {item.readyInMinutes && (
              <Text style={styles.metadataText}>⏱️ {item.readyInMinutes} min</Text>
            )}
            {item.servings && (
              <Text style={styles.metadataText}>👥 {item.servings} servings</Text>
            )}
          </View>
          {item.summary && (
            <Text style={styles.recipeSummary} numberOfLines={2}>
              {item.summary.replace(/<[^>]*>/g, "")}
            </Text>
          )}
        </View>
        <View style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View Details</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Generating recipes...</Text>
      </View>
    );
  }

  if (selectedRecipe) {
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

            {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                {selectedRecipe.ingredients.map((ing, idx) => (
                  <Text key={idx} style={styles.ingredientItem}>
                    • {ing.name} ({ing.amount} {ing.unit || ""})
                  </Text>
                ))}
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
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generated Recipes</Text>
      <Text style={styles.subtitle}>
        Found {recipes.length} recipes with your ingredients
      </Text>

      {recipes.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No recipes found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRecipes}>
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
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  recipeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#e0e0e0",
  },
  recipeContent: {
    padding: 14,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  recipeMetadata: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 12,
    color: "#666",
  },
  recipeSummary: {
    fontSize: 12,
    color: "#999",
    lineHeight: 18,
  },
  viewButton: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  viewButtonText: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 14,
  },
  detailsContainer: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  backButtonText: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "600",
  },
  detailsImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#e0e0e0",
  },
  detailsContent: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
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
  metadataItem: {
    flex: 1,
  },
  metadataLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  metadataValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
  },
  ingredientItem: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
    lineHeight: 20,
  },
  instructionItem: {
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
    lineHeight: 20,
  },
  linkButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  linkButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
