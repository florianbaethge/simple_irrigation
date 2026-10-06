import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from "lit";
import { state, query } from "lit/decorators.js";
import { deleteCycle, runSlotNow, saveSlot, upsertCycle } from "../data/api";
import {
  GUARD_ENTITY_DOMAINS,
  guardLabel,
  guardsForSave,
  guardsIncomplete,
  normalizeGuards,
  renderGuardList,
  type Guard,
} from "../guard-list-editor";
import {
  SCRIPT_ENTITY_DOMAINS,
  hasScriptOverride,
  normalizeScriptOverride,
  renderScriptOverride,
  scriptOverrideForSave,
  type ScriptOverride,
} from "../script-override";
import { apiErrorCode, defineCustomElementOnce, formatApiError } from "../helpers";
import { stripEditSlotQueryFromUrl } from "../navigation";
import { t } from "../i18n";
import { formLayoutStyles } from "../form-layout-styles";
import { sharedStyles } from "../shared-styles";
import {
  formatTimeLocalForDisplay,
  normalizeWeekdays,
  weekdayLong,
  weekdayShort,
  weekdaysSummary,
} from "../date-format";
import {
  computePhases,
  cycleSoakOf,
  isCycleSoak,
  phaseIndexByZoneId,
  programMinutes,
  type CycleSoak,
  type ZonePhaseInput,
} from "../schedule-phases";
import {
  durationForMode,
  minutesToTimeLocal,
  parseTimeLocalToMinutes,
  plannedLitres,
  slotZoneMinutes,
} from "../timetable-model";
import { renderCycleSoakEditor } from "../cycle-soak-editor";
import {
  accordionStyles,
  renderAccordion,
  renderAccordionGroup,
  type AccordionSection,
} from "../accordion";
import { renderInlineHelp } from "../inline-help";
import {
  cycleSoakSummary,
  guardsSummary,
  slotScriptsSummary,
  slotSeasonSummary,
  whenSummary,
  zonesSummary,
  type Summary,
} from "../summaries";
import {
  formatMonthDay,
  formatSeason,
  inSeason,
  monthDay,
  nextDayInSeason,
  normalizeSeason,
  type Period,
} from "../season";
import {
  renderSlotSeason,
  seasonChoice,
  type SeasonChoice,
  type SlotSeason,
} from "../season-editor";
import { formatVolumeNumber, litresToUnit, volumeUnit } from "../units";
import {
  renderZoneMinutesInput,
  zoneMinutesForSave,
  zoneMinutesOf,
  type ZoneMinutes,
} from "../zone-minutes-input";
import { orderedZoneIds } from "../zone-order";
import {
  anchorWeekParity,
  generateCycleSlots,
  mondayBasedWeekday,
  nextFire,
  previewStrip,
  type CycleMeta,
} from "../cycle";
import type { CycleWizard } from "../cycle-wizard";
import "../cycle-wizard";
import type { HomeAssistant } from "../types";

type WeekParity = "every" | "odd" | "even";
const WEEK_PARITIES: WeekParity[] = ["every", "odd", "even"];
const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6];

interface SlotRow {
  slot_id: string;
  weekdays: number[];
  time_local: string;
  enabled: boolean;
  zone_ids_ordered: string[];
  name: string;
  week_parity: WeekParity;
  guards: Guard[];
  ignore_global_guards: boolean;
  pre_start_script: ScriptOverride;
  post_run_script: ScriptOverride;
  cycle_id: string | null;
  cycle_kind: string;
  cycle_meta: CycleMeta | null;
  cycle_soak: CycleSoak;
  /** Fixed minutes per zone; a zone that is not in here follows the mode. */
  zone_minutes: ZoneMinutes;
  /** Own periods of the year, standing in for the installation's season. */
  season: SlotSeason;
  /** What the editor's season picker shows; settled when the row is read. */
  season_choice: SeasonChoice;
}

interface CycleGroup {
  cycle_id: string;
  members: SlotRow[];
  label: string;
  kind: string;
  meta: CycleMeta | null;
}

interface CleanupProposal {
  optionId: string;
  meta: CycleMeta;
  zoneIds: string[];
  zoneMinutes: ZoneMinutes;
  season: SlotSeason;
  /** The slot the others are folded into: its settings become the cycle's. */
  model: SlotRow;
  memberIds: string[];
  label: string;
}

export class ViewSchedule extends LitElement {
  static properties = {
    hass: { attribute: false },
    entryId: { type: String },
    installation: { type: Object },
    runState: { type: Object },
    onSaved: { attribute: false },
  };

  hass!: HomeAssistant;
  entryId!: string;
  installation!: Record<string, unknown>;
  runState?: Record<string, unknown>;
  onSaved?: () => void | Promise<void>;

  static styles = [
    sharedStyles,
    formLayoutStyles,
    accordionStyles,
    css`
      .card-header .header-actions .btn,
      .card-header .header-actions .btn-outline {
        margin-top: 0;
        align-self: center;
      }
      .quick-add {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        scroll-snap-type: x proximity;
        padding: 2px 0 8px;
        margin-bottom: 6px;
      }
      .quick-add .chip {
        scroll-snap-align: start;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .member-line {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
        border-top: 1px solid var(--divider-color);
        font-size: 0.85rem;
      }
      .member-line:first-of-type {
        border-top: none;
        margin-top: 6px;
      }
      /* The text may wrap; the edit button keeps its place at the end. */
      .member-text {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px 12px;
      }
      .detach-line {
        margin-top: 10px;
        font-size: 0.82rem;
        color: var(--secondary-text-color);
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .zones {
        list-style: none;
        padding: 0;
        margin: 10px 0;
      }
      .zones li {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        padding: 8px 0;
        border-bottom: 1px solid var(--divider-color);
      }
      .zones li.phase-sep {
        display: block;
        margin: 12px 0 4px;
        padding: 0;
        border-bottom: none;
      }
      .zones li.phase-sep span {
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--secondary-text-color);
      }
      .zones li:not(.phase-sep) {
        flex-wrap: nowrap;
      }
      .zones .zone-name {
        flex: 1 1 0;
        min-width: 3.5em;
      }
      .zone-actions {
        display: flex;
        gap: 2px;
        margin-left: auto;
      }
      .iconbtn.small {
        width: 34px;
        height: 34px;
      }
      .iconbtn.small ha-icon {
        --mdc-icon-size: 18px;
      }
      .when-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .when-row input[type="time"] {
        flex: 0 0 8.5em;
        width: auto;
      }
      .when-row select.field-select {
        flex: 1 1 10em;
        width: auto;
      }
      /* Seven days in one row, on a phone too. */
      .weekday-chips {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 6px;
        max-width: 420px;
      }
      .weekday-chips .chip.day {
        min-width: 0;
        padding-left: 0;
        padding-right: 0;
      }
      .weekday-presets {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 4px 0 10px;
      }
      .chip.day {
        min-width: 44px;
        min-height: 40px;
        text-align: center;
        justify-content: center;
      }

    `,
  ];

  @state() private _busy = false;
  @state() private _msg?: string;
  @state() private _expanded = new Set<string>();
  @state() private _slotEditDraft: SlotRow | null = null;
  // The editor's accordion: at most one section open.
  @state() private _openSection: string | null = "when";
  @state() private _addZonePick = "";
  @state() private _cleanupProposals: CleanupProposal[] | null = null;
  private _consumedEditSlotKey: string | null = null;

  @query("si-cycle-wizard") private _wizard?: CycleWizard;

  // ---- data ---------------------------------------------------------------

  private _slots(): SlotRow[] {
    const s = this.installation?.schedule_slots as unknown[] | undefined;
    if (!Array.isArray(s)) return [];
    return s.map((raw) => {
      const o = raw as Record<string, unknown>;
      const wds = normalizeWeekdays(o.weekdays);
      const rid = o.cycle_id ? String(o.cycle_id) : null;
      const season: SlotSeason = {
        override: Boolean(o.override_season ?? false),
        periods: normalizeSeason(o.season),
      };
      return {
        slot_id: String(o.slot_id ?? ""),
        weekdays: wds.length ? wds : normalizeWeekdays([o.weekday ?? 0]),
        time_local: String(o.time_local ?? "06:00"),
        enabled: Boolean(o.enabled ?? true),
        zone_ids_ordered: Array.isArray(o.zone_ids_ordered) ? [...(o.zone_ids_ordered as string[])] : [],
        name: String(o.name ?? "").trim(),
        week_parity:
          o.week_parity === "odd" || o.week_parity === "even" ? (o.week_parity as WeekParity) : "every",
        guards: normalizeGuards(o.guards),
        ignore_global_guards: Boolean(o.ignore_global_guards ?? false),
        pre_start_script: normalizeScriptOverride(o, "pre_start"),
        post_run_script: normalizeScriptOverride(o, "post_run"),
        cycle_id: rid,
        cycle_kind: String(o.cycle_kind ?? "custom"),
        cycle_meta: (o.cycle_meta as CycleMeta) ?? null,
        cycle_soak: cycleSoakOf(o),
        zone_minutes: zoneMinutesOf(o),
        season,
        season_choice: seasonChoice(season),
      };
    });
  }

