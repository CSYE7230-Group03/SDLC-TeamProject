import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { detectIngredients, clearSession } from "../services/api";

type Props = NativeStackScreenProps<RootStackParamList, "Capture">;

export default function CapturePhotoScreen({ navigation }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need camera roll permissions to proceed"
      );
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
        navigation.navigate("IngredientReview", {
          detectedIngredients: response.ingredients,
        });
      } else {
        Alert.alert(
          "No Ingredients",
          response.error || "Could not detect ingredients in the image"
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to detect ingredients. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Capture Ingredients</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await clearSession();
            navigation.replace("Login");
          }}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>
        Take a photo or pick an image of your ingredients
      </Text>

      <View style={styles.photoArea}>
        {selectedImage ? (
          <Image
            source={{ uri: selectedImage }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No image selected</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={openCamera}
          disabled={loading}
        >
          <Text style={styles.buttonText}>📷 Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={pickImage}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🖼️ Pick from Gallery</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.detectButton, !selectedImage && styles.detectButtonDisabled]}
        onPress={handleDetectIngredients}
        disabled={!selectedImage || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.detectButtonText}>
            Detect Ingredients
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  logoutText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  photoArea: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 24,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: "#999",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  detectButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 24,
  },
  detectButtonDisabled: {
    backgroundColor: "#A5D6A7",
  },
  detectButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
