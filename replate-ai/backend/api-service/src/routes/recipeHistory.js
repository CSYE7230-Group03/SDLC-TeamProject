const express = require("express");
const { saveRecipe, getUserHistory, getPopularRecipes } = require("../services/recipeHistoryService");

const router = express.Router();

/**
 * @swagger
 * /recipe-history:
 *   post:
 *     summary: Save a recipe to the user's history
 *     description: Silently skips if the recipe is already saved (dedup by recipeId).
 *     tags: [Recipe History]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipe]
 *             properties:
 *               recipe:
 *                 $ref: '#/components/schemas/Recipe'
 *     responses:
 *       201:
 *         description: Recipe saved (or already existed)
 *       400:
 *         description: Missing recipe or recipe.id
 *
 *   get:
 *     summary: Get all saved recipes for the authenticated user
 *     description: Returns recipes ordered by savedAt descending.
 *     tags: [Recipe History]
 *     responses:
 *       200:
 *         description: Recipe history returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 recipes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Recipe'
 *
 * /recipe-history/popular:
 *   get:
 *     summary: Get the top 3 most popular recipes across all users
 *     tags: [Recipe History]
 *     security: []
 *     responses:
 *       200:
 *         description: Popular recipes returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 recipes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Recipe'
 */

// PLACEHOLDER: Replace with placeholderAuth from sdk/firebase/firestore.js once auth (#33) is merged.
// Usage: router.post("/", placeholderAuth, async (req, res) => { ... })
function placeholderAuth(req, res, next) {
  req.userId = "placeholder-user";
  next();
}

/**
 * POST /recipe-history
 *
 * Save a recipe to the authenticated user's history.
 * Skips silently if the recipe is already saved (dedup by recipeId).
 *
 * Request body:
 * { "recipe": { id, title, image?, readyInMinutes?, ... } }
 */
router.post("/", placeholderAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { recipe } = req.body;

    if (!recipe || typeof recipe !== "object" || !recipe.id) {
      return res.status(400).json({
        success: false,
        error: "recipe with an id is required",
      });
    }

    const result = await saveRecipe(userId, recipe);
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    console.error("[RecipeHistoryRoute] Error saving recipe:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /recipe-history/popular
 *
 * Get the most popular recipes across all users (top 3).
 */
router.get("/popular", async (req, res) => {
  try {
    const recipes = await getPopularRecipes(3);
    return res.status(200).json({ success: true, recipes });
  } catch (err) {
    console.error("[RecipeHistoryRoute] Error fetching popular:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /recipe-history
 *
 * Retrieve all saved recipes for the authenticated user,
 * ordered by savedAt descending.
 */
router.get("/", placeholderAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const recipes = await getUserHistory(userId);
    return res.status(200).json({ success: true, recipes });
  } catch (err) {
    console.error("[RecipeHistoryRoute] Error fetching history:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
