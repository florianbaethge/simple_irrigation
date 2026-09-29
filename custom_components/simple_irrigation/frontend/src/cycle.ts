/**
 * Cycle → schedule-slot generation, mirroring `cycle.py` exactly.
 *
 * Used for the live wizard preview; the identical rules run server-side in
 * `cycle.py` for `cycle_upsert`, so the preview and the created slots always
 * agree (acceptance §8.4). Cycle length is 7 or 14 days because `week_parity`
 * can only express a 2-week cycle.
 */

import { isoWeekNumber, type WeekParity } from "./timetable-model";

export type CycleKind =
  | "daily"
  | "twice_daily"
  | "every_n_days"
  | "n_per_week"
  | "weekly"
  | "biweekly"
  | "custom";

export interface CycleMeta {
  label?: string;
  n?: number;
  anchor_weekday?: number;
  times?: string[];
  week_days?: number[];
}

export interface CycleSlotSpec {
  weekdays: number[];
  time_local: string;
  week_parity: WeekParity;
}

export const MAX_CYCLE_START_TIMES = 8;

/** Round half up (matches JS Math.round and Python `round_half_up`). */
export function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5);
}

export function oppositeParity(p: WeekParity): WeekParity {
  if (p === "odd") return "even";
  if (p === "even") return "odd";
  return "every";
}

/** Monday-based weekday of a JS Date (0 = Monday … 6 = Sunday). */
export function mondayBasedWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Parity of the ISO week containing the next occurrence of the anchor weekday. */
export function anchorWeekParity(anchorWeekday: number, today: Date): Exclude<WeekParity, "every"> {
  const a = Math.max(0, Math.min(6, Math.round(anchorWeekday)));
  for (let i = 0; i < 8; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    if (mondayBasedWeekday(d) === a) {
      return isoWeekNumber(d) % 2 === 1 ? "odd" : "even";
    }
  }
  return "odd";
}

function times(meta: CycleMeta | undefined): string[] {
  const raw = meta?.times;
  const out: string[] = [];
  if (Array.isArray(raw)) {
    for (const x of raw) {
      const s = String(x).trim();
      if (s) out.push(s);
    }
  }
  return out.length ? out : ["06:00"];
}

function anchor(meta: CycleMeta | undefined): number {
  const n = Number(meta?.anchor_weekday ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.min(6, Math.round(n))) : 0;
}

function nValue(meta: CycleMeta | undefined, def = 2): number {
  const n = Number(meta?.n ?? def);
  return Number.isFinite(n) ? Math.max(1, Math.round(n)) : def;
}

