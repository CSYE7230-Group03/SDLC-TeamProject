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
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  getGroceryList,
  toggleGroceryItemAvailability,
  GroceryListItem,
} from "../services/api";
import { useAppTheme } from "../theme/ThemeProvider";
import { spacing, radii } from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "GroceryList">;

export default function GroceryListScreen({ route, navigation }: Props) {
  const { listId, recipeTitle } = route.params;
  const { theme } = useAppTheme();

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
        setLoadError(res.error ?? "Couldn't load your grocery list.");
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
          Alert.alert("Couldn't Update", res.error ?? "This item couldn't be updated. Please try again.");
        }
      } catch {
        // Revert on network error
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, isAvailableAtHome: item.isAvailableAtHome } : i
          )
        );
        Alert.alert("Connection Error", "Check your connection and try again.");
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

    Alert.alert("Items to Buy", `Here's what to pick up:\n\n${itemLines}`);
  }

  const neededCount = items.filter((i) => !i.isAvailableAtHome).length;
  const allAvailable = items.length > 0 && neededCount === 0;

  function renderItem({ item }: { item: GroceryListItem }) {
    const available = item.isAvailableAtHome;
    const isToggling = togglingId === item.id;

    return (
      <View style={[styles.itemRow, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={[
            styles.checkbox,
            { borderColor: theme.colors.border },
            available && { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
          ]}
          onPress={() => handleToggle(item)}
          disabled={isToggling}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: available }}
          accessibilityLabel={`${item.name}, ${available ? "available at home" : "not available"}`}
        >
          {available && <Ionicons name="checkmark" size={14} color={theme.colors.background} />}
        </TouchableOpacity>

        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: available ? theme.colors.textMuted : theme.colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.itemAmount, { color: available ? theme.colors.divider : theme.colors.textMuted }]}>
            {item.amount} {item.unit}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.text} />
        <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>Loading grocery list...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.danger }]}>{loadError}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.buttonPrimary }]}
          onPress={fetchList}
        >
          <Text style={[styles.retryButtonText, { color: theme.colors.buttonPrimaryText }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.counterBar, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.counterText, { color: theme.colors.textMuted }]}>
          {neededCount} of {items.length} items to buy
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />

      <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.orderButton,
            { backgroundColor: theme.colors.buttonPrimary },
            allAvailable && styles.orderButtonDisabled,
          ]}
          onPress={handleOrder}
          disabled={allAvailable}
          accessibilityRole="button"
          accessibilityLabel={allAvailable ? "You have everything" : `See ${neededCount} items to buy`}
        >
          <Text style={[styles.orderButtonText, { color: theme.colors.buttonPrimaryText }]}>
            {allAvailable ? "You have everything!" : `See ${neededCount} Items to Buy`}
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: spacing.xxxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 15,
  },
  errorText: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.sm,
  },
  retryButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  counterBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  counterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md + 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
  },
  itemAmount: {
    fontSize: 13,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  orderButton: {
    paddingVertical: spacing.md + 2,
    borderRadius: radii.lg,
    alignItems: "center",
  },
  orderButtonDisabled: {
    opacity: 0.45,
  },
  orderButtonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
});
