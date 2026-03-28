import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Image,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getUserInventory, InventoryItem } from "../services/api";
import { useAppTheme } from "../theme/ThemeProvider";
import { spacing, radii } from "../theme/theme";

const LAST_INGREDIENT_IMAGE_KEY = "replate_last_ingredient_image";

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Ingredient icon mapping
type IconInfo = {
  name: string;
  color: string;
  bg: string;
};

function getIngredientIcon(ingredientName: string): IconInfo {
  const name = ingredientName.toLowerCase();

  // Fruits
  if (name.includes("apple")) return { name: "food-apple", color: "#e53935", bg: "#ffebee" };
  if (name.includes("banana")) return { name: "fruit-watermelon", color: "#fdd835", bg: "#fffde7" };
  if (name.includes("orange") || name.includes("citrus")) return { name: "fruit-citrus", color: "#ff9800", bg: "#fff3e0" };
  if (name.includes("grape")) return { name: "fruit-grapes", color: "#7b1fa2", bg: "#f3e5f5" };
  if (name.includes("cherry") || name.includes("berr")) return { name: "fruit-cherries", color: "#c62828", bg: "#ffebee" };
  if (name.includes("pineapple")) return { name: "fruit-pineapple", color: "#f9a825", bg: "#fffde7" };
  if (name.includes("lemon") || name.includes("lime")) return { name: "fruit-citrus", color: "#cddc39", bg: "#f9fbe7" };
  if (name.includes("avocado")) return { name: "food-apple", color: "#558b2f", bg: "#f1f8e9" };
  if (name.includes("tomato")) return { name: "food-apple", color: "#e53935", bg: "#ffebee" };

  // Vegetables
  if (name.includes("carrot")) return { name: "carrot", color: "#ff7043", bg: "#fbe9e7" };
  if (name.includes("corn")) return { name: "corn", color: "#fbc02d", bg: "#fffde7" };
  if (name.includes("broccoli") || name.includes("lettuce") || name.includes("spinach") || name.includes("kale"))
    return { name: "leaf", color: "#43a047", bg: "#e8f5e9" };
  if (name.includes("mushroom")) return { name: "mushroom", color: "#8d6e63", bg: "#efebe9" };
  if (name.includes("pepper") || name.includes("chili")) return { name: "chili-mild", color: "#f44336", bg: "#ffebee" };
  if (name.includes("onion") || name.includes("garlic")) return { name: "garlic", color: "#ffb74d", bg: "#fff8e1" };
  if (name.includes("potato")) return { name: "food-steak", color: "#a1887f", bg: "#efebe9" };
  if (name.includes("cucumber") || name.includes("zucchini")) return { name: "leaf", color: "#66bb6a", bg: "#e8f5e9" };
  if (name.includes("eggplant")) return { name: "food-drumstick", color: "#7e57c2", bg: "#ede7f6" };
  if (name.includes("cabbage")) return { name: "leaf", color: "#81c784", bg: "#e8f5e9" };

  // Proteins
  if (name.includes("chicken")) return { name: "food-drumstick", color: "#ffb74d", bg: "#fff8e1" };
  if (name.includes("beef") || name.includes("steak")) return { name: "food-steak", color: "#d32f2f", bg: "#ffebee" };
  if (name.includes("pork") || name.includes("bacon") || name.includes("ham")) return { name: "pig", color: "#f48fb1", bg: "#fce4ec" };
  if (name.includes("fish") || name.includes("salmon") || name.includes("tuna")) return { name: "fish", color: "#29b6f6", bg: "#e1f5fe" };
  if (name.includes("shrimp") || name.includes("prawn") || name.includes("seafood")) return { name: "fish", color: "#ff7043", bg: "#fbe9e7" };
  if (name.includes("egg")) return { name: "egg", color: "#ffc107", bg: "#fff8e1" };
  if (name.includes("tofu") || name.includes("soy")) return { name: "cube-outline", color: "#fff9c4", bg: "#fffde7" };

  // Dairy
  if (name.includes("milk")) return { name: "cup", color: "#e3f2fd", bg: "#e3f2fd" };
  if (name.includes("cheese")) return { name: "cheese", color: "#ffc107", bg: "#fff8e1" };
  if (name.includes("butter")) return { name: "cube", color: "#ffe082", bg: "#fff8e1" };
  if (name.includes("yogurt") || name.includes("cream")) return { name: "cup", color: "#f5f5f5", bg: "#fafafa" };

  // Grains & Carbs
  if (name.includes("bread") || name.includes("toast")) return { name: "bread-slice", color: "#d7a86e", bg: "#fff8e1" };
  if (name.includes("rice")) return { name: "rice", color: "#f5f5f5", bg: "#fafafa" };
  if (name.includes("pasta") || name.includes("noodle") || name.includes("spaghetti")) return { name: "pasta", color: "#ffcc80", bg: "#fff3e0" };
  if (name.includes("cereal") || name.includes("oat")) return { name: "barley", color: "#bcaaa4", bg: "#efebe9" };

  // Beverages & Liquids
  if (name.includes("coffee")) return { name: "coffee", color: "#6d4c41", bg: "#efebe9" };
  if (name.includes("tea")) return { name: "tea", color: "#a5d6a7", bg: "#e8f5e9" };
  if (name.includes("juice") || name.includes("water")) return { name: "cup-water", color: "#4fc3f7", bg: "#e1f5fe" };
  if (name.includes("wine")) return { name: "glass-wine", color: "#c62828", bg: "#ffebee" };
  if (name.includes("beer")) return { name: "beer", color: "#ffb74d", bg: "#fff8e1" };

  // Condiments & Sauces
  if (name.includes("sauce") || name.includes("ketchup")) return { name: "bottle-soda", color: "#e53935", bg: "#ffebee" };
  if (name.includes("oil") || name.includes("olive")) return { name: "bottle-tonic", color: "#c0ca33", bg: "#f9fbe7" };
  if (name.includes("honey")) return { name: "beehive-outline", color: "#ffb300", bg: "#fff8e1" };
  if (name.includes("sugar")) return { name: "cube-outline", color: "#f5f5f5", bg: "#fafafa" };
  if (name.includes("salt") || name.includes("spice") || name.includes("herb")) return { name: "shaker", color: "#90a4ae", bg: "#eceff1" };

  // Nuts & Seeds
  if (name.includes("nut") || name.includes("almond") || name.includes("walnut") || name.includes("peanut"))
    return { name: "peanut", color: "#8d6e63", bg: "#efebe9" };

  // Canned & Packaged
  if (name.includes("can") || name.includes("bean")) return { name: "food-variant", color: "#78909c", bg: "#eceff1" };

  // Default
  return { name: "food-apple-outline", color: "#1A1A1A", bg: "#F5F5F3" };
}

