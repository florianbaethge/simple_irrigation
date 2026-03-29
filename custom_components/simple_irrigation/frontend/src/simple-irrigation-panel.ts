import { LitElement, html, css, nothing } from "lit";
import {
  fetchPanelState,
  listSimpleIrrigationEntries,
  type ConfigEntryRow,
} from "./data/api";
import { defineCustomElementOnce, navigate } from "./helpers";
import { t, TRANSLATION_DOMAIN } from "./i18n";
import { loadHaPanelElements } from "./load-ha-elements";
import { exportPath, getPath } from "./navigation";
import { panelStyles } from "./styles";
import type { HomeAssistant, PanelStateResult } from "./types";
import "./views/view-general";
import "./views/view-schedule";
import "./views/view-status";
import "./views/view-zones";

const VERSION = "0.1.3";

export class SimpleIrrigationPanel extends LitElement {
  static properties = {
    hass: { attribute: false },
    narrow: { type: Boolean, reflect: true },
    route: { attribute: false },
    panel: { attribute: false },
  };

  hass?: HomeAssistant;
  narrow = false;
  route?: unknown;
  panel?: unknown;

  static styles = panelStyles;

  private _state: PanelStateResult | null = null;
  private _loading = true;
  private _error?: string;
  private _entries: Array<ConfigEntryRow & { plan_enabled: boolean }> = [];
  private _entriesLoading = false;

  private _runStateUnsub?: () => Promise<void>;
  private _runStateDebounceTimer?: number;
  private _runStatePollTimer?: number;
  private _watchedRunningEntity?: string;
  private _watchedEntryId?: string;

  /** Language we last loaded `config_panel` category for (HA does not auto-load it for `panel_custom`). */
  private _panelI18nLang?: string;
  /** After first successful panel translation fetch (or no loader API). */
  private _initialPanelI18nDone = false;

  setProperties(props: Record<string, unknown>): void {
    if (props.hass !== undefined) {
      const next = props.hass as HomeAssistant;
      if (this.hass?.language !== next?.language) {
        this._panelI18nLang = undefined;
      }
      this.hass = next;
      void this._ensurePanelI18n();
    }
    if (props.narrow !== undefined) this.narrow = Boolean(props.narrow);
    if (props.route !== undefined) this.route = props.route;
    if (props.panel !== undefined) this.panel = props.panel;
    this.requestUpdate();
  }

  private async _ensurePanelI18n(): Promise<void> {
    if (!this.hass) {
      return;
    }
    if (!this.hass.loadBackendTranslation) {
      if (!this._initialPanelI18nDone) {
        this._initialPanelI18nDone = true;
        this.requestUpdate();
      }
      return;
    }
    const lang = this.hass.language ?? "en";
    if (this._panelI18nLang === lang) {
      if (!this._initialPanelI18nDone) {
        this._initialPanelI18nDone = true;
        this.requestUpdate();
      }
      return;
    }
    try {
      await this.hass.loadBackendTranslation("config_panel", TRANSLATION_DOMAIN);
    } catch {
      /* localize may keep returning missing keys */
    }
    this._panelI18nLang = lang;
    if (!this._initialPanelI18nDone) {
      this._initialPanelI18nDone = true;
    }
    this.requestUpdate();
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("location-changed", this._locChanged);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("location-changed", this._locChanged);
    void this._teardownRunStateListeners();
  }

  private _locChanged = (): void => {
    if (!window.location.pathname.includes("simple-irrigation")) return;
    this._reloadPath();
  };

  private _clearRunStateDebounce(): void {
    if (this._runStateDebounceTimer !== undefined) {
      window.clearTimeout(this._runStateDebounceTimer);
      this._runStateDebounceTimer = undefined;
    }
  }

  private async _teardownRunStateListeners(): Promise<void> {
    this._clearRunStateDebounce();
    if (this._runStatePollTimer !== undefined) {
      window.clearInterval(this._runStatePollTimer);
      this._runStatePollTimer = undefined;
    }
    if (this._runStateUnsub) {
      try {
        await this._runStateUnsub();
      } catch {
        /* ignore */
      }
      this._runStateUnsub = undefined;
    }
    this._watchedRunningEntity = undefined;
    this._watchedEntryId = undefined;
  }

  private _scheduleSilentRefresh(entryId: string): void {
    this._clearRunStateDebounce();
    this._runStateDebounceTimer = window.setTimeout(() => {
      this._runStateDebounceTimer = undefined;
      void this._loadState(entryId, { silent: true });
    }, 200);
  }

