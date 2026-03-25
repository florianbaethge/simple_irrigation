import { formatDateTimeForProfile, formatSlotTimeForProfile } from "./profile-datetime";
import type { HomeAssistant } from "./types";

function locale(hass: HomeAssistant | undefined): string | undefined {
  const lang = hass?.locale?.language ?? hass?.language;
  if (!lang) return undefined;
  return lang.replace(/_/g, "-");
}

/**
 * Schedule slots use weekday 0 = Monday … 6 = Sunday (same as the Python model).
 * Uses the user's HA language for localized weekday names.
 */
export function weekdayLong(hass: HomeAssistant | undefined, mondayBasedIndex: number): string {
  const i = Math.max(0, Math.min(6, mondayBasedIndex));
  // 2024-01-01 is a Monday in local calendar semantics for display.
  const d = new Date(2024, 0, 1 + i);
  return new Intl.DateTimeFormat(locale(hass), { weekday: "long" }).format(d);
}

/**
 * Absolute instant: weekday + date + time using the user’s profile (12h/24h, DMY/MDY/YMD, server vs local TZ).
 */
export function formatDateTimeForDisplay(hass: HomeAssistant | undefined, date: Date): string {
  return formatDateTimeForProfile(hass, date);
}

/** Slot wall time HH:MM with profile 12h/24h (same numbers as stored; presentation only). */
export function formatTimeLocalForDisplay(hass: HomeAssistant | undefined, timeLocal: string): string {
  return formatSlotTimeForProfile(hass, timeLocal);
}
