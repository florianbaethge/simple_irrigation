/**
 * Not part of either bundle. tests/test_frontend_parity.py builds this file on
 * its own and feeds it cases on stdin; it answers with what the panel's pure
 * functions make of them, and the test holds that against the Python side.
 * The panel previews what the backend will do, so the two must not drift.
 */

import {
  anchorWeekParity,
  generateCycleSlots,
  nextFire,
  normalizeStartTimes,
  type CycleKind,
  type CycleMeta,
} from "./cycle";
import { inSeason, nextDayInSeason, normalizeSeason, type Period } from "./season";
import { isoWeekNumber, slotZoneMinutes, type WeekParity } from "./timetable-model";

// Node's globals, without pulling its types into the panel's build.
declare const process: {
  stdin: { on(event: string, cb: (chunk?: unknown) => void): void; setEncoding(enc: string): void };
  stdout: { write(text: string): void };
};

interface Cases {
  cycles: { kind: CycleKind; meta: CycleMeta; parity: "odd" | "even" }[];
  times: unknown[];
  days: string[];
  anchors: { day: string; weekday: number }[];
  seasons: { raw: unknown; days: string[] }[];
  fires: {
    slot: { weekdays: number[]; week_parity: WeekParity; time_local: string };
    season: Period[];
    now: string;
  }[];
  minutes: { zone_id: string; zone: Record<string, unknown>; mode: string; fixed: Record<string, number> }[];
}

/** "2026-10-05" or "2026-10-05T19:30", read as the wall clock of this process. */
function local(text: string): Date {
  const [date, time = "00:00"] = text.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, mi);
}

const two = (n: number): string => String(n).padStart(2, "0");
const day = (d: Date): string => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
const minute = (d: Date): string => `${day(d)}T${two(d.getHours())}:${two(d.getMinutes())}`;

function answer(cases: Cases): unknown {
  return {
    cycles: cases.cycles.map((c) => generateCycleSlots(c.kind, c.meta, c.parity)),
    times: cases.times.map((raw) => normalizeStartTimes(raw)),
    weeks: cases.days.map((d) => isoWeekNumber(local(d))),
    anchors: cases.anchors.map((a) => anchorWeekParity(a.weekday, local(a.day))),
    seasons: cases.seasons.map((s) => {
      const periods = normalizeSeason(s.raw);
      return {
        periods,
        inside: s.days.map((d) => inSeason(periods, local(d))),
        opens: s.days.map((d) => {
          const next = nextDayInSeason(periods, local(d));
          return next ? day(next) : null;
        }),
      };
    }),
    fires: cases.fires.map((f) => {
      const at = nextFire(f.slot, f.season, local(f.now));
      return at ? minute(at) : null;
    }),
    minutes: cases.minutes.map((m) => slotZoneMinutes(m.zone_id, m.zone, m.mode, m.fixed)),
  };
}

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += String(chunk);
});
process.stdin.on("end", () => {
  process.stdout.write(JSON.stringify(answer(JSON.parse(input) as Cases)));
});
