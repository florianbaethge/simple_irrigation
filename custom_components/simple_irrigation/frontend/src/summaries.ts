/**
 * One line for what a section of an editor holds.
 *
 * The editors are accordions: closed, a section says in a line what is in it,
 * so a schedule reads from top to bottom without opening anything. "muted"
 * marks a section nobody touched -- the default applies -- so what was set
 * stands out; "warn" marks one that has to be filled in.
 */

import { formatTimeLocalForDisplay, weekdaysSummary } from "./date-format";
import { guardLabel, type Guard } from "./guard-list-editor";
import { t } from "./i18n";
import { isCycleSoak, type CycleSoak } from "./schedule-phases";
import type { ScriptOverride } from "./script-override";
import { formatSeason, type Period } from "./season";
import type { HomeAssistant } from "./types";

export interface Summary {
  text: string;
  tone: "" | "muted" | "warn";
}

type Hass = HomeAssistant;

const SEP = " · ";
const said = (text: string): Summary => ({ text, tone: "" });
const quiet = (text: string): Summary => ({ text, tone: "muted" });
const missing = (text: string): Summary => ({ text, tone: "warn" });

function entityName(hass: Hass, entityId: string): string {
  const friendly = hass.states?.[entityId]?.attributes?.friendly_name;
  return typeof friendly === "string" && friendly.trim() ? friendly : entityId;
}

/** "Daily · 06:00", "Mon, Wed · odd weeks · 19:30". */
export function whenSummary(
  hass: Hass,
  weekdays: number[],
  weekParity: string,
  timeLocal: string
): Summary {
  if (!weekdays.length) return missing(t(hass, "config_panel.sum_no_days"));
  const parts = [weekdaysSummary(hass, weekdays)];
  if (weekParity === "odd" || weekParity === "even") {
    parts.push(t(hass, `config_panel.week_parity_${weekParity}`));
  }
  parts.push(formatTimeLocalForDisplay(hass, timeLocal));
  return said(parts.join(SEP));
}

/** "Front lawn, Back lawn · ~20 min". */
export function zonesSummary(hass: Hass, names: string[], minutes: number): Summary {
  if (!names.length) return missing(t(hass, "config_panel.sum_no_zones"));
  return said(`${names.join(", ")}${SEP}~${minutes} ${t(hass, "config_panel.zones_min_suffix")}`);
}

/** The slot's own conditions, and whether the installation's count as well. */
export function guardsSummary(
  hass: Hass,
  own: Guard[],
  ignoreGlobal: boolean,
  global: Guard[]
): Summary {
  const mine = own.filter((g) => g.entity_id).map((g) => guardLabel(hass, g));
  if (mine.length) {
    const parts = [mine.join(", ")];
    if (ignoreGlobal && global.length) parts.push(t(hass, "config_panel.sum_guards_global_off"));
    return said(parts.join(SEP));
  }
  if (ignoreGlobal && global.length) return said(t(hass, "config_panel.sum_guards_global_off"));
  return quiet(
    t(hass, global.length ? "config_panel.sum_guards_installation" : "config_panel.sum_none")
  );
}

/** The installation's conditions, each written out. */
export function guardListSummary(hass: Hass, guards: Guard[]): Summary {
  const labels = guards.filter((g) => g.entity_id).map((g) => guardLabel(hass, g));
  return labels.length ? said(labels.join(", ")) : quiet(t(hass, "config_panel.sum_none"));
}

/** "3× · rests 5 / 15 min". */
export function cycleSoakSummary(hass: Hass, cs: CycleSoak): Summary {
  if (!isCycleSoak(cs)) return quiet(t(hass, "config_panel.sum_off"));
  const parts = [`${cs.repetitions}×`];
  if (cs.soakBetweenPhasesMin || cs.soakBetweenRepetitionsMin) {
    parts.push(
      t(hass, "config_panel.sum_rests", {
        a: cs.soakBetweenPhasesMin,
        b: cs.soakBetweenRepetitionsMin,
      })
    );
  }
  return said(parts.join(SEP));
}

/** A slot's season: the installation's, all year, or its own periods. */
export function slotSeasonSummary(hass: Hass, override: boolean, periods: Period[]): Summary {
  if (!override) return quiet(t(hass, "config_panel.season_choice_inherit"));
  if (!periods.length) return said(t(hass, "config_panel.season_choice_all_year"));
  return said(formatSeason(hass, periods));
}

/** The installation's season. */
export function seasonSummary(hass: Hass, periods: Period[]): Summary {
  return periods.length
    ? said(formatSeason(hass, periods))
    : quiet(t(hass, "config_panel.season_choice_all_year"));
}

/** Which of a slot's two scripts are its own. */
export function slotScriptsSummary(hass: Hass, pre: ScriptOverride, post: ScriptOverride): Summary {
  const parts: string[] = [];
  if (pre.override) parts.push(t(hass, "config_panel.sum_script_pre_own"));
  if (post.override) parts.push(t(hass, "config_panel.sum_script_post_own"));
  return parts.length
    ? said(parts.join(SEP))
    : quiet(t(hass, "config_panel.season_choice_inherit"));
}

/** Entities by their names; `empty` when there is none. */
export function entitiesSummary(
  hass: Hass,
  entityIds: string[],
  empty: Summary
): Summary {
  const ids = entityIds.filter(Boolean);
  return ids.length ? said(ids.map((id) => entityName(hass, id)).join(", ")) : empty;
}

export function noneSummary(hass: Hass): Summary {
  return quiet(t(hass, "config_panel.sum_none"));
}

export function missingSummary(hass: Hass, key: string): Summary {
  return missing(t(hass, key));
}

export function saidSummary(text: string): Summary {
  return said(text);
}

export function quietSummary(text: string): Summary {
  return quiet(text);
}

export { entityName as summaryEntityName };
