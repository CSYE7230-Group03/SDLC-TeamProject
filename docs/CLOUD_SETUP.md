# Cloud Services Configuration

## Overview

This project uses the following cloud services:

### Firebase
- **Firestore Database**: NoSQL document database for user data and recipes
- **Authentication**: User management and authentication
- **Storage**: File storage for images and cached data

### AWS S3
- **Object Storage**: Storage for files, images, and ML models
- **Region**: us-east-1 (configurable)

## SDK Structure

Cloud service integrations are organized in the `sdk/` directory:

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

## Setup

1. Copy environment template:
```bash
cp .env.example .env
```

2. Configure credentials in `.env` file

3. Install dependencies:
```bash
npm run setup
```

4. Test cloud access:
```bash
npm run test:cloud
```

The test script performs actual connection tests with CRUD operations on both Firebase Firestore and AWS S3.

## Usage

Backend services can import and use the SDK:

```javascript
const { firestore, s3 } = require('../../../sdk');

// Use Firestore
await firestore.createDocument('users', 'user123', { name: 'John' });

// Use S3
await s3.uploadFile('images/photo.jpg', buffer, 'image/jpeg');
```

See `sdk/README.md` for detailed API documentation.

## Security

- Never commit `.env` file
- Use separate credentials for development and production
- Rotate credentials if exposed
