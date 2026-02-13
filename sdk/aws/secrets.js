const { getS3Client } = require('./index');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const SECRETS_PREFIX = 'secrets/';

/**
 * Store a secret in S3
 * @param {string} name - Secret name
 * @param {string|object} value - Secret value (objects will be JSON-serialized)
 * @returns {Promise<void>}
 */
async function setSecret(name, value) {
  const s3Client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) {
    throw new Error('AWS_S3_BUCKET environment variable is required');
  }

  const body = typeof value === 'object' ? JSON.stringify(value) : String(value);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: `${SECRETS_PREFIX}${name}`,
    Body: body,
    ContentType: 'application/json',
    ServerSideEncryption: 'AES256'
  });

  await s3Client.send(command);
}

/**
 * Retrieve a secret from S3
 * @param {string} name - Secret name
 * @returns {Promise<string|object>} Secret value (parsed as JSON if possible)
 */
async function getSecret(name) {
  const s3Client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) {
    throw new Error('AWS_S3_BUCKET environment variable is required');
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: `${SECRETS_PREFIX}${name}`
  });

  const response = await s3Client.send(command);
  const raw = await response.Body.transformToString();

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Delete a secret from S3
 * @param {string} name - Secret name
 * @returns {Promise<void>}
 */
async function deleteSecret(name) {
  const s3Client = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) {
    throw new Error('AWS_S3_BUCKET environment variable is required');
  }

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: `${SECRETS_PREFIX}${name}`
  });

  await s3Client.send(command);
}

module.exports = {
  setSecret,
  getSecret,
  deleteSecret
};