  private async _syncRunStateListeners(entryId: string): Promise<void> {
    if (!this.hass || !this._state) {
      await this._teardownRunStateListeners();
      return;
    }
    const runningId = this._state.panel_entity_ids?.running ?? undefined;
    if (!runningId || !this.hass.connection) {
      await this._teardownRunStateListeners();
      return;
    }

    const subChanged =
      this._watchedEntryId !== entryId || this._watchedRunningEntity !== runningId;

    if (subChanged && this._runStateUnsub) {
      try {
        await this._runStateUnsub();
      } catch {
        /* ignore */
      }
      this._runStateUnsub = undefined;
    }

    this._watchedEntryId = entryId;
    this._watchedRunningEntity = runningId;

    if (!this._runStateUnsub) {
      this._runStateUnsub = await this.hass.connection.subscribeEvents(
        (ev: { data?: { entity_id?: string } }) => {
          if (ev.data?.entity_id !== runningId) return;
          this._scheduleSilentRefresh(entryId);
        },
        "state_changed"
      );
    }

    if (this._runStatePollTimer === undefined) {
      this._runStatePollTimer = window.setInterval(() => {
        if (!window.location.pathname.includes("simple-irrigation")) return;
        const { entryId: eid } = getPath();
        if (!eid || eid !== this._watchedEntryId || !this.hass || !this._state) return;
        const rid = this._state.panel_entity_ids?.running;
        if (!rid || this.hass.states?.[rid]?.state !== "on") return;
        void this._loadState(eid, { silent: true });
      }, 1000);
    }
  }

  private async _reloadPath(): Promise<void> {
    const { entryId, page } = getPath();
    if (!entryId) {
      await this._teardownRunStateListeners();
      await this._loadEntryList();
      this._loading = false;
      this._state = null;
      this.requestUpdate();
      return;
    }
    await this._loadState(entryId);
    if (page && !["general", "zones", "schedule", "status"].includes(page)) {
      navigate(this, exportPath(entryId, "general"));
    }
  }

  private async _loadEntryList(): Promise<void> {
    if (!this.hass) return;
    this._entriesLoading = true;
    this.requestUpdate();
    try {
      const entries = await listSimpleIrrigationEntries(this.hass);
      const hass = this.hass;
      this._entries = await Promise.all(
        entries.map(async (e) => {
          let plan_enabled = true;
          try {
            const st = await fetchPanelState(hass, e.entry_id);
            const inst = st.installation as Record<string, unknown>;
            plan_enabled = Boolean(inst.enabled ?? true);
          } catch {
            /* ignore; show as active */
          }
          return { ...e, plan_enabled };
        })
      );
    } catch (e) {
      this._error = String(e);
      this._entries = [];
    } finally {
      this._entriesLoading = false;
    }
  }

  private async _loadState(
    entryId: string,
    opts?: { silent?: boolean }
  ): Promise<void> {
    if (!this.hass) return;
    const silent = Boolean(opts?.silent);
    if (!silent) {
      this._loading = true;
      this._error = undefined;
      this.requestUpdate();
    }
    try {
      this._state = await fetchPanelState(this.hass, entryId);
      if (silent) {
        this._error = undefined;
      }
    } catch (e) {
      this._error = String(e);
      if (!silent) {
        this._state = null;
      }
    } finally {
      if (!silent) {
        this._loading = false;
      }
      if (!this._state) {
        void this._teardownRunStateListeners();
      } else {
        void this._syncRunStateListeners(entryId);
      }
      this.requestUpdate();
    }
  }

  async firstUpdated(): Promise<void> {
    await loadHaPanelElements();
    await this._ensurePanelI18n();
    if (this.hass) {
      await this._reloadPath();
    }
  }

  updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has("hass") && this.hass && changed.get("hass") === undefined) {
      void this._reloadPath();
    }
  }

  private _onTab(ev: CustomEvent): void {
    const name = (ev.detail as { name?: string })?.name;
    const { entryId } = getPath();
    if (!name || !entryId) return;
    const cur = getPath().page;
    if (name !== cur) {
      navigate(this, exportPath(entryId, name));
      this.requestUpdate();
    }
  }

  private _pickEntry(entryId: string): void {
    navigate(this, exportPath(entryId, "general"));
    this._loadState(entryId);
  }

  protected render() {
    if (!this.hass) {
      return html`<div class="view"><div class="view-inner">Loading…</div></div>`;
    }
    if (!this._initialPanelI18nDone) {
      return html`<div class="view"><div class="view-inner">Loading…</div></div>`;
    }

    const path = getPath();
    const page = path.page || "general";

    if (!path.entryId) {
      return html`
        <div class="entry-picker">
          <h2>${t(this.hass, "config_panel.entry_picker_title")}</h2>
          <p class="lead">${t(this.hass, "config_panel.entry_picker_lead")}</p>
          ${this._error ? html`<p class="error">${this._error}</p>` : nothing}
          ${this._entriesLoading
            ? html`<p class="muted">${t(this.hass, "config_panel.entry_picker_loading")}</p>`
            : nothing}
          <div class="entry-cards">
            ${this._entries.map(
              (e) =>
                html`
                  <button
                    type="button"
                    class="entry-card"
                    @click=${() => this._pickEntry(e.entry_id)}
                  >
                    <div class="entry-card-head">
                      <div class="entry-card-title">${e.title}</div>
                      ${e.disabled_by
                        ? html`<span class="entry-badge entry-badge-ha">${t(
                            this.hass,
                            "config_panel.entry_badge_ha"
                          )}</span>`
                        : !e.plan_enabled
                          ? html`<span class="entry-badge entry-badge-off">${t(
                              this.hass,
                              "config_panel.entry_badge_plan_off"
                            )}</span>`
                          : html`<span class="entry-badge entry-badge-on">${t(
                              this.hass,
                              "config_panel.entry_badge_active"
                            )}</span>`}
                    </div>
                    <p class="entry-card-desc">${t(this.hass, "config_panel.entry_card_desc")}</p>
                  </button>
                `
            )}
          </div>
          ${!this._entries.length && !this._entriesLoading
            ? html`<p class="muted">${t(this.hass, "config_panel.entry_picker_empty")}</p>`
            : nothing}
          <div class="howto-add">${t(this.hass, "config_panel.entry_picker_howto")}</div>
        </div>
      `;
    }

    if (this._loading || !this._state) {
      return html`<div class="view"><div class="view-inner">${this._error ||
        t(this.hass, "config_panel.loading")}</div></div>`;
    }

    const inst = this._state.installation as Record<string, unknown>;
    const rs = this._state.run_state as Record<string, unknown>;
    const scheduleNext = this._state.schedule_next ?? { fire_at: null, slots: [] };

    return html`
      <div class="header">
        <div class="toolbar">
          <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
          <div class="main-title">${t(this.hass, "config_panel.main_title")}</div>
          <div class="version">v${VERSION}</div>
        </div>
        <ha-tab-group @wa-tab-show=${this._onTab}>
          ${(["general", "zones", "schedule", "status"] as const).map(
            (p) => html`
              <ha-tab-group-tab slot="nav" panel=${p} .active=${page === p}>
                ${p === "general"
                  ? t(this.hass, "config_panel.tab_general")
                  : p === "zones"
                    ? t(this.hass, "config_panel.tab_zones")
                    : p === "schedule"
                      ? t(this.hass, "config_panel.tab_schedule")
                      : t(this.hass, "config_panel.tab_status")}
              </ha-tab-group-tab>
            `
          )}
        </ha-tab-group>
      </div>
      <div class="view">
        <div class="view-inner">
          ${page === "general"
            ? html`<si-view-general
                .hass=${this.hass}
                .entryId=${path.entryId!}
                .installation=${inst}
                .scheduleNext=${scheduleNext}
                .runState=${rs}
                .onSaved=${() => this._loadState(path.entryId!, { silent: true })}
              ></si-view-general>`
            : nothing}
          ${page === "zones"
            ? html`<si-view-zones
                .hass=${this.hass}
                .entryId=${path.entryId!}
                .installation=${inst}
                .onSaved=${() => this._loadState(path.entryId!, { silent: true })}
              ></si-view-zones>`
            : nothing}
          ${page === "schedule"
            ? html`<si-view-schedule
                .hass=${this.hass}
                .entryId=${path.entryId!}
                .installation=${inst}
                .runState=${rs}
                .onSaved=${() => this._loadState(path.entryId!, { silent: true })}
              ></si-view-schedule>`
            : nothing}
          ${page === "status"
            ? html`<si-view-status
                .hass=${this.hass}
                .runState=${rs}
                .installation=${inst}
              ></si-view-status>`
            : nothing}
        </div>
      </div>
    `;
  }
}

defineCustomElementOnce("simple-irrigation-panel", SimpleIrrigationPanel);
