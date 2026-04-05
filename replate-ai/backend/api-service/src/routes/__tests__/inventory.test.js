'use strict';

jest.mock('../../services/inventoryService');
jest.mock('../../services/profileAnalysisService');
jest.mock('../../../../../../sdk/firebase/firestore', () => ({
  verifyFirebaseToken: (req, res, next) => {
    req.userId = 'test-user-123';
    next();
  },
}));

const request = require('supertest');
const express = require('express');
const inventoryRouter = require('../inventory');

const {
  createSession,
  getSession,
  editIngredient,
  removeIngredient,
  addIngredient,
  confirmSession,
  saveIngredientsBatch,
  updateIngredient,
  getUserInventory,
  deductIngredientsForRecipe,
} = require('../../services/inventoryService');

const { analyzeUserProfile } = require('../../services/profileAnalysisService');

const app = express();
app.use(express.json());
app.use('/inventory', inventoryRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /inventory
// ---------------------------------------------------------------------------
describe('GET /inventory', () => {
  test('returns 200 with inventory items on success', async () => {
    const mockItems = [
      { id: 'item-1', ingredientName: 'Tomato', quant: 3, unit: 'pcs', isExpired: false },
      { id: 'item-2', ingredientName: 'Milk', quant: 1, unit: 'L', isExpired: false },
    ];
    getUserInventory.mockResolvedValue(mockItems);

    const response = await request(app).get('/inventory');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.items).toHaveLength(2);
    expect(getUserInventory).toHaveBeenCalledWith('test-user-123');
  });

  test('returns 500 on service error', async () => {
    getUserInventory.mockRejectedValue(new Error('Firestore unavailable'));

    const response = await request(app).get('/inventory');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /inventory/review
// ---------------------------------------------------------------------------
describe('POST /inventory/review', () => {
  test('returns 201 with sessionId and ingredients on success', async () => {
    createSession.mockReturnValue({
      sessionId: 'session-abc',
      ingredients: [{ id: 'ing-1', name: 'Tomato', confidence: 0.95 }],
    });

    const response = await request(app)
      .post('/inventory/review')
      .send({ ingredients: [{ name: 'Tomato', confidence: 0.95 }] });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.sessionId).toBe('session-abc');
    expect(response.body.ingredients).toHaveLength(1);
    expect(createSession).toHaveBeenCalledWith([{ name: 'Tomato', confidence: 0.95 }]);
  });

  test('returns 400 when ingredients is missing', async () => {
    const response = await request(app).post('/inventory/review').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(createSession).not.toHaveBeenCalled();
  });

  test('returns 400 when ingredients is an empty array', async () => {
    const response = await request(app)
      .post('/inventory/review')
      .send({ ingredients: [] });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(createSession).not.toHaveBeenCalled();
  });

  test('returns 400 when ingredients is not an array', async () => {
    const response = await request(app)
      .post('/inventory/review')
      .send({ ingredients: 'tomato' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(createSession).not.toHaveBeenCalled();
  });

  test('returns 500 on unexpected error', async () => {
    createSession.mockImplementation(() => { throw new Error('Unexpected'); });

    const response = await request(app)
      .post('/inventory/review')
      .send({ ingredients: [{ name: 'Tomato', confidence: 0.9 }] });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /inventory/review/:sessionId
// ---------------------------------------------------------------------------
describe('GET /inventory/review/:sessionId', () => {
  test('returns 200 with ingredients when session exists', async () => {
    getSession.mockReturnValue([{ id: 'ing-1', name: 'Tomato', confidence: 0.95 }]);

    const response = await request(app).get('/inventory/review/session-abc');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.ingredients).toHaveLength(1);
    expect(getSession).toHaveBeenCalledWith('session-abc');
  });

  test('returns 404 when session does not exist', async () => {
    getSession.mockReturnValue(null);

    const response = await request(app).get('/inventory/review/nonexistent');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Session not found');
  });

  test('returns 500 on unexpected error', async () => {
    getSession.mockImplementation(() => { throw new Error('Crash'); });

    const response = await request(app).get('/inventory/review/session-abc');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PATCH /inventory/review/:sessionId/item/:ingredientId
// ---------------------------------------------------------------------------
describe('PATCH /inventory/review/:sessionId/item/:ingredientId', () => {
  test('returns 200 with updated ingredients on success', async () => {
    editIngredient.mockReturnValue({
      ingredients: [{ id: 'ing-1', name: 'Cherry Tomato' }],
      updated: true,
    });

    const response = await request(app)
      .patch('/inventory/review/session-abc/item/ing-1')
      .send({ name: 'Cherry Tomato' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.ingredients[0].name).toBe('Cherry Tomato');
    expect(editIngredient).toHaveBeenCalledWith('session-abc', 'ing-1', 'Cherry Tomato');
  });

  test('returns 400 when name is missing', async () => {
    const response = await request(app)
      .patch('/inventory/review/session-abc/item/ing-1')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(editIngredient).not.toHaveBeenCalled();
  });

  test('returns 400 when name is an empty string', async () => {
    const response = await request(app)
      .patch('/inventory/review/session-abc/item/ing-1')
      .send({ name: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(editIngredient).not.toHaveBeenCalled();
  });

  test('returns 404 when session is not found', async () => {
    editIngredient.mockReturnValue({ ingredients: null, updated: false });

    const response = await request(app)
      .patch('/inventory/review/bad-session/item/ing-1')
      .send({ name: 'Garlic' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Session not found');
  });

  test('returns 404 when ingredient is not found in session', async () => {
    editIngredient.mockReturnValue({
      ingredients: [{ id: 'ing-1', name: 'Tomato' }],
      updated: false,
    });

    const response = await request(app)
      .patch('/inventory/review/session-abc/item/bad-ing')
      .send({ name: 'Garlic' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Ingredient not found');
  });

  test('returns 500 on unexpected error', async () => {
    editIngredient.mockImplementation(() => { throw new Error('Crash'); });

    const response = await request(app)
      .patch('/inventory/review/session-abc/item/ing-1')
      .send({ name: 'Garlic' });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DELETE /inventory/review/:sessionId/item/:ingredientId
// ---------------------------------------------------------------------------
describe('DELETE /inventory/review/:sessionId/item/:ingredientId', () => {
  test('returns 200 with updated ingredients after removal', async () => {
    removeIngredient.mockReturnValue({
      ingredients: [],
      removed: true,
    });

    const response = await request(app).delete('/inventory/review/session-abc/item/ing-1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(removeIngredient).toHaveBeenCalledWith('session-abc', 'ing-1');
  });

  test('returns 404 when session is not found', async () => {
    removeIngredient.mockReturnValue({ ingredients: null, removed: false });

    const response = await request(app).delete('/inventory/review/bad-session/item/ing-1');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Session not found');
  });

  test('returns 404 when ingredient is not found in session', async () => {
    removeIngredient.mockReturnValue({
      ingredients: [{ id: 'ing-2', name: 'Garlic' }],
      removed: false,
    });

    const response = await request(app).delete('/inventory/review/session-abc/item/bad-ing');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Ingredient not found');
  });

  test('returns 500 on unexpected error', async () => {
    removeIngredient.mockImplementation(() => { throw new Error('Crash'); });

    const response = await request(app).delete('/inventory/review/session-abc/item/ing-1');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /inventory/review/:sessionId/item
// ---------------------------------------------------------------------------
describe('POST /inventory/review/:sessionId/item', () => {
  test('returns 201 with updated ingredients after adding', async () => {
    addIngredient.mockReturnValue({
      ingredients: [
        { id: 'ing-1', name: 'Tomato' },
        { id: 'ing-2', name: 'Basil' },
      ],
    });

    const response = await request(app)
      .post('/inventory/review/session-abc/item')
      .send({ name: 'Basil' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.ingredients).toHaveLength(2);
    expect(addIngredient).toHaveBeenCalledWith('session-abc', 'Basil');
  });

  test('returns 400 when name is missing', async () => {
    const response = await request(app)
      .post('/inventory/review/session-abc/item')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(addIngredient).not.toHaveBeenCalled();
  });

  test('returns 400 when name is whitespace only', async () => {
    const response = await request(app)
      .post('/inventory/review/session-abc/item')
      .send({ name: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(addIngredient).not.toHaveBeenCalled();
  });

  test('returns 404 when session is not found', async () => {
    addIngredient.mockReturnValue({ ingredients: null });

    const response = await request(app)
      .post('/inventory/review/bad-session/item')
      .send({ name: 'Basil' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Session not found');
  });

  test('returns 500 on unexpected error', async () => {
    addIngredient.mockImplementation(() => { throw new Error('Crash'); });

    const response = await request(app)
      .post('/inventory/review/session-abc/item')
      .send({ name: 'Basil' });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /inventory/review/:sessionId/confirm
// ---------------------------------------------------------------------------
describe('POST /inventory/review/:sessionId/confirm', () => {
  test('returns 200 with saved items on success', async () => {
    confirmSession.mockReturnValue({
      confirmed: true,
      ingredients: [
        { name: 'Tomato', quantity: 3, unit: 'pcs' },
        { name: 'Milk', quantity: null, unit: null },
      ],
    });
    saveIngredientsBatch.mockResolvedValue([
      { ingredientName: 'Tomato', quant: 3, unit: 'pcs' },
      { ingredientName: 'Milk', quant: 1, unit: 'item' },
    ]);

    const response = await request(app).post('/inventory/review/session-abc/confirm');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.ingredients).toHaveLength(2);
    expect(confirmSession).toHaveBeenCalledWith('session-abc');
    expect(saveIngredientsBatch).toHaveBeenCalledWith('test-user-123', [
      { ingredientName: 'Tomato', quant: 3, unit: 'pcs' },
      { ingredientName: 'Milk', quant: 1, unit: 'item' },
    ]);
  });

  test('uses default quant=1 and unit=item when not provided', async () => {
    confirmSession.mockReturnValue({
      confirmed: true,
      ingredients: [{ name: 'Egg', quantity: undefined, unit: undefined }],
    });
    saveIngredientsBatch.mockResolvedValue([{ ingredientName: 'Egg', quant: 1, unit: 'item' }]);

    await request(app).post('/inventory/review/session-abc/confirm');

    expect(saveIngredientsBatch).toHaveBeenCalledWith('test-user-123', [
      { ingredientName: 'Egg', quant: 1, unit: 'item' },
    ]);
  });

  test('returns 404 when session is not found', async () => {
    confirmSession.mockReturnValue({ confirmed: false, ingredients: [] });

    const response = await request(app).post('/inventory/review/bad-session/confirm');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Session not found');
    expect(saveIngredientsBatch).not.toHaveBeenCalled();
  });

  test('returns 500 on service error', async () => {
    confirmSession.mockReturnValue({
      confirmed: true,
      ingredients: [{ name: 'Tomato', quantity: 1, unit: 'pcs' }],
    });
    saveIngredientsBatch.mockRejectedValue(new Error('Firestore write failed'));

    const response = await request(app).post('/inventory/review/session-abc/confirm');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /inventory/update
// ---------------------------------------------------------------------------
describe('POST /inventory/update', () => {
  test('returns 201 with saved items on success', async () => {
    const mockItems = [{ ingredientName: 'Onion', quant: 2, unit: 'pcs' }];
    saveIngredientsBatch.mockResolvedValue(mockItems);

    const response = await request(app)
      .post('/inventory/update')
      .send({ items: [{ ingredientName: 'Onion', quant: 2, unit: 'pcs' }] });

    expect(response.status).toBe(201);
    expect(response.body.items).toHaveLength(1);
    expect(saveIngredientsBatch).toHaveBeenCalledWith(
      'test-user-123',
      [{ ingredientName: 'Onion', quant: 2, unit: 'pcs' }]
    );
  });

  test('returns 400 when items array is empty', async () => {
    const response = await request(app)
      .post('/inventory/update')
      .send({ items: [] });

    expect(response.status).toBe(400);
    expect(saveIngredientsBatch).not.toHaveBeenCalled();
  });

  test('returns 400 when items is not an array', async () => {
    const response = await request(app)
      .post('/inventory/update')
      .send({ items: 'onion' });

    expect(response.status).toBe(400);
    expect(saveIngredientsBatch).not.toHaveBeenCalled();
  });

  test('returns 500 on service error', async () => {
    saveIngredientsBatch.mockRejectedValue(new Error('Write failed'));

    const response = await request(app)
      .post('/inventory/update')
      .send({ items: [{ ingredientName: 'Onion', quant: 2, unit: 'pcs' }] });

    expect(response.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// PATCH /inventory/item/:itemId
// ---------------------------------------------------------------------------
describe('PATCH /inventory/item/:itemId', () => {
  test('returns 200 with updated item on success', async () => {
    const mockUpdated = { id: 'item-1', ingredientName: 'Milk', quant: 2, unit: 'L' };
    updateIngredient.mockResolvedValue(mockUpdated);

    const response = await request(app)
      .patch('/inventory/item/item-1')
      .send({ quant: 2, unit: 'L' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.item).toMatchObject({ quant: 2, unit: 'L' });
    expect(updateIngredient).toHaveBeenCalledWith('test-user-123', 'item-1', {
      quant: 2,
      unit: 'L',
      expiryDate: undefined,
    });
  });

  test('returns 400 when no fields are provided', async () => {
    const response = await request(app)
      .patch('/inventory/item/item-1')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/At least one field/);
    expect(updateIngredient).not.toHaveBeenCalled();
  });

  test('returns 400 when quant is negative', async () => {
    const response = await request(app)
      .patch('/inventory/item/item-1')
      .send({ quant: -1 });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/non-negative/);
    expect(updateIngredient).not.toHaveBeenCalled();
  });

  test('returns 400 when quant is not a number', async () => {
    const response = await request(app)
      .patch('/inventory/item/item-1')
      .send({ quant: 'lots' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(updateIngredient).not.toHaveBeenCalled();
  });

  test('returns 400 when expiryDate is not a valid date', async () => {
    const response = await request(app)
      .patch('/inventory/item/item-1')
      .send({ expiryDate: 'not-a-date' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/valid date/);
    expect(updateIngredient).not.toHaveBeenCalled();
  });

  test('accepts a valid expiryDate string', async () => {
    const mockUpdated = { id: 'item-1', ingredientName: 'Yogurt', expiryDate: '2026-04-01' };
    updateIngredient.mockResolvedValue(mockUpdated);

    const response = await request(app)
      .patch('/inventory/item/item-1')
      .send({ expiryDate: '2026-04-01' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /inventory/cook
// ---------------------------------------------------------------------------
describe('POST /inventory/cook', () => {
  test('returns 200 with deduction result on success', async () => {
    deductIngredientsForRecipe.mockResolvedValue({
      deducted: [{ name: 'Tomato', previousQty: 5, deductedAmount: 2, newQty: 3 }],
      skipped: [],
      errors: [],
    });

    const response = await request(app)
      .post('/inventory/cook')
      .send({ ingredients: [{ name: 'Tomato', amount: 2, unit: 'pcs' }] });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.deducted).toHaveLength(1);
    expect(response.body.skipped).toHaveLength(0);
    expect(deductIngredientsForRecipe).toHaveBeenCalledWith(
      'test-user-123',
      [{ name: 'Tomato', amount: 2, unit: 'pcs' }]
    );
  });

  test('returns 400 when ingredients is missing', async () => {
    const response = await request(app).post('/inventory/cook').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(deductIngredientsForRecipe).not.toHaveBeenCalled();
  });

  test('returns 400 when ingredients is an empty array', async () => {
    const response = await request(app)
      .post('/inventory/cook')
      .send({ ingredients: [] });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(deductIngredientsForRecipe).not.toHaveBeenCalled();
  });

  test('returns 500 on service error', async () => {
    deductIngredientsForRecipe.mockRejectedValue(new Error('Deduction failed'));

    const response = await request(app)
      .post('/inventory/cook')
      .send({ ingredients: [{ name: 'Tomato', amount: 2, unit: 'pcs' }] });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /inventory/profile-analysis
// ---------------------------------------------------------------------------
describe('GET /inventory/profile-analysis', () => {
  test('returns 200 with analysis when active ingredients exist', async () => {
    getUserInventory.mockResolvedValue([
      { ingredientName: 'Chicken', quant: 2 },
      { ingredientName: 'Broccoli', quant: 1 },
      { ingredientName: 'Empty item', quant: 0 },
    ]);
    analyzeUserProfile.mockResolvedValue({
      persona: 'Health Enthusiast',
      emoji: '🥗',
      description: 'You eat clean.',
      dietType: 'Balanced',
      cookingStyle: 'Simple',
      healthScore: 85,
      funFact: 'You avoid processed food.',
    });

    const response = await request(app).get('/inventory/profile-analysis');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.analysis.persona).toBe('Health Enthusiast');
    expect(response.body.ingredientCount).toBe(2);
    // Only active items (quant > 0) should be passed to analyzeUserProfile
    expect(analyzeUserProfile).toHaveBeenCalledWith(['Chicken', 'Broccoli']);
  });

  test('returns 400 when all inventory items have quant = 0', async () => {
    getUserInventory.mockResolvedValue([
      { ingredientName: 'Expired Milk', quant: 0 },
    ]);

    const response = await request(app).get('/inventory/profile-analysis');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/No ingredients/);
    expect(analyzeUserProfile).not.toHaveBeenCalled();
  });

  test('returns 400 when inventory is empty', async () => {
    getUserInventory.mockResolvedValue([]);

    const response = await request(app).get('/inventory/profile-analysis');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(analyzeUserProfile).not.toHaveBeenCalled();
  });

  test('returns 500 on getUserInventory error', async () => {
    getUserInventory.mockRejectedValue(new Error('DB error'));

    const response = await request(app).get('/inventory/profile-analysis');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });

  test('returns 500 on analyzeUserProfile error', async () => {
    getUserInventory.mockResolvedValue([{ ingredientName: 'Chicken', quant: 2 }]);
    analyzeUserProfile.mockRejectedValue(new Error('AI service down'));

    const response = await request(app).get('/inventory/profile-analysis');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});
