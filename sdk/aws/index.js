const { S3Client } = require('@aws-sdk/client-s3');

let s3Client = null;

/**
 * Initialize AWS S3 client
 * @returns {S3Client}
 */
function initializeS3() {
  if (s3Client) {
    return s3Client;
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are required');
  }

  s3Client = new S3Client({
    region: region,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    }
  });

  return s3Client;
}

/**
 * Get S3 client instance
 * @returns {S3Client}
 */
function getS3Client() {
  if (!s3Client) {
    initializeS3();
  }
  return s3Client;
}

module.exports = {
  initializeS3,
  getS3Client
};
