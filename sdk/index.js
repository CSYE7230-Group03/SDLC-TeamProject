const firebase = require('./firebase');
const firestore = require('./firebase/firestore');
const aws = require('./aws');
const s3 = require('./aws/s3');

module.exports = {
  firebase,
  firestore,
  aws,
  s3
};
