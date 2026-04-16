const express = require("express");
const {
  createSession,
  getSession,
  editIngredient,
  removeIngredient,
  addIngredient,
  confirmSession,
  saveIngredientsBatch,
  updateIngredient,
  getUserInventory,
  deductIngredientsForRecipe
} = require("../services/inventoryService");
const { analyzeUserProfile } = require("../services/profileAnalysisService");
const { verifyFirebaseToken } = require("../lib/firebase/firestore");

const router = express.Router();

/**
 * @swagger
 * /inventory:
 *   get:
 *     summary: Get the authenticated user's ingredient inventory
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InventoryItem'
 *       401:
 *         description: Unauthorized
 *
 * /inventory/review:
 *   post:
 *     summary: Start an ingredient review session
 *     description: Creates an in-memory session from detected ingredients so the user can edit them before committing to inventory.
 *     tags: [Inventory]
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
 *                 items:
 *                   $ref: '#/components/schemas/DetectedIngredient'
 *     responses:
 *       201:
 *         description: Session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:     { type: boolean, example: true }
 *                 sessionId:   { type: string }
 *                 ingredients:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DetectedIngredient'
 *       400:
 *         description: Missing or empty ingredients
 *
 * /inventory/review/{sessionId}:
 *   get:
 *     summary: Get the current state of a review session
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Session data returned
 *       404:
 *         description: Session not found
 *
 * /inventory/review/{sessionId}/item/{ingredientId}:
 *   patch:
 *     summary: Edit an ingredient name in a pending session
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: ingredientId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "red onion" }
 *     responses:
 *       200:
 *         description: Ingredient updated
 *       404:
 *         description: Session or ingredient not found
 *   delete:
 *     summary: Remove an ingredient from a pending session
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: ingredientId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ingredient removed
 *       404:
 *         description: Session or ingredient not found
 *
 * /inventory/review/{sessionId}/item:
 *   post:
 *     summary: Add a new ingredient to a pending session
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "basil" }
 *     responses:
 *       201:
 *         description: Ingredient added
 *       404:
 *         description: Session not found
 *
 * /inventory/review/{sessionId}/confirm:
 *   post:
 *     summary: Confirm session and save ingredients to inventory
 *     description: Finalises the review session and writes all ingredients to Firestore. The session is destroyed afterwards.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ingredients saved to inventory
 *       404:
 *         description: Session not found
 *
 * /inventory/update:
 *   post:
 *     summary: Bulk-save ingredients directly to inventory
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/InventoryItem'
 *     responses:
 *       201:
 *         description: Ingredients saved
 *       400:
 *         description: No items provided
 *
 * /inventory/item/{itemId}:
 *   patch:
 *     summary: Update quantity, unit, or expiry date of an inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quant:      { type: number, example: 3 }
 *               unit:       { type: string, example: "kg" }
 *               expiryDate: { type: string, format: date, example: "2026-06-01" }
 *     responses:
 *       200:
 *         description: Item updated
 *       400:
 *         description: Validation error
 *
 * /inventory/cook:
 *   post:
 *     summary: Deduct ingredients after cooking a recipe
 *     description: Called when the user marks a recipe as cooked. Reduces inventory quantities accordingly.
 *     tags: [Inventory]
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
 *                 items:
 *                   $ref: '#/components/schemas/RecipeIngredient'
 *     responses:
 *       200:
 *         description: Inventory updated; returns deducted and skipped items
 *       400:
 *         description: Empty ingredients array
 *
 * /inventory/profile-analysis:
 *   get:
 *     summary: AI-based user profile analysis from fridge contents
 *     description: Analyses active inventory items to determine the user's cooking persona, diet type, and lifestyle.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile analysis returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:        { type: boolean, example: true }
 *                 ingredientCount: { type: integer }
 *                 analysis:
 *                   type: object
 *                   properties:
 *                     persona:       { type: string }
 *                     emoji:         { type: string }
 *                     description:   { type: string }
 *                     dietType:      { type: string }
 *                     cookingStyle:  { type: string }
 *                     healthScore:   { type: integer }
 *                     funFact:       { type: string }
 *       400:
 *         description: No ingredients in inventory
 */

