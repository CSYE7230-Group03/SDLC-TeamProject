const { S3Client } = require('@aws-sdk/client-s3');

let s3Client = null;

/**
 * Initialize AWS S3 client
 * @returns {S3Client} S3 client instance
 */
function initializeS3() {
  if (s3Client) {
    return s3Client;
  }

  try {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    console.log('AWS S3 client initialized successfully');
    return s3Client;
  } catch (error) {
    console.error('Failed to initialize AWS S3:', error.message);
    throw error;
  }
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

/**
 * Get configured S3 bucket name
 * @returns {string}
 */
function getBucketName() {
  return process.env.AWS_S3_BUCKET;
}

module.exports = {
  initializeS3,
  getS3Client,
  getBucketName
};
