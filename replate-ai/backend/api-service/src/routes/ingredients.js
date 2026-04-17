const express = require("express");
const multer = require("multer");
const { uploadIngredientImage } = require("../services/s3Service");
const { detectIngredientsFromImage } = require("../services/ingredientVisionService");
const { verifyFirebaseToken } = require("../lib/firebase/firestore");

const router = express.Router();

/**
 * @swagger
 * /ingredients/photo:
 *   post:
 *     summary: Detect ingredients from a photo
 *     description: >
 *       Accepts a JPEG/PNG photo (max 5 MB), optionally uploads it to S3,
 *       and runs AI-based ingredient detection. Returns a list of detected
 *       ingredients with confidence scores.
 *     tags: [Ingredients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG or PNG, max 5 MB)
 *     responses:
 *       200:
 *         description: Ingredients detected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:    { type: boolean, example: true }
 *                 imageUrl:   { type: string, format: uri }
 *                 ingredients:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DetectedIngredient'
 *       400:
 *         description: No image file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */

// We keep files in memory so we can push the buffer straight to S3.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

/**
 * POST /ingredients/photo
 *
 * Accepts a single image file and:
 * - uploads it to S3
 * - runs ingredient identification (stubbed for now)
 * - returns detected ingredients so the UI can display/review them
 *
 * Request:
 *   Content-Type: multipart/form-data
 *   Field: "image" (file)
 *
 * Response (200):
 * {
 *   "success": true,
 *   "imageUrl": "https://bucket.s3.region.amazonaws.com/ingredients/...",
 *   "ingredients": [
 *     { "name": "tomato", "confidence": 0.94 },
 *     ...
 *   ]
 * }
 */
router.post("/photo", verifyFirebaseToken, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "image field is required",
      });
    }

    const { originalname, mimetype, buffer } = req.file;

    // 1) Upload to S3 (optional, for storage)
    let url = null;
    try {
      const uploadResult = await uploadIngredientImage(buffer, originalname, mimetype);
      url = uploadResult.url;
    } catch (uploadErr) {
      console.warn("[IngredientsRoute] S3 upload skipped:", uploadErr.message);
    }

    // 2) Run ingredient detection with image buffer (more reliable than URL)
    const detection = await detectIngredientsFromImage(url, buffer);

    return res.status(200).json({
      success: true,
      imageUrl: url,
      ingredients: detection.ingredients || [],
    });
  } catch (err) {
    console.error("[IngredientsRoute] Error processing ingredient image:", err.message);

    return res.status(500).json({
      success: false,
      error: "Failed to process ingredient image. " + err.message,
    });
  }
});

module.exports = router;

