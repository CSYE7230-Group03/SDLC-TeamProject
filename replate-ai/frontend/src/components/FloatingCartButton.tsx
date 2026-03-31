import React, { useState, useCallback } from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const CART_KEY = "replate_grocery_cart";

export default function FloatingCartButton() {
  const navigation = useNavigation<any>();
  const [count, setCount] = useState(0);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem(CART_KEY).then((data) => {
      const items = data ? JSON.parse(data) : [];
      setCount(items.length);
    });
  }, []));

  if (count === 0) return null;

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => navigation.navigate("Cart")}
      activeOpacity={0.8}
    >
      <Ionicons name="cart" size={22} color="#fff" />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2d6a4f",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#f44336",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
