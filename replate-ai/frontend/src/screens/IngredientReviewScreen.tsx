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

interface Ingredient {
  id: string;
  name: string;
  confidence: number;
  quantity?: number;
  unit?: string;
}

type Props = NativeStackScreenProps<RootStackParamList, "IngredientReview">;

export default function IngredientReviewScreen({ route, navigation }: Props) {
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
        <View key={item.id} style={styles.editContainer}>
          {/* Show image reference while editing */}
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.editImageRef} resizeMode="cover" />
          )}
          <View style={styles.editForm}>
            <Text style={styles.editLabel}>Edit: {item.name}</Text>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Ingredient name"
              autoFocus
            />
            <View style={styles.quantityRow}>
              <TextInput
                style={[styles.editInput, styles.quantityInput]}
                value={editQuantity}
                onChangeText={setEditQuantity}
                placeholder="Qty"
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.editInput, styles.unitInput]}
                value={editUnit}
                onChangeText={setEditUnit}
                placeholder="Unit (e.g., pieces, cups)"
              />
            </View>
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => handleSaveEdit(item.id)}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View key={item.id} style={styles.itemContainer}>
        <View style={styles.displayRow}>
          <View style={styles.nameContainer}>
            <Text style={styles.ingredientName}>{item.name}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.quantity}>
                {item.quantity || 1} {item.unit || "item"}
              </Text>
              <Text style={styles.confidence}>
                {Math.round(item.confidence * 100)}% confidence
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => startEdit(item)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Analyzing your ingredients...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Image Preview Section */}
        {imageUri && (
          <View style={styles.imageSection}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
            <View style={styles.imageOverlay}>
              <Text style={styles.imageOverlayText}>
                📸 {ingredients.length} ingredients detected
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.title}>Review Detected Ingredients</Text>
        <Text style={styles.subtitle}>
          Verify each ingredient's name and quantity. Tap Edit to make corrections.
        </Text>

        {/* Ingredients List */}
        {ingredients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No ingredients detected.</Text>
          </View>
        ) : (
          <View style={styles.ingredientsList}>
            {ingredients.map(renderIngredientItem)}
          </View>
        )}

        {/* Add Ingredient Section */}
        <View style={styles.addSection}>
          <Text style={styles.addSectionTitle}>Add Missing Ingredient</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="Enter ingredient name..."
              placeholderTextColor="#999"
              value={newIngredientName}
              onChangeText={setNewIngredientName}
              returnKeyType="done"
              onSubmitEditing={handleAddIngredient}
            />
            <TouchableOpacity
              style={[
                styles.addButton,
                newIngredientName.trim().length === 0 && styles.addButtonDisabled,
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
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (confirming || ingredients.length === 0) && styles.confirmButtonDisabled,
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
    backgroundColor: "#f5f5f5",
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
    color: "#666",
  },

  // Image preview
  imageSection: {
    position: "relative",
    height: 180,
    backgroundColor: "#e0e0e0",
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
    color: "#999",
  },
  itemContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  
  // Edit mode with image reference
  editContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 2,
    borderColor: "#1976D2",
  },
  editImageRef: {
    width: "100%",
    height: 120,
    backgroundColor: "#e0e0e0",
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
    color: "#333",
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
    color: "#4CAF50",
    fontWeight: "600",
  },
  confidence: {
    fontSize: 12,
    color: "#999",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: "#1976D2",
    fontWeight: "600",
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
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
    color: "#1976D2",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#f9f9f9",
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
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#eee",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 14,
  },

  // Add section
  addSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 10,
  },
  addSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
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
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#f9f9f9",
  },
  addButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  addButtonDisabled: {
    backgroundColor: "#A5D6A7",
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
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#A5D6A7",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
