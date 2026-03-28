const { getFirestore, admin, getAuth } = require('./index');

/**
 * Create a document in Firestore
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @param {Object} data - Document data
 * @returns {Promise<void>}
 */
async function createDocument(collection, docId, data) {
  const db = getFirestore();
  await db.collection(collection).doc(docId).set(data);
}

/**
 * Read a document from Firestore
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @returns {Promise<Object|null>}
 */
async function readDocument(collection, docId) {
  const db = getFirestore();
  const snapshot = await db.collection(collection).doc(docId).get();
  
  if (!snapshot.exists) {
    return null;
  }
  
  return { id: snapshot.id, ...snapshot.data() };
}

/**
 * Update a document in Firestore
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @param {Object} data - Data to update
 * @returns {Promise<void>}
 */
async function updateDocument(collection, docId, data) {
  const db = getFirestore();
  await db.collection(collection).doc(docId).update(data);
}

/**
 * Delete a document from Firestore
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @returns {Promise<void>}
 */
async function deleteDocument(collection, docId) {
  const db = getFirestore();
  await db.collection(collection).doc(docId).delete();
}

/**
 * Query documents from Firestore
 * @param {string} collection - Collection name
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>}
 */
async function queryDocuments(path, filters = {}) {
  const db = getFirestore();
  let query = db.collection(path);
  
  Object.entries(filters).forEach(([field, value]) => {
    query = query.where(field, '==', value);
  });
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addSubDocument(collection, docId, subCollection, data) {
  const db = getFirestore();

  const docRef = await db
    .collection(collection)
    .doc(docId)
    .collection(subCollection)
    .add(data);

  return { id: docRef.id, ...data };
}

/**
 * Middleware to verify Firebase ID tokens.
 *
 * This function checks the "Authorization" header for a Bearer token,
 * verifies it using Firebase Admin SDK, and attaches the user's UID
 * to the request object (`req.userId`) for downstream route handlers.
 *
 * Usage:
 * router.post("/some-route", verifyFirebaseToken, (req, res) => { ... });
 */
async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    req.userId = decodedToken.uid;
    next();
  } catch (err) {
    console.log(err.message)
    return res.status(401).json({ message: "Invalid token" });
  }
}


/**
 * Update a document at any depth using a full path.
 *
 * Accepts paths like:
 *   "IngredientInventory/userId123/items"  + docId
 *   "TopLevelCollection"                   + docId
 *
 * This is consistent with how queryDocuments(path, filters) works.
 *
 * @param {string} path   - Collection path (e.g. "IngredientInventory/uid/items")
 * @param {string} docId  - Document ID to update
 * @param {Object} data   - Fields to update (shallow merge)
 * @returns {Promise<Object>} - Updated document with id
 */
async function updateSubDocument(path, docId, data) {
  const db = getFirestore();
  const docRef = db.collection(path).doc(docId);

  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new Error(`Document ${docId} not found in ${path}`);
  }

  await docRef.update(data);

  const updated = await docRef.get();
  return { id: updated.id, ...updated.data() };
}

const { FieldValue } = admin.firestore;

module.exports = {
  createDocument,
  readDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  verifyFirebaseToken,
  addSubDocument,
  updateSubDocument,
  serverTimestamp: () => FieldValue.serverTimestamp()
};
