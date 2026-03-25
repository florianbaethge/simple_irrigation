import { fireEvent } from "./fire-event";
import { t } from "./i18n";
import type { HomeAssistant } from "./types";

/** Home Assistant callApi may put a string or structured object in `error`. */
export function formatApiError(value: unknown, hass?: HomeAssistant): string {
  const fallback =
    hass?.localize != null
      ? t(hass, "config_panel.errors_request_failed")
      : "Request failed";
  if (value == null || value === "") {
    return fallback;
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (typeof o.message === "string") {
      return o.message;
    }
    if (typeof o.error === "string") {
      return o.error;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return String(value);
}

/** Safe when the panel bundle runs twice (navigation, scoped custom element registry). */
export function defineCustomElementOnce(
  name: string,
  constructor: CustomElementConstructor,
  options?: ElementDefinitionOptions
): void {
  if (customElements.get(name) !== undefined) {
    return;
  }
  customElements.define(name, constructor, options);
}

export const navigate = (_node: unknown, path: string, replace = false): void => {
  if (replace) {
    history.replaceState(null, "", path);
  } else {
    history.pushState(null, "", path);
  }
  fireEvent(window, "location-changed", { replace });
};
