const express = require("express");
const { generateOrderRequest, getAvailableProviders } = require("../services/groceryOrderService");
const { normalizeIngredientList } = require("../services/ingredientNormalizationService");
const { searchProducts } = require("../services/walmartService");

const router = express.Router();

/**
 * POST /grocery-order/generate
 * Generate a provider-agnostic grocery order from ingredients.
 *
 * Body: { ingredients: [{ name, amount, unit }], provider?: "walmart" }
 */
router.post("/generate", async (req, res) => {
  const { ingredients, provider = "walmart" } = req.body;

  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ success: false, error: "ingredients array is required" });
  }

  try {
    const order = await generateOrderRequest(ingredients, provider);
    return res.json({ success: true, order });
  } catch (err) {
    console.error("[GroceryOrder] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /grocery-order/normalize
 * Normalize ingredients without ordering.
 *
 * Body: { ingredients: [{ name, amount, unit }] }
 */
router.post("/normalize", async (req, res) => {
  const { ingredients } = req.body;

  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ success: false, error: "ingredients array is required" });
  }

  try {
    const normalized = normalizeIngredientList(ingredients);
    return res.json({ success: true, normalized });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /grocery-order/search?q=chicken
 * Search Walmart products directly.
 */
router.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ success: false, error: "q query param is required" });

  try {
    const products = await searchProducts(q, 5);
    return res.json({ success: true, products });
  } catch (err) {
    console.error("[GroceryOrder] Search error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /grocery-order/providers
 * List available grocery providers.
 */
router.get("/providers", (req, res) => {
  const providers = getAvailableProviders();
  return res.json({ success: true, providers });
});

module.exports = router;
