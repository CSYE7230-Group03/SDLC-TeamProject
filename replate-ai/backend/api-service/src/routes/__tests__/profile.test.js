'use strict';

jest.mock('../../../../../../sdk/firebase/firestore', () => ({
  verifyFirebaseToken: (req, res, next) => {
    req.userId = 'test-user-123';
    next();
  },
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
  readDocument: jest.fn(),
  updateDocument: jest.fn(),
  createDocument: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const profileRouter = require('../profile');

const {
  readDocument,
  updateDocument,
  createDocument,
} = require('../../../../../../sdk/firebase/firestore');

const app = express();
app.use(express.json());
app.use('/profile', profileRouter);

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /profile
// ---------------------------------------------------------------------------
describe('GET /profile', () => {
  test('returns 200 with profile and dietaryPreferences when doc exists', async () => {
    readDocument.mockResolvedValue({
      email: 'user@example.com',
      displayName: 'Test User',
      dietaryPreferences: {
        restrictions: ['vegetarian'],
        allergies: ['peanuts'],
        skillLevel: 'beginner',
        maxCookingTime: 30,
      },
    });

    const response = await request(app).get('/profile');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.profile).toMatchObject({
      uid: 'test-user-123',
      email: 'user@example.com',
      displayName: 'Test User',
    });
    expect(response.body.dietaryPreferences.restrictions).toEqual(['vegetarian']);
    expect(readDocument).toHaveBeenCalledWith('Users', 'test-user-123');
  });

  test('returns default dietaryPreferences when doc has none', async () => {
    readDocument.mockResolvedValue({ email: 'user@example.com', displayName: 'Test User' });

    const response = await request(app).get('/profile');

    expect(response.status).toBe(200);
    expect(response.body.dietaryPreferences).toEqual({
      restrictions: [],
      allergies: [],
      skillLevel: '',
      maxCookingTime: null,
    });
  });

  test('returns empty defaults when doc is null', async () => {
    readDocument.mockResolvedValue(null);

    const response = await request(app).get('/profile');

    expect(response.status).toBe(200);
    expect(response.body.profile.email).toBeNull();
    expect(response.body.profile.displayName).toBe('');
  });

  test('returns 500 on Firestore error', async () => {
    readDocument.mockRejectedValue(new Error('Firestore unavailable'));

    const response = await request(app).get('/profile');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PATCH /profile
// ---------------------------------------------------------------------------
describe('PATCH /profile — displayName', () => {
  test('returns 200 when updating displayName only', async () => {
    readDocument
      .mockResolvedValueOnce({ email: 'user@example.com', displayName: 'Old Name' }) // existing check
      .mockResolvedValueOnce({ email: 'user@example.com', displayName: 'New Name' }); // re-read after update
    updateDocument.mockResolvedValue();

    const response = await request(app).patch('/profile').send({ displayName: 'New Name' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.profile.displayName).toBe('New Name');
    expect(updateDocument).toHaveBeenCalledWith('Users', 'test-user-123', expect.objectContaining({
      displayName: 'New Name',
    }));
  });

  test('returns 400 when displayName is empty string', async () => {
    const response = await request(app).patch('/profile').send({ displayName: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/non-empty string/);
    expect(updateDocument).not.toHaveBeenCalled();
  });

  test('returns 400 when displayName is not a string', async () => {
    const response = await request(app).patch('/profile').send({ displayName: 123 });

    expect(response.status).toBe(400);
    expect(updateDocument).not.toHaveBeenCalled();
  });
});

describe('PATCH /profile — dietaryPreferences', () => {
  test('returns 200 when updating dietaryPreferences', async () => {
    readDocument
      .mockResolvedValueOnce({ displayName: 'User' })
      .mockResolvedValueOnce({
        displayName: 'User',
        dietaryPreferences: { restrictions: ['vegan'], allergies: [], skillLevel: 'intermediate', maxCookingTime: 45 },
      });
    updateDocument.mockResolvedValue();

    const response = await request(app).patch('/profile').send({
      dietaryPreferences: {
        restrictions: ['vegan'],
        allergies: [],
        skillLevel: 'intermediate',
        maxCookingTime: 45,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.dietaryPreferences.restrictions).toEqual(['vegan']);
    expect(response.body.dietaryPreferences.maxCookingTime).toBe(45);
  });

  test('returns 400 when dietaryPreferences is not an object', async () => {
    const response = await request(app).patch('/profile').send({ dietaryPreferences: 'vegan' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/must be an object/);
    expect(updateDocument).not.toHaveBeenCalled();
  });

  test('returns 400 when restrictions is not an array', async () => {
    const response = await request(app).patch('/profile').send({
      dietaryPreferences: { restrictions: 'vegan' },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/restrictions must be an array/);
  });

  test('returns 400 when allergies is not an array', async () => {
    const response = await request(app).patch('/profile').send({
      dietaryPreferences: { allergies: 'peanuts' },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/allergies must be an array/);
  });

  test('returns 400 when skillLevel is not a string', async () => {
    const response = await request(app).patch('/profile').send({
      dietaryPreferences: { skillLevel: 99 },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/skillLevel must be a string/);
  });

  test('returns 400 when maxCookingTime is zero', async () => {
    const response = await request(app).patch('/profile').send({
      dietaryPreferences: { maxCookingTime: 0 },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/positive number/);
  });

  test('returns 400 when maxCookingTime is negative', async () => {
    const response = await request(app).patch('/profile').send({
      dietaryPreferences: { maxCookingTime: -10 },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/positive number/);
  });

  test('returns 400 when maxCookingTime is non-numeric string', async () => {
    const response = await request(app).patch('/profile').send({
      dietaryPreferences: { maxCookingTime: 'fast' },
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/positive number/);
  });
});

describe('PATCH /profile — misc', () => {
  test('returns 400 when no updatable fields are provided', async () => {
    const response = await request(app).patch('/profile').send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/No updatable fields/);
    expect(updateDocument).not.toHaveBeenCalled();
  });

  test('creates doc when user profile does not exist yet', async () => {
    readDocument
      .mockResolvedValueOnce(null) // existing check returns null
      .mockResolvedValueOnce({ displayName: 'New User', email: null }); // re-read after update
    createDocument.mockResolvedValue();
    updateDocument.mockResolvedValue();

    const response = await request(app).patch('/profile').send({ displayName: 'New User' });

    expect(response.status).toBe(200);
    expect(createDocument).toHaveBeenCalledWith('Users', 'test-user-123', expect.objectContaining({
      uid: 'test-user-123',
      displayName: 'New User',
    }));
  });

  test('returns 500 on Firestore error', async () => {
    readDocument.mockRejectedValue(new Error('Write failed'));

    const response = await request(app).patch('/profile').send({ displayName: 'User' });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});
