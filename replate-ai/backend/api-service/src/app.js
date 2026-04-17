require("dotenv").config({ path: ".env.local" }); // load local overrides first
require("dotenv").config(); // fallback: load .env for any vars not set above
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
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

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Always allow localhost dev origins
    if (
      origin === "http://localhost:8081" ||
      origin === "http://localhost:19006" ||
      /^http:\/\/192\.168\./.test(origin) ||
      /^http:\/\/10\./.test(origin)
    ) {
      return callback(null, true);
    }
    // Allow any origins configured via env var
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Interactive API documentation (OpenAPI 3.0 / Swagger UI)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Replate AI – API Docs",
}));
// Expose raw OpenAPI JSON spec for tooling / static doc generation
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

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
