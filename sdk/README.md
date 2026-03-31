# ReplateAI SDK

Cloud service wrappers for Firebase and AWS used across the ReplateAI project.

## Structure

```
sdk/
├── firebase/
│   ├── index.js        # Firebase initialization
│   └── firestore.js    # Firestore CRUD operations
├── aws/
│   ├── index.js        # AWS S3 initialization
│   └── s3.js           # S3 file operations
└── index.js            # Main export
```

## Installation

```bash
cd sdk
npm install
```

## Usage

### Firebase Firestore

```javascript
const { firestore } = require('./sdk');

// Create document
await firestore.createDocument('users', 'user123', {
  name: 'John Doe',
  email: 'john@example.com'
});

// Read document
const user = await firestore.readDocument('users', 'user123');

// Update document
await firestore.updateDocument('users', 'user123', {
  name: 'Jane Doe'
});

// Delete document
await firestore.deleteDocument('users', 'user123');

// Query documents
const users = await firestore.queryDocuments('users', { active: true });
```

### AWS S3

```javascript
const { s3 } = require('./sdk');

// Upload file
await s3.uploadFile('images/photo.jpg', fileBuffer, 'image/jpeg');

// Download file
const content = await s3.downloadFile('images/photo.jpg');

// Delete file
await s3.deleteFile('images/photo.jpg');

// List files
const files = await s3.listFiles('images/');
```

## Environment Variables

Required environment variables (see `.env.example`):

```
FIREBASE_PROJECT_ID=your_project_id
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name
AWS_REGION=us-east-1
```

## Testing

Run the cloud access test:

```bash
npm test
```
