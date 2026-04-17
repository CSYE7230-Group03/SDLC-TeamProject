const {
  queryDocuments,
  addSubDocument,
  serverTimestamp,
} = require("../lib/firebase/firestore");

const { getFirestore } = require("../lib/firebase/index");

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


/**
 * Get the most popular recipes across ALL users.
 * Aggregates recipe titles from all users' history and returns top N.
 *
 * @param {number} limit - Number of top recipes to return
 * @returns {Promise<Array>}
 */
async function getPopularRecipes(limit = 3) {
  const db = getFirestore();

  // Use collectionGroup to query ALL recipes subcollections across all users
  const allRecipesSnapshot = await db.collectionGroup("recipes").get();
  console.log("[Popular] Total recipes across all users:", allRecipesSnapshot.docs.length);

  const recipeCount = new Map(); // title -> { count, recipe }

  for (const recipeDoc of allRecipesSnapshot.docs) {
    // Only include docs under RecipeHistory (not other collections with "recipes" subcollection)
    if (!recipeDoc.ref.path.startsWith(COLLECTION + "/")) continue;

    const data = recipeDoc.data();
    const key = data.title?.toLowerCase();
    if (!key) continue;

    if (recipeCount.has(key)) {
      recipeCount.get(key).count++;
    } else {
      recipeCount.set(key, {
        count: 1,
        recipe: {
          id: data.recipeId || recipeDoc.id,
          title: data.title,
          image: data.image,
          readyInMinutes: data.readyInMinutes,
          servings: data.servings,
          ingredients: data.ingredients,
          instructions: data.instructions,
        },
      });
    }
  }

  // Sort by count descending, return top N
  return Array.from(recipeCount.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((entry) => ({ ...entry.recipe, cookedCount: entry.count }));
}

module.exports = { saveRecipe, getUserHistory, getPopularRecipes };