function weekDays(meta: CycleMeta | undefined): number[] {
  const raw = meta?.week_days;
  const out: number[] = [];
  const seen = new Set<number>();
  if (Array.isArray(raw)) {
    for (const x of raw) {
      const v = Number(x);
      if (Number.isInteger(v) && v >= 0 && v <= 6 && !seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
  }
  out.sort((a, b) => a - b);
  return out;
}

function everyNDaysSlots(
  n: number,
  a: number,
  timeLocal: string,
  p0: Exclude<WeekParity, "every">
): CycleSlotSpec[] {
  const runs = Math.max(1, roundHalfUp(14 / n));
  const offsets: number[] = [];
  for (let k = 0; k < runs; k++) offsets.push(roundHalfUp((k * 14) / runs));

  const weekA: number[] = [];
  const weekB: number[] = [];
  const seenA = new Set<number>();
  const seenB = new Set<number>();
  for (const off of offsets) {
    const wd = (a + off) % 7;
    if (off < 7) {
      if (!seenA.has(wd)) {
        seenA.add(wd);
        weekA.push(wd);
      }
    } else if (!seenB.has(wd)) {
      seenB.add(wd);
      weekB.push(wd);
    }
  }
  weekA.sort((x, y) => x - y);
  weekB.sort((x, y) => x - y);

  const sameSet =
    weekA.length === weekB.length && weekA.every((v, i) => v === weekB[i]);
  if (weekA.length && weekB.length && sameSet) {
    return [{ weekdays: weekA, time_local: timeLocal, week_parity: "every" }];
  }
  const out: CycleSlotSpec[] = [];
  if (weekA.length) out.push({ weekdays: weekA, time_local: timeLocal, week_parity: p0 });
  if (weekB.length)
    out.push({ weekdays: weekB, time_local: timeLocal, week_parity: oppositeParity(p0) });
  return out;
}

/** Expand cadence slots so each one runs at every requested start time. */
function atEachTime(slots: CycleSlotSpec[], startTimes: string[]): CycleSlotSpec[] {
  return slots.flatMap((slot) =>
    startTimes.map((timeLocal) => ({ ...slot, time_local: timeLocal }))
  );
}

export function generateCycleSlots(
  kind: CycleKind,
  meta: CycleMeta | undefined,
  anchorParity: Exclude<WeekParity, "every"> = "odd"
): CycleSlotSpec[] {
  const ts = times(meta);
  const a = anchor(meta);
  const allDays = [0, 1, 2, 3, 4, 5, 6];

  switch (kind) {
    case "daily":
      return atEachTime(
        [{ weekdays: allDays, time_local: ts[0], week_parity: "every" }],
        ts
      );
    case "twice_daily": {
      // Backward compatibility for cycles created before generic multi-time
      // schedules replaced this dedicated cadence in the wizard.
      const t2 = ts.length > 1 ? ts[1] : ts[0];
      return [
        { weekdays: allDays, time_local: ts[0], week_parity: "every" },
        { weekdays: allDays, time_local: t2, week_parity: "every" },
      ];
    }
    case "weekly":
      return atEachTime([{ weekdays: [a], time_local: ts[0], week_parity: "every" }], ts);
    case "biweekly":
      return atEachTime([{ weekdays: [a], time_local: ts[0], week_parity: anchorParity }], ts);
    case "n_per_week": {
      const days = weekDays(meta);
      return atEachTime(
        [{ weekdays: days.length ? days : [a], time_local: ts[0], week_parity: "every" }],
        ts
      );
    }
    case "every_n_days":
      return atEachTime(everyNDaysSlots(nValue(meta), a, ts[0], anchorParity), ts);
    default: {
      const days = weekDays(meta);
      return atEachTime(
        [{ weekdays: days.length ? days : [a], time_local: ts[0], week_parity: "every" }],
        ts
      );
    }
  }
}

export function cycleIsExact(kind: CycleKind, meta: CycleMeta | undefined): boolean {
  if (kind !== "every_n_days") return true;
  return 14 % nValue(meta) === 0;
}

/** Whether ``d`` falls in a week matching the slot cycle (ISO calendar week). */
export function weekParityMatches(d: Date, parity: WeekParity): boolean {
  if (parity === "odd") return isoWeekNumber(d) % 2 === 1;
  if (parity === "even") return isoWeekNumber(d) % 2 === 0;
  return true;
}

export interface PreviewDay {
  date: Date;
  run: boolean;
  isToday: boolean;
}

/** 14-day strip starting at `start`; a day runs when any slot fires on it. */
export function previewStrip(
  slots: CycleSlotSpec[],
  start: Date,
  today: Date,
  days = 14
): PreviewDay[] {
  const out: PreviewDay[] = [];
  const tKey = today.toDateString();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const wd = mondayBasedWeekday(d);
    const run = slots.some((s) => s.weekdays.includes(wd) && weekParityMatches(d, s.week_parity));
    out.push({ date: d, run, isToday: d.toDateString() === tKey });
  }
  return out;
}

/** Day-gaps between consecutive fires over a 28-day window from `start`. */
export function previewGaps(slots: CycleSlotSpec[], start: Date, days = 28): number[] {
  const fires: Date[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const wd = mondayBasedWeekday(d);
    if (slots.some((s) => s.weekdays.includes(wd) && weekParityMatches(d, s.week_parity))) {
      fires.push(d);
    }
  }
  const gaps: number[] = [];
  for (let i = 0; i < fires.length - 1; i++) {
    gaps.push(Math.round((fires[i + 1].getTime() - fires[i].getTime()) / 86400000));
  }
  return gaps;
}

/** First date on/after `start` on which any slot fires (null if none within 28 days). */
export function firstRunDate(slots: CycleSlotSpec[], start: Date, days = 28): Date | null {
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const wd = mondayBasedWeekday(d);
    if (slots.some((s) => s.weekdays.includes(wd) && weekParityMatches(d, s.week_parity))) {
      return d;
    }
  }
  return null;
}
