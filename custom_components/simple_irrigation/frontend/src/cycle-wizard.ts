import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { upsertCycle } from "./data/api";
import {
  GUARD_ENTITY_DOMAINS,
  guardsForSave,
  guardsIncomplete,
  guardsSummary,
  normalizeGuards,
  renderGuardList,
  type Guard,
} from "./guard-list-editor";
import {
  EMPTY_SCRIPT_OVERRIDE,
  SCRIPT_ENTITY_DOMAINS,
  normalizeScriptOverride,
  renderScriptOverride,
  scriptOverrideForSave,
  type ScriptOverride,
} from "./script-override";
import { defineCustomElementOnce, formatApiError } from "./helpers";
import { t } from "./i18n";
import { formLayoutStyles } from "./form-layout-styles";
import { sharedStyles } from "./shared-styles";
import { weekdayLong, weekdayShort, formatTimeLocalForDisplay } from "./date-format";
import {
  anchorWeekParity,
  firstRunDate,
  generateCycleSlots,
  mondayBasedWeekday,
  previewGaps,
  previewStrip,
  cycleIsExact,
  type CycleKind,
  type CycleMeta,
  type CycleSlotSpec,
} from "./cycle";
import {
  computePhases,
  cycleSoakOf,
  phaseIndexByZoneId,
  programMinutes,
  PLAIN_RUN,
  type CycleSoak,
  type ZonePhaseInput,
} from "./schedule-phases";
import { renderCycleSoakEditor } from "./cycle-soak-editor";
import { durationForMode, parseTimeLocalToMinutes, minutesToTimeLocal } from "./timetable-model";
import { formatDateTimeForDisplay } from "./date-format";
import type { HomeAssistant } from "./types";

interface KindOption {
  id: string;
  kind: CycleKind;
  n?: number;
  multiAnchor: boolean;
  twoTimes: boolean;
}

const KIND_OPTIONS: KindOption[] = [
  { id: "daily", kind: "daily", multiAnchor: false, twoTimes: false },
  { id: "every_2_days", kind: "every_n_days", n: 2, multiAnchor: false, twoTimes: false },
  { id: "every_3_days", kind: "every_n_days", n: 3, multiAnchor: false, twoTimes: false },
  { id: "n_per_week", kind: "n_per_week", multiAnchor: true, twoTimes: false },
  { id: "weekly", kind: "weekly", multiAnchor: false, twoTimes: false },
  { id: "biweekly", kind: "biweekly", multiAnchor: false, twoTimes: false },
  { id: "custom", kind: "custom", multiAnchor: true, twoTimes: false },
];

const TIME_PRESETS: Array<{ key: string; time: string }> = [
  { key: "config_panel.cycle_time_preset_early", time: "05:30" },
  { key: "config_panel.cycle_time_preset_morning", time: "08:15" },
  { key: "config_panel.cycle_time_preset_evening", time: "19:00" },
  { key: "config_panel.cycle_time_preset_late", time: "21:00" },
];

export class CycleWizard extends LitElement {
  static properties = {
    hass: { attribute: false },
    entryId: { type: String },
    installation: { type: Object },
    open: { type: Boolean },
    onClose: { attribute: false },
    onSaved: { attribute: false },
  };

  hass!: HomeAssistant;
  entryId!: string;
  installation!: Record<string, unknown>;
  open = false;
  onClose?: () => void;
  onSaved?: (cycleId: string) => void;

