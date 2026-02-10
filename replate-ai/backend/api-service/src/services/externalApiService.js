const axios = require("axios");

/**
 * Basic validator for the expected response shape from the external API.
 * By default this assumes a JSONPlaceholder-style TODO payload:
 * {
 *   userId: number,
 *   id: number,
 *   title: string,
 *   completed: boolean
 * }
 *
 * We can swap this out later for whatever third-party API
 *  project actually integrates with.
 *
 * @param {unknown} data
 * @returns {boolean}
 */
function isValidExternalResponse(data) {
  if (!data || typeof data !== "object") return false;

  const { userId, id, title, completed } = data;

  const isNumber = (v) => typeof v === "number" && Number.isFinite(v);

  return (
    isNumber(userId) &&
    isNumber(id) &&
    typeof title === "string" &&
    typeof completed === "boolean"
  );
}

/**
 * Perform a lightweight connectivity check against the configured
 * external API.
 *
 * This is intentionally a very small request so it can be run
 * frequently during development or CI without much cost.
 *
 * @param {object} [options]
 * @param {string} [options.url] - Override URL for the external API.
 * @returns {Promise<{
 *   ok: boolean,
 *   status: number | null,
 *   serviceUrl: string,
 *   validFormat: boolean,
 *   rawResponseSample?: unknown,
 *   errorMessage?: string
 * }>}
 */
async function checkExternalApiConnectivity(options = {}) {
  const serviceUrl =
    options.url ||
    process.env.EXTERNAL_API_URL ||
    "https://jsonplaceholder.typicode.com/todos/1";

  try {
    const response = await axios.get(serviceUrl, {
      timeout: 5_000,
      // In a real integration we might add auth headers here
      // headers: { Authorization: `Bearer ${process.env.EXTERNAL_API_TOKEN}` },
    });

    const validFormat = isValidExternalResponse(response.data);

    return {
      ok: true,
      status: response.status,
      serviceUrl,
      validFormat,
      rawResponseSample: response.data,
    };
  } catch (error) {
    const status = error.response ? error.response.status : null;

    return {
      ok: false,
      status,
      serviceUrl,
      validFormat: false,
      errorMessage:
        status === null
          ? "Unable to reach external service (network or DNS issue)."
          : "External service responded with an error status.",
    };
  }
}

module.exports = {
  checkExternalApiConnectivity,
  isValidExternalResponse,
};

