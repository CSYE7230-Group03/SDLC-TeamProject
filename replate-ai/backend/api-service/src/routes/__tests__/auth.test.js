'use strict';

jest.mock('axios');
jest.mock('../../../../../../sdk/firebase/index', () => ({
  getAuth: jest.fn(),
}));
jest.mock('../../../../../../sdk/firebase/firestore', () => ({
  createDocument: jest.fn(),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
}));

const request = require('supertest');
const express = require('express');
const axios = require('axios');
const { getAuth } = require('../../../../../../sdk/firebase/index');
const { createDocument } = require('../../../../../../sdk/firebase/firestore');
const authRouter = require('../auth');

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

const mockCreateUser = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  getAuth.mockReturnValue({ createUser: mockCreateUser });
  process.env.FIREBASE_API_KEY = 'test-api-key';
});

// ---------------------------------------------------------------------------
// POST /auth/signup
// ---------------------------------------------------------------------------
describe('POST /auth/signup', () => {
  test('returns 201 with user data on successful signup', async () => {
    mockCreateUser.mockResolvedValue({
      uid: 'uid-123',
      email: 'test@example.com',
      displayName: 'Test User',
    });
    createDocument.mockResolvedValue();

    const response = await request(app).post('/auth/signup').send({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.uid).toBe('uid-123');
    expect(response.body.email).toBe('test@example.com');
    expect(response.body.displayName).toBe('Test User');
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    });
    expect(createDocument).toHaveBeenCalledWith('Users', 'uid-123', expect.objectContaining({
      uid: 'uid-123',
      email: 'test@example.com',
      displayName: 'Test User',
    }));
  });

  test('returns 400 when email is missing', async () => {
    const response = await request(app).post('/auth/signup').send({
      password: 'password123',
      displayName: 'Test User',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  test('returns 400 when password is missing', async () => {
    const response = await request(app).post('/auth/signup').send({
      email: 'test@example.com',
      displayName: 'Test User',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  test('returns 400 when displayName is missing', async () => {
    const response = await request(app).post('/auth/signup').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  test('returns 400 when password is shorter than 6 characters', async () => {
    const response = await request(app).post('/auth/signup').send({
      email: 'test@example.com',
      password: 'abc',
      displayName: 'Test User',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/6 characters/);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  test('returns 409 when email is already in use', async () => {
    const err = new Error('Email already exists');
    err.code = 'auth/email-already-exists';
    mockCreateUser.mockRejectedValue(err);

    const response = await request(app).post('/auth/signup').send({
      email: 'existing@example.com',
      password: 'password123',
      displayName: 'Test User',
    });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Email already in use');
  });

  test('returns 500 on unexpected Firebase error', async () => {
    mockCreateUser.mockRejectedValue(new Error('Internal Firebase error'));

    const response = await request(app).post('/auth/signup').send({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/signin
// ---------------------------------------------------------------------------
describe('POST /auth/signin', () => {
  test('returns 200 with tokens on successful signin', async () => {
    axios.post.mockResolvedValue({
      data: {
        idToken: 'mock-id-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: '3600',
        localId: 'uid-123',
        displayName: 'Test User',
      },
    });

    const response = await request(app).post('/auth/signin').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.idToken).toBe('mock-id-token');
    expect(response.body.refreshToken).toBe('mock-refresh-token');
    expect(response.body.uid).toBe('uid-123');
    expect(response.body.displayName).toBe('Test User');
    expect(response.body.email).toBe('test@example.com');
  });

  test('returns 200 with empty displayName when not provided by Firebase', async () => {
    axios.post.mockResolvedValue({
      data: {
        idToken: 'mock-id-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: '3600',
        localId: 'uid-123',
        displayName: '',
      },
    });

    const response = await request(app).post('/auth/signin').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.displayName).toBe('');
  });

  test('returns 400 when email is missing', async () => {
    const response = await request(app).post('/auth/signin').send({
      password: 'password123',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('returns 400 when password is missing', async () => {
    const response = await request(app).post('/auth/signin').send({
      email: 'test@example.com',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('returns 401 for invalid password', async () => {
    const err = new Error('Firebase error');
    err.response = { data: { error: { message: 'INVALID_PASSWORD' } } };
    axios.post.mockRejectedValue(err);

    const response = await request(app).post('/auth/signin').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Invalid email or password');
  });

  test('returns 401 for unknown email', async () => {
    const err = new Error('Firebase error');
    err.response = { data: { error: { message: 'EMAIL_NOT_FOUND' } } };
    axios.post.mockRejectedValue(err);

    const response = await request(app).post('/auth/signin').send({
      email: 'unknown@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Invalid email or password');
  });

  test('returns 401 for INVALID_LOGIN_CREDENTIALS', async () => {
    const err = new Error('Firebase error');
    err.response = { data: { error: { message: 'INVALID_LOGIN_CREDENTIALS' } } };
    axios.post.mockRejectedValue(err);

    const response = await request(app).post('/auth/signin').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email or password');
  });

  test('returns 429 when too many attempts', async () => {
    const err = new Error('Firebase error');
    err.response = { data: { error: { message: 'TOO_MANY_ATTEMPTS_TRY_LATER' } } };
    axios.post.mockRejectedValue(err);

    const response = await request(app).post('/auth/signin').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/Too many attempts/);
  });

  test('returns 500 on unexpected error', async () => {
    axios.post.mockRejectedValue(new Error('Network error'));

    const response = await request(app).post('/auth/signin').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/forgot-password
// ---------------------------------------------------------------------------
describe('POST /auth/forgot-password', () => {
  test('returns 200 regardless of whether email is registered', async () => {
    axios.post.mockResolvedValue({});

    const response = await request(app).post('/auth/forgot-password').send({
      email: 'test@example.com',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toMatch(/reset link/);
  });

  test('returns 200 even when EMAIL_NOT_FOUND (prevents enumeration)', async () => {
    const err = new Error('Firebase error');
    err.response = { data: { error: { message: 'EMAIL_NOT_FOUND' } } };
    axios.post.mockRejectedValue(err);

    const response = await request(app).post('/auth/forgot-password').send({
      email: 'notregistered@example.com',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('returns 200 even when Firebase throws an unexpected error', async () => {
    axios.post.mockRejectedValue(new Error('Internal server error'));

    const response = await request(app).post('/auth/forgot-password').send({
      email: 'test@example.com',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('returns 400 when email is missing', async () => {
    const response = await request(app).post('/auth/forgot-password').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(axios.post).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------------------
describe('POST /auth/refresh', () => {
  test('returns 200 with new tokens on success', async () => {
    axios.post.mockResolvedValue({
      data: {
        id_token: 'new-id-token',
        refresh_token: 'new-refresh-token',
        expires_in: '3600',
      },
    });

    const response = await request(app).post('/auth/refresh').send({
      refreshToken: 'valid-refresh-token',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.idToken).toBe('new-id-token');
    expect(response.body.refreshToken).toBe('new-refresh-token');
    expect(response.body.expiresIn).toBe('3600');
  });

  test('returns 400 when refreshToken is missing', async () => {
    const response = await request(app).post('/auth/refresh').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('returns 401 when refresh token is invalid or expired', async () => {
    axios.post.mockRejectedValue(new Error('Token expired'));

    const response = await request(app).post('/auth/refresh').send({
      refreshToken: 'expired-refresh-token',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/Session expired/);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/google
// ---------------------------------------------------------------------------
describe('POST /auth/google', () => {
  test('returns 200 with Firebase tokens on successful Google sign-in', async () => {
    axios.post.mockResolvedValue({
      data: {
        idToken: 'firebase-id-token',
        refreshToken: 'firebase-refresh-token',
        localId: 'google-uid-123',
        displayName: 'Google User',
        email: 'google@example.com',
      },
    });
    createDocument.mockResolvedValue();

    const response = await request(app).post('/auth/google').send({
      idToken: 'google-id-token',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.idToken).toBe('firebase-id-token');
    expect(response.body.uid).toBe('google-uid-123');
    expect(response.body.displayName).toBe('Google User');
    expect(response.body.email).toBe('google@example.com');
    expect(createDocument).toHaveBeenCalledWith('Users', 'google-uid-123', expect.objectContaining({
      provider: 'google',
      email: 'google@example.com',
    }));
  });

  test('falls back to email prefix as displayName when displayName is absent', async () => {
    axios.post.mockResolvedValue({
      data: {
        idToken: 'firebase-id-token',
        refreshToken: 'firebase-refresh-token',
        localId: 'google-uid-123',
        displayName: null,
        email: 'google@example.com',
      },
    });
    createDocument.mockResolvedValue();

    const response = await request(app).post('/auth/google').send({
      idToken: 'google-id-token',
    });

    expect(response.status).toBe(200);
    expect(response.body.displayName).toBe('google');
  });

  test('continues successfully even when createDocument throws (existing user)', async () => {
    axios.post.mockResolvedValue({
      data: {
        idToken: 'firebase-id-token',
        refreshToken: 'firebase-refresh-token',
        localId: 'google-uid-123',
        displayName: 'Google User',
        email: 'google@example.com',
      },
    });
    createDocument.mockRejectedValue(new Error('Document already exists'));

    const response = await request(app).post('/auth/google').send({
      idToken: 'google-id-token',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('returns 400 when idToken is missing', async () => {
    const response = await request(app).post('/auth/google').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('returns 401 when Firebase rejects the Google token', async () => {
    axios.post.mockRejectedValue(new Error('Invalid token'));

    const response = await request(app).post('/auth/google').send({
      idToken: 'invalid-google-token',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Google sign-in failed');
  });
});

// ---------------------------------------------------------------------------
// POST /auth/apple
// ---------------------------------------------------------------------------
describe('POST /auth/apple', () => {
  test('returns 200 with Firebase tokens on successful Apple sign-in', async () => {
    axios.post.mockResolvedValue({
      data: {
        idToken: 'firebase-id-token',
        refreshToken: 'firebase-refresh-token',
        localId: 'apple-uid-123',
        email: 'apple@privaterelay.appleid.com',
      },
    });
    createDocument.mockResolvedValue();

    const response = await request(app).post('/auth/apple').send({
      identityToken: 'apple-identity-token',
      fullName: { givenName: 'Jane', familyName: 'Doe' },
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.idToken).toBe('firebase-id-token');
    expect(response.body.uid).toBe('apple-uid-123');
    expect(response.body.displayName).toBe('Jane Doe');
    expect(createDocument).toHaveBeenCalledWith('Users', 'apple-uid-123', expect.objectContaining({
      provider: 'apple',
      displayName: 'Jane Doe',
    }));
  });

  test('uses only givenName when familyName is absent', async () => {
    axios.post.mockResolvedValue({
      data: {
        idToken: 'firebase-id-token',
        refreshToken: 'firebase-refresh-token',
        localId: 'apple-uid-123',
        email: 'apple@example.com',
      },
    });
    createDocument.mockResolvedValue();

    const response = await request(app).post('/auth/apple').send({
      identityToken: 'apple-identity-token',
      fullName: { givenName: 'Jane', familyName: null },
    });

    expect(response.status).toBe(200);
    expect(response.body.displayName).toBe('Jane');
  });

  test('falls back to email prefix when fullName is not provided', async () => {
    axios.post.mockResolvedValue({
      data: {
        idToken: 'firebase-id-token',
        refreshToken: 'firebase-refresh-token',
        localId: 'apple-uid-123',
        email: 'apple@privaterelay.appleid.com',
      },
    });
    createDocument.mockResolvedValue();

    const response = await request(app).post('/auth/apple').send({
      identityToken: 'apple-identity-token',
    });

    expect(response.status).toBe(200);
    expect(response.body.displayName).toBe('apple');
  });

  test('continues successfully even when createDocument throws (existing user)', async () => {
    axios.post.mockResolvedValue({
      data: {
        idToken: 'firebase-id-token',
        refreshToken: 'firebase-refresh-token',
        localId: 'apple-uid-123',
        email: 'apple@example.com',
      },
    });
    createDocument.mockRejectedValue(new Error('Document already exists'));

    const response = await request(app).post('/auth/apple').send({
      identityToken: 'apple-identity-token',
      fullName: { givenName: 'Jane', familyName: 'Doe' },
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('returns 400 when identityToken is missing', async () => {
    const response = await request(app).post('/auth/apple').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('returns 401 when Firebase rejects the Apple token', async () => {
    axios.post.mockRejectedValue(new Error('Invalid Apple token'));

    const response = await request(app).post('/auth/apple').send({
      identityToken: 'invalid-apple-token',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Apple sign-in failed');
  });
});
