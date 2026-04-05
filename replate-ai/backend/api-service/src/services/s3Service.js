const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");
const crypto = require("crypto");

const s3Region = process.env.AWS_REGION;
const bucketName = process.env.S3_INGREDIENT_BUCKET;

const s3 = new S3Client({
  region: s3Region,
});

function generateObjectKey(originalName) {
  const ext = path.extname(originalName) || ".jpg";
  const id = crypto.randomBytes(12).toString("hex");
  const timestamp = Date.now();

  return `ingredients/${timestamp}-${id}${ext}`;
}

/**
 * Uploads an image buffer to S3 and returns its public URL (or key).
 *
 * Expects the following environment variables:
 * - AWS_REGION
 * - S3_INGREDIENT_BUCKET
 *
 * In a real deployment, you’ll also configure AWS credentials (via environment
 * variables, IAM role, or shared config) outside of this file.
 *
 * @param {Buffer} buffer
 * @param {string} originalName
 * @param {string} mimeType
 * @returns {Promise<{ bucket: string, key: string, url: string }>}
 */
async function uploadIngredientImage(buffer, originalName, mimeType) {
  if (!bucketName || !s3Region) {
    // DEV MODE: Skip S3 upload and return a placeholder URL
    console.warn("[S3Service] S3 not configured, using placeholder URL for development");
    return {
      bucket: "dev-placeholder",
      key: `ingredients/${Date.now()}-${originalName}`,
      url: `https://placeholder.local/ingredients/${Date.now()}-${originalName}`,
    };
  }

  const key = generateObjectKey(originalName);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: mimeType || "image/jpeg",
  });

  await s3.send(command);

  // For simplicity we assume the bucket is configured for public read,
  // or that this URL can be used by downstream services (like the AI service).
  const url = `https://${bucketName}.s3.${s3Region}.amazonaws.com/${key}`;

  return { bucket: bucketName, key, url };
}

module.exports = {
  uploadIngredientImage,
};

