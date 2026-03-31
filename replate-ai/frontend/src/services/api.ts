import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5050";

// ---------------------------------------------------------------------------
// Secure storage helpers (SecureStore on native, localStorage on web)
// ---------------------------------------------------------------------------
const SESSION_TOKEN_KEY = "replate_auth_token";
const SESSION_REFRESH_KEY = "replate_refresh_token";
const USER_DISPLAY_NAME_KEY = "replate_user_name";

async function storageSave(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function storageLoad(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function storageDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

// ---------------------------------------------------------------------------
// In-memory auth token (used per-request)
// ---------------------------------------------------------------------------
let _authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  _authToken = token;
}
export function getAuthToken(): string | null {
  return _authToken;
}

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

/** Save idToken + refreshToken to secure storage and update in-memory token. */
export async function saveSession(idToken: string, refreshToken: string, displayName?: string): Promise<void> {
  _authToken = idToken;
  await storageSave(SESSION_TOKEN_KEY, idToken);
  await storageSave(SESSION_REFRESH_KEY, refreshToken);
  if (displayName) {
    await storageSave(USER_DISPLAY_NAME_KEY, displayName);
  }
}

/** Get stored user display name */
export async function getUserDisplayName(): Promise<string | null> {
  return storageLoad(USER_DISPLAY_NAME_KEY);
}

/** Update stored user display name (used by Home greeting). */
export async function saveUserDisplayName(displayName: string): Promise<void> {
  if (!displayName) return;
  await storageSave(USER_DISPLAY_NAME_KEY, displayName);
}

/** Clear stored session and in-memory token (sign-out). */
export async function clearSession(): Promise<void> {
  _authToken = null;
  await storageDelete(SESSION_TOKEN_KEY);
  await storageDelete(SESSION_REFRESH_KEY);
  await storageDelete(USER_DISPLAY_NAME_KEY);
}

/**
 * On app startup: load stored refresh token, exchange it for a fresh idToken,
 * and restore the in-memory session. Returns true if restored successfully.
 */
export async function loadStoredSession(): Promise<boolean> {
  try {
    const refreshToken = await storageLoad(SESSION_REFRESH_KEY);
    if (!refreshToken) return false;

    const result = await refreshSession(refreshToken);
    if (result.success && result.idToken) {
      await saveSession(result.idToken, result.refreshToken ?? refreshToken);
      return true;
    }
    // Token was explicitly rejected — clear it
    await clearSession();
    return false;
  } catch {
    // Network error — don't clear the session, just fail silently.
    // The user can retry when connectivity is restored.
    return false;
  }
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
interface Ingredient {
  id: string;
  name: string;
  confidence: number;
}

interface SessionResponse {
  success: boolean;
  sessionId: string;
  ingredients: Ingredient[];
}

interface IngredientsResponse {
  success: boolean;
  ingredients: Ingredient[];
  message?: string;
  error?: string;
}

interface DetectionResponse {
  success: boolean;
  imageUrl?: string;
  ingredients: { name: string; confidence: number }[];
  error?: string;
}

export interface Recipe {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
  sourceUrl?: string;
  summary?: string;
  ingredients?: { name: string; amount: number; unit: string }[];
  instructions?: string[];
}

interface RecipeResponse {
  success: boolean;
  source?: string;
  count: number;
  recipes: Recipe[];
  error?: string;
}

interface AuthResponse {
  success: boolean;
  uid?: string;
  email?: string;
  displayName?: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Profile / Dietary Preferences
// ---------------------------------------------------------------------------

export interface DietaryPreferences {
  restrictions: string[];
  allergies: string[];
  skillLevel?: string;
  maxCookingTime?: number | null;
}

export interface AppSettings {
  themeMode: "light" | "dark" | "system";
  notifications: {
    expiryRemindersEnabled: boolean;
    reminderLeadDays?: number;
    reminderTime?: string; // "HH:MM"
  };
}

export interface AppSettingsResponse {
  success: boolean;
  appSettings?: AppSettings;
  error?: string;
}

export interface UserProfileResponse {
  success: boolean;
  profile?: { uid: string; email: string | null; displayName: string };
  dietaryPreferences?: DietaryPreferences;
  error?: string;
}

export async function getUserProfile(): Promise<UserProfileResponse> {
  const res = await fetch(`${API_BASE_URL}/profile`, {
    headers: { ...authHeaders() },
  });
  return parseResponse<UserProfileResponse>(res);
}

export async function updateUserProfile(params: {
  displayName?: string;
  dietaryPreferences?: Partial<DietaryPreferences>;
}): Promise<UserProfileResponse> {
  const res = await fetch(`${API_BASE_URL}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(params),
  });
  return parseResponse<UserProfileResponse>(res);
}

export async function getAppSettings(): Promise<AppSettingsResponse> {
  const res = await fetch(`${API_BASE_URL}/settings`, {
    headers: { ...authHeaders() },
  });
  return parseResponse<AppSettingsResponse>(res);
}

export async function updateAppSettings(appSettings: Partial<AppSettings>): Promise<AppSettingsResponse> {
  const res = await fetch(`${API_BASE_URL}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ appSettings }),
  });
  return parseResponse<AppSettingsResponse>(res);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function authHeaders(): Record<string, string> {
  return _authToken ? { Authorization: `Bearer ${_authToken}` } : {};
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: `Server error (${res.status})` } as T;
  }
}

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------

