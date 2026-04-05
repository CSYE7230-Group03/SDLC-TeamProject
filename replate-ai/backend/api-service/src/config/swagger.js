'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Replate AI – REST API',
      version: '1.0.0',
      description:
        'Complete REST API for Replate AI, an AI-powered leftover recipe and grocery management application. ' +
        'All protected endpoints require a Firebase ID token supplied as a Bearer token in the Authorization header.',
      contact: {
        name: 'CSYE7200 Group 03',
      },
    },
    servers: [
      { url: 'http://localhost:5050', description: 'Local development server' },
    ],
    tags: [
      { name: 'Auth',          description: 'Authentication – sign-up, sign-in, token refresh' },
      { name: 'Recipes',       description: 'AI-powered recipe generation' },
      { name: 'Ingredients',   description: 'Photo-based ingredient detection' },
      { name: 'Inventory',     description: 'Ingredient inventory management' },
      { name: 'Recipe History', description: 'Per-user recipe history' },
      { name: 'Grocery List',  description: 'Grocery lists derived from recipe ingredients' },
      { name: 'Profile',       description: 'User profile and dietary preferences' },
      { name: 'Settings',      description: 'Application settings' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase ID Token obtained from /auth/signin',
        },
      },
      schemas: {
        // ── Generic ──────────────────────────────────────────────────────────
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error:   { type: 'string',  example: 'Descriptive error message' },
          },
        },

        // ── Auth ─────────────────────────────────────────────────────────────
        SignupRequest: {
          type: 'object',
          required: ['email', 'password', 'displayName'],
          properties: {
            email:       { type: 'string', format: 'email',   example: 'user@example.com' },
            password:    { type: 'string', minLength: 6,       example: 'secret123' },
            displayName: { type: 'string',                     example: 'Jane Doe' },
          },
        },
        SignupResponse: {
          type: 'object',
          properties: {
            success:     { type: 'boolean', example: true },
            uid:         { type: 'string',  example: 'abc123uid' },
            email:       { type: 'string',  example: 'user@example.com' },
            displayName: { type: 'string',  example: 'Jane Doe' },
          },
        },
        SigninRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string',                   example: 'secret123' },
          },
        },
        SigninResponse: {
          type: 'object',
          properties: {
            success:      { type: 'boolean', example: true },
            idToken:      { type: 'string',  description: 'Firebase ID token (use as Bearer token)' },
            refreshToken: { type: 'string',  description: 'Firebase refresh token' },
            expiresIn:    { type: 'string',  example: '3600' },
            uid:          { type: 'string',  example: 'abc123uid' },
            displayName:  { type: 'string',  example: 'Jane Doe' },
            email:        { type: 'string',  example: 'user@example.com' },
          },
        },

        // ── Recipe ───────────────────────────────────────────────────────────
        RecipeIngredient: {
          type: 'object',
          properties: {
            name:   { type: 'string',  example: 'chicken breast' },
            amount: { type: 'number',  example: 2 },
            unit:   { type: 'string',  example: 'pieces' },
          },
        },
        Recipe: {
          type: 'object',
          properties: {
            id:              { type: 'string',  example: '716429' },
            title:           { type: 'string',  example: 'Pasta with Garlic' },
            image:           { type: 'string',  format: 'uri' },
            readyInMinutes:  { type: 'integer', example: 30 },
            servings:        { type: 'integer', example: 4 },
            summary:         { type: 'string' },
            sourceUrl:       { type: 'string',  format: 'uri' },
            ingredients: {
              type: 'array',
              items: { '$ref': '#/components/schemas/RecipeIngredient' },
            },
            instructions: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },

        // ── Inventory ─────────────────────────────────────────────────────────
        DetectedIngredient: {
          type: 'object',
          properties: {
            name:       { type: 'string',  example: 'tomato' },
            confidence: { type: 'number',  example: 0.94 },
            quantity:   { type: 'number',  example: 3 },
            unit:       { type: 'string',  example: 'pieces' },
          },
        },
        InventoryItem: {
          type: 'object',
          properties: {
            id:             { type: 'string',  example: 'item-uuid' },
            ingredientName: { type: 'string',  example: 'chicken' },
            quant:          { type: 'number',  example: 2 },
            unit:           { type: 'string',  example: 'kg' },
            expiryDate:     { type: 'string',  format: 'date', example: '2026-04-01' },
            isExpired:      { type: 'boolean', example: false },
            s3Url:          { type: 'string',  format: 'uri' },
          },
        },

        // ── Grocery List ──────────────────────────────────────────────────────
        GroceryListItem: {
          type: 'object',
          properties: {
            id:                { type: 'string',  example: 'item-uuid' },
            name:              { type: 'string',  example: 'flour' },
            amount:            { type: 'number',  example: 2 },
            unit:              { type: 'string',  example: 'cups' },
            isAvailableAtHome: { type: 'boolean', example: false },
          },
        },
        GroceryList: {
          type: 'object',
          properties: {
            id:          { type: 'string', example: 'list-uuid' },
            recipeId:    { type: 'string', example: '716429' },
            recipeTitle: { type: 'string', example: 'Pasta with Garlic' },
            createdAt:   { type: 'string', format: 'date-time' },
            items: {
              type: 'array',
              items: { '$ref': '#/components/schemas/GroceryListItem' },
            },
          },
        },

        // ── Profile ───────────────────────────────────────────────────────────
        DietaryPreferences: {
          type: 'object',
          properties: {
            restrictions:   { type: 'array',   items: { type: 'string' }, example: ['vegetarian'] },
            allergies:      { type: 'array',   items: { type: 'string' }, example: ['peanuts'] },
            skillLevel:     { type: 'string',  example: 'beginner' },
            maxCookingTime: { type: 'integer', example: 30 },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            uid:         { type: 'string', example: 'abc123uid' },
            email:       { type: 'string', example: 'user@example.com' },
            displayName: { type: 'string', example: 'Jane Doe' },
          },
        },

        // ── Settings ──────────────────────────────────────────────────────────
        NotificationSettings: {
          type: 'object',
          properties: {
            expiryRemindersEnabled: { type: 'boolean', example: true },
            reminderLeadDays:       { type: 'integer', example: 2 },
            reminderTime:           { type: 'string',  example: '09:00' },
          },
        },
        AppSettings: {
          type: 'object',
          properties: {
            themeMode: {
              type: 'string',
              enum: ['light', 'dark', 'system'],
              example: 'system',
            },
            notifications: { '$ref': '#/components/schemas/NotificationSettings' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
