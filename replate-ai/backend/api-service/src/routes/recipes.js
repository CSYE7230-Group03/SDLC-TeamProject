const express = require("express");
const { generateRecipes } = require("../services/recipeService");
const { verifyFirebaseToken, readDocument } = require("../../../../../sdk/firebase/firestore");

const router = express.Router();

/**
 * @swagger
 * /recipes/generate:
 *   post:
 *     summary: Generate AI-powered recipe suggestions
 *     description: >
 *       Generates personalised recipe suggestions based on provided ingredients
 *       and the authenticated user's dietary preferences. If no preferences are
 *       supplied in the request body, they are loaded automatically from the
 *       user's Firestore profile.
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ingredients]
 *             properties:
 *               ingredients:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["chicken", "rice", "onion"]
 *               preferences:
 *                 type: object
 *                 description: Optional dietary preferences (loaded from profile if omitted)
 *                 properties:
 *                   restrictions:
 *                     type: array
 *                     items: { type: string }
 *                   maxCookingTime: { type: integer, example: 30 }
 *               count:
 *                 type: integer
 *                 description: Number of recipes to generate (default 3)
 *                 example: 5
 *     responses:
 *       200:
 *         description: Recipes generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 source:  { type: string, example: "spoonacular" }
 *                 count:   { type: integer, example: 3 }
 *                 recipes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Recipe'
 *       400:
 *         description: Missing or empty ingredients array
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized – invalid or missing Bearer token
 */

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
router.post("/generate", verifyFirebaseToken, async (req, res) => {
  try {
    const { ingredients, preferences, count } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        error: "ingredients is required and must be a non-empty array",
      });
    }

    // If the client didn't provide preferences, load them from the user's profile.
    let resolvedPreferences = preferences;
    const noPrefsProvided =
      !resolvedPreferences ||
      (typeof resolvedPreferences === "object" && Object.keys(resolvedPreferences).length === 0);

    if (noPrefsProvided) {
      const userDoc = await readDocument("Users", req.userId);
      resolvedPreferences = userDoc?.dietaryPreferences || {};
    }

    const result = await generateRecipes(ingredients, resolvedPreferences || {}, count || 3);

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
