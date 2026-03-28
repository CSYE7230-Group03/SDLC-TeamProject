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

type Props = NativeStackScreenProps<RootStackParamList, "CookingComplete">;

// Colors
const PRIMARY = "#1A1A1A";
const SUCCESS = "#2E7D32";
const SUCCESS_LIGHT = "#E8F5E9";
const BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#1A1A1A";
const TEXT_MID = "#555555";
const TEXT_LIGHT = "#999999";
const ACCENT = "#D4A017";
const WARNING = "#F57C00";
const BORDER = "#F0EFED";

export default function CookingCompleteScreen({ route, navigation }: Props) {
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Recipe Image */}
      {recipe.image ? (
        <Image source={{ uri: recipe.image }} style={styles.recipeImage} resizeMode="cover" />
      ) : (
        <View style={[styles.recipeImage, styles.imagePlaceholder]}>
          <Ionicons name="restaurant" size={48} color={TEXT_LIGHT} />
        </View>
      )}

      {/* Success Message */}
      <Animated.View
        style={[
          styles.successBox,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.successIconContainer}>
          <Ionicons name="checkmark-circle" size={56} color={SUCCESS} />
        </View>
        <Text style={styles.successTitle}>Enjoy Your Meal!</Text>
        <Text style={styles.recipeName}>{recipe.title}</Text>
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Deducted Ingredients */}
        {deducted.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-done" size={20} color={SUCCESS} />
              <Text style={styles.sectionTitle}>Ingredients Used</Text>
            </View>
            {deducted.map((item, idx) => (
              <View key={idx} style={styles.deductedItem}>
                <View style={styles.itemLeft}>
                  <MaterialCommunityIcons name="food-apple-outline" size={18} color={PRIMARY} />
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemPrev}>{item.previousQty}</Text>
                  <Ionicons name="arrow-forward" size={14} color={TEXT_LIGHT} />
                  <Text style={styles.itemNew}>{item.newQty}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Skipped Items */}
        {skipped.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={20} color={TEXT_LIGHT} />
              <Text style={styles.sectionTitleMuted}>Skipped ({skipped.length})</Text>
            </View>
            <Text style={styles.skippedText}>
              {skipped.map((s) => s.name).join(", ")}
            </Text>
          </View>
        )}

        {/* Remaining Inventory */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="fridge-outline" size={20} color={PRIMARY} />
            <Text style={styles.sectionTitle}>Remaining Inventory</Text>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={PRIMARY} />
            </View>
          ) : inventory.filter((item) => item.quant > 0).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={32} color={TEXT_LIGHT} />
              <Text style={styles.emptyText}>No items remaining</Text>
            </View>
          ) : (
            inventory
              .filter((item) => item.quant > 0)
              .map((item) => (
                <View key={item.id} style={styles.inventoryItem}>
                  <Text style={styles.inventoryName}>{item.ingredientName}</Text>
                  <View style={styles.inventoryQtyContainer}>
                    <Text style={styles.inventoryQty}>{item.quant}</Text>
                    <Text style={styles.inventoryUnit}>{item.unit}</Text>
                  </View>
                </View>
              ))
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Capture")}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Add More Ingredients</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.8}
          >
            <Ionicons name="home-outline" size={20} color={TEXT_MID} />
            <Text style={styles.secondaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  recipeImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#e8e8e8",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  successBox: {
    backgroundColor: SUCCESS_LIGHT,
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
    color: SUCCESS,
    marginBottom: 6,
  },
  recipeName: {
    fontSize: 15,
    color: TEXT_DARK,
    textAlign: "center",
  },
  section: {
    backgroundColor: CARD_BG,
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
    color: TEXT_DARK,
  },
  sectionTitleMuted: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_LIGHT,
  },
  deductedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: TEXT_DARK,
    textTransform: "capitalize",
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemPrev: {
    fontSize: 14,
    color: TEXT_LIGHT,
  },
  itemNew: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: "600",
  },
  skippedText: {
    fontSize: 13,
    color: TEXT_LIGHT,
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
    color: TEXT_LIGHT,
    marginTop: 8,
  },
  inventoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  inventoryName: {
    fontSize: 14,
    color: TEXT_DARK,
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
    color: PRIMARY,
    fontWeight: "700",
  },
  inventoryUnit: {
    fontSize: 12,
    color: TEXT_LIGHT,
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
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: PRIMARY,
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
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E0DE",
  },
  secondaryButtonText: {
    color: TEXT_MID,
    fontSize: 16,
    fontWeight: "600",
  },
});