export async function signUp(params: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseResponse<AuthResponse>(res);
}

export async function signIn(params: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseResponse<AuthResponse>(res);
}

export async function signInWithGoogle(idToken: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  return parseResponse<AuthResponse>(res);
}

export async function signInWithApple(params: {
  identityToken: string;
  fullName?: { givenName?: string; familyName?: string } | null;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/apple`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseResponse<AuthResponse>(res);
}

export async function forgotPassword(email: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return parseResponse<AuthResponse>(res);
}

export async function refreshSession(refreshToken: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  return parseResponse<AuthResponse>(res);
}

// ---------------------------------------------------------------------------
// Inventory / session endpoints (all require auth)
// ---------------------------------------------------------------------------

export async function createReviewSession(
  ingredients: { name: string; confidence: number }[]
): Promise<SessionResponse> {
  const res = await fetch(`${API_BASE_URL}/inventory/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ingredients }),
  });
  return parseResponse<SessionResponse>(res);
}

export async function getReviewSession(
  sessionId: string
): Promise<IngredientsResponse> {
  const res = await fetch(`${API_BASE_URL}/inventory/review/${sessionId}`, {
    headers: authHeaders(),
  });
  return parseResponse<IngredientsResponse>(res);
}

export async function editIngredientName(
  sessionId: string,
  ingredientId: string,
  name: string
): Promise<IngredientsResponse> {
  const res = await fetch(
    `${API_BASE_URL}/inventory/review/${sessionId}/item/${ingredientId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ name }),
    }
  );
  return parseResponse<IngredientsResponse>(res);
}

export async function removeIngredient(
  sessionId: string,
  ingredientId: string
): Promise<IngredientsResponse> {
  const res = await fetch(
    `${API_BASE_URL}/inventory/review/${sessionId}/item/${ingredientId}`,
    { method: "DELETE", headers: authHeaders() }
  );
  return parseResponse<IngredientsResponse>(res);
}

export async function confirmIngredients(
  sessionId: string
): Promise<IngredientsResponse> {
  const res = await fetch(
    `${API_BASE_URL}/inventory/review/${sessionId}/confirm`,
    { method: "POST", headers: authHeaders() }
  );
  return parseResponse<IngredientsResponse>(res);
}

export async function addIngredient(
  sessionId: string,
  name: string
): Promise<IngredientsResponse> {
  const res = await fetch(
    `${API_BASE_URL}/inventory/review/${sessionId}/item`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ name }),
    }
  );
  return parseResponse<IngredientsResponse>(res);
}

export async function detectIngredients(
  imageUri: string
): Promise<DetectionResponse> {
  const formData = new FormData();

  // Handle web vs native differently
  if (Platform.OS === "web") {
    // On web, imageUri is a blob URL - fetch it and append as blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    formData.append("image", blob, "ingredient-photo.jpg");
  } else {
    // On native, use the React Native style object
    formData.append("image", {
      uri: imageUri,
      type: "image/jpeg",
      name: "ingredient-photo.jpg",
    } as any);
  }

  const res = await fetch(`${API_BASE_URL}/ingredients/photo`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  return parseResponse<DetectionResponse>(res);
}

export interface RecipeHistoryItem extends Recipe {
  historyId: string;
  savedAt: string;
}

interface SaveHistoryResponse {
  success: boolean;
}

interface GetHistoryResponse {
  success: boolean;
  recipes: RecipeHistoryItem[];
}

/**
 * Save a recipe to the authenticated user's history.
 */
export async function saveRecipeToHistory(
  recipe: Recipe,
  token: string
): Promise<SaveHistoryResponse> {
  const res = await fetch(`${API_BASE_URL}/recipe-history`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ recipe }),
  });
  return parseResponse<SaveHistoryResponse>(res);
}

/**
 * Get all saved recipes for the authenticated user.
 */
export async function getRecipeHistory(
  token: string
): Promise<GetHistoryResponse> {
  const res = await fetch(`${API_BASE_URL}/recipe-history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse<GetHistoryResponse>(res);
}

export async function generateRecipes(
  ingredients: string[],
  preferences?: { restrictions?: string[]; maxCookingTime?: number },
  count: number = 3
): Promise<RecipeResponse> {
  const res = await fetch(`${API_BASE_URL}/recipes/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ingredients, preferences, count }),
  });
  return parseResponse<RecipeResponse>(res);
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export interface InventoryItem {
  id: string;
  ingredientName: string;
  quant: number;
  unit: string;
  expiryDate: string;
  isExpired: boolean;
}

interface InventoryResponse {
  success: boolean;
  items: InventoryItem[];
  error?: string;
}

/** Fetch the authenticated user's current ingredient inventory. */
export async function getUserInventory(): Promise<InventoryResponse> {
  const res = await fetch(`${API_BASE_URL}/inventory`, {
    headers: authHeaders(),
  });
  return parseResponse<InventoryResponse>(res);
}

// ---------------------------------------------------------------------------
// Cook / Deduct Inventory
// ---------------------------------------------------------------------------

interface CookResponse {
  success: boolean;
  message?: string;
  deducted: { name: string; previousQty: number; deductedAmount: number; newQty: number }[];
  skipped: { name: string; reason: string }[];
  errors: { name: string; error: string }[];
  error?: string;
}

/**
 * Deduct ingredients from inventory after cooking a recipe.
 * Called when user clicks "Start Cooking".
 */
export async function markRecipeAsCooked(
  ingredients: { name: string; amount: number; unit: string }[]
): Promise<CookResponse> {
  const res = await fetch(`${API_BASE_URL}/inventory/cook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ingredients }),
  });
  return parseResponse<CookResponse>(res);
}

