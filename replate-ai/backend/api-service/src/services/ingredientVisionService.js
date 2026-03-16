const axios = require("axios");

/**
 * Ingredient vision service using OpenAI GPT-4o-mini Vision.
 */

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Analyze an ingredient image using OpenAI Vision API.
 *
 * @param {string} imageUrl - URL of the image
 * @param {Buffer} [imageBuffer] - Optional image buffer (base64 encoded)
 * @returns {Promise<{ ingredients: Array<{name: string, confidence: number}> }>}
 */
async function detectIngredientsFromImage(imageUrl, imageBuffer = null) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("[IngredientVision] OPENAI_API_KEY not set, using mock data");
    return getMockIngredients();
  }

  try {
    // Build the image content - prefer base64 if available, otherwise URL
    let imageContent;
    if (imageBuffer) {
      const base64 = imageBuffer.toString("base64");
      imageContent = {
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${base64}`,
        },
      };
    } else {
      imageContent = {
        type: "image_url",
        image_url: { url: imageUrl },
      };
    }

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and identify all food items and ingredients visible.
For each item, provide:
- name: specific name (e.g., "salmon nigiri" not just "sushi")
- quantity: count how many of each item (e.g., 3 pieces, 1 bowl)
- unit: the unit of measurement (pieces, slices, cups, etc.)
- confidence: your confidence score (0-1)

Return ONLY a JSON array in this format:
[{"name": "salmon nigiri", "quantity": 4, "unit": "pieces", "confidence": 0.95}, ...]

Be specific about:
- Types of sushi (nigiri, maki roll, sashimi, etc.)
- Count individual pieces when possible
- Distinguish between different fish types
- Include garnishes and sides

If no food items are visible, return an empty array [].`,
              },
              imageContent,
            ],
          },
        ],
        max_tokens: 800,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const content = response.data.choices[0]?.message?.content || "[]";
    
    // Parse the JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const ingredients = JSON.parse(jsonMatch[0]);
      console.log("[IngredientVision] OpenAI detected:", ingredients);
      return { ingredients };
    }

    console.warn("[IngredientVision] Could not parse OpenAI response:", content);
    return getMockIngredients();
  } catch (err) {
    console.error("[IngredientVision] OpenAI API error:", err.message);
    return getMockIngredients();
  }
}

/**
 * Fallback mock ingredients when API fails or is not configured.
 */
function getMockIngredients() {
  return {
    ingredients: [
      { name: "tomato", confidence: 0.85 },
      { name: "onion", confidence: 0.80 },
      { name: "garlic", confidence: 0.75 },
      { name: "chicken", confidence: 0.70 },
    ],
  };
}

module.exports = {
  detectIngredientsFromImage,
  getMockIngredients,
};
