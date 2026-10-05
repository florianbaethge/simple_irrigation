/**
 * Resolve the installation's preferred zone order without trusting it to be
 * complete.  Old installations have no `zone_order`; interrupted or hand-edited
 * storage may contain stale/duplicate ids.  Valid saved ids stay first and every
 * current zone is appended in the object's stable creation order.
 */
export function orderedZoneIds(installation: Record<string, unknown> | undefined): string[] {
  const zones = installation?.zones as Record<string, unknown> | undefined;
  if (!zones) return [];

  const raw = Array.isArray(installation?.zone_order)
    ? (installation.zone_order as unknown[])
    : [];
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = String(item);
    if (Object.prototype.hasOwnProperty.call(zones, id) && !seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }
  for (const id of Object.keys(zones)) {
    if (!seen.has(id)) ordered.push(id);
  }
  return ordered;
}

export function orderedZoneEntries<T>(
  installation: Record<string, unknown> | undefined
): Array<[string, T]> {
  const zones = installation?.zones as Record<string, T> | undefined;
  if (!zones) return [];
  return orderedZoneIds(installation).map((id) => [id, zones[id]]);
}
