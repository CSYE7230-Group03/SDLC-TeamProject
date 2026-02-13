const admin = require('firebase-admin');

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 * @returns {admin.app.App} Firebase app instance
 */
function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is required');
  }

  firebaseApp = admin.initializeApp({
    projectId: projectId
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
