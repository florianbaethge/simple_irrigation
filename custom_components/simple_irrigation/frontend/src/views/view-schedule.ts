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
import { durationForMode } from "../timetable-model";
import { renderCycleSoakEditor } from "../cycle-soak-editor";
import {
  mondayBasedWeekday,
  previewStrip,
  weekParityMatches,
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
  onSaved?: () => void;

  static styles = [
    sharedStyles,
    formLayoutStyles,
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
        gap: 8px 12px;
        flex-wrap: wrap;
        padding: 8px 0;
        border-top: 1px solid var(--divider-color);
        font-size: 0.85rem;
      }
      .member-line:first-of-type {
        border-top: none;
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
      .zone-actions {
        display: flex;
        gap: 6px;
        margin-left: auto;
      }
      .zone-actions .btn-outline {
        margin-top: 0;
        padding: 5px 10px;
        font-size: 0.8rem;
      }
      .weekday-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
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
      .drawer-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-top: 12px;
      }
      .drawer-actions .btn-outline {
        width: 100%;
        min-height: 46px;
        margin-top: 0;
      }
    `,
  ];

  @state() private _busy = false;
  @state() private _msg?: string;
  @state() private _expanded = new Set<string>();
  @state() private _slotEditDraft: SlotRow | null = null;
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
      };
    });
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

  private _estimateMin(zoneIds: string[], cs: CycleSoak): number {
    const zones = this._zonesMap();
    if (!zones) return 0;
    const phases = computePhases(zoneIds, this._zonesPhaseInput(), this._maxParallel(), true);
    const preStart = Math.max(0, Number(this.installation?.pre_start_delay_sec ?? 10)) / 60;
    const mode = this._mode();
    const minutes = programMinutes(phases, cs, (zid) => {
      const z = zones[zid];
      return z && Boolean(z.enabled ?? true) ? durationForMode(z, mode) : 0;
    });
    return Math.round(preStart + minutes);
  }

  private _phaseCount(zoneIds: string[]): number {
    return computePhases(zoneIds, this._zonesPhaseInput(), this._maxParallel(), true).length;
  }

  private _nextFire(members: SlotRow[]): Date | null {
    const now = new Date();
    for (let i = 0; i < 21; i++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const wd = mondayBasedWeekday(day);
      for (const m of members) {
        if (!m.enabled) continue;
        if (!m.weekdays.includes(wd)) continue;
        if (!weekParityMatches(day, m.week_parity)) continue;
        const [h, mi] = m.time_local.split(":").map(Number);
        const cand = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h || 0, mi || 0);
        if (cand > now) return cand;
      }
    }
    return null;
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

  private _openWizardEdit(g: CycleGroup): void {
    this._msg = undefined;
    const slots = (this.installation?.schedule_slots as Array<Record<string, unknown>>).filter(
      (s) => String(s.cycle_id ?? "") === g.cycle_id
    );
    this._wizard?.start({ seedFromSlots: slots, step: 1 });
  }

  // ---- cleanup ------------------------------------------------------------

  /** Detect ungrouped slots with matching time+zones that form a known cadence. */
  private _analyzeCleanup(): CleanupProposal[] {
    const { custom } = this._groupsAndCustom();
    const buckets = new Map<string, SlotRow[]>();
    for (const s of custom) {
      const key = `${s.time_local}||${s.zone_ids_ordered.join(",")}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(s);
    }
    const proposals: CleanupProposal[] = [];
    for (const list of buckets.values()) {
      if (list.length < 2) continue;
      const parities = new Set(list.map((s) => s.week_parity));
      const time = list[0].time_local;
      const zoneIds = list[0].zone_ids_ordered;
      const memberIds = list.map((s) => s.slot_id);

      if (parities.size === 1 && parities.has("every")) {
        // Merge weekday union into a single every-week cycle.
        const union = normalizeWeekdays(list.flatMap((s) => s.weekdays));
        const optionId = union.length === 7 ? "daily" : union.length === 1 ? "weekly" : "n_per_week";
        const meta: CycleMeta = { times: [time] };
        if (optionId === "weekly") meta.anchor_weekday = union[0];
        else if (optionId === "n_per_week") meta.week_days = union;
        proposals.push({ optionId, meta, zoneIds, memberIds, label: list[0].name });
      } else if (
        list.length === 2 &&
        parities.has("odd") &&
        parities.has("even")
      ) {
        // Complementary parity pair → every-2-days.
        proposals.push({
          optionId: "every_2_days",
          meta: { times: [time], n: 2, anchor_weekday: normalizeWeekdays(list[0].weekdays)[0] ?? 0 },
          zoneIds,
          memberIds,
          label: list[0].name,
        });
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
        const res = await upsertCycle(this.hass, this.entryId, {
          cycle_id: null,
          cycle_kind: kind,
          cycle_meta: p.meta as Record<string, unknown>,
          zone_ids_ordered: p.zoneIds,
          enabled: true,
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

  private _renderMemberLine(m: SlotRow): TemplateResult {
    return html`
      <div class="member-line">
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
        <button
          type="button"
          class="iconbtn"
          style="margin-left:auto;width:34px;height:34px"
          aria-label=${t(this.hass, "config_panel.schedule_edit")}
          @click=${() => {
            this._addZonePick = "";
            this._slotEditDraft = this._cloneSlot(m);
          }}
        >
          <ha-icon icon="mdi:pencil"></ha-icon>
        </button>
      </div>
    `;
  }

  private _renderCycleRow(g: CycleGroup): TemplateResult {
    const allEnabled = g.members.every((m) => m.enabled);
    const anyEnabled = g.members.some((m) => m.enabled);
    const expanded = this._expanded.has(g.cycle_id);
    const zoneIds = g.members[0]?.zone_ids_ordered ?? [];
    const est = this._estimateMin(zoneIds, g.members[0]?.cycle_soak ?? cycleSoakOf(undefined));
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
    const strip = previewStrip(specs, today, today, 14);

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
                ><ha-icon icon="mdi:clock-outline"></ha-icon>${times
                  .map((tl) => formatTimeLocalForDisplay(this.hass, tl))
                  .join(", ")}</span
              >
              <span class="meta"
                ><ha-icon icon="mdi:vector-square"></ha-icon>${t(
                  this.hass,
                  "config_panel.cycle_meta_zones",
                  { z: zoneIds.length, p: phases, m: est }
                )}</span
              >
              ${g.members[0]
                ? html`${this._renderGuardMeta(
                    g.members[0].guards,
                    g.members[0].ignore_global_guards
                  )}${this._renderScriptMeta(g.members[0])}${this._renderCycleSoakMeta(
                    g.members[0]
                  )}`
                : nothing}
              ${next
                ? html`<span class="meta"
                    ><ha-icon icon="mdi:skip-next-outline"></ha-icon>${weekdayShort(
                      this.hass,
                      mondayBasedWeekday(next)
                    )}
                    ${formatTimeLocalForDisplay(this.hass, `${next.getHours()}:${String(next.getMinutes()).padStart(2, "0")}`)}</span
                  >`
                : nothing}
              <span class="meta"
                ><ha-icon icon="mdi:format-list-bulleted"></ha-icon>${t(
                  this.hass,
                  "config_panel.cycle_slots_n",
                  { n: g.members.length }
                )}</span
              >
            </div>
          </div>
          <div class="icon-group" role="group">
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
              <div class="day-strip" style="margin-top:10px">
                ${strip.map(
                  (d) => html`<div class="day-cell ${d.run ? "run" : ""} ${d.isToday ? "today" : ""}">
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
    const est = this._estimateMin(s.zone_ids_ordered, s.cycle_soak);
    const phases = this._phaseCount(s.zone_ids_ordered);
    const accent = s.enabled ? "" : "inactive";
    const expanded = this._expanded.has(s.slot_id);
    const next = this._nextFire([s]);
    const today = new Date();
    const strip = previewStrip(
      [{ weekdays: s.weekdays, time_local: s.time_local, week_parity: s.week_parity }],
      today,
      today,
      14
    );
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
                ${formatTimeLocalForDisplay(this.hass, s.time_local)}</span
              >
              ${s.week_parity !== "every"
                ? html`<span class="badge badge-primary badge-dot">${this._parityLabel(s.week_parity)}</span>`
                : nothing}
            </div>
            <div class="meta-line">
              <span class="meta"
                ><ha-icon icon="mdi:vector-square"></ha-icon>${t(
                  this.hass,
                  "config_panel.cycle_meta_zones",
                  { z: s.zone_ids_ordered.length, p: phases, m: est }
                )}</span
              >
              ${this._renderGuardMeta(s.guards, s.ignore_global_guards)}
              ${this._renderScriptMeta(s)}
              ${this._renderCycleSoakMeta(s)}
              ${next
                ? html`<span class="meta"
                    ><ha-icon icon="mdi:skip-next-outline"></ha-icon>${weekdayShort(
                      this.hass,
                      mondayBasedWeekday(next)
                    )}
                    ${formatTimeLocalForDisplay(this.hass, `${next.getHours()}:${String(next.getMinutes()).padStart(2, "0")}`)}</span
                  >`
                : nothing}
            </div>
          </div>
          <div class="icon-group" role="group">
            <button
              type="button"
              title=${t(this.hass, "config_panel.schedule_run_slot_now")}
              aria-label=${t(this.hass, "config_panel.schedule_run_slot_now")}
              ?disabled=${this._busy || this._runtimeBusy() || !s.enabled || s.zone_ids_ordered.length === 0}
              @click=${() => this._runSlotNow(s.slot_id)}
            >
              <ha-icon icon="mdi:play"></ha-icon>
            </button>
            <button
              type="button"
              title=${t(this.hass, "config_panel.schedule_edit")}
              aria-label=${t(this.hass, "config_panel.schedule_edit")}
              @click=${() => {
                this._addZonePick = "";
                this._slotEditDraft = this._cloneSlot(s);
              }}
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
              <div class="day-strip" style="margin-top:10px">
                ${strip.map(
                  (d) => html`<div class="day-cell ${d.run ? "run" : ""} ${d.isToday ? "today" : ""}">
                    <span class="dc-dow">${weekdayShort(this.hass, mondayBasedWeekday(d.date))}</span>
                    <span class="dc-dom">${d.date.getDate()}</span>
                  </div>`
                )}
              </div>
              ${this._renderMemberLine(s)}
            </div>`
          : nothing}
      </div>
    `;
  }

  private _addZoneOptionsForDraft(draft: SlotRow): string[] {
    const zones = this._zonesMap();
    if (!zones) return [];
    return Object.keys(zones).filter((id) => !draft.zone_ids_ordered.includes(id));
  }

  /**
   * "Runs then and then — but only if x AND y AND z", so this sits below the
   * timing fields rather than above them.
   */
  private _renderGuardSection(draft: SlotRow): TemplateResult {
    const globals = this._globalGuards();
    return html`
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.guards_section_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.guards_section_desc")}</p>
        ${renderGuardList(this.hass, GUARD_ENTITY_DOMAINS, draft.guards, (next) => {
          draft.guards = next;
          this.requestUpdate();
        })}
        <div class="switch-row">
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
        <p class="hint">${t(this.hass, "config_panel.schedule_ignore_global_guards_hint")}</p>
        ${globals.length && !draft.ignore_global_guards
          ? html`<p class="hint">
              ${t(this.hass, "config_panel.schedule_guards_inherited", {
                list: globals.map((g) => guardLabel(this.hass, g)).join(", "),
              })}
            </p>`
          : nothing}
      </div>
    `;
  }

  /**
   * Scripts sit on the slot, not the zone: zones run in parallel phases, so a
   * per-zone script would have no single point in the pipeline to run at. Keep
   * zones that need different preparation in different slots.
   */
  private _renderScriptSection(draft: SlotRow): TemplateResult {
    return html`
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.schedule_scripts_section_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.schedule_scripts_section_desc")}</p>
      </div>
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
    `;
  }

  private _renderEditDialog(draft: SlotRow): TemplateResult {
    const zones = this._zonesMap();
    const addZoneOpts = this._addZoneOptionsForDraft(draft);
    return html`
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.schedule_name_optional_title")}</span>
        <div class="field-row">
          <ha-input
            .value=${draft.name}
            @input=${(e: Event) => {
              draft.name = (e.target as HTMLInputElement).value;
            }}
          ></ha-input>
        </div>
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.schedule_weekdays_title")}</span>
        ${this._renderWeekdayPicker(draft.weekdays, (n) => {
          draft.weekdays = n;
          this.requestUpdate();
        })}
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.schedule_week_parity_title")}</span>
        <select
          class="field-select"
          @change=${(e: Event) => {
            draft.week_parity = (e.target as HTMLSelectElement).value as WeekParity;
            this.requestUpdate();
          }}
        >
          ${WEEK_PARITIES.map(
            (p) => html`<option value=${p} ?selected=${draft.week_parity === p}>${this._parityLabel(p)}</option>`
          )}
        </select>
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.schedule_start_time_title")}</span>
        <div class="field-row">
          <input
            type="time"
            .value=${draft.time_local}
            @input=${(e: Event) => {
              draft.time_local = (e.target as HTMLInputElement).value;
            }}
          />
        </div>
      </div>
      ${this._renderGuardSection(draft)}
      ${this._renderScriptSection(draft)}
      <div class="field-block">
        <div class="switch-row">
          <ha-switch
            .disabled=${this._busy}
            .checked=${draft.enabled}
            @change=${(e: Event) => {
              draft.enabled = Boolean((e.target as HTMLInputElement & { checked: boolean }).checked);
              this.requestUpdate();
            }}
          ></ha-switch>
          <span class="switch-row-label">${t(this.hass, "config_panel.schedule_slot_enabled")}</span>
        </div>
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.schedule_run_order_title")}</span>
        <ul class="zones">
          ${(() => {
            const pmap = phaseIndexByZoneId(draft.zone_ids_ordered, this._zonesPhaseInput(), this._maxParallel());
            return draft.zone_ids_ordered.map((zid, idx) => {
              const pnum = pmap.get(zid);
              const prevP = idx > 0 ? pmap.get(draft.zone_ids_ordered[idx - 1]) : undefined;
              const showPhase = pnum !== undefined && pnum !== prevP;
              return html`
                ${showPhase
                  ? html`<li class="phase-sep"><span>${t(this.hass, "config_panel.schedule_phase_n", { n: pnum ?? 0 })}</span></li>`
                  : nothing}
                <li>
                  <span>${idx + 1}. ${this._zoneName(zid)}</span>
                  <span class="zone-actions">
                    <button type="button" class="btn-outline" @click=${() => {
                      if (idx > 0) {
                        const a = draft.zone_ids_ordered;
                        [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
                        this.requestUpdate();
                      }
                    }}>${t(this.hass, "config_panel.schedule_up")}</button>
                    <button type="button" class="btn-outline" @click=${() => {
                      const a = draft.zone_ids_ordered;
                      if (idx < a.length - 1) {
                        [a[idx + 1], a[idx]] = [a[idx], a[idx + 1]];
                        this.requestUpdate();
                      }
                    }}>${t(this.hass, "config_panel.schedule_down")}</button>
                    <button type="button" class="btn-outline" @click=${() => {
                      draft.zone_ids_ordered = draft.zone_ids_ordered.filter((x) => x !== zid);
                      this.requestUpdate();
                    }}>${t(this.hass, "config_panel.schedule_remove")}</button>
                  </span>
                </li>
              `;
            });
          })()}
        </ul>
        ${addZoneOpts.length
          ? html`<div class="action-row">
              <select class="field-select" .value=${this._addZonePick} @change=${(e: Event) => {
                this._addZonePick = (e.target as HTMLSelectElement).value;
              }}>
                <option value="">${t(this.hass, "config_panel.schedule_choose_zone")}</option>
                ${addZoneOpts.map((id) => html`<option value=${id}>${this._zoneName(id)}</option>`)}
              </select>
              <button type="button" class="btn-outline" ?disabled=${!this._addZonePick} @click=${() => {
                if (this._addZonePick && !draft.zone_ids_ordered.includes(this._addZonePick)) {
                  draft.zone_ids_ordered = [...draft.zone_ids_ordered, this._addZonePick];
                  this._addZonePick = "";
                  this.requestUpdate();
                }
              }}>${t(this.hass, "config_panel.schedule_add_to_list")}</button>
            </div>`
          : zones && Object.keys(zones).length > 0
            ? html`<p class="hint">${t(this.hass, "config_panel.schedule_all_zones_in_slot")}</p>`
            : html`<p class="hint">${t(this.hass, "config_panel.schedule_create_zones_first")}</p>`}
      </div>
      ${renderCycleSoakEditor(this.hass, draft.cycle_soak, this._busy, (next) => {
        draft.cycle_soak = next;
        this.requestUpdate();
      })}
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
        header-title=${draft ? t(this.hass, "config_panel.schedule_edit") : ""}
        @closed=${() => this._closeEditDialog()}
      >
        ${draft ? this._renderEditDialog(draft) : nothing}
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead">
              ${draft
                ? html`
                    <button type="button" class="btn-danger" ?disabled=${this._busy} @click=${() => this._deleteSlotDraft()}>
                      ${t(this.hass, "config_panel.schedule_delete_slot")}
                    </button>
                    ${draft.weekdays.length > 1
                      ? html`<button type="button" class="btn-outline" ?disabled=${this._busy} @click=${() => this._splitSlotDraft()}>
                          ${t(this.hass, "config_panel.schedule_split_slot")}
                        </button>`
                      : nothing}
                  `
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
