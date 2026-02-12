const { getFirestore, admin } = require('./index');

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
async function queryDocuments(collection, filters = {}) {
  const db = getFirestore();
  let query = db.collection(collection);
  
  Object.entries(filters).forEach(([field, value]) => {
    query = query.where(field, '==', value);
  });
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
  createDocument,
  readDocument,
  updateDocument,
  deleteDocument,
  queryDocuments
};
