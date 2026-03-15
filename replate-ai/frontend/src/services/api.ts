import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5050";

// ---------------------------------------------------------------------------
// Secure storage helpers (SecureStore on native, localStorage on web)
// ---------------------------------------------------------------------------
const SESSION_TOKEN_KEY = "replate_auth_token";
const SESSION_REFRESH_KEY = "replate_refresh_token";

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
export async function saveSession(idToken: string, refreshToken: string): Promise<void> {
  _authToken = idToken;
  await storageSave(SESSION_TOKEN_KEY, idToken);
  await storageSave(SESSION_REFRESH_KEY, refreshToken);
}

/** Clear stored session and in-memory token (sign-out). */
export async function clearSession(): Promise<void> {
  _authToken = null;
  await storageDelete(SESSION_TOKEN_KEY);
  await storageDelete(SESSION_REFRESH_KEY);
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
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg",
    name: "ingredient-photo.jpg",
  } as any);

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
