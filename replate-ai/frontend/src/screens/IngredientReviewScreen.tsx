import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
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
}

type Props = NativeStackScreenProps<RootStackParamList, "IngredientReview">;

export default function IngredientReviewScreen({ route, navigation }: Props) {
  const { detectedIngredients } = route.params;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
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

  async function handleEdit(ingredientId: string) {
    if (!sessionId || editValue.trim().length === 0) return;

    try {
      const res = await editIngredientName(sessionId, ingredientId, editValue.trim());
      if (res.success) {
        setIngredients(res.ingredients);
      } else {
        Alert.alert("Error", res.error || "Failed to update ingredient");
      }
    } catch {
      Alert.alert("Error", "Could not connect to the server");
    } finally {
      setEditingId(null);
      setEditValue("");
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
        const confirmedNames = res.ingredients.map((i) => i.name);
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
    setEditValue(item.name);
  }

  function renderItem({ item }: { item: Ingredient }) {
    const isEditing = editingId === item.id;

    return (
      <View style={styles.itemContainer}>
        {isEditing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.editInput}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              onSubmitEditing={() => handleEdit(item.id)}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => handleEdit(item.id)}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditingId(null);
                setEditValue("");
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.displayRow}>
            <View style={styles.nameContainer}>
              <Text style={styles.ingredientName}>{item.name}</Text>
              <Text style={styles.confidence}>
                {Math.round(item.confidence * 100)}% confidence
              </Text>
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
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Preparing ingredients for review...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Review Detected Ingredients</Text>
      <Text style={styles.subtitle}>
        Edit names or remove incorrect items, then confirm to add to your
        inventory.
      </Text>

      {ingredients.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            All ingredients have been removed.
          </Text>
        </View>
      ) : (
        <FlatList
          data={ingredients}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
        />
      )}

      <View style={styles.addSection}>
        <Text style={styles.addSectionTitle}>Add Ingredient</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="New ingredient name..."
            placeholderTextColor="#999"
            value={newIngredientName}
            onChangeText={setNewIngredientName}
            returnKeyType="done"
            onSubmitEditing={handleAddIngredient}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddIngredient}
            disabled={newIngredientName.trim().length === 0}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

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
            Confirm Ingredients ({ingredients.length})
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 8,
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
  confidence: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeButtonText: {
    color: "#D32F2F",
    fontWeight: "600",
    fontSize: 14,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#1976D2",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: "#eee",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 14,
  },
  addSection: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
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
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
    margin: 16,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#A5D6A7",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
