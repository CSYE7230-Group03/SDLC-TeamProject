'use strict';

jest.mock('../../services/recipeService');
jest.mock('../../../../../../sdk/firebase/firestore', () => ({
  verifyFirebaseToken: (req, res, next) => {
    req.userId = 'test-user-123';
    next();
  },
  readDocument: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const recipesRouter = require('../recipes');

const { generateRecipes } = require('../../services/recipeService');
const { readDocument } = require('../../../../../../sdk/firebase/firestore');

const app = express();
app.use(express.json());
app.use('/recipes', recipesRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// POST /recipes/generate
// ---------------------------------------------------------------------------
describe('POST /recipes/generate', () => {
  test('returns 200 with recipes when ingredients are provided', async () => {
    generateRecipes.mockResolvedValue({
      source: 'spoonacular',
      recipes: [
        { id: 1, title: 'Chicken Rice', readyInMinutes: 30 },
        { id: 2, title: 'Chicken Stir Fry', readyInMinutes: 20 },
      ],
    });

    const response = await request(app)
      .post('/recipes/generate')
      .send({ ingredients: ['chicken', 'rice'], preferences: { restrictions: ['gluten free'] }, count: 2 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.source).toBe('spoonacular');
    expect(response.body.count).toBe(2);
    expect(response.body.recipes).toHaveLength(2);
    expect(generateRecipes).toHaveBeenCalledWith(
      ['chicken', 'rice'],
      { restrictions: ['gluten free'] },
      2
    );
  });

  test('defaults count to 3 when not provided', async () => {
    generateRecipes.mockResolvedValue({ source: 'spoonacular', recipes: [] });

    await request(app)
      .post('/recipes/generate')
      .send({ ingredients: ['chicken'], preferences: {} });

    expect(generateRecipes).toHaveBeenCalledWith(expect.any(Array), expect.any(Object), 3);
  });

  test('loads preferences from user profile when not provided in request', async () => {
    readDocument.mockResolvedValue({
      dietaryPreferences: { restrictions: ['vegan'], maxCookingTime: 45 },
    });
    generateRecipes.mockResolvedValue({ source: 'spoonacular', recipes: [] });

    await request(app)
      .post('/recipes/generate')
      .send({ ingredients: ['tofu'] });

    expect(readDocument).toHaveBeenCalledWith('Users', 'test-user-123');
    expect(generateRecipes).toHaveBeenCalledWith(
      ['tofu'],
      { restrictions: ['vegan'], maxCookingTime: 45 },
      3
    );
  });

  test('loads preferences from profile when preferences is an empty object', async () => {
    readDocument.mockResolvedValue({
      dietaryPreferences: { restrictions: ['vegetarian'] },
    });
    generateRecipes.mockResolvedValue({ source: 'spoonacular', recipes: [] });

    await request(app)
      .post('/recipes/generate')
      .send({ ingredients: ['lentils'], preferences: {} });

    expect(readDocument).toHaveBeenCalledWith('Users', 'test-user-123');
    expect(generateRecipes).toHaveBeenCalledWith(
      ['lentils'],
      { restrictions: ['vegetarian'] },
      3
    );
  });

  test('falls back to empty preferences when user profile has none', async () => {
    readDocument.mockResolvedValue({});
    generateRecipes.mockResolvedValue({ source: 'spoonacular', recipes: [] });

    await request(app)
      .post('/recipes/generate')
      .send({ ingredients: ['egg'] });

    expect(generateRecipes).toHaveBeenCalledWith(['egg'], {}, 3);
  });

  test('returns 400 when ingredients is missing', async () => {
    const response = await request(app).post('/recipes/generate').send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/ingredients is required/);
    expect(generateRecipes).not.toHaveBeenCalled();
  });

  test('returns 400 when ingredients is an empty array', async () => {
    const response = await request(app)
      .post('/recipes/generate')
      .send({ ingredients: [] });

    expect(response.status).toBe(400);
    expect(generateRecipes).not.toHaveBeenCalled();
  });

  test('returns 400 when ingredients is not an array', async () => {
    const response = await request(app)
      .post('/recipes/generate')
      .send({ ingredients: 'chicken' });

    expect(response.status).toBe(400);
    expect(generateRecipes).not.toHaveBeenCalled();
  });

  test('returns 500 on service error', async () => {
    generateRecipes.mockRejectedValue(new Error('Recipe API unavailable'));

    const response = await request(app)
      .post('/recipes/generate')
      .send({ ingredients: ['chicken'], preferences: { restrictions: [] } });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Recipe API unavailable');
  });
});
