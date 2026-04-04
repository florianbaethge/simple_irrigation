import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { runZoneNow, saveZone } from "../data/api";
import { renderEntityDatalist, renderNativeEntityField } from "../entity-input";
import { defineCustomElementOnce, formatApiError } from "../helpers";
import { t } from "../i18n";
import { formLayoutStyles } from "../form-layout-styles";
import { slotInclusionCountPerZone } from "../timetable-model";
import type { HomeAssistant } from "../types";

const domains = ["switch", "input_boolean", "group"];

interface ZoneRow {
  zone_id: string;
  name: string;
  switch_entity_ids: string[];
  enabled: boolean;
  duration_eco_min: number;
  duration_normal_min: number;
  duration_extra_min: number;
  exclusive: boolean;
}

export class ViewZones extends LitElement {
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
      .toolbar {
        margin-bottom: 16px;
      }
      .zone-list-row-wrap {
        display: flex;
        align-items: stretch;
        margin-bottom: 12px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--divider-color);
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
      }
      .zone-list-row-accent {
        width: 8px;
        flex-shrink: 0;
        background: var(--primary-color);
        transition: background 0.15s ease;
      }
      .zone-list-row-accent.inactive {
        background: var(--disabled-text-color, rgba(158, 158, 158, 0.45));
      }
      .zone-list-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px 16px;
        flex: 1;
        min-width: 0;
        padding: 14px 16px;
      }
      .zone-list-row-toggle {
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }
      .zone-list-row-toggle ha-switch {
        --switch-padding: 4px;
      }
      .zone-list-main {
        flex: 1;
        min-width: 160px;
      }
      .zone-list-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0 0 4px;
      }
      .zone-list-detail {
        font-size: 0.875rem;
        color: var(--secondary-text-color);
        margin: 0;
        line-height: 1.4;
      }
      .zone-list-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .zone-list-actions .btn-outline {
        margin-top: 0;
      }
      .zone-list-actions button {
        align-self: center;
        margin-top: 0;
      }
      button {
        padding: 10px 18px;
        border-radius: 4px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        cursor: pointer;
        font-size: 1rem;
      }
      button.danger {
        border-color: var(--error-color);
        color: var(--error-color);
      }
      button.primary {
        background: var(--primary-color);
        color: var(--text-primary-color);
        border: none;
      }
      button.primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ];

  @state() private _busy = false;
  @state() private _msg?: string;
  @state() private _addDialogOpen = false;
  @state() private _editDraft: ZoneRow | null = null;
  private _new: ZoneRow = {
    zone_id: "",
    name: "",
    switch_entity_ids: [""],
    enabled: true,
    duration_eco_min: 10,
    duration_normal_min: 15,
    duration_extra_min: 20,
    exclusive: false,
  };

  private _cloneZone(z: ZoneRow): ZoneRow {
    return {
      ...z,
      switch_entity_ids: [...z.switch_entity_ids],
    };
  }

  private _zonesFromInstallation(): ZoneRow[] {
    const z = this.installation?.zones as Record<string, Record<string, unknown>> | undefined;
    if (!z) return [];
    return Object.entries(z).map(([zone_id, o]) => {
      const raw = (o as Record<string, unknown>).switch_entity_ids;
      let switch_entity_ids: string[] = [];
      if (Array.isArray(raw)) {
        switch_entity_ids = raw.map((x) => String(x)).filter(Boolean);
      } else if (o.switch_entity_id) {
        switch_entity_ids = [String(o.switch_entity_id)];
      }
      if (switch_entity_ids.length === 0) {
        switch_entity_ids = [""];
      }
      return {
        zone_id,
        name: String(o.name ?? ""),
        switch_entity_ids,
        enabled: Boolean(o.enabled ?? true),
        duration_eco_min: Number(o.duration_eco_min ?? 10),
        duration_normal_min: Number(o.duration_normal_min ?? 15),
        duration_extra_min: Number(o.duration_extra_min ?? 20),
        exclusive: Boolean(o.exclusive ?? false),
      };
    });
  }

  private _resetNewZone(): void {
    this._new = {
      zone_id: "",
      name: "",
      switch_entity_ids: [""],
      enabled: true,
      duration_eco_min: 10,
      duration_normal_min: 15,
      duration_extra_min: 20,
      exclusive: false,
    };
  }

  private _closeAddDialog(): void {
    this._addDialogOpen = false;
    this._resetNewZone();
  }

  private _closeEditDialog(): void {
    this._editDraft = null;
  }

  private _canSaveZone(zone: ZoneRow): boolean {
    return Boolean(zone.name.trim() && zone.switch_entity_ids.some((id) => id.trim()));
  }

  private async _runZoneNow(zoneId: string): Promise<void> {
    this._busy = true;
    this._msg = undefined;
    this.requestUpdate();
    try {
      const res = (await runZoneNow(this.hass, this.entryId, zoneId)) as {
        success: boolean;
        error?: string;
      };
      if (!res.success) {
        const err = res.error ?? "run_failed";
        this._msg =
          err === "busy"
            ? t(this.hass, "config_panel.zones_err_busy")
            : err === "zone_already_queued"
              ? t(this.hass, "config_panel.zones_err_zone_already_queued")
              : err === "unknown_zone"
                ? t(this.hass, "config_panel.zones_err_unknown_zone")
                : err === "zone_disabled"
                  ? t(this.hass, "config_panel.zones_err_zone_disabled")
                  : err === "zone_no_outputs"
                    ? t(this.hass, "config_panel.zones_err_zone_no_outputs")
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

  private _zonesEntityListId(): string {
    return `si-ent-z-${this.entryId}`;
  }

  private async _toggleZoneEnabled(z: ZoneRow, enabled: boolean): Promise<void> {
    if (this._busy) return;
    this._busy = true;
    this._msg = undefined;
    try {
      const body: Record<string, unknown> = {
        action: "update",
        zone_id: z.zone_id,
        zone: {
          name: z.name,
          switch_entity_ids: z.switch_entity_ids.filter(Boolean),
          enabled,
          duration_eco_min: z.duration_eco_min,
          duration_normal_min: z.duration_normal_min,
          duration_extra_min: z.duration_extra_min,
          exclusive: z.exclusive,
        },
      };
      const res = await saveZone(this.hass, this.entryId, body);
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

  private async _saveZone(
    action: "add" | "update" | "delete",
    zoneId: string | undefined,
    zone?: ZoneRow
  ): Promise<void> {
    this._busy = true;
    this._msg = undefined;
    try {
      const body: Record<string, unknown> = { action };
      if (zoneId) body.zone_id = zoneId;
      if (zone && action !== "delete") {
        body.zone = {
          name: zone.name,
          switch_entity_ids: zone.switch_entity_ids.filter(Boolean),
          enabled: zone.enabled,
          duration_eco_min: zone.duration_eco_min,
          duration_normal_min: zone.duration_normal_min,
          duration_extra_min: zone.duration_extra_min,
          exclusive: zone.exclusive,
        };
      }
      const res = await saveZone(this.hass, this.entryId, body);
      if (!res.success) {
        this._msg = formatApiError(res.error, this.hass);
      } else {
        if (action === "update" || action === "delete") {
          this._closeEditDialog();
        }
        if (action === "add") {
          this._closeAddDialog();
        }
        this.onSaved?.();
      }
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
    }
  }

  private _renderZoneFields(z: ZoneRow): TemplateResult {
    return html`
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.zones_field_name_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.zones_field_name_desc")}</p>
        <div class="field-row">
          <ha-textfield
            .label=${t(this.hass, "config_panel.zones_field_zone_name")}
            .value=${z.name}
            @input=${(e: Event) => {
              z.name = (e.target as HTMLInputElement).value;
              this.requestUpdate();
            }}
          ></ha-textfield>
        </div>
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.zones_outputs_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.zones_outputs_desc")}</p>
        <div class="field-row">
          <div class="entity-picker-rows">
            ${z.switch_entity_ids.map(
              (eid, i) => html`
                <div class="entity-picker-row">
                  ${renderNativeEntityField(
                    this.hass,
                    this._zonesEntityListId(),
                    i === 0
                      ? t(this.hass, "config_panel.zones_output_first")
                      : t(this.hass, "config_panel.zones_output_n", { n: i + 1 }),
                    eid,
                    (v) => {
                      const next = [...z.switch_entity_ids];
                      next[i] = v;
                      z.switch_entity_ids = next;
                      this.requestUpdate();
                    }
                  )}
                  ${z.switch_entity_ids.length > 1
                    ? html`
                        <button
                          type="button"
                          class="row-remove"
                          @click=${() => {
                            z.switch_entity_ids.splice(i, 1);
                            if (z.switch_entity_ids.length === 0) {
                              z.switch_entity_ids = [""];
                            }
                            this.requestUpdate();
                          }}
                        >
                          ${t(this.hass, "config_panel.general_remove")}
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
                z.switch_entity_ids = [...z.switch_entity_ids, ""];
                this.requestUpdate();
              }}
            >
              ${t(this.hass, "config_panel.zones_add_output")}
            </button>
          </div>
        </div>
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.zones_runtime_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.zones_runtime_desc")}</p>
        <div class="duration-row">
          <ha-textfield
            type="number"
            .label=${t(this.hass, "config_panel.zones_duration_eco")}
            .value=${String(z.duration_eco_min)}
            min="0"
            max="240"
            @input=${(e: Event) => {
              z.duration_eco_min = parseInt((e.target as HTMLInputElement).value, 10) || 0;
            }}
          ></ha-textfield>
          <ha-textfield
            type="number"
            .label=${t(this.hass, "config_panel.zones_duration_normal")}
            .value=${String(z.duration_normal_min)}
            min="0"
            max="240"
            @input=${(e: Event) => {
              z.duration_normal_min = parseInt((e.target as HTMLInputElement).value, 10) || 0;
            }}
          ></ha-textfield>
          <ha-textfield
            type="number"
            .label=${t(this.hass, "config_panel.zones_duration_extra")}
            .value=${String(z.duration_extra_min)}
            min="0"
            max="240"
            @input=${(e: Event) => {
              z.duration_extra_min = parseInt((e.target as HTMLInputElement).value, 10) || 0;
            }}
          ></ha-textfield>
        </div>
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.zones_behavior_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.zones_behavior_desc")}</p>
        <div class="switch-rows">
          <div class="switch-row">
            <ha-switch
              .disabled=${this._busy}
              .checked=${z.enabled}
              @change=${(e: Event) => {
                const tgt = e.target as HTMLInputElement & { checked: boolean };
                z.enabled = Boolean(tgt.checked);
                this.requestUpdate();
              }}
            ></ha-switch>
            <span class="switch-row-label">${t(this.hass, "config_panel.zones_enabled")}</span>
          </div>
          <div class="switch-row">
            <ha-switch
              .disabled=${this._busy}
              .checked=${z.exclusive}
              @change=${(e: Event) => {
                const tgt = e.target as HTMLInputElement & { checked: boolean };
                z.exclusive = Boolean(tgt.checked);
                this.requestUpdate();
              }}
            ></ha-switch>
            <span class="switch-row-label">${t(this.hass, "config_panel.zones_exclusive")}</span>
          </div>
        </div>
      </div>
    `;
  }

  protected render() {
    const zones = this._zonesFromInstallation();
    const edit = this._editDraft;
    const slotsPerZone = slotInclusionCountPerZone(this.installation ?? {});

    return html`
      ${renderEntityDatalist(this.hass, this._zonesEntityListId(), domains)}
      <ha-card .header=${t(this.hass, "config_panel.zones_card_title")}>
        <div class="card-content">
          ${this._msg ? html`<div class="error">${this._msg}</div>` : nothing}
          <p class="intro">${t(this.hass, "config_panel.zones_intro")}</p>
          <p class="intro">${t(this.hass, "config_panel.zones_intro_automation")}</p>
          <div class="field-block toolbar">
            <button
              type="button"
              class="btn-outline"
              @click=${() => {
                this._addDialogOpen = true;
              }}
            >
              ${t(this.hass, "config_panel.zones_add_zone")}
            </button>
          </div>
          ${zones.map((z) => {
            const outs = z.switch_entity_ids.filter(Boolean).length;
            const runDisabled = this._busy || !z.enabled || outs === 0;
            return html`
              <div class="zone-list-row-wrap">
                <div
                  class="zone-list-row-accent ${z.enabled ? "" : "inactive"}"
                  aria-hidden="true"
                ></div>
                <div class="zone-list-row">
                  <div class="zone-list-row-toggle">
                    <ha-switch
                      .disabled=${this._busy}
                      .checked=${z.enabled}
                      @change=${(e: Event) => {
                        const tgt = e.target as HTMLInputElement & { checked: boolean };
                        void this._toggleZoneEnabled(z, Boolean(tgt.checked));
                      }}
                    ></ha-switch>
                  </div>
                  <div class="zone-list-main">
                    <p class="zone-list-name">${z.name || z.zone_id.slice(0, 8)}</p>
                    <p class="zone-list-detail">
                      ${(() => {
                        const parts: string[] = [];
                        if (!z.enabled) {
                          parts.push(t(this.hass, "config_panel.zones_detail_disabled"));
                        }
                        if (z.exclusive) {
                          parts.push(t(this.hass, "config_panel.zones_detail_exclusive"));
                        }
                        parts.push(
                          t(this.hass, "config_panel.zones_detail_durations", {
                            eco: z.duration_eco_min,
                            normal: z.duration_normal_min,
                            extra: z.duration_extra_min,
                          })
                        );
                        const slotN = slotsPerZone[z.zone_id] ?? 0;
                        if (slotN === 1) {
                          parts.push(t(this.hass, "config_panel.zones_detail_added_slots_one"));
                        } else if (slotN > 1) {
                          parts.push(
                            t(this.hass, "config_panel.zones_detail_added_slots_many", { n: slotN })
                          );
                        }
                        if (outs === 1) {
                          parts.push(t(this.hass, "config_panel.zones_detail_outputs_one"));
                        } else if (outs > 1) {
                          parts.push(
                            t(this.hass, "config_panel.zones_detail_outputs_many", { n: outs })
                          );
                        }
                        return parts.join(" · ");
                      })()}
                    </p>
                  </div>
                  <div class="zone-list-actions">
                    <button
                      type="button"
                      class="btn-outline"
                      ?disabled=${runDisabled}
                      @click=${() => this._runZoneNow(z.zone_id)}
                    >
                      ${t(this.hass, "config_panel.zones_run_zone_now")}
                    </button>
                    <button
                      type="button"
                      class="btn-outline"
                      @click=${() => {
                        this._msg = undefined;
                        this._editDraft = this._cloneZone(z);
                      }}
                    >
                      ${t(this.hass, "config_panel.zones_edit")}
                    </button>
                  </div>
                </div>
              </div>
            `;
          })}
        </div>
      </ha-card>

      <ha-dialog
        .open=${this._addDialogOpen}
        header-title=${t(this.hass, "config_panel.zones_dialog_new_title")}
        @closed=${() => this._closeAddDialog()}
      >
        ${this._renderZoneFields(this._new)}
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead"></div>
            <div class="dialog-footer-actions">
              <button type="button" class="btn-outline" @click=${() => this._closeAddDialog()} ?disabled=${this._busy}>
                ${t(this.hass, "config_panel.zones_cancel")}
              </button>
              <button
                type="button"
                class="primary"
                ?disabled=${this._busy || !this._canSaveZone(this._new)}
                @click=${() => this._saveZone("add", undefined, { ...this._new, zone_id: "" })}
              >
                ${this._busy
                  ? t(this.hass, "config_panel.zones_adding")
                  : t(this.hass, "config_panel.zones_add_zone_btn")}
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>

      <ha-dialog
        .open=${edit !== null}
        header-title=${edit
          ? t(this.hass, "config_panel.zones_dialog_edit_title", {
              name: edit.name || edit.zone_id.slice(0, 8),
            })
          : ""}
        @closed=${() => this._closeEditDialog()}
      >
        ${edit ? this._renderZoneFields(edit) : nothing}
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead">
              ${edit
                ? html`
                    <button
                      type="button"
                      class="danger"
                      ?disabled=${this._busy}
                      @click=${() => {
                        if (!edit) return;
                        if (confirm(t(this.hass, "config_panel.zones_confirm_delete"))) {
                          void this._saveZone("delete", edit.zone_id);
                        }
                      }}
                    >
                      ${t(this.hass, "config_panel.zones_delete_zone")}
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
                ?disabled=${this._busy || !edit || !this._canSaveZone(edit)}
                @click=${() => edit && this._saveZone("update", edit.zone_id, edit)}
              >
                ${this._busy
                  ? t(this.hass, "config_panel.zones_saving_changes")
                  : t(this.hass, "config_panel.zones_save_changes")}
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>
    `;
  }
}

defineCustomElementOnce("si-view-zones", ViewZones);
