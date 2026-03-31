'use strict';

jest.mock('../../services/s3Service');
jest.mock('../../services/ingredientVisionService');
jest.mock('../../../../../../sdk/firebase/firestore', () => ({
  verifyFirebaseToken: (req, res, next) => {
    req.userId = 'test-user-123';
    next();
  },
}));

const request = require('supertest');
const express = require('express');
const ingredientsRouter = require('../ingredients');

const { uploadIngredientImage } = require('../../services/s3Service');
const { detectIngredientsFromImage } = require('../../services/ingredientVisionService');

const app = express();
app.use(express.json());
app.use('/ingredients', ingredientsRouter);

// A minimal fake image buffer used across tests
const fakeImageBuffer = Buffer.from('fake-image-data');

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// POST /ingredients/photo
// ---------------------------------------------------------------------------
describe('POST /ingredients/photo', () => {
  test('returns 200 with imageUrl and detected ingredients on full success', async () => {
    uploadIngredientImage.mockResolvedValue({ url: 'https://s3.example.com/ingredients/test.jpg' });
    detectIngredientsFromImage.mockResolvedValue({
      ingredients: [
        { name: 'tomato', confidence: 0.94 },
        { name: 'onion', confidence: 0.88 },
      ],
    });

    const response = await request(app)
      .post('/ingredients/photo')
      .attach('image', fakeImageBuffer, { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.imageUrl).toBe('https://s3.example.com/ingredients/test.jpg');
    expect(response.body.ingredients).toHaveLength(2);
    expect(response.body.ingredients[0]).toMatchObject({ name: 'tomato', confidence: 0.94 });
    expect(uploadIngredientImage).toHaveBeenCalledWith(
      expect.any(Buffer),
      'test.jpg',
      'image/jpeg'
    );
    expect(detectIngredientsFromImage).toHaveBeenCalledWith(
      'https://s3.example.com/ingredients/test.jpg',
      expect.any(Buffer)
    );
  });

  test('returns 200 with null imageUrl when S3 upload fails (silently skipped)', async () => {
    uploadIngredientImage.mockRejectedValue(new Error('S3 bucket unavailable'));
    detectIngredientsFromImage.mockResolvedValue({
      ingredients: [{ name: 'carrot', confidence: 0.91 }],
    });

    const response = await request(app)
      .post('/ingredients/photo')
      .attach('image', fakeImageBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.imageUrl).toBeNull();
    expect(response.body.ingredients).toHaveLength(1);
    // Detection must still be called even when S3 fails
    expect(detectIngredientsFromImage).toHaveBeenCalledWith(null, expect.any(Buffer));
  });

  test('returns 200 with empty ingredients array when detection finds nothing', async () => {
    uploadIngredientImage.mockResolvedValue({ url: 'https://s3.example.com/ingredients/empty.jpg' });
    detectIngredientsFromImage.mockResolvedValue({ ingredients: [] });

    const response = await request(app)
      .post('/ingredients/photo')
      .attach('image', fakeImageBuffer, { filename: 'empty.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.ingredients).toEqual([]);
  });

  test('returns 200 with empty ingredients when detection returns no ingredients field', async () => {
    uploadIngredientImage.mockResolvedValue({ url: 'https://s3.example.com/ingredients/img.jpg' });
    detectIngredientsFromImage.mockResolvedValue({});

    const response = await request(app)
      .post('/ingredients/photo')
      .attach('image', fakeImageBuffer, { filename: 'img.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(200);
    expect(response.body.ingredients).toEqual([]);
  });

  test('returns 400 when no image file is attached', async () => {
    const response = await request(app).post('/ingredients/photo');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('image field is required');
    expect(uploadIngredientImage).not.toHaveBeenCalled();
    expect(detectIngredientsFromImage).not.toHaveBeenCalled();
  });

  test('returns 500 when ingredient detection throws', async () => {
    uploadIngredientImage.mockResolvedValue({ url: 'https://s3.example.com/ingredients/img.jpg' });
    detectIngredientsFromImage.mockRejectedValue(new Error('Vision API unavailable'));

    const response = await request(app)
      .post('/ingredients/photo')
      .attach('image', fakeImageBuffer, { filename: 'img.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/Failed to process ingredient image/);
    expect(response.body.error).toMatch(/Vision API unavailable/);
  });

  test('returns 500 when both S3 upload and detection throw', async () => {
    uploadIngredientImage.mockRejectedValue(new Error('S3 error'));
    detectIngredientsFromImage.mockRejectedValue(new Error('Detection crash'));

    const response = await request(app)
      .post('/ingredients/photo')
      .attach('image', fakeImageBuffer, { filename: 'img.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/Detection crash/);
  });
});
