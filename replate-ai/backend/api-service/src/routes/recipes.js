const express = require("express");
const { generateRecipes } = require("../services/recipeService");

const router = express.Router();

/**
 * POST /recipes/generate
 *
 * Generate personalized recipe suggestions based on confirmed ingredients
 * and user preferences.
 *
 * Request body:
 * {
 *   "ingredients": ["chicken", "rice", "onion"],
 *   "preferences": {
 *     "restrictions": ["gluten free"],
 *     "maxCookingTime": 30
 *   },
 *   "count": 3
 * }
 */
router.post("/generate", async (req, res) => {
  try {
    const { ingredients, preferences, count } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        error: "ingredients is required and must be a non-empty array",
      });
    }

    const result = await generateRecipes(ingredients, preferences || {}, count || 3);

    return res.status(200).json({
      success: true,
      source: result.source,
      count: result.recipes.length,
      recipes: result.recipes,
    });
  } catch (err) {
    console.error("[RecipeRoute] Error generating recipes:", err.message);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
