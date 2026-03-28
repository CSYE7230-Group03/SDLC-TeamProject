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
import { useAppTheme } from "../theme/ThemeProvider";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeDetail">;

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const { theme } = useAppTheme();
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
      const result = await markRecipeAsCooked(recipe.ingredients || []);
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Recipe Image */}
        {recipe.image ? (
          <Image source={{ uri: recipe.image }} style={[styles.image, { backgroundColor: theme.colors.border }]} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: theme.colors.border }]}>
            <Ionicons name="restaurant" size={48} color={theme.colors.textMuted} />
          </View>
        )}

        <Animated.View
          style={[
            styles.content,
            { backgroundColor: theme.colors.card },
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.text }]}>{recipe.title}</Text>

          {/* Meta Info */}
          <View style={styles.metaRow}>
            {recipe.readyInMinutes && (
              <View style={[styles.metaChip, { backgroundColor: theme.colors.inputBg }]}>
                <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.metaText, { color: theme.colors.text }]}>{recipe.readyInMinutes} min</Text>
              </View>
            )}
            {recipe.servings && (
              <View style={[styles.metaChip, { backgroundColor: theme.colors.inputBg }]}>
                <Ionicons name="people-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.metaText, { color: theme.colors.text }]}>{recipe.servings} servings</Text>
              </View>
            )}
          </View>

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="food-apple-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Ingredients</Text>
              </View>
              {recipe.ingredients.map((ing, idx) => (
                <View key={idx} style={[styles.ingredientRow, { borderBottomColor: theme.colors.border }]}>
                  <View style={[styles.ingredientDot, { backgroundColor: theme.colors.accent }]} />
                  <Text style={[styles.ingredientText, { color: theme.colors.textSecondary }]}>
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
                <Ionicons name="list" size={20} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Instructions</Text>
              </View>
              {recipe.instructions.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View style={[styles.stepNumber, { backgroundColor: theme.colors.buttonPrimary }]}>
                    <Text style={styles.stepNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: theme.colors.textSecondary }]}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={[styles.bottomAction, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.cookButton, { backgroundColor: theme.colors.buttonPrimary, shadowColor: theme.colors.buttonPrimary }]}
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
  },
  image: {
    width: "100%",
    height: 280,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 14,
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
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ingredientText: {
    fontSize: 15,
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
    lineHeight: 22,
  },
  bottomAction: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  cookButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
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
