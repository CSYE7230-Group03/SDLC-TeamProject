import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getUserInventory, InventoryItem } from "../services/api";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "CookingComplete">;

export default function CookingCompleteScreen({ route, navigation }: Props) {
  const { theme } = useAppTheme();
  const { recipe, deducted, skipped } = route.params;
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadInventory();

    // Celebration animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  async function loadInventory() {
    try {
      const res = await getUserInventory();
      if (res.success) {
        setInventory(res.items);
      }
    } catch (err) {
      console.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Recipe Image */}
      {recipe.image ? (
        <Image source={{ uri: recipe.image }} style={[styles.recipeImage, { backgroundColor: theme.colors.border }]} resizeMode="cover" />
      ) : (
        <View style={[styles.recipeImage, styles.imagePlaceholder, { backgroundColor: theme.colors.border }]}>
          <Ionicons name="restaurant" size={48} color={theme.colors.textMuted} />
        </View>
      )}

      {/* Success Message */}
      <Animated.View
        style={[
          styles.successBox,
          { backgroundColor: theme.colors.successLight },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.successIconContainer}>
          <Ionicons name="checkmark-circle" size={56} color={theme.colors.success} />
        </View>
        <Text style={[styles.successTitle, { color: theme.colors.success }]}>Enjoy Your Meal!</Text>
        <Text style={[styles.recipeName, { color: theme.colors.text }]}>{recipe.title}</Text>
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Deducted Ingredients */}
        {deducted.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-done" size={20} color={theme.colors.success} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Ingredients Used</Text>
            </View>
            {deducted.map((item, idx) => (
              <View key={idx} style={[styles.deductedItem, { borderBottomColor: theme.colors.divider }]}>
                <View style={styles.itemLeft}>
                  <MaterialCommunityIcons name="food-apple-outline" size={18} color={theme.colors.primary} />
                  <Text style={[styles.itemName, { color: theme.colors.text }]}>{item.name}</Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={[styles.itemPrev, { color: theme.colors.textMuted }]}>{item.previousQty}</Text>
                  <Ionicons name="arrow-forward" size={14} color={theme.colors.textMuted} />
                  <Text style={[styles.itemNew, { color: theme.colors.text }]}>{item.newQty}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Skipped Items */}
        {skipped.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.textMuted} />
              <Text style={[styles.sectionTitleMuted, { color: theme.colors.textMuted }]}>Skipped ({skipped.length})</Text>
            </View>
            <Text style={[styles.skippedText, { color: theme.colors.textMuted }]}>
              {skipped.map((s) => s.name).join(", ")}
            </Text>
          </View>
        )}

        {/* Remaining Inventory */}
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="fridge-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Remaining Inventory</Text>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : inventory.filter((item) => item.quant > 0).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={32} color={theme.colors.textMuted} />
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>No items remaining</Text>
            </View>
          ) : (
            inventory
              .filter((item) => item.quant > 0)
              .map((item) => (
                <View key={item.id} style={[styles.inventoryItem, { borderBottomColor: theme.colors.divider }]}>
                  <Text style={[styles.inventoryName, { color: theme.colors.text }]}>{item.ingredientName}</Text>
                  <View style={styles.inventoryQtyContainer}>
                    <Text style={[styles.inventoryQty, { color: theme.colors.text }]}>{item.quant}</Text>
                    <Text style={[styles.inventoryUnit, { color: theme.colors.textMuted }]}>{item.unit}</Text>
                  </View>
                </View>
              ))
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.colors.buttonPrimary, shadowColor: theme.colors.buttonPrimary }]}
            onPress={() => navigation.navigate("Capture")}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Add More Ingredients</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.buttonSecondaryBorder }]}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.8}
          >
            <Ionicons name="home-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.secondaryButtonText, { color: theme.colors.textSecondary }]}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  recipeImage: {
    width: "100%",
    height: 220,
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  successBox: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: -40,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  successIconContainer: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  recipeName: {
    fontSize: 15,
    textAlign: "center",
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  sectionTitleMuted: {
    fontSize: 14,
    fontWeight: "600",
  },
  deductedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    textTransform: "capitalize",
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemPrev: {
    fontSize: 14,
  },
  itemNew: {
    fontSize: 14,
    fontWeight: "600",
  },
  skippedText: {
    fontSize: 13,
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  inventoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  inventoryName: {
    fontSize: 14,
    textTransform: "capitalize",
    flex: 1,
  },
  inventoryQtyContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  inventoryQty: {
    fontSize: 16,
    fontWeight: "700",
  },
  inventoryUnit: {
    fontSize: 12,
  },
  buttonContainer: {
    padding: 16,
    gap: 12,
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
