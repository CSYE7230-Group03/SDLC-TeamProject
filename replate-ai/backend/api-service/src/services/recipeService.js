const axios = require("axios");

const SPOONACULAR_BASE_URL = "https://api.spoonacular.com";

/**
 * Search recipes by ingredients using Spoonacular API
 * @param {string[]} ingredients - List of ingredient names
 * @param {object} preferences - User dietary preferences
 * @param {number} [count=3] - Number of recipes to return
 * @returns {Promise<object[]>} Array of recipe objects
 */
async function searchByIngredients(ingredients, preferences = {}, count = 3) {
  const apiKey = process.env.SPOONACULAR_API_KEY;

  if (!apiKey) {
    throw new Error("SPOONACULAR_API_KEY is not configured");
  }

  const ingredientList = ingredients.join(",");

  // Step 1: Find recipes by ingredients
  const searchResponse = await axios.get(
    `${SPOONACULAR_BASE_URL}/recipes/findByIngredients`,
    {
      params: {
        apiKey,
        ingredients: ingredientList,
        number: count,
        ranking: 1, // maximize used ingredients
        ignorePantry: true,
      },
      timeout: 10000,
    }
  );

  if (!searchResponse.data || searchResponse.data.length === 0) {
    return [];
  }

  // Step 2: Get detailed info for each recipe
  const recipeIds = searchResponse.data.map((r) => r.id).join(",");

  const detailResponse = await axios.get(
    `${SPOONACULAR_BASE_URL}/recipes/informationBulk`,
    {
      params: {
        apiKey,
        ids: recipeIds,
        includeNutrition: false,
      },
      timeout: 10000,
    }
  );

  // Step 3: Map to our format and apply preference filtering
  const recipes = detailResponse.data.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    readyInMinutes: recipe.readyInMinutes,
    servings: recipe.servings,
    sourceUrl: recipe.sourceUrl,
    ingredients: recipe.extendedIngredients.map((ing) => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
    })),
    instructions: recipe.analyzedInstructions.length > 0
      ? recipe.analyzedInstructions[0].steps.map((s) => s.step)
      : [],
    diets: recipe.diets || [],
    summary: recipe.summary,
  }));

  return filterByPreferences(recipes, preferences);
}

/**
 * Generate recipes using OpenAI as fallback
 * @param {string[]} ingredients - List of ingredient names
 * @param {object} preferences - User dietary preferences
 * @param {number} [count=3] - Number of recipes to return
 * @returns {Promise<object[]>} Array of recipe objects
 */
async function generateWithOpenAI(ingredients, preferences = {}, count = 3) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const dietaryInfo = preferences.restrictions
    ? `Dietary restrictions: ${preferences.restrictions.join(", ")}.`
    : "";

  const prompt = `Generate ${count} recipes using these ingredients: ${ingredients.join(", ")}.
${dietaryInfo}
Return JSON array with this format:
[{
  "title": "Recipe Name",
  "readyInMinutes": 30,
  "servings": 2,
  "ingredients": [{"name": "ingredient", "amount": 1, "unit": "cup"}],
  "instructions": ["Step 1", "Step 2"],
  "diets": []
}]
Only return valid JSON, no other text.`;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful cooking assistant. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const content = response.data.choices[0].message.content.trim();
  const recipes = JSON.parse(content);

  return recipes.map((recipe, index) => ({
    id: `openai-${Date.now()}-${index}`,
    title: recipe.title,
    image: null,
    readyInMinutes: recipe.readyInMinutes,
    servings: recipe.servings,
    sourceUrl: null,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    diets: recipe.diets || [],
    summary: null,
    source: "openai",
  }));
}

/**
 * Filter recipes based on user dietary preferences
 * @param {object[]} recipes
 * @param {object} preferences
 * @returns {object[]}
 */
function filterByPreferences(recipes, preferences) {
  if (!preferences || !preferences.restrictions || preferences.restrictions.length === 0) {
    return recipes;
  }

  return recipes.filter((recipe) => {
    const recipeDiets = recipe.diets.map((d) => d.toLowerCase());
    return preferences.restrictions.every((restriction) =>
      recipeDiets.includes(restriction.toLowerCase())
    );
  });
}

/**
 * Main recipe generation function with fallback strategy
 * Spoonacular -> OpenAI -> Error
 *
 * @param {string[]} ingredients - Confirmed ingredient list
 * @param {object} preferences - User dietary preferences
 * @param {number} [count=3] - Number of recipes
 * @returns {Promise<{recipes: object[], source: string}>}
 */
async function generateRecipes(ingredients, preferences = {}, count = 3) {
  if (!ingredients || ingredients.length === 0) {
    throw new Error("Ingredient list is required");
  }

  // Try Spoonacular first
  try {
    const recipes = await searchByIngredients(ingredients, preferences, count);
    if (recipes.length > 0) {
      return { recipes, source: "spoonacular" };
    }
  } catch (err) {
    console.log("[RecipeService] Spoonacular failed, trying OpenAI fallback:", err.message);
  }

  // Fallback to OpenAI
  try {
    const recipes = await generateWithOpenAI(ingredients, preferences, count);
    return { recipes, source: "openai" };
  } catch (err) {
    console.log("[RecipeService] OpenAI fallback also failed:", err.message);
  }

  throw new Error("Unable to generate recipes. All providers failed.");
}

module.exports = {
  generateRecipes,
  searchByIngredients,
  generateWithOpenAI,
  filterByPreferences,
};