  static styles = [
    sharedStyles,
    formLayoutStyles,
    css`
      .progress {
        display: flex;
        gap: 6px;
        margin: 0 0 18px;
      }
      .progress .step {
        flex: 1;
        height: 4px;
        border-radius: 2px;
        background: var(--divider-color);
      }
      .progress .step.done {
        background: var(--primary-color);
      }
      .kind-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      @container siview (max-width: 700px) {
        .kind-grid {
          grid-template-columns: 1fr;
        }
      }
      .kind-card {
        text-align: left;
        border: 1px solid var(--divider-color);
        border-radius: 12px;
        padding: 12px 14px;
        background: var(--card-background-color);
        cursor: pointer;
        font: inherit;
        color: var(--primary-text-color);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .kind-card:hover {
        border-color: var(--primary-color);
      }
      .kind-card.selected {
        border-color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 8%, var(--card-background-color));
      }
      .kind-card-title {
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: space-between;
      }
      .kind-card-desc {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        line-height: 1.4;
      }
      .weekday-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 4px 0 8px;
      }
      .weekday-chips .chip.day {
        min-width: 44px;
        min-height: 40px;
        text-align: center;
        justify-content: center;
      }
      .time-fields {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .time-fields input[type="time"] {
        width: auto;
        min-width: 120px;
      }
      .zone-pick {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        margin-bottom: 6px;
      }
      .zone-pick input[type="checkbox"] {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }
      .zone-pick-main {
        flex: 1;
        min-width: 0;
      }
      .zone-pick-name {
        font-weight: 500;
      }
      .summary-card {
        border: 1px solid var(--divider-color);
        border-radius: 10px;
        padding: 12px 14px;
        margin-top: 8px;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
        font-size: 0.9rem;
      }
      .preview-line {
        font-size: 0.85rem;
        color: var(--secondary-text-color);
        margin: 6px 0;
        line-height: 1.5;
      }
    `,
  ];

  @state() private _step = 1;
  @state() private _optionId = "daily";
  @state() private _times: string[] = ["19:00", "06:00"];
  @state() private _anchor = 0;
  @state() private _weekDays: number[] = [0, 3];
  @state() private _zoneIds: string[] = [];
  @state() private _enabled = true;
  @state() private _label = "";
  @state() private _guards: Guard[] = [];
  @state() private _ignoreGlobalGuards = false;
  @state() private _preStartScript: ScriptOverride = EMPTY_SCRIPT_OVERRIDE;
  @state() private _postRunScript: ScriptOverride = EMPTY_SCRIPT_OVERRIDE;
  @state() private _cycleSoak: CycleSoak = PLAIN_RUN;
  @state() private _cycleId: string | null = null;
  @state() private _busy = false;
  @state() private _msg?: string;
  private _seeded = false;

  /** Open the wizard, optionally prefilled at a given step / from an existing cycle. */
  start(opts?: {
    optionId?: string;
    step?: number;
    cycleId?: string | null;
    seedFromSlots?: Array<Record<string, unknown>>;
  }): void {
    this._msg = undefined;
    this._busy = false;
    this._seeded = true;
    if (opts?.seedFromSlots && opts.seedFromSlots.length) {
      this._seedFromSlots(opts.seedFromSlots);
    } else {
      this._optionId = opts?.optionId ?? "daily";
      this._cycleId = opts?.cycleId ?? null;
      this._zoneIds = this._defaultZoneIds();
      this._enabled = true;
      this._label = "";
      this._guards = [];
      this._ignoreGlobalGuards = false;
      this._preStartScript = { ...EMPTY_SCRIPT_OVERRIDE };
      this._postRunScript = { ...EMPTY_SCRIPT_OVERRIDE };
      this._cycleSoak = { ...PLAIN_RUN };
      this._syncDefaultsForOption();
    }
    this._step = opts?.step ?? 1;
    this.open = true;
    this.requestUpdate();
  }

  private _seedFromSlots(slots: Array<Record<string, unknown>>): void {
    const first = slots[0];
    this._cycleId = String(first.cycle_id ?? "") || null;
    const meta = (first.cycle_meta as CycleMeta) ?? {};
    const kind = String(first.cycle_kind ?? "custom");
    this._optionId =
      kind === "every_n_days"
        ? meta.n === 3
          ? "every_3_days"
          : "every_2_days"
        : kind;
    this._label = String(meta.label ?? first.name ?? "");
    const times = slots.map((s) => String(s.time_local ?? "06:00"));
    this._times = [times[0] ?? "19:00", times[1] ?? "06:00"];
    this._anchor = Number(meta.anchor_weekday ?? 0);
    this._weekDays =
      Array.isArray(meta.week_days) && meta.week_days.length
        ? [...(meta.week_days as number[])]
        : (first.weekdays as number[]) ?? [0];
    this._zoneIds = Array.isArray(first.zone_ids_ordered)
      ? [...(first.zone_ids_ordered as string[])]
      : this._defaultZoneIds();
    this._enabled = Boolean(first.enabled ?? true);
    this._guards = normalizeGuards(first.guards);
    this._ignoreGlobalGuards = Boolean(first.ignore_global_guards ?? false);
    // All members of a cycle share their scripts, so the first one speaks for all.
    this._preStartScript = normalizeScriptOverride(first, "pre_start");
    this._postRunScript = normalizeScriptOverride(first, "post_run");
    this._cycleSoak = cycleSoakOf(first);
  }

