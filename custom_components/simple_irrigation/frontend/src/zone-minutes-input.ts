import { html, type TemplateResult } from "lit";
import { t } from "./i18n";
import type { HomeAssistant } from "./types";

/** Longest a zone may run (`MAX_ZONE_DURATION_MIN` in const.py). */
const MAX_ZONE_MINUTES = 240;

/** A slot's fixed minutes per zone; a zone that is not in it follows the mode. */
export type ZoneMinutes = Record<string, number>;

export function zoneMinutesOf(slot: Record<string, unknown> | undefined): ZoneMinutes {
  const raw = slot?.zone_minutes;
  const out: ZoneMinutes = {};
  if (raw && typeof raw === "object") {
    for (const [zoneId, minutes] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof minutes === "number" && Number.isFinite(minutes)) out[zoneId] = minutes;
    }
  }
  return out;
}

/** The fixed minutes of the zones a slot waters, as the API takes them. */
export function zoneMinutesForSave(fixed: ZoneMinutes, zoneIds: string[]): ZoneMinutes {
  return Object.fromEntries(zoneIds.filter((id) => id in fixed).map((id) => [id, fixed[id]]));
}

/**
 * How long one zone waters in a schedule. Empty means "as the mode says", and
 * the placeholder shows what that is right now; a number fixes it.
 */
export function renderZoneMinutesInput(
  hass: HomeAssistant,
  zoneName: string,
  inherited: number,
  fixed: number | undefined,
  onChange: (minutes: number | undefined) => void
): TemplateResult {
  const label = t(hass, "config_panel.schedule_zone_minutes_label", { zone: zoneName });
  return html`<label class="zone-min" title=${label}>
    <input
      type="number"
      inputmode="numeric"
      min="0"
      max=${MAX_ZONE_MINUTES}
      step="1"
      aria-label=${label}
      placeholder=${String(inherited)}
      .value=${fixed === undefined ? "" : String(fixed)}
      @input=${(e: Event) => {
        const raw = (e.target as HTMLInputElement).value.trim();
        const n = Math.round(Number(raw));
        onChange(
          raw === "" || !Number.isFinite(n) ? undefined : Math.max(0, Math.min(MAX_ZONE_MINUTES, n))
        );
      }}
    />
    <span>${t(hass, "config_panel.zones_min_suffix")}</span>
  </label>`;
}