// ---------------------------------------------------------------------------
// Profile Analysis
// ---------------------------------------------------------------------------

export interface ProfileAnalysis {
  persona: string;
  emoji: string;
  description: string;
  dietType: string;
  cookingStyle: string;
  healthScore: number;
  funFact: string;
}

export interface ProfileAnalysisResponse {
  success: boolean;
  analysis?: ProfileAnalysis;
  ingredientCount?: number;
  error?: string;
}

/**
 * Analyze user profile based on fridge ingredients.
 */
export async function getProfileAnalysis(): Promise<ProfileAnalysisResponse> {
  const res = await fetch(`${API_BASE_URL}/inventory/profile-analysis`, {
    headers: authHeaders(),
  });
  return parseResponse<ProfileAnalysisResponse>(res);
}

// ---------------------------------------------------------------------------
// Grocery List
// ---------------------------------------------------------------------------

export interface GroceryListItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  isAvailableAtHome: boolean;
}

export interface GroceryList {
  id: string;
  recipeId: string;
  recipeTitle: string;
  items: GroceryListItem[];
  createdAt?: string;
}

interface GroceryListResponse {
  success: boolean;
  list?: GroceryList;
  lists?: GroceryList[];
  error?: string;
}

interface ToggleItemResponse {
  success: boolean;
  itemId?: string;
  isAvailableAtHome?: boolean;
  error?: string;
}

interface GroceryListItemResponse {
  success: boolean;
  item?: GroceryListItem;
  error?: string;
}

export async function createGroceryList(params: {
  recipeId: string | number;
  recipeTitle: string;
  missingIngredients: { name: string; amount: number; unit: string }[];
}): Promise<GroceryListResponse> {
  const res = await fetch(`${API_BASE_URL}/grocery-list`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(params),
  });
  return parseResponse<GroceryListResponse>(res);
}

/**
 * Create a single aggregated grocery list from multiple recipes.
 * The backend merges duplicate ingredients and sums their quantities.
 */