  /** The periods that decide for a slot: its own, or the installation's. */
  private _seasonOf(s: SlotRow | undefined): Period[] {
    return s?.season.override ? s.season.periods : normalizeSeason(this.installation?.season);
  }

  /**
   * Split slots into real cycles (>=2 linked members) and single slots.
   * A cycle only exists when the cadence needed >=2 slots (every 2/3 days).
   * Anything else — incl. a stray 1-member cycle from old data — is a single slot.
   */
  private _groupsAndCustom(): { groups: CycleGroup[]; custom: SlotRow[] } {
    const index = new Map<string, CycleGroup>();
    const order: CycleGroup[] = [];
    const single: SlotRow[] = [];
    for (const s of this._slots()) {
      if (!s.cycle_id) {
        single.push(s);
        continue;
      }
      let g = index.get(s.cycle_id);
      if (!g) {
        g = {
          cycle_id: s.cycle_id,
          members: [],
          label: String(s.cycle_meta?.label ?? s.name ?? ""),
          kind: s.cycle_kind,
          meta: s.cycle_meta,
        };
        index.set(s.cycle_id, g);
        order.push(g);
      }
      g.members.push(s);
    }
    // Demote 1-member "cycles" to plain single slots, preserving overall order.
    const groups: CycleGroup[] = [];
    for (const g of order) {
      if (g.members.length >= 2) groups.push(g);
      else single.push(...g.members);
    }
    return { groups, custom: single };
  }

  private _cloneSlot(s: SlotRow): SlotRow {
    return {
      ...s,
      weekdays: [...s.weekdays],
      zone_ids_ordered: [...s.zone_ids_ordered],
      guards: s.guards.map((g) => ({ ...g })),
      pre_start_script: { ...s.pre_start_script },
      post_run_script: { ...s.post_run_script },
      cycle_soak: { ...s.cycle_soak },
      zone_minutes: { ...s.zone_minutes },
      season: { override: s.season.override, periods: s.season.periods.map((p) => ({ ...p })) },
    };
  }

  /** The installation's script for one phase, inherited unless a slot overrides. */
  private _globalScript(phase: "pre_start" | "post_run"): string {
    return String(this.installation?.[`${phase}_script`] ?? "").trim();
  }

  private _globalScriptTimeout(phase: "pre_start" | "post_run"): number {
    const n = Number(this.installation?.[`${phase}_script_timeout_sec`] ?? 300);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 300;
  }

  /** Read-only chip shown on a slot/cycle row that brings its own scripts. */
  private _renderScriptMeta(s: SlotRow): TemplateResult | typeof nothing {
    if (!hasScriptOverride(s.pre_start_script, s.post_run_script)) return nothing;
    return html`<span class="meta"
      ><ha-icon icon="mdi:script-text-outline"></ha-icon>${t(
        this.hass,
        "config_panel.schedule_scripts_own"
      )}</span
    >`;
  }

  /** "~120 L" for one run of the slot, from the zones' flow rates. */
  private _renderWaterMeta(s: SlotRow): TemplateResult | typeof nothing {
    const litres = plannedLitres(
      s.zone_ids_ordered,
      this._zonesMap(),
      this._mode(),
      s.cycle_soak.repetitions,
      s.zone_minutes
    );
    if (litres === null) return nothing;
    const unit = volumeUnit(this.hass);
    return html`<span class="meta"
      ><ha-icon icon="mdi:water-outline"></ha-icon>${t(this.hass, "config_panel.water_approx", {
        v: formatVolumeNumber(litresToUnit(litres, unit)),
        u: unit,
      })}</span
    >`;
  }

  /** "Tue 06:00" for a run this week, "1 Apr 06:00" for one further out. */
  private _nextLabel(next: Date): string {
    const time = formatTimeLocalForDisplay(
      this.hass,
      `${next.getHours()}:${String(next.getMinutes()).padStart(2, "0")}`
    );
    const soon = next.getTime() - Date.now() < 7 * 86400000;
    const day = soon
      ? weekdayShort(this.hass, mondayBasedWeekday(next))
      : formatMonthDay(this.hass, monthDay(next.getMonth() + 1, next.getDate()));
    return `${day} ${time}`;
  }

  /** Read-only chip on a row that brings its own season. */
  private _renderSeasonMeta(s: SlotRow | undefined): TemplateResult | typeof nothing {
    if (!s?.season.override) return nothing;
    // "All year" only says something where the installation has a season.
    if (!s.season.periods.length && !normalizeSeason(this.installation?.season).length) {
      return nothing;
    }
    return html`<span class="meta"
      ><ha-icon icon="mdi:calendar-range"></ha-icon>${s.season.periods.length
        ? formatSeason(this.hass, s.season.periods)
        : t(this.hass, "config_panel.season_choice_all_year")}</span
    >`;
  }

  /**
   * A badge for a row whose own season is closed today, with the day it comes
   * back. Rows that follow the installation share one line above the list.
   */
  private _renderOffSeasonBadge(s: SlotRow | undefined): TemplateResult | typeof nothing {
    if (!s?.season.override) return nothing;
    const periods = s.season.periods;
    const today = new Date();
    if (inSeason(periods, today)) return nothing;
    const opens = nextDayInSeason(periods, today);
    return html`<span class="badge"
      >${t(this.hass, "config_panel.season_badge_off", {
        date: opens
          ? formatMonthDay(this.hass, monthDay(opens.getMonth() + 1, opens.getDate()))
          : "",
      })}</span
    >`;
  }

  /** One line for every row that follows the installation while its season is closed. */
  private _renderInstallationOffSeason(): TemplateResult | typeof nothing {
    const periods = normalizeSeason(this.installation?.season);
    const today = new Date();
    if (inSeason(periods, today) || !this._slots().some((s) => !s.season.override)) {
      return nothing;
    }
    const opens = nextDayInSeason(periods, today);
    return html`<p class="hint">
      ${t(this.hass, "config_panel.overview_season_opens", {
        date: opens
          ? formatMonthDay(this.hass, monthDay(opens.getMonth() + 1, opens.getDate()))
          : "",
      })}
    </p>`;
  }

  /** Read-only chip on a row that waters in passes with rests in between. */
  private _renderCycleSoakMeta(s: SlotRow): TemplateResult | typeof nothing {
    if (!isCycleSoak(s.cycle_soak)) return nothing;
    return html`<span class="meta"
      ><ha-icon icon="mdi:repeat"></ha-icon>${t(this.hass, "config_panel.cycle_soak_badge", {
        r: s.cycle_soak.repetitions,
      })}</span
    >`;
  }

  /** Guards defined on the installation; inherited unless a slot opts out. */
  private _globalGuards(): Guard[] {
    return normalizeGuards(this.installation?.guards);
  }

  /** Badge text for a slot's own guards: one spelled out, several counted. */
  private _guardBadge(guards: Guard[]): string {
    return guards.length === 1
      ? guardLabel(this.hass, guards[0])
      : t(this.hass, "config_panel.guards_count", { n: String(guards.length) });
  }

  /** Read-only chips shown on a slot/cycle row. */
  private _renderGuardMeta(guards: Guard[], ignoreGlobal: boolean): TemplateResult {
    return html`
      ${guards.length
        ? html`<span class="meta"
            ><ha-icon icon="mdi:shield-check-outline"></ha-icon>${this._guardBadge(guards)}</span
          >`
        : nothing}
      ${ignoreGlobal
        ? html`<span class="meta"
            ><ha-icon icon="mdi:shield-off-outline"></ha-icon>${t(
              this.hass,
              "config_panel.schedule_guards_global_off"
            )}</span
          >`
        : nothing}
    `;
  }

  private _zonesMap(): Record<string, Record<string, unknown>> | undefined {
    return this.installation?.zones as Record<string, Record<string, unknown>> | undefined;
  }

