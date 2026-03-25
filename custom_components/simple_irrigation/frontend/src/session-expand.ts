/** Persist which zone/slot accordions are open across panel reloads (session only). */

export function loadExpandedMap(storageKey: string): Record<string, boolean> {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    if (typeof o !== "object" || o === null || Array.isArray(o)) return {};
    return o as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function saveExpandedMap(storageKey: string, map: Record<string, boolean>): void {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

/** Missing key = expanded (open). Only `false` means collapsed. */
export function isExpanded(map: Record<string, boolean>, id: string): boolean {
  return map[id] !== false;
}
