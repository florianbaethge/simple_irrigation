/** Mirrors `grouping.compute_phases` for schedule slot preview in the panel. */

export interface ZonePhaseInput {
  enabled?: boolean;
  exclusive?: boolean;
}

export function computePhases(
  orderedZoneIds: string[],
  zonesById: Record<string, ZonePhaseInput | undefined>,
  maxParallelZones: number,
  skipDisabled = true
): string[][] {
  const mp = Math.max(1, maxParallelZones);
  const phases: string[][] = [];
  let current: string[] = [];

  for (const zid of orderedZoneIds) {
    const zone = zonesById[zid];
    if (!zone) continue;
    if (skipDisabled && !zone.enabled) continue;

    if (zone.exclusive) {
      if (current.length) {
        phases.push(current);
        current = [];
      }
      phases.push([zid]);
      continue;
    }

    if (!current.length) {
      current = [zid];
      continue;
    }

    if (current.length >= mp) {
      phases.push(current);
      current = [zid];
      continue;
    }

    current.push(zid);
  }

  if (current.length) phases.push(current);
  return phases;
}

/** First occurrence of each zone id → 1-based phase index (same as `phase_index_per_zone`). */
export function phaseIndexByZoneId(
  orderedZoneIds: string[],
  zonesById: Record<string, ZonePhaseInput | undefined>,
  maxParallelZones: number
): Map<string, number> {
  const phases = computePhases(orderedZoneIds, zonesById, maxParallelZones, true);
  const m = new Map<string, number>();
  for (let i = 0; i < phases.length; i++) {
    const n = i + 1;
    for (const zid of phases[i]) {
      if (!m.has(zid)) m.set(zid, n);
    }
  }
  return m;
}

// ---- Cycle & Soak -----------------------------------------------------------
// Mirrors `program.py`: a slot's phases repeated, with rests in between.

export interface CycleSoak {
  repetitions: number;
  soakBetweenPhasesMin: number;
  soakBetweenRepetitionsMin: number;
}

export const PLAIN_RUN: CycleSoak = {
  repetitions: 1,
  soakBetweenPhasesMin: 0,
  soakBetweenRepetitionsMin: 0,
};

/** The slot's Cycle & Soak settings as stored, tolerant of pre-feature data. */
export function cycleSoakOf(slot: Record<string, unknown> | undefined): CycleSoak {
  const int = (raw: unknown, fallback: number, lo: number): number => {
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(lo, Math.round(n)) : fallback;
  };
  return {
    repetitions: int(slot?.repetitions, 1, 1),
    soakBetweenPhasesMin: int(slot?.soak_between_phases_min, 0, 0),
    soakBetweenRepetitionsMin: int(slot?.soak_between_repetitions_min, 0, 0),
  };
}

export function isCycleSoak(cs: CycleSoak): boolean {
  return cs.repetitions > 1 || cs.soakBetweenPhasesMin > 0 || cs.soakBetweenRepetitionsMin > 0;
}

/** One entry of a run: zones watering in parallel, or a rest in minutes. */
export type RunStep = string[] | { soakMin: number };

export function isSoak(step: RunStep): step is { soakMin: number } {
  return !Array.isArray(step);
}

/**
 * The steps a slot runs, in order. A rest of 0 minutes is left out, and a
 * program never starts or ends on one — same rules as the backend.
 */
export function expandProgram(phases: string[][], cs: CycleSoak): RunStep[] {
  if (!phases.length) return [];
  const steps: RunStep[] = [];
  for (let pass = 0; pass < Math.max(1, cs.repetitions); pass++) {
    if (pass > 0 && cs.soakBetweenRepetitionsMin > 0) steps.push({ soakMin: cs.soakBetweenRepetitionsMin });
    phases.forEach((phase, i) => {
      if (i > 0 && cs.soakBetweenPhasesMin > 0) steps.push({ soakMin: cs.soakBetweenPhasesMin });
      steps.push([...phase]);
    });
  }
  return steps;
}

/**
 * Wall-clock minutes of a slot: each phase costs its longest zone, passes
 * repeat, rests count too. `zoneMinutes` returns 0 for zones that do not run.
 */
export function programMinutes(
  phases: string[][],
  cs: CycleSoak,
  zoneMinutes: (zoneId: string) => number
): number {
  let total = 0;
  for (const step of expandProgram(phases, cs)) {
    if (isSoak(step)) total += step.soakMin;
    else total += Math.max(0, ...step.map(zoneMinutes));
  }
  return total;
}
