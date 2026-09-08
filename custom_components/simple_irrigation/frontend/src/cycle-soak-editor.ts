import { html, type TemplateResult } from "lit";

import { t } from "./i18n";
import { renderInlineHelp } from "./inline-help";
import { type CycleSoak } from "./schedule-phases";
import type { HomeAssistant } from "./types";

// The same caps as the backend (MAX_REPETITIONS / MAX_SOAK_MIN in const.py).
export const MAX_REPETITIONS = 10;
export const MAX_SOAK_MIN = 240;

/**
 * The Cycle & Soak block of the slot editor and the cycle wizard: three
 * numbers, one short explanation. Shared so both dialogs say the same thing.
 */
export function renderCycleSoakEditor(
  hass: HomeAssistant,
  cs: CycleSoak,
  busy: boolean,
  onChange: (next: CycleSoak) => void
): TemplateResult {
  const num = (
    key: keyof CycleSoak,
    labelKey: string,
    min: number,
    max: number
  ): TemplateResult => html`
    <ha-input
      type="number"
      .label=${t(hass, labelKey)}
      .value=${String(cs[key])}
      .disabled=${busy}
      min=${String(min)}
      max=${String(max)}
      @input=${(e: Event) => {
        const raw = parseInt((e.target as HTMLInputElement).value, 10);
        const value = Number.isFinite(raw) ? Math.max(min, Math.min(max, raw)) : min;
        onChange({ ...cs, [key]: value });
      }}
    ></ha-input>
  `;
  return html`
    <div class="field-block">
      <span class="field-title">${t(hass, "config_panel.cycle_soak_section_title")}</span>
      <div class="duration-row cycle-soak-row">
        ${num("repetitions", "config_panel.cycle_soak_repetitions", 1, MAX_REPETITIONS)}
        ${num("soakBetweenPhasesMin", "config_panel.cycle_soak_pause_phases", 0, MAX_SOAK_MIN)}
        ${num("soakBetweenRepetitionsMin", "config_panel.cycle_soak_pause_repetitions", 0, MAX_SOAK_MIN)}
      </div>
      ${renderInlineHelp(
        hass,
        "config_panel.cycle_soak_help_summary",
        ["config_panel.cycle_soak_section_desc", "config_panel.cycle_soak_hint"],
        "mdi:repeat"
      )}
    </div>
  `;
}
