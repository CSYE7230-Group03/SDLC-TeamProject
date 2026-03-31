'use strict';

jest.mock('../../../../../../sdk/firebase/firestore', () => ({
  createDocument: jest.fn(),
  addSubDocument: jest.fn(),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
  queryDocuments: jest.fn(),
  updateSubDocument: jest.fn(),
}));

const {
  createDocument,
  addSubDocument,
  queryDocuments,
  updateSubDocument,
} = require('../../../../../../sdk/firebase/firestore');

const {
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
  deductIngredientsForRecipe,
} = require('../inventoryService');

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createSession
// ---------------------------------------------------------------------------
describe('createSession', () => {
  test('returns sessionId and ingredients with generated ids', () => {
    const ingredients = [
      { name: 'tomato', confidence: 0.9 },
      { name: 'onion', confidence: 0.8 },
    ];

    const result = createSession(ingredients);

    expect(result).toHaveProperty('sessionId');
    expect(Array.isArray(result.ingredients)).toBe(true);
    expect(result.ingredients).toHaveLength(2);
    result.ingredients.forEach((ing) => {
      expect(ing).toHaveProperty('id');
      expect(ing.name).toBeDefined();
    });
  });

  test('assigns default quantity=1 and unit="item" when not provided', () => {
    const result = createSession([{ name: 'carrot', confidence: 0.85 }]);

    expect(result.ingredients[0].quantity).toBe(1);
    expect(result.ingredients[0].unit).toBe('item');
  });

  test('preserves provided quantity and unit', () => {
    const result = createSession([
      { name: 'milk', confidence: 0.9, quantity: 2, unit: 'litre' },
    ]);

    expect(result.ingredients[0].quantity).toBe(2);
    expect(result.ingredients[0].unit).toBe('litre');
  });

  test('assigns unique ids to each ingredient', () => {
    const result = createSession([
      { name: 'apple', confidence: 0.7 },
      { name: 'banana', confidence: 0.8 },
    ]);

    const ids = result.ingredients.map((i) => i.id);
    expect(new Set(ids).size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getSession
// ---------------------------------------------------------------------------
describe('getSession', () => {
  test('returns null for unknown sessionId', () => {
    expect(getSession('non-existent-id')).toBeNull();
  });

  test('returns ingredients after createSession', () => {
    const { sessionId } = createSession([{ name: 'egg', confidence: 0.95 }]);

    const items = getSession(sessionId);

    expect(Array.isArray(items)).toBe(true);
    expect(items[0].name).toBe('egg');
  });
});

// ---------------------------------------------------------------------------
// editIngredient
// ---------------------------------------------------------------------------
describe('editIngredient', () => {
  test('updates ingredient name and returns updated: true', () => {
    const { sessionId, ingredients } = createSession([
      { name: 'tomatos', confidence: 0.8 },
    ]);

    const result = editIngredient(sessionId, ingredients[0].id, 'tomato');

    expect(result.updated).toBe(true);
    expect(result.ingredients[0].name).toBe('tomato');
  });

  test('returns updated: false with null ingredients for unknown session', () => {
    const result = editIngredient('bad-session', 'bad-id', 'anything');

    expect(result.updated).toBe(false);
    expect(result.ingredients).toBeNull();
  });

  test('returns updated: false for unknown ingredientId', () => {
    const { sessionId } = createSession([{ name: 'pepper', confidence: 0.7 }]);

    const result = editIngredient(sessionId, 'non-existent-id', 'bell pepper');

    expect(result.updated).toBe(false);
    expect(Array.isArray(result.ingredients)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// removeIngredient
// ---------------------------------------------------------------------------
describe('removeIngredient', () => {
  test('removes the ingredient and returns removed: true', () => {
    const { sessionId, ingredients } = createSession([
      { name: 'spinach', confidence: 0.9 },
      { name: 'broccoli', confidence: 0.85 },
    ]);

    const result = removeIngredient(sessionId, ingredients[0].id);

    expect(result.removed).toBe(true);
    expect(result.ingredients).toHaveLength(1);
    expect(result.ingredients[0].name).toBe('broccoli');
  });

  test('returns removed: false with null ingredients for unknown session', () => {
    const result = removeIngredient('bad-session', 'bad-id');

    expect(result.removed).toBe(false);
    expect(result.ingredients).toBeNull();
  });

  test('returns removed: false for unknown ingredientId', () => {
    const { sessionId } = createSession([{ name: 'kale', confidence: 0.8 }]);

    const result = removeIngredient(sessionId, 'non-existent-id');

    expect(result.removed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// addIngredient
// ---------------------------------------------------------------------------
describe('addIngredient', () => {
  test('adds ingredient with trimmed and lowercased name', () => {
    const { sessionId } = createSession([{ name: 'apple', confidence: 0.9 }]);

    const result = addIngredient(sessionId, '  MANGO  ');

    expect(result.added).toBe(true);
    expect(result.ingredients.at(-1).name).toBe('mango');
    expect(result.ingredients.at(-1).confidence).toBe(1.0);
  });

  test('returns added: false with null ingredients for unknown session', () => {
    const result = addIngredient('bad-session', 'avocado');

    expect(result.added).toBe(false);
    expect(result.ingredients).toBeNull();
  });

  test('generates a unique id for the new ingredient', () => {
    const { sessionId, ingredients } = createSession([
      { name: 'rice', confidence: 0.9 },
    ]);

    const result = addIngredient(sessionId, 'lentil');
    const newItem = result.ingredients.at(-1);

    expect(newItem.id).not.toBe(ingredients[0].id);
  });
});

// ---------------------------------------------------------------------------
// confirmSession
// ---------------------------------------------------------------------------
describe('confirmSession', () => {
  test('returns confirmed: true with the ingredient list', () => {
    const { sessionId } = createSession([{ name: 'cheese', confidence: 0.9 }]);

    const result = confirmSession(sessionId);

    expect(result.confirmed).toBe(true);
    expect(Array.isArray(result.ingredients)).toBe(true);
    expect(result.ingredients[0].name).toBe('cheese');
  });

  test('removes session from memory after confirmation', () => {
    const { sessionId } = createSession([{ name: 'butter', confidence: 0.9 }]);
    confirmSession(sessionId);

    expect(getSession(sessionId)).toBeNull();
  });

  test('returns confirmed: false for unknown session', () => {
    const result = confirmSession('non-existent-session');

    expect(result.confirmed).toBe(false);
    expect(result.ingredients).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// saveIngredient
// ---------------------------------------------------------------------------
describe('saveIngredient', () => {
  const userId = 'user-123';

  test('creates inventory doc, checks duplicates, and adds ingredient', async () => {
    queryDocuments.mockResolvedValue([]);
    addSubDocument.mockResolvedValue({ id: 'new-item-id' });

    const result = await saveIngredient(userId, {
      ingredientName: 'Tomato',
      quant: 3,
      unit: 'kg',
    });

    expect(createDocument).toHaveBeenCalledWith('IngredientInventory', userId, expect.any(Object));
    expect(queryDocuments).toHaveBeenCalledWith(
      `IngredientInventory/${userId}/items`,
      { ingredientName: 'tomato' }
    );
    expect(addSubDocument).toHaveBeenCalledWith(
      'IngredientInventory',
      userId,
      'items',
      expect.objectContaining({ ingredientName: 'tomato', quant: 3, unit: 'kg' })
    );
    expect(result).toEqual({ id: 'new-item-id' });
  });

  test('normalizes ingredientName to lowercase', async () => {
    queryDocuments.mockResolvedValue([]);
    addSubDocument.mockResolvedValue({ id: 'item-2' });

    await saveIngredient(userId, { ingredientName: 'CARROT' });

    const addCall = addSubDocument.mock.calls[0][3];
    expect(addCall.ingredientName).toBe('carrot');
  });

  test('throws "Ingredient already exists" when duplicate found', async () => {
    queryDocuments.mockResolvedValue([{ id: 'existing' }]);

    await expect(
      saveIngredient(userId, { ingredientName: 'tomato' })
    ).rejects.toThrow('Ingredient already exists');
    expect(addSubDocument).not.toHaveBeenCalled();
  });

  test('defaults quant=1, unit="unit", expiryDate=DEFAULT_EXPIRY when not provided', async () => {
    queryDocuments.mockResolvedValue([]);
    addSubDocument.mockResolvedValue({ id: 'item-3' });

    await saveIngredient(userId, { ingredientName: 'egg' });

    const addCall = addSubDocument.mock.calls[0][3];
    expect(addCall.quant).toBe(1);
    expect(addCall.unit).toBe('unit');
    expect(addCall.expiryDate).toBe('2099-12-12');
    expect(addCall.s3Url).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// saveIngredientsBatch
// ---------------------------------------------------------------------------
describe('saveIngredientsBatch', () => {
  const userId = 'user-123';

  test('saves all non-duplicate ingredients and returns saved list', async () => {
    queryDocuments.mockResolvedValue([]);
    addSubDocument
      .mockResolvedValueOnce({ id: 'item-a' })
      .mockResolvedValueOnce({ id: 'item-b' });

    const result = await saveIngredientsBatch(userId, [
      { ingredientName: 'apple' },
      { ingredientName: 'banana' },
    ]);

    expect(result).toHaveLength(2);
  });

  test('skips duplicate ingredients without throwing', async () => {
    queryDocuments
      .mockResolvedValueOnce([])          // apple — not a dupe
      .mockResolvedValueOnce([{ id: 'x' }]); // banana — duplicate
    addSubDocument.mockResolvedValue({ id: 'item-a' });

    const result = await saveIngredientsBatch(userId, [
      { ingredientName: 'apple' },
      { ingredientName: 'banana' },
    ]);

    expect(result).toHaveLength(1);
  });

  test('re-throws non-duplicate errors', async () => {
    queryDocuments.mockRejectedValue(new Error('Firestore unavailable'));

    await expect(
      saveIngredientsBatch(userId, [{ ingredientName: 'mango' }])
    ).rejects.toThrow('Firestore unavailable');
  });
});

// ---------------------------------------------------------------------------
// updateIngredient
// ---------------------------------------------------------------------------
describe('updateIngredient', () => {
  const userId = 'user-123';
  const itemId = 'item-abc';

  test('calls updateSubDocument with provided fields', async () => {
    updateSubDocument.mockResolvedValue({ id: itemId });

    await updateIngredient(userId, itemId, { quant: 5, unit: 'kg' });

    expect(updateSubDocument).toHaveBeenCalledWith(
      `IngredientInventory/${userId}/items/`,
      itemId,
      expect.objectContaining({ quant: 5, unit: 'kg', updatedAt: 'MOCK_TIMESTAMP' })
    );
  });

  test('computes isExpired when expiryDate is provided', async () => {
    updateSubDocument.mockResolvedValue({ id: itemId });

    await updateIngredient(userId, itemId, { expiryDate: '2099-12-12' });

    const updateCall = updateSubDocument.mock.calls[0][2];
    expect(updateCall).toHaveProperty('expiryDate', '2099-12-12');
    expect(updateCall).toHaveProperty('isExpired', false);
  });

  test('does not include fields that were not provided', async () => {
    updateSubDocument.mockResolvedValue({ id: itemId });

    await updateIngredient(userId, itemId, { quant: 2 });

    const updateCall = updateSubDocument.mock.calls[0][2];
    expect(updateCall).not.toHaveProperty('unit');
    expect(updateCall).not.toHaveProperty('expiryDate');
  });
});

// ---------------------------------------------------------------------------
// getUserInventory
// ---------------------------------------------------------------------------
describe('getUserInventory', () => {
  const userId = 'user-123';

  test('returns items with accurate isExpired flag', async () => {
    queryDocuments.mockResolvedValue([
      { id: 'item-1', ingredientName: 'milk', expiryDate: '2099-12-12', isExpired: false },
    ]);

    const result = await getUserInventory(userId);

    expect(result).toHaveLength(1);
    expect(result[0].isExpired).toBe(false);
    expect(updateSubDocument).not.toHaveBeenCalled();
  });

  test('updates Firestore when isExpired flag is stale', async () => {
    queryDocuments.mockResolvedValue([
      { id: 'item-old', ingredientName: 'yogurt', expiryDate: '2020-01-01', isExpired: false },
    ]);
    updateSubDocument.mockResolvedValue({});

    const result = await getUserInventory(userId);

    expect(result[0].isExpired).toBe(true);
    expect(updateSubDocument).toHaveBeenCalledWith(
      `IngredientInventory/${userId}/items`,
      'item-old',
      expect.objectContaining({ isExpired: true })
    );
  });

  test('returns empty array when inventory is empty', async () => {
    queryDocuments.mockResolvedValue([]);

    const result = await getUserInventory(userId);

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// deductIngredientsForRecipe
// ---------------------------------------------------------------------------
describe('deductIngredientsForRecipe', () => {
  const userId = 'user-123';

  test('deducts matched ingredient quantity', async () => {
    queryDocuments.mockResolvedValue([
      { id: 'inv-1', ingredientName: 'chicken', quant: 5 },
    ]);
    updateSubDocument.mockResolvedValue({});

    const result = await deductIngredientsForRecipe(userId, [
      { name: 'chicken', amount: 2 },
    ]);

    expect(result.deducted).toHaveLength(1);
    expect(result.deducted[0].newQty).toBe(3);
    expect(updateSubDocument).toHaveBeenCalledWith(
      `IngredientInventory/${userId}/items`,
      'inv-1',
      expect.objectContaining({ quant: 3 })
    );
  });

  test('does not go below 0 quantity', async () => {
    queryDocuments.mockResolvedValue([
      { id: 'inv-2', ingredientName: 'beef', quant: 1 },
    ]);
    updateSubDocument.mockResolvedValue({});

    const result = await deductIngredientsForRecipe(userId, [
      { name: 'beef', amount: 10 },
    ]);

    expect(result.deducted[0].newQty).toBe(0);
  });

  test('skips pantry staples', async () => {
    queryDocuments.mockResolvedValue([]);

    const result = await deductIngredientsForRecipe(userId, [
      { name: 'salt', amount: 1 },
      { name: 'pepper', amount: 1 },
    ]);

    expect(result.skipped).toHaveLength(2);
    expect(result.skipped[0].reason).toBe('pantry staple');
    expect(updateSubDocument).not.toHaveBeenCalled();
  });

  test('skips ingredients not in inventory', async () => {
    queryDocuments.mockResolvedValue([]);

    const result = await deductIngredientsForRecipe(userId, [
      { name: 'dragon fruit', amount: 1 },
    ]);

    expect(result.skipped[0].reason).toBe('not in inventory');
  });

  test('uses fuzzy matching for ingredient names', async () => {
    queryDocuments.mockResolvedValue([
      { id: 'inv-3', ingredientName: 'cherry tomatoes', quant: 10 },
    ]);
    updateSubDocument.mockResolvedValue({});

    const result = await deductIngredientsForRecipe(userId, [
      { name: 'tomatoes', amount: 3 },
    ]);

    expect(result.deducted).toHaveLength(1);
    expect(result.deducted[0].newQty).toBe(7);
  });

  test('returns empty deducted/skipped/errors for empty recipe ingredients', async () => {
    queryDocuments.mockResolvedValue([]);

    const result = await deductIngredientsForRecipe(userId, []);

    expect(result.deducted).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
