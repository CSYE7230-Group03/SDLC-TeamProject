import React, { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Alert, Linking, TextInput, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { searchWalmartProducts, WalmartProduct } from "../services/api";

type Props = NativeStackScreenProps<RootStackParamList, "Cart">;

const PRIMARY = "#2d6a4f";
const CARD_BG = "#ffffff";
const TEXT_DARK = "#1a1a1a";
const TEXT_MID = "#666666";
const CART_KEY = "replate_grocery_cart";

interface CartItem {
  ingredientName: string;
  productName: string;
  price: number;
  image: string;
  url: string;
  quantity: number;
  addedAt: string;
}

export default function CartScreen({ navigation }: Props) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WalmartProduct[]>([]);
  const [searching, setSearching] = useState(false);

  useFocusEffect(useCallback(() => {
    loadCart();
  }, []));

  async function loadCart() {
    const data = await AsyncStorage.getItem(CART_KEY);
    setItems(data ? JSON.parse(data) : []);
  }

  async function updateQuantity(index: number, delta: number) {
    const updated = [...items];
    updated[index].quantity = Math.max(1, (updated[index].quantity || 1) + delta);
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(updated));
    setItems(updated);
  }

  async function removeItem(index: number) {
    const updated = items.filter((_, i) => i !== index);
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(updated));
    setItems(updated);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await searchWalmartProducts(searchQuery.trim());
      if (res.success) setSearchResults(res.products);
    } catch (e) {
      Alert.alert("Error", "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function addSearchResult(product: WalmartProduct) {
    const newItem: CartItem = {
      ingredientName: product.name.split(",")[0],
      productName: product.name,
      price: product.price,
      image: product.image,
      url: `https://www.walmart.com/ip/${product.itemId}`,
      quantity: 1,
      addedAt: new Date().toISOString(),
    };
    const updated = [...items, newItem];
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(updated));
    setItems(updated);
    setSearchResults([]);
    setSearchQuery("");
    setShowSearch(false);
  }

  async function clearCart() {
    Alert.alert("Clear Cart", "Remove all items?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
        await AsyncStorage.removeItem(CART_KEY);
        setItems([]);
      }},
    ]);
  }

  const total = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        {items.length > 0 ? (
          <TouchableOpacity onPress={clearCart}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
      </View>

      {/* Search Bar - always visible */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={TEXT_MID} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for groceries on Walmart..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(""); setSearchResults([]); }}>
              <Ionicons name="close-circle" size={18} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
        {searching && <ActivityIndicator size="small" color={PRIMARY} style={{ marginTop: 8 }} />}
        {searchResults.map((product, i) => (
          <TouchableOpacity
            key={i}
            style={styles.searchResult}
            onPress={() => addSearchResult(product)}
            activeOpacity={0.7}
          >
            {product.image ? (
              <Image source={{ uri: product.image }} style={styles.searchResultImage} />
            ) : (
              <View style={[styles.searchResultImage, styles.placeholder]}>
                <Ionicons name="bag-outline" size={16} color="#ccc" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.searchResultName} numberOfLines={2}>{product.name}</Text>
              <Text style={styles.searchResultPrice}>${product.price?.toFixed(2)}</Text>
            </View>
            <Ionicons name="add-circle" size={24} color={PRIMARY} />
          </TouchableOpacity>
        ))}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {items.map((item, i) => (
              <View key={i} style={styles.itemCard}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.placeholder]}>
                    <Ionicons name="bag-outline" size={20} color="#ccc" />
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.ingredientName}>{item.ingredientName}</Text>
                  <Text style={styles.productName} numberOfLines={2}>{item.productName}</Text>
                  <View style={styles.priceQtyRow}>
                    <Text style={styles.price}>${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</Text>
                    <View style={styles.qtyControl}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(i, -1)}>
                        <Ionicons name="remove" size={14} color={TEXT_DARK} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity || 1}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(i, 1)}>
                        <Ionicons name="add" size={14} color={TEXT_DARK} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity onPress={() => Linking.openURL(item.url)}>
                    <Ionicons name="open-outline" size={18} color={TEXT_MID} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeItem(i)}>
                    <Ionicons name="trash-outline" size={18} color="#f44336" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={{ height: 80 }} />
          </ScrollView>
          <View style={styles.bottomBar}>
            <View>
              <Text style={styles.bottomCount}>{items.length} items</Text>
              <Text style={styles.bottomTotal}>${total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.shopBtn} onPress={() => {
              if (items[0]?.url) Linking.openURL("https://www.walmart.com");
            }}>
              <Text style={styles.shopBtnText}>Shop on Walmart</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8faf9" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: CARD_BG, borderBottomWidth: 1, borderBottomColor: "#eee",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: TEXT_DARK },
  clearText: { fontSize: 14, color: "#f44336", fontWeight: "500" },
  searchContainer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: CARD_BG, borderBottomWidth: 1, borderBottomColor: "#eee", paddingBottom: 12 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: TEXT_DARK, paddingVertical: 0 },
  searchResult: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", gap: 10 },
  searchResultImage: { width: 40, height: 40, borderRadius: 6 },
  searchResultName: { fontSize: 13, color: TEXT_DARK, lineHeight: 17 },
  searchResultPrice: { fontSize: 13, fontWeight: "700", color: TEXT_DARK, marginTop: 2 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 16, color: "#999" },
  itemCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: CARD_BG,
    borderRadius: 12, padding: 12, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  itemImage: { width: 50, height: 50, borderRadius: 8, marginRight: 10 },
  placeholder: { backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center" },
  itemInfo: { flex: 1 },
  ingredientName: { fontSize: 12, color: PRIMARY, fontWeight: "600" },
  productName: { fontSize: 13, color: TEXT_DARK, lineHeight: 17 },
  price: { fontSize: 14, fontWeight: "700", color: TEXT_DARK, marginTop: 2 },
  priceQtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f5f5f5", borderRadius: 8, paddingHorizontal: 4, paddingVertical: 2 },
  qtyBtn: { width: 26, height: 26, borderRadius: 6, backgroundColor: "#e8e8e8", justifyContent: "center", alignItems: "center" },
  qtyText: { fontSize: 14, fontWeight: "600", color: TEXT_DARK, minWidth: 20, textAlign: "center" },
  itemActions: { gap: 12, alignItems: "center" },
  bottomBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: CARD_BG, borderTopWidth: 1, borderTopColor: "#eee",
  },
  bottomCount: { fontSize: 13, color: TEXT_MID },
  bottomTotal: { fontSize: 20, fontWeight: "700", color: TEXT_DARK },
  shopBtn: {
    backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12,
  },
  shopBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