  private _zoneName(zid: string): string {
    const z = this._zonesMap()?.[zid];
    return z ? String(z.name ?? zid) : zid;
  }

  private _mode(): string {
    return String(this.installation?.mode ?? "normal");
  }

  private _maxParallel(): number {
    const n = Number(this.installation?.max_parallel_zones ?? 2);
    return Number.isFinite(n) && n >= 1 ? n : 2;
  }

  private _zonesPhaseInput(): Record<string, ZonePhaseInput> {
    const zones = this._zonesMap();
    const out: Record<string, ZonePhaseInput> = {};
    if (!zones) return out;
    for (const [id, z] of Object.entries(zones)) {
      out[id] = { enabled: Boolean(z?.enabled ?? true), exclusive: Boolean(z?.exclusive ?? false) };
    }
    return out;
  }

  private _estimateMin(zoneIds: string[], cs: CycleSoak, fixed: ZoneMinutes): number {
    const zones = this._zonesMap();
    if (!zones) return 0;
    const phases = computePhases(zoneIds, this._zonesPhaseInput(), this._maxParallel(), true);
    const preStart = Math.max(0, Number(this.installation?.pre_start_delay_sec ?? 10)) / 60;
    const mode = this._mode();
    const minutes = programMinutes(phases, cs, (zid) => {
      const z = zones[zid];
      return z && Boolean(z.enabled ?? true) ? slotZoneMinutes(zid, z, mode, fixed) : 0;
    });
    return Math.round(preStart + minutes);
  }

  /** A badge for a slot that fixes the minutes of at least one of its zones. */
  private _renderFixedMinutesBadge(s: SlotRow | undefined): TemplateResult | typeof nothing {
    if (!s || !s.zone_ids_ordered.some((id) => id in s.zone_minutes)) return nothing;
    return html`<span class="badge">${t(this.hass, "config_panel.schedule_badge_fixed_minutes")}</span>`;
  }

  private _phaseCount(zoneIds: string[]): number {
    return computePhases(zoneIds, this._zonesPhaseInput(), this._maxParallel(), true).length;
  }

  private _nextFire(members: SlotRow[]): Date | null {
    const now = new Date();
    let first: Date | null = null;
    for (const m of members) {
      if (!m.enabled) continue;
      const at = nextFire(m, this._seasonOf(m), now);
      if (at && (!first || at < first)) first = at;
    }
    return first;
  }

  // ---- api helpers --------------------------------------------------------

