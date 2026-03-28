'use strict';

/**
 * Grocery List Service
 *
 * Manages grocery lists derived from recipe missing ingredients.
 * Users can mark individual items as already available at home,
 * which excludes them from the grocery order while keeping them visible.
 *
 * Firestore path: GroceryLists/{userId}/lists/{listId}
 *
 * Item storage model: items are stored as a Firestore Map (JS object keyed
 * by itemId). This enables atomic dot-notation field updates without
 * re-writing the entire document.
 */

const crypto = require('crypto');
const {
  addSubDocument,
  queryDocuments,
  updateSubDocument,
  serverTimestamp,
} = require('../../../../../sdk/firebase/firestore');

/**
 * Convert the Firestore items map to an array with each item's key
 * embedded as the `id` field.
 *
 * @param {Object} doc - Raw Firestore document
 * @returns {Object} - Formatted list with items as an array
 */
function formatList(doc) {
  const itemsMap = doc.items || {};
  const items = Object.entries(itemsMap).map(([id, data]) => ({
    id,
    ...data,
  }));
  return {
    id: doc.id,
    recipeId: doc.recipeId,
    recipeTitle: doc.recipeTitle,
    createdAt: doc.createdAt,
    items,
  };
}

/**
 * Create a new grocery list for a user from a recipe's missing ingredients.
 *
 * @param {string} userId
 * @param {{ recipeId: string, recipeTitle: string, missingIngredients: Array<{ name: string, amount: number, unit: string }> }} payload
 * @returns {Promise<Object>} - Formatted list with items array
 */
async function createGroceryList(userId, { recipeId, recipeTitle, missingIngredients }) {
  const items = {};

  for (const ingredient of missingIngredients) {
    const itemId = crypto.randomUUID();
    items[itemId] = {
      name: ingredient.name,
      amount: ingredient.amount || 0,
      unit: ingredient.unit || '',
      isAvailableAtHome: false,
    };
  }

  const listData = {
    recipeId,
    recipeTitle,
    createdAt: serverTimestamp(),
    items,
  };

  const saved = await addSubDocument('GroceryLists', userId, 'lists', listData);

  return formatList({ ...listData, id: saved.id });
}

/**
 * Get a specific grocery list by ID for a user.
 *
 * @param {string} userId
 * @param {string} listId
 * @returns {Promise<Object|null>} - Formatted list or null if not found
 */
async function getGroceryList(userId, listId) {
  const path = `GroceryLists/${userId}/lists`;
  const docs = await queryDocuments(path, {});

  const doc = docs.find((d) => d.id === listId);
  if (!doc) {
    return null;
  }

  return formatList(doc);
}

/**
 * Get all grocery lists for a user.
 *
 * @param {string} userId
 * @returns {Promise<Array<Object>>} - Array of formatted lists
 */
async function getUserGroceryLists(userId) {
  const path = `GroceryLists/${userId}/lists`;
  const docs = await queryDocuments(path, {});
  return docs.map(formatList);
}

/**
 * Toggle the isAvailableAtHome flag for a specific item in a grocery list.
 *
 * Items marked as available at home are excluded from the grocery order
 * but remain visible in the list. This uses Firestore dot-notation to
 * update a single nested field atomically.
 *
 * @param {string} userId
 * @param {string} listId
 * @param {string} itemId
 * @returns {Promise<Object>} - The updated item with its new availability state
 */
async function toggleItemAvailability(userId, listId, itemId) {
  const path = `GroceryLists/${userId}/lists`;
  const docs = await queryDocuments(path, {});

  const doc = docs.find((d) => d.id === listId);
  if (!doc) {
    throw new Error('Grocery list not found');
  }

  const item = (doc.items || {})[itemId];
  if (!item) {
    throw new Error('Item not found in grocery list');
  }

  const newValue = !item.isAvailableAtHome;

  await updateSubDocument(path, listId, {
    [`items.${itemId}.isAvailableAtHome`]: newValue,
  });

  return {
    id: itemId,
    ...item,
    isAvailableAtHome: newValue,
  };
}

module.exports = {
  createGroceryList,
  getGroceryList,
  getUserGroceryLists,
  toggleItemAvailability,
};
