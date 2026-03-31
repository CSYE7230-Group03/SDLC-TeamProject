const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const CONSUMER_ID = process.env.WALMART_CONSUMER_ID;
const KEY_VERSION = process.env.WALMART_KEY_VERSION || "1";
const PRIVATE_KEY_PATH = path.join(__dirname, "../../../../../WM_IO_private_key.pem");

let privateKey = null;
try {
  privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");
} catch (e) {
  console.warn("[WalmartService] Private key not found at", PRIVATE_KEY_PATH);
}

function generateSignature(timestamp) {
  const stringToSign = CONSUMER_ID + "\n" + timestamp + "\n" + KEY_VERSION + "\n";
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(stringToSign);
  return sign.sign(privateKey, "base64");
}

function getHeaders() {
  const timestamp = Date.now().toString();
  return {
    "WM_SEC.AUTH_SIGNATURE": generateSignature(timestamp),
    "WM_CONSUMER.INTIMESTAMP": timestamp,
    "WM_CONSUMER.ID": CONSUMER_ID,
    "WM_SEC.KEY_VERSION": KEY_VERSION,
  };
}

const BASE_URL = "https://developer.api.walmart.com/api-proxy/service/affil/product/v2";

/**
 * Search Walmart products by query
 */
async function searchProducts(query, numItems = 5) {
  if (!privateKey || !CONSUMER_ID) {
    throw new Error("Walmart API credentials not configured");
  }

  const url = `${BASE_URL}/search?query=${encodeURIComponent(query)}&numItems=${numItems}`;
  const res = await fetch(url, { headers: getHeaders() });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Walmart API error: ${res.status} - ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return (data.items || []).map((item) => ({
    itemId: item.itemId,
    name: item.name,
    price: item.salePrice || item.msrp,
    image: item.thumbnailImage || item.mediumImage,
    category: item.categoryPath,
    upc: item.upc,
    inStock: item.stock !== "Not available",
  }));
}

/**
 * Get product details by item ID
 */
async function getProductById(itemId) {
  const url = `${BASE_URL}/items/${itemId}`;
  const res = await fetch(url, { headers: getHeaders() });

  if (!res.ok) throw new Error(`Walmart API error: ${res.status}`);
  return res.json();
}

module.exports = { searchProducts, getProductById };
