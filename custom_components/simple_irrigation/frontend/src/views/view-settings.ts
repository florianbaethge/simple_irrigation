import { LitElement, html, css, nothing } from "lit";
import { state } from "lit/decorators.js";
import {
  fetchPanelState,
  listSimpleIrrigationEntries,
  saveGlobal,
} from "../data/api";
import { renderNativeEntityField } from "../entity-input";
import {
  GUARD_ENTITY_DOMAINS,
  guardsForSave,
  guardsIncomplete,
  normalizeGuards,
  renderGuardList,
  type Guard,
} from "../guard-list-editor";
import { defineCustomElementOnce, formatApiError } from "../helpers";
import { t } from "../i18n";
import { formLayoutStyles } from "../form-layout-styles";
import { sharedStyles } from "../shared-styles";
import type { HomeAssistant } from "../types";

export class ViewSettings extends LitElement {
  static properties = {
    hass: { attribute: false },
    entryId: { type: String },
    installation: { type: Object },
    runState: { type: Object },
    outputEntityDomains: { type: Array },
    onSaved: { attribute: false },
  };

  hass!: HomeAssistant;
  entryId!: string;
  installation!: Record<string, unknown>;
  runState?: Record<string, unknown>;
  outputEntityDomains?: string[];
  onSaved?: () => void;

  static styles = [
    sharedStyles,
    formLayoutStyles,
    css`
      .save-bar {
        position: sticky;
        bottom: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        margin: 8px -4px 0;
        background: var(--card-background-color);
        border-top: 1px solid var(--divider-color);
        border-radius: 0 0 12px 12px;
        box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
        z-index: 3;
      }
      .save-bar .dirty-note {
        color: var(--warning-color, #b85c00);
        font-size: 0.85rem;
      }
      .save-bar .btn {
        margin-left: auto;
      }
      pre.raw {
        overflow: auto;
        font-size: 12px;
        margin: 8px 0 0;
        white-space: pre-wrap;
        max-height: 320px;
      }
      .field-block {
        margin-bottom: 22px;
      }
    `,
  ];

  @state() private _busy = false;
  @state() private _msg?: string;
  @state() private _dirty = false;
  @state() private _isDefault = false;
  @state() private _defaultConfirmOpen = false;
  @state() private _showRaw = false;
  private _defaultConfirmOtherName = "";

  private _name = "";
  private _mode = "normal";
  private _maxParallel = 2;
  private _preStart: string[] = [];
  private _preStartDelaySec = 10;
  private _preStartScript = "";
  private _preStartScriptTimeoutSec = 300;
  private _postRunScript = "";
  private _postRunScriptTimeoutSec = 300;
  @state() private _guards: Guard[] = [];

