import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  getGroceryList,
  toggleGroceryItemAvailability,
  GroceryListItem,
} from "../services/api";

const PRIMARY = "#1A1A1A";
const BG = "#FAFAF8";

type Props = NativeStackScreenProps<RootStackParamList, "GroceryList">;

export default function GroceryListScreen({ route, navigation }: Props) {
  const { listId, recipeTitle } = route.params;

  const [items, setItems] = useState<GroceryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: `Grocery List for ${recipeTitle}` });
    fetchList();
  }, []);

  async function fetchList() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getGroceryList(listId);
      if (res.success && res.list) {
        setItems(res.list.items);
      } else {
        setLoadError(res.error ?? "Failed to load grocery list.");
      }
    } catch {
      setLoadError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleToggle = useCallback(
    async (item: GroceryListItem) => {
      if (togglingId) return;

      // Optimistic update
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, isAvailableAtHome: !i.isAvailableAtHome }
            : i
        )
      );
      setTogglingId(item.id);

      try {
        const res = await toggleGroceryItemAvailability(listId, item.id);
        if (res.success) {
          // Sync authoritative value from server
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, isAvailableAtHome: res.isAvailableAtHome ?? !item.isAvailableAtHome }
                : i
            )
          );
        } else {
          // Revert on failure
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, isAvailableAtHome: item.isAvailableAtHome } : i
            )
          );
          Alert.alert("Error", res.error ?? "Could not update item.");
        }
      } catch {
        // Revert on network error
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, isAvailableAtHome: item.isAvailableAtHome } : i
          )
        );
        Alert.alert("Error", "Network error. Please try again.");
      } finally {
        setTogglingId(null);
      }
    },
    [listId, togglingId]
  );

  function handleOrder() {
    const toOrder = items.filter((i) => !i.isAvailableAtHome);
    if (toOrder.length === 0) return;

    const itemLines = toOrder
      .map((i) => `• ${i.name} — ${i.amount} ${i.unit}`.trim())
      .join("\n");

    Alert.alert("Grocery Order", `Items to buy:\n\n${itemLines}`);
  }

  const neededCount = items.filter((i) => !i.isAvailableAtHome).length;
  const allAvailable = items.length > 0 && neededCount === 0;

  function renderItem({ item }: { item: GroceryListItem }) {
    const available = item.isAvailableAtHome;
    const isToggling = togglingId === item.id;

    return (
      <View style={styles.itemRow}>
        <TouchableOpacity
          style={[styles.checkbox, available && styles.checkboxChecked]}
          onPress={() => handleToggle(item)}
          disabled={isToggling}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: available }}
          accessibilityLabel={`${item.name}, ${available ? "available at home" : "not available"}`}
        >
          {available && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, available && styles.itemNameMuted]}>
            {item.name}
          </Text>
          <Text style={[styles.itemAmount, available && styles.itemAmountMuted]}>
            {item.amount} {item.unit}
          </Text>
        </View>

        {available && (
          <View style={styles.atHomeBadge}>
            <Text style={styles.atHomeBadgeText}>At home</Text>
          </View>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading grocery list...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchList}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.counterBar}>
        <Text style={styles.counterText}>
          {neededCount} of {items.length} items needed
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.orderButton, allAvailable && styles.orderButtonDisabled]}
          onPress={handleOrder}
          disabled={allAvailable}
          accessibilityRole="button"
          accessibilityLabel={allAvailable ? "Nothing to order" : `Order ${neededCount} items`}
        >
          <Text style={styles.orderButtonText}>
            {allAvailable ? "Nothing to order! 🎉" : `Order ${neededCount} Items`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BG,
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#666",
  },
  errorText: {
    fontSize: 15,
    color: "#C62828",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#1A1A1A",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  counterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0EFED",
  },
  counterText: {
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  separator: {
    height: 0,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#aaa",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: "#1A1A1A",
    borderColor: "#1A1A1A",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    lineHeight: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#222",
    marginBottom: 2,
  },
  itemNameMuted: {
    color: "#999",
  },
  itemAmount: {
    fontSize: 13,
    color: "#666",
  },
  itemAmountMuted: {
    color: "#bbb",
  },
  atHomeBadge: {
    backgroundColor: "#E8F5E9",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  atHomeBadgeText: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "600",
  },
  footer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0EFED",
  },
  orderButton: {
    backgroundColor: "#1A1A1A",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  orderButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  orderButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
