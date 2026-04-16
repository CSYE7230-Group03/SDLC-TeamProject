/**
 * Inventory service.
 *
 * Manages pending ingredient review sessions. Sessions hold detected
 * ingredients while the user reviews, edits, and removes items.
 * Once confirmed, the finalized list is returned and the session
 * is discarded.
 */

const crypto = require("crypto");
// const admin = require("firebase-admin");
const { createDocument, addSubDocument, serverTimestamp, queryDocuments, updateSubDocument} = require("../lib/firebase/firestore");
// const { getFirestore } = require("../lib/firebase/index");

// In-memory store keyed by sessionId.
const pendingSessions = new Map();

const DEFAULT_EXPIRY = "2099-12-12";

function checkIsExpired(expiryDate) {
  if (!expiryDate || expiryDate === DEFAULT_EXPIRY) return false;
  return new Date(expiryDate) < new Date();
}

/**
 * Create a new review session from detected ingredients.
 *
 * @param {Array<{ name: string, confidence: number, quantity?: number, unit?: string }>} ingredients
 * @returns {{ sessionId: string, ingredients: Array<{ id: string, name: string, confidence: number, quantity?: number, unit?: string }> }}
 */
function createSession(ingredients) {
  const sessionId = crypto.randomUUID();
  const items = ingredients.map((ing) => ({
    id: crypto.randomUUID(),
    name: ing.name,
    confidence: ing.confidence,
    quantity: ing.quantity || 1,
    unit: ing.unit || "item",
  }));
  pendingSessions.set(sessionId, items);
  return { sessionId, ingredients: items };
}

function getSession(sessionId) {
  return pendingSessions.get(sessionId) || null;
}

function editIngredient(sessionId, ingredientId, newName) {
  const items = pendingSessions.get(sessionId);
  if (!items) return { updated: false, ingredients: null };

  const item = items.find((i) => i.id === ingredientId);
  if (!item) return { updated: false, ingredients: items };

  item.name = newName;
  return { updated: true, ingredients: items };
}

function removeIngredient(sessionId, ingredientId) {
  const items = pendingSessions.get(sessionId);
  if (!items) return { removed: false, ingredients: null };

  const idx = items.findIndex((i) => i.id === ingredientId);
  if (idx === -1) return { removed: false, ingredients: items };

  items.splice(idx, 1);
  return { removed: true, ingredients: items };
}

function addIngredient(sessionId, name) {
  const items = pendingSessions.get(sessionId);
  if (!items) return { added: false, ingredients: null };

  const item = {
    id: crypto.randomUUID(),
    name: name.trim().toLowerCase(),
    confidence: 1.0,
  };
  items.push(item);
  return { added: true, ingredients: items };
}

/**
 * Confirm a session: returns the final ingredient list and
 * removes the session from memory.
 */
function confirmSession(sessionId) {
  const items = pendingSessions.get(sessionId);
  if (!items) return { confirmed: false, ingredients: null };

  // TODO: persist confirmed ingredients to Firestore via sdk/firebase/firestore
  // (see sequence diagram: POST /inventory/update -> DB save)
  // Added this functionality in routes
  pendingSessions.delete(sessionId);
  return { confirmed: true, ingredients: items };
}

/**
 * Saves a new ingredient to a user's inventory in Firestore.
 *
 * Workflow:
 * 1. Ensures the user's main inventory document exists.
 * 2. Checks the "items" subcollection to prevent duplicate ingredients
 *    (based on lowercase ingredient name).
 * 3. Constructs a normalized ingredient object with default values.
 * 4. Adds the ingredient as a new document inside:
 *      IngredientInventory/{userId}/items
 *
 * @param {string} userId - The unique identifier of the user.
 * @param {Object} ingredient - The ingredient details to be saved.
 * @param {string} ingredient.ingredientName - Name of the ingredient.
 * @param {number} [ingredient.quant=1] - Quantity of the ingredient.
 * @param {string} [ingredient.unit="unit"] - Unit of measurement.
 * @param {string|Date} [ingredient.expiryDate=DEFAULT_EXPIRY] - Expiration date.
 * @param {string|null} [ingredient.s3Url=null] - Optional S3 image URL.
 */
