import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  clearSession,
  getUserDisplayName,
  generateRecipes,
  Recipe,
  getUserInventory,
  getProfileAnalysis,
  ProfileAnalysis,
} from "../services/api";
import { useAppTheme } from "../theme/ThemeProvider";
import { spacing, radii } from "../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 64;

const CACHE_KEY_RECOMMENDATIONS = "replate_cached_recommendations";
const CACHE_KEY_INVENTORY_COUNT = "replate_cached_inventory_count";


export default function HomeScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const [userName, setUserName] = useState<string>("");
  const [recommendations, setRecommendations] = useState<Recipe[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [inventoryIngredients, setInventoryIngredients] = useState<string[]>([]);
  const [profileAnalysis, setProfileAnalysis] = useState<ProfileAnalysis | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Pantry staples that are always considered available
  const PANTRY_STAPLES = [
    "salt", "pepper", "water", "oil", "olive oil", "cooking oil", "vegetable oil",
    "butter", "garlic", "onion", "soy sauce", "ketchup", "mayonnaise", "mustard",
    "vinegar", "sugar", "honey", "lemon juice", "flour", "rice", "pasta", "spaghetti"
  ];

  // Calculate matching rate for a recipe
  function calculateMatchRate(recipe: Recipe): number {
    if (!recipe.ingredients || recipe.ingredients.length === 0) return 0;
    
    const availableSet = new Set([
      ...inventoryIngredients.map(i => i.toLowerCase()),
      ...PANTRY_STAPLES
    ]);
    
    let matched = 0;
    for (const ing of recipe.ingredients) {
      const ingName = ing.name.toLowerCase();
      // Check if any available ingredient matches (partial match)
      const isAvailable = Array.from(availableSet).some(avail => 
        ingName.includes(avail) || avail.includes(ingName)
      );
      if (isAvailable) matched++;
    }
    
    return Math.round((matched / recipe.ingredients.length) * 100);
  }

  // Sort recipes by match rate
  function getSortedRecommendations(): (Recipe & { matchRate: number })[] {
    return recommendations
      .map(recipe => ({
        ...recipe,
        matchRate: calculateMatchRate(recipe)
      }))
      .sort((a, b) => b.matchRate - a.matchRate);
  }

  // Load profile analysis
  async function loadProfileAnalysis() {
    if (inventoryCount === 0) return;
    
    setLoadingProfile(true);
    try {
      const res = await getProfileAnalysis();
      if (res.success && res.analysis) {
        setProfileAnalysis(res.analysis);
      }
    } catch (err) {
      console.log("Failed to load profile analysis");
    } finally {
      setLoadingProfile(false);
    }
  }

  useEffect(() => {
    loadCachedData();
    loadUserData();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
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

  // Auto-load profile when inventory is loaded
  useEffect(() => {
    if (inventoryCount > 0 && !profileAnalysis && !loadingProfile) {
      loadProfileAnalysis();
    }
  }, [inventoryCount]);

  useFocusEffect(
    useCallback(() => {
      loadCachedData();
      loadInventoryCount();
    }, [])
  );

  async function loadCachedData() {
    try {
      const [cachedRecs, cachedCount] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY_RECOMMENDATIONS),
        AsyncStorage.getItem(CACHE_KEY_INVENTORY_COUNT),
      ]);

      if (cachedRecs) {
        setRecommendations(JSON.parse(cachedRecs));
        setLoadingRecs(false);
      }

      if (cachedCount) {
        setInventoryCount(parseInt(cachedCount, 10));
      }
    } catch (err) {
      console.log("Failed to load cached data:", err);
    }
  }

  async function loadInventoryCount() {
    try {
      const invRes = await getUserInventory();
      if (invRes.success) {
        const activeItems = invRes.items.filter((i) => i.quant > 0);
        setInventoryCount(activeItems.length);
        setInventoryIngredients(activeItems.map(i => i.ingredientName));
        await AsyncStorage.setItem(CACHE_KEY_INVENTORY_COUNT, activeItems.length.toString());
      }
    } catch (err) {
      // ignore
    }
  }

  async function loadUserData() {
    try {
      const name = await getUserDisplayName();
      setUserName(name || "Chef");

      const invRes = await getUserInventory();
      if (invRes.success) {
        const activeItems = invRes.items.filter((i) => i.quant > 0);
        setInventoryCount(activeItems.length);
        setInventoryIngredients(activeItems.map(i => i.ingredientName));
        await AsyncStorage.setItem(CACHE_KEY_INVENTORY_COUNT, activeItems.length.toString());

        const ingredientNames = activeItems.map((i) => i.ingredientName);
        
        if (ingredientNames.length > 0) {
          // Preferences are loaded server-side from the user's profile.
          const recRes = await generateRecipes(ingredientNames, undefined, 3);
          if (recRes.success && recRes.recipes.length > 0) {
            setRecommendations(recRes.recipes);
            await AsyncStorage.setItem(CACHE_KEY_RECOMMENDATIONS, JSON.stringify(recRes.recipes));
          }
        } else {
          setRecommendations([]);
          await AsyncStorage.removeItem(CACHE_KEY_RECOMMENDATIONS);
        }
      }
    } catch (err) {
      console.error("Failed to load home data:", err);
    } finally {
      setLoadingRecs(false);
    }
  }

  function renderRecipeCard({ item }: { item: Recipe & { matchRate: number } }) {
    const matchColor = item.matchRate >= 80 ? theme.colors.success : item.matchRate >= 50 ? theme.colors.warning : theme.colors.danger;

    return (
      <TouchableOpacity
        style={[styles.recipeCard, { backgroundColor: theme.colors.card }]}
        onPress={() => {
          navigation.navigate("RecipeDetail", { recipe: item });
        }}
        activeOpacity={0.9}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.recipeImage} resizeMode="cover" />
        ) : (
          <View style={[styles.recipeImage, styles.recipeImagePlaceholder, { backgroundColor: theme.colors.inputBg }]}>
            <Ionicons name="restaurant-outline" size={40} color={theme.colors.textSecondary} />
          </View>
        )}

        <View style={styles.recipeOverlay}>
          <Text style={styles.recipeTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.recipeMetaRow}>
            {item.readyInMinutes && (
              <View style={styles.recipeTimeRow}>
                <Ionicons name="time-outline" size={14} color="#ddd" />
                <Text style={styles.recipeTime}>{item.readyInMinutes} min</Text>
              </View>
            )}
            <View style={[styles.matchIndicator, { backgroundColor: matchColor }]}>
              <Text style={styles.matchIndicatorText}>
                {item.matchRate >= 80 ? "Great match" : item.matchRate >= 50 ? "Good match" : "Some missing"}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.logoRow}>
          <MaterialCommunityIcons name="leaf" size={24} color={theme.colors.primary} />
          <Text style={[styles.logoText, { color: theme.colors.primary }]}>ReplateAI</Text>
        </View>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.colors.inputBg }]}
          onPress={async () => {
            await clearSession();
            navigation.replace("Login");
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
        {/* Greeting with Profile Badge */}
        <Animated.View
          style={[
            styles.greetingSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.greetingRow}>
            <View style={styles.greetingText}>
              <Text style={[styles.greeting, { color: theme.colors.textMuted }]}>Hello,</Text>
              <Text style={[styles.userName, { color: theme.colors.text }]}>{userName}!</Text>
            </View>
            
            {/* Compact Profile Badge */}
            {profileAnalysis ? (
              <TouchableOpacity
                style={styles.profileBadgeContainer}
                onPress={() => navigation.navigate("ProfileDetail", { analysis: profileAnalysis })}
                activeOpacity={0.7}
              >
                <View style={[styles.profileMini, { backgroundColor: theme.colors.card }]}>
                  <Text style={styles.profileMiniEmoji}>{profileAnalysis.emoji}</Text>
                  <View style={styles.profileMiniStats}>
                    <View style={styles.miniStatRow}>
                      <View style={[styles.miniDot, { backgroundColor: theme.colors.success }]} />
                      <Text style={[styles.miniStatText, { color: theme.colors.text }]}>{profileAnalysis.healthScore}/10</Text>
                    </View>
                    <Text style={[styles.miniStatLabel, { color: theme.colors.textMuted }]}>{profileAnalysis.dietType.split(" ")[0]}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                </View>
                <Text style={[styles.profileCta, { color: theme.colors.textSecondary }]}>View your food profile →</Text>
              </TouchableOpacity>
            ) : inventoryCount > 0 && !loadingProfile ? (
              <TouchableOpacity
                style={[styles.profileMiniEmpty, { backgroundColor: theme.colors.accentLight }]}
                onPress={loadProfileAnalysis}
                activeOpacity={0.7}
              >
                <Ionicons name="analytics-outline" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            ) : loadingProfile ? (
              <View style={[styles.profileMiniEmpty, { backgroundColor: theme.colors.accentLight }]}>
                <ActivityIndicator size="small" color={theme.colors.text} />
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* Recommended Recipes */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recommended for You</Text>
          </View>

          {loadingRecs ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.text} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Finding recipes...</Text>
            </View>
          ) : recommendations.length > 0 ? (
            <FlatList
              data={getSortedRecommendations()}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderRecipeCard}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + 16}
              decelerationRate="fast"
              contentContainerStyle={styles.recipeList}
            />
          ) : (
            <View style={styles.emptyRecs}>
              <Ionicons name="leaf-outline" size={48} color={theme.colors.textMuted} />
              <Text style={[styles.emptyRecsText, { color: theme.colors.textMuted }]}>
                {inventoryCount > 0
                  ? "No matching recipes found. Try adding more ingredients."
                  : "Photograph your ingredients to get personalized recipe ideas."}
              </Text>
              <TouchableOpacity
                style={[styles.addIngredientsBtn, { backgroundColor: theme.colors.buttonPrimary }]}
                onPress={() => navigation.navigate("Capture")}
              >
                <Ionicons name="add" size={18} color={theme.colors.buttonPrimaryText} />
                <Text style={[styles.addIngredientsBtnText, { color: theme.colors.buttonPrimaryText }]}>Scan Ingredients</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
          </View>

          <View style={styles.menuGrid}>
            <TouchableOpacity
              style={[styles.menuCard, { backgroundColor: theme.colors.card }]}
              onPress={() => navigation.navigate("Capture")}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBg, { backgroundColor: theme.mode === "dark" ? theme.colors.inputBg : "#F5F0E6" }]}>
                <Ionicons name="camera" size={24} color={theme.colors.text} />
              </View>
              <Text style={[styles.menuTitle, { color: theme.colors.text }]}>Capture</Text>
              <Text style={[styles.menuDesc, { color: theme.colors.textMuted }]}>Identify ingredients</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuCard, { backgroundColor: theme.colors.card }]}
              onPress={() => navigation.navigate("Inventory")}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBg, { backgroundColor: theme.mode === "dark" ? theme.colors.inputBg : "#EAF0F5" }]}>
                <MaterialCommunityIcons name="fridge-outline" size={24} color={theme.mode === "dark" ? "#90caf9" : "#1976d2"} />
              </View>
              <Text style={[styles.menuTitle, { color: theme.colors.text }]}>Inventory</Text>
              <Text style={[styles.menuDesc, { color: theme.colors.textMuted }]}>
                {inventoryCount > 0 ? `${inventoryCount} items` : "View items"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuCard, { backgroundColor: theme.colors.card }]}
              onPress={() => navigation.navigate("RecipeHistory")}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBg, { backgroundColor: theme.mode === "dark" ? theme.colors.inputBg : "#FDF3E3" }]}>
                <Ionicons name="time" size={24} color={theme.colors.accent} />
              </View>
              <Text style={[styles.menuTitle, { color: theme.colors.text }]}>History</Text>
              <Text style={[styles.menuDesc, { color: theme.colors.textMuted }]}>What you've cooked</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuCard, { backgroundColor: theme.colors.card }]}
              onPress={() => navigation.navigate("ProfilePreferences")}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBg, { backgroundColor: theme.mode === "dark" ? theme.colors.inputBg : "#F3EEF5" }]}>
                <Ionicons name="settings-outline" size={24} color={theme.mode === "dark" ? "#ce93d8" : "#7b1fa2"} />
              </View>
              <Text style={[styles.menuTitle, { color: theme.colors.text }]}>Preferences</Text>
              <Text style={[styles.menuDesc, { color: theme.colors.textMuted }]}>Diet & profile</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  logoutButton: {
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  container: {
    flex: 1,
  },
  greetingSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.sm,
  },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
  },
  userName: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 2,
  },
  profileBadgeContainer: {
    alignItems: "flex-end",
  },
  profileMini: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  profileCta: {
    fontSize: 11,
    marginTop: spacing.xs,
    fontWeight: "500",
  },
  profileMiniEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  profileMiniStats: {
    marginRight: spacing.xs,
  },
  miniStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },
  miniStatText: {
    fontSize: 12,
    fontWeight: "600",
  },
  miniStatLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  profileMiniEmpty: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    marginTop: spacing.xxl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md + 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  recipeList: {
    paddingHorizontal: spacing.xl,
  },
  recipeCard: {
    width: CARD_WIDTH,
    height: 180,
    borderRadius: radii.lg,
    overflow: "hidden",
    marginRight: spacing.lg,
  },
  recipeImage: {
    width: "100%",
    height: "100%",
  },
  recipeImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  recipeOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: spacing.md + 2,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  recipeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  recipeTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  recipeTime: {
    fontSize: 12,
    color: "#ddd",
  },
  matchIndicator: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  matchIndicatorText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: spacing.sm + 2,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyRecs: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyRecsText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  addIngredientsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  addIngredientsBtnText: {
    fontWeight: "600",
    fontSize: 14,
  },
  menuGrid: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    flexWrap: "wrap",
  },
  menuCard: {
    width: "48%",
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: "center",
  },
  menuIconBg: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm + 2,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  menuDesc: {
    fontSize: 11,
    marginTop: 3,
  },
});
