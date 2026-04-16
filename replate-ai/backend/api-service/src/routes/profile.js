const express = require("express");
const {
  verifyFirebaseToken,
  serverTimestamp,
  readDocument,
  updateDocument,
  createDocument,
} = require("../lib/firebase/firestore");

const router = express.Router();

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get the authenticated user's profile and dietary preferences
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 profile:
 *                   $ref: '#/components/schemas/UserProfile'
 *                 dietaryPreferences:
 *                   $ref: '#/components/schemas/DietaryPreferences'
 *       401:
 *         description: Unauthorized
 *
 *   patch:
 *     summary: Update profile fields and/or dietary preferences
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName: { type: string, example: "Jane Doe" }
 *               dietaryPreferences:
 *                 $ref: '#/components/schemas/DietaryPreferences'
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 profile:
 *                   $ref: '#/components/schemas/UserProfile'
 *                 dietaryPreferences:
 *                   $ref: '#/components/schemas/DietaryPreferences'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

function normalizeStringArray(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

/**
 * GET /profile
 *
 * Returns the authenticated user's profile + dietary preferences.
 * Stored on the existing Firestore doc: Users/{uid}
 */
router.get("/", verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.userId;
    const doc = await readDocument("Users", userId);

    const dietaryPreferences = doc?.dietaryPreferences || {
      restrictions: [],
      allergies: [],
      skillLevel: "",
      maxCookingTime: null,
    };

    return res.status(200).json({
      success: true,
      profile: {
        uid: userId,
        email: doc?.email || null,
        displayName: doc?.displayName || "",
      },
      dietaryPreferences,
    });
  } catch (err) {
    console.error("[ProfileRoute] Error fetching profile:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /profile
 *
 * Update profile fields and/or dietary preferences on Users/{uid}.
 *
 * Body (all optional):
 * {
 *   "displayName": "New Name",
 *   "dietaryPreferences": {
 *     "restrictions": ["vegetarian"],
 *     "allergies": ["peanuts"],
 *     "skillLevel": "beginner",
 *     "maxCookingTime": 30
 *   }
 * }
 */
router.patch("/", verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { displayName, dietaryPreferences } = req.body || {};

    const update = {};

    if (displayName !== undefined) {
      if (typeof displayName !== "string" || displayName.trim().length === 0) {
        return res.status(400).json({ success: false, error: "displayName must be a non-empty string" });
      }
      update.displayName = displayName.trim();
    }

    if (dietaryPreferences !== undefined) {
      if (!dietaryPreferences || typeof dietaryPreferences !== "object") {
        return res.status(400).json({ success: false, error: "dietaryPreferences must be an object" });
      }

      const restrictions = normalizeStringArray(dietaryPreferences.restrictions);
      if (restrictions === null) {
        return res.status(400).json({ success: false, error: "dietaryPreferences.restrictions must be an array of strings" });
      }

      const allergies = normalizeStringArray(dietaryPreferences.allergies);
      if (allergies === null) {
        return res.status(400).json({ success: false, error: "dietaryPreferences.allergies must be an array of strings" });
      }

      let skillLevel = dietaryPreferences.skillLevel;
      if (skillLevel !== undefined && skillLevel !== null) {
        if (typeof skillLevel !== "string") {
          return res.status(400).json({ success: false, error: "dietaryPreferences.skillLevel must be a string" });
        }
        skillLevel = skillLevel.trim();
      }

      let maxCookingTime = dietaryPreferences.maxCookingTime;
      if (maxCookingTime !== undefined && maxCookingTime !== null) {
        const n = Number(maxCookingTime);
        if (!Number.isFinite(n) || n <= 0) {
          return res.status(400).json({ success: false, error: "dietaryPreferences.maxCookingTime must be a positive number" });
        }
        maxCookingTime = Math.round(n);
      }

      update.dietaryPreferences = {
        ...(restrictions !== undefined ? { restrictions } : {}),
        ...(allergies !== undefined ? { allergies } : {}),
        ...(skillLevel !== undefined ? { skillLevel } : {}),
        ...(maxCookingTime !== undefined ? { maxCookingTime } : {}),
      };
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: "No updatable fields provided" });
    }

    update.updatedAt = serverTimestamp();

    // Ensure the profile doc exists before updating it.
    const existing = await readDocument("Users", userId);
    if (!existing) {
      await createDocument("Users", userId, {
        uid: userId,
        displayName: update.displayName || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await updateDocument("Users", userId, update);

    const updated = await readDocument("Users", userId);
    return res.status(200).json({
      success: true,
      profile: {
        uid: userId,
        email: updated?.email || null,
        displayName: updated?.displayName || "",
      },
      dietaryPreferences: updated?.dietaryPreferences || {
        restrictions: [],
        allergies: [],
        skillLevel: "",
        maxCookingTime: null,
      },
    });
  } catch (err) {
    console.error("[ProfileRoute] Error updating profile:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

