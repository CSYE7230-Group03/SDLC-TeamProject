const express = require("express");
const multer = require("multer");
const { uploadIngredientImage } = require("../services/s3Service");
const { detectIngredientsFromImage } = require("../services/ingredientVisionService");
const { verifyFirebaseToken } = require("../../../../../sdk/firebase/firestore");

const router = express.Router();

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

    // 1) Upload to S3
    const { url } = await uploadIngredientImage(buffer, originalname, mimetype);

    // 2) Run ingredient detection
    const detection = await detectIngredientsFromImage(url);

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

