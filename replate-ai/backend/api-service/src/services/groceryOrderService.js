/**
 * Grocery Order Service (#25)
 * Provider-agnostic grocery order request generation.
 * Supports multiple providers via adapter pattern.
 */

const { normalizeIngredientList } = require("./ingredientNormalizationService");
const { searchProducts } = require("./walmartService");

// Provider adapters
const providers = {
  walmart: {
    name: "Walmart",
    async searchItem(query) {
      const results = await searchProducts(query, 3);
      if (!results.length) return null;
      const best = results[0];
      return {
        providerId: best.itemId.toString(),
        providerName: "Walmart",
        productName: best.name,
        price: best.price,
        image: best.image,
        inStock: best.inStock,
        url: `https://www.walmart.com/ip/${best.itemId}`,
      };
    },
  },
  // Future: instacart, kroger, etc.
};

/**
 * Generate a provider-agnostic order request from ingredients
 */
async function generateOrderRequest(ingredients, providerName = "walmart") {
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  // Step 1: Normalize ingredients
  const normalized = normalizeIngredientList(ingredients);

  // Step 2: Search provider for each ingredient
  const orderItems = [];
  const notFound = [];

  for (const item of normalized) {
    try {
      const product = await provider.searchItem(item.searchQuery);
      if (product) {
        orderItems.push({
          ingredient: item,
          product,
          quantity: 1,
        });
      } else {
        notFound.push(item);
      }
    } catch (err) {
      console.error(`[GroceryOrder] Failed to search "${item.searchQuery}":`, err.message);
      notFound.push(item);
    }
  }

  // Step 3: Build order summary
  const totalPrice = orderItems.reduce((sum, i) => sum + (i.product.price || 0), 0);

  return {
    provider: provider.name,
    orderItems,
    notFound,
    summary: {
      totalItems: orderItems.length,
      totalPrice: Math.round(totalPrice * 100) / 100,
      missingItems: notFound.length,
    },
  };
}

/**
 * Get available providers
 */
function getAvailableProviders() {
  return Object.entries(providers).map(([key, p]) => ({
    id: key,
    name: p.name,
  }));
}

module.exports = { generateOrderRequest, getAvailableProviders };
