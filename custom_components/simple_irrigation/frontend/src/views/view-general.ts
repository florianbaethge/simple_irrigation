import { LitElement, html, css, nothing } from "lit";
import { state } from "lit/decorators.js";
import { panelControl, saveGlobal, skipIrrigationToday } from "../data/api";
import { renderEntityDatalist, renderNativeEntityField } from "../entity-input";
import { defineCustomElementOnce, formatApiError } from "../helpers";
import { t } from "../i18n";
import { formLayoutStyles } from "../form-layout-styles";
import { formatDateTimeForDisplay, formatTimeLocalForDisplay, weekdayLong } from "../date-format";
import type { HomeAssistant, ScheduleNext } from "../types";

export class ViewGeneral extends LitElement {
  static properties = {
    hass: { attribute: false },
    entryId: { type: String },
    installation: { type: Object },
    scheduleNext: { type: Object },
    runState: { type: Object },
    onSaved: { attribute: false },
  };

  hass!: HomeAssistant;
  entryId!: string;
  installation!: Record<string, unknown>;
  scheduleNext?: ScheduleNext;
  runState?: Record<string, unknown>;
  onSaved?: () => void;

  static styles = [
    formLayoutStyles,
    css`
      ha-card {
        margin-bottom: 16px;
      }
      .card-content {
        padding: 0 8px 16px;
      }
      .error {
        color: var(--error-color);
        margin-bottom: 8px;
      }
      button.save {
        padding: 10px 20px;
        border-radius: 4px;
        border: none;
        background: var(--primary-color);
        color: var(--text-primary-color);
        cursor: pointer;
        font-size: 1rem;
      }
      button.save:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .schedule-overview-inner {
        margin-top: 4px;
      }
      .schedule-hero {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 18px 18px 20px;
        border-radius: 12px;
        border: 1px solid var(--divider-color);
        background: linear-gradient(
          145deg,
          rgba(var(--rgb-primary-color, 33, 150, 243), 0.12) 0%,
          transparent 55%
        );
        margin-bottom: 16px;
      }
      .schedule-hero-icon {
        flex-shrink: 0;
        --mdc-icon-size: 36px;
        color: var(--primary-color);
        opacity: 0.9;
        margin-top: 2px;
      }
      .schedule-hero-text {
        flex: 1;
        min-width: 0;
      }
      .schedule-hero-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--secondary-text-color);
        margin: 0 0 6px;
      }
      .schedule-next-big {
        font-size: 1.35rem;
        font-weight: 600;
        margin: 0;
        line-height: 1.25;
        letter-spacing: -0.02em;
        color: var(--primary-text-color);
      }
      .schedule-slot-pills {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .schedule-slot-pill {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 10px;
        border: 1px solid var(--divider-color);
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
        line-height: 1.45;
        font-size: 0.9375rem;
      }
      .schedule-slot-pill ha-icon {
        flex-shrink: 0;
        --mdc-icon-size: 22px;
        color: var(--primary-color);
        opacity: 0.85;
        margin-top: 1px;
      }
      .schedule-slot-pill-main {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .schedule-slot-name {
        font-weight: 600;
        font-size: 0.8125rem;
        color: var(--primary-color);
      }
      .schedule-slot-time {
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .schedule-slot-zones {
        display: block;
        margin-top: 4px;
        font-size: 0.875rem;
        color: var(--secondary-text-color);
      }
      .plan-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px 20px;
        margin-bottom: 16px;
      }
      .plan-row ha-switch {
        margin-right: 8px;
      }
      .plan-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1rem;
      }
      .muted-box {
        font-size: 0.875rem;
        color: var(--secondary-text-color);
        line-height: 1.45;
        margin: 0 0 12px;
      }
      .run-hero {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 18px 18px 20px;
        border-radius: 12px;
        border: 1px solid var(--divider-color);
        background: linear-gradient(
          145deg,
          rgba(var(--rgb-primary-color, 33, 150, 243), 0.1) 0%,
          transparent 50%
        );
        margin-bottom: 14px;
      }
      .run-hero-icon {
        flex-shrink: 0;
        --mdc-icon-size: 38px;
        color: var(--primary-color);
        opacity: 0.92;
        margin-top: 2px;
      }
      .run-hero-body {
        flex: 1;
        min-width: 0;
      }
      .run-hero-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--secondary-text-color);
        margin: 0 0 6px;
      }
      .run-hero-state {
        font-size: 1.35rem;
        font-weight: 600;
        margin: 0 0 10px;
        line-height: 1.25;
        letter-spacing: -0.02em;
        color: var(--primary-text-color);
      }
      .run-detail-pills {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .run-detail-pill {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--divider-color);
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
        font-size: 0.9rem;
        line-height: 1.45;
      }
      .run-detail-pill ha-icon {
        flex-shrink: 0;
        --mdc-icon-size: 20px;
        color: var(--primary-color);
        opacity: 0.85;
        margin-top: 2px;
      }
      .run-detail-pill strong {
        font-weight: 600;
        color: var(--primary-text-color);
      }
      button.ctrl {
        padding: 10px 16px;
        border-radius: 4px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        cursor: pointer;
        font-size: 0.95rem;
      }
      button.ctrl.danger {
        border-color: var(--error-color);
        color: var(--error-color);
      }
      button.ctrl:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ];

  private _busy = false;
  private _msg?: string;
  @state() private _runCtrlBusy = false;

  private _name = "";
  private _mode = "normal";
  private _maxParallel = 2;
  private _preStart: string[] = [];
  private _planEnabled = true;

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has("installation") && this.installation) {
      const inst = this.installation;
      this._name = String(inst.name ?? "");
      this._mode = String(inst.mode ?? "normal");
      this._maxParallel = Number(inst.max_parallel_zones ?? 2);
      this._planEnabled = Boolean(inst.enabled ?? true);
      const ps = Array.isArray(inst.pre_start_switches)
        ? (inst.pre_start_switches as string[]).filter(Boolean)
        : [];
      this._preStart = ps.length ? [...ps] : [""];
    }
  }

  private _pauseIsActive(): boolean {
    const raw = this.installation?.pause_until;
    if (!raw || typeof raw !== "string") return false;
    const t = Date.parse(raw);
    return !Number.isNaN(t) && t > Date.now();
  }

  private _fmtWhen(iso: string | null | undefined): string {
    if (!iso) return t(this.hass, "panel.general_none_scheduled");
    try {
      const d = new Date(iso);
      return formatDateTimeForDisplay(this.hass, d);
    } catch {
      return String(iso);
    }
  }

  private _wd(i: number): string {
    return weekdayLong(this.hass, i);
  }

  private _fmtPauseUntil(): string {
    const raw = this.installation?.pause_until;
    if (!raw || typeof raw !== "string") return "";
    return this._fmtWhen(raw);
  }

  private async _save(): Promise<void> {
    this._busy = true;
    this._msg = undefined;
    this.requestUpdate();
    try {
      const res = await saveGlobal(this.hass, this.entryId, {
        name: this._name,
        pre_start_switches: this._preStart.filter(Boolean),
        mode: this._mode,
        max_parallel_zones: this._maxParallel,
      });
      if (!res.success) {
        this._msg = formatApiError(res.error, this.hass);
      } else {
        this.onSaved?.();
      }
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private async _setPlanEnabled(enabled: boolean): Promise<void> {
    this._busy = true;
    this._msg = undefined;
    this.requestUpdate();
    try {
      const res = await saveGlobal(this.hass, this.entryId, { enabled });
      if (!res.success) {
        this._msg = formatApiError(res.error, this.hass);
      } else {
        this._planEnabled = enabled;
        this.onSaved?.();
      }
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private async _clearPause(): Promise<void> {
    this._busy = true;
    this._msg = undefined;
    this.requestUpdate();
    try {
      const res = await saveGlobal(this.hass, this.entryId, { pause_until: null });
      if (!res.success) {
        this._msg = formatApiError(res.error, this.hass);
      } else {
        this.onSaved?.();
      }
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private async _skipToday(): Promise<void> {
    this._busy = true;
    this._msg = undefined;
    this.requestUpdate();
    try {
      const res = await skipIrrigationToday(this.hass, this.entryId);
      if (!res.success) {
        this._msg = formatApiError(res.error, this.hass);
      } else {
        this.onSaved?.();
      }
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private _generalEntityListId(): string {
    return `si-ent-g-${this.entryId}`;
  }

  private _zoneName(zoneId: string): string {
    const zones = this.installation?.zones as Record<string, Record<string, unknown>> | undefined;
    const z = zones?.[zoneId];
    return z ? String(z.name ?? zoneId) : zoneId;
  }

  private _runStateBusy(rs: Record<string, unknown>): boolean {
    const s = String(rs.run_state ?? "idle");
    return ["preparing", "running", "stopping"].includes(s);
  }

  private _formatUpcomingPhases(rs: Record<string, unknown>): string {
    const up = rs.upcoming_phases;
    if (!Array.isArray(up) || up.length === 0) return "";
    const parts: string[] = [];
    for (const grp of up) {
      if (!Array.isArray(grp) || grp.length === 0) continue;
      parts.push(grp.map((id) => this._zoneName(String(id))).join(", "));
    }
    return parts.join(" → ");
  }

  private async _panelControlAction(
    action: "stop" | "skip_phase" | "clear_error"
  ): Promise<void> {
    this._runCtrlBusy = true;
    this._msg = undefined;
    this.requestUpdate();
    try {
      const res = await panelControl(this.hass, this.entryId, action);
      if (!res.success) {
        const err = res.error ?? "request_failed";
        this._msg =
          err === "not_running" && action === "skip_phase"
            ? t(this.hass, "panel.errors_not_running_skip")
            : String(err);
      } else {
        this.onSaved?.();
      }
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
    } finally {
      this._runCtrlBusy = false;
      this.requestUpdate();
    }
  }

  protected render() {
    const domains = ["switch", "input_boolean", "group"];
    const sn = this.scheduleNext ?? { fire_at: null, slots: [] };
    const nextGlobal =
      sn.fire_at || (this.runState?.next_run_global as string | undefined) || null;
    const pauseOn = this._pauseIsActive();
    const rs = (this.runState ?? {}) as Record<string, unknown>;
    const runBusy = this._runStateBusy(rs);
    const runStateStr = String(rs.run_state ?? "idle");
    const activeIds = Array.isArray(rs.active_zone_ids)
      ? (rs.active_zone_ids as string[])
      : [];
    const lastErr = rs.last_error ? String(rs.last_error) : "";
    const showStop = ["preparing", "running", "stopping"].includes(runStateStr);
    const upcomingLen = Array.isArray(rs.upcoming_phases) ? rs.upcoming_phases.length : 0;
    const showSkip =
      showStop &&
      runStateStr !== "stopping" &&
      (runStateStr === "preparing" || upcomingLen > 0);
    const showClearErr = Boolean(lastErr);
    const nextZonesLine = this._formatUpcomingPhases(rs);

    return html`
      ${renderEntityDatalist(this.hass, this._generalEntityListId(), domains)}
      <ha-card .header=${t(this.hass, "panel.general_card_current_run")}>
        <div class="card-content">
          <div class="run-hero">
            <ha-icon class="run-hero-icon" icon="mdi:sprinkler-variant"></ha-icon>
            <div class="run-hero-body">
              <p class="run-hero-label">${t(this.hass, "panel.general_label_irrigation_state")}</p>
              <p class="run-hero-state">
                ${runBusy
                  ? runStateStr === "preparing"
                    ? t(this.hass, "panel.general_state_preparing")
                    : runStateStr === "stopping"
                      ? t(this.hass, "panel.general_state_stopping")
                      : t(this.hass, "panel.general_state_running")
                  : runStateStr === "error"
                    ? t(this.hass, "panel.general_state_error_idle")
                    : t(this.hass, "panel.general_state_idle")}
              </p>
              ${runBusy && runStateStr === "preparing"
                ? html`<p class="muted-box" style="margin:0">
                    ${t(this.hass, "panel.general_preparing_hint")}
                  </p>`
                : nothing}
            </div>
          </div>
          ${activeIds.length || nextZonesLine || lastErr
            ? html`
                <ul class="run-detail-pills">
                  ${activeIds.length
                    ? html`
                        <li class="run-detail-pill">
                          <ha-icon icon="mdi:water"></ha-icon>
                          <span
                            ><strong>${t(this.hass, "panel.general_active_zones")}</strong>
                            ${activeIds.map((id) => this._zoneName(id)).join(", ")}</span
                          >
                        </li>
                      `
                    : nothing}
                  ${nextZonesLine
                    ? html`
                        <li class="run-detail-pill">
                          <ha-icon icon="mdi:playlist-play"></ha-icon>
                          <span
                            ><strong>${t(this.hass, "panel.general_next_zones")}</strong>
                            ${nextZonesLine}</span
                          >
                        </li>
                      `
                    : nothing}
                  ${lastErr
                    ? html`
                        <li class="run-detail-pill">
                          <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
                          <span
                            ><strong>${t(this.hass, "panel.general_last_error")}</strong>
                            ${lastErr}</span
                          >
                        </li>
                      `
                    : nothing}
                </ul>
              `
            : nothing}
          ${showStop
            ? html`<p class="muted-box" style="margin-top:0">
                ${t(this.hass, "panel.general_scheduled_pause_hint")}
              </p>`
            : nothing}
          ${showStop || showSkip || showClearErr
            ? html`<div class="action-row">
                ${showStop
                  ? html`
                      <button
                        type="button"
                        class="ctrl danger"
                        ?disabled=${this._runCtrlBusy || !runBusy}
                        @click=${() => this._panelControlAction("stop")}
                      >
                        ${t(this.hass, "panel.general_stop_irrigation")}
                      </button>
                    `
                  : nothing}
                ${showSkip
                  ? html`
                      <button
                        type="button"
                        class="ctrl"
                        ?disabled=${this._runCtrlBusy || !runBusy || runStateStr === "stopping"}
                        @click=${() => this._panelControlAction("skip_phase")}
                      >
                        ${t(this.hass, "panel.general_skip_phase")}
                      </button>
                    `
                  : nothing}
                ${showClearErr
                  ? html`
                      <button
                        type="button"
                        class="ctrl"
                        ?disabled=${this._runCtrlBusy}
                        @click=${() => this._panelControlAction("clear_error")}
                      >
                        ${t(this.hass, "panel.general_clear_error")}
                      </button>
                    `
                  : nothing}
              </div>`
            : nothing}
        </div>
      </ha-card>

      <ha-card .header=${t(this.hass, "panel.general_card_schedule_overview")}>
        <div class="card-content">
          ${!this._planEnabled
            ? html`<p class="muted-box">${t(this.hass, "panel.general_plan_off_hint")}</p>`
            : nothing}
          <div class="schedule-overview-inner">
            <div class="schedule-hero">
              <ha-icon class="schedule-hero-icon" icon="mdi:calendar-clock"></ha-icon>
              <div class="schedule-hero-text">
                <p class="schedule-hero-label">${t(this.hass, "panel.general_next_scheduled_run")}</p>
                <p class="schedule-next-big">${this._fmtWhen(nextGlobal)}</p>
              </div>
            </div>
            ${sn.slots?.length
              ? html`
                  <ul class="schedule-slot-pills">
                    ${sn.slots.map(
                      (s) => html`
                        <li class="schedule-slot-pill">
                          <ha-icon icon="mdi:playlist-play"></ha-icon>
                          <div class="schedule-slot-pill-main">
                            ${s.name?.trim()
                              ? html`<span class="schedule-slot-name">${s.name.trim()}</span>`
                              : nothing}
                            <span class="schedule-slot-time"
                              >${this._wd(s.weekday)} ${formatTimeLocalForDisplay(
                                this.hass,
                                s.time_local
                              )}</span
                            >
                            ${s.zone_names?.length
                              ? html`<span class="schedule-slot-zones"
                                  >${s.zone_names.join(", ")}</span
                                >`
                              : nothing}
                          </div>
                        </li>
                      `
                    )}
                  </ul>
                `
              : html`<p class="muted-box">${t(this.hass, "panel.general_no_slots")}</p>`}
          </div>
        </div>
      </ha-card>

      <ha-card .header=${t(this.hass, "panel.general_card_plan_control")}>
        <div class="card-content">
          ${this._msg ? html`<div class="error">${this._msg}</div>` : nothing}
          <div class="plan-row">
            <label class="plan-label">
              <ha-switch
                .disabled=${this._busy}
                .checked=${this._planEnabled}
                @change=${(e: Event) => {
                  const tgt = e.target as HTMLInputElement & { checked: boolean };
                  void this._setPlanEnabled(Boolean(tgt.checked));
                }}
              ></ha-switch>
              ${t(this.hass, "panel.general_enable_plan")}
            </label>
          </div>
          ${pauseOn
            ? html`<p class="muted-box">
                ${t(this.hass, "panel.general_pause_active_hint", {
                  when: this._fmtPauseUntil(),
                })}
              </p>`
            : nothing}
          <div class="action-row">
            <button
              type="button"
              class="btn-outline"
              ?disabled=${this._busy || !this._planEnabled}
              @click=${() => this._skipToday()}
            >
              ${t(this.hass, "panel.general_skip_today")}
            </button>
            <button
              type="button"
              class="btn-outline"
              ?disabled=${this._busy || !pauseOn}
              @click=${() => this._clearPause()}
            >
              ${t(this.hass, "panel.general_clear_pause")}
            </button>
          </div>
        </div>
      </ha-card>

      <ha-card .header=${t(this.hass, "panel.general_card_settings")}>
        <div class="card-content">
          <div class="field-block">
            <span class="field-title">${t(this.hass, "panel.general_installation_name")}</span>
            <p class="field-desc">${t(this.hass, "panel.general_installation_name_desc")}</p>
            <div class="field-row">
              <ha-textfield
                .label=${t(this.hass, "panel.general_field_name")}
                .value=${this._name}
                @input=${(e: Event) => {
                  this._name = (e.target as HTMLInputElement).value;
                }}
              ></ha-textfield>
            </div>
          </div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "panel.general_pre_start_title")}</span>
            <p class="field-desc">${t(this.hass, "panel.general_pre_start_desc")}</p>
            <div class="field-row">
              <div class="entity-picker-rows">
                ${this._preStart.map(
                  (eid, i) => html`
                    <div class="entity-picker-row">
                      ${renderNativeEntityField(
                        this.hass,
                        this._generalEntityListId(),
                        i === 0
                          ? t(this.hass, "panel.general_pre_start_output_n")
                          : t(this.hass, "panel.general_pre_start_output_i", { n: i + 1 }),
                        eid,
                        (v) => {
                          const next = [...this._preStart];
                          next[i] = v;
                          this._preStart = next;
                          this.requestUpdate();
                        }
                      )}
                      ${this._preStart.length > 1
                        ? html`
                            <button
                              type="button"
                              class="row-remove"
                              @click=${() => {
                                this._preStart.splice(i, 1);
                                if (this._preStart.length === 0) {
                                  this._preStart = [""];
                                }
                                this.requestUpdate();
                              }}
                            >
                              ${t(this.hass, "panel.general_remove")}
                            </button>
                          `
                        : nothing}
                    </div>
                  `
                )}
                <button
                  type="button"
                  class="btn-outline"
                  @click=${() => {
                    this._preStart = [...this._preStart, ""];
                    this.requestUpdate();
                  }}
                >
                  ${t(this.hass, "panel.general_add_pre_start")}
                </button>
              </div>
            </div>
          </div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "panel.general_watering_mode")}</span>
            <p class="field-desc">${t(this.hass, "panel.general_watering_mode_desc")}</p>
            <div class="field-row">
              <select
                class="field-select"
                @change=${(e: Event) => {
                  this._mode = (e.target as HTMLSelectElement).value;
                }}
              >
                <option value="eco" ?selected=${this._mode === "eco"}>
                  ${t(this.hass, "panel.general_mode_eco")}
                </option>
                <option value="normal" ?selected=${this._mode === "normal"}>
                  ${t(this.hass, "panel.general_mode_normal")}
                </option>
                <option value="extra" ?selected=${this._mode === "extra"}>
                  ${t(this.hass, "panel.general_mode_extra")}
                </option>
              </select>
            </div>
          </div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "panel.general_max_parallel")}</span>
            <p class="field-desc">${t(this.hass, "panel.general_max_parallel_desc")}</p>
            <div class="field-row">
              <ha-textfield
                type="number"
                .label=${t(this.hass, "panel.general_max_parallel_field")}
                .value=${String(this._maxParallel)}
                min="1"
                max="16"
                @input=${(e: Event) => {
                  this._maxParallel = Math.max(
                    1,
                    Math.min(16, parseInt((e.target as HTMLInputElement).value, 10) || 1)
                  );
                }}
              ></ha-textfield>
            </div>
          </div>
          <div class="action-row">
            <button type="button" class="save" @click=${() => this._save()} ?disabled=${this._busy}>
              ${this._busy
                ? t(this.hass, "panel.general_saving")
                : t(this.hass, "panel.general_save")}
            </button>
          </div>
        </div>
      </ha-card>
    `;
  }
}

defineCustomElementOnce("si-view-general", ViewGeneral);
