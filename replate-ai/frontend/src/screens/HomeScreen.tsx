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

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 64;

const CACHE_KEY_RECOMMENDATIONS = "replate_cached_recommendations";
const CACHE_KEY_INVENTORY_COUNT = "replate_cached_inventory_count";

// Colors
const PRIMARY = "#2d6a4f";
const PRIMARY_LIGHT = "#40916c";
const BG = "#f8faf9";
const CARD_BG = "#ffffff";
const TEXT_DARK = "#1a1a1a";
const TEXT_MID = "#666666";
const TEXT_LIGHT = "#999999";

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
    const matchColor = item.matchRate >= 80 ? "#4caf50" : item.matchRate >= 50 ? "#ff9800" : "#f44336";
    
    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => {
          navigation.navigate("RecipeDetail", { recipe: item });
        }}
        activeOpacity={0.9}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.recipeImage} resizeMode="cover" />
        ) : (
          <View style={[styles.recipeImage, styles.recipeImagePlaceholder]}>
            <Ionicons name="restaurant-outline" size={40} color={PRIMARY_LIGHT} />
          </View>
        )}
        
        {/* Match Rate Badge */}
        <View style={[styles.matchBadge, { backgroundColor: matchColor }]}>
          <Ionicons name="checkmark-circle" size={12} color="#fff" />
          <Text style={styles.matchBadgeText}>{item.matchRate}%</Text>
        </View>
        
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
          style={styles.logoutButton}
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
                <View style={styles.profileMini}>
                  <Text style={styles.profileMiniEmoji}>{profileAnalysis.emoji}</Text>
                  <View style={styles.profileMiniStats}>
                    <View style={styles.miniStatRow}>
                      <View style={[styles.miniDot, { backgroundColor: "#4caf50" }]} />
                      <Text style={styles.miniStatText}>{profileAnalysis.healthScore}/10</Text>
                    </View>
                    <Text style={styles.miniStatLabel}>{profileAnalysis.dietType.split(" ")[0]}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#ccc" />
                </View>
                <Text style={styles.profileCta}>Check your diet habits →</Text>
              </TouchableOpacity>
            ) : inventoryCount > 0 && !loadingProfile ? (
              <TouchableOpacity
                style={styles.profileMiniEmpty}
                onPress={loadProfileAnalysis}
                activeOpacity={0.7}
              >
                <Ionicons name="analytics-outline" size={20} color={PRIMARY} />
              </TouchableOpacity>
            ) : loadingProfile ? (
              <View style={styles.profileMiniEmpty}>
                <ActivityIndicator size="small" color={PRIMARY} />
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* Recommended Recipes */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={20} color={PRIMARY} />
            <Text style={styles.sectionTitle}>Recommended for You</Text>
          </View>
          
          {loadingRecs ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={PRIMARY} />
              <Text style={styles.loadingText}>Finding recipes...</Text>
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
              <Ionicons name="leaf-outline" size={48} color={TEXT_LIGHT} />
              <Text style={styles.emptyRecsText}>
                {inventoryCount > 0
                  ? "No recipes found. Try adding more ingredients!"
                  : "Add ingredients to get personalized recommendations"}
              </Text>
              <TouchableOpacity
                style={styles.addIngredientsBtn}
                onPress={() => navigation.navigate("Capture")}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addIngredientsBtnText}>Add Ingredients</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash" size={20} color={PRIMARY} />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          
          <View style={styles.menuGrid}>
            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => navigation.navigate("Capture")}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBg, { backgroundColor: "#e8f5e9" }]}>
                <Ionicons name="camera" size={24} color={PRIMARY} />
              </View>
              <Text style={styles.menuTitle}>Capture</Text>
              <Text style={styles.menuDesc}>Scan ingredients</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => navigation.navigate("Inventory")}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBg, { backgroundColor: "#e3f2fd" }]}>
                <MaterialCommunityIcons name="fridge-outline" size={24} color="#1976d2" />
              </View>
              <Text style={styles.menuTitle}>Inventory</Text>
              <Text style={styles.menuDesc}>
                {inventoryCount > 0 ? `${inventoryCount} items` : "View items"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => navigation.navigate("RecipeHistory")}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBg, { backgroundColor: "#fff3e0" }]}>
                <Ionicons name="time" size={24} color="#f57c00" />
              </View>
              <Text style={styles.menuTitle}>History</Text>
              <Text style={styles.menuDesc}>Past recipes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => navigation.navigate("ProfilePreferences")}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBg, { backgroundColor: "#f3e5f5" }]}>
                <Ionicons name="settings-outline" size={24} color="#7b1fa2" />
              </View>
              <Text style={styles.menuTitle}>Preferences</Text>
              <Text style={styles.menuDesc}>Diet & profile</Text>
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
    backgroundColor: BG,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "700",
    color: PRIMARY,
    letterSpacing: 0.3,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
  },
  greetingSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
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
    color: TEXT_MID,
  },
  userName: {
    fontSize: 28,
    fontWeight: "700",
    color: TEXT_DARK,
    marginTop: 2,
  },
  profileBadgeContainer: {
    alignItems: "flex-end",
  },
  profileMini: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  profileCta: {
    fontSize: 11,
    color: PRIMARY_LIGHT,
    marginTop: 4,
    fontWeight: "500",
  },
  profileMiniEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  profileMiniStats: {
    marginRight: 4,
  },
  miniStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniStatText: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  miniStatLabel: {
    fontSize: 10,
    color: TEXT_LIGHT,
    marginTop: 1,
  },
  profileMiniEmpty: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  recipeList: {
    paddingHorizontal: 20,
  },
  recipeCard: {
    width: CARD_WIDTH,
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 16,
    backgroundColor: CARD_BG,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  recipeImage: {
    width: "100%",
    height: "100%",
  },
  recipeImagePlaceholder: {
    backgroundColor: "#f0f7f4",
    justifyContent: "center",
    alignItems: "center",
  },
  recipeOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 14,
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
    gap: 4,
  },
  recipeTime: {
    fontSize: 12,
    color: "#ddd",
  },
  matchBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  matchIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
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
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: TEXT_MID,
  },
  emptyRecs: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyRecsText: {
    fontSize: 14,
    color: TEXT_LIGHT,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
    lineHeight: 20,
  },
  addIngredientsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addIngredientsBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  menuGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    flexWrap: "wrap",
  },
  menuCard: {
    width: "48%",
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  menuIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  menuDesc: {
    fontSize: 11,
    color: TEXT_LIGHT,
    marginTop: 3,
  },
});
