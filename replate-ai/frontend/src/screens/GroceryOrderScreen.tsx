import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { generateGroceryOrder, GroceryOrderItem } from "../services/api";

type Props = NativeStackScreenProps<RootStackParamList, "GroceryOrder">;

const PRIMARY = "#2d6a4f";
const BG = "#f8faf9";
const CARD_BG = "#ffffff";
const TEXT_DARK = "#1a1a1a";
const TEXT_MID = "#666666";
const TEXT_LIGHT = "#999999";
const CART_KEY = "replate_grocery_cart";

export default function GroceryOrderScreen({ navigation, route }: Props) {
  const [loading, setLoading] = useState(true);
  const [orderItems, setOrderItems] = useState<GroceryOrderItem[]>([]);
  const [notFound, setNotFound] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Map<number, number>>(new Map());
  const [error, setError] = useState("");

  const ingredients = route.params?.ingredients;

  useEffect(() => { loadOrder(); }, []);

  useEffect(() => {
    if (orderItems.length > 0) {
      setSelected(new Set(orderItems.map((_, i) => i)));
      const qMap = new Map<number, number>();
      orderItems.forEach((_, i) => qMap.set(i, 1));
      setQuantities(qMap);
    }
  }, [orderItems]);

  const selectedTotal = useMemo(() => {
    let total = 0;
    selected.forEach((i) => {
      const qty = quantities.get(i) || 1;
      total += (orderItems[i]?.product?.price || 0) * qty;
    });
    return Math.round(total * 100) / 100;
  }, [selected, orderItems, quantities]);

  async function loadOrder() {
    setLoading(true);
    setError("");
    try {
      if (!ingredients || ingredients.length === 0) {
        setError("No ingredients to order");
        setLoading(false);
        return;
      }
      const res = await generateGroceryOrder(ingredients);
      if (res.success && res.order) {
        setOrderItems(res.order.orderItems);
        setNotFound(res.order.notFound);
      } else {
        setError(res.error || "Failed to generate order");
      }
    } catch (e) {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function changeQty(index: number, delta: number) {
    setQuantities((prev) => {
      const next = new Map(prev);
      const current = next.get(index) || 1;
      const newQty = Math.max(1, current + delta);
      next.set(index, newQty);
      return next;
    });
  }

  async function handleAddToCart() {
    const cartItems = orderItems
      .filter((_, i) => selected.has(i))
      .map((item, idx) => {
        const originalIdx = orderItems.indexOf(item);
        return {
          ingredientName: item.ingredient.originalName,
          productName: item.product.productName,
          price: item.product.price,
          image: item.product.image,
          url: item.product.url,
          quantity: quantities.get(originalIdx) || 1,
          addedAt: new Date().toISOString(),
        };
      });

    try {
      const existing = await AsyncStorage.getItem(CART_KEY);
      const cart = existing ? JSON.parse(existing) : [];
      cart.push(...cartItems);
      await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
      Alert.alert(
        "Added to Cart",
        `${cartItems.length} item${cartItems.length > 1 ? "s" : ""} added to your grocery cart`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert("Error", "Failed to save cart");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Grocery Order</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Finding items on Walmart...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadOrder}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Provider */}
            <View style={styles.providerBadge}>
              <MaterialCommunityIcons name="store" size={20} color={PRIMARY} />
              <Text style={styles.providerText}>Walmart</Text>
            </View>

            {/* Out of Stock Items (fixed summary) */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Out of Stock Items</Text>
              {orderItems.map((item, i) => (
                <View key={i} style={styles.outOfStockRow}>
                  <Ionicons name="ellipse" size={6} color="#f44336" />
                  <Text style={styles.outOfStockName}>{item.ingredient.originalName}</Text>
                </View>
              ))}
              {notFound.map((item, i) => (
                <View key={`nf-${i}`} style={styles.outOfStockRow}>
                  <Ionicons name="close-circle" size={14} color={TEXT_LIGHT} />
                  <Text style={[styles.outOfStockName, { color: TEXT_LIGHT, textDecorationLine: "line-through" }]}>
                    {item.originalName || item.canonicalName} (not found)
                  </Text>
                </View>
              ))}
            </View>

            {/* Walmart Products - selectable */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Walmart Products</Text>
              <TouchableOpacity
                onPress={() => {
                  if (selected.size === orderItems.length) setSelected(new Set());
                  else setSelected(new Set(orderItems.map((_, i) => i)));
                }}
              >
                <Text style={styles.selectAllText}>
                  {selected.size === orderItems.length ? "Deselect All" : "Select All"}
                </Text>
              </TouchableOpacity>
            </View>

            {orderItems.map((item, index) => {
              const isSelected = selected.has(index);
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.itemCard, !isSelected && styles.itemCardDeselected]}
                  onPress={() => toggleItem(index)}
                  activeOpacity={0.7}
                >
                  <TouchableOpacity
                    style={[styles.checkbox, isSelected && styles.checkboxSelected]}
                    onPress={() => toggleItem(index)}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </TouchableOpacity>
                  {item.product.image ? (
                    <Image source={{ uri: item.product.image }} style={styles.itemImage} />
                  ) : (
                    <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                      <Ionicons name="cart-outline" size={20} color={TEXT_LIGHT} />
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.ingredientName}>{item.ingredient.originalName}</Text>
                    <Text style={styles.productName} numberOfLines={2}>{item.product.productName}</Text>
                    <View style={styles.priceQtyRow}>
                      <Text style={styles.itemPrice}>${((item.product.price || 0) * (quantities.get(index) || 1)).toFixed(2)}</Text>
                      <View style={styles.qtyControl}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(index, -1)}>
                          <Ionicons name="remove" size={14} color={TEXT_DARK} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{quantities.get(index) || 1}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(index, 1)}>
                          <Ionicons name="add" size={14} color={TEXT_DARK} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => Linking.openURL(item.product.url)}>
                    <Ionicons name="open-outline" size={18} color={TEXT_LIGHT} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Bottom CTA */}
          <View style={styles.bottomBar}>
            <View style={styles.bottomInfo}>
              <Text style={styles.bottomCount}>{selected.size} items</Text>
              <Text style={styles.bottomTotal}>${selectedTotal.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.addCartBtn, selected.size === 0 && styles.addCartBtnDisabled]}
              onPress={handleAddToCart}
              disabled={selected.size === 0}
            >
              <Ionicons name="cart" size={18} color="#fff" />
              <Text style={styles.addCartText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: CARD_BG, borderBottomWidth: 1, borderBottomColor: "#eee",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: TEXT_DARK },
  container: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  loadingText: { fontSize: 15, color: TEXT_MID },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 20 },
  errorText: { fontSize: 15, color: TEXT_MID, textAlign: "center" },
  retryBtn: { backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: "#fff", fontWeight: "600" },
  providerBadge: {
    flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start",
    backgroundColor: "#e8f5e9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 16,
  },
  providerText: { fontSize: 14, fontWeight: "600", color: PRIMARY },
  summaryCard: {
    backgroundColor: CARD_BG, borderRadius: 14, padding: 16, marginTop: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  summaryTitle: { fontSize: 15, fontWeight: "600", color: TEXT_DARK, marginBottom: 10 },
  outOfStockRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  outOfStockName: { fontSize: 14, color: TEXT_DARK },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 24, marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: TEXT_DARK },
  selectAllText: { fontSize: 13, color: PRIMARY, fontWeight: "500" },
  itemCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: CARD_BG,
    borderRadius: 12, padding: 12, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  itemCardDeselected: { opacity: 0.5 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#ddd",
    justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  checkboxSelected: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  itemImage: { width: 50, height: 50, borderRadius: 8, marginRight: 10 },
  itemImagePlaceholder: { backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center" },
  itemInfo: { flex: 1 },
  ingredientName: { fontSize: 12, color: PRIMARY, fontWeight: "600", marginBottom: 1 },
  productName: { fontSize: 13, color: TEXT_DARK, lineHeight: 17 },
  itemPrice: { fontSize: 14, fontWeight: "700", color: TEXT_DARK, marginTop: 2 },
  priceQtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f5f5f5", borderRadius: 8, paddingHorizontal: 4, paddingVertical: 2 },
  qtyBtn: { width: 26, height: 26, borderRadius: 6, backgroundColor: "#e8e8e8", justifyContent: "center", alignItems: "center" },
  qtyText: { fontSize: 14, fontWeight: "600", color: TEXT_DARK, minWidth: 20, textAlign: "center" },
  bottomBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: CARD_BG, borderTopWidth: 1, borderTopColor: "#eee",
  },
  bottomInfo: { alignItems: "flex-start" },
  bottomCount: { fontSize: 13, color: TEXT_MID },
  bottomTotal: { fontSize: 20, fontWeight: "700", color: TEXT_DARK },
  addCartBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12,
  },
  addCartBtnDisabled: { backgroundColor: "#ccc" },
  addCartText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
