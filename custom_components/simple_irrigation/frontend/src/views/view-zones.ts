import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { runZoneNow, saveZone } from "../data/api";
import { renderEntityDatalist, renderNativeEntityField } from "../entity-input";
import { defineCustomElementOnce, formatApiError } from "../helpers";
import { t } from "../i18n";
import { formLayoutStyles } from "../form-layout-styles";
import { sharedStyles } from "../shared-styles";
import { slotInclusionCountPerZone } from "../timetable-model";
import type { HomeAssistant } from "../types";

const defaultDomains = ["switch", "input_boolean", "group", "valve"];

/** Entity domains the start target may live in — the start service does not
 *  always address the output itself (Hydrawise starts via its `binary_sensor`). */
const startTargetDomains = ["switch", "valve", "binary_sensor", "input_boolean", "number"];

const zoneStartPresets: Record<
  string,
  {
    start_service: string;
    duration_field: string;
    duration_unit: "minutes" | "seconds";
    /** Which entity belongs where — the start target is the only thing that
     *  differs between the presets, so spell it out per preset. */
    hintKey: string;
  }
> = {
  rainbird: {
    start_service: "rainbird.start_irrigation",
    duration_field: "duration",
    duration_unit: "minutes",
    hintKey: "config_panel.zones_start_hint_output_is_target",
  },
  rachio: {
    start_service: "rachio.start_watering",
    duration_field: "duration",
    duration_unit: "minutes",
    hintKey: "config_panel.zones_start_hint_output_is_target",
  },
  hydrawise: {
    start_service: "hydrawise.start_watering",
    duration_field: "duration",
    duration_unit: "minutes",
    hintKey: "config_panel.zones_start_hint_hydrawise",
  },
  bhyve: {
    start_service: "bhyve.start_watering",
    duration_field: "minutes",
    duration_unit: "minutes",
    hintKey: "config_panel.zones_start_hint_output_is_target",
  },
  opensprinkler: {
    start_service: "opensprinkler.run",
    duration_field: "run_seconds",
    duration_unit: "seconds",
    hintKey: "config_panel.zones_start_hint_output_is_target",
  },
};

type ZoneFilter = "all" | "enabled" | "issues";

interface ZoneRow {
  zone_id: string;
  name: string;
  switch_entity_ids: string[];
  enabled: boolean;
  duration_eco_min: number;
  duration_normal_min: number;
  duration_extra_min: number;
  exclusive: boolean;
  start_service: string;
  duration_field: string;
  duration_unit: string;
  start_entity_id: string;
}

