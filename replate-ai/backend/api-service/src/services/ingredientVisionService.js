const axios = require("axios");

/**
 * Ingredient vision service.
 *
 * This service acts as a thin client for the Python `ai-service`.
 * It sends the S3 image URL to the FastAPI endpoint, which performs
 * (or will perform) the actual vision/model work.
 *
 * @typedef {Object} DetectedIngredient
 * @property {string} name
 * @property {number} confidence  A value between 0 and 1
 */

/**
 * Analyze an ingredient image and return detected items by calling
 * the Python `ai-service`.
 *
 * @param {string} imageUrl - Public/accessible URL of the image (e.g., S3 URL).
 * @returns {Promise<{ ingredients: DetectedIngredient[] }>}
 */
async function detectIngredientsFromImage(imageUrl) {
  const baseUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/ingredients/identify`;

  try {
    const response = await axios.post(endpoint, { imageUrl });
    if (!response.data || !Array.isArray(response.data.ingredients)) {
      throw new Error("AI service returned an unexpected response format.");
    }
    return {
      ingredients: response.data.ingredients,
    };
  } catch (err) {
    console.error("[IngredientVision] Error calling AI service:", err.message);
    // Fall back to a very simple mocked response so the app remains usable
    // during local development even if the AI service is offline.
    return {
      ingredients: [
        { name: "tomato", confidence: 0.5 },
        { name: "onion", confidence: 0.5 },
      ],
    };
  }
}

module.exports = {
  detectIngredientsFromImage,
};

