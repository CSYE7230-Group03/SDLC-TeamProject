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
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabScreenProps, useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { TabParamList } from "../navigation/AppNavigator";
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
  const n = ingredientName.toLowerCase();

  if (/apple|banana|orange|grape|berr|cherry|pineapple|lemon|lime|avocado|mango|melon|peach|pear|citrus/.test(n))
    return { name: "fruit-watermelon", color: "#e53935", bg: "#ffebee" };
  if (/tomato|carrot|broccoli|spinach|lettuce|kale|cabbage|cucumber|zucchini|pepper|chili|onion|garlic|mushroom|eggplant|corn|potato/.test(n))
    return { name: "carrot", color: "#43a047", bg: "#e8f5e9" };
  if (/chicken|beef|pork|bacon|ham|steak|lamb|turkey|meat/.test(n))
    return { name: "food-steak", color: "#d32f2f", bg: "#ffebee" };
  if (/fish|salmon|tuna|shrimp|prawn|seafood|cod|tilapia/.test(n))
    return { name: "fish", color: "#29b6f6", bg: "#e1f5fe" };
  if (/egg|milk|cheese|butter|yogurt|cream/.test(n))
    return { name: "egg", color: "#ffc107", bg: "#fff8e1" };
  if (/bread|rice|pasta|noodle|spaghetti|flour|cereal|oat|grain/.test(n))
    return { name: "bread-slice", color: "#d7a86e", bg: "#fff8e1" };
  if (/oil|olive|sauce|ketchup|honey|vinegar|soy|mustard|sugar|salt|spice|herb/.test(n))
    return { name: "bottle-tonic", color: "#c0ca33", bg: "#f9fbe7" };
  if (/coffee|tea|juice|water|wine|beer/.test(n))
    return { name: "cup-water", color: "#4fc3f7", bg: "#e1f5fe" };
  if (/nut|almond|walnut|peanut|cashew|pistachio|bean|lentil/.test(n))
    return { name: "peanut", color: "#8d6e63", bg: "#efebe9" };

  return { name: "food-apple-outline", color: "#888888", bg: "#F5F5F3" };
}

type Props = BottomTabScreenProps<TabParamList, "Inventory">;

export default function InventoryScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const tabBarHeight = useBottomTabBarHeight();
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
        <View style={[styles.itemIcon, { backgroundColor: isEmpty ? theme.colors.inputBg : (theme.mode === "dark" ? theme.colors.inputBg : iconInfo.bg) }]}>
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={["top"]}>
        <View style={[styles.centered, { backgroundColor: theme.colors.background, flex: 1 }]}>
          <ActivityIndicator size="large" color={theme.colors.text} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading inventory...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeItems = items.filter((i) => i.quant > 0);
  const emptyItems = items.filter((i) => i.quant === 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Summary Header */}
        <View style={[styles.summary, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: theme.colors.text }]}>{activeItems.length}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Available</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: theme.colors.textMuted }]}>{emptyItems.length}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Out of stock</Text>
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
            contentContainerStyle={[styles.list, { paddingBottom: 16 }]}
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

        {/* Bottom Action — sits above the tab bar */}
        <View style={[styles.bottomAction, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border, paddingBottom: tabBarHeight }]}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
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
    alignItems: "center",
    gap: spacing.xs,
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
