import { html, nothing, type TemplateResult } from "lit";

import { t } from "./i18n";
import {
  MAX_SEASON_PERIODS,
  daysInMonth,
  monthDay,
  monthNames,
  parseMonthDay,
  type Period,
} from "./season";
import type { HomeAssistant } from "./types";

/** What a new period starts out as: the one most gardens want. */
const DEFAULT_PERIOD: Period = { from: "04-01", to: "10-31" };

/**
 * The list of periods a season is made of: day and month, from and to, for
 * each. Settings and the slot editors share it. A day picker, not a date
 * field — a date would ask for a year, and the season has none.
 */
export function renderSeasonEditor(
  hass: HomeAssistant,
  periods: Period[],
  busy: boolean,
  onChange: (next: Period[]) => void
): TemplateResult {
  const months = monthNames(hass);

  const picker = (
    index: number,
    key: "from" | "to",
    labelKey: string
  ): TemplateResult => {
    const [month, day] = parseMonthDay(periods[index][key]) ?? [1, 1];
    const set = (nextMonth: number, nextDay: number): void => {
      // A shorter month takes its own last day: 31 March becomes 30 April.
      const value = monthDay(nextMonth, Math.max(1, Math.min(nextDay, daysInMonth(nextMonth))));
      onChange(periods.map((p, i) => (i === index ? { ...p, [key]: value } : p)));
    };
    return html`
      <div class="season-date">
        <span class="season-date-label">${t(hass, labelKey)}</span>
        <select
          class="field-select season-day"
          aria-label=${t(hass, "config_panel.season_day")}
          ?disabled=${busy}
          @change=${(e: Event) => set(month, Number((e.target as HTMLSelectElement).value))}
        >
          ${Array.from({ length: daysInMonth(month) }, (_, i) => i + 1).map(
            (d) => html`<option value=${d} ?selected=${d === day}>${d}</option>`
          )}
        </select>
        <select
          class="field-select season-month"
          aria-label=${t(hass, "config_panel.season_month")}
          ?disabled=${busy}
          @change=${(e: Event) => set(Number((e.target as HTMLSelectElement).value), day)}
        >
          ${months.map(
            (name, i) => html`<option value=${i + 1} ?selected=${i + 1 === month}>${name}</option>`
          )}
        </select>
      </div>
    `;
  };

  return html`
    <div class="season-rows">
      ${periods.map(
        (_period, i) => html`
          <div class="season-row">
            ${picker(i, "from", "config_panel.season_from")}
            ${picker(i, "to", "config_panel.season_to")}
            <button
              type="button"
              class="row-remove"
              ?disabled=${busy}
              @click=${() => onChange(periods.filter((_p, idx) => idx !== i))}
            >
              ${t(hass, "config_panel.general_remove")}
            </button>
          </div>
        `
      )}
      ${periods.length < MAX_SEASON_PERIODS
        ? html`<button
            type="button"
            class="btn-outline"
            ?disabled=${busy}
            @click=${() => onChange([...periods, { ...DEFAULT_PERIOD }])}
          >
            ${t(hass, "config_panel.season_add")}
          </button>`
        : nothing}
    </div>
  `;
}

/** The three ways a slot can relate to the installation's season. */
export type SeasonChoice = "inherit" | "all_year" | "own";

export interface SlotSeason {
  override: boolean;
  periods: Period[];
}

export function seasonChoice(season: SlotSeason): SeasonChoice {
  if (!season.override) return "inherit";
  return season.periods.length ? "own" : "all_year";
}

/**
 * The season block of the slot editor and the cycle wizard: follow the
 * installation, water all year, or bring own periods. Folded away while the
 * slot simply follows the installation.
 */
export function renderSlotSeason(
  hass: HomeAssistant,
  season: SlotSeason,
  choice: SeasonChoice,
  busy: boolean,
  onChange: (next: SlotSeason, choice: SeasonChoice) => void
): TemplateResult {
  const pick = (next: SeasonChoice): void => {
    if (next === "inherit") onChange({ override: false, periods: season.periods }, next);
    else if (next === "all_year") onChange({ override: true, periods: [] }, next);
    else
      onChange(
        { override: true, periods: season.periods.length ? season.periods : [{ ...DEFAULT_PERIOD }] },
        next
      );
  };
  return html`
    <details class="inline-help" ?open=${choice !== "inherit"}>
      <summary>
        <ha-icon class="inline-help-icon" icon="mdi:calendar-range"></ha-icon>
        ${t(hass, "config_panel.season_slot_summary")}
      </summary>
      <p>${t(hass, "config_panel.season_slot_desc")}</p>
      <div class="field-row">
        <select
          class="field-select"
          aria-label=${t(hass, "config_panel.season_slot_summary")}
          ?disabled=${busy}
          @change=${(e: Event) => pick((e.target as HTMLSelectElement).value as SeasonChoice)}
        >
          ${(["inherit", "all_year", "own"] as SeasonChoice[]).map(
            (value) => html`<option value=${value} ?selected=${value === choice}>
              ${t(hass, `config_panel.season_choice_${value}`)}
            </option>`
          )}
        </select>
      </div>
      ${choice === "own"
        ? renderSeasonEditor(hass, season.periods, busy, (periods) =>
            onChange({ override: true, periods }, "own")
          )
        : nothing}
    </details>
  `;
}
