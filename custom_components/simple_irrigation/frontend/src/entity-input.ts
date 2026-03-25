import { html, type TemplateResult } from "lit";
import { t } from "./i18n";
import type { HomeAssistant } from "./types";

/** Entity IDs for allowed output domains (same rule set as the backend). */
export function entityIdsForDomains(hass: HomeAssistant, domains: string[]): string[] {
  return Object.keys(hass.states)
    .filter((eid) => domains.includes(eid.split(".", 1)[0]))
    .sort((a, b) => a.localeCompare(b));
}

/** One shared `<datalist>` per form (by stable `listId`). */
export function renderEntityDatalist(
  hass: HomeAssistant,
  listId: string,
  domains: string[]
): TemplateResult {
  const ids = entityIdsForDomains(hass, domains);
  return html`
    <datalist id=${listId}>
      ${ids.map((id) => html`<option value=${id}></option>`)}
    </datalist>
  `;
}

/**
 * Browser autocomplete for entity_id — works inside panel_custom scoped registries where
 * `ha-entity-picker` is not registered.
 */
export function renderNativeEntityField(
  hass: HomeAssistant,
  listId: string,
  label: string,
  value: string,
  onValue: (v: string) => void
): TemplateResult {
  return html`
    <div class="native-entity-field">
      <label class="native-entity-label">${label}</label>
      <input
        type="text"
        class="entity-id-input"
        list=${listId}
        .value=${value}
        placeholder=${t(hass, "config_panel.entity_placeholder_example")}
        spellcheck="false"
        autocomplete="off"
        @input=${(e: Event) => onValue((e.target as HTMLInputElement).value)}
      />
    </div>
  `;
}
