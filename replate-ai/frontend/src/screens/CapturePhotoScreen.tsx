import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/AppNavigator";
import { detectIngredients } from "../services/api";
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Capture">;

const LAST_INGREDIENT_IMAGE_KEY = "replate_last_ingredient_image";

export default function CapturePhotoScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need camera roll permissions to proceed");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  }

  async function openCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need camera permissions to proceed");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  }

  async function handleDetectIngredients() {
    if (!selectedImage) {
      Alert.alert("No Image", "Please select or take a photo first");
      return;
    }

    setLoading(true);
    try {
      const response = await detectIngredients(selectedImage);
      if (response.success && response.ingredients.length > 0) {
        // Save the image for inventory screen
        await AsyncStorage.setItem(LAST_INGREDIENT_IMAGE_KEY, JSON.stringify({
          uri: selectedImage,
          timestamp: Date.now(),
        }));

        navigation.navigate("IngredientReview", {
          detectedIngredients: response.ingredients,
          imageUri: selectedImage,
        });
      } else {
        Alert.alert("No Ingredients", response.error || "Could not detect ingredients in the image");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to detect ingredients. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Instructions */}
      <Animated.View style={[styles.instructionCard, { opacity: fadeAnim, backgroundColor: theme.colors.accentLight }]}>
        <Ionicons name="information-circle" size={20} color={theme.colors.accent} />
        <Text style={[styles.instructionText, { color: theme.colors.accent }]}>
          Take a clear photo of your ingredients for best results
        </Text>
      </Animated.View>

      {/* Photo Area */}
      <Animated.View
        style={[
          styles.photoArea,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {selectedImage ? (
          <Image source={{ uri: selectedImage }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <View style={[styles.placeholderIcon, { backgroundColor: theme.colors.inputBg }]}>
              <Ionicons name="image-outline" size={48} color={theme.colors.textMuted} />
            </View>
            <Text style={[styles.placeholderTitle, { color: theme.colors.text }]}>No image selected</Text>
            <Text style={[styles.placeholderSubtitle, { color: theme.colors.textMuted }]}>
              Take a photo or choose from gallery
            </Text>
          </View>
        )}

        {selectedImage && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close-circle" size={28} color="rgba(0,0,0,0.6)" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.card }]}
          onPress={openCamera}
          disabled={loading}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconBg, { backgroundColor: theme.mode === "dark" ? theme.colors.inputBg : "#E8F0FE" }]}>
            <Ionicons name="camera" size={24} color="#1976d2" />
          </View>
          <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.card }]}
          onPress={pickImage}
          disabled={loading}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconBg, { backgroundColor: theme.mode === "dark" ? theme.colors.inputBg : "#F3E8FF" }]}>
            <Ionicons name="images" size={24} color="#7b1fa2" />
          </View>
          <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Gallery</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Detect Button */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          style={[
            styles.detectButton,
            { backgroundColor: !selectedImage ? theme.colors.border : theme.colors.buttonPrimary },
          ]}
          onPress={handleDetectIngredients}
          disabled={!selectedImage || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.detectButtonText}>Analyzing...</Text>
            </View>
          ) : (
            <View style={styles.detectButtonContent}>
              <MaterialCommunityIcons name="food-apple" size={22} color="#fff" />
              <Text style={styles.detectButtonText}>Detect Ingredients</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  instructionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  photoArea: {
    flex: 1,
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderStyle: "dashed",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  placeholderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  placeholderSubtitle: {
    fontSize: 13,
  },
  clearButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 14,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  detectButton: {
    paddingVertical: 18,
    borderRadius: 14,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  detectButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  detectButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
});