type Props = NativeStackScreenProps<RootStackParamList, "Inventory">;

export default function InventoryScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastImage, setLastImage] = useState<{ uri: string; timestamp: number } | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadInventory();
    loadLastImage();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  async function loadLastImage() {
    try {
      const stored = await AsyncStorage.getItem(LAST_INGREDIENT_IMAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only show if less than 7 days old
        if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
          setLastImage(parsed);
        }
      }
    } catch (err) {
      console.log("Failed to load last image");
    }
  }

  async function loadInventory() {
    try {
      const res = await getUserInventory();
      if (res.success) {
        setItems(res.items);
      }
    } catch (err) {
      console.error("Failed to load inventory");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInventory();
  }, []);

  function renderItem({ item }: { item: InventoryItem }) {
    const isLow = item.quant <= 1 && item.quant > 0;
    const isEmpty = item.quant === 0;
    const iconInfo = getIngredientIcon(item.ingredientName);

    return (
      <Animated.View
        style={[
          styles.itemCard,
          { backgroundColor: isEmpty ? theme.colors.background : theme.colors.card },
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            }],
          },
        ]}
      >
        <View style={[styles.itemIcon, { backgroundColor: isEmpty ? theme.colors.inputBg : iconInfo.bg }]}>
          <MaterialCommunityIcons
            name={iconInfo.name}
            size={22}
            color={isEmpty ? theme.colors.textMuted : iconInfo.color}
          />
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, isEmpty && styles.itemNameEmpty, { color: isEmpty ? theme.colors.textMuted : theme.colors.text }]}>
            {item.ingredientName}
          </Text>
          {item.isExpired && (
            <View style={styles.expiredBadge}>
              <Ionicons name="warning" size={12} color={theme.colors.warning} />
              <Text style={[styles.expiredText, { color: theme.colors.warning }]}>Expired</Text>
            </View>
          )}
        </View>
        <View style={styles.itemQty}>
          <Text
            style={[
              styles.qtyText,
              { color: isEmpty ? theme.colors.border : isLow ? theme.colors.warning : theme.colors.text },
            ]}
          >
            {item.quant}
          </Text>
          <Text style={[styles.unitText, { color: theme.colors.textMuted }]}>{item.unit}</Text>
        </View>
      </Animated.View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.text} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading inventory...</Text>
      </View>
    );
  }

  const activeItems = items.filter((i) => i.quant > 0);
  const emptyItems = items.filter((i) => i.quant === 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Summary Header */}
      <View style={[styles.summary, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: theme.colors.successLight }]}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
          </View>
          <View>
            <Text style={[styles.summaryNumber, { color: theme.colors.text }]}>{activeItems.length}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Available</Text>
          </View>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: theme.colors.inputBg }]}>
            <Ionicons name="close-circle-outline" size={20} color={theme.colors.textMuted} />
          </View>
          <View>
            <Text style={[styles.summaryNumber, { color: theme.colors.text }]}>{emptyItems.length}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Out of stock</Text>
          </View>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.inputBg }]}>
            <MaterialCommunityIcons name="fridge-outline" size={64} color={theme.colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Nothing in your pantry yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
            Photograph your ingredients to start tracking what you have.
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.buttonPrimary }]}
            onPress={() => navigation.navigate("Capture")}
          >
            <Ionicons name="camera" size={20} color={theme.colors.buttonPrimaryText} />
            <Text style={[styles.addButtonText, { color: theme.colors.buttonPrimaryText }]}>Scan Ingredients</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[...activeItems, ...emptyItems]}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            lastImage ? (
              <View style={[styles.lastImageContainer, { backgroundColor: theme.colors.card }]}>
                <View style={[styles.lastImageHeader, { borderBottomColor: theme.colors.border }]}>
                  <Ionicons name="image" size={18} color={theme.colors.text} />
                  <Text style={[styles.lastImageTitle, { color: theme.colors.text }]}>Recent Scan</Text>
                  <Text style={[styles.lastImageTime, { color: theme.colors.textMuted }]}>
                    {formatTimeAgo(lastImage.timestamp)}
                  </Text>
                </View>
                <Image
                  source={{ uri: lastImage.uri }}
                  style={styles.lastImage}
                  resizeMode="cover"
                />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.text}
            />
          }
        />
      )}

      {/* Bottom Action */}
      <View style={[styles.bottomAction, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.captureButton, { backgroundColor: theme.colors.buttonPrimary }]}
          onPress={() => navigation.navigate("Capture")}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={20} color={theme.colors.buttonPrimaryText} />
          <Text style={[styles.captureButtonText, { color: theme.colors.buttonPrimaryText }]}>Scan More Ingredients</Text>
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
    padding: spacing.xxxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxxl,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: "700",
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  itemCard: {
    borderRadius: radii.lg,
    padding: spacing.md + 2,
    marginBottom: spacing.sm + 2,
    flexDirection: "row",
    alignItems: "center",
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  itemNameEmpty: {
    textDecorationLine: "line-through",
  },
  expiredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  expiredText: {
    fontSize: 11,
    fontWeight: "500",
  },
  itemQty: {
    alignItems: "flex-end",
  },
  qtyText: {
    fontSize: 20,
    fontWeight: "700",
  },
  unitText: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: radii.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    marginBottom: 28,
    textAlign: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.lg,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  bottomAction: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
  },
  captureButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  lastImageContainer: {
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  lastImageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  lastImageTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  lastImageTime: {
    fontSize: 12,
  },
  lastImage: {
    width: "100%",
    height: 160,
  },
});