export class ViewZones extends LitElement {
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
      .out-line {
        margin: 8px 0 0;
        font-size: 0.8rem;
        color: var(--secondary-text-color);
      }
      /* Local reset: form-layout adds align-self/margin to .btn-outline. */
      .card-header .header-actions .btn-outline,
      .card-header .header-actions .btn {
        margin-top: 0;
        align-self: center;
      }
    `,
  ];

  @state() private _busy = false;
  @state() private _msg?: string;
  @state() private _addDialogOpen = false;
  @state() private _editDraft: ZoneRow | null = null;
  @state() private _filter: ZoneFilter = "all";
  @state() private _expanded = new Set<string>();
  private _new: ZoneRow = this._blankZone();

  private _blankZone(): ZoneRow {
    return {
      zone_id: "",
      name: "",
      switch_entity_ids: [""],
      enabled: true,
      duration_eco_min: 10,
      duration_normal_min: 15,
      duration_extra_min: 20,
      exclusive: false,
      start_service: "",
      duration_field: "",
      duration_unit: "",
      start_entity_id: "",
    };
  }

  private _cloneZone(z: ZoneRow): ZoneRow {
    return { ...z, switch_entity_ids: [...z.switch_entity_ids] };
  }

  private _zonesFromInstallation(): ZoneRow[] {
    const z = this.installation?.zones as Record<string, Record<string, unknown>> | undefined;
    if (!z) return [];
    return Object.entries(z).map(([zone_id, o]) => {
      const raw = (o as Record<string, unknown>).switch_entity_ids;
      let ids: string[] = [];
      if (Array.isArray(raw)) ids = raw.map((x) => String(x)).filter(Boolean);
      else if (o.switch_entity_id) ids = [String(o.switch_entity_id)];
      if (ids.length === 0) ids = [""];
      return {
        zone_id,
        name: String(o.name ?? ""),
        switch_entity_ids: ids,
        enabled: Boolean(o.enabled ?? true),
        duration_eco_min: Number(o.duration_eco_min ?? 10),
        duration_normal_min: Number(o.duration_normal_min ?? 15),
        duration_extra_min: Number(o.duration_extra_min ?? 20),
        exclusive: Boolean(o.exclusive ?? false),
        start_service: String(o.start_service ?? ""),
        duration_field: String(o.duration_field ?? ""),
        duration_unit: String(o.duration_unit ?? ""),
        start_entity_id: String(o.start_entity_id ?? ""),
      };
    });
  }

  /** A zone has an "issue" when an output entity is missing or unavailable. */
  private _zoneIssue(z: ZoneRow): boolean {
    const outs = z.switch_entity_ids.filter(Boolean);
    if (outs.length === 0) return true;
    for (const eid of outs) {
      const st = this.hass.states[eid];
      if (!st || st.state === "unavailable" || st.state === "unknown") return true;
    }
    return false;
  }

  private _mode(): string {
    return String(this.installation?.mode ?? "normal");
  }

  private _closeAddDialog(): void {
    this._addDialogOpen = false;
    this._new = this._blankZone();
  }

  private _closeEditDialog(): void {
    this._editDraft = null;
  }

  private _canSaveZone(z: ZoneRow): boolean {
    return Boolean(z.name.trim() && z.switch_entity_ids.some((id) => id.trim()));
  }

  private _entityListId(): string {
    return `si-ent-z-${this.entryId}`;
  }

  private _startTargetListId(): string {
    return `si-ent-start-z-${this.entryId}`;
  }

  /** Which entity goes into "outputs" and which into "start target" — that pairing
   *  is the one thing users get wrong, because stopping always runs via the outputs. */
  private _renderPresetHint(z: ZoneRow): TemplateResult | typeof nothing {
    const cfg = zoneStartPresets[this._presetForZone(z)];
    if (!cfg) return nothing;
    return html`<p class="hint">
      <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
      ${t(this.hass, cfg.hintKey)}
    </p>`;
  }

  private _presetForZone(z: ZoneRow): string {
    if (!z.start_service && !z.duration_field && !z.duration_unit && !z.start_entity_id) {
      return "none";
    }
    for (const [preset, cfg] of Object.entries(zoneStartPresets)) {
      if (
        z.start_service.trim() === cfg.start_service &&
        z.duration_field.trim() === cfg.duration_field &&
        z.duration_unit.trim() === cfg.duration_unit
      ) {
        return preset;
      }
    }
    return "custom";
  }

  private _toggleExpand(id: string): void {
    const next = new Set(this._expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this._expanded = next;
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
        const map: Record<string, string> = {
          busy: "config_panel.zones_err_busy",
          zone_already_queued: "config_panel.zones_err_zone_already_queued",
          unknown_zone: "config_panel.zones_err_unknown_zone",
          zone_disabled: "config_panel.zones_err_zone_disabled",
          zone_no_outputs: "config_panel.zones_err_zone_no_outputs",
        };
        this._msg = map[err] ? t(this.hass, map[err]) : String(err);
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

  private async _toggleZoneEnabled(z: ZoneRow, enabled: boolean): Promise<void> {
    if (this._busy) return;
    await this._saveZone("update", z.zone_id, { ...z, enabled }, { keepDialogs: true });
  }

  private async _saveZone(
    action: "add" | "update" | "delete",
    zoneId: string | undefined,
    zone?: ZoneRow,
    opts?: { keepDialogs?: boolean }
  ): Promise<void> {
    this._busy = true;
    this._msg = undefined;
    this.requestUpdate();
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
          start_service: zone.start_service.trim(),
          duration_field: zone.duration_field.trim(),
          duration_unit: zone.duration_unit.trim(),
          start_entity_id: zone.start_entity_id.trim(),
        };
      }
      const res = await saveZone(this.hass, this.entryId, body);
      if (!res.success) {
        this._msg = formatApiError(res.error, this.hass);
      } else {
        if (!opts?.keepDialogs) {
          if (action === "add") this._closeAddDialog();
          if (action === "update" || action === "delete") this._closeEditDialog();
        }
        this.onSaved?.();
      }
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private _renderZoneFields(z: ZoneRow): TemplateResult {
    const modeInput = (
      key: "duration_eco_min" | "duration_normal_min" | "duration_extra_min",
      labelKey: string
    ): TemplateResult => html`
      <ha-input
        type="number"
        .label=${t(this.hass, labelKey)}
        .value=${String(z[key])}
        min="0"
        max="240"
        @input=${(e: Event) => {
          z[key] = parseInt((e.target as HTMLInputElement).value, 10) || 0;
        }}
      ></ha-input>
    `;
    return html`
      <div class="section-title">${t(this.hass, "config_panel.zones_field_name_title")}</div>
      <div class="field-block">
        <div class="field-row">
          <ha-input
            .label=${t(this.hass, "config_panel.zones_field_zone_name")}
            .value=${z.name}
            @input=${(e: Event) => {
              z.name = (e.target as HTMLInputElement).value;
              this.requestUpdate();
            }}
          ></ha-input>
        </div>
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.zones_outputs_title")}</span>
        <div class="field-row">
          <div class="entity-picker-rows">
            ${z.switch_entity_ids.map(
              (eid, i) => html`
                <div class="entity-picker-row">
                  ${renderNativeEntityField(
                    this.hass,
                    this._entityListId(),
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
                    ? html`<button
                        type="button"
                        class="row-remove"
                        @click=${() => {
                          z.switch_entity_ids.splice(i, 1);
                          if (z.switch_entity_ids.length === 0) z.switch_entity_ids = [""];
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
                z.switch_entity_ids = [...z.switch_entity_ids, ""];
                this.requestUpdate();
              }}
            >
              ${t(this.hass, "config_panel.zones_add_output")}
            </button>
          </div>
        </div>
        <details class="inline-help">
          <summary>
            <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
            ${t(this.hass, "config_panel.zones_outputs_title")}
          </summary>
          <p>${t(this.hass, "config_panel.zones_outputs_desc")}</p>
        </details>
      </div>

      <div class="section-title">${t(this.hass, "config_panel.zones_runtime_title")}</div>
      <div class="field-block">
        <div class="duration-row">
          ${modeInput("duration_eco_min", "config_panel.zones_duration_eco")}
          ${modeInput("duration_normal_min", "config_panel.zones_duration_normal")}
          ${modeInput("duration_extra_min", "config_panel.zones_duration_extra")}
        </div>
        <p class="hint">${t(this.hass, "config_panel.zones_runtime_desc")}</p>
      </div>

      <div class="section-title">${t(this.hass, "config_panel.zones_behavior_title")}</div>
      <div class="field-block">
        <div class="switch-rows">
          <div class="switch-row">
            <ha-switch
              .disabled=${this._busy}
              .checked=${z.enabled}
              @change=${(e: Event) => {
                z.enabled = Boolean((e.target as HTMLInputElement & { checked: boolean }).checked);
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
                z.exclusive = Boolean((e.target as HTMLInputElement & { checked: boolean }).checked);
                this.requestUpdate();
              }}
            ></ha-switch>
            <span class="switch-row-label">${t(this.hass, "config_panel.zones_exclusive")}</span>
          </div>
        </div>
        <p class="hint">${t(this.hass, "config_panel.zones_behavior_desc")}</p>
      </div>

      <div class="section-title">${t(this.hass, "config_panel.zones_advanced_title")}</div>
      <div class="field-block">
        <details class="inline-help" ?open=${Boolean(
          z.start_service || z.duration_field || z.duration_unit || z.start_entity_id
        )}>
          <summary>
            <ha-icon class="inline-help-icon" icon="mdi:tune"></ha-icon>
            ${t(this.hass, "config_panel.zones_advanced_summary")}
          </summary>
          <p>${t(this.hass, "config_panel.zones_advanced_desc")}</p>
          <div class="field-row">
            <label class="native-entity-label" for="si-preset-${z.zone_id || "new"}">
              ${t(this.hass, "config_panel.zones_start_preset")}
            </label>
            <select
              id="si-preset-${z.zone_id || "new"}"
              class="field-select"
              .value=${this._presetForZone(z)}
              @change=${(e: Event) => {
                const preset = (e.target as HTMLSelectElement).value;
                if (preset === "none") {
                  z.start_service = "";
                  z.duration_field = "";
                  z.duration_unit = "";
                  z.start_entity_id = "";
                } else if (preset !== "custom") {
                  const cfg = zoneStartPresets[preset];
                  if (cfg) {
                    z.start_service = cfg.start_service;
                    z.duration_field = cfg.duration_field;
                    z.duration_unit = cfg.duration_unit;
                  }
                }
                this.requestUpdate();
              }}
            >
              <option value="none">${t(this.hass, "config_panel.zones_start_preset_none")}</option>
              <option value="custom">${t(this.hass, "config_panel.zones_start_preset_custom")}</option>
              <option value="rainbird">Rain Bird</option>
              <option value="rachio">Rachio</option>
              <option value="hydrawise">Hydrawise</option>
              <option value="bhyve">B-hyve / Orbit</option>
              <option value="opensprinkler">OpenSprinkler</option>
            </select>
          </div>
          ${this._renderPresetHint(z)}
          <div class="field-row">
            <ha-input
              .label=${t(this.hass, "config_panel.zones_start_service")}
              .value=${z.start_service}
              @input=${(e: Event) => {
                z.start_service = (e.target as HTMLInputElement).value;
                this.requestUpdate();
              }}
            ></ha-input>
          </div>
          <div class="duration-row">
            <ha-input
              .label=${t(this.hass, "config_panel.zones_duration_field")}
              .value=${z.duration_field}
              @input=${(e: Event) => {
                z.duration_field = (e.target as HTMLInputElement).value;
                this.requestUpdate();
              }}
            ></ha-input>
            <select
              class="field-select"
              .value=${z.duration_unit || ""}
              @change=${(e: Event) => {
                z.duration_unit = (e.target as HTMLSelectElement).value;
                this.requestUpdate();
              }}
            >
              <option value="">${t(this.hass, "config_panel.zones_duration_unit_empty")}</option>
              <option value="minutes">${t(this.hass, "config_panel.zones_duration_unit_minutes")}</option>
              <option value="seconds">${t(this.hass, "config_panel.zones_duration_unit_seconds")}</option>
            </select>
          </div>
          <div class="field-row">
            ${renderNativeEntityField(
              this.hass,
              this._startTargetListId(),
              t(this.hass, "config_panel.zones_start_target_entity"),
              z.start_entity_id,
              (v) => {
                z.start_entity_id = v;
                this.requestUpdate();
              }
            )}
          </div>
          <p class="hint">${t(this.hass, "config_panel.zones_advanced_target_desc")}</p>
        </details>
      </div>
    `;
  }

  private _renderRow(z: ZoneRow, slotsPerZone: Record<string, number>): TemplateResult {
    const outs = z.switch_entity_ids.filter(Boolean);
    const issue = this._zoneIssue(z);
    const runDisabled = this._busy || !z.enabled || outs.length === 0;
    const mode = this._mode();
    const slotN = slotsPerZone[z.zone_id] ?? 0;
    const accentClass = !z.enabled ? "inactive" : issue ? "warn" : "";
    const expanded = this._expanded.has(z.zone_id);
    const firstOut = outs[0] ?? "";

    const runBtn = html`
      <button
        type="button"
        class="iconbtn"
        title=${t(this.hass, "config_panel.zones_run_zone_now")}
        aria-label=${t(this.hass, "config_panel.zones_run_zone_now")}
        ?disabled=${runDisabled}
        @click=${() => this._runZoneNow(z.zone_id)}
      >
        <ha-icon icon="mdi:play"></ha-icon>
      </button>
    `;
    const editBtn = html`
      <button
        type="button"
        class="iconbtn"
        title=${t(this.hass, "config_panel.zones_edit")}
        aria-label=${t(this.hass, "config_panel.zones_edit")}
        @click=${() => {
          this._msg = undefined;
          this._editDraft = this._cloneZone(z);
        }}
      >
        <ha-icon icon="mdi:pencil"></ha-icon>
      </button>
    `;

    return html`
      <div class="compact-row ${accentClass}">
        <div class="compact-row-header">
          <ha-switch
            .disabled=${this._busy}
            .checked=${z.enabled}
            @change=${(e: Event) =>
              this._toggleZoneEnabled(
                z,
                Boolean((e.target as HTMLInputElement & { checked: boolean }).checked)
              )}
          ></ha-switch>
          <div class="compact-row-main">
            <div class="compact-row-title">
              <span class="ellipsis">${z.name || z.zone_id.slice(0, 8)}</span>
              ${!z.enabled
                ? html`<span class="badge">${t(this.hass, "config_panel.zones_detail_disabled")}</span>`
                : nothing}
              ${z.exclusive
                ? html`<span class="badge badge-primary badge-dot">${t(
                    this.hass,
                    "config_panel.zones_detail_exclusive"
                  )}</span>`
                : nothing}
              ${issue
                ? html`<span class="preflight-badge would_skip"
                    ><ha-icon icon="mdi:alert-outline"></ha-icon>${t(
                      this.hass,
                      "config_panel.zones_issue_output_unavailable"
                    )}</span
                  >`
                : nothing}
            </div>
            <div class="meta-line">
              <span class="meta">
                <ha-icon icon="mdi:timer-outline"></ha-icon>
                ${["eco", "normal", "extra"].map((m, i) => {
                  const val =
                    m === "eco"
                      ? z.duration_eco_min
                      : m === "extra"
                        ? z.duration_extra_min
                        : z.duration_normal_min;
                  const sep = i > 0 ? " / " : "";
                  return mode === m
                    ? html`${sep}<strong>${val}</strong>`
                    : html`${sep}${val}`;
                })}
                ${" "}${t(this.hass, "config_panel.zones_min_suffix")}
              </span>
              ${slotN > 0
                ? html`<span class="meta"
                    ><ha-icon icon="mdi:format-list-bulleted"></ha-icon>${slotN === 1
                      ? t(this.hass, "config_panel.zones_in_cycles_one")
                      : t(this.hass, "config_panel.zones_in_cycles_many", { n: slotN })}</span
                  >`
                : nothing}
              ${firstOut
                ? html`<span class="meta ellipsis"
                    ><ha-icon icon="mdi:toggle-switch-outline"></ha-icon>${firstOut}</span
                  >`
                : nothing}
            </div>
          </div>
          <div class="icon-group hide-narrow" role="group">
            ${runBtn}${editBtn}
          </div>
          <button
            type="button"
            class="iconbtn only-narrow"
            aria-expanded=${expanded ? "true" : "false"}
            aria-label=${t(this.hass, "config_panel.zones_edit")}
            @click=${() => this._toggleExpand(z.zone_id)}
          >
            <ha-icon icon=${expanded ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>
          </button>
        </div>
        ${expanded
          ? html`<div class="compact-row-detail only-narrow">
              ${firstOut ? html`<p class="out-line">${outs.join(", ")}</p>` : nothing}
              <div class="drawer-actions">
                <button type="button" class="btn-outline" ?disabled=${runDisabled} @click=${() => this._runZoneNow(z.zone_id)}>
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
            </div>`
          : nothing}
      </div>
    `;
  }

  protected render() {
    const all = this._zonesFromInstallation();
    const issuesCount = all.filter((z) => this._zoneIssue(z)).length;
    const filtered = all.filter((z) => {
      if (this._filter === "enabled") return z.enabled;
      if (this._filter === "issues") return this._zoneIssue(z);
      return true;
    });
    const slotsPerZone = slotInclusionCountPerZone(this.installation ?? {});
    const edit = this._editDraft;

    return html`
      ${renderEntityDatalist(this.hass, this._entityListId(), this.outputEntityDomains ?? defaultDomains)}
      ${renderEntityDatalist(this.hass, this._startTargetListId(), startTargetDomains)}
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:vector-square"></ha-icon>
          ${t(this.hass, "config_panel.zones_card_title")}
          <div class="header-actions">
            <div class="segmented" role="group" aria-label=${t(this.hass, "config_panel.zones_filter_all")}>
              <button
                type="button"
                class=${this._filter === "all" ? "selected" : ""}
                @click=${() => (this._filter = "all")}
              >
                ${t(this.hass, "config_panel.zones_filter_all")}
              </button>
              <button
                type="button"
                class=${this._filter === "enabled" ? "selected" : ""}
                @click=${() => (this._filter = "enabled")}
              >
                ${t(this.hass, "config_panel.zones_filter_enabled")}
              </button>
              <button
                type="button"
                class=${this._filter === "issues" ? "selected" : ""}
                @click=${() => (this._filter = "issues")}
              >
                ${t(this.hass, "config_panel.zones_filter_issues")}
                ${issuesCount > 0 ? html`<span class="count">${issuesCount}</span>` : nothing}
              </button>
            </div>
            <button type="button" class="btn hide-narrow" @click=${() => (this._addDialogOpen = true)}>
              ${t(this.hass, "config_panel.zones_add_zone")}
            </button>
          </div>
        </div>
        <div class="card-content">
          ${this._msg ? html`<div class="error">${this._msg}</div>` : nothing}
          <details class="inline-help">
            <summary>
              <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
              ${t(this.hass, "config_panel.zones_help_summary")}
            </summary>
            <p>${t(this.hass, "config_panel.zones_intro")}</p>
          </details>

          ${all.length === 0
            ? html`<div class="empty-state">
                <ha-icon icon="mdi:vector-square"></ha-icon>
                <p>${t(this.hass, "config_panel.zones_empty")}</p>
                <button type="button" class="btn" @click=${() => (this._addDialogOpen = true)}>
                  ${t(this.hass, "config_panel.zones_add_zone")}
                </button>
              </div>`
            : filtered.length === 0
              ? html`<div class="empty-state">
                  <ha-icon icon="mdi:filter-variant-remove"></ha-icon>
                  <p>${t(this.hass, "config_panel.zones_empty_filtered")}</p>
                  <button type="button" class="btn-outline" @click=${() => (this._filter = "all")}>
                    ${t(this.hass, "config_panel.zones_filter_all")}
                  </button>
                </div>`
              : filtered.map((z) => this._renderRow(z, slotsPerZone))}

          <details class="inline-help" style="margin-top:14px">
            <summary>
              <ha-icon class="inline-help-icon" icon="mdi:robot-outline"></ha-icon>
              ${t(this.hass, "config_panel.settings_automations_summary")}
            </summary>
            <p>${t(this.hass, "config_panel.zones_intro_automation")}</p>
          </details>
        </div>
      </ha-card>

      <button
        type="button"
        class="fab"
        aria-label=${t(this.hass, "config_panel.zones_add_zone")}
        title=${t(this.hass, "config_panel.zones_add_zone")}
        @click=${() => (this._addDialogOpen = true)}
      >
        <ha-icon icon="mdi:plus"></ha-icon>
      </button>

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
                class="btn"
                ?disabled=${this._busy || !this._canSaveZone(this._new)}
                @click=${() => this._saveZone("add", undefined, { ...this._new, zone_id: "" })}
              >
                ${this._busy ? t(this.hass, "config_panel.zones_adding") : t(this.hass, "config_panel.zones_add_zone_btn")}
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>

      <ha-dialog
        .open=${edit !== null}
        header-title=${edit
          ? t(this.hass, "config_panel.zones_dialog_edit_title", { name: edit.name || edit.zone_id.slice(0, 8) })
          : ""}
        @closed=${() => this._closeEditDialog()}
      >
        ${edit ? this._renderZoneFields(edit) : nothing}
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead">
              ${edit
                ? html`<button
                    type="button"
                    class="btn-danger"
                    ?disabled=${this._busy}
                    @click=${() => {
                      if (edit && confirm(t(this.hass, "config_panel.zones_confirm_delete"))) {
                        void this._saveZone("delete", edit.zone_id);
                      }
                    }}
                  >
                    ${t(this.hass, "config_panel.zones_delete_zone")}
                  </button>`
                : nothing}
            </div>
            <div class="dialog-footer-actions">
              <button type="button" class="btn-outline" @click=${() => this._closeEditDialog()} ?disabled=${this._busy}>
                ${t(this.hass, "config_panel.zones_cancel")}
              </button>
              <button
                type="button"
                class="btn"
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
