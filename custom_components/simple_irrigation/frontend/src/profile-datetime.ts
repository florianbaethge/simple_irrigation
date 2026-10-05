import type { HomeAssistant } from "./types";

/** Subset of HA frontend `FrontendLocaleData` (user profile → Language & region). */
export interface HassUserLocale {
  language: string;
  time_format: string;
  date_format: string;
  time_zone?: string;
}

const LOCAL_TZ = Intl.DateTimeFormat?.().resolvedOptions?.().timeZone ?? "UTC";

function resolveTimeZonePref(localeTz: string | undefined, serverTimeZone: string): string {
  if (localeTz === "local" && LOCAL_TZ) return LOCAL_TZ;
  return serverTimeZone;
}

export function useAmPmFromLocale(locale: HassUserLocale): boolean {
  const tf = locale.time_format;
  if (tf === "language" || tf === "system") {
    const testLang = tf === "language" ? locale.language : undefined;
    const test = new Date("January 1, 2023 22:00:00").toLocaleString(testLang);
    return test.includes("10");
  }
  return tf === "12";
}

function formatDateNumericPart(date: Date, locale: HassUserLocale, serverTz: string): string {
  const tz = resolveTimeZonePref(locale.time_zone, serverTz);
  const df = locale.date_format;
  if (df === "language" || df === "system") {
    return new Intl.DateTimeFormat(df === "system" ? undefined : locale.language, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      timeZone: tz,
    }).format(date);
  }
  const formatter = new Intl.DateTimeFormat(locale.language, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: tz,
  });
  const parts = formatter.formatToParts(date);
  const literal = parts.find((p) => p.type === "literal")?.value ?? "/";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const lastPart = parts[parts.length - 1];
  const lastLiteral = lastPart?.type === "literal" ? lastPart.value : "";
  if (df === "DMY") return `${day}${literal}${month}${literal}${year}${lastLiteral}`;
  if (df === "MDY") return `${month}${literal}${day}${literal}${year}${lastLiteral}`;
  if (df === "YMD") return `${year}${literal}${month}${literal}${day}${lastLiteral}`;
  return formatter.format(date);
}

function formatTimePart(date: Date, locale: HassUserLocale, serverTz: string): string {
  const tz = resolveTimeZonePref(locale.time_zone, serverTz);
  const ampm = useAmPmFromLocale(locale);
  return new Intl.DateTimeFormat(locale.language, {
    hour: ampm ? "numeric" : "2-digit",
    minute: "2-digit",
    hourCycle: ampm ? "h12" : "h23",
    timeZone: tz,
  }).format(date);
}

/**
 * Absolute instant (e.g. next run, pause until): weekday + profile date + profile time + TZ preference.
 */
export function formatDateTimeForProfile(
  hass: HomeAssistant | undefined,
  date: Date
): string {
  if (!hass) return date.toLocaleString();
  const loc = hass.locale;
  const serverTz = hass.config?.time_zone ?? LOCAL_TZ;
  const lang = (loc?.language ?? hass.language)?.replace(/_/g, "-");
  const locComplete =
    loc &&
    typeof loc.language === "string" &&
    typeof loc.time_format === "string" &&
    typeof loc.date_format === "string";
  if (!locComplete) {
    return new Intl.DateTimeFormat(lang, {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
  const tz = resolveTimeZonePref(loc!.time_zone, serverTz);
  const weekday = new Intl.DateTimeFormat(loc!.language, {
    weekday: "long",
    timeZone: tz,
  }).format(date);
  const datePart = formatDateNumericPart(date, loc!, serverTz);
  const timePart = formatTimePart(date, loc!, serverTz);
  return `${weekday}, ${datePart}, ${timePart}`;
}

/**
 * Schedule slot wall time (stored as HH:MM): same clock face, 12h/24h and spacing from profile.
 */
export function formatSlotTimeForProfile(hass: HomeAssistant | undefined, timeLocal: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(timeLocal).trim());
  if (!m) return timeLocal;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  const d = new Date(2000, 0, 1, h, min, 0, 0);
  const loc = hass?.locale;
  const lang = (loc?.language ?? hass?.language)?.replace(/_/g, "-") ?? undefined;
  if (!loc?.language || !loc.time_format) {
    return new Intl.DateTimeFormat(lang, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }
  const ampm = useAmPmFromLocale(loc);
  return new Intl.DateTimeFormat(loc.language, {
    hour: ampm ? "numeric" : "2-digit",
    minute: "2-digit",
    hourCycle: ampm ? "h12" : "h23",
  }).format(d);
}
