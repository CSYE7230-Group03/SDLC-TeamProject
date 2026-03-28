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
  Alert,
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

// ─── Design tokens for the new green palette ────────────────────────────────
const GREEN_BG = "#F0F8F0";
const GREEN_DARK = "#2D5A27";
const GREEN_DARK_LIGHT = "rgba(45,90,39,0.08)";
const CARD_WHITE = "#FFFFFF";
const TEXT_PRIMARY = "#1A1A1A";
const TEXT_SECONDARY = "#666666";
const BORDER_GRAY = "#E0E0E0";

const REC_CARD_WIDTH = 260;
const WEEK_CARD_WIDTH = 180;

const CACHE_KEY_RECOMMENDATIONS = "replate_cached_recommendations";
const CACHE_KEY_INVENTORY_COUNT = "replate_cached_inventory_count";

// Bottom tab definition
const TABS = [
  { key: "home", label: "Home", icon: "home" as const },
  { key: "capture", label: "Capture", icon: "camera" as const },
  { key: "history", label: "History", icon: "time" as const },
  { key: "profile", label: "Profile", icon: "person" as const },
] as const;

export default function HomeScreen({ navigation }: Props) {
  const { theme } = useAppTheme();

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

  // ─── New UI state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    "home" | "capture" | "history" | "profile"
  >("home");

  // ─── Animations ──────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // ─── Pantry staples ──────────────────────────────────────────────────────
  const PANTRY_STAPLES = [
    "salt",
    "pepper",
    "water",
    "oil",
    "olive oil",
    "cooking oil",
    "vegetable oil",
    "butter",
    "garlic",
    "onion",
    "soy sauce",
    "ketchup",
    "mayonnaise",
    "mustard",
    "vinegar",
    "sugar",
    "honey",
    "lemon juice",
    "flour",
    "rice",
    "pasta",
    "spaghetti",
  ];

  // ─── Existing logic (unchanged) ──────────────────────────────────────────
  function calculateMatchRate(recipe: Recipe): number {
    if (!recipe.ingredients || recipe.ingredients.length === 0) return 0;

    const availableSet = new Set([
      ...inventoryIngredients.map((i) => i.toLowerCase()),
      ...PANTRY_STAPLES,
    ]);

    let matched = 0;
    for (const ing of recipe.ingredients) {
      const ingName = ing.name.toLowerCase();
      const isAvailable = Array.from(availableSet).some(
        (avail) => ingName.includes(avail) || avail.includes(ingName),
      );
      if (isAvailable) matched++;
    }

    return Math.round((matched / recipe.ingredients.length) * 100);
  }

  function getSortedRecommendations(): (Recipe & { matchRate: number })[] {
    return recommendations
      .map((recipe) => ({ ...recipe, matchRate: calculateMatchRate(recipe) }))
      .sort((a, b) => b.matchRate - a.matchRate);
  }

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

  useFocusEffect(
    useCallback(() => {
      loadCachedData();
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

  // ─── Tab press handler ───────────────────────────────────────────────────
  function handleTabPress(key: typeof activeTab) {
    setActiveTab(key);
    switch (key) {
      case "capture":
        navigation.navigate("Capture");
        break;
      case "history":
        navigation.navigate("RecipeHistory");
        break;
      case "profile":
        navigation.navigate("ProfilePreferences");
        break;
      default:
        break;
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
  function renderRecommendationCard({
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
        onPress={() => navigation.navigate("RecipeDetail", { recipe: item })}
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
  }

  function renderWeekCard(item: Recipe & { matchRate: number }, index: number) {
    return (
      <TouchableOpacity
        key={item.id.toString()}
        style={styles.weekCard}
        onPress={() => navigation.navigate("RecipeDetail", { recipe: item })}
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
  }

  const sortedRecs = getSortedRecommendations();
  const weekRecipes = sortedRecs.slice(0, 4);

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
            onPress={() => navigation.navigate("ProfilePreferences")}
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
              onPress={() => navigation.navigate("RecipeHistory")}
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

        {/* ── Quick Actions grid ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.menuGrid}>
            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => navigation.navigate("Capture")}
              activeOpacity={0.8}
            >
              <View style={styles.menuCardRow}>
                <View
                  style={[
                    styles.menuIconBg,
                    { backgroundColor: GREEN_DARK_LIGHT },
                  ]}
                >
                  <Ionicons name="camera" size={18} color={GREEN_DARK} />
                </View>
                <View style={styles.menuCardText}>
                  <Text style={styles.menuTitle}>Capture</Text>
                  <Text style={styles.menuDesc}>Identify ingredients</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => navigation.navigate("Inventory")}
              activeOpacity={0.8}
            >
              <View style={styles.menuCardRow}>
                <View
                  style={[
                    styles.menuIconBg,
                    { backgroundColor: GREEN_DARK_LIGHT },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="fridge-outline"
                    size={18}
                    color={GREEN_DARK}
                  />
                </View>
                <View style={styles.menuCardText}>
                  <Text style={styles.menuTitle}>Inventory</Text>
                  <Text style={styles.menuDesc}>
                    {inventoryCount > 0
                      ? `${inventoryCount} items`
                      : "View items"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => navigation.navigate("RecipeHistory")}
              activeOpacity={0.8}
            >
              <View style={styles.menuCardRow}>
                <View
                  style={[
                    styles.menuIconBg,
                    { backgroundColor: GREEN_DARK_LIGHT },
                  ]}
                >
                  <Ionicons name="time" size={18} color={GREEN_DARK} />
                </View>
                <View style={styles.menuCardText}>
                  <Text style={styles.menuTitle}>History</Text>
                  <Text style={styles.menuDesc}>What you've cooked</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCard}
              onPress={() => navigation.navigate("ProfilePreferences")}
              activeOpacity={0.8}
            >
              <View style={styles.menuCardRow}>
                <View
                  style={[
                    styles.menuIconBg,
                    { backgroundColor: GREEN_DARK_LIGHT },
                  ]}
                >
                  <Ionicons
                    name="settings-outline"
                    size={18}
                    color={GREEN_DARK}
                  />
                </View>
                <View style={styles.menuCardText}>
                  <Text style={styles.menuTitle}>Preferences</Text>
                  <Text style={styles.menuDesc}>Diet &amp; profile</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom padding so content clears tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bottom tab bar (fixed) ────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const isCapture = tab.key === "capture";

          if (isCapture) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => handleTabPress(tab.key)}
                activeOpacity={0.8}
              >
                <View style={styles.captureTabButton}>
                  <Ionicons name="camera" size={24} color={CARD_WHITE} />
                </View>
                <Text style={[styles.tabLabel, { marginTop: 4 }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab.key)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={isActive ? tab.icon : (`${tab.icon}-outline` as any)}
                size={22}
                color={isActive ? GREEN_DARK : TEXT_SECONDARY}
              />
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
              {isActive && <View style={styles.tabActiveDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
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

  // Quick actions grid
  menuGrid: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    flexWrap: "wrap",
  },
  menuCard: {
    width: "47%",
    backgroundColor: CARD_WHITE,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
  },
  menuCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  menuCardText: {
    flex: 1,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    justifyContent: "center",
    alignItems: "center",
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  menuDesc: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginTop: 2,
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

  // Bottom tab bar
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: CARD_WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  captureTabButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: GREEN_DARK,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -24,
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: TEXT_SECONDARY,
  },
  tabLabelActive: {
    color: GREEN_DARK,
    fontWeight: "700",
  },
  tabActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GREEN_DARK,
    marginTop: 2,
  },
});