async function saveIngredient(userId, ingredient) {

    // 1. Ensure user inventory doc exists
    await createDocument("IngredientInventory", userId, {
        createdAt: serverTimestamp()
    });

    // 2. Check duplicate in subcollection
    const existingItems = await queryDocuments(
        `IngredientInventory/${userId}/items`,
        { ingredientName: ingredient.ingredientName.toLowerCase() }
    );

    if (existingItems.length > 0) {
        throw new Error("Ingredient already exists");
    }

    // 3️. Create item
    const newItem = {
        ingredientName: ingredient.ingredientName.toLowerCase().trim(),
        quant: ingredient.quant || 1,
        unit: ingredient.unit || "unit",
        expiryDate: ingredient.expiryDate || DEFAULT_EXPIRY,
        isExpired: checkIsExpired(ingredient.expiryDate),
        s3Url: ingredient.s3Url || null,
        createdAt: serverTimestamp()
    };

    // 4️. Save in subcollection
    return await addSubDocument(
        "IngredientInventory",
        userId,
        "items",
        newItem
    );
}

/**
 * Saves multiple ingredients to a user's inventory in Firestore.
 *
 * Workflow:
 * 1. Iterates through the provided list of ingredient objects.
 * 2. Calls `saveIngredient` for each item to:
 *    - Ensure the user inventory document exists.
 *    - Prevent duplicate ingredients.
 *    - Save the ingredient in the "items" subcollection.
 * 3. Collects all successfully saved ingredient documents.
 *
 * @param {string} userId - The unique identifier of the user.
 * @param {Array<Object>} items - Array of ingredient objects to be saved.
 */
async function saveIngredientsBatch(userId, items) {
    const savedItems = [];
    const skippedItems = [];
    for (const item of items) {
      try {
        const saved = await saveIngredient(userId, {
          ingredientName: item.ingredientName,
          quant: item.quant,
          unit: item.unit,
          expiryDate: item.expiryDate,
          s3Url: item.s3Url || null,
        });
        savedItems.push(saved);
      } catch (err) {
        // Skip duplicates, log for debugging
        if (err.message === "Ingredient already exists") {
          console.log(`[InventoryService] Skipping duplicate: ${item.ingredientName}`);
          skippedItems.push(item.ingredientName);
        } else {
          throw err; // Re-throw non-duplicate errors
        }
      }
    }
  
    if (skippedItems.length > 0) {
      console.log(`[InventoryService] Skipped ${skippedItems.length} duplicates: ${skippedItems.join(", ")}`);
    }
  
    return savedItems;
}

async function updateIngredient(userId, itemId, updates){
  const path = `IngredientInventory/${userId}/items/`;
  const updateData = {};

  if(updates.quant !== undefined) updateData.quant = updates.quant;

  if(updates.unit !== undefined) updateData.unit = updates.unit;

  if(updates.expiryDate !== undefined) {
    updateData.expiryDate = updates.expiryDate;
    updateData.isExpired = checkIsExpired(updates.expiryDate);
  }

  updateData.updatedAt = serverTimestamp();

  return await updateSubDocument(path, itemId, updateData);
}

/**
 * Fetches all inventory items for a user and recomputes expiry status.
 *
 * Why recompute at read time?
 * An item saved yesterday with expiryDate "2026-03-13" was not expired then,
 * but IS expired today. Recomputing avoids stale isExpired flags without
 * needing a background job.
 *
 * Also updates Firestore if any item's isExpired flag has gone stale,
 * so the DB stays consistent.
 *
 * @param {string} userId
 * @returns {Promise<Array<Object>>} items with accurate isExpired flags
 */