export async function createAggregatedGroceryList(params: {
  recipes: Array<{
    recipeId: string | number;
    recipeTitle: string;
    ingredients: { name: string; amount: number; unit: string }[];
  }>;
}): Promise<GroceryListResponse> {
  const res = await fetch(`${API_BASE_URL}/grocery-list/aggregate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(params),
  });
  return parseResponse<GroceryListResponse>(res);
}

export async function getGroceryList(listId: string): Promise<GroceryListResponse> {
  const res = await fetch(`${API_BASE_URL}/grocery-list/${listId}`, {
    headers: authHeaders(),
  });
  return parseResponse<GroceryListResponse>(res);
}

export async function toggleGroceryItemAvailability(
  listId: string,
  itemId: string
): Promise<ToggleItemResponse> {
  const res = await fetch(
    `${API_BASE_URL}/grocery-list/${listId}/item/${itemId}/toggle`,
    {
      method: "PATCH",
      headers: authHeaders(),
    }
  );
  return parseResponse<ToggleItemResponse>(res);
}

export async function addGroceryItem(
  listId: string,
  item: { name: string; amount: number; unit: string }
): Promise<GroceryListItemResponse> {
  const res = await fetch(`${API_BASE_URL}/grocery-list/${listId}/item`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(item),
  });
  return parseResponse<GroceryListItemResponse>(res);
}

export async function deleteGroceryItem(
  listId: string,
  itemId: string
): Promise<GroceryListItemResponse> {
  const res = await fetch(
    `${API_BASE_URL}/grocery-list/${listId}/item/${itemId}`,
    { method: "DELETE", headers: authHeaders() }
  );
  return parseResponse<GroceryListItemResponse>(res);
}

export async function updateGroceryItemQuantity(
  listId: string,
  itemId: string,
  amount: number
): Promise<GroceryListItemResponse> {
  const res = await fetch(
    `${API_BASE_URL}/grocery-list/${listId}/item/${itemId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ amount }),
    }
  );
  return parseResponse<GroceryListItemResponse>(res);
}


// ---------------------------------------------------------------------------
// Grocery Order (Walmart)
// ---------------------------------------------------------------------------

export interface GroceryOrderProduct {
  providerId: string;
  providerName: string;
  productName: string;
  price: number;
  image: string;
  inStock: boolean;
  url: string;
}

export interface GroceryOrderItem {
  ingredient: {
    originalName: string;
    canonicalName: string;
    amount: number;
    unit: string;
  };
  product: GroceryOrderProduct;
  quantity: number;
}

export interface GroceryOrderResponse {
  success: boolean;
  order?: {
    provider: string;
    orderItems: GroceryOrderItem[];
    notFound: { originalName: string; canonicalName: string }[];
    summary: {
      totalItems: number;
      totalPrice: number;
      missingItems: number;
    };
  };
  error?: string;
}

export async function generateGroceryOrder(
  ingredients: { name: string; amount: number; unit: string }[],
  provider: string = "walmart"
): Promise<GroceryOrderResponse> {
  const res = await fetch(`${API_BASE_URL}/grocery-order/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ingredients, provider }),
  });
  return parseResponse<GroceryOrderResponse>(res);
}


// ---------------------------------------------------------------------------
// Popular Recipes
// ---------------------------------------------------------------------------

export interface PopularRecipe extends Recipe {
  cookedCount: number;
}

interface PopularRecipesResponse {
  success: boolean;
  recipes: PopularRecipe[];
}

export async function getPopularRecipes(): Promise<PopularRecipesResponse> {
  const res = await fetch(`${API_BASE_URL}/recipe-history/popular`, {
    headers: authHeaders(),
  });
  return parseResponse<PopularRecipesResponse>(res);
}


// ---------------------------------------------------------------------------
// Walmart Search
// ---------------------------------------------------------------------------

export interface WalmartProduct {
  itemId: number;
  name: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
}

interface WalmartSearchResponse {
  success: boolean;
  products: WalmartProduct[];
}

export async function searchWalmartProducts(query: string): Promise<WalmartSearchResponse> {
  const res = await fetch(`${API_BASE_URL}/grocery-order/search?q=${encodeURIComponent(query)}`, {
    headers: authHeaders(),
  });
  return parseResponse<WalmartSearchResponse>(res);
}
