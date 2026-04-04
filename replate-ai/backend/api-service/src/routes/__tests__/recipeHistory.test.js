'use strict';

jest.mock('../../services/recipeHistoryService');

const request = require('supertest');
const express = require('express');
const recipeHistoryRouter = require('../recipeHistory');

const { saveRecipe, getUserHistory } = require('../../services/recipeHistoryService');

const app = express();
app.use(express.json());
app.use('/recipe-history', recipeHistoryRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// POST /recipe-history
// ---------------------------------------------------------------------------
describe('POST /recipe-history', () => {
  test('returns 201 on successful save', async () => {
    saveRecipe.mockResolvedValue({ saved: true, recipeId: 'recipe-1' });

    const response = await request(app)
      .post('/recipe-history')
      .send({ recipe: { id: 'recipe-1', title: 'Pasta' } });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.saved).toBe(true);
    expect(saveRecipe).toHaveBeenCalledWith('placeholder-user', { id: 'recipe-1', title: 'Pasta' });
  });

  test('returns 201 when recipe is already saved (silent dedup)', async () => {
    saveRecipe.mockResolvedValue({ saved: false, recipeId: 'recipe-1' });

    const response = await request(app)
      .post('/recipe-history')
      .send({ recipe: { id: 'recipe-1', title: 'Pasta' } });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.saved).toBe(false);
  });

  test('returns 400 when recipe is missing', async () => {
    const response = await request(app).post('/recipe-history').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/recipe with an id is required/);
    expect(saveRecipe).not.toHaveBeenCalled();
  });

  test('returns 400 when recipe has no id', async () => {
    const response = await request(app)
      .post('/recipe-history')
      .send({ recipe: { title: 'Pasta' } });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(saveRecipe).not.toHaveBeenCalled();
  });

  test('returns 400 when recipe is not an object', async () => {
    const response = await request(app)
      .post('/recipe-history')
      .send({ recipe: 'pasta' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(saveRecipe).not.toHaveBeenCalled();
  });

  test('returns 500 on service error', async () => {
    saveRecipe.mockRejectedValue(new Error('Firestore write failed'));

    const response = await request(app)
      .post('/recipe-history')
      .send({ recipe: { id: 'recipe-1', title: 'Pasta' } });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /recipe-history
// ---------------------------------------------------------------------------
describe('GET /recipe-history', () => {
  test('returns 200 with list of recipes', async () => {
    const mockRecipes = [
      { id: 'recipe-1', title: 'Pasta', savedAt: '2026-03-01' },
      { id: 'recipe-2', title: 'Salad', savedAt: '2026-03-02' },
    ];
    getUserHistory.mockResolvedValue(mockRecipes);

    const response = await request(app).get('/recipe-history');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.recipes).toHaveLength(2);
    expect(getUserHistory).toHaveBeenCalledWith('placeholder-user');
  });

  test('returns 200 with empty array when no history', async () => {
    getUserHistory.mockResolvedValue([]);

    const response = await request(app).get('/recipe-history');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.recipes).toEqual([]);
  });

  test('returns 500 on service error', async () => {
    getUserHistory.mockRejectedValue(new Error('Firestore read failed'));

    const response = await request(app).get('/recipe-history');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});
