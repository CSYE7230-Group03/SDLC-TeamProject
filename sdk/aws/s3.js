const { getS3Client } = require('./index');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

/**
 * Upload a file to S3
 * @param {string} key - Object key (file path in bucket)
 * @param {Buffer|string} body - File content
 * @param {string} contentType - Content type
 * @returns {Promise<void>}
 */
async function uploadFile(key, body, contentType = 'application/octet-stream') {
  const s3Client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) {
    throw new Error('AWS_S3_BUCKET environment variable is required');
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  });

  await s3Client.send(command);
}

/**
 * Download a file from S3
 * @param {string} key - Object key (file path in bucket)
 * @returns {Promise<string>} File content as string
 */
async function downloadFile(key) {
  const s3Client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) {
    throw new Error('AWS_S3_BUCKET environment variable is required');
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });

  const response = await s3Client.send(command);
  return await response.Body.transformToString();
}

/**
 * Delete a file from S3
 * @param {string} key - Object key (file path in bucket)
 * @returns {Promise<void>}
 */
async function deleteFile(key) {
  const s3Client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) {
    throw new Error('AWS_S3_BUCKET environment variable is required');
  }

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  });

  await s3Client.send(command);
}

/**
 * List files in S3 bucket
 * @param {string} prefix - Prefix to filter objects
 * @returns {Promise<Array>} List of objects
 */
async function listFiles(prefix = '') {
  const s3Client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) {
    throw new Error('AWS_S3_BUCKET environment variable is required');
  }

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix
  });

  const response = await s3Client.send(command);
  return response.Contents || [];
}

module.exports = {
  uploadFile,
  downloadFile,
  deleteFile,
  listFiles
};
