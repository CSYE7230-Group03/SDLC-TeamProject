const {
  queryDocuments,
  addSubDocument,
  serverTimestamp,
} = require("../../../../../sdk/firebase/firestore");

const COLLECTION = "RecipeHistory";

/**
 * Save a recipe to a user's history.
 * Uses recipeId for deduplication — skips save if already exists.
 *
 * @param {string} userId
 * @param {Object} recipe - Recipe object from Spoonacular/OpenAI
 * @returns {Promise<{ saved: boolean, recipe?: Object }>}
 */
async function saveRecipe(userId, recipe) {
  if (!userId || !recipe || !recipe.id) {
    throw new Error("userId and recipe.id are required");
  }

  const subPath = `${COLLECTION}/${userId}/recipes`;
  const existing = await queryDocuments(subPath, { recipeId: recipe.id });

  if (existing.length > 0) {
    return { saved: false };
  }

  const doc = {
    recipeId: recipe.id,
    title: recipe.title,
    ...(recipe.image !== undefined && { image: recipe.image }),
    ...(recipe.readyInMinutes !== undefined && { readyInMinutes: recipe.readyInMinutes }),
    ...(recipe.servings !== undefined && { servings: recipe.servings }),
    ...(recipe.sourceUrl !== undefined && { sourceUrl: recipe.sourceUrl }),
    ...(recipe.summary !== undefined && { summary: recipe.summary }),
    ...(recipe.ingredients !== undefined && { ingredients: recipe.ingredients }),
    ...(recipe.instructions !== undefined && { instructions: recipe.instructions }),
    savedAt: serverTimestamp(),
  };

  const saved = await addSubDocument(COLLECTION, userId, "recipes", doc);
  return { saved: true, recipe: saved };
}

/**
 * Get all recipes in a user's history, sorted by savedAt descending.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getUserHistory(userId) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const subPath = `${COLLECTION}/${userId}/recipes`;
  const recipes = await queryDocuments(subPath);

  recipes.sort((a, b) => {
    const aTime = a.savedAt?.toMillis?.() ?? 0;
    const bTime = b.savedAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });

  return recipes;
}

module.exports = { saveRecipe, getUserHistory };