/**
 * GET /inventory
 *
 * Retrieve all inventory items for the authenticated user.
 * Each item includes a computed isExpired boolean so the client
 * can clearly distinguish usable vs expired ingredients.
 *
 */
router.get("/", verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.userId;
    const items = await getUserInventory(userId);

    return res.status(200).json({
      success: true,
      items,
    });
  } catch (err) {
    console.error("[InventoryRoute] Error fetching inventory:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /inventory/review
 *
 * Start a new review session from a list of detected ingredients.
 * Returns a sessionId the client uses for subsequent edits.
 *
 * Request body:
 * { "ingredients": [{ "name": "tomato", "confidence": 0.94 }, ...] }
 */
router.post("/review", verifyFirebaseToken, async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: "ingredients is required and must be a non-empty array",
      });
    }

    const session = createSession(ingredients);

    return res.status(201).json({
      success: true,
      sessionId: session.sessionId,
      ingredients: session.ingredients,
    });
  } catch (err) {
    console.error("[InventoryRoute] Error creating review session:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /inventory/review/:sessionId
 *
 * Retrieve the current state of a review session.
 */
router.get("/review/:sessionId", verifyFirebaseToken, async (req, res) => {
  try {
    const items = getSession(req.params.sessionId);

    if (!items) {
      return res.status(404).json({
        success: false,
        error: "Session not found",
      });
    }

    return res.status(200).json({ success: true, ingredients: items });
  } catch (err) {
    console.error("[InventoryRoute] Error fetching session:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /inventory/review/:sessionId/item/:ingredientId
 *
 * Edit the name of an ingredient in a pending session.
 *
 * Request body:
 * { "name": "corrected ingredient name" }
 */
router.patch(
  "/review/:sessionId/item/:ingredientId",
  verifyFirebaseToken,
  async (req, res) => {
    try {
      const { sessionId, ingredientId } = req.params;
      const { name } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "name is required and must be a non-empty string",
        });
      }

      const result = editIngredient(sessionId, ingredientId, name.trim());

      if (!result.ingredients) {
        return res.status(404).json({ success: false, error: "Session not found" });
      }

      if (!result.updated) {
        return res.status(404).json({ success: false, error: "Ingredient not found" });
      }

      return res.status(200).json({
        success: true,
        ingredients: result.ingredients,
      });
    } catch (err) {
      console.error("[InventoryRoute] Error editing ingredient:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * DELETE /inventory/review/:sessionId/item/:ingredientId
 *
 * Remove an incorrect ingredient from a pending session.
 */
router.delete(
  "/review/:sessionId/item/:ingredientId",
  verifyFirebaseToken,
  async (req, res) => {
    try {
      const { sessionId, ingredientId } = req.params;
      const result = removeIngredient(sessionId, ingredientId);

      if (!result.ingredients) {
        return res.status(404).json({ success: false, error: "Session not found" });
      }

      if (!result.removed) {
        return res.status(404).json({ success: false, error: "Ingredient not found" });
      }

      return res.status(200).json({
        success: true,
        ingredients: result.ingredients,
      });
    } catch (err) {
      console.error("[InventoryRoute] Error removing ingredient:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * POST /inventory/review/:sessionId/item
 *
 * Add a new ingredient to a pending review session.
 *
 * Request body:
 * { "name": "new ingredient name" }
 */
router.post(
  "/review/:sessionId/item",
  verifyFirebaseToken,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { name } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "name is required and must be a non-empty string",
        });
      }

      const result = addIngredient(sessionId, name);

      if (!result.ingredients) {
        return res.status(404).json({ success: false, error: "Session not found" });
      }

      return res.status(201).json({
        success: true,
        ingredients: result.ingredients,
      });
    } catch (err) {
      console.error("[InventoryRoute] Error adding ingredient:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * POST /inventory/review/:sessionId/confirm
 *
 * Confirm the reviewed ingredients and finalize them into the inventory.
 * Destroys the pending session.
 */
router.post("/review/:sessionId/confirm", verifyFirebaseToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;
    const result = confirmSession(sessionId);

    if (!result.confirmed) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    // Map session ingredients to inventory format
    // Session has: { name, confidence, quantity, unit }
    // Inventory expects: { ingredientName, quant, unit }
    const inventoryItems = result.ingredients.map((ing) => ({
      ingredientName: ing.name,
      quant: ing.quantity || 1,
      unit: ing.unit || "item",
    }));

    //Saves the confirmed ingredient list to inventory
    const savedItems = await saveIngredientsBatch(
        userId,
        inventoryItems
      );

    return res.status(200).json({
      success: true,
      message: "Ingredients confirmed and finalized in inventory",
      ingredients: savedItems,
    });
  } catch (err) {
    console.error("[InventoryRoute] Error confirming ingredients:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /inventory/update
 *
 * Store userID and ingredient list to the inventory via firestore SDK
 *
 * Request body:
 * { "userID": "userID",
 *    "items": [{
      "ingredientName": "",
      "quant": ,
      "unit": "",
      "expiryDate": "",
      "s3Url": ""
    }] }
 */
router.post("/update", verifyFirebaseToken, async (req, res) => {
    try{
        const userId = req.userId;
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "No items to save in Inventory" });
        }

        const savedItems = await saveIngredientsBatch(userId, items);

        res.status(201).json({
            message: "Ingredients saved successfully",
            items: savedItems,
        });
      
    }catch(err){
        res.status(500).json({
            message: err.message || "Failed to save ingredients",
        });
    }
});

router.patch("/item/:itemId", verifyFirebaseToken, async(req, res) => {
  try{
    const userId = req.userId;
    const { itemId } = req.params;
    const { quant, unit, expiryDate } = req.body;
    console.log(req.body);

    if (quant === undefined && unit === undefined && expiryDate === undefined) {
      return res.status(400).json({
        success: false,
        error: "At least one field (quant, unit, expiryDate) is required",
      });
    }

    if (quant !== undefined && (typeof quant !== "number" || quant < 0)) {
      return res.status(400).json({
        success: false,
        error: "Quantity must be a non-negative number",
      });
    }

    if (expiryDate !== undefined && isNaN(Date.parse(expiryDate))) {
      return res.status(400).json({
        success: false,
        error: "ExpiryDate must be a valid date",
      });
    }

    const updated = await updateIngredient(userId, itemId, {
      quant,
      unit,
      expiryDate,
    });
    console.log(updated);

    return res.status(200).json({ success: true, item: updated });
  }catch(err){
    console.log("Error in patch")
  }
});

/**
 * POST /inventory/cook
 *
 * Deduct ingredients from inventory after cooking a recipe.
 * Called when user marks a recipe as "cooked" / "Start Cooking".
 *
 * Request body:
 * { "ingredients": [{ "name": "chicken", "amount": 2, "unit": "pieces" }, ...] }
 *
 * Response:
 * { success: true, deducted: [...], skipped: [...], errors: [...] }
 */
router.post("/cook", verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { ingredients } = req.body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: "ingredients array is required",
      });
    }

    const result = await deductIngredientsForRecipe(userId, ingredients);

    return res.status(200).json({
      success: true,
      message: "Inventory updated after cooking",
      ...result,
    });
  } catch (err) {
    console.error("[InventoryRoute] Error deducting ingredients:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /inventory/profile-analysis
 *
 * Analyze user profile based on their fridge ingredients.
 * Uses AI to determine lifestyle, diet type, cooking style, etc.
 */
router.get("/profile-analysis", verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.userId;
    const items = await getUserInventory(userId);
    
    // Get active ingredients only
    const activeIngredients = items
      .filter(item => item.quant > 0)
      .map(item => item.ingredientName);

    if (activeIngredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No ingredients in inventory to analyze",
      });
    }

    const analysis = await analyzeUserProfile(activeIngredients);

    return res.status(200).json({
      success: true,
      analysis,
      ingredientCount: activeIngredients.length,
    });
  } catch (err) {
    console.error("[InventoryRoute] Error analyzing profile:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
