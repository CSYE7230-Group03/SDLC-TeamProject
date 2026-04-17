const admin = require('firebase-admin');
const fs = require('fs');
let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 * @returns {admin.app.App} Firebase app instance
 */
function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const saKey = process.env.FIREBASE_SA_KEY;
  if (!saKey) {
    throw new Error('FIREBASE_SA_KEY environment variable is required');
  }

  // Support both inline JSON and a file path to a JSON file
  let serviceAccount;
  if (saKey.trim().startsWith('{')) {
    serviceAccount = JSON.parse(saKey);
  } else {
    serviceAccount = JSON.parse(fs.readFileSync(saKey, 'utf8'));
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  return firebaseApp;
}

/**
 * Get Firestore instance
 * @returns {admin.firestore.Firestore}
 */
function getFirestore() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.firestore();
}

/**
 * Get Auth instance
 * @returns {admin.auth.Auth}
 */
function getAuth() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.auth();
}

/**
 * Get Storage instance
 * @returns {admin.storage.Storage}
 */
function getStorage() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.storage();
}

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth,
  getStorage,
  admin
};
