const express = require("express");
const { checkExternalApiConnectivity } = require("./services/externalApiService");

const app = express();
const PORT = process.env.PORT || 5050;

app.use(express.json());

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
