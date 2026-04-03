/** Weekly timetable entries from schedule slots (local wall clock, Mon=0 … Sun=6). */

import { computePhases, type ZonePhaseInput } from "./schedule-phases";

/** 0 = 00:00–08:00, 1 = 08:00–16:00, 2 = 16:00–24:00 (by segment start time). */
export type TimetableBucket = 0 | 1 | 2;

export interface TimetableEntry {
  zoneId: string;
  weekday: number;
  startMin: number;
  endMin: number;
  bucket: TimetableBucket;
  /** Plan, slot, and zone all on — theme “active” styling. */
  enabled: boolean;
  mode: string;
  slotId: string;
}

export function parseTimeLocalToMinutes(timeLocal: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(timeLocal.trim());
  if (!m) return 0;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return h * 60 + min;
}

export function durationForMode(
  zone: Record<string, unknown> | undefined,
  mode: string
): number {
  if (!zone) return 0;
  if (mode === "eco") return Math.max(0, Number(zone.duration_eco_min ?? 0));
  if (mode === "extra") return Math.max(0, Number(zone.duration_extra_min ?? 0));
  return Math.max(0, Number(zone.duration_normal_min ?? 0));
}

/** Bucket by wall-clock hour of segment start ([0,8), [8,16), [16,24)). */
export function bucketFromStartMin(startMin: number): TimetableBucket {
  const h = Math.floor(Math.max(0, startMin) / 60);
  if (h < 8) return 0;
  if (h < 16) return 1;
  return 2;
}

/**
 * Weekday column order: values are internal indices 0=Monday … 6=Sunday.
 */
export function weekdayIndicesForDisplay(
  firstWeekday: string | undefined,
  language: string | undefined
): number[] {
  const monFirst = [0, 1, 2, 3, 4, 5, 6];
  const sunFirst = [6, 0, 1, 2, 3, 4, 5];
  const fw = (firstWeekday || "monday").toLowerCase();
  if (fw === "sunday") return sunFirst;
  if (fw === "monday") return monFirst;
  if (fw === "language" && language) {
    try {
      const loc = new Intl.Locale(language.replace(/_/g, "-")) as Intl.Locale & {
        weekInfo?: { firstDay?: number };
      };
      const fd = loc.weekInfo?.firstDay;
      if (fd === 7) return sunFirst;
      return monFirst;
    } catch {
      return monFirst;
    }
  }
  return monFirst;
}

function zonesPhaseInputFromInstallation(
  zones: Record<string, Record<string, unknown>> | undefined
): Record<string, ZonePhaseInput> {
  const out: Record<string, ZonePhaseInput> = {};
  if (!zones) return out;
  for (const [id, z] of Object.entries(zones)) {
    out[id] = {
      enabled: Boolean(z.enabled ?? true),
      exclusive: Boolean(z.exclusive),
    };
  }
  return out;
}

/**
 * Phase grouping includes disabled zones (they render gray) but phase advance
 * uses max duration among enabled zones only (matches runtime).
 */
export function buildTimetableEntries(installation: Record<string, unknown>): TimetableEntry[] {
  const planEnabled = Boolean(installation?.enabled ?? true);
  const preStartSec = Math.max(0, Number(installation?.pre_start_delay_sec ?? 10));
  const mode = String(installation?.mode ?? "normal");
  const maxParallel = Math.max(1, Number(installation?.max_parallel_zones ?? 2));
  const zones = installation?.zones as Record<string, Record<string, unknown>> | undefined;
  const slots = installation?.schedule_slots as
    | Array<Record<string, unknown>>
    | undefined;

  const zonesById = zonesPhaseInputFromInstallation(zones);
  const entries: TimetableEntry[] = [];

  if (!slots?.length || !zones) {
    return entries;
  }

  for (const slot of slots) {
    const slotId = String(slot.slot_id ?? "");
    const slotEnabled = Boolean(slot.enabled ?? true);
    const weekday = Math.max(0, Math.min(6, Number(slot.weekday ?? 0)));
    const timeLocal = String(slot.time_local ?? "00:00");
    const ordered = Array.isArray(slot.zone_ids_ordered)
      ? (slot.zone_ids_ordered as string[])
      : [];

    const slotStartMin = parseTimeLocalToMinutes(timeLocal);
    let cursor = slotStartMin + preStartSec / 60;

    const phases = computePhases(ordered, zonesById, maxParallel, false);

    for (const phase of phases) {
      const phaseStart = cursor;
      let phaseLenMin = 0;
      for (const zid of phase) {
        const z = zones[zid];
        if (!z) continue;
        if (Boolean(z.enabled ?? true)) {
          const d = durationForMode(z, mode);
          phaseLenMin = Math.max(phaseLenMin, d);
        }
      }

      for (const zid of phase) {
        const z = zones[zid];
        if (!z) continue;
        const zoneEnabled = Boolean(z.enabled ?? true);
        const dur = durationForMode(z, mode);
        const startMin = phaseStart;
        const endMin = phaseStart + dur;
        entries.push({
          zoneId: zid,
          weekday,
          startMin,
          endMin,
          bucket: bucketFromStartMin(startMin),
          enabled: planEnabled && slotEnabled && zoneEnabled,
          mode,
          slotId,
        });
      }

      cursor = phaseStart + phaseLenMin;
    }
  }

  return entries;
}

