import type { HomeAssistant } from "./types";

/** Flat key under `component.simple_irrigation.*` (e.g. `panel.tab_general`). */
export function t(
  hass: HomeAssistant | undefined,
  path: string,
  placeholders?: Record<string, string | number>
): string {
  if (!hass?.localize) {
    return path;
  }
  const fullKey = `component.simple_irrigation.${path}`;
  let s = hass.localize(fullKey);
  if (!s || s === fullKey) {
    s = path;
  }
  if (placeholders) {
    for (const [k, v] of Object.entries(placeholders)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}
