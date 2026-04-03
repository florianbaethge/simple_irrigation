const BASE = "simple-irrigation";

export interface PanelPath {
  entryId: string | null;
  page: string;
}

export const getPath = (): PanelPath => {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] !== BASE) {
    return { entryId: null, page: "general" };
  }
  if (parts.length < 2) {
    return { entryId: null, page: "general" };
  }
  const entryId = parts[1];
  const page = parts[2] || "general";
  return { entryId, page };
};

export const exportPath = (entryId: string, page: string): string => {
  return `/${BASE}/${entryId}/${page}`;
};

/**
 * Remove `editSlot` from the current URL without dispatching `location-changed`.
 * Using `navigate()` would trigger a full panel reload and unmount the schedule view,
 * which closes the slot edit dialog immediately after opening it.
 */
export function stripEditSlotQueryFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("editSlot")) return;
    url.searchParams.delete("editSlot");
    const qs = url.searchParams.toString();
    history.replaceState(null, "", url.pathname + (qs ? `?${qs}` : "") + url.hash);
  } catch {
    /* ignore */
  }
}
