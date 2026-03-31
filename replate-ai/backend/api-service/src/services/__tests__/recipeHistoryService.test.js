'use strict';

jest.mock('../../../../../../sdk/firebase/firestore', () => ({
  queryDocuments: jest.fn(),
  addSubDocument: jest.fn(),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
}));

const {
  queryDocuments,
  addSubDocument,
} = require('../../../../../../sdk/firebase/firestore');

const { saveRecipe, getUserHistory } = require('../recipeHistoryService');

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// saveRecipe
// ---------------------------------------------------------------------------
describe('saveRecipe', () => {
  const userId = 'user-123';
  const recipe = { id: 'recipe-1', title: 'Pasta', readyInMinutes: 30 };

  test('saves recipe and returns saved: true when not a duplicate', async () => {
    queryDocuments.mockResolvedValue([]);
    addSubDocument.mockResolvedValue({ id: 'doc-abc', recipeId: 'recipe-1' });

    const result = await saveRecipe(userId, recipe);

    expect(result.saved).toBe(true);
    expect(result.recipe).toBeDefined();
    expect(addSubDocument).toHaveBeenCalledWith(
      'RecipeHistory',
      userId,
      'recipes',
      expect.objectContaining({ recipeId: 'recipe-1', title: 'Pasta' })
    );
  });

  test('returns saved: false without calling addSubDocument when recipe already exists', async () => {
    queryDocuments.mockResolvedValue([{ id: 'existing-doc' }]);

    const result = await saveRecipe(userId, recipe);

    expect(result.saved).toBe(false);
    expect(addSubDocument).not.toHaveBeenCalled();
  });

  test('queries correct subcollection path with recipeId filter', async () => {
    queryDocuments.mockResolvedValue([]);
    addSubDocument.mockResolvedValue({ id: 'doc-1' });

    await saveRecipe(userId, recipe);

    expect(queryDocuments).toHaveBeenCalledWith(
      `RecipeHistory/${userId}/recipes`,
      { recipeId: 'recipe-1' }
    );
  });

  test('includes optional fields when present in recipe', async () => {
    queryDocuments.mockResolvedValue([]);
    addSubDocument.mockResolvedValue({ id: 'doc-2' });

    const fullRecipe = {
      id: 'recipe-2',
      title: 'Risotto',
      image: 'https://example.com/img.jpg',
      readyInMinutes: 45,
      servings: 4,
      sourceUrl: 'https://example.com/recipe',
      summary: 'A creamy risotto.',
      ingredients: ['arborio rice', 'broth'],
      instructions: 'Cook slowly.',
    };

    await saveRecipe(userId, fullRecipe);

    const savedDoc = addSubDocument.mock.calls[0][3];
    expect(savedDoc.image).toBe('https://example.com/img.jpg');
    expect(savedDoc.readyInMinutes).toBe(45);
    expect(savedDoc.servings).toBe(4);
    expect(savedDoc.sourceUrl).toBe('https://example.com/recipe');
    expect(savedDoc.summary).toBe('A creamy risotto.');
    expect(savedDoc.ingredients).toEqual(['arborio rice', 'broth']);
    expect(savedDoc.instructions).toBe('Cook slowly.');
  });

  test('omits optional fields when absent from recipe', async () => {
    queryDocuments.mockResolvedValue([]);
    addSubDocument.mockResolvedValue({ id: 'doc-3' });

    await saveRecipe(userId, { id: 'recipe-3', title: 'Simple Dish' });

    const savedDoc = addSubDocument.mock.calls[0][3];
    expect(savedDoc).not.toHaveProperty('image');
    expect(savedDoc).not.toHaveProperty('readyInMinutes');
    expect(savedDoc).not.toHaveProperty('servings');
  });

  test('attaches savedAt timestamp to saved document', async () => {
    queryDocuments.mockResolvedValue([]);
    addSubDocument.mockResolvedValue({ id: 'doc-4' });

    await saveRecipe(userId, recipe);

    const savedDoc = addSubDocument.mock.calls[0][3];
    expect(savedDoc.savedAt).toBe('MOCK_TIMESTAMP');
  });

  test('throws when userId is missing', async () => {
    await expect(saveRecipe(null, recipe)).rejects.toThrow('userId and recipe.id are required');
  });

  test('throws when recipe is missing', async () => {
    await expect(saveRecipe(userId, null)).rejects.toThrow('userId and recipe.id are required');
  });

  test('throws when recipe has no id', async () => {
    await expect(saveRecipe(userId, { title: 'No ID Recipe' })).rejects.toThrow(
      'userId and recipe.id are required'
    );
  });
});

// ---------------------------------------------------------------------------
// getUserHistory
// ---------------------------------------------------------------------------
describe('getUserHistory', () => {
  const userId = 'user-123';

  test('returns recipes sorted by savedAt descending', async () => {
    queryDocuments.mockResolvedValue([
      { id: 'r1', title: 'Older', savedAt: { toMillis: () => 1000 } },
      { id: 'r2', title: 'Newer', savedAt: { toMillis: () => 3000 } },
      { id: 'r3', title: 'Middle', savedAt: { toMillis: () => 2000 } },
    ]);

    const result = await getUserHistory(userId);

    expect(result[0].title).toBe('Newer');
    expect(result[1].title).toBe('Middle');
    expect(result[2].title).toBe('Older');
  });

  test('queries correct subcollection path', async () => {
    queryDocuments.mockResolvedValue([]);

    await getUserHistory(userId);

    expect(queryDocuments).toHaveBeenCalledWith(`RecipeHistory/${userId}/recipes`);
  });

  test('returns empty array when no history', async () => {
    queryDocuments.mockResolvedValue([]);

    const result = await getUserHistory(userId);

    expect(result).toEqual([]);
  });

  test('handles recipes with missing savedAt (treated as 0)', async () => {
    queryDocuments.mockResolvedValue([
      { id: 'r1', title: 'Has Timestamp', savedAt: { toMillis: () => 5000 } },
      { id: 'r2', title: 'No Timestamp' },
    ]);

    const result = await getUserHistory(userId);

    expect(result[0].title).toBe('Has Timestamp');
    expect(result[1].title).toBe('No Timestamp');
  });

  test('throws when userId is missing', async () => {
    await expect(getUserHistory(null)).rejects.toThrow('userId is required');
  });
});
