# API Service

Node.js Express API service for ReplateAI backend.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp ../../../.env.example ../../../.env
# Edit .env with your credentials
```

3. Start the service:
```bash
npm start
```

## Cloud Services Integration

This service integrates with:
- Firebase (Firestore, Auth, Storage)
- AWS S3

### Usage Examples

#### Database Operations (Firestore)

```javascript
const { createDocument, getDocument, queryDocuments } = require('./src/services/databaseService');

// Create a recipe
const recipeId = await createDocument('recipes', null, {
  name: 'Leftover Pasta',
  ingredients: ['pasta', 'tomato', 'cheese'],
  userId: 'user123'
});

// Get a recipe
const recipe = await getDocument('recipes', recipeId);

// Query recipes by user
const userRecipes = await queryDocuments('recipes', [
  { field: 'userId', operator: '==', value: 'user123' }
]);
```

#### Storage Operations (S3)

```javascript
const { uploadFile, getPresignedUrl } = require('./src/services/storageService');

// Upload an image
const imageUrl = await uploadFile(
  'images/recipe123.jpg',
  imageBuffer,
  'image/jpeg'
);

// Get temporary download URL
const downloadUrl = await getPresignedUrl('images/recipe123.jpg', 3600);
```

## API Endpoints

- `GET /` - Health check
- `GET /health/external` - External API connectivity check

## Development

```bash
npm run dev
```
