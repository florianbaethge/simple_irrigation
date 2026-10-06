/**
 * Seasons: when in the year a schedule waters by itself. Mirrors season.py —
 * the panel previews what the scheduler will do, so both must agree.
 *
 * A period is two days of the year, both included, the same every year; it may
 * run across New Year. A season is a list of periods, and an empty list is the
 * whole year. A slot follows the installation's season unless it brings its own.
 */

import type { HomeAssistant } from "./types";

/** A stretch of the year as the backend stores it: "MM-DD" to "MM-DD". */
export interface Period {
  from: string;
  to: string;
}

/** The same cap as the backend (MAX_SEASON_PERIODS in const.py). */
export const MAX_SEASON_PERIODS = 6;

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** How many days a month can have; February counts its leap day. */
export function daysInMonth(month: number): number {
  return DAYS_IN_MONTH[month - 1] ?? 31;
}

/** "MM-DD" as [month, day], or null for anything that is no day of the year. */
export function parseMonthDay(raw: unknown): [number, number] | null {
  const parts = String(raw ?? "").trim().split("-");
  if (parts.length !== 2) return null;
  const month = Number(parts[0]);
  const day = Number(parts[1]);
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(month)) return null;
  return [month, day];
}

export function monthDay(month: number, day: number): string {
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** A season from the panel state: its usable periods, each once. */
export function normalizeSeason(raw: unknown): Period[] {
  if (!Array.isArray(raw)) return [];
  const out: Period[] = [];
  for (const item of raw) {
    const rec = (item ?? {}) as Record<string, unknown>;
    const from = parseMonthDay(rec.from);
    const to = parseMonthDay(rec.to);
    if (!from || !to) continue;
    const period = { from: monthDay(...from), to: monthDay(...to) };
    if (!out.some((p) => p.from === period.from && p.to === period.to)) out.push(period);
  }
  return out.slice(0, MAX_SEASON_PERIODS);
}

function periodContains(period: Period, day: Date): boolean {
  // "MM-DD" sorts like the calendar, so the strings can be compared as they are.
  const md = monthDay(day.getMonth() + 1, day.getDate());
  return period.from <= period.to
    ? period.from <= md && md <= period.to
    : md >= period.from || md <= period.to;
}

/** Whether `day` is in season. No periods at all is the whole year. */
export function inSeason(periods: Period[], day: Date): boolean {
  return periods.length === 0 || periods.some((period) => periodContains(period, day));
}

/** The periods that decide for a slot: its own, or the installation's. */
export function seasonFor(
  installation: Record<string, unknown> | undefined,
  slot: { override_season?: unknown; season?: unknown } | undefined
): Period[] {
  return slot?.override_season
    ? normalizeSeason(slot.season)
    : normalizeSeason(installation?.season);
}

/** The first day from `day` on that is in season (null if there is none). */
export function nextDayInSeason(periods: Period[], day: Date): Date | null {
  for (let i = 0; i < 367; i++) {
    const candidate = new Date(day.getFullYear(), day.getMonth(), day.getDate() + i);
    if (inSeason(periods, candidate)) return candidate;
  }
  return null;
}

/** Whether two seasons share a day of the year. */
export function seasonsOverlap(a: Period[], b: Period[]): boolean {
  if (a.length === 0 || b.length === 0) return true;
  for (let i = 0; i < 366; i++) {
    // A leap year, so the 29th of February is looked at too.
    const day = new Date(2024, 0, 1 + i);
    if (inSeason(a, day) && inSeason(b, day)) return true;
  }
  return false;
}

/**
 * The first day from `from` on that is in season and on which `due` says the
 * rhythm fires. Day by day for two years, which is how far the backend looks
 * too: a weekly slot whose season ends on Tuesday has its next Wednesday in
 * spring, and a period shorter than the rhythm is passed over.
 */
export function firstDueDay(
  periods: Period[],
  from: Date,
  due: (day: Date) => boolean
): Date | null {
  for (let i = 0; i < 732; i++) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    if (due(day) && inSeason(periods, day)) return day;
  }
  return null;
}

/**
 * Where a day-by-day look-ahead should start: today while anything is in
 * season, otherwise the day the first of these seasons opens. Out of season
 * nothing fires for months, and a three-week window from today would be empty.
 */
export function lookAheadStart(seasons: Period[][], today: Date): Date {
  let first: Date | null = null;
  for (const periods of seasons) {
    const opening = nextDayInSeason(periods, today);
    if (opening && (!first || opening < first)) first = opening;
  }
  return first ?? today;
}

function language(hass: HomeAssistant | undefined): string | undefined {
  // Intl wants "pt-BR"; Home Assistant may hand out "pt_BR".
  const tag = hass?.locale?.language ?? hass?.language ?? undefined;
  return tag ? tag.replace(/_/g, "-") : undefined;
}

/** "1 Apr" in the user's language; a leap year, so the 29th of February has a name. */
export function formatMonthDay(hass: HomeAssistant | undefined, raw: string): string {
  const parsed = parseMonthDay(raw);
  if (!parsed) return raw;
  return new Intl.DateTimeFormat(language(hass), { day: "numeric", month: "short" }).format(
    new Date(2024, parsed[0] - 1, parsed[1])
  );
}

/** "1 Apr – 31 Oct, …", in the order of the year. */
export function formatSeason(hass: HomeAssistant | undefined, periods: Period[]): string {
  return [...periods]
    .sort((a, b) => a.from.localeCompare(b.from))
    .map((p) => `${formatMonthDay(hass, p.from)} – ${formatMonthDay(hass, p.to)}`)
    .join(", ");
}

/** Month names for the pickers, January first. */
export function monthNames(hass: HomeAssistant | undefined): string[] {
  const fmt = new Intl.DateTimeFormat(language(hass), { month: "long" });
  return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2024, i, 1)));
}
