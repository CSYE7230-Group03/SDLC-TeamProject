const axios = require("axios");

/**
 * Analyze user profile based on fridge ingredients
 * @param {string[]} ingredients - List of ingredient names
 * @returns {Promise<object>} Analysis result
 */
async function analyzeUserProfile(ingredients) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  if (!ingredients || ingredients.length === 0) {
    throw new Error("No ingredients to analyze");
  }

  const prompt = `Based on these fridge ingredients, analyze what kind of person this might be:

Ingredients: ${ingredients.join(", ")}

Provide a fun, friendly analysis in JSON format:
{
  "persona": "A short fun title (e.g., 'The Health Enthusiast', 'The Busy Professional')",
  "emoji": "One emoji that represents this person",
  "description": "2-3 sentences describing their likely lifestyle and eating habits",
  "dietType": "Their likely diet type (e.g., 'Balanced', 'Vegetarian-leaning', 'Protein-focused')",
  "cookingStyle": "Their cooking style (e.g., 'Quick & Easy', 'Gourmet Chef', 'Meal Prepper')",
  "healthScore": A number 1-10 rating their diet healthiness,
  "funFact": "A fun observation or suggestion based on their fridge"
}

Be creative and positive! Only return valid JSON.`;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a fun, friendly nutritionist. Analyze fridge contents playfully." },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 500,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  let content = response.data.choices[0].message.content.trim();

  // Remove markdown code blocks if present
  if (content.startsWith("```")) {
    content = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const analysis = JSON.parse(content);
  console.log(`[ProfileAnalysis] Analyzed ${ingredients.length} ingredients -> ${analysis.persona}`);
  
  return analysis;
}

module.exports = { analyzeUserProfile };
