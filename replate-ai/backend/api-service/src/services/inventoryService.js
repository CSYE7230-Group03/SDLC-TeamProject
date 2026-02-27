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
const { createDocument, addSubDocument, serverTimestamp, queryDocuments} = require("../../../../../sdk/firebase/firestore");
// const { getFirestore } = require("../../../../../sdk/firebase/index");

// In-memory store keyed by sessionId.
const pendingSessions = new Map();

const DEFAULT_EXPIRY = "2099-12-12";

/**
 * Create a new review session from detected ingredients.
 *
 * @param {Array<{ name: string, confidence: number }>} ingredients
 * @returns {{ sessionId: string, ingredients: Array<{ id: string, name: string, confidence: number }> }}
 */
function createSession(ingredients) {
  const sessionId = crypto.randomUUID();
  const items = ingredients.map((ing) => ({
    id: crypto.randomUUID(),
    name: ing.name,
    confidence: ing.confidence,
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

    if (existingItems > 0) {
        throw new Error("Ingredient already exists");
    }

    // 3️. Create item
    const newItem = {
        ingredientName: ingredient.ingredientName.toLowerCase().trim(),
        quant: ingredient.quant || 1,
        unit: ingredient.unit || "unit",
        expiryDate: ingredient.expiryDate || DEFAULT_EXPIRY,
        isExpired: false,
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
    console.log("In saveIngredientBatch");
    for (const item of items) {
      const saved = await saveIngredient(userId, {
        ingredientName: item.ingredientName,
        quant: item.quant,
        unit: item.unit,
        expiryDate: item.expiryDate,
        s3Url: item.s3Url || null,
      });
  
      savedItems.push(saved);
    }
  
    return savedItems;
  }

module.exports = {
  createSession,
  getSession,
  editIngredient,
  removeIngredient,
  addIngredient,
  confirmSession,
  saveIngredient,
  saveIngredientsBatch
};
