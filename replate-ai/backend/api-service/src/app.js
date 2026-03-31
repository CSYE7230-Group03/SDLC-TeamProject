require("dotenv").config({ path: ".env.local" }); // load local overrides first
require("dotenv").config(); // fallback: load .env for any vars not set above
const express = require("express");
const cors = require("cors");
const path = require("path");
const { checkExternalApiConnectivity } = require("./services/externalApiService");
const authRoutes = require("./routes/auth");
const recipeRoutes = require("./routes/recipes");
const ingredientRoutes = require("./routes/ingredients");
const inventoryRoutes = require("./routes/inventory");
const recipeHistoryRoutes = require("./routes/recipeHistory");
const profileRoutes = require("./routes/profile");
const settingsRoutes = require("./routes/settings");
const groceryListRoutes = require("./routes/groceryList");
const groceryOrderRoutes = require("./routes/groceryOrder");

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors({
  origin: [
    "http://localhost:8081",  // Expo web
    "http://localhost:19006", // Expo web (older)
    /^http:\/\/192\.168\./,   // LAN devices
    /^http:\/\/10\./,         // LAN devices (10.x.x.x)
  ],
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Routes
app.use("/auth", authRoutes);
app.use("/recipes", recipeRoutes);
app.use("/ingredients", ingredientRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/recipe-history", recipeHistoryRoutes);
app.use("/profile", profileRoutes);
app.use("/settings", settingsRoutes);
app.use("/grocery-list", groceryListRoutes);
app.use("/grocery-order", groceryOrderRoutes);

// Simple root endpoint so you can quickly confirm the service is up.
app.get("/", (req, res) => {
  res.send("API is running!");
});

/**
 * Connectivity check endpoint for required external APIs.
 *
 * This is designed to be:
 * - Simple to call during development: GET /health/external
 * - Safe to run often
 * - Explicit about success/failure and response format validation
 */
app.get("/health/external", async (req, res) => {
  try {
    const result = await checkExternalApiConnectivity();

    // Given a test request is made, then a successful response is received
    if (result.ok && result.validFormat) {
      return res.status(200).json({
        status: "healthy",
        serviceUrl: result.serviceUrl,
        httpStatus: result.status,
        // Given a response is returned, then it matches the expected format
        responseFormatValid: result.validFormat,
      });
    }

    // Given the external service is unavailable, then the error is handled gracefully
    // We deliberately do NOT throw; instead we return a clear, non-crashing response.
    return res.status(503).json({
      status: "unhealthy",
      serviceUrl: result.serviceUrl,
      httpStatus: result.status,
      responseFormatValid: result.validFormat,
      message:
        result.errorMessage ||
        "External API connectivity check failed or returned an unexpected format.",
    });
  } catch (err) {
    // Extremely defensive guard: in case anything unexpected happens,
    // still respond gracefully instead of crashing the server.
    // eslint-disable-next-line no-console
    console.error("Unexpected error during external API connectivity check:", err);

    return res.status(500).json({
      status: "error",
      message: "Unexpected error while verifying external API connectivity.",
    });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});
