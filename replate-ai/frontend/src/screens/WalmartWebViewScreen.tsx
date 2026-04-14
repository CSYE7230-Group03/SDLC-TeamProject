import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "WalmartWebView">;

export default function WalmartWebViewScreen({ navigation, route }: Props) {
  const [loading, setLoading] = useState(true);
  const url = route.params?.url || "https://www.walmart.com";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Walmart</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color="#2d6a4f" />
        </View>
      )}
      <WebView
        source={{ uri: url }}
        onLoadEnd={() => setLoading(false)}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  loadingBar: { alignItems: "center", paddingVertical: 4, backgroundColor: "#f8faf9" },
});
