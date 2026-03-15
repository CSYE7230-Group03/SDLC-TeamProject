const { getFirestore } = require('../config/firebase');

/**
 * Create a document in Firestore
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID (optional, auto-generated if not provided)
 * @param {Object} data - Document data
 * @returns {Promise<string>} Document ID
 */
async function createDocument(collection, docId, data) {
  const db = getFirestore();
  const timestamp = new Date();
  
  const docData = {
    ...data,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  if (docId) {
    await db.collection(collection).doc(docId).set(docData);
    return docId;
  } else {
    const docRef = await db.collection(collection).add(docData);
    return docRef.id;
  }
}

/**
 * Get a document from Firestore
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @returns {Promise<Object|null>} Document data or null if not found
 */
async function getDocument(collection, docId) {
  const db = getFirestore();
  const docRef = db.collection(collection).doc(docId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...doc.data() };
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
  const docRef = db.collection(collection).doc(docId);

  await docRef.update({
    ...data,
    updatedAt: new Date()
  });
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
 * @param {Array} filters - Array of filter objects [{field, operator, value}]
 * @param {number} limit - Maximum number of documents to return
 * @returns {Promise<Array>} Array of documents
 */
async function queryDocuments(collection, filters = [], limit = 100) {
  const db = getFirestore();
  let query = db.collection(collection);

  filters.forEach(filter => {
    query = query.where(filter.field, filter.operator, filter.value);
  });

  if (limit) {
    query = query.limit(limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  queryDocuments
};
