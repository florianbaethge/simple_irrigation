import { formatDateTimeForProfile, formatSlotTimeForProfile } from "./profile-datetime";
import { t } from "./i18n";
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

/** Short localized weekday name (e.g. "Mon" / "Mo"), Monday-based index. */
export function weekdayShort(hass: HomeAssistant | undefined, mondayBasedIndex: number): string {
  const i = Math.max(0, Math.min(6, mondayBasedIndex));
  const d = new Date(2024, 0, 1 + i);
  return new Intl.DateTimeFormat(locale(hass), { weekday: "short" }).format(d);
}

/** Normalize to sorted, de-duplicated Monday-based indices in 0..6. */
export function normalizeWeekdays(raw: unknown): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  const push = (v: unknown): void => {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 0 && n <= 6 && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  };
  if (Array.isArray(raw)) raw.forEach(push);
  out.sort((a, b) => a - b);
  return out;
}

/**
 * Compact human summary of the weekdays a slot runs on:
 * "Daily" (all 7), "Mon–Fri" (workdays), "Weekend" (Sat/Sun), else a short list.
 */
export function weekdaysSummary(hass: HomeAssistant | undefined, weekdays: number[]): string {
  const wds = normalizeWeekdays(weekdays);
  if (wds.length === 0) return "";
  if (wds.length === 7) return t(hass, "config_panel.weekdays_summary_daily");
  const key = wds.join(",");
  if (key === "0,1,2,3,4") return t(hass, "config_panel.weekdays_summary_workdays");
  if (key === "5,6") return t(hass, "config_panel.weekdays_summary_weekend");
  return wds.map((i) => weekdayShort(hass, i)).join(", ");
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
