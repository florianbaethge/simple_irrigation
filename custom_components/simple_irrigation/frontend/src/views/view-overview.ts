import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { panelControl, runSlotNow, saveGlobal, skipIrrigationToday } from "../data/api";
import { defineCustomElementOnce, formatApiError, navigate } from "../helpers";
import { exportPath } from "../navigation";
import { t } from "../i18n";
import { sharedStyles } from "../shared-styles";
import { formatTimeLocalForDisplay, weekdayLong, weekdaysSummary } from "../date-format";
import { computePhases, cycleSoakOf, programMinutes, type ZonePhaseInput } from "../schedule-phases";
import { durationForMode } from "../timetable-model";
import { mondayBasedWeekday, weekParityMatches, type CycleMeta } from "../cycle";
import type { HomeAssistant, ScheduleNext } from "../types";

const MODES = ["eco", "normal", "extra"] as const;
type Mode = (typeof MODES)[number];

interface UpcomingRun {
  when: Date;
  label: string;
  kind: string;
  zoneNames: string[];
  est: number;
  slotId: string;
}

export class ViewOverview extends LitElement {
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
    sharedStyles,
    css`
      .overview-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
        align-items: start;
        margin-bottom: 20px;
      }
      @container siview (min-width: 780px) {
        .overview-grid {
          grid-template-columns: minmax(300px, 0.85fr) 1.15fr;
        }
      }
      .overview-grid ha-card {
        margin-bottom: 0;
        height: 100%;
        box-sizing: border-box;
      }
      .pause-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 12px;
        border: 1px solid color-mix(in srgb, var(--warning-color, #f0b23a) 45%, transparent);
        background: color-mix(in srgb, var(--warning-color, #f0b23a) 10%, transparent);
        margin-bottom: 20px;
        font-size: 0.9rem;
      }
      .pause-banner ha-icon {
        color: var(--warning-color, #f0b23a);
        flex-shrink: 0;
      }
      .pause-banner .btn-outline {
        margin-left: auto;
      }
      .state-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 4px 10px;
        border-radius: 999px;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
        color: var(--secondary-text-color);
      }
      .state-badge::before {
        content: "";
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }
      .state-badge.running {
        color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 14%, transparent);
      }
      .state-badge.error {
        color: var(--error-color);
        background: color-mix(in srgb, var(--error-color) 14%, transparent);
      }
      .hero-state {
        font-size: 2.6rem;
        font-weight: 300;
        line-height: 1.05;
        letter-spacing: -0.03em;
        margin: 8px 0 12px;
      }
      .hero-state.running {
        color: var(--primary-color);
      }
      .hero-state.error {
        color: var(--error-color);
      }
      .hero-sub {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: -6px 0 12px;
        color: var(--secondary-text-color);
        font-size: 0.9rem;
      }
      .hero-sub ha-icon {
        --mdc-icon-size: 18px;
        flex: none;
      }
      .num {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .pill-list {
        list-style: none;
        margin: 14px 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .pill {
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
      .pill ha-icon {
        flex-shrink: 0;
        --mdc-icon-size: 20px;
        color: var(--primary-color);
        margin-top: 1px;
      }
      .pill strong {
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .action-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 18px;
      }
      /* Next-runs list */
      .nr {
        border: 1px solid var(--divider-color);
        border-radius: 10px;
        padding: 12px 14px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: background 0.12s ease, border-color 0.12s ease;
      }
      .nr:hover {
        border-color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 4%, transparent);
      }
      .nr:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      .nr.first {
        border-left: 3px solid var(--primary-color);
      }
      .nr.faded {
        border-style: dashed;
        opacity: 0.72;
      }
      .nr-top {
        display: flex;
        align-items: baseline;
        gap: 8px 10px;
        flex-wrap: wrap;
      }
      .nr-when {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .nr-desc {
        color: var(--secondary-text-color);
        font-size: 0.88rem;
      }
      .nr-dur {
        margin-left: auto;
        color: var(--primary-color);
        font-variant-numeric: tabular-nums;
        font-size: 0.85rem;
        white-space: nowrap;
      }
      .nr-zones {
        color: var(--secondary-text-color);
        font-size: 0.85rem;
        margin-top: 4px;
        line-height: 1.4;
      }
      .mode-total {
        margin: 12px 0 0;
        font-size: 0.85rem;
        color: var(--secondary-text-color);
      }
      .mode-total .num {
        color: var(--primary-text-color);
      }
    `,
  ];

  @state() private _busy = false;
  @state() private _msg?: string;
  private _tick?: number;
  private _tickMs = 0;

  connectedCallback(): void {
    super.connectedCallback();
    this._syncTick();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearTick();
  }

  updated(): void {
    this._syncTick();
  }

  /** Second-resolution while a zone is watering, lazy otherwise. */
  private _syncTick(): void {
    const wanted = this._runBusy() ? 1000 : 30000;
    if (this._tick !== undefined && this._tickMs === wanted) return;
    this._clearTick();
    this._tickMs = wanted;
    this._tick = window.setInterval(() => this.requestUpdate(), wanted);
  }

  private _clearTick(): void {
    if (this._tick !== undefined) window.clearInterval(this._tick);
    this._tick = undefined;
  }

  private get _inst(): Record<string, unknown> {
    return this.installation ?? {};
  }

  private _mode(): Mode {
    const m = String(this._inst.mode ?? "normal");
    return (MODES as readonly string[]).includes(m) ? (m as Mode) : "normal";
  }

  private _planEnabled(): boolean {
    return Boolean(this._inst.enabled ?? true);
  }

  private _pauseUntil(): number | null {
    const raw = this._inst.pause_until;
    if (!raw || typeof raw !== "string") return null;
    const ms = Date.parse(raw);
    return Number.isNaN(ms) || ms <= Date.now() ? null : ms;
  }

  private _zoneName(zoneId: string): string {
    const zones = this._inst.zones as Record<string, Record<string, unknown>> | undefined;
    const z = zones?.[zoneId];
    return z ? String(z.name ?? zoneId) : zoneId;
  }

  /** Friendly name of any entity, falling back to its id. */
  private _entityName(entityId: string): string {
    const st = this.hass?.states?.[entityId];
    return st ? String(st.attributes?.friendly_name ?? entityId) : entityId;
  }

  private _zonesPhaseInput(): Record<string, ZonePhaseInput> {
    const zones = this._inst.zones as Record<string, Record<string, unknown>> | undefined;
    const out: Record<string, ZonePhaseInput> = {};
    if (!zones) return out;
    for (const [id, z] of Object.entries(zones)) {
      out[id] = { enabled: Boolean(z?.enabled ?? true), exclusive: Boolean(z?.exclusive ?? false) };
    }
    return out;
  }

  private _maxParallel(): number {
    const n = Number(this._inst.max_parallel_zones ?? 2);
    return Number.isFinite(n) && n >= 1 ? n : 2;
  }

  private _slotEstimateMin(slot: Record<string, unknown> | undefined, mode: string): number {
    const zones = this._inst.zones as Record<string, Record<string, unknown>> | undefined;
    if (!zones || !slot) return 0;
    const zoneIds = Array.isArray(slot.zone_ids_ordered) ? (slot.zone_ids_ordered as string[]) : [];
    if (!zoneIds.length) return 0;
    const phases = computePhases(zoneIds, this._zonesPhaseInput(), this._maxParallel(), true);
    const preStart = Math.max(0, Number(this._inst.pre_start_delay_sec ?? 10)) / 60;
    const minutes = programMinutes(phases, cycleSoakOf(slot), (zid) => {
      const z = zones[zid];
      return z && Boolean(z.enabled ?? true) ? durationForMode(z, mode) : 0;
    });
    return Math.round(preStart + minutes);
  }

  private _slot(slotId: string): Record<string, unknown> | undefined {
    const slots = this._inst.schedule_slots as Array<Record<string, unknown>> | undefined;
    return slots?.find((x) => String(x.slot_id) === slotId);
  }

  /** Humanised cadence for a slot ("every 2 days", "weekly", or its weekday list). */
  private _kindLabel(slot: Record<string, unknown>): string {
    const kind = String(slot.cycle_kind ?? "custom");
    const meta = (slot.cycle_meta as CycleMeta) ?? null;
    switch (kind) {
      case "daily":
        return t(this.hass, "config_panel.cycle_kind_daily");
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
      default: {
        const wds = Array.isArray(slot.weekdays)
          ? (slot.weekdays as number[])
          : [Number(slot.weekday ?? 0)];
        return weekdaysSummary(this.hass, wds);
      }
    }
  }

  /** The next `limit` distinct run fires across all enabled slots (client-side). */
  private _upcomingRuns(limit: number): UpcomingRun[] {
    const slots = (this._inst.schedule_slots as Array<Record<string, unknown>> | undefined) ?? [];
    if (!this._planEnabled()) return [];
    const pauseMs = this._pauseUntil();
    const now = new Date();
    const runs: UpcomingRun[] = [];
    const mode = this._mode();

    for (let i = 0; i < 21 && runs.length < limit * 4; i++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const wd = mondayBasedWeekday(day);
      for (const slot of slots) {
        if (!(slot.enabled ?? true)) continue;
        const weekdays = Array.isArray(slot.weekdays)
          ? (slot.weekdays as number[])
          : [Number(slot.weekday ?? 0)];
        if (!weekdays.includes(wd)) continue;
        const parity = String(slot.week_parity ?? "every");
        if (!weekParityMatches(day, parity as "every" | "odd" | "even")) continue;
        const [h, mi] = String(slot.time_local ?? "06:00").split(":").map(Number);
        const when = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h || 0, mi || 0);
        if (when <= now) continue;
        if (pauseMs !== null && when.getTime() < pauseMs) continue;
        const zoneIds = Array.isArray(slot.zone_ids_ordered)
          ? (slot.zone_ids_ordered as string[])
          : [];
        runs.push({
          when,
          label: String((slot.cycle_meta as CycleMeta)?.label ?? slot.name ?? "").trim(),
          kind: this._kindLabel(slot),
          zoneNames: zoneIds.map((id) => this._zoneName(id)),
          est: this._slotEstimateMin(slot, mode),
          slotId: String(slot.slot_id ?? ""),
        });
      }
    }
    runs.sort((a, b) => a.when.getTime() - b.when.getTime());
    return runs.slice(0, limit);
  }

  private _relDay(d: Date): string {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((startD.getTime() - startToday.getTime()) / 86400000);
    if (diff === 0) return t(this.hass, "config_panel.overview_today");
    if (diff === 1) return t(this.hass, "config_panel.overview_tomorrow");
    return weekdayLong(this.hass, mondayBasedWeekday(d));
  }

  private _fmtCountdown(ms: number): string {
    const diff = ms - Date.now();
    if (diff <= 0) return t(this.hass, "config_panel.overview_countdown_soon");
    const totalMin = Math.round(diff / 60000);
    const d = Math.floor(totalMin / 1440);
    const h = Math.floor((totalMin % 1440) / 60);
    const m = totalMin % 60;
    if (d > 0) return t(this.hass, "config_panel.overview_countdown_days", { d, h });
    if (h > 0) return t(this.hass, "config_panel.overview_countdown_hours", { h, m });
    if (m > 0) return t(this.hass, "config_panel.overview_countdown_minutes", { m });
    return t(this.hass, "config_panel.overview_countdown_soon");
  }

  /** Planned end of a watering zone, as pushed by the runtime. */
  private _zoneEndsAt(zoneId: string): number | null {
    const rs = (this.runState ?? {}) as Record<string, unknown>;
    const ends = rs.zone_ends_at as Record<string, string> | undefined;
    const raw = ends?.[zoneId];
    if (!raw) return null;
    const ms = new Date(raw).getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  /** `m:ss` while watering — a running zone is minutes, not days, away from done. */
  private _fmtRemaining(endsAtMs: number): string {
    const diff = endsAtMs - Date.now();
    if (diff <= 0) return t(this.hass, "config_panel.general_remaining_finishing");
    const totalSec = Math.round(diff / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
    return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
  }

  private _fmtTime(d: Date): string {
    return formatTimeLocalForDisplay(
      this.hass,
      `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
    );
  }

  private _runBusy(): boolean {
    const s = String((this.runState ?? {}).run_state ?? "idle");
    return ["preparing", "running", "stopping"].includes(s);
  }

  private async _call(fn: () => Promise<{ success: boolean; error?: string }>): Promise<void> {
    this._busy = true;
    this._msg = undefined;
    this.requestUpdate();
    try {
      const res = await fn();
      if (!res.success) this._msg = formatApiError(res.error, this.hass);
      else this.onSaved?.();
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  private _setMode(mode: Mode): void {
    if (mode === this._mode()) return;
    void this._call(() => saveGlobal(this.hass, this.entryId, { mode }));
  }

  private _runNextSlot(runs: UpcomingRun[]): void {
    const sid = runs[0]?.slotId || this.scheduleNext?.slots?.[0]?.slot_id;
    if (!sid) return;
    void this._call(() => runSlotNow(this.hass, this.entryId, sid));
  }

  private _pause48h(): void {
    const until = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    void this._call(() => saveGlobal(this.hass, this.entryId, { pause_until: until }));
  }

  private _goSchedule(slotId?: string): void {
    const q = slotId ? `?editSlot=${encodeURIComponent(slotId)}` : "";
    navigate(this, `${exportPath(this.entryId, "schedule")}${q}`);
  }

  private _renderCurrentRun(runs: UpcomingRun[]): TemplateResult {
    const rs = (this.runState ?? {}) as Record<string, unknown>;
    const runState = String(rs.run_state ?? "idle");
    const runBusy = this._runBusy();
    const activeIds = Array.isArray(rs.active_zone_ids) ? (rs.active_zone_ids as string[]) : [];
    // Only while actually watering: "preparing" and "stopping" have no deadline to
    // count down to, and a leftover entry must never render a phantom countdown.
    const remainingRows =
      runState === "running"
        ? activeIds
            .map((id) => ({ name: this._zoneName(id), endsAt: this._zoneEndsAt(id) }))
            .filter((r): r is { name: string; endsAt: number } => r.endsAt !== null)
        : [];
    const lastErr = rs.last_error ? String(rs.last_error) : "";
    // Resting between Cycle & Soak passes: no zone is open, but the run goes on.
    const soakUntil = runState === "running" && rs.soak_until ? new Date(String(rs.soak_until)).getTime() : NaN;
    const soaking = Number.isFinite(soakUntil);
    const upcoming = Array.isArray(rs.upcoming_phases) ? (rs.upcoming_phases as string[][]) : [];
    const nextZones = upcoming
      .map((g) => g.map((id) => this._zoneName(String(id))).join(", "))
      .filter(Boolean)
      .join(" → ");
    const mode = this._mode();
    const next = runs[0];
    const badgeClass = runBusy ? "running" : runState === "error" ? "error" : "";
    const stateWord = runBusy
      ? runState === "preparing"
        ? t(this.hass, "config_panel.general_state_preparing")
        : runState === "stopping"
          ? t(this.hass, "config_panel.general_state_stopping")
          : soaking
            ? t(this.hass, "config_panel.general_state_soaking")
            : t(this.hass, "config_panel.general_state_running")
      : runState === "error"
        ? t(this.hass, "config_panel.general_state_error_idle")
        : t(this.hass, "config_panel.general_state_idle");
    const showSkip =
      runBusy && runState !== "stopping" && (runState === "preparing" || upcoming.length > 0);
    // A blocking script is why "Preparing" can sit there for minutes — name it.
    const activeScript = rs.active_script ? String(rs.active_script) : "";
    const scriptLine = activeScript
      ? t(
          this.hass,
          runState === "stopping"
            ? "config_panel.general_state_post_run_script"
            : "config_panel.general_state_pre_start_script",
          { name: this._entityName(activeScript) }
        )
      : "";

    return html`
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:sprinkler-variant"></ha-icon>
          ${t(this.hass, "config_panel.general_card_current_run")}
          <span class="header-actions">
            <span class="state-badge ${badgeClass}">${stateWord}</span>
          </span>
        </div>
        <div class="card-content">
          ${this._msg ? html`<div class="error">${this._msg}</div>` : nothing}
          <div class="hero-state ${badgeClass}">${stateWord}</div>
          ${scriptLine
            ? html`<div class="hero-sub">
                <ha-icon icon="mdi:script-text-play-outline"></ha-icon>
                <span>${scriptLine}</span>
              </div>`
            : nothing}

          ${!runBusy && this._planEnabled() && next
            ? html`
                <div class="meta-line">
                  <span class="meta"
                    ><ha-icon icon="mdi:clock-outline"></ha-icon>${this._fmtCountdown(
                      next.when.getTime()
                    )}</span
                  >
                  <span class="meta"
                    ><ha-icon icon="mdi:water-percent"></ha-icon>${t(
                      this.hass,
                      `config_panel.general_mode_${mode}`
                    )}</span
                  >
                  ${next.zoneNames.length
                    ? html`<span class="meta"
                        ><ha-icon icon="mdi:format-list-numbered"></ha-icon>${t(
                          this.hass,
                          "config_panel.overview_zones_queued",
                          { n: next.zoneNames.length }
                        )}</span
                      >`
                    : nothing}
                  ${next.est > 0
                    ? html`<span class="meta"
                        ><ha-icon icon="mdi:timer-outline"></ha-icon
                        ><span class="num">~${next.est}</span> min</span
                      >`
                    : nothing}
                </div>
              `
            : nothing}

          ${activeIds.length || soaking || nextZones || lastErr
            ? html`
                <ul class="pill-list">
                  ${soaking
                    ? html`<li class="pill">
                        <ha-icon icon="mdi:timer-sand"></ha-icon>
                        <span><strong>${t(this.hass, "config_panel.general_soak_remaining")}</strong>
                          <span class="num">${this._fmtRemaining(soakUntil)}</span></span>
                      </li>`
                    : nothing}
                  ${activeIds.length
                    ? html`<li class="pill">
                        <ha-icon icon="mdi:water"></ha-icon>
                        <span><strong>${t(this.hass, "config_panel.general_active_zones")}</strong>
                          ${activeIds.map((id) => this._zoneName(id)).join(", ")}</span>
                      </li>`
                    : nothing}
                  ${remainingRows.length
                    ? html`<li class="pill">
                        <ha-icon icon="mdi:timer-sand"></ha-icon>
                        <span><strong>${t(this.hass, "config_panel.general_remaining")}</strong>
                          ${remainingRows.map(
                            (r, i) =>
                              html`${i > 0 ? ", " : ""}${r.name}
                                <span class="num">${this._fmtRemaining(r.endsAt)}</span>`
                          )}</span>
                      </li>`
                    : nothing}
                  ${nextZones
                    ? html`<li class="pill">
                        <ha-icon icon="mdi:playlist-play"></ha-icon>
                        <span><strong>${t(this.hass, "config_panel.general_next_zones")}</strong>
                          ${nextZones}</span>
                      </li>`
                    : nothing}
                  ${lastErr
                    ? html`<li class="pill">
                        <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
                        <span><strong>${t(this.hass, "config_panel.general_last_error")}</strong>
                          ${lastErr}</span>
                      </li>`
                    : nothing}
                </ul>
              `
            : nothing}

          <div class="action-row">
            ${runBusy
              ? html`
                  <!-- Already stopping: the run is ending and its cleanup (post-run
                       script) cannot be cut short, so the button would only hang. The
                       hero line above says what it is waiting for. -->
                  <button type="button" class="btn-danger"
                    ?disabled=${this._busy || runState === "stopping"}
                    @click=${() => this._call(() => panelControl(this.hass, this.entryId, "stop"))}>
                    ${t(this.hass, "config_panel.general_stop_irrigation")}
                  </button>
                  ${showSkip
                    ? html`<button type="button" class="btn-outline" ?disabled=${this._busy}
                        @click=${() => this._call(() => panelControl(this.hass, this.entryId, "skip_phase"))}>
                        ${t(this.hass, "config_panel.general_skip_phase")}
                      </button>`
                    : nothing}
                `
              : html`
                  <button type="button" class="btn"
                    ?disabled=${this._busy || !this._planEnabled() || !next}
                    @click=${() => this._runNextSlot(runs)}>
                    ${t(this.hass, "config_panel.overview_run_next_now")}
                  </button>
                  <button type="button" class="btn-outline"
                    ?disabled=${this._busy || !this._planEnabled()}
                    @click=${() => this._call(() => skipIrrigationToday(this.hass, this.entryId))}>
                    ${t(this.hass, "config_panel.general_skip_today")}
                  </button>
                  <button type="button" class="btn-outline"
                    ?disabled=${this._busy || !this._planEnabled()}
                    @click=${() => this._pause48h()}>
                    ${t(this.hass, "config_panel.overview_pause_48h")}
                  </button>
                `}
            ${lastErr
              ? html`<button type="button" class="btn-outline" ?disabled=${this._busy}
                  @click=${() => this._call(() => panelControl(this.hass, this.entryId, "clear_error"))}>
                  ${t(this.hass, "config_panel.general_clear_error")}
                </button>`
              : nothing}
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderNextRuns(runs: UpcomingRun[]): TemplateResult {
    return html`
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:calendar-clock"></ha-icon>
          ${t(this.hass, "config_panel.overview_next_runs")}
          <span class="header-actions">
            <button type="button" class="btn-icon" @click=${() => this._goSchedule()}>
              ${t(this.hass, "config_panel.tab_schedule")} →
            </button>
          </span>
        </div>
        <div class="card-content">
          ${!this._planEnabled()
            ? html`<p class="hint">${t(this.hass, "config_panel.general_plan_off_hint")}</p>`
            : nothing}
          ${runs.length
            ? runs.map((r, i) => {
                const desc = [r.label, r.kind].filter(Boolean).join(" · ");
                return html`
                  <div
                    class="nr ${i === 0 ? "first" : ""} ${i >= 2 ? "faded" : ""}"
                    role="button"
                    tabindex="0"
                    @click=${() => this._goSchedule(r.slotId)}
                    @keydown=${(e: KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        this._goSchedule(r.slotId);
                      }
                    }}
                  >
                    <div class="nr-top">
                      <span class="nr-when">${this._relDay(r.when)} ${this._fmtTime(r.when)}</span>
                      <span class="nr-desc">${desc}</span>
                      ${r.est > 0
                        ? html`<span class="nr-dur">~${r.est} min</span>`
                        : nothing}
                    </div>
                    ${r.zoneNames.length && i < 2
                      ? html`<div class="nr-zones ellipsis">${r.zoneNames.join(", ")}</div>`
                      : nothing}
                  </div>
                `;
              })
            : html`<div class="empty-state">
                <ha-icon icon="mdi:calendar-blank-outline"></ha-icon>
                <p>${t(this.hass, "config_panel.general_no_slots")}</p>
                <button type="button" class="btn-outline" @click=${() => this._goSchedule()}>
                  ${t(this.hass, "config_panel.tab_schedule")}
                </button>
              </div>`}
        </div>
      </ha-card>
    `;
  }

  private _renderMode(runs: UpcomingRun[]): TemplateResult {
    const mode = this._mode();
    const next = runs[0];
    const nextSlot = next ? this._slot(next.slotId) : undefined;
    const eco = this._slotEstimateMin(nextSlot, "eco");
    const extra = this._slotEstimateMin(nextSlot, "extra");
    const cur = next?.est ?? 0;
    return html`
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:water-percent"></ha-icon>
          ${t(this.hass, "config_panel.general_watering_mode")}
        </div>
        <div class="card-content">
          <div class="segmented" role="group" aria-label=${t(this.hass, "config_panel.general_watering_mode")}>
            ${MODES.map(
              (m) => html`<button
                type="button"
                class=${m === mode ? "selected" : ""}
                aria-pressed=${m === mode ? "true" : "false"}
                ?disabled=${this._busy}
                @click=${() => this._setMode(m)}
              >
                ${t(this.hass, `config_panel.general_mode_${m}`)}
              </button>`
            )}
          </div>
          ${next
            ? html`<p class="mode-total">
                ${t(this.hass, "config_panel.overview_mode_total", { n: cur })} ·
                ${t(this.hass, "config_panel.general_mode_eco")}
                <span class="num">${eco}</span> min ·
                ${t(this.hass, "config_panel.general_mode_extra")}
                <span class="num">${extra}</span> min
              </p>`
            : nothing}
          <details class="inline-help">
            <summary>
              <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
              ${t(this.hass, "config_panel.general_watering_mode")}
            </summary>
            <p>${t(this.hass, "config_panel.general_watering_mode_desc")}</p>
          </details>
        </div>
      </ha-card>
    `;
  }

  protected render() {
    const pauseMs = this._pauseUntil();
    const runs = this._upcomingRuns(4);

    return html`
      ${pauseMs !== null
        ? html`<div class="pause-banner">
            <ha-icon icon="mdi:pause-circle-outline"></ha-icon>
            <span>${t(this.hass, "config_panel.general_pause_active_hint", {
              when: new Date(pauseMs).toLocaleString(),
            })}</span>
            <button type="button" class="btn-outline" ?disabled=${this._busy}
              @click=${() => this._call(() => saveGlobal(this.hass, this.entryId, { pause_until: null }))}>
              ${t(this.hass, "config_panel.general_clear_pause")}
            </button>
          </div>`
        : nothing}

      <div class="overview-grid">
        ${this._renderCurrentRun(runs)}
        ${this._renderNextRuns(runs)}
      </div>
      ${this._renderMode(runs)}
    `;
  }
}

defineCustomElementOnce("si-view-overview", ViewOverview);
