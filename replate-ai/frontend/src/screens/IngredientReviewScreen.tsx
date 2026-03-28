import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  createReviewSession,
  editIngredientName,
  removeIngredient,
  addIngredient,
  confirmIngredients,
} from "../services/api";
import { useAppTheme } from "../theme/ThemeProvider";

interface Ingredient {
  id: string;
  name: string;
  confidence: number;
  quantity?: number;
  unit?: string;
}

type Props = NativeStackScreenProps<RootStackParamList, "IngredientReview">;

export default function IngredientReviewScreen({ route, navigation }: Props) {
  const { theme } = useAppTheme();
  const { detectedIngredients, imageUri } = route.params;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [newIngredientName, setNewIngredientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    initSession();
  }, []);

  async function initSession() {
    try {
      setLoading(true);
      const res = await createReviewSession(detectedIngredients);
      if (res.success) {
        setSessionId(res.sessionId);
        setIngredients(res.ingredients);
      } else {
        Alert.alert("Error", "Failed to start review session");
      }
    } catch {
      Alert.alert("Error", "Could not connect to the server");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit(ingredientId: string) {
    if (!sessionId || editName.trim().length === 0) return;

    try {
      const res = await editIngredientName(sessionId, ingredientId, editName.trim());
      if (res.success) {
        // Update local state with quantity/unit changes too
        const updated = res.ingredients.map((ing: Ingredient) => {
          if (ing.id === ingredientId) {
            return {
              ...ing,
              quantity: parseFloat(editQuantity) || ing.quantity,
              unit: editUnit || ing.unit,
            };
          }
          return ing;
        });
        setIngredients(updated);
      } else {
        Alert.alert("Error", res.error || "Failed to update ingredient");
      }
    } catch {
      Alert.alert("Error", "Could not connect to the server");
    } finally {
      cancelEdit();
    }
  }

  async function handleRemove(ingredientId: string, ingredientName: string) {
    if (!sessionId) return;

    Alert.alert(
      "Remove Ingredient",
      `Are you sure you want to remove "${ingredientName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await removeIngredient(sessionId, ingredientId);
              if (res.success) {
                setIngredients(res.ingredients);
              } else {
                Alert.alert("Error", res.error || "Failed to remove ingredient");
              }
            } catch {
              Alert.alert("Error", "Could not connect to the server");
            }
          },
        },
      ]
    );
  }

  async function handleAddIngredient() {
    if (!sessionId || newIngredientName.trim().length === 0) {
      Alert.alert("Invalid", "Please enter an ingredient name");
      return;
    }

    try {
      const res = await addIngredient(sessionId, newIngredientName.trim());
      if (res.success) {
        setIngredients(res.ingredients);
        setNewIngredientName("");
      } else {
        Alert.alert("Error", res.error || "Failed to add ingredient");
      }
    } catch {
      Alert.alert("Error", "Could not connect to the server");
    }
  }

  async function handleConfirm() {
    if (!sessionId) return;

    if (ingredients.length === 0) {
      Alert.alert("No Ingredients", "Add at least one ingredient before confirming.");
      return;
    }

    setConfirming(true);
    try {
      const res = await confirmIngredients(sessionId);
      if (res.success) {
        const confirmedNames = res.ingredients.map((i: any) => i.name);
        navigation.navigate("RecipeGeneration", { ingredients: confirmedNames });
      } else {
        Alert.alert("Error", res.error || "Failed to confirm ingredients");
        setConfirming(false);
      }
    } catch {
      Alert.alert("Error", "Could not connect to the server");
      setConfirming(false);
    }
  }

  function startEdit(item: Ingredient) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditQuantity(item.quantity?.toString() || "1");
    setEditUnit(item.unit || "item");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditQuantity("");
    setEditUnit("");
  }

  function renderIngredientItem(item: Ingredient) {
    const isEditing = editingId === item.id;

    if (isEditing) {
      return (
        <View key={item.id} style={[styles.editContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.text }]}>
          {/* Show image reference while editing */}
          {imageUri && (
            <Image source={{ uri: imageUri }} style={[styles.editImageRef, { backgroundColor: theme.colors.border }]} resizeMode="cover" />
          )}
          <View style={styles.editForm}>
            <Text style={[styles.editLabel, { color: theme.colors.text }]}>Edit: {item.name}</Text>
            <TextInput
              style={[styles.editInput, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBg, color: theme.colors.text }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Ingredient name"
              placeholderTextColor={theme.colors.textMuted}
              autoFocus
            />
            <View style={styles.quantityRow}>
              <TextInput
                style={[styles.editInput, styles.quantityInput, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBg, color: theme.colors.text }]}
                value={editQuantity}
                onChangeText={setEditQuantity}
                placeholder="Qty"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.editInput, styles.unitInput, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBg, color: theme.colors.text }]}
                value={editUnit}
                onChangeText={setEditUnit}
                placeholder="Unit (e.g., pieces, cups)"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.colors.buttonPrimary }]}
                onPress={() => handleSaveEdit(item.id)}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cancelButton, { backgroundColor: theme.colors.inputBg }]} onPress={cancelEdit}>
                <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View key={item.id} style={[styles.itemContainer, { backgroundColor: theme.colors.card }]}>
        <View style={styles.displayRow}>
          <View style={styles.nameContainer}>
            <Text style={[styles.ingredientName, { color: theme.colors.text }]}>{item.name}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.quantity, { color: theme.colors.accent }]}>
                {item.quantity || 1} {item.unit || "item"}
              </Text>
              <Text style={[styles.confidence, { color: theme.colors.textMuted }]}>
                {Math.round(item.confidence * 100)}% confidence
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: theme.colors.inputBg }]}
              onPress={() => startEdit(item)}
            >
              <Text style={[styles.editButtonText, { color: theme.colors.text }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: theme.colors.dangerLight }]}
              onPress={() => handleRemove(item.id, item.name)}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.text} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Analyzing your ingredients...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Image Preview Section */}
        {imageUri && (
          <View style={[styles.imageSection, { backgroundColor: theme.colors.border }]}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
            <View style={styles.imageOverlay}>
              <Text style={styles.imageOverlayText}>
                📸 {ingredients.length} ingredients detected
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.title, { color: theme.colors.text }]}>Review Detected Ingredients</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Verify each ingredient's name and quantity. Tap Edit to make corrections.
        </Text>

        {/* Ingredients List */}
        {ingredients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>No ingredients detected.</Text>
          </View>
        ) : (
          <View style={styles.ingredientsList}>
            {ingredients.map(renderIngredientItem)}
          </View>
        )}

        {/* Add Ingredient Section */}
        <View style={[styles.addSection, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.addSectionTitle, { color: theme.colors.textSecondary }]}>Add Missing Ingredient</Text>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.addInput, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBg, color: theme.colors.text }]}
              placeholder="Enter ingredient name..."
              placeholderTextColor={theme.colors.textMuted}
              value={newIngredientName}
              onChangeText={setNewIngredientName}
              returnKeyType="done"
              onSubmitEditing={handleAddIngredient}
            />
            <TouchableOpacity
              style={[
                styles.addButton,
                { backgroundColor: newIngredientName.trim().length === 0 ? theme.colors.border : theme.colors.buttonPrimary },
              ]}
              onPress={handleAddIngredient}
              disabled={newIngredientName.trim().length === 0}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Confirm Button - Fixed at bottom */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            { backgroundColor: (confirming || ingredients.length === 0) ? theme.colors.border : theme.colors.buttonPrimary },
          ]}
          onPress={handleConfirm}
          disabled={confirming || ingredients.length === 0}
        >
          {confirming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>
              ✓ Confirm & Generate Recipes ({ingredients.length})
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },

  // Image preview
  imageSection: {
    position: "relative",
    height: 180,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  imageOverlayText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Header
  title: {
    fontSize: 22,
    fontWeight: "bold",
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  // Ingredients list
  ingredientsList: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
  itemContainer: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  // Edit mode with image reference
  editContainer: {
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 2,
  },
  editImageRef: {
    width: "100%",
    height: 120,
  },
  editForm: {
    padding: 14,
  },
  displayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameContainer: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 17,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 12,
  },
  quantity: {
    fontSize: 13,
    fontWeight: "600",
  },
  confidence: {
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  editButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  removeButtonText: {
    color: "#D32F2F",
    fontWeight: "600",
    fontSize: 14,
  },

  // Edit mode
  editLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: "row",
    gap: 8,
  },
  quantityInput: {
    flex: 1,
  },
  unitInput: {
    flex: 2,
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },

  // Add section
  addSection: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
  },
  addSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  addRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