  private async _call(body: Record<string, unknown>): Promise<boolean> {
    this._busy = true;
    this._msg = undefined;
    this.requestUpdate();
    try {
      const res = await saveSlot(this.hass, this.entryId, body);
      if (!res.success) {
        this._msg = formatApiError(res.error, this.hass);
        return false;
      }
      this.onSaved?.();
      return true;
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
      return false;
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private _runtimeBusy(): boolean {
    const s = String((this.runState ?? {}).run_state ?? "idle");
    return ["preparing", "running", "stopping"].includes(s);
  }

  private async _runSlotNow(slotId: string): Promise<void> {
    if (this._runtimeBusy()) return;
    this._busy = true;
    this._msg = undefined;
    this.requestUpdate();
    const map: Record<string, string> = {
      busy: "config_panel.schedule_err_busy",
      empty_slot: "config_panel.schedule_err_empty_slot",
      no_runnable_zones: "config_panel.schedule_err_no_runnable",
      unknown_slot: "config_panel.schedule_err_unknown_slot",
    };
    const message = (code: string | undefined, raw: unknown): string =>
      code && map[code] ? t(this.hass, map[code]) : formatApiError(raw, this.hass);
    try {
      const res = (await runSlotNow(this.hass, this.entryId, slotId)) as { success: boolean; error?: string };
      if (!res.success) {
        const code = res.error ?? "run_failed";
        this._msg = message(code, code);
      } else {
        this.onSaved?.();
      }
    } catch (e) {
      // 400/409 replies reject in callApi; the code is inside the rejection body.
      this._msg = message(apiErrorCode(e), e);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private async _toggleGroupEnabled(g: CycleGroup, enabled: boolean): Promise<void> {
    if (this._busy) return;
    this._busy = true;
    this._msg = undefined;
    try {
      for (const m of g.members) {
        const res = await saveSlot(this.hass, this.entryId, {
          action: "update",
          slot_id: m.slot_id,
          enabled,
        });
        if (!res.success) {
          this._msg = formatApiError(res.error, this.hass);
          break;
        }
      }
      this.onSaved?.();
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private async _toggleSlotEnabled(slot: SlotRow, enabled: boolean): Promise<void> {
    if (this._busy) return;
    await this._call({ action: "update", slot_id: slot.slot_id, enabled });
  }

  private async _detachCycle(g: CycleGroup): Promise<void> {
    if (!confirm(t(this.hass, "config_panel.cycle_detach_confirm"))) return;
    this._busy = true;
    this._msg = undefined;
    try {
      for (const m of g.members) {
        const res = await saveSlot(this.hass, this.entryId, {
          action: "update",
          slot_id: m.slot_id,
          cycle_id: null,
          cycle_kind: "custom",
        });
        if (!res.success) {
          this._msg = formatApiError(res.error, this.hass);
          break;
        }
      }
      this.onSaved?.();
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private async _deleteCycle(g: CycleGroup): Promise<void> {
    if (!confirm(t(this.hass, "config_panel.cycle_delete_confirm"))) return;
    this._busy = true;
    this._msg = undefined;
    try {
      const res = await deleteCycle(this.hass, this.entryId, g.cycle_id);
      if (!res.success) this._msg = formatApiError(res.error, this.hass);
      else this.onSaved?.();
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  // ---- wizard -------------------------------------------------------------

  private _openWizardNew(): void {
    this._msg = undefined;
    this._wizard?.start({ step: 1 });
  }

  /**
   * The installation as the backend has it now. Editors open on that: an
   * automation may have set a slot's minutes since the list was loaded, and
   * saving a dialog built from the old list would put the old ones back.
   */
  private async _reload(): Promise<void> {
    await this.onSaved?.();
    await new Promise((resolve) => setTimeout(resolve));
  }

  private async _openWizardEdit(g: CycleGroup): Promise<void> {
    this._msg = undefined;
    await this._reload();
    const slots = (this.installation?.schedule_slots as Array<Record<string, unknown>>).filter(
      (s) => String(s.cycle_id ?? "") === g.cycle_id
    );
    if (slots.length) this._wizard?.start({ seedFromSlots: slots, step: 1 });
  }

  private async _openSlotEdit(slotId: string): Promise<void> {
    this._addZonePick = "";
    await this._reload();
    const slot = this._slots().find((s) => s.slot_id === slotId);
    this._openSection = "when";
    if (slot) this._slotEditDraft = this._cloneSlot(slot);
  }

  // ---- cleanup ------------------------------------------------------------

  /**
   * Ungrouped slots that are one schedule written out day by day: the same
   * time, zones and settings throughout, and days that a cadence of the wizard
   * produces exactly. Only then does folding them into a cycle change nothing
   * about what waters when.
   */
  private _analyzeCleanup(): CleanupProposal[] {
    const { custom } = this._groupsAndCustom();
    const buckets = new Map<string, SlotRow[]>();
    for (const s of custom) {
      // Everything a cycle's entries share. Two slots that differ in any of it
      // are two schedules, however alike their days look.
      const key = JSON.stringify([
        s.time_local,
        s.zone_ids_ordered,
        zoneMinutesForSave(s.zone_minutes, s.zone_ids_ordered),
        s.season.override ? s.season.periods : null,
        guardsForSave(s.guards),
        s.ignore_global_guards,
        s.pre_start_script,
        s.post_run_script,
        s.cycle_soak,
        s.enabled,
        s.name,
      ]);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(s);
    }
    const proposals: CleanupProposal[] = [];
    for (const list of buckets.values()) {
      if (list.length < 2) continue;
      const parities = new Set(list.map((s) => s.week_parity));
      const model = list[0];
      const time = model.time_local;
      const zoneIds = model.zone_ids_ordered;
      const zoneMinutes = zoneMinutesForSave(model.zone_minutes, zoneIds);
      const season = model.season;
      const memberIds = list.map((s) => s.slot_id);
      const shared = { zoneIds, zoneMinutes, season, model, memberIds, label: model.name };

      if (parities.size === 1 && parities.has("every")) {
        // Every week throughout: the days simply add up. A day named twice
        // would water twice today and once afterwards -- not the same thing.
        const all = list.flatMap((s) => s.weekdays);
        const union = normalizeWeekdays(all);
        if (union.length !== all.length) continue;
        const optionId = union.length === 7 ? "daily" : union.length === 1 ? "weekly" : "n_per_week";
        const meta: CycleMeta = { times: [time] };
        if (optionId === "weekly") meta.anchor_weekday = union[0];
        else if (optionId === "n_per_week") meta.week_days = union;
        proposals.push({ optionId, meta, ...shared });
      } else if (list.length === 2 && parities.has("odd") && parities.has("even")) {
        // An odd-week and an even-week slot are "every 2 days" only if their
        // days are the ones that rhythm has, in the weeks it has them. Any
        // other pair -- Monday in odd weeks, Friday in even ones -- is not.
        const have = list.map((s) => `${s.weekdays.join(",")}/${s.week_parity}`).sort().join("|");
        const today = new Date();
        for (let anchor = 0; anchor < 7; anchor++) {
          const meta: CycleMeta = { times: [time], n: 2, anchor_weekday: anchor };
          const want = generateCycleSlots("every_n_days", meta, anchorWeekParity(anchor, today))
            .map((spec) => `${spec.weekdays.join(",")}/${spec.week_parity}`)
            .sort()
            .join("|");
          if (want === have) {
            proposals.push({ optionId: "every_2_days", meta, ...shared });
            break;
          }
        }
      }
    }
    return proposals;
  }

  private _openCleanup(): void {
    const proposals = this._analyzeCleanup();
    this._cleanupProposals = proposals;
  }

  private async _applyCleanup(): Promise<void> {
    const proposals = this._cleanupProposals ?? [];
    if (!proposals.length) {
      this._cleanupProposals = null;
      return;
    }
    this._busy = true;
    this._msg = undefined;
    try {
      for (const p of proposals) {
        const opt = p.optionId;
        const kind =
          opt === "every_2_days" ? "every_n_days" : opt === "every_3_days" ? "every_n_days" : opt;
        const m = p.model;
        const res = await upsertCycle(this.hass, this.entryId, {
          cycle_id: null,
          cycle_kind: kind,
          cycle_meta: { ...p.meta, label: p.label } as Record<string, unknown>,
          zone_ids_ordered: p.zoneIds,
          zone_minutes: p.zoneMinutes,
          override_season: p.season.override,
          season: p.season.periods,
          // The slots were alike in all of this; the cycle is what they were.
          enabled: m.enabled,
          guards: guardsForSave(m.guards),
          ignore_global_guards: m.ignore_global_guards,
          ...scriptOverrideForSave(m.pre_start_script, "pre_start"),
          ...scriptOverrideForSave(m.post_run_script, "post_run"),
          repetitions: m.cycle_soak.repetitions,
          soak_between_phases_min: m.cycle_soak.soakBetweenPhasesMin,
          soak_between_repetitions_min: m.cycle_soak.soakBetweenRepetitionsMin,
        });
        if (!res.success) {
          this._msg = formatApiError(res.error, this.hass);
          break;
        }
        for (const sid of p.memberIds) {
          await saveSlot(this.hass, this.entryId, { action: "delete", slot_id: sid });
        }
      }
      this._cleanupProposals = null;
      this.onSaved?.();
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  // ---- single-slot editor (custom slots & cycle members) -----------------

  private _parityLabel(parity: WeekParity): string {
    if (parity === "odd") return t(this.hass, "config_panel.week_parity_odd");
    if (parity === "even") return t(this.hass, "config_panel.week_parity_even");
    return t(this.hass, "config_panel.week_parity_every");
  }

  private _cycleBadge(kind: string, meta: CycleMeta | null): string {
    switch (kind) {
      case "daily":
        return t(this.hass, "config_panel.cycle_kind_daily");
      case "twice_daily":
        return t(this.hass, "config_panel.cycle_kind_twice_daily");
      case "weekly":
        return t(this.hass, "config_panel.cycle_kind_weekly");
      case "biweekly":
        return t(this.hass, "config_panel.cycle_kind_biweekly");
      case "n_per_week":
        return t(this.hass, "config_panel.cycle_kind_n_per_week");
      case "every_n_days":
        return meta?.n === 3
          ? t(this.hass, "config_panel.cycle_kind_every_3_days")
          : t(this.hass, "config_panel.cycle_kind_every_2_days");
      default:
        return t(this.hass, "config_panel.cycle_badge_custom");
    }
  }

  private _toggleWeekday(current: number[], day: number): number[] {
    return current.includes(day)
      ? current.filter((d) => d !== day)
      : normalizeWeekdays([...current, day]);
  }

  private _renderWeekdayPicker(selected: number[], onChange: (n: number[]) => void): TemplateResult {
    const presets: Array<{ label: string; days: number[] }> = [
      { label: t(this.hass, "config_panel.schedule_preset_daily"), days: [0, 1, 2, 3, 4, 5, 6] },
      { label: t(this.hass, "config_panel.schedule_preset_workdays"), days: [0, 1, 2, 3, 4] },
      { label: t(this.hass, "config_panel.schedule_preset_weekend"), days: [5, 6] },
    ];
    const same = (a: number[], b: number[]): boolean =>
      a.length === b.length && a.every((v, i) => v === b[i]);
    return html`
      <div class="weekday-presets">
        ${presets.map(
          (p) => html`<button
            type="button"
            class="chip ${same(normalizeWeekdays(selected), normalizeWeekdays(p.days)) ? "selected" : ""}"
            ?disabled=${this._busy}
            @click=${() => onChange(normalizeWeekdays(p.days))}
          >
            ${p.label}
          </button>`
        )}
      </div>
      <div class="weekday-chips" role="group">
        ${WEEKDAY_ORDER.map(
          (i) => html`<button
            type="button"
            class="chip day ${selected.includes(i) ? "selected" : ""}"
            aria-pressed=${selected.includes(i) ? "true" : "false"}
            title=${weekdayLong(this.hass, i)}
            ?disabled=${this._busy}
            @click=${() => onChange(this._toggleWeekday(selected, i))}
          >
            ${weekdayShort(this.hass, i)}
          </button>`
        )}
      </div>
    `;
  }

  private _closeEditDialog(): void {
    this._slotEditDraft = null;
  }

  private async _saveSlotDraft(): Promise<void> {
    const d = this._slotEditDraft;
    if (!d) return;
    if (d.weekdays.length === 0) {
      this._msg = t(this.hass, "config_panel.schedule_err_no_weekdays");
      return;
    }
    if (guardsIncomplete(d.guards)) {
      this._msg = t(this.hass, "config_panel.schedule_err_guards_incomplete");
      return;
    }
    const ok = await this._call({
      action: "update",
      slot_id: d.slot_id,
      weekdays: d.weekdays,
      time_local: d.time_local,
      enabled: d.enabled,
      zone_ids_ordered: d.zone_ids_ordered,
      name: d.name.trim(),
      week_parity: d.week_parity,
      guards: guardsForSave(d.guards),
      ignore_global_guards: d.ignore_global_guards,
      ...scriptOverrideForSave(d.pre_start_script, "pre_start"),
      ...scriptOverrideForSave(d.post_run_script, "post_run"),
      repetitions: d.cycle_soak.repetitions,
      soak_between_phases_min: d.cycle_soak.soakBetweenPhasesMin,
      soak_between_repetitions_min: d.cycle_soak.soakBetweenRepetitionsMin,
      zone_minutes: zoneMinutesForSave(d.zone_minutes, d.zone_ids_ordered),
      override_season: d.season.override,
      season: d.season.periods,
    });
    if (ok) this._closeEditDialog();
  }

  private async _deleteSlotDraft(): Promise<void> {
    const d = this._slotEditDraft;
    if (!d) return;
    if (!confirm(t(this.hass, "config_panel.schedule_confirm_delete_slot"))) return;
    if (await this._call({ action: "delete", slot_id: d.slot_id })) this._closeEditDialog();
  }

  private async _splitSlotDraft(): Promise<void> {
    const d = this._slotEditDraft;
    if (!d || d.weekdays.length <= 1) return;
    if (!confirm(t(this.hass, "config_panel.schedule_confirm_split"))) return;
    if (await this._call({ action: "split", slot_id: d.slot_id })) this._closeEditDialog();
  }

  private _consumeEditSlotQueryFromUrl(): void {
    const slotId = new URLSearchParams(window.location.search).get("editSlot");
    if (!slotId) {
      this._consumedEditSlotKey = null;
      return;
    }
    if (!this.entryId) return;
    const key = `${this.entryId}:${slotId}`;
    if (this._consumedEditSlotKey === key) return;
    const slot = this._slots().find((s) => s.slot_id === slotId);
    const known = Array.isArray(this.installation?.schedule_slots);
    if (slot) {
      this._consumedEditSlotKey = key;
      this._msg = undefined;
      this._addZonePick = "";
      // Expand the parent cycle too, per spec §6.
      if (slot.cycle_id) this._expanded = new Set([...this._expanded, slot.cycle_id]);
      this._slotEditDraft = this._cloneSlot(slot);
      stripEditSlotQueryFromUrl();
      return;
    }
    if (known) {
      this._consumedEditSlotKey = key;
      stripEditSlotQueryFromUrl();
    }
  }

  override updated(changed: PropertyValues): void {
    super.updated(changed);
    this._consumeEditSlotQueryFromUrl();
  }

  // ---- rows ---------------------------------------------------------------

  private _toggleExpand(id: string): void {
    const next = new Set(this._expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this._expanded = next;
  }

  /** "06:00–06:40": when a run starts and, by the active mode's durations, ends. */
  private _timeRange(timeLocal: string, estMin: number): string {
    const start = formatTimeLocalForDisplay(this.hass, timeLocal);
    if (!(estMin > 0)) return start;
    const end = (parseTimeLocalToMinutes(timeLocal) + estMin) % (24 * 60);
    return `${start}–${formatTimeLocalForDisplay(this.hass, minutesToTimeLocal(end))}`;
  }

  /**
   * One slot of a row, with its own edit button. `single`: the row is that one
   * slot -- on a phone its drawer already says and does the same.
   */
  private _renderMemberLine(m: SlotRow, single = false): TemplateResult {
    return html`
      <div class="member-line ${single ? "hide-narrow" : ""}">
        <div class="member-text">
        ${m.week_parity !== "every"
          ? html`<span class="badge badge-primary badge-dot">${this._parityLabel(m.week_parity)}</span>`
          : nothing}
        <span>${weekdaysSummary(this.hass, m.weekdays)}</span>
        <span class="muted">${formatTimeLocalForDisplay(this.hass, m.time_local)}</span>
        ${m.guards.length
          ? html`<span class="muted"
              ><ha-icon icon="mdi:shield-check-outline"></ha-icon>${this._guardBadge(m.guards)}</span
            >`
          : nothing}
        ${m.ignore_global_guards
          ? html`<span class="muted"
              ><ha-icon icon="mdi:shield-off-outline"></ha-icon>${t(
                this.hass,
                "config_panel.schedule_guards_global_off"
              )}</span
            >`
          : nothing}
        ${hasScriptOverride(m.pre_start_script, m.post_run_script)
          ? html`<span class="muted"
              ><ha-icon icon="mdi:script-text-outline"></ha-icon>${t(
                this.hass,
                "config_panel.schedule_scripts_own"
              )}</span
            >`
          : nothing}
        <span class="muted"
          >${m.zone_ids_ordered.length === 1
            ? t(this.hass, "config_panel.schedule_zones_in_order_one")
            : t(this.hass, "config_panel.schedule_zones_in_order_many", {
                n: m.zone_ids_ordered.length,
              })}</span
        >
        </div>
        <button
          type="button"
          class="iconbtn"
          style="width:34px;height:34px"
          aria-label=${t(this.hass, "config_panel.schedule_edit")}
          @click=${() => this._openSlotEdit(m.slot_id)}
        >
          <ha-icon icon="mdi:pencil"></ha-icon>
        </button>
      </div>
    `;
  }

  /** On a phone a row has one button: the chevron that opens the rest. */
  private _renderNarrowChevron(id: string, expanded: boolean): TemplateResult {
    return html`<button
      type="button"
      class="iconbtn only-narrow"
      aria-expanded=${expanded ? "true" : "false"}
      aria-label=${t(this.hass, "config_panel.cycle_expand")}
      @click=${() => this._toggleExpand(id)}
    >
      <ha-icon icon=${expanded ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>
    </button>`;
  }

  /** What a wide row shows beside its name, for a phone: details and the two actions. */
  private _renderNarrowDrawer(
    extras: TemplateResult,
    runDisabled: boolean,
    onRun: () => void,
    onEdit: () => void
  ): TemplateResult {
    return html`<div class="only-narrow">
      <div class="meta-line">${extras}</div>
      <div class="drawer-actions">
        <button type="button" class="btn-outline" ?disabled=${runDisabled} @click=${onRun}>
          <ha-icon icon="mdi:play"></ha-icon>
          ${t(this.hass, "config_panel.schedule_run_now_short")}
        </button>
        <button type="button" class="btn-outline" @click=${onEdit}>
          <ha-icon icon="mdi:pencil"></ha-icon>
          ${t(this.hass, "config_panel.schedule_edit")}
        </button>
      </div>
    </div>`;
  }

  private _renderCycleRow(g: CycleGroup): TemplateResult {
    const allEnabled = g.members.every((m) => m.enabled);
    const anyEnabled = g.members.some((m) => m.enabled);
    const expanded = this._expanded.has(g.cycle_id);
    const zoneIds = g.members[0]?.zone_ids_ordered ?? [];
    const est = this._estimateMin(
      zoneIds,
      g.members[0]?.cycle_soak ?? cycleSoakOf(undefined),
      g.members[0]?.zone_minutes ?? {}
    );
    const phases = this._phaseCount(zoneIds);
    const times = [...new Set(g.members.map((m) => m.time_local))].sort();
    const next = this._nextFire(g.members);
    const label = g.label || this._cycleBadge(g.kind, g.meta);
    const accent = allEnabled ? "" : anyEnabled ? "warn" : "inactive";

    // Merge member weekdays into slot specs for the 14-day strip.
    const specs = g.members.map((m) => ({
      weekdays: m.weekdays,
      time_local: m.time_local,
      week_parity: m.week_parity,
    }));
    const today = new Date();
    const strip = previewStrip(specs, today, today, 14, this._seasonOf(g.members[0]));
    const first = g.members[0];
    // In the row on a wide screen, behind the chevron on a phone.
    const extras = html`
      ${first
        ? html`${this._renderGuardMeta(first.guards, first.ignore_global_guards)}${this._renderScriptMeta(
            first
          )}${this._renderCycleSoakMeta(first)}${this._renderSeasonMeta(first)}${this._renderWaterMeta(
            first
          )}`
        : nothing}
      <span class="meta"
        ><ha-icon icon="mdi:format-list-bulleted"></ha-icon>${t(this.hass, "config_panel.cycle_slots_n", {
          n: g.members.length,
        })}</span
      >
    `;
    const runCycle = (): void => {
      const m = g.members.find((x) => x.enabled) ?? g.members[0];
      this._runSlotNow(m.slot_id);
    };
    const runDisabled =
      this._busy || this._runtimeBusy() || !anyEnabled || zoneIds.length === 0;

    return html`
      <div class="compact-row ${accent}">
        <div class="compact-row-header">
          <ha-switch
            .disabled=${this._busy}
            .checked=${allEnabled}
            @change=${(e: Event) =>
              this._toggleGroupEnabled(
                g,
                Boolean((e.target as HTMLInputElement & { checked: boolean }).checked)
              )}
          ></ha-switch>
          <div class="compact-row-main">
            <div class="compact-row-title">
              <span class="ellipsis">${label}</span>
              <span class="badge badge-primary">${this._cycleBadge(g.kind, g.meta)}</span>
              ${this._renderFixedMinutesBadge(g.members[0])}
              ${this._renderOffSeasonBadge(g.members[0])}
              ${!anyEnabled
                ? html`<span class="badge">${t(this.hass, "config_panel.cycle_paused_n", {
                    n: g.members.length,
                  })}</span>`
                : !allEnabled
                  ? html`<span class="badge badge-warn badge-dot">${t(
                      this.hass,
                      "config_panel.cycle_partly_enabled"
                    )}</span>`
                  : nothing}
            </div>
            <div class="meta-line">
              <span class="meta"
                ><ha-icon icon="mdi:clock-outline"></ha-icon>${times.length === 1
                  ? this._timeRange(times[0], est)
                  : times.map((tl) => formatTimeLocalForDisplay(this.hass, tl)).join(", ")}</span
              >
              <span class="meta"
                ><ha-icon icon="mdi:vector-square"></ha-icon>${t(
                  this.hass,
                  "config_panel.cycle_meta_zones",
                  { z: zoneIds.length, p: phases, m: est }
                )}</span
              >
              <span class="meta-extra hide-narrow">${extras}</span>
              ${next
                ? html`<span class="meta"
                    ><ha-icon icon="mdi:skip-next-outline"></ha-icon>${this._nextLabel(next)}</span
                  >`
                : nothing}
            </div>
          </div>
          ${this._renderNarrowChevron(g.cycle_id, expanded)}
          <div class="icon-group hide-narrow" role="group">
            <button
              type="button"
              title=${t(this.hass, "config_panel.schedule_run_slot_now")}
              aria-label=${t(this.hass, "config_panel.schedule_run_slot_now")}
              ?disabled=${this._busy || this._runtimeBusy() || !anyEnabled || zoneIds.length === 0}
              @click=${() => {
                const m = g.members.find((x) => x.enabled) ?? g.members[0];
                this._runSlotNow(m.slot_id);
              }}
            >
              <ha-icon icon="mdi:play"></ha-icon>
            </button>
            <button
              type="button"
              title=${t(this.hass, "config_panel.cycle_edit_title")}
              aria-label=${t(this.hass, "config_panel.cycle_edit_title")}
              @click=${() => this._openWizardEdit(g)}
            >
              <ha-icon icon="mdi:pencil"></ha-icon>
            </button>
            <button
              type="button"
              class=${expanded ? "selected" : ""}
              aria-expanded=${expanded ? "true" : "false"}
              aria-label=${t(this.hass, "config_panel.cycle_expand")}
              @click=${() => this._toggleExpand(g.cycle_id)}
            >
              <ha-icon icon=${expanded ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>
            </button>
          </div>
        </div>
        ${expanded
          ? html`<div class="compact-row-detail">
              ${this._renderNarrowDrawer(extras, runDisabled, runCycle, () => this._openWizardEdit(g))}
              <div class="detail-caption">${t(this.hass, "config_panel.cycle_preview_title")}</div>
              <div class="day-strip">
                ${strip.map(
                  (d) => html`<div class="day-cell ${d.run ? "run" : ""} ${d.off ? "off" : ""} ${d.isToday ? "today" : ""}">
                    <span class="dc-dow">${weekdayShort(this.hass, mondayBasedWeekday(d.date))}</span>
                    <span class="dc-dom">${d.date.getDate()}</span>
                  </div>`
                )}
              </div>
              ${g.members.map((m) => this._renderMemberLine(m))}
              <div class="detach-line">
                <span>${t(this.hass, "config_panel.cycle_detach_hint")}</span>
                <button type="button" class="btn-outline" style="margin-top:0" ?disabled=${this._busy} @click=${() => this._detachCycle(g)}>
                  ${t(this.hass, "config_panel.cycle_detach")}
                </button>
                <button type="button" class="btn-danger" style="margin-top:0" ?disabled=${this._busy} @click=${() => this._deleteCycle(g)}>
                  ${t(this.hass, "config_panel.cycle_delete")}
                </button>
              </div>
            </div>`
          : nothing}
      </div>
    `;
  }

  private _renderCustomRow(s: SlotRow): TemplateResult {
    const est = this._estimateMin(s.zone_ids_ordered, s.cycle_soak, s.zone_minutes);
    const phases = this._phaseCount(s.zone_ids_ordered);
    const accent = s.enabled ? "" : "inactive";
    const expanded = this._expanded.has(s.slot_id);
    const next = this._nextFire([s]);
    const today = new Date();
    const strip = previewStrip(
      [{ weekdays: s.weekdays, time_local: s.time_local, week_parity: s.week_parity }],
      today,
      today,
      14,
      this._seasonOf(s)
    );
    const extras = html`
      ${this._renderGuardMeta(s.guards, s.ignore_global_guards)} ${this._renderScriptMeta(s)}
      ${this._renderCycleSoakMeta(s)} ${this._renderSeasonMeta(s)} ${this._renderWaterMeta(s)}
    `;
    const runDisabled =
      this._busy || this._runtimeBusy() || !s.enabled || s.zone_ids_ordered.length === 0;
    return html`
      <div class="compact-row ${accent}">
        <div class="compact-row-header">
          <ha-switch
            .disabled=${this._busy}
            .checked=${s.enabled}
            @change=${(e: Event) =>
              this._toggleSlotEnabled(
                s,
                Boolean((e.target as HTMLInputElement & { checked: boolean }).checked)
              )}
          ></ha-switch>
          <div class="compact-row-main">
            <div class="compact-row-title">
              <span class="ellipsis"
                >${s.name ? s.name + " · " : ""}${weekdaysSummary(this.hass, s.weekdays)}
                ${this._timeRange(s.time_local, est)}</span
              >
              ${s.week_parity !== "every"
                ? html`<span class="badge badge-primary badge-dot">${this._parityLabel(s.week_parity)}</span>`
                : nothing}
              ${this._renderFixedMinutesBadge(s)}
              ${this._renderOffSeasonBadge(s)}
            </div>
            <div class="meta-line">
              <span class="meta"
                ><ha-icon icon="mdi:vector-square"></ha-icon>${t(
                  this.hass,
                  "config_panel.cycle_meta_zones",
                  { z: s.zone_ids_ordered.length, p: phases, m: est }
                )}</span
              >
              <span class="meta-extra hide-narrow">${extras}</span>
              ${next
                ? html`<span class="meta"
                    ><ha-icon icon="mdi:skip-next-outline"></ha-icon>${this._nextLabel(next)}</span
                  >`
                : nothing}
            </div>
          </div>
          ${this._renderNarrowChevron(s.slot_id, expanded)}
          <div class="icon-group hide-narrow" role="group">
            <button
              type="button"
              title=${t(this.hass, "config_panel.schedule_run_slot_now")}
              aria-label=${t(this.hass, "config_panel.schedule_run_slot_now")}
              ?disabled=${runDisabled}
              @click=${() => this._runSlotNow(s.slot_id)}
            >
              <ha-icon icon="mdi:play"></ha-icon>
            </button>
            <button
              type="button"
              title=${t(this.hass, "config_panel.schedule_edit")}
              aria-label=${t(this.hass, "config_panel.schedule_edit")}
              @click=${() => this._openSlotEdit(s.slot_id)}
            >
              <ha-icon icon="mdi:pencil"></ha-icon>
            </button>
            <button
              type="button"
              class=${expanded ? "selected" : ""}
              aria-expanded=${expanded ? "true" : "false"}
              aria-label=${t(this.hass, "config_panel.cycle_expand")}
              @click=${() => this._toggleExpand(s.slot_id)}
            >
              <ha-icon icon=${expanded ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>
            </button>
          </div>
        </div>
        ${expanded
          ? html`<div class="compact-row-detail">
              ${this._renderNarrowDrawer(
                extras,
                runDisabled,
                () => this._runSlotNow(s.slot_id),
                () => this._openSlotEdit(s.slot_id)
              )}
              <div class="detail-caption">${t(this.hass, "config_panel.cycle_preview_title")}</div>
              <div class="day-strip">
                ${strip.map(
                  (d) => html`<div class="day-cell ${d.run ? "run" : ""} ${d.off ? "off" : ""} ${d.isToday ? "today" : ""}">
                    <span class="dc-dow">${weekdayShort(this.hass, mondayBasedWeekday(d.date))}</span>
                    <span class="dc-dom">${d.date.getDate()}</span>
                  </div>`
                )}
              </div>
              ${this._renderMemberLine(s, true)}
            </div>`
          : nothing}
      </div>
    `;
  }

  private _addZoneOptionsForDraft(draft: SlotRow): string[] {
    const zones = this._zonesMap();
    if (!zones) return [];
    return orderedZoneIds(this.installation).filter(
      (id) => !draft.zone_ids_ordered.includes(id)
    );
  }

  // ---- slot editor ---------------------------------------------------------

  /** The sections of the slot editor, each with the line it shows when closed. */
  private _slotSections(draft: SlotRow): AccordionSection[] {
    const section = (
      id: string,
      icon: string,
      labelKey: string,
      summary: Summary,
      body: () => unknown
    ): AccordionSection => ({
      id,
      icon,
      label: t(this.hass, labelKey),
      summary: summary.text,
      tone: summary.tone,
      body,
    });
    const watering = draft.zone_ids_ordered.filter((zid) => this._zonesMap()?.[zid]);
    return [
      section(
        "when",
        "mdi:clock-outline",
        "config_panel.acc_when",
        whenSummary(this.hass, draft.weekdays, draft.week_parity, draft.time_local),
        () => this._renderWhenBody(draft)
      ),
      section(
        "zones",
        "mdi:sprinkler-variant",
        "config_panel.acc_zones",
        zonesSummary(
          this.hass,
          watering.map((zid) => this._zoneName(zid)),
          this._estimateMin(draft.zone_ids_ordered, draft.cycle_soak, draft.zone_minutes)
        ),
        () => this._renderZonesBody(draft)
      ),
    ];
  }

  /** What only some schedules need: closed, each says whether it is in use. */
  private _slotOptionSections(draft: SlotRow): AccordionSection[] {
    const section = (
      id: string,
      icon: string,
      labelKey: string,
      summary: Summary,
      body: () => unknown
    ): AccordionSection => ({
      id,
      icon,
      label: t(this.hass, labelKey),
      summary: summary.text,
      tone: summary.tone,
      body,
    });
    return [
      section(
        "conditions",
        "mdi:shield-check-outline",
        "config_panel.guards_section_title",
        guardsSummary(this.hass, draft.guards, draft.ignore_global_guards, this._globalGuards()),
        () => this._renderGuardBody(draft)
      ),
      section(
        "cycle_soak",
        "mdi:repeat",
        "config_panel.cycle_soak_section_title",
        cycleSoakSummary(this.hass, draft.cycle_soak),
        () =>
          renderCycleSoakEditor(
            this.hass,
            draft.cycle_soak,
            this._busy,
            (next) => {
              draft.cycle_soak = next;
              this.requestUpdate();
            },
            true
          )
      ),
      section(
        "season",
        "mdi:calendar-range",
        "config_panel.season_slot_summary",
        slotSeasonSummary(this.hass, draft.season.override, draft.season.periods),
        () =>
          renderSlotSeason(
            this.hass,
            draft.season,
            draft.season_choice,
            this._busy,
            (next, choice) => {
              draft.season = next;
              draft.season_choice = choice;
              this.requestUpdate();
            }
          )
      ),
      section(
        "scripts",
        "mdi:script-text-outline",
        "config_panel.schedule_scripts_section_title",
        slotScriptsSummary(this.hass, draft.pre_start_script, draft.post_run_script),
        () => this._renderScriptBody(draft)
      ),
    ];
  }

  private _renderWhenBody(draft: SlotRow): TemplateResult {
    return html`
      <div class="field-block">
        ${this._renderWeekdayPicker(draft.weekdays, (n) => {
          draft.weekdays = n;
          this.requestUpdate();
        })}
      </div>
      <div class="when-row">
        <input
          type="time"
          aria-label=${t(this.hass, "config_panel.schedule_start_time_title")}
          .value=${draft.time_local}
          @input=${(e: Event) => {
            draft.time_local = (e.target as HTMLInputElement).value;
            this.requestUpdate();
          }}
        />
        <select
          class="field-select"
          aria-label=${t(this.hass, "config_panel.schedule_week_parity_title")}
          @change=${(e: Event) => {
            draft.week_parity = (e.target as HTMLSelectElement).value as WeekParity;
            this.requestUpdate();
          }}
        >
          ${WEEK_PARITIES.map(
            (p) =>
              html`<option value=${p} .selected=${draft.week_parity === p}>
                ${this._parityLabel(p)}
              </option>`
          )}
        </select>
      </div>
    `;
  }

  /**
   * "Runs then and then — but only if x AND y AND z": the slot's own
   * conditions, on top of the installation's unless it opts out of those.
   */
  private _renderGuardBody(draft: SlotRow): TemplateResult {
    const globals = this._globalGuards();
    return html`
      ${renderGuardList(this.hass, GUARD_ENTITY_DOMAINS, draft.guards, (next) => {
        draft.guards = next;
        this.requestUpdate();
      })}
      ${globals.length
        ? html`<div class="switch-row" style="margin-top:12px">
              <ha-switch
                .disabled=${this._busy}
                .checked=${draft.ignore_global_guards}
                @change=${(e: Event) => {
                  draft.ignore_global_guards = Boolean(
                    (e.target as HTMLInputElement & { checked: boolean }).checked
                  );
                  this.requestUpdate();
                }}
              ></ha-switch>
              <span class="switch-row-label"
                >${t(this.hass, "config_panel.schedule_ignore_global_guards")}</span
              >
            </div>
            ${draft.ignore_global_guards
              ? nothing
              : html`<p class="hint">
                  ${t(this.hass, "config_panel.schedule_guards_inherited", {
                    list: globals.map((g) => guardLabel(this.hass, g)).join(", "),
                  })}
                </p>`}`
        : nothing}
      ${renderInlineHelp(
        this.hass,
        "config_panel.guards_help_summary",
        [
          "config_panel.guards_section_desc",
          "config_panel.schedule_ignore_global_guards_hint",
        ],
        "mdi:information-outline"
      )}
    `;
  }

  /**
   * Scripts sit on the slot, not the zone: zones run in parallel phases, so a
   * per-zone script would have no single point in the pipeline to run at. Keep
   * zones that need different preparation in different slots.
   */
  private _renderScriptBody(draft: SlotRow): TemplateResult {
    return html`
      ${renderScriptOverride(
        this.hass,
        SCRIPT_ENTITY_DOMAINS,
        "pre_start",
        draft.pre_start_script,
        this._globalScript("pre_start"),
        this._globalScriptTimeout("pre_start"),
        this._busy,
        (next) => {
          draft.pre_start_script = next;
          this.requestUpdate();
        }
      )}
      ${renderScriptOverride(
        this.hass,
        SCRIPT_ENTITY_DOMAINS,
        "post_run",
        draft.post_run_script,
        this._globalScript("post_run"),
        this._globalScriptTimeout("post_run"),
        this._busy,
        (next) => {
          draft.post_run_script = next;
          this.requestUpdate();
        }
      )}
      ${renderInlineHelp(
        this.hass,
        "config_panel.scripts_help_summary",
        ["config_panel.schedule_scripts_section_desc"],
        "mdi:information-outline"
      )}
    `;
  }

  private _renderZonesBody(draft: SlotRow): TemplateResult {
    const zones = this._zonesMap();
    const addZoneOpts = this._addZoneOptionsForDraft(draft);
    const pmap = phaseIndexByZoneId(
      draft.zone_ids_ordered,
      this._zonesPhaseInput(),
      this._maxParallel()
    );
    const move = (idx: number, by: number): void => {
      const a = draft.zone_ids_ordered;
      const to = idx + by;
      if (to < 0 || to >= a.length) return;
      [a[to], a[idx]] = [a[idx], a[to]];
      this.requestUpdate();
    };
    return html`
      <ul class="zones">
        ${draft.zone_ids_ordered.map((zid, idx) => {
          const pnum = pmap.get(zid);
          const prevP = idx > 0 ? pmap.get(draft.zone_ids_ordered[idx - 1]) : undefined;
          const showPhase = pnum !== undefined && pnum !== prevP;
          const name = this._zoneName(zid);
          return html`
            ${showPhase
              ? html`<li class="phase-sep">
                  <span>${t(this.hass, "config_panel.schedule_phase_n", { n: pnum ?? 0 })}</span>
                </li>`
              : nothing}
            <li>
              <span class="zone-name ellipsis">${name}</span>
              ${renderZoneMinutesInput(
                this.hass,
                name,
                durationForMode(this._zonesMap()?.[zid], this._mode()),
                draft.zone_minutes[zid],
                (minutes) => {
                  if (minutes === undefined) delete draft.zone_minutes[zid];
                  else draft.zone_minutes[zid] = minutes;
                  // The rows are reused by position: without this the
                  // typed number stays in its row when the zones move.
                  this.requestUpdate();
                }
              )}
              <span class="zone-actions">
                <button
                  type="button"
                  class="iconbtn small"
                  ?disabled=${idx === 0}
                  aria-label="${name}: ${t(this.hass, "config_panel.schedule_up")}"
                  title=${t(this.hass, "config_panel.schedule_up")}
                  @click=${() => move(idx, -1)}
                >
                  <ha-icon icon="mdi:arrow-up"></ha-icon>
                </button>
                <button
                  type="button"
                  class="iconbtn small"
                  ?disabled=${idx === draft.zone_ids_ordered.length - 1}
                  aria-label="${name}: ${t(this.hass, "config_panel.schedule_down")}"
                  title=${t(this.hass, "config_panel.schedule_down")}
                  @click=${() => move(idx, 1)}
                >
                  <ha-icon icon="mdi:arrow-down"></ha-icon>
                </button>
                <button
                  type="button"
                  class="iconbtn small danger"
                  aria-label="${name}: ${t(this.hass, "config_panel.schedule_remove")}"
                  title=${t(this.hass, "config_panel.schedule_remove")}
                  @click=${() => {
                    draft.zone_ids_ordered = draft.zone_ids_ordered.filter((x) => x !== zid);
                    this.requestUpdate();
                  }}
                >
                  <ha-icon icon="mdi:close"></ha-icon>
                </button>
              </span>
            </li>
          `;
        })}
      </ul>
      ${addZoneOpts.length
        ? html`<div class="action-row">
            <select
              class="field-select"
              aria-label=${t(this.hass, "config_panel.schedule_choose_zone")}
              @change=${(e: Event) => {
                // Picking a zone adds it: no second button to find.
                const select = e.target as HTMLSelectElement;
                const zid = select.value;
                if (zid && !draft.zone_ids_ordered.includes(zid)) {
                  draft.zone_ids_ordered = [...draft.zone_ids_ordered, zid];
                }
                select.value = "";
                this.requestUpdate();
              }}
            >
              <option value="">${t(this.hass, "config_panel.schedule_add_zone")}</option>
              ${addZoneOpts.map((id) => html`<option value=${id}>${this._zoneName(id)}</option>`)}
            </select>
          </div>`
        : zones && Object.keys(zones).length > 0
          ? nothing
          : html`<p class="hint">${t(this.hass, "config_panel.schedule_create_zones_first")}</p>`}
    `;
  }

  private _renderEditDialog(draft: SlotRow): TemplateResult {
    const toggle = (id: string | null): void => {
      this._openSection = id;
    };
    return html`
      <div class="acc-lead">
        <ha-input
          .label=${t(this.hass, "config_panel.schedule_name_optional_title")}
          .value=${draft.name}
          @input=${(e: Event) => {
            draft.name = (e.target as HTMLInputElement).value;
          }}
        ></ha-input>
        <ha-switch
          aria-label=${t(this.hass, "config_panel.schedule_slot_enabled")}
          title=${t(this.hass, "config_panel.schedule_slot_enabled")}
          .disabled=${this._busy}
          .checked=${draft.enabled}
          @change=${(e: Event) => {
            draft.enabled = Boolean((e.target as HTMLInputElement & { checked: boolean }).checked);
            this.requestUpdate();
          }}
        ></ha-switch>
      </div>
      ${renderAccordion(this._slotSections(draft), this._openSection, toggle)}
      ${renderAccordionGroup(t(this.hass, "config_panel.acc_more_options"))}
      ${renderAccordion(this._slotOptionSections(draft), this._openSection, toggle)}
    `;
  }

  protected render() {
    const { groups, custom } = this._groupsAndCustom();
    const draft = this._slotEditDraft;
    const hasAny = groups.length > 0 || custom.length > 0;
    const cleanupCandidates = this._analyzeCleanup().length;

    return html`
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:format-list-bulleted-type"></ha-icon>
          ${t(this.hass, "config_panel.cycle_card_title")}
          <div class="header-actions">
            ${cleanupCandidates > 0
              ? html`<button type="button" class="btn-outline hide-narrow" @click=${() => this._openCleanup()}>
                  ${t(this.hass, "config_panel.cycle_cleanup")}
                </button>`
              : nothing}
            <button type="button" class="btn hide-narrow" @click=${() => this._openWizardNew()}>
              ${t(this.hass, "config_panel.cycle_new")}
            </button>
          </div>
        </div>
        <div class="card-content">
          ${this._msg ? html`<div class="error">${this._msg}</div>` : nothing}

          ${!hasAny
            ? html`<div class="empty-state">
                <ha-icon icon="mdi:calendar-clock"></ha-icon>
                <p>${t(this.hass, "config_panel.schedule_empty")}</p>
                <button type="button" class="btn" @click=${() => this._openWizardNew()}>
                  ${t(this.hass, "config_panel.cycle_new")}
                </button>
              </div>`
            : html`
                ${this._renderInstallationOffSeason()}
                ${groups.map((g) => this._renderCycleRow(g))}
                ${custom.map((s) => this._renderCustomRow(s))}
              `}
        </div>
      </ha-card>

      <button
        type="button"
        class="fab"
        aria-label=${t(this.hass, "config_panel.cycle_new")}
        title=${t(this.hass, "config_panel.cycle_new")}
        @click=${() => this._openWizardNew()}
      >
        <ha-icon icon="mdi:plus"></ha-icon>
      </button>

      <si-cycle-wizard
        .hass=${this.hass}
        .entryId=${this.entryId}
        .installation=${this.installation}
        .onSaved=${(rid: string) => {
          if (rid) this._expanded = new Set([...this._expanded, rid]);
          this.onSaved?.();
        }}
      ></si-cycle-wizard>

      <ha-dialog
        .open=${draft !== null}
        header-title=${draft
          ? draft.name || t(this.hass, "config_panel.schedule_edit")
          : ""}
        @closed=${() => this._closeEditDialog()}
      >
        ${draft ? this._renderEditDialog(draft) : nothing}
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead">
              ${draft
                ? html`<details class="more-menu">
                    <summary
                      aria-label=${t(this.hass, "config_panel.general_more")}
                      title=${t(this.hass, "config_panel.general_more")}
                    >
                      <ha-icon icon="mdi:dots-vertical"></ha-icon>
                    </summary>
                    <div class="more-pop">
                      ${draft.weekdays.length > 1
                        ? html`<button type="button" ?disabled=${this._busy} @click=${() => this._splitSlotDraft()}>
                            <ha-icon icon="mdi:call-split"></ha-icon>
                            ${t(this.hass, "config_panel.schedule_split_slot")}
                          </button>`
                        : nothing}
                      <button type="button" class="danger" ?disabled=${this._busy} @click=${() => this._deleteSlotDraft()}>
                        <ha-icon icon="mdi:trash-can-outline"></ha-icon>
                        ${t(this.hass, "config_panel.schedule_delete_slot")}
                      </button>
                    </div>
                  </details>`
                : nothing}
            </div>
            <div class="dialog-footer-actions">
              <button type="button" class="btn-outline" @click=${() => this._closeEditDialog()} ?disabled=${this._busy}>
                ${t(this.hass, "config_panel.zones_cancel")}
              </button>
              <button type="button" class="btn" ?disabled=${this._busy || !draft} @click=${() => this._saveSlotDraft()}>
                ${this._busy ? t(this.hass, "config_panel.schedule_saving") : t(this.hass, "config_panel.schedule_save_slot")}
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>

      <ha-dialog
        .open=${this._cleanupProposals !== null}
        header-title=${t(this.hass, "config_panel.cycle_cleanup")}
        @closed=${() => (this._cleanupProposals = null)}
      >
        <p class="hint">${t(this.hass, "config_panel.cycle_cleanup_desc")}</p>
        ${(this._cleanupProposals ?? []).map(
          (p) => html`<div class="compact-row" style="margin-top:8px">
            <div class="compact-row-header">
              <div class="compact-row-main">
                <div class="compact-row-title">
                  <span>${p.label || this._cycleBadge(p.optionId === "every_2_days" ? "every_n_days" : p.optionId, p.meta)}</span>
                  <span class="badge badge-primary">${t(this.hass, "config_panel.cycle_cleanup_merge_n", {
                    n: p.memberIds.length,
                  })}</span>
                </div>
              </div>
            </div>
          </div>`
        )}
        ${(this._cleanupProposals ?? []).length === 0
          ? html`<p class="muted">${t(this.hass, "config_panel.cycle_cleanup_none")}</p>`
          : nothing}
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead"></div>
            <div class="dialog-footer-actions">
              <button type="button" class="btn-outline" @click=${() => (this._cleanupProposals = null)} ?disabled=${this._busy}>
                ${t(this.hass, "config_panel.zones_cancel")}
              </button>
              <button
                type="button"
                class="btn"
                ?disabled=${this._busy || (this._cleanupProposals ?? []).length === 0}
                @click=${() => this._applyCleanup()}
              >
                ${t(this.hass, "config_panel.cycle_cleanup_confirm")}
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>
    `;
  }
}

defineCustomElementOnce("si-view-schedule", ViewSchedule);