  private _option(): KindOption {
    return KIND_OPTIONS.find((o) => o.id === this._optionId) ?? KIND_OPTIONS[0];
  }

  private _syncDefaultsForOption(): void {
    const opt = this._option();
    if (opt.multiAnchor && this._weekDays.length === 0) this._weekDays = [0, 3];
  }

  private _defaultZoneIds(): string[] {
    const zones = this.installation?.zones as Record<string, Record<string, unknown>> | undefined;
    if (!zones) return [];
    return Object.entries(zones)
      .filter(([, z]) => Boolean(z.enabled ?? true))
      .map(([id]) => id);
  }

  private _meta(): CycleMeta {
    const opt = this._option();
    const meta: CycleMeta = { label: this._label.trim(), times: this._times.slice(0, opt.twoTimes ? 2 : 1) };
    if (opt.n) meta.n = opt.n;
    if (opt.multiAnchor) meta.week_days = [...this._weekDays].sort((a, b) => a - b);
    else meta.anchor_weekday = this._anchor;
    return meta;
  }

  private _slots(): CycleSlotSpec[] {
    const opt = this._option();
    const p0 = anchorWeekParity(this._anchor, new Date());
    return generateCycleSlots(opt.kind, this._meta(), p0);
  }

  private _mode(): string {
    return String(this.installation?.mode ?? "normal");
  }

  private _zonesPhaseInput(): Record<string, ZonePhaseInput> {
    const zones = this.installation?.zones as Record<string, Record<string, unknown>> | undefined;
    const out: Record<string, ZonePhaseInput> = {};
    if (!zones) return out;
    for (const [id, z] of Object.entries(zones)) {
      out[id] = { enabled: Boolean(z?.enabled ?? true), exclusive: Boolean(z?.exclusive ?? false) };
    }
    return out;
  }

  private _maxParallel(): number {
    const n = Number(this.installation?.max_parallel_zones ?? 2);
    return Number.isFinite(n) && n >= 1 ? n : 2;
  }

  private _zoneName(id: string): string {
    const zones = this.installation?.zones as Record<string, Record<string, unknown>> | undefined;
    const z = zones?.[id];
    return z ? String(z.name ?? id) : id;
  }

  private _globalScript(phase: "pre_start" | "post_run"): string {
    return String(this.installation?.[`${phase}_script`] ?? "").trim();
  }

  private _globalScriptTimeout(phase: "pre_start" | "post_run"): number {
    const n = Number(this.installation?.[`${phase}_script_timeout_sec`] ?? 300);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 300;
  }

  private _zoneDuration(id: string): number {
    const zones = this.installation?.zones as Record<string, Record<string, unknown>> | undefined;
    return durationForMode(zones?.[id], this._mode());
  }

  private _estimateMin(): number {
    const zones = this.installation?.zones as Record<string, Record<string, unknown>> | undefined;
    if (!zones) return 0;
    const phases = computePhases(this._zoneIds, this._zonesPhaseInput(), this._maxParallel(), true);
    const preStart = Math.max(0, Number(this.installation?.pre_start_delay_sec ?? 10)) / 60;
    const mode = this._mode();
    const minutes = programMinutes(phases, this._cycleSoak, (zid) => {
      const z = zones[zid];
      return z && Boolean(z.enabled ?? true) ? durationForMode(z, mode) : 0;
    });
    return Math.round(preStart + minutes);
  }

  private _close(): void {
    this.open = false;
    this._seeded = false;
    this.onClose?.();
    this.requestUpdate();
  }

  private _canNext(): boolean {
    if (this._step === 2) {
      const opt = this._option();
      if (opt.multiAnchor && this._weekDays.length === 0) return false;
    }
    if (this._step === 3 && this._zoneIds.length === 0) return false;
    return true;
  }

