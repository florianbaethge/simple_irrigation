/** Zone ids in the installation's saved order; the backend always sends it complete. */
export function orderedZoneIds(installation: Record<string, unknown> | undefined): string[] {
  const zones = installation?.zones as Record<string, unknown> | undefined;
  if (!zones) return [];
  const order = installation?.zone_order;
  return Array.isArray(order) ? order.map(String) : Object.keys(zones);
}
