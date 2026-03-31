/**
 * Ingredient Normalization Service (#24)
 * Normalizes ingredient names and units into canonical forms
 * for provider-agnostic grocery ordering.
 */

// Standard unit mappings
const UNIT_MAP = {
  // Volume
  "cup": "cup", "cups": "cup", "c": "cup",
  "tablespoon": "tbsp", "tablespoons": "tbsp", "tbsp": "tbsp", "tbs": "tbsp",
  "teaspoon": "tsp", "teaspoons": "tsp", "tsp": "tsp",
  "liter": "L", "liters": "L", "l": "L", "litre": "L", "litres": "L",
  "milliliter": "mL", "milliliters": "mL", "ml": "mL",
  "gallon": "gal", "gallons": "gal", "gal": "gal",
  "quart": "qt", "quarts": "qt", "qt": "qt",
  "pint": "pt", "pints": "pt", "pt": "pt",
  "fluid ounce": "fl oz", "fluid ounces": "fl oz", "fl oz": "fl oz",
  // Weight
  "pound": "lb", "pounds": "lb", "lb": "lb", "lbs": "lb",
  "ounce": "oz", "ounces": "oz", "oz": "oz",
  "gram": "g", "grams": "g", "g": "g",
  "kilogram": "kg", "kilograms": "kg", "kg": "kg",
  // Count
  "piece": "piece", "pieces": "piece", "pcs": "piece",
  "whole": "whole", "clove": "clove", "cloves": "clove",
  "slice": "slice", "slices": "slice",
  "bunch": "bunch", "bunches": "bunch",
  "can": "can", "cans": "can",
  "package": "package", "packages": "package", "pkg": "package",
};

/**
 * Normalize a unit string to its canonical form
 */
function normalizeUnit(unit) {
  if (!unit) return "piece";
  return UNIT_MAP[unit.toLowerCase().trim()] || unit.toLowerCase().trim();
}

/**
 * Normalize an ingredient name to a canonical search-friendly form
 */
function normalizeIngredientName(name) {
  if (!name) return "";

  let normalized = name.toLowerCase().trim();

  // Remove common prefixes
  normalized = normalized
    .replace(/^(fresh|frozen|canned|dried|organic|raw|cooked|chopped|diced|sliced|minced|ground|boneless|skinless)\s+/g, "")
    .replace(/\s+(fresh|frozen|canned|dried|organic|raw|cooked|chopped|diced|sliced|minced|ground|boneless|skinless)$/g, "");

  // Remove parenthetical info
  normalized = normalized.replace(/\s*\(.*?\)\s*/g, " ");

  // Clean up whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

/**
 * Normalize a full ingredient object
 * Input: { name: "Fresh Chicken Breast", amount: 2, unit: "pounds" }
 * Output: { originalName, canonicalName, amount, unit, searchQuery }
 */
function normalizeIngredient(ingredient) {
  const canonicalName = normalizeIngredientName(ingredient.name);
  const unit = normalizeUnit(ingredient.unit);

  return {
    originalName: ingredient.name,
    canonicalName,
    amount: ingredient.amount || 1,
    unit,
    searchQuery: canonicalName, // Used for provider search
  };
}

/**
 * Normalize a list of ingredients
 */
function normalizeIngredientList(ingredients) {
  return ingredients.map(normalizeIngredient);
}

module.exports = {
  normalizeIngredient,
  normalizeIngredientList,
  normalizeIngredientName,
  normalizeUnit,
};