  /** Conflict with an existing slot: shares a weekday and its [start, start+est] overlaps. */
  private _conflicts(): boolean {
    const zones = this.installation?.zones as Record<string, Record<string, unknown>> | undefined;
    if (!zones) return false;
    const est = this._estimateMin();
    const mine = this._slots().map((s) => ({
      days: new Set(s.weekdays),
      start: parseTimeLocalToMinutes(s.time_local),
      parity: s.week_parity,
    }));
    const existing = (this.installation?.schedule_slots as Array<Record<string, unknown>> | undefined) ?? [];
    for (const slot of existing) {
      if (this._cycleId && String(slot.cycle_id ?? "") === this._cycleId) continue;
      if (!(slot.enabled ?? true)) continue;
      const days = new Set(
        Array.isArray(slot.weekdays) ? (slot.weekdays as number[]) : [Number(slot.weekday ?? 0)]
      );
      const start = parseTimeLocalToMinutes(String(slot.time_local ?? "00:00"));
      const parity = String(slot.week_parity ?? "every");
      for (const m of mine) {
        const shareDay = [...m.days].some((d) => days.has(d));
        const shareWeek = m.parity === "every" || parity === "every" || m.parity === parity;
        if (!shareDay || !shareWeek) continue;
        // Assume similar duration window for the existing slot too.
        if (m.start < start + est && start < m.start + est) return true;
      }
    }
    return false;
  }

  private _shiftLater(): void {
    this._times = this._times.map((tl) => {
      const min = Math.min(23 * 60 + 59, parseTimeLocalToMinutes(tl) + 60);
      return minutesToTimeLocal(min).padStart(5, "0");
    });
  }

