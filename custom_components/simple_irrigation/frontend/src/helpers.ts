import { fireEvent } from "./fire-event";
import { t } from "./i18n";
import type { HomeAssistant } from "./types";

/** Backend error codes are snake_case identifiers, never prose. */
const ERROR_CODE_RE = /^[a-z][a-z0-9_]*$/;

/**
 * The backend error code behind a failed panel call, if there is one.
 *
 * A 2xx reply with `success: false` carries the code in `error`. For every other
 * status Home Assistant's `callApi` rejects with
 * `{ error: "Response error: <status>", status_code, body }`, and the code sits in
 * `body.error`. Reading only the top level shows the HTTP status to the user
 * instead of the translated sentence (GitHub issue #53).
 */
export function apiErrorCode(value: unknown): string | undefined {
  if (typeof value === "string") {
    return ERROR_CODE_RE.test(value) ? value : undefined;
  }
  if (value == null || typeof value !== "object") {
    return undefined;
  }
  const o = value as Record<string, unknown>;
  const body = o.body;
  if (body != null && typeof body === "object") {
    const code = (body as Record<string, unknown>).error;
    if (typeof code === "string" && ERROR_CODE_RE.test(code)) {
      return code;
    }
  }
  if (typeof o.error === "string" && ERROR_CODE_RE.test(o.error)) {
    return o.error;
  }
  return undefined;
}

/**
 * Turn a backend error code into a translated sentence.
 * Falls back to the raw code when no translation exists, so new codes degrade
 * to the previous behaviour instead of showing an empty message.
 */
function translateErrorCode(value: string, hass?: HomeAssistant): string {
  if (hass?.localize == null || !ERROR_CODE_RE.test(value)) {
    return value;
  }
  const path = `config_panel.errors_${value}`;
  const translated = t(hass, path);
  return translated === path ? value : translated;
}

/** Home Assistant callApi may put a string or structured object in `error`. */
export function formatApiError(value: unknown, hass?: HomeAssistant): string {
  const fallback =
    hass?.localize != null
      ? t(hass, "config_panel.errors_request_failed")
      : "Request failed";
  if (value == null || value === "") {
    return fallback;
  }
  const code = apiErrorCode(value);
  if (code !== undefined) {
    return translateErrorCode(code, hass);
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
