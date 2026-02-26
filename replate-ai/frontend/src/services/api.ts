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
