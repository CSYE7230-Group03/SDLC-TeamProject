const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5050";

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

/**
 * Create a review session from detected ingredients.
 */
export async function createReviewSession(
  ingredients: { name: string; confidence: number }[]
): Promise<SessionResponse> {
  const res = await fetch(`${API_BASE_URL}/inventory/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients }),
  });
  return res.json();
}

/**
 * Get the current state of a review session.
 */
export async function getReviewSession(
  sessionId: string
): Promise<IngredientsResponse> {
  const res = await fetch(
    `${API_BASE_URL}/inventory/review/${sessionId}`
  );
  return res.json();
}

/**
 * Edit an ingredient name in a review session.
 */
export async function editIngredientName(
  sessionId: string,
  ingredientId: string,
  name: string
): Promise<IngredientsResponse> {
  const res = await fetch(
    `${API_BASE_URL}/inventory/review/${sessionId}/item/${ingredientId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }
  );
  return res.json();
}

/**
 * Remove an ingredient from a review session.
 */
export async function removeIngredient(
  sessionId: string,
  ingredientId: string
): Promise<IngredientsResponse> {
  const res = await fetch(
    `${API_BASE_URL}/inventory/review/${sessionId}/item/${ingredientId}`,
    { method: "DELETE" }
  );
  return res.json();
}

/**
 * Confirm the review session and finalize ingredients in inventory.
 */
export async function confirmIngredients(
  sessionId: string
): Promise<IngredientsResponse> {
  const res = await fetch(
    `${API_BASE_URL}/inventory/review/${sessionId}/confirm`,
    { method: "POST" }
  );
  return res.json();
}

/**
 * Add a new ingredient to a review session.
 */
export async function addIngredient(
  sessionId: string,
  name: string
): Promise<IngredientsResponse> {
  const res = await fetch(
    `${API_BASE_URL}/inventory/review/${sessionId}/item`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }
  );
  return res.json();
}

/**
 * Detect ingredients from an image via photo upload.
 */
export async function detectIngredients(imageUri: string): Promise<DetectionResponse> {
  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg",
    name: "ingredient-photo.jpg",
  } as any);

  const res = await fetch(`${API_BASE_URL}/ingredients/photo`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

/**
 * Generate recipes from a list of ingredients.
 */
export async function generateRecipes(
  ingredients: string[],
  preferences?: { restrictions?: string[]; maxCookingTime?: number },
  count: number = 3
): Promise<RecipeResponse> {
  const res = await fetch(`${API_BASE_URL}/recipes/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients, preferences, count }),
  });
  return res.json();
}
