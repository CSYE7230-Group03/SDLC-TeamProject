const { getS3Client, getBucketName } = require('../config/aws');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

/**
 * Upload file to S3
 * @param {string} key - File key/path in S3
 * @param {Buffer} fileBuffer - File content
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} S3 object URL
 */
async function uploadFile(key, fileBuffer, contentType) {
  const s3Client = getS3Client();
  const bucketName = getBucketName();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType
  });

  await s3Client.send(command);
  return `https://${bucketName}.s3.amazonaws.com/${key}`;
}

/**
 * Get file from S3
 * @param {string} key - File key/path in S3
 * @returns {Promise<Buffer>} File content
 */
async function getFile(key) {
  const s3Client = getS3Client();
  const bucketName = getBucketName();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key
  });

  const response = await s3Client.send(command);
  return Buffer.from(await response.Body.transformToByteArray());
}

/**
 * Delete file from S3
 * @param {string} key - File key/path in S3
 * @returns {Promise<void>}
 */
async function deleteFile(key) {
  const s3Client = getS3Client();
  const bucketName = getBucketName();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key
  });

  await s3Client.send(command);
}

/**
 * Generate presigned URL for temporary access
 * @param {string} key - File key/path in S3
 * @param {number} expiresIn - URL expiration in seconds (default: 3600)
 * @returns {Promise<string>} Presigned URL
 */
async function getPresignedUrl(key, expiresIn = 3600) {
  const s3Client = getS3Client();
  const bucketName = getBucketName();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

module.exports = {
  uploadFile,
  getFile,
  deleteFile,
  getPresignedUrl
};
