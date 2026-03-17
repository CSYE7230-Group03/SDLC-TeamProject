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
  // Request more recipes than needed, then filter by fewest missing ingredients
  const fetchCount = Math.max(count * 3, 10);
  
  const searchResponse = await axios.get(
    `${SPOONACULAR_BASE_URL}/recipes/findByIngredients`,
    {
      params: {
        apiKey,
        ingredients: ingredientList,
        number: fetchCount,
        ranking: 1, // 1 = maximize used ingredients
        ignorePantry: true,
      },
      timeout: 10000,
    }
  );

  if (!searchResponse.data || searchResponse.data.length === 0) {
    return [];
  }

  // Sort by fewest missing ingredients, then by most used ingredients
  const sortedResults = searchResponse.data.sort((a, b) => {
    // Primary: fewer missing ingredients
    if (a.missedIngredientCount !== b.missedIngredientCount) {
      return a.missedIngredientCount - b.missedIngredientCount;
    }
    // Secondary: more used ingredients
    return b.usedIngredientCount - a.usedIngredientCount;
  });

  // Take only the top 'count' recipes with best ingredient match
  const topRecipes = sortedResults.slice(0, count);
  
  console.log(`[RecipeService] Found ${searchResponse.data.length} recipes, selected top ${count} with fewest missing ingredients`);
  topRecipes.forEach((r, i) => {
    console.log(`  ${i + 1}. "${r.title}" - used: ${r.usedIngredientCount}, missing: ${r.missedIngredientCount}`);
  });

  // Step 2: Get detailed info for each recipe
  const recipeIds = topRecipes.map((r) => r.id).join(",");

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
 * Generate recipes using OpenAI - PRIMARY method
 * Creates recipes using ONLY the provided ingredients
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

  const prompt = `Generate ${count} recipes using ONLY these ingredients: ${ingredients.join(", ")}.

STRICT RULES:
1. You may ONLY use ingredients from the provided list above
2. You may also use common pantry staples: salt, pepper, water, cooking oil, olive oil, butter, garlic, onion, soy sauce, ketchup, mayonnaise, mustard, vinegar, sugar, honey, lemon juice
3. Do NOT add any other ingredients not in the list or pantry staples
4. If you cannot make a complete recipe with the given ingredients, make a simpler dish
5. Be creative - even with limited ingredients, suggest practical dishes

${dietaryInfo}
Return JSON array with this format:
[{
  "title": "Recipe Name",
  "imageKeyword": "single word for image search (e.g. chicken, pasta, salad, steak, salmon, soup, curry, stir-fry, omelette, sandwich)",
  "readyInMinutes": 30,
  "servings": 2,
  "ingredients": [{"name": "ingredient", "amount": 1, "unit": "cup"}],
  "instructions": ["Step 1", "Step 2"],
  "diets": []
}]

IMPORTANT: imageKeyword must be a simple, common food word that describes the main dish type. Examples: chicken, beef, pasta, salad, salmon, soup, curry, steak, pork, shrimp, rice, noodle, omelette, sandwich, burger.

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
  
  // Remove markdown code blocks if present (```json ... ```)
  let jsonContent = content;
  if (jsonContent.startsWith("```")) {
    jsonContent = jsonContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  
  const recipes = JSON.parse(jsonContent);

  // Fetch images from Spoonacular (primary) with TheMealDB fallback
  const recipesWithImages = await Promise.all(
    recipes.map(async (recipe, index) => {
      let imageUrl = null;
      const keyword = recipe.imageKeyword || recipe.title.split(" ")[0];
      
      // Try Spoonacular first (best quality, exact match)
      try {
        const spoonacularKey = process.env.SPOONACULAR_API_KEY;
        if (spoonacularKey) {
          const searchRes = await axios.get(
            `${SPOONACULAR_BASE_URL}/recipes/complexSearch`,
            {
              params: {
                apiKey: spoonacularKey,
                query: keyword,
                number: 1,
              },
              timeout: 8000,
            }
          );
          
          if (searchRes.data.results && searchRes.data.results.length > 0) {
            imageUrl = searchRes.data.results[0].image;
            console.log(`[RecipeService] Spoonacular image for "${recipe.title}" (keyword: ${keyword})`);
          }
        }
      } catch (err) {
        // 402 = quota exceeded, try fallback
        if (err.response?.status === 402) {
          console.log(`[RecipeService] Spoonacular quota exceeded, using fallback`);
        } else {
          console.log(`[RecipeService] Spoonacular error: ${err.message}`);
        }
      }
      
      // Fallback to TheMealDB if Spoonacular failed
      if (!imageUrl) {
        try {
          const mealDbRes = await axios.get(
            `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(keyword)}`,
            { timeout: 5000 }
          );
          
          if (mealDbRes.data.meals && mealDbRes.data.meals.length > 0) {
            const randomIndex = index % mealDbRes.data.meals.length;
            imageUrl = mealDbRes.data.meals[randomIndex].strMealThumb;
            console.log(`[RecipeService] TheMealDB fallback for "${recipe.title}" (keyword: ${keyword})`);
          }
        } catch (err) {
          console.log(`[RecipeService] TheMealDB error: ${err.message}`);
        }
      }

      return {
        id: `openai-${Date.now()}-${index}`,
        title: recipe.title,
        image: imageUrl,
        readyInMinutes: recipe.readyInMinutes,
        servings: recipe.servings,
        sourceUrl: null,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        diets: recipe.diets || [],
        summary: null,
        source: "openai",
      };
    })
  );

  return recipesWithImages;
}

