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
  deleteField,
} = require('../lib/firebase/firestore');

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

/**
 * Add a new ingredient item to an existing grocery list.
 *
 * @param {string} userId
 * @param {string} listId
 * @param {{ name: string, amount: number, unit: string }} item
 * @returns {Promise<Object>} - The newly added item with its generated id
 */
async function addGroceryItem(userId, listId, { name, amount, unit }) {
  const path = `GroceryLists/${userId}/lists`;
  const docs = await queryDocuments(path, {});

  const doc = docs.find((d) => d.id === listId);
  if (!doc) {
    throw new Error('Grocery list not found');
  }

  const itemId = crypto.randomUUID();
  const newItem = {
    name,
    amount: amount || 0,
    unit: unit || '',
    isAvailableAtHome: false,
  };

  await updateSubDocument(path, listId, {
    [`items.${itemId}`]: newItem,
  });

  return { id: itemId, ...newItem };
}

/**
 * Delete an ingredient item from an existing grocery list.
 *
 * @param {string} userId
 * @param {string} listId
 * @param {string} itemId
 * @returns {Promise<Object>} - The deleted item
 */
async function deleteGroceryItem(userId, listId, itemId) {
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

  await updateSubDocument(path, listId, {
    [`items.${itemId}`]: deleteField(),
  });

  return { id: itemId, ...item };
}

/**
 * Update the quantity (amount) of an existing grocery list item.
 *
 * @param {string} userId
 * @param {string} listId
 * @param {string} itemId
 * @param {number} amount
 * @returns {Promise<Object>} - The updated item with its new amount
 */
async function updateGroceryItemQuantity(userId, listId, itemId, amount) {
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

  await updateSubDocument(path, listId, {
    [`items.${itemId}.amount`]: amount,
  });

  return { id: itemId, ...item, amount };
}

/**
 * Aggregate ingredients from multiple recipes into a single deduplicated list.
 *
 * Deduplication rules:
 *  - Names are normalized (lowercase + trimmed) for comparison.
 *  - Items with the same name AND unit have their amounts summed.
 *  - Items with the same name but different units are kept as separate entries
 *    because unit conversion cannot be done safely without a lookup table.
 *
 * @param {Array<{ ingredients: Array<{ name: string, amount: number, unit: string }> }>} recipesList
 * @returns {Array<{ name: string, amount: number, unit: string }>}
 */
function aggregateIngredients(recipesList) {
  const merged = {};

  for (const { ingredients = [] } of recipesList) {
    for (const ing of ingredients) {
      const nameKey = ing.name.trim().toLowerCase();
      const unitKey = (ing.unit || '').trim().toLowerCase();
      const key = `${nameKey}::${unitKey}`;

      if (merged[key]) {
        merged[key].amount = (merged[key].amount || 0) + (ing.amount || 0);
      } else {
        merged[key] = {
          name: ing.name.trim(),
          amount: ing.amount || 0,
          unit: ing.unit || '',
        };
      }
    }
  }

  return Object.values(merged);
}

/**
 * Create a single consolidated grocery list from multiple recipes.
 *
 * All ingredients across the provided recipes are aggregated using
 * `aggregateIngredients` (duplicates merged, quantities summed).
 *
 * @param {string} userId
 * @param {{ recipes: Array<{ recipeId: string|number, recipeTitle: string, ingredients: Array<{ name: string, amount: number, unit: string }> }> }} payload
 * @returns {Promise<Object>} - Formatted list with aggregated items array
 */
async function createAggregatedGroceryList(userId, { recipes }) {
  const aggregated = aggregateIngredients(recipes);

  const titles = recipes.map((r) => r.recipeTitle);
  let listTitle;
  if (titles.length === 1) {
    listTitle = titles[0];
  } else if (titles.length === 2) {
    listTitle = `${titles[0]} & ${titles[1]}`;
  } else {
    listTitle = `${titles[0]} + ${titles.length - 1} more`;
  }

  const items = {};
  for (const ingredient of aggregated) {
    const itemId = crypto.randomUUID();
    items[itemId] = {
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      isAvailableAtHome: false,
    };
  }

  const listData = {
    recipeId: recipes.map((r) => String(r.recipeId)).join(','),
    recipeTitle: listTitle,
    createdAt: serverTimestamp(),
    items,
  };

  const saved = await addSubDocument('GroceryLists', userId, 'lists', listData);
  return formatList({ ...listData, id: saved.id });
}

module.exports = {
  createGroceryList,
  createAggregatedGroceryList,
  getGroceryList,
  getUserGroceryLists,
  toggleItemAvailability,
  addGroceryItem,
  deleteGroceryItem,
  updateGroceryItemQuantity,
};
