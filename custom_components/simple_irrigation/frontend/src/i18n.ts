import type { HomeAssistant } from "./types";

/** Must match `DOMAIN` in the Python integration. */
export const TRANSLATION_DOMAIN = "simple_irrigation";

/** Flat key under `component.simple_irrigation.*` (e.g. `panel.tab_general`). */
export function t(
  hass: HomeAssistant | undefined,
  path: string,
  placeholders?: Record<string, string | number>
): string {
  if (!hass?.localize) {
    return path;
  }
  const fullKey = `component.${TRANSLATION_DOMAIN}.${path}`;
  const hasValues = Boolean(placeholders && Object.keys(placeholders).length);
  // HA uses IntlMessageFormat; placeholders must be passed here, not substituted afterward.
  let s = hasValues
    ? hass.localize(fullKey, placeholders)
    : hass.localize(fullKey);
  if (!s || s === fullKey) {
    s = path;
    if (placeholders) {
      for (const [k, v] of Object.entries(placeholders)) {
        s = s.split(`{${k}}`).join(String(v));
      }
    }
  }
  return s;
}