async function getUserInventory(userId) {
  const path = `IngredientInventory/${userId}/items`;
  const items = await queryDocuments(path, {});

  const results = [];

  for (const item of items) {
    const currentExpired = checkIsExpired(item.expiryDate);

    // If the stored flag is stale, update it in Firestore
    if (item.isExpired !== currentExpired) {
      await updateSubDocument(path, item.id, {
        isExpired: currentExpired,
        updatedAt: serverTimestamp(),
      });
    }

    results.push({
      ...item,
      isExpired: currentExpired,
    });
  }

  return results;
}

/**
 * Normalize ingredient name for matching
 */
function normalizeIngredientName(name) {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Deduct ingredients from user's inventory after cooking a recipe.
 * 
 * Matching logic:
 * - Uses fuzzy substring matching (same as feasibility check)
 * - Pantry staples are skipped (assumed always available)
 * 
 * Graceful handling:
 * - If ingredient not found in inventory, skip it (don't fail)
 * - If quantity insufficient, set to 0 (don't go negative)
 * - If quantity becomes 0, keep the item (user can refill later)
 * 
 * @param {string} userId - User ID
 * @param {Array<{name: string, amount: number, unit: string}>} recipeIngredients - Recipe ingredients
 * @returns {Promise<{deducted: Array, skipped: Array, errors: Array}>}
 */
async function deductIngredientsForRecipe(userId, recipeIngredients) {
  const path = `IngredientInventory/${userId}/items`;
  const inventory = await queryDocuments(path, {});
  
  // Pantry staples - skip these (assumed always available)
  const PANTRY_STAPLES = [
    "salt", "pepper", "blackpepper", "water", "oil", "cookingoil", "oliveoil",
    "vegetableoil", "butter", "garlic", "onion", "soysauce", "ketchup",
    "mayonnaise", "mustard", "vinegar", "sugar", "honey", "lemonjuice",
    "flour", "rice", "pasta", "spaghetti", "noodles", "bread", "egg", "eggs",
    "milk", "cream", "cheese", "parmesan", "ginger", "cumin", "paprika",
    "oregano", "basil", "thyme", "rosemary", "cinnamon", "nutmeg"
  ].map(normalizeIngredientName);

  const deducted = [];
  const skipped = [];
  const errors = [];

  for (const recipeIng of recipeIngredients) {
    const rNorm = normalizeIngredientName(recipeIng.name);
    
    // Skip pantry staples
    const isPantryStaple = PANTRY_STAPLES.some(
      (ps) => ps.includes(rNorm) || rNorm.includes(ps)
    );
    if (isPantryStaple) {
      skipped.push({ name: recipeIng.name, reason: "pantry staple" });
      continue;
    }

    // Find matching inventory item (fuzzy match)
    const match = inventory.find((inv) => {
      const invNorm = normalizeIngredientName(inv.ingredientName);
      return invNorm.includes(rNorm) || rNorm.includes(invNorm);
    });

    if (!match) {
      skipped.push({ name: recipeIng.name, reason: "not in inventory" });
      continue;
    }

    try {
      // Calculate new quantity (don't go below 0)
      const currentQty = match.quant || 0;
      const deductAmount = recipeIng.amount || 1;
      const newQty = Math.max(0, currentQty - deductAmount);

      await updateSubDocument(path, match.id, {
        quant: newQty,
        updatedAt: serverTimestamp(),
      });

      deducted.push({
        name: match.ingredientName,
        previousQty: currentQty,
        deductedAmount: deductAmount,
        newQty: newQty,
      });

      console.log(`[InventoryService] Deducted ${deductAmount} from ${match.ingredientName}: ${currentQty} -> ${newQty}`);
    } catch (err) {
      errors.push({ name: recipeIng.name, error: err.message });
    }
  }

  console.log(`[InventoryService] Recipe cooked - Deducted: ${deducted.length}, Skipped: ${skipped.length}, Errors: ${errors.length}`);
  
  return { deducted, skipped, errors };
}

module.exports = {
  createSession,
  getSession,
  editIngredient,
  removeIngredient,
  addIngredient,
  confirmSession,
  saveIngredient,
  saveIngredientsBatch,
  updateIngredient,
  getUserInventory,
  deductIngredientsForRecipe
};
