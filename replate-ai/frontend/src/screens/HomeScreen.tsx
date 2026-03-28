import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BottomTabScreenProps, useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { TabParamList } from "../navigation/AppNavigator";
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
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = BottomTabScreenProps<TabParamList, "Home">;
type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Design tokens for the new green palette ────────────────────────────────
const GREEN_BG = "#F0F8F0";
const GREEN_DARK = "#2D5A27";
const CARD_WHITE = "#FFFFFF";
const TEXT_PRIMARY = "#1A1A1A";
const TEXT_SECONDARY = "#666666";

const REC_CARD_WIDTH = 260;
const WEEK_CARD_WIDTH = 180;

const PANTRY_STAPLES = [
  "salt", "pepper", "water", "oil", "olive oil", "cooking oil",
  "vegetable oil", "butter", "garlic", "onion", "soy sauce", "ketchup",
  "mayonnaise", "mustard", "vinegar", "sugar", "honey", "lemon juice",
  "flour", "rice", "pasta", "spaghetti",
];

const CACHE_KEY_RECOMMENDATIONS = "replate_cached_recommendations";
const CACHE_KEY_INVENTORY_COUNT = "replate_cached_inventory_count";

export default function HomeScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const rootNavigation = useNavigation<RootNavProp>();
  const tabBarHeight = useBottomTabBarHeight();

  // ─── Existing state ──────────────────────────────────────────────────────
  const [userName, setUserName] = useState<string>("");
  const [recommendations, setRecommendations] = useState<Recipe[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [inventoryIngredients, setInventoryIngredients] = useState<string[]>(
    [],
  );
  const [profileAnalysis, setProfileAnalysis] =
    useState<ProfileAnalysis | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // ─── Animations ──────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // ─── Existing logic (unchanged) ──────────────────────────────────────────
  const availableSet = useMemo(() => {
    return new Set([
      ...inventoryIngredients.map((i) => i.toLowerCase()),
      ...PANTRY_STAPLES,
    ]);
  }, [inventoryIngredients]);

  const sortedRecs = useMemo(() => {
    function calculateMatchRate(recipe: Recipe): number {
      if (!recipe.ingredients || recipe.ingredients.length === 0) return 0;
      let matched = 0;
      for (const ing of recipe.ingredients) {
        const ingName = ing.name.toLowerCase();
        let found = false;
        for (const avail of availableSet) {
          if (ingName.includes(avail) || avail.includes(ingName)) { found = true; break; }
        }
        if (found) matched++;
      }
      return Math.round((matched / recipe.ingredients.length) * 100);
    }
    return recommendations
      .map((recipe) => ({ ...recipe, matchRate: calculateMatchRate(recipe) }))
      .sort((a, b) => b.matchRate - a.matchRate);
  }, [recommendations, availableSet]);

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

  useEffect(() => {
    if (inventoryCount > 0 && !profileAnalysis && !loadingProfile) {
      loadProfileAnalysis();
    }
  }, [inventoryCount]);

  const mountedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!mountedRef.current) { mountedRef.current = true; return; }
      loadInventoryCount();
    }, []),
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
        setInventoryIngredients(activeItems.map((i) => i.ingredientName));
        await AsyncStorage.setItem(
          CACHE_KEY_INVENTORY_COUNT,
          activeItems.length.toString(),
        );
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
        setInventoryIngredients(activeItems.map((i) => i.ingredientName));
        await AsyncStorage.setItem(
          CACHE_KEY_INVENTORY_COUNT,
          activeItems.length.toString(),
        );

        const ingredientNames = activeItems.map((i) => i.ingredientName);

        if (ingredientNames.length > 0) {
          const recRes = await generateRecipes(ingredientNames, undefined, 3);
          if (recRes.success && recRes.recipes.length > 0) {
            setRecommendations(recRes.recipes);
            await AsyncStorage.setItem(
              CACHE_KEY_RECOMMENDATIONS,
              JSON.stringify(recRes.recipes),
            );
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

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function getInitials(name: string): string {
    return name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  }

  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning,";
    if (hour < 17) return "Good Afternoon,";
    return "Good Evening,";
  }

  // ─── Render helpers ──────────────────────────────────────────────────────
  const renderRecommendationCard = useCallback(function ({
    item,
  }: {
    item: Recipe & { matchRate: number };
  }) {
    const subtitle =
      item.ingredients && item.ingredients.length > 0
        ? `${item.ingredients.length} ingredients`
        : item.servings
          ? `Serves ${item.servings}`
          : "Recipe";

    return (
      <TouchableOpacity
        style={styles.recCard}
        onPress={() => rootNavigation.navigate("RecipeDetail", { recipe: item })}
        activeOpacity={0.88}
      >
        {/* Image fill */}
        <View style={styles.recCardImageContainer}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={styles.recCardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.recCardImage, styles.recCardImagePlaceholder]}>
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={36}
                color={CARD_WHITE}
              />
            </View>
          )}
          {/* Time badge */}
          {item.readyInMinutes ? (
            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={11} color={CARD_WHITE} />
              <Text style={styles.timeBadgeText}>
                {item.readyInMinutes} mins
              </Text>
            </View>
          ) : null}
        </View>

        {/* Info below image */}
        <View style={styles.recCardInfo}>
          <Text style={styles.recCardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.recCardSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [rootNavigation]);

  const renderWeekCard = useCallback(function (item: Recipe & { matchRate: number }, index: number) {
    return (
      <TouchableOpacity
        key={item.id.toString()}
        style={styles.weekCard}
        onPress={() => rootNavigation.navigate("RecipeDetail", { recipe: item })}
        activeOpacity={0.88}
      >
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.weekCardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.weekCardImage, styles.weekCardImagePlaceholder]}>
            <MaterialCommunityIcons
              name="silverware-fork-knife"
              size={28}
              color={CARD_WHITE}
            />
          </View>
        )}
        <View style={styles.weekCardInfo}>
          <Text style={styles.weekCardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.readyInMinutes ? (
            <Text style={styles.weekCardMeta}>{item.readyInMinutes} mins</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }, [rootNavigation]);

  const weekRecipes = useMemo(() => sortedRecs.slice(0, 4), [sortedRecs]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header row ─────────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.headerRow,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(userName || "C")}
            </Text>
          </View>

          {/* Greeting text */}
          <View style={styles.headerGreeting}>
            <Text style={styles.headerGreetingLabel}>{getGreeting()}</Text>
            <Text style={styles.headerGreetingName} numberOfLines={1}>
              {userName || "Chef"}
            </Text>
          </View>

          {/* Hamburger / menu */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.7}
          >
            <View style={styles.hamburgerLine} />
            <View style={[styles.hamburgerLine, { width: 16 }]} />
            <View style={styles.hamburgerLine} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Hero headline ──────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.heroSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.heroText}>{"Feeling hungry?"}</Text>
          <Text style={styles.heroText}>{"What are we cookin' today?"}</Text>
        </Animated.View>

        {/* ── Recommendation section ─────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recommendation</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("History")}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {loadingRecs ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={GREEN_DARK} />
              <Text style={styles.loadingText}>Finding recipes...</Text>
            </View>
          ) : sortedRecs.length > 0 ? (
            <FlatList
              data={sortedRecs}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderRecommendationCard}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={REC_CARD_WIDTH + 16}
              decelerationRate="fast"
              contentContainerStyle={styles.recList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="leaf-outline" size={40} color={GREEN_DARK} />
              <Text style={styles.emptyText}>
                {inventoryCount > 0
                  ? "No matching recipes found. Try adding more ingredients."
                  : "Photograph your ingredients to get personalized recipe ideas."}
              </Text>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => navigation.navigate("Capture")}
                activeOpacity={0.85}
              >
                <Ionicons name="camera-outline" size={16} color={CARD_WHITE} />
                <Text style={styles.scanButtonText}>Scan Ingredients</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Recipe of The Week section ─────────────────────────────────── */}
        {weekRecipes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recipe of The Week</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={172}
              decelerationRate="fast"
              contentContainerStyle={styles.weekList}
            >
              {weekRecipes.map((item, index) => renderWeekCard(item, index))}
            </ScrollView>
          </View>
        )}


        {/* Bottom padding so content clears tab bar */}
        <View style={{ height: tabBarHeight }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: GREEN_BG,
  },
  scrollView: {
    flex: 1,
    backgroundColor: GREEN_BG,
  },
  scrollContent: {
    paddingTop: spacing.lg,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GREEN_DARK,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    color: CARD_WHITE,
    fontSize: 16,
    fontWeight: "700",
  },
  headerGreeting: {
    flex: 1,
  },
  headerGreetingLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: "400",
  },
  headerGreetingName: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginTop: 1,
  },
  menuButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 4,
  },
  hamburgerLine: {
    width: 22,
    height: 2,
    borderRadius: 1,
    backgroundColor: TEXT_PRIMARY,
    marginVertical: 2,
  },

  // Hero
  heroSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  heroText: {
    fontSize: 30,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    lineHeight: 38,
  },

  // Section
  section: {
    marginBottom: spacing.xxxl,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: GREEN_DARK,
  },

  // Recommendation cards
  recList: {
    paddingHorizontal: spacing.xl,
  },
  recCard: {
    width: REC_CARD_WIDTH,
    marginRight: 16,
    borderRadius: 16,
    overflow: "visible",
  },
  recCardImageContainer: {
    width: REC_CARD_WIDTH,
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
  },
  recCardImage: {
    width: "100%",
    height: "100%",
  },
  recCardImagePlaceholder: {
    backgroundColor: GREEN_DARK,
    justifyContent: "center",
    alignItems: "center",
  },
  timeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 50,
  },
  timeBadgeText: {
    color: CARD_WHITE,
    fontSize: 11,
    fontWeight: "600",
  },
  recCardInfo: {
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  recCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 3,
  },
  recCardSubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },

  // Recipe of The Week horizontal scroll
  weekList: {
    paddingHorizontal: spacing.xl,
    gap: 12,
  },
  weekCard: {
    width: WEEK_CARD_WIDTH,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: CARD_WHITE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  weekCardImage: {
    width: WEEK_CARD_WIDTH,
    height: 100,
  },
  weekCardImagePlaceholder: {
    backgroundColor: GREEN_DARK,
    justifyContent: "center",
    alignItems: "center",
  },
  weekCardInfo: {
    padding: 8,
  },
  weekCardTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    lineHeight: 17,
  },
  weekCardMeta: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginTop: 3,
  },

  // Loading / Empty states
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: "center",
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: GREEN_DARK,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
  },
  scanButtonText: {
    color: CARD_WHITE,
    fontWeight: "600",
    fontSize: 14,
  },

});
