import { html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";

import {
  actionHandler,
  handleAction,
  isActionable,
  validateAction,
  type ActionConfig,
  type ActionContext,
  type ActionHandlerOptions,
  type ActionTarget,
  type PanelPage,
} from "./actions";
import {
  clearError,
  clearPause,
  pauseHours,
  pauseUntil,
  runNext,
  runSlot,
  runZones,
  setMode,
  skipToday,
  stopAll,
  subscribeSnapshot,
} from "./api";
import {
  approxMinutes,
  cadenceLabel,
  clock,
  countdown,
  dayTime,
  dayTimeShort,
  duration,
  leadTime,
  secondsUntil,
  weekdayNames,
} from "./format";
import { localize, localizeCount } from "./i18n";
import { cardStyles } from "./styles";
import {
  ACTION_KEYS,
  CARD_ACTIONS,
  CARD_VIEWS,
  DEFAULT_CONFIG,
  type CardAction,
  type CardView,
  type HomeAssistant,
  type Mode,
  type SimpleIrrigationCardConfig,
  type SlotRow,
  type Snapshot,
  type ZoneRow,
} from "./types";

import "./simple-irrigation-card-editor";
import "./simple-irrigation-badge";

declare global {
  interface Window {
    customCards?: unknown[];
  }
}

/** Below this the action column drops under the summary (see design, page 10). */
const NARROW_PX = 300;

/** Narrower than the concept's 232 px reference — shrink rather than clip. */
const TINY_PX = 200;

/** Duration presets offered when `manual_duration` is on. */
const DURATION_PRESETS = [5, 10];

const ACTION_ICONS: Record<CardAction, string> = {
  run_next: "mdi:play",
  stop: "mdi:stop",
  skip_today: "mdi:calendar-remove-outline",
  pause_48h: "mdi:pause",
  pause_until: "mdi:clock-outline",
};

const STATE_ICONS: Record<string, string> = {
  idle: "mdi:sprinkler-variant",
  preparing: "mdi:progress-clock",
  running: "mdi:sprinkler-variant",
  stopping: "mdi:sprinkler-variant",
  paused: "mdi:pause-circle-outline",
  error: "mdi:alert-circle-outline",
};

@customElement("simple-irrigation-card")
export class SimpleIrrigationCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: SimpleIrrigationCardConfig;

  @state() private _snapshot?: Snapshot;

  /** Subscription-level failure (no installation, backend gone). */
  @state() private _error?: string;

  /** Last rejected action, shown inline and cleared on the next snapshot. */
  @state() private _actionError?: string;

  @state() private _busy = false;

  @state() private _narrow = false;

  @state() private _tiny = false;

  // --- manual run picker state (deliberately not persisted: a shared
  // dashboard should never hand the next person a pre-armed selection) ---
  @state() private _runOpen = false;
  @state() private _manualTab: "zones" | "slot" = "zones";
  @state() private _picked: string[] = [];
  @state() private _pickedSlot?: string;
  @state() private _durationChoice: number | "configured" = "configured";
  @state() private _applyConditions = false;

  /** Drives the second-by-second countdowns while a run is on screen. */
  private _ticker?: number;

  private _unsubscribe?: Promise<() => Promise<void>>;

  private _subscribedEntry?: string;

  private _resizeObserver?: ResizeObserver;

  public static styles = cardStyles;

  public static getConfigElement(): HTMLElement {
    return document.createElement("simple-irrigation-card-editor");
  }

  public static getStubConfig(): Partial<SimpleIrrigationCardConfig> {
    // Nothing required: dropped on a dashboard the card picks the only
    // installation and shows the status view.
    return {};
  }

  public setConfig(config: SimpleIrrigationCardConfig): void {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid configuration");
    }
    if (config.view && !CARD_VIEWS.includes(config.view)) {
      throw new Error(`view must be one of ${CARD_VIEWS.join(", ")}`);
    }
    if (
      config.manual_start &&
      !["off", "zones", "slot", "both"].includes(config.manual_start)
    ) {
      throw new Error('manual_start must be "off", "zones", "slot" or "both"');
    }
    if (config.actions) {
      if (!Array.isArray(config.actions)) {
        throw new Error("actions must be a list");
      }
      for (const action of config.actions) {
        if (!CARD_ACTIONS.includes(action)) {
          throw new Error(`unknown action "${action}"`);
        }
      }
    }
    if (
      config.next_runs !== undefined &&
      (typeof config.next_runs !== "number" ||
        config.next_runs < 1 ||
        config.next_runs > 12)
    ) {
      throw new Error("next_runs must be a number between 1 and 12");
    }
    if (
      config.zones !== undefined &&
      config.zones !== "all" &&
      config.zones !== "active" &&
      !Array.isArray(config.zones)
    ) {
      throw new Error('zones must be "all", "active" or a list of zone ids');
    }

    for (const keys of Object.values(ACTION_KEYS)) {
      validateAction(keys.tap, config[keys.tap]);
      validateAction(keys.hold, config[keys.hold]);
    }

    const previous = this._config;
    this._config = { ...DEFAULT_CONFIG, ...config };
    // The run view is the picker, so "off" there would render an empty card.
    if (this._config.view === "run" && this._config.manual_start === "off") {
      this._config.manual_start = "zones";
    }
    if (this._config.manual_start === "slot") {
      this._manualTab = "slot";
    } else if (this._config.manual_start === "zones") {
      this._manualTab = "zones";
    }
    if (previous?.entry_id !== this._config.entry_id) {
      this._snapshot = undefined;
      this._picked = [];
      this._pickedSlot = undefined;
    }
    this._resubscribe();
  }

  /** Rough height in HA's 50 px card units, so masonry can place the card. */
  public getCardSize(): number {
    if (this._config?.compact) return 2;
    switch (this._config?.view) {
      case "zones":
        return 2 + Math.ceil((this._snapshot?.zones.length ?? 4) / 2);
      case "schedule":
        return 2 + (this._config.next_runs ?? DEFAULT_CONFIG.next_runs);
      case "week":
        return 5;
      case "run":
        return 5;
      default:
        return 5;
    }
  }

  /** Sections view: never demand a full-width slot (design, page 10). */
  public getGridOptions(): Record<string, unknown> {
    if (this._config?.compact) {
      return { columns: "full", rows: 1, min_columns: 6, min_rows: 1 };
    }
    return { columns: 12, rows: "auto", min_columns: 4 };
  }

  public getLayoutOptions(): Record<string, unknown> {
    return this._config?.compact
      ? { grid_columns: "full", grid_rows: 1 }
      : { grid_columns: 6, grid_rows: "auto", grid_min_columns: 3 };
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._resubscribe();
    this._observeWidth();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._teardown();
    this._stopTicker();
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
  }

  protected updated(): void {
    if (this.hass && !this._unsubscribe) {
      this._resubscribe();
    }
    this.toggleAttribute("data-narrow", this._narrow);
    this.toggleAttribute("data-tiny", this._tiny);
    this.toggleAttribute("data-dark", Boolean(this.hass?.themes?.darkMode));
    this._syncTicker();
  }

  private _observeWidth(): void {
    if (this._resizeObserver || typeof ResizeObserver === "undefined") return;
    // Card width, not viewport width: the same card is narrow in a two-column
    // section and wide in a panel view on the very same screen.
    this._resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width === 0) return;
      const narrow = width < NARROW_PX;
      const tiny = width < TINY_PX;
      if (narrow !== this._narrow) this._narrow = narrow;
      if (tiny !== this._tiny) this._tiny = tiny;
    });
    this._resizeObserver.observe(this);
  }

  // ---- data ---------------------------------------------------------------

  private _teardown(): void {
    this._unsubscribe?.then((unsub) => unsub()).catch(() => undefined);
    this._unsubscribe = undefined;
    this._subscribedEntry = undefined;
  }

  private _resubscribe(): void {
    if (!this.hass || !this._config || !this.isConnected) return;
    const entry = this._config.entry_id ?? "";
    if (this._unsubscribe && this._subscribedEntry === entry) return;
    this._teardown();
    this._subscribedEntry = entry;
    this._unsubscribe = subscribeSnapshot(
      this.hass,
      (snapshot) => {
        this._snapshot = snapshot;
        this._error = undefined;
        this._actionError = undefined;
        this._busy = false;
      },
      this._config.entry_id
    );
    this._unsubscribe.catch((err: { code?: string; message?: string }) => {
      this._unsubscribe = undefined;
      // "Nothing configured" and "several installations, pick one" need
      // different answers from the user, so they get different sentences.
      this._error =
        err?.code === "ambiguous_entry"
          ? localize(this.hass, "pick_installation")
          : localize(this.hass, "no_installation");
    });
  }

  /** A visible countdown needs a repaint every second; nothing else does. */
  private _needsTicker(): boolean {
    const snap = this._snapshot;
    if (!snap) return false;
    if (snap.state === "running" || snap.state === "stopping") return true;
    return snap.state === "preparing" && Boolean(snap.active_script_started_at);
  }

  private _syncTicker(): void {
    if (this._needsTicker()) {
      if (this._ticker === undefined) {
        this._ticker = window.setInterval(() => this.requestUpdate(), 1000);
      }
    } else {
      this._stopTicker();
    }
  }

  private _stopTicker(): void {
    if (this._ticker !== undefined) {
      window.clearInterval(this._ticker);
      this._ticker = undefined;
    }
  }

  // ---- helpers ------------------------------------------------------------

  private get _cfg(): Required<
    Pick<
      SimpleIrrigationCardConfig,
      | "view"
      | "compact"
      | "show_mode"
      | "manual_start"
      | "manual_duration"
      | "actions"
      | "next_runs"
      | "zones"
      | "tap_action"
      | "hold_action"
      | "zone_tap_action"
      | "zone_hold_action"
      | "run_tap_action"
      | "run_hold_action"
    >
  > &
    SimpleIrrigationCardConfig {
    return { ...DEFAULT_CONFIG, type: "", ...(this._config ?? {}) };
  }

  private async _run(fn: () => Promise<unknown>): Promise<void> {
    this._busy = true;
    this._actionError = undefined;
    try {
      await fn();
    } catch (err) {
      const message = (err as { message?: string })?.message ?? String(err);
      this._actionError = localize(this.hass, "action_failed", {
        error: message,
      });
    } finally {
      this._busy = false;
    }
  }

  /**
   * Render a `{time}` template with the substituted value in bold, splitting on
   * the placeholder rather than concatenating — the time does not sit at the
   * end of the sentence in every language.
   */
  private _sentenceWithBold(key: string, value: string): TemplateResult {
    const [before, after = ""] = localize(this.hass, key).split("{time}");
    return html`${before}<strong>${value}</strong>${after}`;
  }

  // ---- tap / hold ---------------------------------------------------------

  /** The configured pair for one row kind, defaults filled in. */
  private _actionPair(target: ActionTarget): {
    tap: ActionConfig;
    hold: ActionConfig;
  } {
    const keys = ACTION_KEYS[target];
    const cfg = this._cfg;
    return {
      tap: cfg[keys.tap] ?? DEFAULT_CONFIG[keys.tap],
      hold: cfg[keys.hold] ?? DEFAULT_CONFIG[keys.hold],
    };
  }

  /**
   * Everything a tappable row needs: whether it is one at all (so an
   * all-`none` configuration leaves a plain, unfocusable row behind) and the
   * directive options that run the configured action.
   */
  private _tap(
    target: ActionTarget,
    context: ActionContext
  ): { on: boolean; options: ActionHandlerOptions } {
    const { tap, hold } = this._actionPair(target);
    const on = isActionable(tap) || isActionable(hold);
    return {
      on,
      options: {
        hasHold: isActionable(hold),
        disabled: !on,
        handler: (kind) =>
          handleAction(this, this.hass, kind === "tap" ? tap : hold, {
            entryId: this._snapshot?.entry_id,
            ...context,
          }),
      },
    };
  }

  /** The panel page the current view belongs to. */
  private _viewPage(): PanelPage {
    switch (this._cfg.view) {
      case "zones":
        return "zones";
      case "schedule":
        return "schedule";
      case "week":
        return "timetable";
      default:
        return "overview";
    }
  }

  private _cardTap(): { on: boolean; options: ActionHandlerOptions } {
    return this._tap("card", {
      entityId: this._snapshot?.entity_id,
      page: this._viewPage(),
    });
  }

  private _zoneTap(zone: ZoneRow): {
    on: boolean;
    options: ActionHandlerOptions;
  } {
    return this._tap("zone", {
      entityId: zone.entity_id || this._snapshot?.entity_id,
      page: "zones",
    });
  }

  /** A schedule row, a week bar, or a whole day column (no slot). */
  private _runTap(slotId?: string): {
    on: boolean;
    options: ActionHandlerOptions;
  } {
    return this._tap("run", {
      entityId: this._snapshot?.entity_id,
      slotId,
      page: slotId ? "schedule" : "timetable",
    });
  }

  /** Zones this card is configured to list. */
  private _visibleZones(): ZoneRow[] {
    const snap = this._snapshot;
    if (!snap) return [];
    const setting = this._cfg.zones;
    if (Array.isArray(setting)) {
      const wanted = new Set(setting);
      return snap.zones.filter((z) => wanted.has(z.zone_id));
    }
    if (setting === "active") {
      return snap.zones.filter((z) => z.active || z.queued);
    }
    return snap.zones;
  }

  private _nextRun(): SlotRow | undefined {
    return this._snapshot?.next_runs.find((run) => !run.skipped_by_pause);
  }

  private _stateLabel(): string {
    if (this._soaking()) return localize(this.hass, "state_soaking");
    return localize(this.hass, `state_${this._snapshot?.state ?? "idle"}`);
  }

  /** Resting between Cycle & Soak passes: the run is on, no zone is. */
  private _soaking(): boolean {
    const snap = this._snapshot;
    return snap?.state === "running" && Boolean(snap.soak_until);
  }

  private _pillClass(): string {
    switch (this._snapshot?.state) {
      case "running":
      case "stopping":
      case "preparing":
        return "pri";
      case "paused":
        return "warn";
      case "error":
        return "err";
      default:
        return "";
    }
  }

  /** Active zones, longest remaining first — the headline is the phase's end. */
  private _activeZones(): ZoneRow[] {
    const zones = (this._snapshot?.zones ?? []).filter((z) => z.active);
    return zones.sort(
      (a, b) => secondsUntil(b.ends_at) - secondsUntil(a.ends_at)
    );
  }

  // ---- render -------------------------------------------------------------

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;

    if (!this._snapshot) {
      return html`<ha-card>
        <div class="empty">
          ${this._error ?? localize(this.hass, "loading")}
        </div>
      </ha-card>`;
    }

    if (this._cfg.compact) return this._renderCompact();

    const view = this._cfg.view;
    return html`<ha-card>
      ${view === "status" ? this._renderStatus() : nothing}
      ${view === "zones" ? this._renderZones() : nothing}
      ${view === "schedule" ? this._renderSchedule() : nothing}
      ${view === "week" ? this._renderWeek() : nothing}
      ${view === "run" ? this._renderRun(false) : nothing}
      ${view !== "run" && this._cfg.manual_start !== "off"
        ? html`<div class="section">${this._renderRun(true)}</div>`
        : nothing}
      ${this._actionError
        ? html`<div class="error">${this._actionError}</div>`
        : nothing}
    </ha-card>`;
  }

  // ---- status -------------------------------------------------------------

  private _renderStatus(): TemplateResult {
    const snap = this._snapshot!;
    if (!snap.enabled) return this._renderDisabled();
    switch (snap.state) {
      case "running":
      case "stopping":
        return this._renderRunning();
      case "preparing":
        return this._renderPreparing();
      case "paused":
        return this._renderPaused();
      case "error":
        return this._renderError();
      default:
        return this._renderIdle();
    }
  }

  private _renderHeader(): TemplateResult {
    const snap = this._snapshot!;
    const running = snap.state === "running" || snap.state === "stopping";
    const tap = this._cardTap();
    return html`<div
      class=${classMap({ head: true, tappable: tap.on })}
      role=${tap.on ? "button" : nothing}
      tabindex=${tap.on ? "0" : nothing}
      ${actionHandler(tap.options)}
    >
      <ha-icon
        class=${classMap({ drip: running })}
        .icon=${STATE_ICONS[snap.state] ?? STATE_ICONS.idle}
      ></ha-icon>
      <span class="title">${snap.name}</span>
      <span class="pill ${this._pillClass()}">
        <span class="dot"></span>${this._stateLabel()}
      </span>
    </div>`;
  }

  private _renderIdle(): TemplateResult {
    const snap = this._snapshot!;
    const next = this._nextRun();
    return html`
      ${this._renderHeader()}
      <div class="body">
        <div class="summary">
          <div class="label">${localize(this.hass, "next_run")}</div>
          ${next
            ? html`
                <div class="big">${dayTime(this.hass, next.fire_at!)}</div>
                <div class="sub">
                  ${leadTime(this.hass, next.fire_at!)}${next.name
                    ? ` · ${next.name}`
                    : ""}
                </div>
                <div class="meta">
                  ${cadenceLabel(this.hass, next.cadence)
                    ? html`<span>
                        <ha-icon icon="mdi:repeat-variant"></ha-icon>
                        ${cadenceLabel(this.hass, next.cadence)}
                      </span>`
                    : nothing}
                  <span>
                    <ha-icon icon="mdi:format-list-numbered"></ha-icon>
                    ${localizeCount(
                      this.hass,
                      "zones_count",
                      next.zone_names.length
                    )}
                  </span>
                  <span>
                    <ha-icon icon="mdi:timer-outline"></ha-icon>
                    <strong>~${next.duration_min}</strong>
                    ${localize(this.hass, "unit_minute_short")}
                  </span>
                </div>
              `
            : html`
                <div class="big">${localize(this.hass, "no_next_run")}</div>
                <div class="sub">${localize(this.hass, "no_next_run_hint")}</div>
              `}
        </div>
        ${this._renderActions()} ${this._renderModeRow()}
      </div>
    `;
  }

  private _renderActions(): TemplateResult | typeof nothing {
    const snap = this._snapshot!;
    const busyRun = snap.state === "running" || snap.state === "preparing";
    // Stop only earns a slot while there is something to stop; the running
    // layout carries its own Stop button.
    const actions = this._cfg.actions.filter(
      (action) => action !== "stop" || busyRun
    );
    if (!actions.length) return nothing;
    const hasNext = Boolean(this._nextRun() ?? snap.next_runs.length);

    return html`<div class="actions">
      ${actions.map((action, index) => {
        const primary = index === 0 && action !== "stop";
        const danger = action === "stop";
        const disabled =
          this._busy ||
          (action === "run_next" && (!hasNext || busyRun)) ||
          (action === "stop" && !busyRun);
        return html`<button
          class=${classMap({ btn: true, primary, danger })}
          ?disabled=${disabled}
          @click=${() => this._onAction(action)}
        >
          <ha-icon .icon=${ACTION_ICONS[action]}></ha-icon>
          <span>${localize(this.hass, `action_${action}`)}</span>
        </button>`;
      })}
    </div>`;
  }

  private _onAction(action: CardAction): void {
    const entry = this._config?.entry_id;
    switch (action) {
      case "run_next":
        void this._run(() => runNext(this.hass!, entry));
        break;
      case "stop":
        void this._run(() => stopAll(this.hass!, entry));
        break;
      case "skip_today":
        void this._run(() => skipToday(this.hass!, entry));
        break;
      case "pause_48h":
        void this._run(() => pauseHours(this.hass!, 48, entry));
        break;
      case "pause_until": {
        const suggestion = new Date(Date.now() + 24 * 3600 * 1000);
        const local = new Date(
          suggestion.getTime() - suggestion.getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 16);
        const answer = window.prompt(
          localize(this.hass, "action_pause_until"),
          local
        );
        if (answer) void this._run(() => pauseUntil(this.hass!, answer, entry));
        break;
      }
    }
  }

  private _renderModeRow(): TemplateResult | typeof nothing {
    const snap = this._snapshot!;
    if (!this._cfg.show_mode) return nothing;
    return html`<div class="foot">
      <span class="cap">
        ${localize(this.hass, this._narrow ? "mode_short" : "watering_mode")}
      </span>
      <div class="seg">
        ${snap.modes.map(
          (mode) => html`<button
            class=${classMap({ on: mode === snap.mode })}
            ?disabled=${this._busy}
            @click=${() => this._onMode(mode)}
          >
            ${localize(this.hass, `mode_${mode}`)}
          </button>`
        )}
      </div>
    </div>`;
  }

  private _onMode(mode: Mode): void {
    if (mode === this._snapshot?.mode) return;
    void this._run(() => setMode(this.hass!, mode, this._config?.entry_id));
  }

  private _renderRunning(): TemplateResult {
    const snap = this._snapshot!;
    const active = this._activeZones();
    const lead = active[0];
    const remaining = lead ? secondsUntil(lead.ends_at) : 0;
    const total = (lead?.duration_min ?? 0) * 60;
    const progress = total > 0 ? Math.min(100, (1 - remaining / total) * 100) : 0;

    const queued = snap.zones.filter((z) => z.queued && !z.active);
    const footParts = [
      snap.phase_index && snap.phase_total
        ? localize(this.hass, "phase_of", {
            index: snap.phase_index,
            total: snap.phase_total,
          })
        : "",
      localize(this.hass, `mode_${snap.mode}`),
      snap.run_ends_at
        ? localize(this.hass, "ends_at", {
            time: clock(this.hass, snap.run_ends_at),
          })
        : "",
    ].filter(Boolean);

    return html`
      ${this._renderHeader()}
      <div class="body run">
        ${lead
          ? html`
              <div class="label">
                ${localize(this.hass, "remaining", { zone: lead.name })}
              </div>
              <div class="big pri">${countdown(remaining)}</div>
              <div class="bar">
                <i style=${styleMap({ width: `${progress}%` })}></i>
              </div>
            `
          : this._soaking()
            ? html`
                <div class="label">${localize(this.hass, "soak_remaining")}</div>
                <div class="big pri">${countdown(secondsUntil(snap.soak_until))}</div>
              `
            : nothing}
        <div class="queue">
          ${active.map(
            (zone) => html`<div class="qrow">
              <span class="qdot"></span>
              <span class="name">${zone.name}</span>
              <span class="val">${countdown(secondsUntil(zone.ends_at))}</span>
            </div>`
          )}
          ${queued.length
            ? html`<div class="qrow pending">
                <span class="qdot"></span>
                <span class="name">
                  ${queued.map((z) => z.name).join(", ")}
                </span>
                <span class="val">${localize(this.hass, "queued")}</span>
              </div>`
            : nothing}
        </div>
        <div class="runfoot">
          <span class="cap">${footParts.join(" · ")}</span>
          <button
            class="btn danger inline"
            ?disabled=${this._busy}
            @click=${() => this._onAction("stop")}
          >
            ${localize(this.hass, "action_stop")}
          </button>
        </div>
      </div>
    `;
  }

  private _renderPreparing(): TemplateResult {
    const snap = this._snapshot!;
    const started = snap.active_script_started_at;
    const timeout = snap.active_script_timeout_sec ?? 0;
    const elapsed = started
      ? Math.max(0, (Date.now() - new Date(started).getTime()) / 1000)
      : 0;
    const progress = timeout > 0 ? Math.min(100, (elapsed / timeout) * 100) : 0;
    const upNext = snap.zones.filter((z) => z.queued || z.active);

    return html`<div class="state">
      <div class="srow">
        <ha-icon icon="mdi:progress-clock" style="color:var(--si-pri)"></ha-icon>
        <span class="title">${snap.name}</span>
        <span class="pill pri">${this._stateLabel()}</span>
      </div>
      ${snap.active_script
        ? html`
            <div class="stext">
              ${localize(this.hass, "waiting_for_script")}
            </div>
            <div class="smono">
              ${snap.active_script}
              ${timeout
                ? ` · ${countdown(elapsed)} / ${countdown(timeout)}`
                : ""}
            </div>
            ${timeout
              ? html`<div class="bar thin">
                  <i style=${styleMap({ width: `${progress}%` })}></i>
                </div>`
              : nothing}
          `
        : html`<div class="stext">
            ${upNext.map((z) => z.name).join(", ") ||
            localize(this.hass, "state_preparing")}
          </div>`}
    </div>`;
  }

  private _renderPaused(): TemplateResult {
    const snap = this._snapshot!;
    return html`<div class="state">
      <div class="srow">
        <ha-icon
          icon="mdi:pause-circle-outline"
          style="color:var(--si-warn)"
        ></ha-icon>
        <span class="title">${snap.name}</span>
        <span class="pill warn">${this._stateLabel()}</span>
      </div>
      <div class="stext">
        ${this._sentenceWithBold(
          "paused_until",
          snap.paused_until ? dayTime(this.hass, snap.paused_until) : ""
        )}
      </div>
      <div class="snote">${localize(this.hass, "paused_manual_note")}</div>
      <div class="sbtns">
        <button
          class="btn inline small outline-pri"
          ?disabled=${this._busy}
          @click=${() =>
            this._run(() => clearPause(this.hass!, this._config?.entry_id))}
        >
          ${localize(this.hass, "resume_schedule")}
        </button>
      </div>
    </div>`;
  }

  private _renderError(): TemplateResult {
    const snap = this._snapshot!;
    return html`<div class="state">
      <div class="srow">
        <ha-icon
          icon="mdi:alert-circle-outline"
          style="color:var(--si-err)"
        ></ha-icon>
        <span class="title">${snap.name}</span>
        <span class="pill err">${this._stateLabel()}</span>
      </div>
      <div class="stext">${localize(this.hass, "last_run_failed")}</div>
      ${snap.last_error
        ? html`<div class="scode">${snap.last_error}</div>`
        : nothing}
      <div class="sbtns">
        <button
          class="btn inline small"
          ?disabled=${this._busy}
          @click=${() =>
            this._run(() => clearError(this.hass!, this._config?.entry_id))}
        >
          ${localize(this.hass, "clear_error")}
        </button>
        <button
          class="btn inline small outline-pri"
          ?disabled=${this._busy || !this._snapshot?.next_runs.length}
          @click=${() => this._onAction("run_next")}
        >
          ${localize(this.hass, "action_run_next")}
        </button>
      </div>
    </div>`;
  }

  private _renderDisabled(): TemplateResult {
    const snap = this._snapshot!;
    return html`<div class="state">
      <div class="srow">
        <ha-icon icon="mdi:power-off" style="color:var(--si-fg2)"></ha-icon>
        <span class="title">${snap.name}</span>
        <span class="pill">${localize(this.hass, "disabled_title")}</span>
      </div>
      <div class="snote">${localize(this.hass, "disabled_note")}</div>
    </div>`;
  }

  // ---- zones --------------------------------------------------------------

  private _zoneSub(zone: ZoneRow): { text: string; cls: string } {
    if (zone.issue) {
      const key =
        zone.issue.reason === "unavailable"
          ? "zone_issue_unavailable"
          : zone.issue.reason === "missing"
            ? "zone_issue_missing"
            : "zone_issue_no_output";
      return {
        text: localize(this.hass, key, { entity: zone.issue.entity_id }),
        cls: "warn",
      };
    }
    if (zone.active) {
      return {
        text: localize(this.hass, "zone_watering", {
          time: countdown(secondsUntil(zone.ends_at)),
        }),
        cls: "pri",
      };
    }
    if (!zone.enabled) {
      return { text: localize(this.hass, "zone_disabled"), cls: "" };
    }
    if (zone.next_run) {
      return {
        text: localize(this.hass, "zone_next", {
          time: dayTimeShort(this.hass, zone.next_run),
        }),
        cls: "",
      };
    }
    return { text: localize(this.hass, "zone_no_next"), cls: "" };
  }

  private _renderZones(): TemplateResult {
    const snap = this._snapshot!;
    const zones = this._visibleZones();
    const headTap = this._cardTap();
    return html`
      <div
        class=${classMap({ head: true, tappable: headTap.on })}
        role=${headTap.on ? "button" : nothing}
        tabindex=${headTap.on ? "0" : nothing}
        ${actionHandler(headTap.options)}
      >
        <ha-icon icon="mdi:water-outline"></ha-icon>
        <span class="title">${localize(this.hass, "zones_title")}</span>
        ${snap.issue_count
          ? html`<span class="pill warn issues">
              <ha-icon icon="mdi:alert-outline"></ha-icon>
              ${localizeCount(this.hass, "issues_count", snap.issue_count)}
            </span>`
          : nothing}
      </div>
      ${zones.length
        ? html`<div class="zbody">
            ${zones.map((zone) => {
              const sub = this._zoneSub(zone);
              const tap = this._zoneTap(zone);
              return html`<div
                class=${classMap({
                  zrow: true,
                  disabled: !zone.enabled,
                  tappable: tap.on,
                })}
                role=${tap.on ? "button" : nothing}
                tabindex=${tap.on ? "0" : nothing}
                ${actionHandler(tap.options)}
              >
                ${zone.issue
                  ? html`<ha-icon
                      class="zwarn"
                      icon="mdi:alert-circle"
                    ></ha-icon>`
                  : html`<span
                      class=${classMap({
                        zdot: true,
                        on: zone.active,
                        off: !zone.active && zone.enabled,
                        dis: !zone.enabled,
                      })}
                    ></span>`}
                <div class="zmain">
                  <div class="zname">${zone.name}</div>
                  <div class="zsub ${sub.cls}">${sub.text}</div>
                </div>
                <span class="zdur">
                  ${localize(this.hass, "duration_minutes", {
                    n: zone.duration_min,
                  })}
                </span>
              </div>`;
            })}
            <div class="znote">
              ${localize(this.hass, "zones_footnote", {
                mode: localize(this.hass, `mode_${snap.mode}`),
              })}
            </div>
          </div>`
        : html`<div class="empty">${localize(this.hass, "zones_empty")}</div>`}
    `;
  }

  // ---- schedule -----------------------------------------------------------

  private _renderSchedule(): TemplateResult {
    const snap = this._snapshot!;
    const limit = this._cfg.next_runs;
    const runs = snap.next_runs.slice(0, limit);

    const headTap = this._cardTap();
    return html`
      <div
        class=${classMap({ head: true, tappable: headTap.on })}
        role=${headTap.on ? "button" : nothing}
        tabindex=${headTap.on ? "0" : nothing}
        ${actionHandler(headTap.options)}
      >
        <ha-icon icon="mdi:calendar-clock"></ha-icon>
        <span class="title">${localize(this.hass, "schedule_title")}</span>
        ${snap.slots.length
          ? html`<span class="count">
              ${localize(this.hass, "slots_of", {
                shown: runs.length,
                total: snap.slots.length,
              })}
            </span>`
          : nothing}
      </div>
      ${runs.length
        ? html`<div class="sbody">
            ${runs.map((run, index) => {
              // Dashed once a run is further out than the next 24 hours —
              // the design's shorthand for "not what happens next".
              const far = secondsUntil(run.fire_at!) > 86_400;
              const cadence = cadenceLabel(this.hass, run.cadence);
              const what = [run.name, cadence].filter(Boolean).join(" · ");
              const tap = this._runTap(run.slot_id);
              return html`<div
                class=${classMap({
                  srun: true,
                  next: index === 0 && !run.skipped_by_pause,
                  far,
                  skipped: Boolean(run.skipped_by_pause),
                  tappable: tap.on,
                })}
                role=${tap.on ? "button" : nothing}
                tabindex=${tap.on ? "0" : nothing}
                ${actionHandler(tap.options)}
              >
                <div class="sline">
                  <span class="swhen">${dayTime(this.hass, run.fire_at!)}</span>
                  ${what ? html`<span class="swhat">${what}</span>` : nothing}
                  <span class="sdur">
                    ${run.skipped_by_pause
                      ? localize(this.hass, "skipped_by_pause")
                      : approxMinutes(this.hass, run.duration_min)}
                  </span>
                </div>
                ${!far && run.zone_names.length
                  ? html`<div class="szones">
                      ${run.zone_names.join(", ")}
                    </div>`
                  : nothing}
              </div>`;
            })}
            <div class="znote">
              ${localize(this.hass, "schedule_footnote")}
            </div>
          </div>`
        : html`<div class="empty">
            ${localize(this.hass, "schedule_empty")}
          </div>`}
    `;
  }

  // ---- week ---------------------------------------------------------------

  /**
   * Bar height from duration. Literal proportion would render a 20-minute run
   * as one pixel in a 24-hour column, so the scale is offset — the design's own
   * 20 min → 7 px, 40 min → 12 px.
   */
  private _barHeight(minutes: number): number {
    return Math.max(5, Math.min(48, 2 + minutes / 4));
  }

  private _renderWeek(): TemplateResult {
    const snap = this._snapshot!;
    const week = snap.week;
    const short = weekdayNames(this.hass, "short");
    const narrow = weekdayNames(this.hass, "narrow");
    const hasParity = week.days.some((d) =>
      d.runs.some((run) => run.parity_only)
    );

    const headTap = this._cardTap();
    if (!week.days.length || !snap.slots.length) {
      return html`
        <div
          class=${classMap({ head: true, tappable: headTap.on })}
          role=${headTap.on ? "button" : nothing}
          tabindex=${headTap.on ? "0" : nothing}
          ${actionHandler(headTap.options)}
        >
          <ha-icon icon="mdi:calendar-week"></ha-icon>
          <span class="title">${localize(this.hass, "week_title")}</span>
        </div>
        <div class="empty">${localize(this.hass, "week_empty")}</div>
      `;
    }

    return html`
      <div
        class=${classMap({ head: true, tappable: headTap.on })}
        role=${headTap.on ? "button" : nothing}
        tabindex=${headTap.on ? "0" : nothing}
        ${actionHandler(headTap.options)}
      >
        <ha-icon icon="mdi:calendar-week"></ha-icon>
        <span class="title">${localize(this.hass, "week_title")}</span>
        <span class="count">
          ${localizeCount(this.hass, "week_summary", week.total_runs, {
            runs: week.total_runs,
            time: duration(this.hass, week.total_min),
          })}
        </span>
      </div>
      <div class="wbody">
        <div class="wgrid">
          ${week.days.map((day) => {
            const date = new Date(day.date);
            const label = this._narrow
              ? narrow[day.weekday]
              : `${short[day.weekday]} ${date.getDate()}`;
            const dayTap = this._runTap();
            return html`<div
              class=${classMap({ wcol: true, today: day.today })}
            >
              <div class="wday">${label}</div>
              <div
                class=${classMap({ wtrack: true, tappable: dayTap.on })}
                role=${dayTap.on ? "button" : nothing}
                tabindex=${dayTap.on ? "0" : nothing}
                aria-label=${dayTap.on ? label : nothing}
                ${actionHandler(dayTap.options)}
              >
                ${day.runs.map((run) => {
                  const barTap = this._runTap(run.slot_id);
                  return html`<div
                    class=${classMap({
                      wbar: true,
                      parity: run.parity_only,
                      paused: run.paused && !run.parity_only,
                      tappable: barTap.on,
                    })}
                    ${actionHandler(barTap.options)}
                    style=${styleMap({
                      top: `${(run.start_min / 1440) * 100}%`,
                      height: `${this._barHeight(run.duration_min)}px`,
                    })}
                    title=${[
                      run.name,
                      `${String(Math.floor(run.start_min / 60)).padStart(2, "0")}:${String(
                        run.start_min % 60
                      ).padStart(2, "0")}`,
                      duration(this.hass, run.duration_min),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  ></div>`;
                })}
              </div>
              <div class="wtot">
                ${day.paused
                  ? localize(this.hass, "week_paused")
                  : day.total_min
                    ? `${day.total_min}′`
                    : "—"}
              </div>
            </div>`;
          })}
        </div>
        <div class="wlegend">
          <span><span class="lkey"></span>${localize(this.hass, "legend_run")}</span>
          ${hasParity
            ? html`<span>
                <span class="lkey dash"></span>
                ${localize(this.hass, "legend_parity_odd")}
              </span>`
            : nothing}
          <span>${localize(this.hass, "legend_scale")}</span>
        </div>
      </div>
    `;
  }

  // ---- manual run ---------------------------------------------------------

  private _renderRun(collapsible: boolean): TemplateResult {
    const snap = this._snapshot!;

    // A manual run in flight replaces the picker with what it produced. Keyed
    // on the run states rather than on `manual_run`, which outlives the run it
    // describes — a paused installation would otherwise keep offering to stop
    // something that finished long ago.
    const inFlight = ["preparing", "running", "stopping"].includes(snap.state);
    if (snap.manual_run && inFlight) {
      const lead = this._activeZones()[0];
      return html`<div class="collapse">
        <ha-icon class="drip" icon="mdi:sprinkler-variant"></ha-icon>
        <div class="cmain">
          <div class="ctitle">${localize(this.hass, "manual_run_started")}</div>
          <div class="csub pri">
            ${lead
              ? localize(this.hass, "run_progress", {
                  zone: lead.name,
                  time: countdown(secondsUntil(lead.ends_at)),
                  index: snap.phase_index ?? 1,
                  total: snap.phase_total ?? 1,
                })
              : this._stateLabel()}
          </div>
        </div>
        <button
          class="btn danger inline"
          ?disabled=${this._busy}
          @click=${() => this._onAction("stop")}
        >
          ${localize(this.hass, "action_stop")}
        </button>
      </div>`;
    }

    if (collapsible && !this._runOpen) {
      return html`<button
        class="collapse"
        aria-expanded="false"
        @click=${() => {
          this._runOpen = true;
        }}
      >
        <ha-icon icon="mdi:play-circle-outline"></ha-icon>
        <div class="cmain">
          <div class="ctitle">${localize(this.hass, "run_title")}</div>
          <div class="csub">${localize(this.hass, "run_subtitle")}</div>
        </div>
        <ha-icon class="chev" icon="mdi:chevron-down"></ha-icon>
      </button>`;
    }

    const both = this._cfg.manual_start === "both";
    const tab = both
      ? this._manualTab
      : this._cfg.manual_start === "slot"
        ? "slot"
        : "zones";

    return html`
      <div class="head run">
        <ha-icon icon="mdi:play-circle-outline"></ha-icon>
        <span class="title">${localize(this.hass, "run_title")}</span>
        ${both
          ? html`<div class="seg tight">
              <button
                class=${classMap({ on: tab === "zones" })}
                @click=${() => {
                  this._manualTab = "zones";
                }}
              >
                ${localize(this.hass, "run_tab_zones")}
              </button>
              <button
                class=${classMap({ on: tab === "slot" })}
                @click=${() => {
                  this._manualTab = "slot";
                }}
              >
                ${localize(this.hass, "run_tab_slot")}
              </button>
            </div>`
          : nothing}
        ${collapsible
          ? html`<button
              class="chevbtn"
              aria-expanded="true"
              aria-label=${localize(this.hass, "run_title")}
              @click=${() => {
                this._runOpen = false;
              }}
            >
              <ha-icon class="chev up" icon="mdi:chevron-down"></ha-icon>
            </button>`
          : nothing}
      </div>
      ${tab === "zones" ? this._renderRunZones() : this._renderRunSlot()}
    `;
  }

  private _durationFor(zone: ZoneRow): number {
    return this._durationChoice === "configured"
      ? zone.duration_min
      : this._durationChoice;
  }

  private _renderRunZones(): TemplateResult {
    const snap = this._snapshot!;
    const zones = snap.zones;
    const picked = zones.filter((z) => this._picked.includes(z.zone_id));
    const totalMin = picked.reduce((sum, z) => sum + this._durationFor(z), 0);

    return html`<div class="rbody">
      <div class="label">
        ${picked.length
          ? localize(this.hass, "run_zones_label", { count: picked.length })
          : localize(this.hass, "run_zones_none")}
      </div>
      <div class="chips">
        ${zones.map((zone) => {
          const on = this._picked.includes(zone.zone_id);
          // A disabled zone stays visible but is not selectable; a zone with a
          // broken output is selectable and fails loudly (design, page 7).
          const selectable = zone.enabled;
          return html`<button
            class=${classMap({
              chip: true,
              on,
              warn: Boolean(zone.issue) && !on,
              dis: !selectable,
            })}
            ?disabled=${!selectable}
            @click=${() => this._toggleZone(zone.zone_id)}
          >
            ${on
              ? html`<ha-icon icon="mdi:check"></ha-icon>`
              : zone.issue
                ? html`<ha-icon icon="mdi:alert-circle-outline"></ha-icon>`
                : nothing}
            ${zone.name}
          </button>`;
        })}
      </div>
      ${this._cfg.manual_duration
        ? html`<div class="rrow">
            <span class="cap">${localize(this.hass, "duration")}</span>
            <div class="seg tight">
              <button
                class=${classMap({ on: this._durationChoice === "configured" })}
                @click=${() => {
                  this._durationChoice = "configured";
                }}
              >
                ${localize(this.hass, "duration_configured")}
              </button>
              ${DURATION_PRESETS.map(
                (n) => html`<button
                  class=${classMap({ on: this._durationChoice === n })}
                  @click=${() => {
                    this._durationChoice = n;
                  }}
                >
                  ${localize(this.hass, "duration_minutes", { n })}
                </button>`
              )}
              <button
                class=${classMap({
                  on:
                    this._durationChoice !== "configured" &&
                    !DURATION_PRESETS.includes(this._durationChoice as number),
                })}
                @click=${this._onCustomDuration}
              >
                ${localize(this.hass, "duration_custom")}
              </button>
            </div>
          </div>`
        : nothing}
      <div class="rlaunch">
        <span class="cap">
          ${picked.length
            ? localize(this.hass, "runs_in_sequence", {
                parts: picked
                  .map((z) => `${this._durationFor(z)}`)
                  .join(" + ")
                  .concat(` ${localize(this.hass, "unit_minute_short")}`),
              })
            : localize(this.hass, "select_zones_first")}
        </span>
        <button
          class="btn primary"
          ?disabled=${this._busy || !picked.length}
          @click=${this._onStartZones}
        >
          <ha-icon icon="mdi:play"></ha-icon>
          ${picked.length
            ? localizeCount(this.hass, "start_zones", picked.length, {
                count: picked.length,
                time: duration(this.hass, totalMin),
              })
            : localize(this.hass, "start_zones_none")}
        </button>
      </div>
    </div>`;
  }

  private _toggleZone(zoneId: string): void {
    this._picked = this._picked.includes(zoneId)
      ? this._picked.filter((id) => id !== zoneId)
      : [...this._picked, zoneId];
  }

  private _onCustomDuration = (): void => {
    const answer = window.prompt(
      localize(this.hass, "duration_custom_prompt"),
      String(this._durationChoice === "configured" ? 15 : this._durationChoice)
    );
    if (!answer) return;
    const minutes = Number.parseInt(answer, 10);
    if (Number.isFinite(minutes) && minutes > 0 && minutes <= 1440) {
      this._durationChoice = minutes;
    }
  };

  private _onStartZones = (): void => {
    const zoneIds = [...this._picked];
    if (!zoneIds.length) return;
    const durationMin =
      this._durationChoice === "configured" ? undefined : this._durationChoice;
    void this._run(async () => {
      await runZones(this.hass!, zoneIds, durationMin, this._config?.entry_id);
      this._picked = [];
    });
  };

  private _renderRunSlot(): TemplateResult {
    const snap = this._snapshot!;
    const slots = snap.slots;
    const selected =
      slots.find((slot) => slot.slot_id === this._pickedSlot) ??
      slots.find((slot) => slot.enabled && slot.zone_ids.length);

    if (!slots.length) {
      return html`<div class="empty">${localize(this.hass, "no_slots")}</div>`;
    }

    return html`<div class="rbody">
      <div class="label">${localize(this.hass, "run_slot_label")}</div>
      <div style="margin-top:4px">
        ${slots.map((slot) => {
          const on = slot.slot_id === selected?.slot_id;
          const runnable = slot.enabled && slot.zone_ids.length > 0;
          return html`<button
            class=${classMap({ slotrow: true, on, disabled: !runnable })}
            ?disabled=${!runnable}
            @click=${() => {
              this._pickedSlot = slot.slot_id;
            }}
          >
            <span class=${classMap({ radio: true, on })}></span>
            <div class="slotmain">
              <div class="slotname">
                ${slot.name || cadenceLabel(this.hass, slot.cadence)}
              </div>
              <div class="slotsub">${slot.zone_names.join(", ")}</div>
            </div>
            <span class="slotdur">
              ${approxMinutes(this.hass, slot.duration_min)}
            </span>
          </button>`;
        })}
      </div>
      <div class="rrow">
        <span class="cap">${localize(this.hass, "apply_conditions")}</span>
        <button
          class=${classMap({ toggle: true, on: this._applyConditions })}
          role="switch"
          aria-checked=${this._applyConditions}
          aria-label=${localize(this.hass, "apply_conditions")}
          @click=${() => {
            this._applyConditions = !this._applyConditions;
          }}
        >
          <span class="knob"></span>
        </button>
      </div>
      <div class="rlaunch">
        <span class="cap">
          ${localize(
            this.hass,
            this._applyConditions ? "apply_conditions_on" : "apply_conditions_off"
          )}
        </span>
        <button
          class="btn primary"
          ?disabled=${this._busy || !selected}
          @click=${() => selected && this._onStartSlot(selected)}
        >
          <ha-icon icon="mdi:play"></ha-icon>
          ${localize(this.hass, "start_slot", {
            time: duration(this.hass, selected?.duration_min ?? 0),
          })}
        </button>
      </div>
    </div>`;
  }

  private _onStartSlot(slot: SlotRow): void {
    void this._run(() =>
      runSlot(
        this.hass!,
        slot.slot_id,
        this._applyConditions,
        this._config?.entry_id
      )
    );
  }

  // ---- compact ------------------------------------------------------------

  private _renderCompact(): TemplateResult {
    if (this._cfg.view === "zones") return this._renderCompactZones();

    const snap = this._snapshot!;
    const running = snap.state === "running" || snap.state === "stopping";
    const paused = snap.state === "paused";
    const error = snap.state === "error";
    const lead = this._activeZones()[0];
    const next = this._nextRun();

    let stateText: string;
    let stateCls = "";
    if (running && lead) {
      stateText = localize(this.hass, "compact_running", {
        zone: lead.name,
        time: countdown(secondsUntil(lead.ends_at)),
        index: snap.phase_index ?? 1,
        total: snap.phase_total ?? 1,
      });
      stateCls = "pri";
    } else if (this._soaking()) {
      stateText = localize(this.hass, "compact_soaking", {
        time: countdown(secondsUntil(snap.soak_until)),
        index: snap.phase_index ?? 1,
        total: snap.phase_total ?? 1,
      });
      stateCls = "pri";
    } else if (paused && snap.paused_until) {
      stateText = localize(this.hass, "compact_paused", {
        time: dayTime(this.hass, snap.paused_until),
      });
      stateCls = "warn";
    } else if (error) {
      stateText = snap.last_error ?? localize(this.hass, "last_run_failed");
      stateCls = "err";
    } else if (next) {
      stateText = localize(this.hass, "compact_idle", {
        state: this._stateLabel(),
        time: dayTimeShort(this.hass, next.fire_at!),
        duration: duration(this.hass, next.duration_min),
      });
    } else {
      stateText = localize(this.hass, "compact_idle_no_run", {
        state: this._stateLabel(),
      });
    }

    const icon = paused
      ? "mdi:pause"
      : error
        ? "mdi:alert-circle-outline"
        : "mdi:sprinkler-variant";

    const tap = this._tap("card", {
      entityId: snap.entity_id,
      page: "overview",
    });
    return html`<ha-card>
      <div class="crow">
        <div
          class=${classMap({ ctap: true, tappable: tap.on })}
          role=${tap.on ? "button" : nothing}
          tabindex=${tap.on ? "0" : nothing}
          ${actionHandler(tap.options)}
        >
          <div
            class=${classMap({
              cicon: true,
              pri: running,
              warn: paused,
              err: error,
            })}
          >
            <ha-icon class=${classMap({ drip: running })} .icon=${icon}></ha-icon>
          </div>
          <div class="cmain">
            <div class="cname">${snap.name}</div>
            <div class="cstate ${stateCls}">${stateText}</div>
          </div>
        </div>
        ${this._renderCompactAction(running, paused)}
      </div>
      ${this._actionError
        ? html`<div class="error">${this._actionError}</div>`
        : nothing}
    </ha-card>`;
  }

  private _renderCompactAction(
    running: boolean,
    paused: boolean
  ): TemplateResult {
    if (running) {
      return html`<button
        class="cbtn danger"
        ?disabled=${this._busy}
        aria-label=${localize(this.hass, "action_stop")}
        @click=${() => this._onAction("stop")}
      >
        <ha-icon icon="mdi:stop"></ha-icon>
      </button>`;
    }
    if (paused) {
      return html`<button
        class="cbtn muted"
        ?disabled=${this._busy}
        aria-label=${localize(this.hass, "resume_schedule")}
        @click=${() =>
          this._run(() => clearPause(this.hass!, this._config?.entry_id))}
      >
        <ha-icon icon="mdi:play-pause"></ha-icon>
      </button>`;
    }
    return html`<button
      class="cbtn"
      ?disabled=${this._busy || !this._snapshot?.next_runs.length}
      aria-label=${localize(this.hass, "action_run_next")}
      @click=${() => this._onAction("run_next")}
    >
      <ha-icon icon="mdi:play"></ha-icon>
    </button>`;
  }

  private _renderCompactZones(): TemplateResult {
    const zones = this._visibleZones();
    if (!zones.length) {
      return html`<ha-card>
        <div class="empty">${localize(this.hass, "zones_empty")}</div>
      </ha-card>`;
    }
    return html`<ha-card>
      <div class="zc">
        ${zones.map((zone) => {
          const sub = this._zoneSub(zone);
          const tap = this._zoneTap(zone);
          return html`<div
            class=${classMap({
              zcrow: true,
              on: zone.active,
              tappable: tap.on,
            })}
            role=${tap.on ? "button" : nothing}
            tabindex=${tap.on ? "0" : nothing}
            ${actionHandler(tap.options)}
          >
            <span
              class=${classMap({
                zdot: true,
                on: zone.active,
                off: !zone.active && zone.enabled,
                dis: !zone.enabled,
              })}
            ></span>
            <span class="name">${zone.name}</span>
            <span class="val">
              ${zone.active
                ? countdown(secondsUntil(zone.ends_at))
                : sub.text}
            </span>
          </div>`;
        })}
      </div>
    </ha-card>`;
  }
}

declare const __VERSION__: string;

window.customCards = window.customCards ?? [];
window.customCards.push({
  type: "simple-irrigation-card",
  name: "Simple Irrigation Card",
  description:
    "Status, zones, schedule, week timetable and a manual run picker for one irrigation installation.",
  preview: true,
  documentationURL: "https://github.com/florianbaethge/simple_irrigation",
});

// eslint-disable-next-line no-console
console.info(
  `%c SIMPLE-IRRIGATION-CARD %c ${__VERSION__} `,
  "color: #fff; background: #03a9f4; font-weight: 700;",
  "color: #03a9f4; background: #fff; font-weight: 700;"
);

declare global {
  interface HTMLElementTagNameMap {
    "simple-irrigation-card": SimpleIrrigationCard;
  }
}
