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
 * /settings:
 *   get:
 *     summary: Get the authenticated user's application settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 appSettings:
 *                   $ref: '#/components/schemas/AppSettings'
 *       401:
 *         description: Unauthorized
 *
 *   patch:
 *     summary: Update application settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [appSettings]
 *             properties:
 *               appSettings:
 *                 $ref: '#/components/schemas/AppSettings'
 *     responses:
 *       200:
 *         description: Settings updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 appSettings:
 *                   $ref: '#/components/schemas/AppSettings'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

function normalizeThemeMode(value) {
  if (value === undefined) return undefined;
  if (value === "light" || value === "dark" || value === "system") return value;
  return null;
}

/**
 * GET /settings
 *
 * Returns application-level preferences stored on Users/{uid}.appSettings
 */
router.get("/", verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.userId;
    const doc = await readDocument("Users", userId);

    const appSettings = doc?.appSettings || {
      themeMode: "system",
      notifications: {
        expiryRemindersEnabled: false,
        reminderLeadDays: 2,
        reminderTime: "09:00",
      },
    };

    return res.status(200).json({ success: true, appSettings });
  } catch (err) {
    console.error("[SettingsRoute] Error fetching settings:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /settings
 *
 * Update application settings on Users/{uid}.appSettings
 *
 * Body:
 * {
 *   "appSettings": {
 *     "themeMode": "light" | "dark" | "system",
 *     "notifications": {
 *       "expiryRemindersEnabled": true,
 *       "reminderLeadDays": 2,
 *       "reminderTime": "09:00"
 *     }
 *   }
 * }
 */
router.patch("/", verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { appSettings } = req.body || {};

    if (!appSettings || typeof appSettings !== "object") {
      return res.status(400).json({ success: false, error: "appSettings is required" });
    }

    const update = {};

    if (appSettings.themeMode !== undefined) {
      const themeMode = normalizeThemeMode(appSettings.themeMode);
      if (themeMode === null) {
        return res.status(400).json({ success: false, error: "themeMode must be light, dark, or system" });
      }
      update.themeMode = themeMode;
    }

    if (appSettings.notifications !== undefined) {
      if (!appSettings.notifications || typeof appSettings.notifications !== "object") {
        return res.status(400).json({ success: false, error: "notifications must be an object" });
      }

      const notifUpdate = {};

      if (appSettings.notifications.expiryRemindersEnabled !== undefined) {
        if (typeof appSettings.notifications.expiryRemindersEnabled !== "boolean") {
          return res.status(400).json({ success: false, error: "expiryRemindersEnabled must be boolean" });
        }
        notifUpdate.expiryRemindersEnabled = appSettings.notifications.expiryRemindersEnabled;
      }

      if (appSettings.notifications.reminderLeadDays !== undefined) {
        const n = Number(appSettings.notifications.reminderLeadDays);
        if (!Number.isFinite(n) || n < 0 || n > 30) {
          return res.status(400).json({ success: false, error: "reminderLeadDays must be a number between 0 and 30" });
        }
        notifUpdate.reminderLeadDays = Math.round(n);
      }

      if (appSettings.notifications.reminderTime !== undefined) {
        if (typeof appSettings.notifications.reminderTime !== "string") {
          return res.status(400).json({ success: false, error: "reminderTime must be a string like HH:MM" });
        }
        notifUpdate.reminderTime = appSettings.notifications.reminderTime;
      }

      update.notifications = notifUpdate;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: "No updatable appSettings fields provided" });
    }

    // Ensure Users/{uid} exists
    const existing = await readDocument("Users", userId);
    if (!existing) {
      await createDocument("Users", userId, {
        uid: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const current = (existing?.appSettings || {});
    const merged = {
      ...current,
      ...("themeMode" in update ? { themeMode: update.themeMode } : {}),
      ...("notifications" in update
        ? {
            notifications: {
              ...(current.notifications || {}),
              ...update.notifications,
            },
          }
        : {}),
    };

    await updateDocument("Users", userId, {
      appSettings: merged,
      updatedAt: serverTimestamp(),
    });

    const updated = await readDocument("Users", userId);
    return res.status(200).json({
      success: true,
      appSettings: updated?.appSettings || merged,
    });
  } catch (err) {
    console.error("[SettingsRoute] Error updating settings:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

