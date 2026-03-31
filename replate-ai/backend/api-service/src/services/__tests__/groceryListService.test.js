'use strict';

const MOCK_DELETE_SENTINEL = Symbol('DELETE_SENTINEL');

jest.mock('../../../../../../sdk/firebase/firestore', () => ({
  addSubDocument: jest.fn(),
  queryDocuments: jest.fn(),
  updateSubDocument: jest.fn(),
  deleteDocument: jest.fn(),
  serverTimestamp: () => 'MOCK_TIMESTAMP',
  deleteField: () => MOCK_DELETE_SENTINEL,
}));

const {
  addSubDocument,
  queryDocuments,
  updateSubDocument,
} = require('../../../../../../sdk/firebase/firestore');

const {
  createGroceryList,
  getGroceryList,
  getUserGroceryLists,
  toggleItemAvailability,
  addGroceryItem,
  deleteGroceryItem,
  updateGroceryItemQuantity,
} = require('../groceryListService');

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createGroceryList
// ---------------------------------------------------------------------------
describe('createGroceryList', () => {
  const userId = 'user-abc';
  const recipeId = 'recipe-1';
  const recipeTitle = 'Pasta Carbonara';
  const missingIngredients = [
    { name: 'Pancetta', amount: 200, unit: 'g' },
    { name: 'Eggs', amount: 3, unit: 'whole' },
  ];

  test('creates items with isAvailableAtHome: false by default', async () => {
    addSubDocument.mockResolvedValue({ id: 'list-id-1' });

    const result = await createGroceryList(userId, {
      recipeId,
      recipeTitle,
      missingIngredients,
    });

    expect(result).toBeDefined();
    result.items.forEach((item) => {
      expect(item.isAvailableAtHome).toBe(false);
    });
  });

  test('assigns unique IDs to each item', async () => {
    addSubDocument.mockResolvedValue({ id: 'list-id-2' });

    const result = await createGroceryList(userId, {
      recipeId,
      recipeTitle,
      missingIngredients,
    });

    const ids = result.items.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(missingIngredients.length);
  });

  test('returns formatted list with items array', async () => {
    addSubDocument.mockResolvedValue({ id: 'list-id-3' });

    const result = await createGroceryList(userId, {
      recipeId,
      recipeTitle,
      missingIngredients,
    });

    expect(result).toHaveProperty('id');
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items).toHaveLength(missingIngredients.length);
    expect(result.recipeTitle).toBe(recipeTitle);
    expect(result.recipeId).toBe(recipeId);
  });
});

// ---------------------------------------------------------------------------
// getGroceryList
// ---------------------------------------------------------------------------
describe('getGroceryList', () => {
  const userId = 'user-abc';
  const listId = 'list-xyz';

  test('returns null when list not found', async () => {
    queryDocuments.mockResolvedValue([]);

    const result = await getGroceryList(userId, listId);

    expect(result).toBeNull();
  });

  test('returns list with items formatted as array (not map)', async () => {
    const firestoreDoc = {
      id: listId,
      recipeId: 'recipe-1',
      recipeTitle: 'Pasta',
      createdAt: 'MOCK_TIMESTAMP',
      items: {
        'item-1': { name: 'Pancetta', amount: 200, unit: 'g', isAvailableAtHome: false },
        'item-2': { name: 'Eggs', amount: 3, unit: 'whole', isAvailableAtHome: false },
      },
    };
    queryDocuments.mockResolvedValue([firestoreDoc]);

    const result = await getGroceryList(userId, listId);

    expect(result).not.toBeNull();
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items).toHaveLength(2);
    // Each item should carry its key as 'id'
    const itemIds = result.items.map((i) => i.id);
    expect(itemIds).toContain('item-1');
    expect(itemIds).toContain('item-2');
  });
});