/**
 * Filter recipes based on user dietary preferences
 * @param {object[]} recipes
 * @param {object} preferences
 * @returns {object[]}
 */
function filterByPreferences(recipes, preferences) {
  if (!preferences) return recipes;

  let filtered = recipes;

  // Filter by max cooking time if provided
  if (preferences.maxCookingTime && Number.isFinite(Number(preferences.maxCookingTime))) {
    const max = Number(preferences.maxCookingTime);
    filtered = filtered.filter((r) => !r.readyInMinutes || r.readyInMinutes <= max);
  }

  // Filter by dietary restrictions (Spoonacular diets list)
  if (!preferences.restrictions || preferences.restrictions.length === 0) {
    return filtered;
  }

  return filtered.filter((recipe) => {
    const recipeDiets = recipe.diets.map((d) => d.toLowerCase());
    return preferences.restrictions.every((restriction) =>
      recipeDiets.includes(restriction.toLowerCase())
    );
  });
}

/**
 * Main recipe generation function
 * Uses OpenAI as primary (strict ingredient matching) with Spoonacular as fallback
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

  // Try OpenAI first - strict "only these ingredients" mode
  try {
    const recipes = await generateWithOpenAI(ingredients, preferences, count);
    if (recipes.length > 0) {
      console.log(`[RecipeService] Generated ${recipes.length} recipes with OpenAI (strict ingredient mode)`);
      return { recipes, source: "openai" };
    }
  } catch (err) {
    console.log("[RecipeService] OpenAI failed, trying Spoonacular fallback:", err.message);
  }

  // Fallback to Spoonacular (may include extra ingredients)
  try {
    const recipes = await searchByIngredients(ingredients, preferences, count);
    if (recipes.length > 0) {
      console.log(`[RecipeService] Fallback to Spoonacular - ${recipes.length} recipes (may have extra ingredients)`);
      return { recipes, source: "spoonacular" };
    }
  } catch (err) {
    console.log("[RecipeService] Spoonacular fallback also failed:", err.message);
  }

  throw new Error("Unable to generate recipes. All providers failed.");
}

module.exports = {
  generateRecipes,
  searchByIngredients,
  generateWithOpenAI,
  filterByPreferences,
};
