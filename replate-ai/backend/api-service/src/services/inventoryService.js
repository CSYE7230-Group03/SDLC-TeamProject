/**
 * Inventory service.
 *
 * Manages pending ingredient review sessions. Sessions hold detected
 * ingredients while the user reviews, edits, and removes items.
 * Once confirmed, the finalized list is returned and the session
 * is discarded.
 */

const crypto = require("crypto");

// In-memory store keyed by sessionId.
const pendingSessions = new Map();

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
  pendingSessions.delete(sessionId);
  return { confirmed: true, ingredients: items };
}

module.exports = {
  createSession,
  getSession,
  editIngredient,
  removeIngredient,
  addIngredient,
  confirmSession,
};
