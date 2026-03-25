import { LitElement, html, css, nothing } from "lit";
import { state } from "lit/decorators.js";
import { runSlotNow, saveSlot } from "../data/api";
import { defineCustomElementOnce, formatApiError } from "../helpers";
import { t } from "../i18n";
import { formLayoutStyles } from "../form-layout-styles";
import { formatTimeLocalForDisplay, weekdayLong } from "../date-format";
import { phaseIndexByZoneId, type ZonePhaseInput } from "../schedule-phases";
import type { HomeAssistant } from "../types";

interface SlotRow {
  slot_id: string;
  weekday: number;
  time_local: string;
  enabled: boolean;
  zone_ids_ordered: string[];
  name: string;
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
        margin: 8px 0;
      }
      .intro {
        font-size: 0.875rem;
        color: var(--secondary-text-color);
        line-height: 1.45;
        margin: 0 0 16px;
      }
      .slot-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px 12px;
        padding: 14px 16px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        margin-bottom: 12px;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
      }
      .slot-row-summary {
        flex: 1;
        min-width: 160px;
      }
      .slot-row-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0 0 4px;
      }
      .slot-row-title .slot-name {
        font-weight: 700;
      }
      .slot-row-meta {
        font-size: 0.875rem;
        color: var(--secondary-text-color);
        margin: 0;
      }
      .slot-row-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      /* Override form-layout-styles .btn-outline (align-self + margin-top) so row actions line up */
      .slot-row-actions button {
        align-self: center;
        margin-top: 0;
      }
      .toolbar {
        margin-bottom: 16px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
      }
      button {
        padding: 10px 16px;
        border-radius: 4px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        cursor: pointer;
        font-size: 1rem;
      }
      button.primary {
        background: var(--primary-color);
        color: var(--text-primary-color);
        border: none;
      }
      button.danger {
        border-color: var(--error-color);
        color: var(--error-color);
      }
      .zones {
        list-style: none;
        padding: 0;
        margin: 12px 0;
      }
      .zones li {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        padding: 8px 0;
        border-bottom: 1px solid var(--divider-color);
      }
      .zones li:last-child {
        border-bottom: none;
      }
      .zones li.phase-sep {
        display: block;
        margin: 14px 0 6px;
        padding: 0;
        border-bottom: none;
      }
      .zones li.phase-sep span {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--secondary-text-color);
      }
      .zones li.phase-sep:first-child {
        margin-top: 0;
      }
      .zone-actions button {
        padding: 6px 12px;
        font-size: 0.875rem;
      }
      .zone-actions .btn-outline {
        padding: 6px 12px;
        font-size: 0.875rem;
        margin-top: 0;
      }
      .toolbar .btn-outline {
        margin-top: 0;
      }
    `,
  ];

  @state() private _busy = false;
  @state() private _msg?: string;
  private _newWeekday = 0;
  private _newTime = "06:00";
  private _newEnabled = true;
  private _newSlotName = "";

  @state() private _slotEditDraft: SlotRow | null = null;
  @state() private _addSlotDialogOpen = false;
  @state() private _addZonePick = "";

  private _wd(i: number): string {
    return weekdayLong(this.hass, i);
  }

  private _fmtSlotTime(timeLocal: string): string {
    return formatTimeLocalForDisplay(this.hass, timeLocal);
  }

  private _slots(): SlotRow[] {
    const s = this.installation?.schedule_slots as unknown[] | undefined;
    if (!Array.isArray(s)) return [];
    return s.map((raw) => {
      const o = raw as Record<string, unknown>;
      return {
        slot_id: String(o.slot_id ?? ""),
        weekday: Number(o.weekday ?? 0),
        time_local: String(o.time_local ?? "06:00"),
        enabled: Boolean(o.enabled ?? true),
        zone_ids_ordered: Array.isArray(o.zone_ids_ordered)
          ? [...(o.zone_ids_ordered as string[])]
          : [],
        name: String(o.name ?? "").trim(),
      };
    });
  }

  private _cloneSlot(s: SlotRow): SlotRow {
    return {
      ...s,
      zone_ids_ordered: [...s.zone_ids_ordered],
    };
  }

  private _zoneName(zid: string): string {
    const zones = this.installation?.zones as Record<string, Record<string, unknown>> | undefined;
    const z = zones?.[zid];
    return z ? String(z.name ?? zid) : zid;
  }

  private async _call(body: Record<string, unknown>): Promise<boolean> {
    this._busy = true;
    this._msg = undefined;
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
    }
  }

  private _runtimeBusy(): boolean {
    const rs = this.runState ?? {};
    const s = String(rs.run_state ?? "idle");
    return ["preparing", "running", "stopping"].includes(s);
  }

  private async _runSlotNow(slotId: string): Promise<void> {
    if (this._runtimeBusy()) return;
    this._busy = true;
    this._msg = undefined;
    this.requestUpdate();
    try {
      const res = (await runSlotNow(this.hass, this.entryId, slotId)) as {
        success: boolean;
        error?: string;
      };
      if (!res.success) {
        const err = res.error ?? "run_failed";
        this._msg =
          err === "busy"
            ? t(this.hass, "config_panel.schedule_err_busy")
            : err === "empty_slot"
              ? t(this.hass, "config_panel.schedule_err_empty_slot")
              : err === "no_runnable_zones"
                ? t(this.hass, "config_panel.schedule_err_no_runnable")
                : err === "unknown_slot"
                  ? t(this.hass, "config_panel.schedule_err_unknown_slot")
                  : String(err);
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

  private _closeEditDialog(): void {
    this._slotEditDraft = null;
  }

  private _resetNewSlotForm(): void {
    this._newWeekday = 0;
    this._newTime = "06:00";
    this._newEnabled = true;
    this._newSlotName = "";
  }

  private _closeAddSlotDialog(): void {
    this._addSlotDialogOpen = false;
    this._resetNewSlotForm();
  }

  private _zonesMap(): Record<string, unknown> | undefined {
    return this.installation?.zones as Record<string, unknown> | undefined;
  }

  private _maxParallelZones(): number {
    const n = Number(this.installation?.max_parallel_zones ?? 2);
    return Number.isFinite(n) && n >= 1 ? n : 2;
  }

  private _zonesPhaseInput(): Record<string, ZonePhaseInput> {
    const zones = this.installation?.zones as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!zones) return {};
    const out: Record<string, ZonePhaseInput> = {};
    for (const [id, z] of Object.entries(zones)) {
      out[id] = {
        enabled: Boolean(z?.enabled ?? true),
        exclusive: Boolean(z?.exclusive ?? false),
      };
    }
    return out;
  }

  private _addZoneOptionsForDraft(draft: SlotRow): string[] {
    const zones = this._zonesMap();
    if (!zones) return [];
    return Object.keys(zones).filter((id) => !draft.zone_ids_ordered.includes(id));
  }

  private async _saveSlotDraft(): Promise<void> {
    const d = this._slotEditDraft;
    if (!d) return;
    const ok = await this._call({
      action: "update",
      slot_id: d.slot_id,
      weekday: d.weekday,
      time_local: d.time_local,
      enabled: d.enabled,
      zone_ids_ordered: d.zone_ids_ordered,
      name: d.name.trim(),
    });
    if (ok) {
      this._closeEditDialog();
    }
  }

  private async _deleteSlotDraft(): Promise<void> {
    const d = this._slotEditDraft;
    if (!d) return;
    if (!confirm(t(this.hass, "config_panel.schedule_confirm_delete_slot"))) return;
    const ok = await this._call({ action: "delete", slot_id: d.slot_id });
    if (ok) {
      this._closeEditDialog();
    }
  }

  protected render() {
    const slots = this._slots();
    const zones = this._zonesMap();
    const draft = this._slotEditDraft;
    const addZoneOpts = draft ? this._addZoneOptionsForDraft(draft) : [];
    const editSlotTitle =
      draft != null
        ? t(this.hass, "config_panel.schedule_edit_dialog_title", {
            summary: draft.name.trim()
              ? `${draft.name.trim()} · ${this._wd(draft.weekday)} ${this._fmtSlotTime(
                  draft.time_local
                )}`
              : `${this._wd(draft.weekday)} ${this._fmtSlotTime(draft.time_local)}`,
          })
        : "";

    return html`
      <ha-card .header=${t(this.hass, "config_panel.schedule_card_title")}>
        <div class="card-content">
          ${this._msg ? html`<div class="error">${this._msg}</div>` : nothing}
          <p class="intro">${t(this.hass, "config_panel.schedule_intro")}</p>
          <div class="toolbar">
            <button
              type="button"
              class="btn-outline"
              @click=${() => {
                this._msg = undefined;
                this._addSlotDialogOpen = true;
              }}
            >
              ${t(this.hass, "config_panel.schedule_add_slot")}
            </button>
          </div>
          ${slots.map((slot) => {
            const n = slot.zone_ids_ordered.length;
            return html`
              <div class="slot-row">
                <div class="slot-row-summary">
                  <p class="slot-row-title">
                    ${slot.name
                      ? html`<span class="slot-name">${slot.name}</span> · ${this._wd(
                          slot.weekday
                        )}
                        ${this._fmtSlotTime(slot.time_local)}`
                      : html`${this._wd(slot.weekday)} ${this._fmtSlotTime(slot.time_local)}`}
                    ${slot.enabled ? "" : t(this.hass, "config_panel.schedule_disabled_suffix")}
                  </p>
                  <p class="slot-row-meta">
                    ${n === 1
                      ? t(this.hass, "config_panel.schedule_zones_in_order_one")
                      : t(this.hass, "config_panel.schedule_zones_in_order_many", { n })}
                  </p>
                </div>
                <div class="slot-row-actions">
                  <button
                    type="button"
                    class="btn-outline"
                    ?disabled=${this._busy ||
                    this._runtimeBusy() ||
                    slot.zone_ids_ordered.length === 0}
                    @click=${() => this._runSlotNow(slot.slot_id)}
                  >
                    ${t(this.hass, "config_panel.schedule_run_slot_now")}
                  </button>
                  <button
                    type="button"
                    class="btn-outline"
                    @click=${() => {
                      this._msg = undefined;
                      this._addZonePick = "";
                      this._slotEditDraft = this._cloneSlot(slot);
                    }}
                  >
                    ${t(this.hass, "config_panel.schedule_edit")}
                  </button>
                </div>
              </div>
            `;
          })}
        </div>
      </ha-card>

      <ha-dialog
        .open=${this._addSlotDialogOpen}
        header-title=${t(this.hass, "config_panel.schedule_dialog_new_title")}
        @closed=${() => this._closeAddSlotDialog()}
      >
        <p class="field-desc">${t(this.hass, "config_panel.schedule_dialog_new_hint")}</p>
        <div class="field-block">
          <span class="field-title">${t(this.hass, "config_panel.schedule_name_optional_title")}</span>
          <p class="field-desc">${t(this.hass, "config_panel.schedule_name_optional_desc")}</p>
          <div class="field-row">
            <ha-textfield
              .label=${t(this.hass, "config_panel.schedule_slot_name")}
              .value=${this._newSlotName}
              @input=${(e: Event) => {
                this._newSlotName = (e.target as HTMLInputElement).value;
              }}
            ></ha-textfield>
          </div>
        </div>
        <div class="field-block">
          <span class="field-title">${t(this.hass, "config_panel.schedule_weekday_title")}</span>
          <p class="field-desc">${t(this.hass, "config_panel.schedule_weekday_desc")}</p>
          <select
            class="field-select"
            @change=${(e: Event) => {
              this._newWeekday = parseInt((e.target as HTMLSelectElement).value, 10);
            }}
          >
            ${[0, 1, 2, 3, 4, 5, 6].map(
              (i) =>
                html`<option value=${i} ?selected=${this._newWeekday === i}>
                  ${this._wd(i)}
                </option>`
            )}
          </select>
        </div>
        <div class="field-block">
          <span class="field-title">${t(this.hass, "config_panel.schedule_local_time_title")}</span>
          <p class="field-desc">${t(this.hass, "config_panel.schedule_local_time_desc")}</p>
          <div class="field-row">
            <ha-textfield
              .label=${t(this.hass, "config_panel.schedule_time_hhmm")}
              .value=${this._newTime}
              @input=${(e: Event) => {
                this._newTime = (e.target as HTMLInputElement).value;
              }}
            ></ha-textfield>
          </div>
        </div>
        <div class="field-block">
          <div class="checkboxes">
            <label
              ><input
                type="checkbox"
                .checked=${this._newEnabled}
                @change=${(e: Event) => {
                  this._newEnabled = (e.target as HTMLInputElement).checked;
                }}
              />
              ${t(this.hass, "config_panel.schedule_slot_enabled")}</label
            >
          </div>
        </div>
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead"></div>
            <div class="dialog-footer-actions">
              <button
                type="button"
                class="btn-outline"
                @click=${() => this._closeAddSlotDialog()}
                ?disabled=${this._busy}
              >
                ${t(this.hass, "config_panel.zones_cancel")}
              </button>
              <button
                type="button"
                class="primary"
                ?disabled=${this._busy}
                @click=${async () => {
                  const ok = await this._call({
                    action: "add",
                    weekday: this._newWeekday,
                    time_local: this._newTime,
                    enabled: this._newEnabled,
                    name: this._newSlotName.trim(),
                  });
                  if (ok) {
                    this._closeAddSlotDialog();
                  }
                }}
              >
                ${this._busy
                  ? t(this.hass, "config_panel.schedule_adding")
                  : t(this.hass, "config_panel.schedule_add_slot_btn")}
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>

      <ha-dialog
        .open=${draft !== null}
        header-title=${editSlotTitle}
        @closed=${() => this._closeEditDialog()}
      >
        ${draft
          ? html`
              <div class="field-block">
                <span class="field-title">${t(this.hass, "config_panel.schedule_name_optional_title")}</span>
                <div class="field-row">
                  <ha-textfield
                    .label=${t(this.hass, "config_panel.schedule_slot_name")}
                    .value=${draft.name}
                    @input=${(e: Event) => {
                      draft.name = (e.target as HTMLInputElement).value;
                    }}
                  ></ha-textfield>
                </div>
              </div>
              <div class="field-block">
                <span class="field-title">${t(this.hass, "config_panel.schedule_weekday_title")}</span>
                <select
                  class="field-select"
                  .value=${String(draft.weekday)}
                  @change=${(e: Event) => {
                    draft.weekday = parseInt((e.target as HTMLSelectElement).value, 10);
                    this.requestUpdate();
                  }}
                >
                  ${[0, 1, 2, 3, 4, 5, 6].map(
                    (i) =>
                      html`<option value=${i} ?selected=${draft.weekday === i}>
                        ${this._wd(i)}
                      </option>`
                  )}
                </select>
              </div>
              <div class="field-block">
                <span class="field-title">${t(this.hass, "config_panel.schedule_start_time_title")}</span>
                <div class="field-row">
                  <ha-textfield
                    .label=${t(this.hass, "config_panel.schedule_time_hhmm")}
                    .value=${draft.time_local}
                    @input=${(e: Event) => {
                      draft.time_local = (e.target as HTMLInputElement).value;
                    }}
                  ></ha-textfield>
                </div>
              </div>
              <div class="field-block">
                <div class="checkboxes">
                  <label
                    ><input
                      type="checkbox"
                      .checked=${draft.enabled}
                      @change=${(e: Event) => {
                        draft.enabled = (e.target as HTMLInputElement).checked;
                      }}
                    />
                    ${t(this.hass, "config_panel.schedule_slot_enabled")}</label
                  >
                </div>
              </div>
              <div class="field-block" style="margin-top:8px">
                <span class="field-title">${t(this.hass, "config_panel.schedule_run_order_title")}</span>
                <p class="field-desc">${t(this.hass, "config_panel.schedule_run_order_desc")}</p>
                <ul class="zones">
                  ${(() => {
                    const pmap = phaseIndexByZoneId(
                      draft.zone_ids_ordered,
                      this._zonesPhaseInput(),
                      this._maxParallelZones()
                    );
                    return draft.zone_ids_ordered.map((zid, idx) => {
                      const pnum = pmap.get(zid);
                      const prevZid = idx > 0 ? draft.zone_ids_ordered[idx - 1] : undefined;
                      const prevP = prevZid !== undefined ? pmap.get(prevZid) : undefined;
                      const showPhase = pnum !== undefined && pnum !== prevP;
                      return html`
                        ${showPhase
                          ? html`<li class="phase-sep"><span>${t(
                              this.hass,
                              "config_panel.schedule_phase_n",
                              { n: pnum ?? 0 }
                            )}</span></li>`
                          : nothing}
                        <li>
                        <span>${idx + 1}. ${this._zoneName(zid)}</span>
                        <span class="zone-actions">
                          <button
                            type="button"
                            class="btn-outline"
                            @click=${() => {
                              if (idx > 0) {
                                const a = draft.zone_ids_ordered;
                                [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
                                this.requestUpdate();
                              }
                            }}
                          >
                            ${t(this.hass, "config_panel.schedule_up")}
                          </button>
                          <button
                            type="button"
                            class="btn-outline"
                            @click=${() => {
                              const a = draft.zone_ids_ordered;
                              if (idx < a.length - 1) {
                                [a[idx + 1], a[idx]] = [a[idx], a[idx + 1]];
                                this.requestUpdate();
                              }
                            }}
                          >
                            ${t(this.hass, "config_panel.schedule_down")}
                          </button>
                          <button
                            type="button"
                            class="btn-outline"
                            @click=${() => {
                              draft.zone_ids_ordered = draft.zone_ids_ordered.filter(
                                (x) => x !== zid
                              );
                              this.requestUpdate();
                            }}
                          >
                            ${t(this.hass, "config_panel.schedule_remove")}
                          </button>
                        </span>
                      </li>
                    `;
                    });
                  })()}
                </ul>
                ${addZoneOpts.length
                  ? html`
                      <div class="field-block" style="margin-top:12px">
                        <span class="field-title">${t(this.hass, "config_panel.schedule_add_zone_title")}</span>
                        <select
                          class="field-select"
                          .value=${this._addZonePick}
                          @change=${(e: Event) => {
                            this._addZonePick = (e.target as HTMLSelectElement).value;
                          }}
                        >
                          <option value="">${t(this.hass, "config_panel.schedule_choose_zone")}</option>
                          ${addZoneOpts.map(
                            (id) => html`<option value=${id}>${this._zoneName(id)}</option>`
                          )}
                        </select>
                        <div class="action-row" style="margin-top:10px">
                          <button
                            type="button"
                            class="btn-outline"
                            ?disabled=${!this._addZonePick}
                            @click=${() => {
                              if (
                                this._addZonePick &&
                                !draft.zone_ids_ordered.includes(this._addZonePick)
                              ) {
                                draft.zone_ids_ordered = [
                                  ...draft.zone_ids_ordered,
                                  this._addZonePick,
                                ];
                                this._addZonePick = "";
                                this.requestUpdate();
                              }
                            }}
                          >
                            ${t(this.hass, "config_panel.schedule_add_to_list")}
                          </button>
                        </div>
                      </div>
                    `
                  : zones && Object.keys(zones).length > 0
                    ? html`<p class="field-desc">${t(
                        this.hass,
                        "config_panel.schedule_all_zones_in_slot"
                      )}</p>`
                    : html`<p class="field-desc">${t(
                        this.hass,
                        "config_panel.schedule_create_zones_first"
                      )}</p>`}
              </div>
            `
          : nothing}
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead">
              ${draft
                ? html`
                    <button
                      type="button"
                      class="danger"
                      ?disabled=${this._busy}
                      @click=${() => this._deleteSlotDraft()}
                    >
                      ${t(this.hass, "config_panel.schedule_delete_slot")}
                    </button>
                  `
                : nothing}
            </div>
            <div class="dialog-footer-actions">
              <button
                type="button"
                class="btn-outline"
                @click=${() => this._closeEditDialog()}
                ?disabled=${this._busy}
              >
                ${t(this.hass, "config_panel.zones_cancel")}
              </button>
              <button
                type="button"
                class="primary"
                ?disabled=${this._busy || !draft}
                @click=${() => this._saveSlotDraft()}
              >
                ${this._busy
                  ? t(this.hass, "config_panel.schedule_saving")
                  : t(this.hass, "config_panel.schedule_save_slot")}
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>
    `;
  }
}

defineCustomElementOnce("si-view-schedule", ViewSchedule);