// ---------------------------------------------------------------------------
// getUserGroceryLists
// ---------------------------------------------------------------------------
describe('getUserGroceryLists', () => {
  const userId = 'user-abc';

  test('returns all lists for user', async () => {
    const firestoreDocs = [
      {
        id: 'list-1',
        recipeId: 'recipe-1',
        recipeTitle: 'Pasta',
        createdAt: 'MOCK_TIMESTAMP',
        items: {
          'item-1': { name: 'Pancetta', amount: 200, unit: 'g', isAvailableAtHome: false },
        },
      },
      {
        id: 'list-2',
        recipeId: 'recipe-2',
        recipeTitle: 'Risotto',
        createdAt: 'MOCK_TIMESTAMP',
        items: {
          'item-a': { name: 'Arborio Rice', amount: 300, unit: 'g', isAvailableAtHome: true },
        },
      },
    ];
    queryDocuments.mockResolvedValue(firestoreDocs);

    const result = await getUserGroceryLists(userId);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('list-1');
    expect(result[1].id).toBe('list-2');
    // Each list should have items as array
    expect(Array.isArray(result[0].items)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// toggleItemAvailability
// ---------------------------------------------------------------------------
describe('toggleItemAvailability', () => {
  const userId = 'user-abc';
  const listId = 'list-xyz';
  const itemId = 'item-1';

  test('toggles isAvailableAtHome from false to true', async () => {
    const firestoreDoc = {
      id: listId,
      recipeId: 'recipe-1',
      recipeTitle: 'Pasta',
      createdAt: 'MOCK_TIMESTAMP',
      items: {
        [itemId]: { name: 'Pancetta', amount: 200, unit: 'g', isAvailableAtHome: false },
      },
    };
    queryDocuments.mockResolvedValue([firestoreDoc]);
    updateSubDocument.mockResolvedValue({
      id: listId,
      items: {
        [itemId]: { name: 'Pancetta', amount: 200, unit: 'g', isAvailableAtHome: true },
      },
    });

    const result = await toggleItemAvailability(userId, listId, itemId);

    expect(updateSubDocument).toHaveBeenCalledTimes(1);
    const updateCall = updateSubDocument.mock.calls[0];
    expect(updateCall[2]).toMatchObject({
      [`items.${itemId}.isAvailableAtHome`]: true,
    });
    expect(result.isAvailableAtHome).toBe(true);
  });

  test('toggles isAvailableAtHome from true to false', async () => {
    const firestoreDoc = {
      id: listId,
      recipeId: 'recipe-1',
      recipeTitle: 'Pasta',
      createdAt: 'MOCK_TIMESTAMP',
      items: {
        [itemId]: { name: 'Pancetta', amount: 200, unit: 'g', isAvailableAtHome: true },
      },
    };
    queryDocuments.mockResolvedValue([firestoreDoc]);
    updateSubDocument.mockResolvedValue({
      id: listId,
      items: {
        [itemId]: { name: 'Pancetta', amount: 200, unit: 'g', isAvailableAtHome: false },
      },
    });

    const result = await toggleItemAvailability(userId, listId, itemId);

    const updateCall = updateSubDocument.mock.calls[0];
    expect(updateCall[2]).toMatchObject({
      [`items.${itemId}.isAvailableAtHome`]: false,
    });
    expect(result.isAvailableAtHome).toBe(false);
  });

  test('throws error if list not found', async () => {
    queryDocuments.mockResolvedValue([]);

    await expect(
      toggleItemAvailability(userId, listId, itemId)
    ).rejects.toThrow('Grocery list not found');
  });

  test('throws error if item not found in list', async () => {
    const firestoreDoc = {
      id: listId,
      recipeId: 'recipe-1',
      recipeTitle: 'Pasta',
      createdAt: 'MOCK_TIMESTAMP',
      items: {
        'other-item': { name: 'Eggs', amount: 3, unit: 'whole', isAvailableAtHome: false },
      },
    };
    queryDocuments.mockResolvedValue([firestoreDoc]);

    await expect(
      toggleItemAvailability(userId, listId, 'non-existent-item')
    ).rejects.toThrow('Item not found in grocery list');
  });
});

// ---------------------------------------------------------------------------
// addGroceryItem
// ---------------------------------------------------------------------------
describe('addGroceryItem', () => {
  const userId = 'user-abc';
  const listId = 'list-xyz';

  const firestoreDoc = {
    id: listId,
    recipeId: 'recipe-1',
    recipeTitle: 'Pasta',
    createdAt: 'MOCK_TIMESTAMP',
    items: {
      'item-1': { name: 'Pancetta', amount: 200, unit: 'g', isAvailableAtHome: false },
    },
  };

  test('adds new item and returns it with generated id', async () => {
    queryDocuments.mockResolvedValue([firestoreDoc]);
    updateSubDocument.mockResolvedValue({});

    const result = await addGroceryItem(userId, listId, {
      name: 'Eggs',
      amount: 3,
      unit: 'whole',
    });

    expect(result).toHaveProperty('id');
    expect(result.name).toBe('Eggs');
    expect(result.amount).toBe(3);
    expect(result.unit).toBe('whole');
    expect(result.isAvailableAtHome).toBe(false);
  });

  test('defaults amount to 0 and unit to empty string when omitted', async () => {
    queryDocuments.mockResolvedValue([firestoreDoc]);
    updateSubDocument.mockResolvedValue({});

    const result = await addGroceryItem(userId, listId, { name: 'Salt' });

    expect(result.amount).toBe(0);
    expect(result.unit).toBe('');
  });

  test('calls updateSubDocument with dot-notation key for the new item', async () => {
    queryDocuments.mockResolvedValue([firestoreDoc]);
    updateSubDocument.mockResolvedValue({});

    const result = await addGroceryItem(userId, listId, {
      name: 'Pepper',
      amount: 1,
      unit: 'tsp',
    });

    expect(updateSubDocument).toHaveBeenCalledTimes(1);
    const updateCall = updateSubDocument.mock.calls[0];
    const updatePayload = updateCall[2];
    const key = `items.${result.id}`;
    expect(updatePayload[key]).toBeDefined();
    expect(updatePayload[key].name).toBe('Pepper');
  });

  test('throws error if list not found', async () => {
    queryDocuments.mockResolvedValue([]);

    await expect(
      addGroceryItem(userId, listId, { name: 'Milk', amount: 1, unit: 'L' })
    ).rejects.toThrow('Grocery list not found');
  });
});

// ---------------------------------------------------------------------------
// deleteGroceryItem
// ---------------------------------------------------------------------------
describe('deleteGroceryItem', () => {
  const userId = 'user-abc';
  const listId = 'list-xyz';
  const itemId = 'item-1';

  const firestoreDoc = {
    id: listId,
    recipeId: 'recipe-1',
    recipeTitle: 'Pasta',
    createdAt: 'MOCK_TIMESTAMP',
    items: {
      [itemId]: { name: 'Pancetta', amount: 200, unit: 'g', isAvailableAtHome: false },
    },
  };

  test('returns the deleted item', async () => {
    queryDocuments.mockResolvedValue([firestoreDoc]);
    updateSubDocument.mockResolvedValue({});

    const result = await deleteGroceryItem(userId, listId, itemId);

    expect(result.id).toBe(itemId);
    expect(result.name).toBe('Pancetta');
  });

  test('calls updateSubDocument with deleteField sentinel for item key', async () => {
    queryDocuments.mockResolvedValue([firestoreDoc]);
    updateSubDocument.mockResolvedValue({});

    await deleteGroceryItem(userId, listId, itemId);

    expect(updateSubDocument).toHaveBeenCalledTimes(1);
    const updateCall = updateSubDocument.mock.calls[0];
    const updatePayload = updateCall[2];
    expect(updatePayload[`items.${itemId}`]).toBeDefined();
    expect(updatePayload[`items.${itemId}`]).toBe(MOCK_DELETE_SENTINEL);
  });

  test('throws error if list not found', async () => {
    queryDocuments.mockResolvedValue([]);

    await expect(
      deleteGroceryItem(userId, listId, itemId)
    ).rejects.toThrow('Grocery list not found');
  });

  test('throws error if item not found in list', async () => {
    queryDocuments.mockResolvedValue([firestoreDoc]);

    await expect(
      deleteGroceryItem(userId, listId, 'non-existent-item')
    ).rejects.toThrow('Item not found in grocery list');
  });
});

// ---------------------------------------------------------------------------
// updateGroceryItemQuantity
// ---------------------------------------------------------------------------
describe('updateGroceryItemQuantity', () => {
  const userId = 'user-abc';
  const listId = 'list-xyz';
  const itemId = 'item-1';

  const firestoreDoc = {
    id: listId,
    recipeId: 'recipe-1',
    recipeTitle: 'Pasta',
    createdAt: 'MOCK_TIMESTAMP',
    items: {
      [itemId]: { name: 'Pancetta', amount: 200, unit: 'g', isAvailableAtHome: false },
    },
  };

  test('returns item with updated amount', async () => {
    queryDocuments.mockResolvedValue([firestoreDoc]);
    updateSubDocument.mockResolvedValue({});

    const result = await updateGroceryItemQuantity(userId, listId, itemId, 350);

    expect(result.id).toBe(itemId);
    expect(result.amount).toBe(350);
    expect(result.name).toBe('Pancetta');
  });

  test('calls updateSubDocument with dot-notation for amount field', async () => {
    queryDocuments.mockResolvedValue([firestoreDoc]);
    updateSubDocument.mockResolvedValue({});

    await updateGroceryItemQuantity(userId, listId, itemId, 100);

    expect(updateSubDocument).toHaveBeenCalledTimes(1);
    const updateCall = updateSubDocument.mock.calls[0];
    expect(updateCall[2]).toMatchObject({
      [`items.${itemId}.amount`]: 100,
    });
  });

  test('throws error if list not found', async () => {
    queryDocuments.mockResolvedValue([]);

    await expect(
      updateGroceryItemQuantity(userId, listId, itemId, 100)
    ).rejects.toThrow('Grocery list not found');
  });

  test('throws error if item not found in list', async () => {
    queryDocuments.mockResolvedValue([firestoreDoc]);

    await expect(
      updateGroceryItemQuantity(userId, listId, 'non-existent-item', 100)
    ).rejects.toThrow('Item not found in grocery list');
  });
});
