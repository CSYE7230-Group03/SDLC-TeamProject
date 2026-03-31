'use strict';

const express = require('express');
const {
  createGroceryList,
  createAggregatedGroceryList,
  getGroceryList,
  getUserGroceryLists,
  toggleItemAvailability,
  addGroceryItem,
  deleteGroceryItem,
  updateGroceryItemQuantity,
} = require('../services/groceryListService');
const { verifyFirebaseToken } = require('../../../../../sdk/firebase/firestore');

const router = express.Router();

/**
 * POST /grocery-list
 *
 * Create a new grocery list from a recipe's missing ingredients.
 *
 * Request body:
 * {
 *   "recipeId": "string",
 *   "recipeTitle": "string",
 *   "missingIngredients": [{ "name": "string", "amount": number, "unit": "string" }]
 * }
 *
 * Response 201:
 * { "success": true, "list": { ... } }
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const { recipeId, recipeTitle, missingIngredients } = req.body;

    if (!recipeId || !recipeTitle || !missingIngredients) {
      return res.status(400).json({
        success: false,
        error: 'recipeId, recipeTitle, and missingIngredients are required',
      });
    }

    const list = await createGroceryList(req.userId, {
      recipeId,
      recipeTitle,
      missingIngredients,
    });

    return res.status(201).json({ success: true, list });
  } catch (err) {
    console.error('[GroceryListRoute] Error creating grocery list:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /grocery-list/aggregate
 *
 * Create a single consolidated grocery list from multiple recipes.
 * Ingredients with the same name and unit are merged and their
 * quantities summed, satisfying the aggregation acceptance criteria.
 *
 * Request body:
 * {
 *   "recipes": [
 *     {
 *       "recipeId": "string|number",
 *       "recipeTitle": "string",
 *       "ingredients": [{ "name": "string", "amount": number, "unit": "string" }]
 *     }
 *   ]
 * }
 *
 * Response 201:
 * { "success": true, "list": { ... } }
 */
router.post('/aggregate', verifyFirebaseToken, async (req, res) => {
  try {
    const { recipes } = req.body;

    if (!Array.isArray(recipes) || recipes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'recipes must be a non-empty array',
      });
    }

    for (const r of recipes) {
      if (!r.recipeId || !r.recipeTitle || !Array.isArray(r.ingredients)) {
        return res.status(400).json({
          success: false,
          error: 'each recipe must have recipeId, recipeTitle, and an ingredients array',
        });
      }
    }

    const list = await createAggregatedGroceryList(req.userId, { recipes });
    return res.status(201).json({ success: true, list });
  } catch (err) {
    console.error('[GroceryListRoute] Error creating aggregated grocery list:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /grocery-list
 *
 * Get all grocery lists for the authenticated user.
 *
 * Response 200:
 * { "success": true, "lists": [ ... ] }
 */
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const lists = await getUserGroceryLists(req.userId);
    return res.status(200).json({ success: true, lists });
  } catch (err) {
    console.error('[GroceryListRoute] Error fetching grocery lists:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /grocery-list/:listId
 *
 * Get a specific grocery list by ID.
 *
 * Response 200:
 * { "success": true, "list": { ... } }
 *
 * Response 404:
 * { "success": false, "error": "Grocery list not found" }
 */
router.get('/:listId', verifyFirebaseToken, async (req, res) => {
  try {
    const list = await getGroceryList(req.userId, req.params.listId);

    if (!list) {
      return res.status(404).json({ success: false, error: 'Grocery list not found' });
    }

    return res.status(200).json({ success: true, list });
  } catch (err) {
    console.error('[GroceryListRoute] Error fetching grocery list:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /grocery-list/:listId/item/:itemId/toggle
 *
 * Toggle the isAvailableAtHome flag for a specific item.
 * Items marked available are excluded from the grocery order
 * but remain visible in the list.
 *
 * Response 200:
 * { "success": true, "item": { "id": "...", "isAvailableAtHome": true, ... } }
 *
 * Response 404:
 * { "success": false, "error": "Grocery list not found" }
 */
router.patch('/:listId/item/:itemId/toggle', verifyFirebaseToken, async (req, res) => {
  try {
    const { listId, itemId } = req.params;
    const item = await toggleItemAvailability(req.userId, listId, itemId);
    return res.status(200).json({ success: true, item });
  } catch (err) {
    const isNotFound =
      err.message === 'Grocery list not found' ||
      err.message === 'Item not found in grocery list';

    if (isNotFound) {
      return res.status(404).json({ success: false, error: err.message });
    }

    console.error('[GroceryListRoute] Error toggling item availability:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /grocery-list/:listId/item
 *
 * Add a new ingredient to an existing grocery list.
 *
 * Request body:
 * { "name": "string", "amount": number, "unit": "string" }
 *
 * Response 201:
 * { "success": true, "item": { "id": "...", "name": "...", "amount": number, "unit": "...", "isAvailableAtHome": false } }
 *
 * Response 404:
 * { "success": false, "error": "Grocery list not found" }
 */
router.post('/:listId/item', verifyFirebaseToken, async (req, res) => {
  try {
    const { name, amount, unit } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    const item = await addGroceryItem(req.userId, req.params.listId, { name, amount, unit });
    return res.status(201).json({ success: true, item });
  } catch (err) {
    if (err.message === 'Grocery list not found') {
      return res.status(404).json({ success: false, error: err.message });
    }

    console.error('[GroceryListRoute] Error adding grocery item:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /grocery-list/:listId/item/:itemId
 *
 * Remove an ingredient from a grocery list.
 *
 * Response 200:
 * { "success": true, "item": { "id": "...", ... } }
 *
 * Response 404:
 * { "success": false, "error": "Grocery list not found" | "Item not found in grocery list" }
 */
router.delete('/:listId/item/:itemId', verifyFirebaseToken, async (req, res) => {
  try {
    const { listId, itemId } = req.params;
    const item = await deleteGroceryItem(req.userId, listId, itemId);
    return res.status(200).json({ success: true, item });
  } catch (err) {
    const isNotFound =
      err.message === 'Grocery list not found' ||
      err.message === 'Item not found in grocery list';

    if (isNotFound) {
      return res.status(404).json({ success: false, error: err.message });
    }

    console.error('[GroceryListRoute] Error deleting grocery item:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /grocery-list/:listId/item/:itemId
 *
 * Update the quantity of an existing grocery list item.
 *
 * Request body:
 * { "amount": number }
 *
 * Response 200:
 * { "success": true, "item": { "id": "...", "amount": number, ... } }
 *
 * Response 404:
 * { "success": false, "error": "Grocery list not found" | "Item not found in grocery list" }
 */
router.patch('/:listId/item/:itemId', verifyFirebaseToken, async (req, res) => {
  try {
    const { listId, itemId } = req.params;
    const { amount } = req.body;

    if (amount === undefined || typeof amount !== 'number') {
      return res.status(400).json({ success: false, error: 'amount must be a number' });
    }

    const item = await updateGroceryItemQuantity(req.userId, listId, itemId, amount);
    return res.status(200).json({ success: true, item });
  } catch (err) {
    const isNotFound =
      err.message === 'Grocery list not found' ||
      err.message === 'Item not found in grocery list';

    if (isNotFound) {
      return res.status(404).json({ success: false, error: err.message });
    }

    console.error('[GroceryListRoute] Error updating grocery item quantity:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
