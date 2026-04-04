import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Checkout">;

const WALMART_BLUE = "#0071dc";
const CART_KEY = "replate_grocery_cart";

interface CartItem {
  ingredientName: string;
  productName: string;
  price: number;
  image: string;
  url: string;
  quantity: number;
}

export default function CheckoutScreen({ navigation, route }: Props) {
  const cartItems: CartItem[] = route.params?.items || [];
  const [placing, setPlacing] = useState(false);
  const [ordered, setOrdered] = useState(false);

  const subtotal = cartItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  async function handlePlaceOrder() {
    setPlacing(true);
    // Simulate processing
    await new Promise((r) => setTimeout(r, 2000));
    await AsyncStorage.removeItem(CART_KEY);
    setPlacing(false);
    setOrdered(true);
  }

  if (ordered) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#4caf50" />
          </View>
          <Text style={styles.successTitle}>Order Placed!</Text>
          <Text style={styles.successSubtitle}>
            Your groceries are on the way.{"\n"}Estimated delivery: 2-3 hours
          </Text>
          <Text style={styles.successOrderId}>
            Order #WMT-{Math.random().toString(36).slice(2, 8).toUpperCase()}
          </Text>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.popToTop()}
          >
            <Text style={styles.doneBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Walmart-style header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerLogo}>
          <Ionicons name="storefront" size={20} color="#ffc220" />
          <Text style={styles.headerTitle}>Walmart</Text>
        </View>
        <Text style={styles.headerSub}>Checkout</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Delivery info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={18} color={WALMART_BLUE} />
            <Text style={styles.sectionTitle}>Delivery address</Text>
          </View>
          <Text style={styles.addressText}>123 Main Street, Boston, MA 02115</Text>
          <Text style={styles.deliveryTime}>
            <Ionicons name="time-outline" size={14} color="#4caf50" /> Est. delivery: Today, 2-3 hrs
          </Text>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({cartItems.length})</Text>
          {cartItems.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, { backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" }]}>
                  <Ionicons name="bag-outline" size={16} color="#999" />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                <Text style={styles.itemQty}>Qty: {item.quantity || 1}</Text>
              </View>
              <Text style={styles.itemPrice}>${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={18} color={WALMART_BLUE} />
            <Text style={styles.sectionTitle}>Payment method</Text>
          </View>
          <View style={styles.paymentCard}>
            <Ionicons name="card-outline" size={24} color="#333" />
            <Text style={styles.paymentText}>•••• •••• •••• 4242</Text>
            <Text style={styles.paymentBrand}>Visa</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated tax</Text>
            <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={[styles.summaryValue, { color: "#4caf50" }]}>FREE</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Place Order button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.placeOrderBtn, placing && { opacity: 0.7 }]}
          onPress={handlePlaceOrder}
          disabled={placing}
        >
          {placing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order · ${total.toFixed(2)}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    backgroundColor: WALMART_BLUE, paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { marginBottom: 8 },
  headerLogo: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  container: { flex: 1 },
  section: {
    backgroundColor: "#fff", marginTop: 8, padding: 16,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#1a1a1a", marginBottom: 8 },
  addressText: { fontSize: 14, color: "#333", marginBottom: 4 },
  deliveryTime: { fontSize: 13, color: "#4caf50", marginTop: 4 },
  itemRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  itemImage: { width: 50, height: 50, borderRadius: 6, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, color: "#333", lineHeight: 17 },
  itemQty: { fontSize: 12, color: "#999", marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  paymentCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#f8f8f8", padding: 14, borderRadius: 10,
  },
  paymentText: { flex: 1, fontSize: 15, color: "#333" },
  paymentBrand: { fontSize: 13, fontWeight: "600", color: WALMART_BLUE },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  summaryLabel: { fontSize: 14, color: "#666" },
  summaryValue: { fontSize: 14, color: "#1a1a1a" },
  totalRow: { borderTopWidth: 1, borderTopColor: "#eee", marginTop: 8, paddingTop: 12 },
  totalLabel: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  totalValue: { fontSize: 20, fontWeight: "700", color: WALMART_BLUE },
  bottomBar: {
    padding: 16, backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#eee",
  },
  placeOrderBtn: {
    backgroundColor: WALMART_BLUE, paddingVertical: 16, borderRadius: 999,
    alignItems: "center",
  },
  placeOrderText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  // Success
  successContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  successIcon: { marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 },
  successSubtitle: { fontSize: 15, color: "#666", textAlign: "center", lineHeight: 22 },
  successOrderId: { fontSize: 13, color: "#999", marginTop: 16, fontFamily: "monospace" },
  doneBtn: {
    marginTop: 32, backgroundColor: WALMART_BLUE,
    paddingHorizontal: 40, paddingVertical: 14, borderRadius: 999,
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
