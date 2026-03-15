const express = require("express");
const axios = require("axios");
const { getAuth } = require("../../../../../sdk/firebase/index");
const { createDocument, serverTimestamp } = require("../../../../../sdk/firebase/firestore");

const router = express.Router();

/**
 * POST /auth/signup
 *
 * Create a new Firebase Auth user and write a profile document to Firestore.
 *
 * Request body: { email, password, displayName }
 * Response 201: { success, uid, email, displayName }
 * Response 409: email already in use
 */
router.post("/signup", async (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email || !password || !displayName) {
    return res.status(400).json({
      success: false,
      error: "email, password, and displayName are required",
    });
  }
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: "password must be at least 6 characters",
    });
  }

  try {
    const userRecord = await getAuth().createUser({ email, password, displayName });

    await createDocument("Users", userRecord.uid, {
      uid: userRecord.uid,
      email: email.toLowerCase(),
      displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return res.status(201).json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
    });
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      return res.status(409).json({ success: false, error: "Email already in use" });
    }
    console.error("[AuthRoute] Signup error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /auth/signin
 *
 * Verify email/password via Firebase REST API and return an idToken.
 * Returns the same 401 for wrong password and unknown email (prevents user enumeration).
 *
 * Request body: { email, password }
 * Response 200: { success, idToken, refreshToken, expiresIn, uid, displayName, email }
 */
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: "email and password are required" });
  }

  const apiKey = process.env.FIREBASE_API_KEY;
  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      { email, password, returnSecureToken: true }
    );
    const { idToken, refreshToken, expiresIn, localId, displayName } = response.data;
    return res.status(200).json({
      success: true,
      idToken,
      refreshToken,
      expiresIn,
      uid: localId,
      displayName: displayName || "",
      email,
    });
  } catch (err) {
    const code = err.response?.data?.error?.message;
    if (code === "TOO_MANY_ATTEMPTS_TRY_LATER") {
      return res.status(429).json({ success: false, error: "Too many attempts. Try again later." });
    }
    // Return the same message for INVALID_PASSWORD, EMAIL_NOT_FOUND, INVALID_LOGIN_CREDENTIALS
    // to prevent user enumeration
    if (
      code === "INVALID_PASSWORD" ||
      code === "EMAIL_NOT_FOUND" ||
      code === "INVALID_LOGIN_CREDENTIALS"
    ) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }
    console.error("[AuthRoute] Signin error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /auth/forgot-password
 *
 * Send a password reset email via Firebase REST API.
 * Always returns 200 regardless of whether the email is registered
 * to prevent user enumeration.
 *
 * Request body: { email }
 * Response 200: { success, message }
 */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: "email is required" });
  }

  const apiKey = process.env.FIREBASE_API_KEY;
  try {
    await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
      { requestType: "PASSWORD_RESET", email }
    );
  } catch (err) {
    const code = err.response?.data?.error?.message;
    // Silently swallow EMAIL_NOT_FOUND to prevent user enumeration
    if (code !== "EMAIL_NOT_FOUND") {
      console.error("[AuthRoute] Forgot-password error:", err.message);
    }
  }

  return res.status(200).json({
    success: true,
    message: "If that email is registered, a reset link has been sent.",
  });
});

/**
 * POST /auth/refresh
 *
 * Exchange a Firebase refresh token for a new idToken.
 * Called on app startup to restore a persistent session.
 *
 * Request body: { refreshToken }
 * Response 200: { success, idToken, refreshToken, expiresIn }
 * Response 401: session expired / invalid refresh token
 */
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: "refreshToken is required" });
  }

  const apiKey = process.env.FIREBASE_API_KEY;
  try {
    const response = await axios.post(
      `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
      { grant_type: "refresh_token", refresh_token: refreshToken }
    );
    return res.status(200).json({
      success: true,
      idToken: response.data.id_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    });
  } catch (err) {
    return res.status(401).json({ success: false, error: "Session expired. Please sign in again." });
  }
});

module.exports = router;