  protected willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has("installation") && this.installation && !this._dirty) {
      this._loadFromInstallation();
    }
  }

  private _loadFromInstallation(): void {
    const inst = this.installation ?? {};
    this._name = String(inst.name ?? "");
    this._mode = String(inst.mode ?? "normal");
    this._maxParallel = Number(inst.max_parallel_zones ?? 2);
    this._isDefault = Boolean(inst.is_default ?? false);
    const ps = Array.isArray(inst.pre_start_switches)
      ? (inst.pre_start_switches as string[]).filter(Boolean)
      : [];
    this._preStart = ps.length ? [...ps] : [""];
    const d = Number(inst.pre_start_delay_sec ?? 10);
    this._preStartDelaySec = Number.isFinite(d) ? Math.max(0, Math.min(3600, Math.round(d))) : 10;
    this._preStartScript = String(inst.pre_start_script ?? "");
    const st = Number(inst.pre_start_script_timeout_sec ?? 300);
    this._preStartScriptTimeoutSec = Number.isFinite(st)
      ? Math.max(1, Math.min(3600, Math.round(st)))
      : 300;
    this._postRunScript = String(inst.post_run_script ?? "");
    const pt = Number(inst.post_run_script_timeout_sec ?? 300);
    this._postRunScriptTimeoutSec = Number.isFinite(pt)
      ? Math.max(1, Math.min(3600, Math.round(pt)))
      : 300;
    this._guards = normalizeGuards(inst.guards);
    this._dirty = false;
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("beforeunload", this._beforeUnload);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("beforeunload", this._beforeUnload);
  }

  private _beforeUnload = (e: BeforeUnloadEvent): void => {
    if (this._dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  };

  private _markDirty(): void {
    if (!this._dirty) {
      this._dirty = true;
    }
  }

  private async _save(): Promise<void> {
    if (guardsIncomplete(this._guards)) {
      this._msg = t(this.hass, "config_panel.schedule_err_guards_incomplete");
      this.requestUpdate();
      return;
    }
    this._busy = true;
    this._msg = undefined;
    this.requestUpdate();
    try {
      const res = await saveGlobal(this.hass, this.entryId, {
        name: this._name,
        pre_start_switches: this._preStart.filter(Boolean),
        pre_start_delay_sec: this._preStartDelaySec,
        pre_start_script: this._preStartScript.trim(),
        pre_start_script_timeout_sec: this._preStartScriptTimeoutSec,
        post_run_script: this._postRunScript.trim(),
        post_run_script_timeout_sec: this._postRunScriptTimeoutSec,
        mode: this._mode,
        max_parallel_zones: this._maxParallel,
        is_default: this._isDefault,
        guards: guardsForSave(this._guards),
      });
      if (!res.success) {
        this._msg = formatApiError(res.error, this.hass);
      } else {
        this._dirty = false;
        this.onSaved?.();
      }
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private _closeDefaultConfirm(): void {
    this._defaultConfirmOpen = false;
    this._defaultConfirmOtherName = "";
  }

  private async _onDefaultToggle(checked: boolean): Promise<void> {
    this._markDirty();
    if (!checked) {
      this._isDefault = false;
      return;
    }
    try {
      const entries = await listSimpleIrrigationEntries(this.hass);
      for (const e of entries) {
        if (e.entry_id === this.entryId) continue;
        const st = await fetchPanelState(this.hass, e.entry_id);
        const inst = st.installation as Record<string, unknown>;
        if (Boolean(inst.is_default ?? false)) {
          this._defaultConfirmOtherName = String(inst.name ?? e.title);
          this._defaultConfirmOpen = true;
          return;
        }
      }
      this._isDefault = true;
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
    }
  }

  private _openIntegrationPage(): void {
    // Removal of an installation is the standard HA config-entry flow.
    window.open("/config/integrations/integration/simple_irrigation", "_blank", "noopener");
  }

  protected render() {
    const domains = this.outputEntityDomains ?? ["switch", "input_boolean", "group", "valve"];

    return html`
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:cog-outline"></ha-icon>
          ${t(this.hass, "config_panel.general_card_settings")}
        </div>
        <div class="card-content">
          ${this._msg ? html`<div class="error">${this._msg}</div>` : nothing}

          <div class="section-title">${t(this.hass, "config_panel.settings_section_general")}</div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_installation_name")}</span>
            <div class="field-row">
              <ha-input
                .label=${t(this.hass, "config_panel.general_field_name")}
                .value=${this._name}
                @input=${(e: Event) => {
                  this._name = (e.target as HTMLInputElement).value;
                  this._markDirty();
                }}
              ></ha-input>
            </div>
            <p class="hint">${t(this.hass, "config_panel.settings_name_hint")}</p>
          </div>

          <div class="section-title">${t(this.hass, "config_panel.settings_section_pump")}</div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_pre_start_script_title")}</span>
            <div class="field-row">
              ${renderNativeEntityField(
                this.hass,
                ["script"],
                t(this.hass, "config_panel.general_pre_start_script_field"),
                this._preStartScript,
                (v) => {
                  this._preStartScript = v;
                  this._markDirty();
                  this.requestUpdate();
                },
                { placeholderKey: "config_panel.entity_placeholder_script" }
              )}
            </div>
            <details class="inline-help">
              <summary>
                <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
                ${t(this.hass, "config_panel.general_pre_start_script_title")}
              </summary>
              <p>${t(this.hass, "config_panel.general_pre_start_script_desc")}</p>
            </details>
          </div>
          ${this._preStartScript.trim()
            ? html`<div class="field-block">
                <span class="field-title">
                  ${t(this.hass, "config_panel.general_pre_start_script_timeout_title")}
                </span>
                <div class="field-row">
                  <ha-input
                    type="number"
                    .label=${t(this.hass, "config_panel.general_pre_start_script_timeout_field")}
                    .value=${String(this._preStartScriptTimeoutSec)}
                    min="1"
                    max="3600"
                    @input=${(e: Event) => {
                      this._preStartScriptTimeoutSec = Math.max(
                        1,
                        Math.min(3600, parseInt((e.target as HTMLInputElement).value, 10) || 1)
                      );
                      this._markDirty();
                    }}
                  ></ha-input>
                </div>
                <p class="hint">
                  ${t(this.hass, "config_panel.settings_pre_start_script_timeout_hint")}
                </p>
              </div>`
            : nothing}
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_pre_start_title")}</span>
            <div class="field-row">
              <div class="entity-picker-rows">
                ${this._preStart.map(
                  (eid, i) => html`
                    <div class="entity-picker-row">
                      ${renderNativeEntityField(
                        this.hass,
                        domains,
                        i === 0
                          ? t(this.hass, "config_panel.general_pre_start_output_n")
                          : t(this.hass, "config_panel.general_pre_start_output_i", { n: i + 1 }),
                        eid,
                        (v) => {
                          const next = [...this._preStart];
                          next[i] = v;
                          this._preStart = next;
                          this._markDirty();
                          this.requestUpdate();
                        }
                      )}
                      ${this._preStart.length > 1
                        ? html`<button
                            type="button"
                            class="row-remove"
                            @click=${() => {
                              this._preStart.splice(i, 1);
                              if (this._preStart.length === 0) this._preStart = [""];
                              this._markDirty();
                              this.requestUpdate();
                            }}
                          >
                            ${t(this.hass, "config_panel.general_remove")}
                          </button>`
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
                  ${t(this.hass, "config_panel.general_add_pre_start")}
                </button>
              </div>
            </div>
            <details class="inline-help">
              <summary>
                <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
                ${t(this.hass, "config_panel.general_pre_start_title")}
              </summary>
              <p>${t(this.hass, "config_panel.general_pre_start_desc")}</p>
            </details>
          </div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_pre_start_delay_title")}</span>
            <div class="field-row">
              <ha-input
                type="number"
                .label=${t(this.hass, "config_panel.general_pre_start_delay_field")}
                .value=${String(this._preStartDelaySec)}
                min="0"
                max="3600"
                @input=${(e: Event) => {
                  const raw = parseInt((e.target as HTMLInputElement).value, 10);
                  // Not `|| 0`: a typed 0 is falsy and must survive as 0, which
                  // is the value that means "open the zone at the scheduled time".
                  this._preStartDelaySec = Number.isNaN(raw)
                    ? 0
                    : Math.max(0, Math.min(3600, raw));
                  this._markDirty();
                }}
              ></ha-input>
            </div>
            <p class="hint">${t(this.hass, "config_panel.settings_pre_start_delay_hint")}</p>
          </div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_post_run_script_title")}</span>
            <div class="field-row">
              ${renderNativeEntityField(
                this.hass,
                ["script"],
                t(this.hass, "config_panel.general_post_run_script_field"),
                this._postRunScript,
                (v) => {
                  this._postRunScript = v;
                  this._markDirty();
                  this.requestUpdate();
                },
                { placeholderKey: "config_panel.entity_placeholder_script" }
              )}
            </div>
            <details class="inline-help">
              <summary>
                <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
                ${t(this.hass, "config_panel.general_post_run_script_title")}
              </summary>
              <p>${t(this.hass, "config_panel.general_post_run_script_desc")}</p>
            </details>
          </div>
          ${this._postRunScript.trim()
            ? html`<div class="field-block">
                <span class="field-title">
                  ${t(this.hass, "config_panel.general_post_run_script_timeout_title")}
                </span>
                <div class="field-row">
                  <ha-input
                    type="number"
                    .label=${t(this.hass, "config_panel.general_post_run_script_timeout_field")}
                    .value=${String(this._postRunScriptTimeoutSec)}
                    min="1"
                    max="3600"
                    @input=${(e: Event) => {
                      this._postRunScriptTimeoutSec = Math.max(
                        1,
                        Math.min(3600, parseInt((e.target as HTMLInputElement).value, 10) || 1)
                      );
                      this._markDirty();
                    }}
                  ></ha-input>
                </div>
                <p class="hint">
                  ${t(this.hass, "config_panel.settings_post_run_script_timeout_hint")}
                </p>
              </div>`
            : nothing}

          <div class="section-title">${t(this.hass, "config_panel.settings_section_watering")}</div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_watering_mode")}</span>
            <div class="field-row">
              <select
                class="field-select"
                @change=${(e: Event) => {
                  this._mode = (e.target as HTMLSelectElement).value;
                  this._markDirty();
                }}
              >
                ${["eco", "normal", "extra"].map(
                  (m) =>
                    html`<option value=${m} ?selected=${this._mode === m}>
                      ${t(this.hass, `config_panel.general_mode_${m}`)}
                    </option>`
                )}
              </select>
            </div>
          </div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_max_parallel")}</span>
            <div class="field-row">
              <ha-input
                type="number"
                .label=${t(this.hass, "config_panel.general_max_parallel_field")}
                .value=${String(this._maxParallel)}
                min="1"
                max="16"
                @input=${(e: Event) => {
                  this._maxParallel = Math.max(
                    1,
                    Math.min(16, parseInt((e.target as HTMLInputElement).value, 10) || 1)
                  );
                  this._markDirty();
                }}
              ></ha-input>
            </div>
            <p class="hint">${t(this.hass, "config_panel.settings_max_parallel_hint")}</p>
          </div>

          <div class="section-title">${t(this.hass, "config_panel.settings_section_guards")}</div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.guards_section_title")}</span>
            <p class="field-desc">${t(this.hass, "config_panel.guards_section_desc")}</p>
            ${renderGuardList(
              this.hass,
              GUARD_ENTITY_DOMAINS,
              this._guards,
              (next) => {
                this._guards = next;
                this._markDirty();
              }
            )}
            <p class="hint">${t(this.hass, "config_panel.settings_guards_hint")}</p>
          </div>

          <div class="section-title">${t(this.hass, "config_panel.general_default_section")}</div>
          <div class="field-block">
            <div class="switch-row">
              <ha-switch
                .disabled=${this._busy}
                .checked=${this._isDefault}
                @change=${(e: Event) => {
                  const tgt = e.target as HTMLInputElement & { checked: boolean };
                  void this._onDefaultToggle(Boolean(tgt.checked));
                }}
              ></ha-switch>
              <span class="switch-row-label">${t(this.hass, "config_panel.general_default_toggle_label")}</span>
            </div>
            <p class="hint">${t(this.hass, "config_panel.settings_default_hint")}</p>
          </div>

          <div class="section-title">${t(this.hass, "config_panel.settings_section_automations")}</div>
          <details class="inline-help">
            <summary>
              <ha-icon class="inline-help-icon" icon="mdi:robot-outline"></ha-icon>
              ${t(this.hass, "config_panel.settings_automations_summary")}
            </summary>
            <div class="help-body">
              <p style="border:0;padding:0;margin:0 0 8px;background:none">
                ${t(this.hass, "config_panel.settings_automations_body")}
              </p>
              <div><code>config_entry_id</code>: <code>${this.entryId}</code></div>
            </div>
          </details>
          <details class="inline-help" @toggle=${(e: Event) => {
            this._showRaw = (e.target as HTMLDetailsElement).open;
          }}>
            <summary>
              <ha-icon class="inline-help-icon" icon="mdi:code-json"></ha-icon>
              ${t(this.hass, "config_panel.settings_diagnostics_summary")}
            </summary>
            ${this._showRaw
              ? html`<pre class="raw">${JSON.stringify(this.runState ?? {}, null, 2)}</pre>`
              : nothing}
          </details>

          <div class="section-title">${t(this.hass, "config_panel.settings_manage_title")}</div>
          <p class="hint">${t(this.hass, "config_panel.settings_manage_desc")}</p>
          <button type="button" class="btn-outline" @click=${() => this._openIntegrationPage()}>
            ${t(this.hass, "config_panel.settings_open_integration")}
          </button>
        </div>

        <div class="save-bar">
          ${this._dirty
            ? html`<span class="dirty-note">${t(this.hass, "config_panel.settings_unsaved")}</span>`
            : html`<span class="muted">${t(this.hass, "config_panel.settings_all_saved")}</span>`}
          <button type="button" class="btn" ?disabled=${this._busy || !this._dirty} @click=${() => this._save()}>
            ${this._busy ? t(this.hass, "config_panel.general_saving") : t(this.hass, "config_panel.general_save")}
          </button>
        </div>
      </ha-card>

      <ha-dialog
        .open=${this._defaultConfirmOpen}
        header-title=${t(this.hass, "config_panel.general_default_confirm_title")}
        @closed=${() => this._closeDefaultConfirm()}
      >
        <p>
          ${t(this.hass, "config_panel.general_default_confirm_body", {
            name: this._name || this.entryId,
            other: this._defaultConfirmOtherName,
          })}
        </p>
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead"></div>
            <div class="dialog-footer-actions">
              <button type="button" class="btn-outline" @click=${() => this._closeDefaultConfirm()}>
                ${t(this.hass, "config_panel.general_default_confirm_cancel")}
              </button>
              <button
                type="button"
                class="btn"
                @click=${() => {
                  this._isDefault = true;
                  this._markDirty();
                  this._closeDefaultConfirm();
                }}
              >
                ${t(this.hass, "config_panel.general_default_confirm_ok")}
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>
    `;
  }
}

defineCustomElementOnce("si-view-settings", ViewSettings);
