import { language, localize } from "./i18n";
import { formatVolumeNumber, litresToUnit, volumeUnit } from "../units";
import type { Cadence, HomeAssistant } from "./types";

/**
 * All timestamps cross the wire as ISO strings and become text here, so a
 * household with two users in two languages sees two correctly formatted cards
 * from one snapshot.
 */

function use12Hour(hass: HomeAssistant | undefined): boolean | undefined {
  const fmt = hass?.locale?.time_format;
  if (fmt === "12") return true;
  if (fmt === "24") return false;
  return undefined; // "language"/"system" — let Intl decide
}

/** "19:30" (or "7:30 PM"), in the user's own time format. */
export function clock(hass: HomeAssistant | undefined, iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(language(hass), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: use12Hour(hass),
  }).format(d);
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole days from today to `d`; 0 = today, 1 = tomorrow. */
export function dayOffset(d: Date, now = new Date()): number {
  return Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);
}

/**
 * "Today 19:30", "Tomorrow 06:00", "Saturday 06:00", "12 Sep 06:00".
 *
 * Weekday names stay useful only inside the coming week; past that a date is
 * clearer than "Saturday" twelve days out.
 */
export function dayTime(hass: HomeAssistant | undefined, iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const offset = dayOffset(d);
  const time = clock(hass, iso);
  if (offset === 0) return `${localize(hass, "today")} ${time}`;
  if (offset === 1) return `${localize(hass, "tomorrow")} ${time}`;
  if (offset > 1 && offset < 7) {
    const weekday = new Intl.DateTimeFormat(language(hass), {
      weekday: "long",
    }).format(d);
    return `${weekday} ${time}`;
  }
  const date = new Intl.DateTimeFormat(language(hass), {
    day: "numeric",
    month: "short",
  }).format(d);
  return `${date} ${time}`;
}

/**
 * Short form for tight rows mid-sentence: "next today 19:30".
 *
 * Only the relative words are lower-cased — a weekday or month name is a proper
 * noun and stays capitalised ("next Aug 29 07:00", not "next aug 29 07:00").
 * German lower-cases nothing here, since its relative words are nouns too.
 */
export function dayTimeShort(
  hass: HomeAssistant | undefined,
  iso: string
): string {
  const text = dayTime(hass, iso);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return text;
  const offset = dayOffset(d);
  const relative = offset === 0 || offset === 1;
  if (!relative || language(hass) === "de") return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Countdown as "7:24" under an hour, "1:07:24" above it. */
export function countdown(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Seconds until `iso`, never negative. */
export function secondsUntil(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, (t - Date.now()) / 1000);
}

/** "2 h 35 min", "40 min" — coarse, for durations rather than countdowns. */
export function duration(
  hass: HomeAssistant | undefined,
  minutes: number
): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  const hUnit = localize(hass, "unit_hour_short");
  const mUnit = localize(hass, "unit_minute_short");
  if (h && m) return `${h} ${hUnit} ${m} ${mUnit}`;
  if (h) return `${h} ${hUnit}`;
  return `${m} ${mUnit}`;
}

/** "in 11 h 11 min" — the lead time before a scheduled run. */
export function leadTime(hass: HomeAssistant | undefined, iso: string): string {
  const secs = secondsUntil(iso);
  return localize(hass, "in_time", { time: duration(hass, secs / 60) });
}

/** Localized weekday names, Monday first (the integration's weekday order). */
export function weekdayNames(
  hass: HomeAssistant | undefined,
  style: "short" | "long" | "narrow" = "short"
): string[] {
  const fmt = new Intl.DateTimeFormat(language(hass), { weekday: style });
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(new Date(Date.UTC(2024, 0, 1 + i)))
  );
}

/** "Every 2 days", "Daily", "Mon, Wed, Fri" — the slot's rhythm in one phrase. */
export function cadenceLabel(
  hass: HomeAssistant | undefined,
  cadence: Cadence
): string {
  const days = cadence.weekdays ?? [];
  // Cycles longer than a week are built *out of* odd/even weeks, so naming the
  // parity there only restates the cadence — "Every 2 days · even weeks" is
  // noise. Where the user picked the rhythm by hand it is real information.
  const parityIsGenerated = ["every_n_days", "biweekly", "twice_daily", "daily", "n_per_week"].includes(
    cadence.kind
  );
  const parityNote = parityIsGenerated
    ? ""
    : cadence.week_parity === "odd"
      ? localize(hass, "parity_odd")
      : cadence.week_parity === "even"
        ? localize(hass, "parity_even")
        : "";

  let base: string;
  switch (cadence.kind) {
    case "daily":
      base = localize(hass, "cadence_daily");
      break;
    case "twice_daily":
      base = localize(hass, "cadence_twice_daily");
      break;
    case "every_n_days":
      base = localize(hass, "cadence_every_n_days", { n: cadence.n ?? 2 });
      break;
    case "n_per_week":
      base = localize(hass, "cadence_n_per_week", { n: cadence.n ?? days.length });
      break;
    case "weekly":
      base = localize(hass, "cadence_weekly");
      break;
    case "biweekly":
      base = localize(hass, "cadence_biweekly");
      break;
    default: {
      // No wizard metadata: describe what the slot literally does.
      if (days.length === 7) {
        base = localize(hass, "cadence_daily");
      } else if (days.length === 0) {
        base = "";
      } else {
        const names = weekdayNames(hass);
        base = days.map((d) => names[d] ?? "").join(", ");
      }
    }
  }
  if (parityNote) {
    return base ? `${base} · ${parityNote}` : parityNote;
  }
  return base;
}

/** "~40 min" — an estimate, flagged as one. */
export function approxMinutes(
  hass: HomeAssistant | undefined,
  minutes: number
): string {
  return localize(hass, "approx_minutes", { n: Math.round(minutes) });
}

/** "~120 L" / "32 gal" — litres in the user's unit system, tilde for estimates. */
export function water(
  hass: HomeAssistant | undefined,
  litres: number,
  estimated: boolean
): string {
  const unit = volumeUnit(hass);
  const v = formatVolumeNumber(litresToUnit(litres, unit));
  const u = localize(hass, unit === "gal" ? "unit_gallon_short" : "unit_litre_short");
  return localize(hass, estimated ? "water_approx" : "water_exact", { v, u });
}
