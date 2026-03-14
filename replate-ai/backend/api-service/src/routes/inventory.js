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
  getUserInventory
} = require("../services/inventoryService");
const { verifyFirebaseToken } = require("../../../../../sdk/firebase/firestore");

const router = express.Router();


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
router.post("/review", async (req, res) => {
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
router.get("/review/:sessionId", async (req, res) => {
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

    //Saves the confirmed ingredient list to inventory
    const savedItems = await saveIngredientsBatch(
        userId,
        result.ingredients
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

module.exports = router;
