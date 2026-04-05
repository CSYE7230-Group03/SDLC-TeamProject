import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { InventoryItem } from "./api";
import { storageDelete, storageLoad, storageSave } from "../utils/appStorage";

const STORAGE_EXPIRY_IDS_KEY = "replate_expiry_notification_ids";

export async function cancelExpiryReminders(): Promise<void> {
  const raw = await storageLoad(STORAGE_EXPIRY_IDS_KEY);
  const ids: string[] = raw ? safeJsonParse(raw, []) : [];

  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignore
    }
  }

  await storageDelete(STORAGE_EXPIRY_IDS_KEY);
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseTimeHHMM(value: string | undefined, fallback: { hour: number; minute: number }) {
  if (!value) return fallback;
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fallback;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return fallback;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback;
  return { hour, minute };
}

function normalizeDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Schedule expiry reminders for inventory items.
 *
 * Implementation detail: we schedule notifications at a fixed time (default 09:00)
 * on the day an item is within `leadDays` of expiry. This avoids needing any
 * background task: schedules are created up-front and can be recalculated any time.
 */
export async function scheduleExpiryReminders(params: {
  items: InventoryItem[];
  leadDays?: number; // default 2
  reminderTime?: string; // "HH:MM" default 09:00
}): Promise<void> {
  // Web does not support native scheduling in the same way; no-op gracefully.
  if (Platform.OS === "web") return;

  const { items } = params;
  const leadDays = typeof params.leadDays === "number" ? params.leadDays : 2;
  const { hour, minute } = parseTimeHHMM(params.reminderTime, { hour: 9, minute: 0 });

  // Recreate schedules on every update
  await cancelExpiryReminders();

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    const req = await Notifications.requestPermissionsAsync();
    if (!req.granted) {
      return;
    }
  }

  const now = new Date();
  const today = normalizeDate(now);

  const scheduledIds: string[] = [];

  // Only schedule for active items with a parseable expiryDate
  for (const item of items) {
    if (!item || item.quant <= 0) continue;
    if (!item.expiryDate) continue;

    const exp = new Date(item.expiryDate);
    if (Number.isNaN(exp.getTime())) continue;

    // Reminder day = expiryDate - leadDays
    const reminderDay = normalizeDate(exp);
    reminderDay.setDate(reminderDay.getDate() - leadDays);

    // If reminder day already passed, skip
    if (reminderDay < today) continue;

    const triggerDate = new Date(
      reminderDay.getFullYear(),
      reminderDay.getMonth(),
      reminderDay.getDate(),
      hour,
      minute,
      0
    );

    // If trigger time today already passed, push to next day (still useful)
    if (triggerDate < now) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Expiry reminder",
        body: `"${item.ingredientName}" is expiring soon. Check your inventory.`,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });

    scheduledIds.push(id);
  }

  await storageSave(STORAGE_EXPIRY_IDS_KEY, JSON.stringify(scheduledIds));
}

