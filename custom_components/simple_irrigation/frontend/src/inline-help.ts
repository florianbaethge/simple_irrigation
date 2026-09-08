import { html, type TemplateResult } from "lit";

import { t } from "./i18n";
import type { HomeAssistant } from "./types";

/**
 * A collapsed explanation under a form section: one line to click, the
 * paragraphs behind it. Editors and the wizard stay short on a phone; the
 * help is one tap away rather than pushing the fields off the screen.
 */
export function renderInlineHelp(
  hass: HomeAssistant,
  summaryKey: string,
  paragraphKeys: string[],
  icon = "mdi:help-circle-outline",
  values: Record<string, string | number> = {}
): TemplateResult {
  return html`
    <details class="inline-help">
      <summary>
        <ha-icon class="inline-help-icon" icon=${icon}></ha-icon>
        ${t(hass, summaryKey)}
      </summary>
      ${paragraphKeys.map((key) => html`<p>${t(hass, key, values)}</p>`)}
    </details>
  `;
}