  private async _create(): Promise<void> {
    this._busy = true;
    this._msg = undefined;
    this.requestUpdate();
    try {
      if (guardsIncomplete(this._guards)) {
        this._msg = t(this.hass, "config_panel.schedule_err_guards_incomplete");
        return;
      }
      const opt = this._option();
      const res = await upsertCycle(this.hass, this.entryId, {
        cycle_id: this._cycleId,
        cycle_kind: opt.kind,
        cycle_meta: this._meta() as Record<string, unknown>,
        zone_ids_ordered: this._zoneIds,
        enabled: this._enabled,
        guards: guardsForSave(this._guards),
        ignore_global_guards: this._ignoreGlobalGuards,
        ...scriptOverrideForSave(this._preStartScript, "pre_start"),
        ...scriptOverrideForSave(this._postRunScript, "post_run"),
        repetitions: this._cycleSoak.repetitions,
        soak_between_phases_min: this._cycleSoak.soakBetweenPhasesMin,
        soak_between_repetitions_min: this._cycleSoak.soakBetweenRepetitionsMin,
      });
      if (!res.success) {
        this._msg = formatApiError(res.error, this.hass);
      } else {
        const rid = res.cycle_id ?? this._cycleId ?? "";
        this._close();
        this.onSaved?.(rid);
      }
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private _renderStep1(): TemplateResult {
    return html`
      <div class="section-title">${t(this.hass, "config_panel.cycle_step_how_often")}</div>
      <div class="kind-grid">
        ${KIND_OPTIONS.map((opt) => {
          const meta: CycleMeta = opt.n ? { n: opt.n } : {};
          const exact = cycleIsExact(opt.kind, meta);
          return html`
            <button
              type="button"
              class="kind-card ${this._optionId === opt.id ? "selected" : ""}"
              @click=${() => {
                this._optionId = opt.id;
                this._syncDefaultsForOption();
              }}
            >
              <span class="kind-card-title">
                ${t(this.hass, `config_panel.cycle_kind_${opt.id}`)}
                <span class="badge ${exact ? "badge-primary" : "badge-warn"}"
                  >${exact
                    ? t(this.hass, "config_panel.cycle_badge_exact")
                    : t(this.hass, "config_panel.cycle_badge_approx")}</span
                >
              </span>
              <span class="kind-card-desc">${t(this.hass, `config_panel.cycle_kind_${opt.id}_desc`)}</span>
            </button>
          `;
        })}
      </div>
    `;
  }

  private _renderWeekdayPicker(multi: boolean): TemplateResult {
    const selected = multi ? this._weekDays : [this._anchor];
    return html`
      <div class="weekday-chips" role="group">
        ${[0, 1, 2, 3, 4, 5, 6].map(
          (i) => html`
            <button
              type="button"
              class="chip day ${selected.includes(i) ? "selected" : ""}"
              aria-pressed=${selected.includes(i) ? "true" : "false"}
              title=${weekdayLong(this.hass, i)}
              @click=${() => {
                if (multi) {
                  this._weekDays = this._weekDays.includes(i)
                    ? this._weekDays.filter((d) => d !== i)
                    : [...this._weekDays, i].sort((a, b) => a - b);
                } else {
                  this._anchor = i;
                }
                this.requestUpdate();
              }}
            >
              ${weekdayShort(this.hass, i)}
            </button>
          `
        )}
      </div>
    `;
  }

  private _renderStep2(): TemplateResult {
    const opt = this._option();
    const slots = this._slots();
    const today = new Date();
    const start = today;
    const strip = previewStrip(slots, start, today, 14);
    const gaps = previewGaps(slots, start);
    const uniqueGaps = [...new Set(gaps)];
    const first = firstRunDate(slots, start);
    const exact = cycleIsExact(opt.kind, this._meta());

    return html`
      <div class="section-title">${t(this.hass, "config_panel.cycle_step_when")}</div>
      <span class="field-title">${t(this.hass, "config_panel.cycle_time_title")}</span>
      <div class="chips" style="margin:6px 0">
        ${TIME_PRESETS.map(
          (p) => html`
            <button
              type="button"
              class="chip ${this._times[0] === p.time ? "selected" : ""}"
              @click=${() => {
                this._times = [p.time, this._times[1]];
                this.requestUpdate();
              }}
            >
              ${t(this.hass, p.key)} ${formatTimeLocalForDisplay(this.hass, p.time)}
            </button>
          `
        )}
      </div>
      <div class="time-fields">
        <input
          type="time"
          .value=${this._times[0]}
          @input=${(e: Event) => {
            this._times = [(e.target as HTMLInputElement).value || "06:00", this._times[1]];
            this.requestUpdate();
          }}
        />
        ${opt.twoTimes
          ? html`<input
              type="time"
              .value=${this._times[1]}
              @input=${(e: Event) => {
                this._times = [this._times[0], (e.target as HTMLInputElement).value || "18:00"];
                this.requestUpdate();
              }}
            />`
          : nothing}
      </div>

      ${opt.kind === "daily" || opt.kind === "twice_daily"
        ? nothing
        : html`
            <div class="section-title">${t(this.hass, "config_panel.cycle_anchor_title")}</div>
            <p class="hint">${t(this.hass, "config_panel.cycle_anchor_desc")}</p>
            ${this._renderWeekdayPicker(opt.multiAnchor)}
          `}

      <div class="section-title">${t(this.hass, "config_panel.cycle_preview_title")}</div>
      <div class="day-strip">
        ${strip.map(
          (d) => html`
            <div class="day-cell ${d.run ? "run" : ""} ${d.isToday ? "today" : ""}">
              <span class="dc-dow">${weekdayShort(this.hass, mondayBasedWeekday(d.date))}</span>
              <span class="dc-dom">${d.date.getDate()}</span>
            </div>
          `
        )}
      </div>
      <p class="preview-line">
        ${t(this.hass, "config_panel.cycle_preview_gaps", { gaps: uniqueGaps.join(", ") })}
        ${!exact ? " · " + t(this.hass, "config_panel.cycle_badge_approx") : ""}
      </p>
      ${first
        ? html`<p class="preview-line">
            ${t(this.hass, "config_panel.cycle_preview_first_run", {
              when: formatDateTimeForDisplay(this.hass, new Date(first.getFullYear(), first.getMonth(), first.getDate(), ...this._times[0].split(":").map(Number) as [number, number])),
            })}
          </p>`
        : nothing}
    `;
  }

  private _renderStep3(): TemplateResult {
    const zones = this.installation?.zones as Record<string, Record<string, unknown>> | undefined;
    const allIds = zones ? Object.keys(zones) : [];
    const pmap = phaseIndexByZoneId(this._zoneIds, this._zonesPhaseInput(), this._maxParallel());
    const est = this._estimateMin();
    const slots = this._slots();
    const first = firstRunDate(slots, new Date());
    const conflict = this._conflicts();

    return html`
      <div class="section-title">
        ${t(this.hass, "config_panel.cycle_step_zones")}
        <button
          type="button"
          class="btn-outline"
          style="margin-left:auto;margin-top:0;padding:4px 10px;font-size:0.8rem"
          @click=${() => {
            this._zoneIds = allIds.filter((id) => Boolean(zones?.[id]?.enabled ?? true));
            this.requestUpdate();
          }}
        >
          ${t(this.hass, "config_panel.cycle_select_all")}
        </button>
      </div>
      ${allIds.map((id) => {
        const checked = this._zoneIds.includes(id);
        const pos = this._zoneIds.indexOf(id);
        const phase = pmap.get(id);
        const excl = Boolean(zones?.[id]?.exclusive ?? false);
        return html`
          <div class="zone-pick">
            <input
              type="checkbox"
              .checked=${checked}
              @change=${(e: Event) => {
                const on = (e.target as HTMLInputElement).checked;
                this._zoneIds = on
                  ? [...this._zoneIds, id]
                  : this._zoneIds.filter((x) => x !== id);
                this.requestUpdate();
              }}
            />
            <div class="zone-pick-main">
              <div class="zone-pick-name">${this._zoneName(id)}</div>
              <div class="meta-line">
                <span class="meta"
                  ><ha-icon icon="mdi:timer-outline"></ha-icon>${t(
                    this.hass,
                    "config_panel.timetable_duration_min",
                    { n: this._zoneDuration(id) }
                  )}</span
                >
                ${checked && phase
                  ? html`<span class="meta"
                      ><ha-icon icon="mdi:layers-triple-outline"></ha-icon>${excl
                        ? t(this.hass, "config_panel.cycle_phase_alone", { n: phase })
                        : t(this.hass, "config_panel.schedule_phase_n", { n: phase })}</span
                    >`
                  : nothing}
              </div>
            </div>
            ${checked
              ? html`
                  <button
                    type="button"
                    class="iconbtn"
                    aria-label=${t(this.hass, "config_panel.schedule_up")}
                    ?disabled=${pos <= 0}
                    @click=${() => {
                      const a = [...this._zoneIds];
                      [a[pos - 1], a[pos]] = [a[pos], a[pos - 1]];
                      this._zoneIds = a;
                      this.requestUpdate();
                    }}
                  >
                    <ha-icon icon="mdi:chevron-up"></ha-icon>
                  </button>
                  <button
                    type="button"
                    class="iconbtn"
                    aria-label=${t(this.hass, "config_panel.schedule_down")}
                    ?disabled=${pos < 0 || pos >= this._zoneIds.length - 1}
                    @click=${() => {
                      const a = [...this._zoneIds];
                      [a[pos + 1], a[pos]] = [a[pos], a[pos + 1]];
                      this._zoneIds = a;
                      this.requestUpdate();
                    }}
                  >
                    <ha-icon icon="mdi:chevron-down"></ha-icon>
                  </button>
                `
              : nothing}
          </div>
        `;
      })}

      <div class="field-block" style="margin-top:14px">
        <span class="field-title">${t(this.hass, "config_panel.schedule_slot_name")}</span>
        <div class="field-row">
          <ha-input
            .value=${this._label}
            @input=${(e: Event) => {
              this._label = (e.target as HTMLInputElement).value;
            }}
          ></ha-input>
        </div>
      </div>

      ${renderCycleSoakEditor(this.hass, this._cycleSoak, this._busy, (next) => {
        this._cycleSoak = next;
      })}

      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.guards_section_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.guards_section_desc")}</p>
        ${renderGuardList(this.hass, GUARD_ENTITY_DOMAINS, this._guards, (next) => {
          this._guards = next;
          this.requestUpdate();
        })}
        <div class="switch-row">
          <ha-switch
            .checked=${this._ignoreGlobalGuards}
            @change=${(e: Event) => {
              this._ignoreGlobalGuards = Boolean(
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
      </div>

      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.schedule_scripts_section_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.schedule_scripts_section_desc")}</p>
      </div>
      ${renderScriptOverride(
        this.hass,
        SCRIPT_ENTITY_DOMAINS,
        "pre_start",
        this._preStartScript,
        this._globalScript("pre_start"),
        this._globalScriptTimeout("pre_start"),
        this._busy,
        (next) => {
          this._preStartScript = next;
        }
      )}
      ${renderScriptOverride(
        this.hass,
        SCRIPT_ENTITY_DOMAINS,
        "post_run",
        this._postRunScript,
        this._globalScript("post_run"),
        this._globalScriptTimeout("post_run"),
        this._busy,
        (next) => {
          this._postRunScript = next;
        }
      )}

      <div class="summary-card">
        <strong>${t(this.hass, "config_panel.cycle_creates_title")}</strong>
        <ul style="margin:8px 0 0;padding-left:1.1rem">
          ${slots.map(
            (s) => html`<li>
              ${s.weekdays.map((d) => weekdayShort(this.hass, d)).join(", ")}
              · ${formatTimeLocalForDisplay(this.hass, s.time_local)}
              ${s.week_parity !== "every"
                ? " · " +
                  t(
                    this.hass,
                    s.week_parity === "odd"
                      ? "config_panel.week_parity_odd"
                      : "config_panel.week_parity_even"
                  )
                : ""}
              ${this._guards.length
                ? html` · ${guardsSummary(this.hass, this._guards)}`
                : nothing}
            </li>`
          )}
        </ul>
        ${est > 0
          ? html`<p class="preview-line" style="margin-bottom:0">
              ${t(this.hass, "config_panel.overview_mode_total", { n: est })}
            </p>`
          : nothing}
        ${first
          ? html`<p class="preview-line" style="margin-bottom:0">
              ${t(this.hass, "config_panel.cycle_preview_first_run", {
                when: formatDateTimeForDisplay(
                  this.hass,
                  new Date(
                    first.getFullYear(),
                    first.getMonth(),
                    first.getDate(),
                    ...(this._times[0].split(":").map(Number) as [number, number])
                  )
                ),
              })}
            </p>`
          : nothing}
      </div>

      ${conflict
        ? html`<div class="warning" style="display:flex;align-items:center;gap:10px;margin-top:10px">
            <span>${t(this.hass, "config_panel.cycle_conflict_warning")}</span>
            <button type="button" class="btn-outline" style="margin-top:0" @click=${() => this._shiftLater()}>
              ${t(this.hass, "config_panel.cycle_conflict_shift")}
            </button>
          </div>`
        : nothing}
    `;
  }

  protected render() {
    if (!this.open) return nothing;
    const titleKey = this._cycleId
      ? "config_panel.cycle_edit_title"
      : "config_panel.cycle_new";
    return html`
      <ha-dialog
        .open=${this.open}
        header-title=${t(this.hass, titleKey)}
        @closed=${() => this._close()}
      >
        <div class="progress" aria-hidden="true">
          ${[1, 2, 3].map((n) => html`<span class="step ${this._step >= n ? "done" : ""}"></span>`)}
        </div>
        ${this._msg ? html`<div class="error">${this._msg}</div>` : nothing}
        ${this._step === 1
          ? this._renderStep1()
          : this._step === 2
            ? this._renderStep2()
            : this._renderStep3()}
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead">
              ${this._step > 1
                ? html`<button type="button" class="btn-outline" ?disabled=${this._busy} @click=${() => (this._step -= 1)}>
                    ${t(this.hass, "config_panel.cycle_back")}
                  </button>`
                : html`<button type="button" class="btn-outline" ?disabled=${this._busy} @click=${() => this._close()}>
                    ${t(this.hass, "config_panel.zones_cancel")}
                  </button>`}
            </div>
            <div class="dialog-footer-actions">
              ${this._step < 3
                ? html`<button type="button" class="btn" ?disabled=${this._busy || !this._canNext()} @click=${() => (this._step += 1)}>
                    ${t(this.hass, "config_panel.cycle_next")}
                  </button>`
                : html`
                    <button
                      type="button"
                      class="btn"
                      ?disabled=${this._busy || this._zoneIds.length === 0}
                      @click=${() => this._create()}
                    >
                      ${this._cycleId
                        ? t(this.hass, "config_panel.cycle_save")
                        : t(this.hass, "config_panel.cycle_create")}
                    </button>
                  `}
            </div>
          </div>
        </div>
      </ha-dialog>
    `;
  }
}

defineCustomElementOnce("si-cycle-wizard", CycleWizard);
