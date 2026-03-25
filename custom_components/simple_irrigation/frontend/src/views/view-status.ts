import { LitElement, html, css, nothing } from "lit";
import { state } from "lit/decorators.js";
import { defineCustomElementOnce } from "../helpers";
import { t } from "../i18n";
import type { HomeAssistant } from "../types";

const BUSY_STATES = new Set(["preparing", "running", "stopping"]);

export class ViewStatus extends LitElement {
  static properties = {
    hass: { attribute: false },
    runState: { type: Object },
    installation: { type: Object },
  };

  hass!: HomeAssistant;
  runState!: Record<string, unknown>;
  installation?: Record<string, unknown>;

  @state() private _showRaw = false;

  static styles = css`
    ha-card {
      margin-bottom: 16px;
    }
    .muted {
      font-size: 0.875rem;
      color: var(--secondary-text-color);
      line-height: 1.45;
      margin: 0 0 12px;
    }
    .summary {
      margin: 0 0 12px;
      line-height: 1.5;
    }
    .summary strong {
      font-weight: 600;
    }
    ul.inline {
      margin: 8px 0 0;
      padding-left: 1.25rem;
    }
    pre {
      overflow: auto;
      font-size: 12px;
      margin: 0;
      white-space: pre-wrap;
    }
    button.toggle-raw {
      margin-top: 12px;
      padding: 8px 14px;
      border-radius: 4px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      cursor: pointer;
      font-size: 0.9rem;
    }
  `;

  private _zoneName(zoneId: string): string {
    const zones = this.installation?.zones as Record<string, Record<string, unknown>> | undefined;
    const z = zones?.[zoneId];
    return z ? String(z.name ?? zoneId) : zoneId;
  }

  private _zoneList(ids: string[]): string {
    return ids.map((id) => this._zoneName(id)).join(", ");
  }

  protected render() {
    const rs = this.runState ?? {};
    const stateStr = String(rs.run_state ?? "idle");
    const busy = BUSY_STATES.has(stateStr);
    const manual = Boolean(rs.manual_run);
    const active = Array.isArray(rs.active_zone_ids)
      ? (rs.active_zone_ids as string[])
      : [];
    const queued = Array.isArray(rs.queued_zone_ids)
      ? (rs.queued_zone_ids as string[])
      : [];
    const lastErr = rs.last_error ? String(rs.last_error) : "";

    return html`
      <ha-card .header=${t(this.hass, "panel.status_card_title")}>
        <div class="card-content">
          <p class="muted">${t(this.hass, "panel.status_intro")}</p>
          <div class="summary">
            <p>
              <strong>${t(this.hass, "panel.status_state_label")}</strong>
              ${busy
                ? t(this.hass, "panel.status_state_run_in_progress")
                : stateStr === "error"
                  ? t(this.hass, "panel.status_state_error")
                  : t(this.hass, "panel.status_state_idle")}
            </p>
            ${busy && manual
              ? html`<p>
                  <strong>${t(this.hass, "panel.status_manual_label")}</strong>
                  ${t(this.hass, "panel.status_manual_text")}
                </p>`
              : busy && !manual
                ? html`<p>
                    <strong>${t(this.hass, "panel.status_scheduled_label")}</strong>
                    ${t(this.hass, "panel.status_scheduled_text")}
                  </p>`
                : html`<p class="muted">${t(this.hass, "panel.status_idle_hint")}</p>`}
            ${active.length
              ? html`<p>
                  <strong>${t(this.hass, "panel.status_active_zones")}</strong>
                  ${this._zoneList(active)}
                </p>`
              : nothing}
            ${queued.length
              ? html`<p>
                  <strong>${t(this.hass, "panel.status_queued_zones")}</strong>
                  ${this._zoneList(queued)}
                </p>`
              : nothing}
            ${lastErr
              ? html`<p>
                  <strong>${t(this.hass, "panel.status_last_error")}</strong>
                  ${lastErr}
                </p>`
              : nothing}
            <p class="muted" style="margin-top:12px">
              ${t(this.hass, "panel.status_error_clear_hint")}
            </p>
          </div>
          <button
            type="button"
            class="toggle-raw"
            @click=${() => {
              this._showRaw = !this._showRaw;
            }}
          >
            ${this._showRaw
              ? t(this.hass, "panel.status_hide_raw")
              : t(this.hass, "panel.status_show_raw")}
          </button>
          ${this._showRaw
            ? html`<pre>${JSON.stringify(this.runState, null, 2)}</pre>`
            : nothing}
        </div>
      </ha-card>
    `;
  }
}

defineCustomElementOnce("si-view-status", ViewStatus);
