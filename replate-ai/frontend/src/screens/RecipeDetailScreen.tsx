import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/AppNavigator";
import { markRecipeAsCooked } from "../services/api";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeDetail">;

// Colors
const PRIMARY = "#2d6a4f";
const BG = "#f8faf9";
const CARD_BG = "#ffffff";
const TEXT_DARK = "#1a1a1a";
const TEXT_MID = "#666666";
const TEXT_LIGHT = "#999999";

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const { recipe } = route.params;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  async function handleStartCooking() {
    try {
      const result = await markRecipeAsCooked(recipe);
      if (result.success) {
        navigation.navigate("CookingComplete", {
          recipe: {
            title: recipe.title,
            image: recipe.image,
            ingredients: recipe.ingredients,
          },
          deducted: result.deducted || [],
          skipped: result.skipped || [],
        });
      } else {
        Alert.alert("Error", result.error || "Failed to update inventory");
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Recipe Image */}
        {recipe.image ? (
          <Image source={{ uri: recipe.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="restaurant" size={48} color={TEXT_LIGHT} />
          </View>
        )}

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Title */}
          <Text style={styles.title}>{recipe.title}</Text>

          {/* Meta Info */}
          <View style={styles.metaRow}>
            {recipe.readyInMinutes && (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={18} color={PRIMARY} />
                <Text style={styles.metaText}>{recipe.readyInMinutes} min</Text>
              </View>
            )}
            {recipe.servings && (
              <View style={styles.metaChip}>
                <Ionicons name="people-outline" size={18} color={PRIMARY} />
                <Text style={styles.metaText}>{recipe.servings} servings</Text>
              </View>
            )}
          </View>

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="food-apple-outline" size={20} color={PRIMARY} />
                <Text style={styles.sectionTitle}>Ingredients</Text>
              </View>
              {recipe.ingredients.map((ing, idx) => (
                <View key={idx} style={styles.ingredientRow}>
                  <View style={styles.ingredientDot} />
                  <Text style={styles.ingredientText}>
                    {ing.name}
                    {ing.amount ? ` — ${ing.amount}${ing.unit ? " " + ing.unit : ""}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Instructions */}
          {recipe.instructions && recipe.instructions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list" size={20} color={PRIMARY} />
                <Text style={styles.sectionTitle}>Instructions</Text>
              </View>
              {recipe.instructions.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <TouchableOpacity
          style={styles.cookButton}
          onPress={handleStartCooking}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="chef-hat" size={22} color="#fff" />
          <Text style={styles.cookButtonText}>Start Cooking</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  image: {
    width: "100%",
    height: 240,
    backgroundColor: "#e8e8e8",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    backgroundColor: CARD_BG,
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    minHeight: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 16,
    lineHeight: 30,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: "500",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY,
  },
  ingredientText: {
    fontSize: 15,
    color: TEXT_MID,
    flex: 1,
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: TEXT_MID,
    lineHeight: 22,
  },
  bottomAction: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: CARD_BG,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  cookButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cookButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