export function zoneRowOrder(installation: Record<string, unknown>): string[] {
  const zones = installation?.zones as Record<string, unknown> | undefined;
  if (!zones) return [];
  return Object.keys(zones);
}

export function zoneDisplayName(
  installation: Record<string, unknown>,
  zoneId: string
): string {
  const zones = installation?.zones as Record<string, Record<string, unknown>> | undefined;
  const z = zones?.[zoneId];
  const name = z?.name != null ? String(z.name) : "";
  return name.trim() || zoneId.slice(0, 8);
}

/** HH:MM for profile time formatting (minutes may be fractional from pre-start seconds). */
export function minutesToTimeLocal(totalMin: number): string {
  const t = Math.max(0, totalMin);
  const m = Math.floor(t);
  const h = Math.min(23, Math.floor(m / 60));
  const mm = m % 60;
  return `${h}:${String(mm).padStart(2, "0")}`;
}

/** Rounded duration in minutes for UI labels. */
export function entryDurationMinutesRounded(entry: TimetableEntry): number {
  return Math.max(0, Math.round(entry.endMin - entry.startMin));
}

const BUCKET_KEYS: TimetableBucket[] = [0, 1, 2];

/** Horizontal stacking when multiple entries share the same zone, weekday, and bucket. */
export function assignEntryLanes(
  entries: TimetableEntry[]
): Map<TimetableEntry, { lane: number; maxLanes: number }> {
  const byCell = new Map<string, TimetableEntry[]>();
  for (const e of entries) {
    const k = `${e.weekday}:${e.zoneId}:${e.bucket}`;
    if (!byCell.has(k)) byCell.set(k, []);
    byCell.get(k)!.push(e);
  }
  const out = new Map<TimetableEntry, { lane: number; maxLanes: number }>();
  for (const list of byCell.values()) {
    list.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    const ends: number[] = [];
    for (const e of list) {
      let lane = 0;
      while (lane < ends.length && ends[lane] > e.startMin + 1e-3) {
        lane++;
      }
      if (lane === ends.length) {
        ends.push(e.endMin);
      } else {
        ends[lane] = Math.max(ends[lane], e.endMin);
      }
      out.set(e, { lane, maxLanes: 0 });
    }
    const maxLanes = Math.max(1, ends.length);
    for (const e of list) {
      out.get(e)!.maxLanes = maxLanes;
    }
  }
  return out;
}

export const TIMETABLE_BUCKET_INDICES: readonly TimetableBucket[] = BUCKET_KEYS;

/**
 * How many schedule slots include `zone_id` in `zone_ids_ordered` (distinct slots;
 * each slot counts at most once per zone).
 */
export function slotInclusionCountPerZone(installation: Record<string, unknown>): Record<string, number> {
  const slots = installation?.schedule_slots as Array<Record<string, unknown>> | undefined;
  const counts: Record<string, number> = {};
  if (!Array.isArray(slots)) return counts;
  for (const slot of slots) {
    const ordered = Array.isArray(slot.zone_ids_ordered)
      ? (slot.zone_ids_ordered as string[])
      : [];
    const seen = new Set<string>();
    for (const zid of ordered) {
      if (seen.has(zid)) continue;
      seen.add(zid);
      counts[zid] = (counts[zid] ?? 0) + 1;
    }
  }
  return counts;
}
