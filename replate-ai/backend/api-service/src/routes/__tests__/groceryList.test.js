'use strict';

jest.mock('../../services/groceryListService');
jest.mock('../../../../../../sdk/firebase/firestore', () => ({
  verifyFirebaseToken: (req, res, next) => {
    req.userId = 'test-user-123';
    next();
  },
}));

const request = require('supertest');
const express = require('express');
const groceryListRouter = require('../groceryList');

const {
  createGroceryList,
  getGroceryList,
  getUserGroceryLists,
  toggleItemAvailability,
} = require('../../services/groceryListService');

const app = express();
app.use(express.json());
app.use('/grocery-list', groceryListRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// POST /grocery-list
// ---------------------------------------------------------------------------
describe('POST /grocery-list', () => {
  test('returns 201 with created list on success', async () => {
    const mockList = {
      id: 'list-1',
      recipeId: 'recipe-abc',
      recipeTitle: 'Pasta Carbonara',
      createdAt: 'MOCK_TIMESTAMP',
      items: [
        { id: 'item-1', name: 'Pancetta', amount: 200, unit: 'g', isAvailableAtHome: false },
      ],
    };
    createGroceryList.mockResolvedValue(mockList);

    const response = await request(app)
      .post('/grocery-list')
      .send({
        recipeId: 'recipe-abc',
        recipeTitle: 'Pasta Carbonara',
        missingIngredients: [{ name: 'Pancetta', amount: 200, unit: 'g' }],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.list).toMatchObject({ id: 'list-1' });
    expect(createGroceryList).toHaveBeenCalledWith('test-user-123', {
      recipeId: 'recipe-abc',
      recipeTitle: 'Pasta Carbonara',
      missingIngredients: [{ name: 'Pancetta', amount: 200, unit: 'g' }],
    });
  });

  test('returns 400 when recipeId is missing', async () => {
    const response = await request(app)
      .post('/grocery-list')
      .send({
        recipeTitle: 'Pasta Carbonara',
        missingIngredients: [{ name: 'Pancetta', amount: 200, unit: 'g' }],
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(createGroceryList).not.toHaveBeenCalled();
  });

  test('returns 400 when recipeTitle is missing', async () => {
    const response = await request(app)
      .post('/grocery-list')
      .send({
        recipeId: 'recipe-abc',
        missingIngredients: [{ name: 'Pancetta', amount: 200, unit: 'g' }],
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(createGroceryList).not.toHaveBeenCalled();
  });

  test('returns 400 when missingIngredients is missing', async () => {
    const response = await request(app)
      .post('/grocery-list')
      .send({
        recipeId: 'recipe-abc',
        recipeTitle: 'Pasta Carbonara',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(createGroceryList).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// GET /grocery-list/:listId
// ---------------------------------------------------------------------------
describe('GET /grocery-list/:listId', () => {
  test('returns 200 with list when found', async () => {
    const mockList = {
      id: 'list-1',
      recipeId: 'recipe-abc',
      recipeTitle: 'Pasta Carbonara',
      createdAt: 'MOCK_TIMESTAMP',
      items: [
        { id: 'item-1', name: 'Pancetta', amount: 200, unit: 'g', isAvailableAtHome: false },
      ],
    };
    getGroceryList.mockResolvedValue(mockList);

    const response = await request(app).get('/grocery-list/list-1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.list).toMatchObject({ id: 'list-1' });
    expect(getGroceryList).toHaveBeenCalledWith('test-user-123', 'list-1');
  });

  test('returns 404 when list not found', async () => {
    getGroceryList.mockResolvedValue(null);

    const response = await request(app).get('/grocery-list/non-existent');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PATCH /grocery-list/:listId/item/:itemId/toggle
// ---------------------------------------------------------------------------
describe('PATCH /grocery-list/:listId/item/:itemId/toggle', () => {
  test('returns 200 with updated item when toggled successfully', async () => {
    const mockItem = {
      id: 'item-1',
      name: 'Pancetta',
      amount: 200,
      unit: 'g',
      isAvailableAtHome: true,
    };
    toggleItemAvailability.mockResolvedValue(mockItem);

    const response = await request(app).patch(
      '/grocery-list/list-1/item/item-1/toggle'
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.item).toMatchObject({ isAvailableAtHome: true });
    expect(toggleItemAvailability).toHaveBeenCalledWith(
      'test-user-123',
      'list-1',
      'item-1'
    );
  });

  test('returns 404 when list not found', async () => {
    toggleItemAvailability.mockRejectedValue(
      new Error('Grocery list not found')
    );

    const response = await request(app).patch(
      '/grocery-list/non-existent/item/item-1/toggle'
    );

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test('returns 404 when item not found', async () => {
    toggleItemAvailability.mockRejectedValue(
      new Error('Item not found in grocery list')
    );

    const response = await request(app).patch(
      '/grocery-list/list-1/item/non-existent/toggle'
    );

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
