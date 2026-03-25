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
