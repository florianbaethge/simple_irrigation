import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import { state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { repeat } from "lit/directives/repeat.js";
import { styleMap } from "lit/directives/style-map.js";
import { runZoneNow, saveZone, saveZoneOrder, stopZone } from "../data/api";
import { renderNativeEntityField } from "../entity-input";
import { renderInlineHelp } from "../inline-help";
import {
  accordionStyles,
  renderAccordion,
  renderAccordionGroup,
  type AccordionSection,
} from "../accordion";
import {
  entitiesSummary,
  missingSummary,
  noneSummary,
  quietSummary,
  saidSummary,
  summaryEntityName,
  type Summary,
} from "../summaries";
import { durationForMode } from "../timetable-model";
import {
  formatRateNumber,
  formatVolumeNumber,
  litresToUnit,
  unitToLitres,
  volumeUnit,
} from "../units";
import { apiErrorCode, defineCustomElementOnce, formatApiError } from "../helpers";
import { t } from "../i18n";
import { formLayoutStyles } from "../form-layout-styles";
import { sharedStyles } from "../shared-styles";
import { slotInclusionCountPerZone } from "../timetable-model";
import { orderedZoneIds } from "../zone-order";
import type { HomeAssistant } from "../types";

const defaultDomains = ["switch", "input_boolean", "group", "valve"];

/** Entity domains the start target usually lives in — the start service does not
 *  always address the output itself (Hydrawise starts via its `binary_sensor`).
 *  Suggestions only: the backend puts no domain rule on `start_entity_id`, so the
 *  picker for that field runs with `allowCustom`. */
const startTargetDomains = ["switch", "valve", "binary_sensor", "input_boolean", "number"];

/** A valve's own countdown is a number entity; the backend enforces the domain. */
const countdownDomains = ["number", "input_number"];

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

/** Distance from the top or bottom edge at which a drag starts scrolling the list. */
const DRAG_SCROLL_EDGE_PX = 56;
const DRAG_SCROLL_STEP_PX = 10;

/** A zone row being dragged to a new place in the list. */
interface ZoneDrag {
  zoneId: string;
  pointerId: number;
  from: number;
  to: number;
  /** How far the row has travelled since it was grabbed, list scrolling included. */
  dy: number;
  clientY: number;
  startY: number;
  scroller: Element;
  startScroll: number;
  /** Top and height of every row when the drag began, in list order. */
  tops: number[];
  heights: number[];
  gap: number;
}

/** The element that scrolls `el`, found across shadow roots and slots. */
function scrollParent(el: Element): Element {
  let node: Node | null = el;
  while (node) {
    if (node instanceof Element) {
      const overflow = getComputedStyle(node).overflowY;
      if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight) {
        return node;
      }
      node = node.assignedSlot ?? node.parentNode;
    } else {
      node = node instanceof ShadowRoot ? node.host : node.parentNode;
    }
  }
  return document.scrollingElement ?? document.documentElement;
}

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
  water_meter_entity_id: string;
  flow_rate_lpm: number;
  countdown_entity_id: string;
  countdown_unit: string;
  /** Outputs that must be open for the zone to get water. */
  supply_entity_ids: string[];
  /** Seconds between supply and zone; null takes the installation's delay. */
  supply_lead_sec: number | null;
  supply_trail_sec: number;
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
  onSaved?: () => void | Promise<void>;

  static styles = [
    sharedStyles,
    formLayoutStyles,
    accordionStyles,
    css`
      .compact-row.running {
        border-left-color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 6%, var(--card-background-color));
      }
      /* Tucked into the row's left padding so the name keeps its width on phones. */
      .drag-handle {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 40px;
        margin: 0 -6px 0 -8px;
        padding: 0;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--secondary-text-color);
        cursor: grab;
        /* The handle is the one place a touch moves a row instead of the page. */
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
      }
      .drag-handle:hover {
        color: var(--primary-text-color);
      }
      .drag-handle:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: -2px;
      }
      .drag-handle ha-icon {
        --mdc-icon-size: 20px;
        pointer-events: none;
      }
      .compact-row.dragging {
        position: relative;
        z-index: 2;
        transition: none;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
      }
      .compact-row.dragging .drag-handle {
        cursor: grabbing;
      }
      .compact-row.shifting {
        transition: transform 0.15s ease;
      }
    `,
  ];

  @state() private _busy = false;
  @state() private _msg?: string;
  @state() private _addDialogOpen = false;
  @state() private _editDraft: ZoneRow | null = null;
  @state() private _filter: ZoneFilter = "all";
  @state() private _expanded = new Set<string>();
  @state() private _drag?: ZoneDrag;
  // The editor's accordion: at most one section open.
  @state() private _openSection: string | null = "outputs";
  /** The order on screen while a reorder is being saved; the installation's otherwise. */
  @state() private _orderDraft?: string[];
  private _orderSaving = false;
  private _dragScrollFrame?: number;
  private _new: ZoneRow = this._blankZone();
  private _tick?: number;

  connectedCallback(): void {
    super.connectedCallback();
    this._syncTick();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearTick();
    this._endDrag();
  }

  updated(): void {
    this._syncTick();
  }

  /** Second-resolution countdown while a zone is watering; nothing to redraw otherwise. */
  private _syncTick(): void {
    const wanted = this._activeZoneIds().length > 0;
    if (wanted === (this._tick !== undefined)) return;
    if (wanted) this._tick = window.setInterval(() => this.requestUpdate(), 1000);
    else this._clearTick();
  }

  private _clearTick(): void {
    if (this._tick !== undefined) window.clearInterval(this._tick);
    this._tick = undefined;
  }

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
      water_meter_entity_id: "",
      flow_rate_lpm: 0,
      countdown_entity_id: "",
      countdown_unit: "",
      supply_entity_ids: [""],
      supply_lead_sec: null,
      supply_trail_sec: 0,
    };
  }

  private _cloneZone(z: ZoneRow): ZoneRow {
    return {
      ...z,
      switch_entity_ids: [...z.switch_entity_ids],
      supply_entity_ids: [...z.supply_entity_ids],
    };
  }

  private _zonesFromInstallation(): ZoneRow[] {
    const zones = this.installation?.zones as Record<string, Record<string, unknown>> | undefined;
    if (!zones) return [];
    // A draft outlives a reload for a moment; skip a zone deleted in the meantime.
    const ids = this._zoneOrder().filter((id) => id in zones);
    return ids.map((zone_id) => {
      const o = zones[zone_id];
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
        water_meter_entity_id: String(o.water_meter_entity_id ?? ""),
        flow_rate_lpm: Math.max(0, Number(o.flow_rate_lpm ?? 0) || 0),
        countdown_entity_id: String(o.countdown_entity_id ?? ""),
        countdown_unit: String(o.countdown_unit ?? ""),
        // One empty row, so the section opens on a picker rather than a button.
        supply_entity_ids:
          Array.isArray(o.supply_entity_ids) && o.supply_entity_ids.length
            ? (o.supply_entity_ids as unknown[]).map(String)
            : [""],
        supply_lead_sec: typeof o.supply_lead_sec === "number" ? o.supply_lead_sec : null,
        supply_trail_sec: Number(o.supply_trail_sec ?? 0) || 0,
      };
    });
  }

  private _zoneOrder(): string[] {
    return this._orderDraft ?? orderedZoneIds(this.installation);
  }

  /**
   * Show `order` at once and save it. A move made while a save is under way is
   * not lost: the draft holds the latest order, and the loop sends it as soon
   * as the request before it has returned.
   */
  private async _commitZoneOrder(order: string[]): Promise<void> {
    this._orderDraft = order;
    if (this._orderSaving) return;
    this._orderSaving = true;
    this._msg = undefined;
    let sent: string[] | undefined;
    try {
      while (this._orderDraft !== sent) {
        sent = this._orderDraft;
        const res = await saveZoneOrder(this.hass, this.entryId, sent);
        if (!res.success) throw res.error;
        // Reload before dropping the draft, so the list never shows the old order.
        if (this._orderDraft === sent) await this.onSaved?.();
      }
    } catch (e) {
      this._msg = formatApiError(e, this.hass);
      // The zones changed under the drag: show what is really there.
      void this.onSaved?.();
    } finally {
      this._orderSaving = false;
      this._orderDraft = undefined;
    }
  }

  /** One step up or down, from an arrow key on the handle. */
  private async _moveZone(zoneId: string, offset: -1 | 1): Promise<void> {
    const order = [...this._zoneOrder()];
    const from = order.indexOf(zoneId);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    void this._commitZoneOrder(order);
    // The row moved in the DOM and took the focus with it into nowhere.
    await this.updateComplete;
    this.renderRoot
      .querySelector<HTMLElement>(`.drag-handle[data-zone-id="${zoneId}"]`)
      ?.focus();
  }

  private _onHandleKeydown(e: KeyboardEvent, zoneId: string): void {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    if (!this._drag) void this._moveZone(zoneId, e.key === "ArrowUp" ? -1 : 1);
  }

  private _onDragKeydown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this._endDrag();
  };

  private _onHandlePointerDown(e: PointerEvent, zoneId: string): void {
    if (e.button !== 0 || this._drag) return;
    const handle = e.currentTarget as HTMLElement;
    const rows = [...this.renderRoot.querySelectorAll<HTMLElement>(".compact-row")];
    const from = this._zoneOrder().indexOf(zoneId);
    if (from < 0 || rows.length !== this._zoneOrder().length) return;
    // No text selection and no focus ring from the press that starts a drag.
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const rects = rows.map((row) => row.getBoundingClientRect());
    const scroller = scrollParent(this);
    this._drag = {
      zoneId,
      pointerId: e.pointerId,
      from,
      to: from,
      dy: 0,
      clientY: e.clientY,
      startY: e.clientY,
      scroller,
      startScroll: scroller.scrollTop,
      tops: rects.map((r) => r.top),
      heights: rects.map((r) => r.height),
      gap: rects.length > 1 ? rects[1].top - rects[0].bottom : 0,
    };
    this._dragScrollFrame = requestAnimationFrame(() => this._dragAutoScroll());
    window.addEventListener("keydown", this._onDragKeydown);
  }

  private _onHandlePointerMove(e: PointerEvent): void {
    if (!this._drag || e.pointerId !== this._drag.pointerId) return;
    this._trackDrag(e.clientY);
  }

  /** Where the dragged row is now, and which place in the list that makes. */
  private _trackDrag(clientY: number): void {
    const d = this._drag;
    if (!d) return;
    const { from, tops, heights } = d;
    const last = tops.length - 1;
    const travelled = clientY - d.startY + (d.scroller.scrollTop - d.startScroll);
    const dy = Math.max(
      tops[0] - tops[from],
      Math.min(tops[last] + heights[last] - tops[from] - heights[from], travelled)
    );
    // A neighbour gives way once the dragged row's leading edge is past its
    // middle. Comparing middles would leave the first and last place out of
    // reach, since the row cannot be dragged beyond the ends of the list.
    const top = tops[from] + dy;
    const bottom = top + heights[from];
    const middle = (i: number) => tops[i] + heights[i] / 2;
    let to = from;
    if (dy > 0) while (to < last && bottom > middle(to + 1)) to++;
    else while (to > 0 && top < middle(to - 1)) to--;
    this._drag = { ...d, clientY, dy, to };
  }

  /** Scroll the list while the pointer rests near its top or bottom edge. */
  private _dragAutoScroll(): void {
    const d = this._drag;
    if (!d) return;
    const box = d.scroller.getBoundingClientRect();
    const top = Math.max(box.top, 0);
    const bottom = Math.min(box.bottom, window.innerHeight);
    const before = d.scroller.scrollTop;
    if (d.clientY < top + DRAG_SCROLL_EDGE_PX) d.scroller.scrollTop -= DRAG_SCROLL_STEP_PX;
    else if (d.clientY > bottom - DRAG_SCROLL_EDGE_PX) d.scroller.scrollTop += DRAG_SCROLL_STEP_PX;
    if (d.scroller.scrollTop !== before) this._trackDrag(d.clientY);
    this._dragScrollFrame = requestAnimationFrame(() => this._dragAutoScroll());
  }

  private _onHandlePointerUp(e: PointerEvent): void {
    const d = this._drag;
    if (!d || e.pointerId !== d.pointerId) return;
    this._endDrag();
    if (d.to === d.from) return;
    const order = [...this._zoneOrder()];
    order.splice(d.to, 0, ...order.splice(d.from, 1));
    void this._commitZoneOrder(order);
  }

  private _endDrag(): void {
    if (this._dragScrollFrame !== undefined) cancelAnimationFrame(this._dragScrollFrame);
    this._dragScrollFrame = undefined;
    window.removeEventListener("keydown", this._onDragKeydown);
    this._drag = undefined;
  }

  /** The offset that shows a row where it would land if the drag ended now. */
  private _dragStyle(index: number): Record<string, string> {
    const d = this._drag;
    if (!d) return {};
    if (index === d.from) return { transform: `translateY(${d.dy}px)` };
    const step = d.heights[d.from] + d.gap;
    if (index > d.from && index <= d.to) return { transform: `translateY(${-step}px)` };
    if (index < d.from && index >= d.to) return { transform: `translateY(${step}px)` };
    return {};
  }

  /** "~120 L" for one run of the zone in the active mode; "" without a rate. */
  private _waterPerRun(z: ZoneRow): string {
    if (z.flow_rate_lpm <= 0) return "";
    const minutes = durationForMode(
      { duration_eco_min: z.duration_eco_min, duration_normal_min: z.duration_normal_min, duration_extra_min: z.duration_extra_min },
      this._mode()
    );
    const unit = volumeUnit(this.hass);
    return t(this.hass, "config_panel.water_approx", {
      v: formatVolumeNumber(litresToUnit(z.flow_rate_lpm * minutes, unit)),
      u: unit,
    });
  }

  /** What the zone used last time, from the run state; "" when it tracks none. */
  private _waterLastRun(z: ZoneRow): string {
    const rs = this._rs();
    const last = (rs.water_last_run_l as Record<string, number> | undefined)?.[z.zone_id];
    if (last === undefined || last === null) return "";
    const source = (rs.water_source as Record<string, string> | undefined)?.[z.zone_id];
    const unit = volumeUnit(this.hass);
    const key = source === "measured" ? "config_panel.water_exact" : "config_panel.water_approx";
    return t(this.hass, key, { v: formatVolumeNumber(litresToUnit(Number(last), unit)), u: unit });
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

  private _rs(): Record<string, unknown> {
    return this.runState ?? {};
  }

  private _runStateWord(): string {
    return String(this._rs().run_state ?? "idle");
  }

  private _runBusy(): boolean {
    return ["preparing", "running", "stopping"].includes(this._runStateWord());
  }

  /** Zones watering right now. */
  private _activeZoneIds(): string[] {
    if (!this._runBusy()) return [];
    const ids = this._rs().active_zone_ids;
    return Array.isArray(ids) ? ids.map(String) : [];
  }

  /** Zones waiting for a later phase of the current run (during the pre-start
   *  delay that is every zone of the run). */
  private _queuedZoneIds(): string[] {
    if (!this._runBusy()) return [];
    const phases = this._rs().upcoming_phases;
    if (!Array.isArray(phases)) return [];
    const out: string[] = [];
    for (const group of phases) {
      if (Array.isArray(group)) for (const id of group) out.push(String(id));
    }
    return out;
  }

  /** Planned end of a watering zone, as pushed by the runtime. */
  private _zoneEndsAt(zoneId: string): number | null {
    const ends = this._rs().zone_ends_at as Record<string, string> | undefined;
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

  /** The sentence for a run_zone / stop_zone error code; anything else goes
   *  through the generic formatter. */
  private _runErrorMessage(code: string | undefined, raw: unknown): string {
    const map: Record<string, string> = {
      busy: "config_panel.zones_err_busy",
      zone_already_queued: "config_panel.zones_err_zone_already_queued",
      zone_not_running: "config_panel.zones_err_zone_not_running",
      unknown_zone: "config_panel.zones_err_unknown_zone",
      zone_disabled: "config_panel.zones_err_zone_disabled",
      zone_no_outputs: "config_panel.zones_err_zone_no_outputs",
    };
    if (code && map[code]) return t(this.hass, map[code]);
    return formatApiError(raw, this.hass);
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
        const code = res.error ?? "run_failed";
        this._msg = this._runErrorMessage(code, code);
      } else {
        this.onSaved?.();
      }
    } catch (e) {
      // The backend answers 400/409 for these codes, and callApi rejects on any
      // non-2xx status -- so the code arrives here, inside the rejection body.
      this._msg = this._runErrorMessage(apiErrorCode(e), e);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  /** End just this zone; the rest of the run carries on (stopping the last zone
   *  lets the run finish normally). */
  private async _stopZone(zoneId: string): Promise<void> {
    this._busy = true;
    this._msg = undefined;
    this.requestUpdate();
    try {
      const res = await stopZone(this.hass, this.entryId, zoneId);
      if (!res.success) {
        const code = res.error ?? "stop_failed";
        this._msg = this._runErrorMessage(code, code);
      } else {
        this.onSaved?.();
      }
    } catch (e) {
      this._msg = this._runErrorMessage(apiErrorCode(e), e);
    } finally {
      this._busy = false;
      this.requestUpdate();
    }
  }

  /**
   * Only "enabled" travels. The rest of the row may be older than what an
   * automation has written since, and sending it along would write that back.
   */
  private async _toggleZoneEnabled(z: ZoneRow, enabled: boolean): Promise<void> {
    if (this._busy) return;
    await this._saveZone("update", z.zone_id, undefined, { keepDialogs: true, fields: { enabled } });
  }

  /**
   * Open the editor on what the backend has now, not on what the list was
   * loaded with: an automation may have set a runtime in the meantime, and
   * saving the dialog would put the old one back.
   */
  private _openAdd(): void {
    this._openSection = "outputs";
    this._addDialogOpen = true;
  }

  private async _openEdit(zoneId: string): Promise<void> {
    this._msg = undefined;
    await this.onSaved?.();
    await new Promise((resolve) => setTimeout(resolve));
    const zone = this._zonesFromInstallation().find((z) => z.zone_id === zoneId);
    this._openSection = "outputs";
    if (zone) this._editDraft = this._cloneZone(zone);
  }

  private async _saveZone(
    action: "add" | "update" | "delete",
    zoneId: string | undefined,
    zone?: ZoneRow,
    opts?: { keepDialogs?: boolean; fields?: Record<string, unknown> }
  ): Promise<void> {
    this._busy = true;
    this._msg = undefined;
    this.requestUpdate();
    try {
      const body: Record<string, unknown> = { action };
      if (zoneId) body.zone_id = zoneId;
      if (opts?.fields) {
        body.zone = opts.fields;
      } else if (zone && action !== "delete") {
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
          water_meter_entity_id: zone.water_meter_entity_id.trim(),
          flow_rate_lpm: zone.flow_rate_lpm,
          countdown_entity_id: zone.countdown_entity_id.trim(),
          countdown_unit: zone.countdown_entity_id.trim() ? zone.countdown_unit : "",
          supply_entity_ids: zone.supply_entity_ids.map((id) => id.trim()).filter(Boolean),
          supply_lead_sec: zone.supply_lead_sec,
          supply_trail_sec: zone.supply_trail_sec,
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

  /** The zone editor's sections, each with the line it shows when closed. */
  private _zoneSections(z: ZoneRow): { basics: AccordionSection[]; options: AccordionSection[] } {
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
          // The section's header says the three runtimes: it follows.
          this.requestUpdate();
        }}
      ></ha-input>
    `;
    const section = (
      id: string,
      icon: string,
      labelKey: string,
      summary: Summary,
      body: () => unknown
    ): AccordionSection => ({
      id,
      icon,
      label: t(this.hass, labelKey),
      summary: summary.text,
      tone: summary.tone,
      body,
    });
    const unit = volumeUnit(this.hass);
    const water: Summary = z.water_meter_entity_id
      ? saidSummary(summaryEntityName(this.hass, z.water_meter_entity_id))
      : z.flow_rate_lpm > 0
        ? saidSummary(
            t(this.hass, "config_panel.sum_flow_rate", {
              n: formatRateNumber(litresToUnit(z.flow_rate_lpm, unit)),
              unit,
            })
          )
        : quietSummary(t(this.hass, "config_panel.sum_not_tracked"));
    const customStart = Boolean(
      z.start_service || z.duration_field || z.duration_unit || z.start_entity_id
    );
    return {
      basics: [
        section(
          "outputs",
          "mdi:valve",
          "config_panel.zones_outputs_title",
          entitiesSummary(
            this.hass,
            z.switch_entity_ids,
            missingSummary(this.hass, "config_panel.sum_no_output")
          ),
          () => html`
        <div class="field-row">
          <div class="entity-picker-rows">
            ${z.switch_entity_ids.map(
              (eid, i) => html`
                <div class="entity-picker-row">
                  ${renderNativeEntityField(
                    this.hass,
                    this.outputEntityDomains ?? defaultDomains,
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
        ${renderInlineHelp(
              this.hass,
              "config_panel.zones_outputs_help_summary",
              ["config_panel.zones_outputs_desc"],
              "mdi:information-outline"
            )}
          `
        ),
        section(
          "runtime",
          "mdi:timer-outline",
          "config_panel.acc_runtime",
          saidSummary(
            `${z.duration_eco_min} / ${z.duration_normal_min} / ${z.duration_extra_min} ${t(
              this.hass,
              "config_panel.zones_min_suffix"
            )}`
          ),
          () => html`
        <div class="duration-row">
          ${modeInput("duration_eco_min", "config_panel.zones_duration_eco")}
          ${modeInput("duration_normal_min", "config_panel.zones_duration_normal")}
          ${modeInput("duration_extra_min", "config_panel.zones_duration_extra")}
        </div>
        ${renderInlineHelp(
              this.hass,
              "config_panel.zones_runtime_help_summary",
              ["config_panel.zones_runtime_desc"],
              "mdi:information-outline"
            )}
          `
        ),
      ],
      options: [
        section(
          "behavior",
          "mdi:call-split",
          "config_panel.zones_behavior_title",
          z.exclusive
            ? saidSummary(t(this.hass, "config_panel.sum_exclusive"))
            : quietSummary(t(this.hass, "config_panel.sum_parallel")),
          () => html`
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
            ${renderInlineHelp(
              this.hass,
              "config_panel.zones_behavior_help_summary",
              ["config_panel.zones_behavior_desc"],
              "mdi:information-outline"
            )}
          `
        ),
        section(
          "water",
          "mdi:water-outline",
          "config_panel.zones_water_title",
          water,
          () => html`
        <div class="field-row">
          ${renderNativeEntityField(
            this.hass,
            ["sensor"],
            t(this.hass, "config_panel.zones_water_meter_label"),
            z.water_meter_entity_id,
            (v) => {
              z.water_meter_entity_id = v;
              this.requestUpdate();
            },
            { placeholderKey: "config_panel.water_meter_placeholder" }
          )}
        </div>
        <div class="field-row">
          <ha-input
            type="number"
            .label=${t(this.hass, "config_panel.zones_flow_rate_label", { unit: volumeUnit(this.hass) })}
            .value=${z.flow_rate_lpm > 0 ? formatRateNumber(litresToUnit(z.flow_rate_lpm, volumeUnit(this.hass))) : ""}
            min="0"
            max="1000"
            step="0.1"
            @input=${(e: Event) => {
              const raw = parseFloat((e.target as HTMLInputElement).value);
              z.flow_rate_lpm = Number.isFinite(raw) && raw > 0 ? unitToLitres(raw, volumeUnit(this.hass)) : 0;
            }}
          ></ha-input>
        </div>
        ${renderInlineHelp(
          this.hass,
          "config_panel.zones_water_help_summary",
          [
            "config_panel.zones_water_desc",
            "config_panel.zones_water_meter_hint",
            "config_panel.zones_flow_rate_hint",
          ],
          "mdi:water-outline"
        )}
          `
        ),
        section(
          "supply",
          "mdi:pipe-valve",
          "config_panel.acc_supply",
          entitiesSummary(this.hass, z.supply_entity_ids, noneSummary(this.hass)),
          () => this._renderSupplyFields(z)
        ),
        section(
          "start",
          "mdi:tune",
          "config_panel.acc_start_service",
          customStart
            ? saidSummary(z.start_service || t(this.hass, "config_panel.zones_start_preset_custom"))
            : quietSummary(t(this.hass, "config_panel.sum_start_default")),
          () => html`
          <div class="field-row">
            <label class="stacked-field-label" for="si-preset-${z.zone_id || "new"}">
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
            ${keyed(
              this._presetForZone(z),
              html`<ha-input
                .label=${t(this.hass, "config_panel.zones_start_service")}
                .value=${z.start_service}
                @input=${(e: Event) => {
                  z.start_service = (e.target as HTMLInputElement).value;
                  this.requestUpdate();
                }}
              ></ha-input>`
            )}
          </div>
          <div class="duration-row">
            ${keyed(
              this._presetForZone(z),
              html`<ha-input
                .label=${t(this.hass, "config_panel.zones_duration_field")}
                .value=${z.duration_field}
                @input=${(e: Event) => {
                  z.duration_field = (e.target as HTMLInputElement).value;
                  this.requestUpdate();
                }}
              ></ha-input>`
            )}
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
              startTargetDomains,
              t(this.hass, "config_panel.zones_start_target_entity"),
              z.start_entity_id,
              (v) => {
                z.start_entity_id = v;
                this.requestUpdate();
              },
              { allowCustom: true }
            )}
          </div>
          ${renderInlineHelp(
              this.hass,
              "config_panel.zones_start_help_summary",
              ["config_panel.zones_advanced_desc", "config_panel.zones_advanced_target_desc"],
              "mdi:information-outline"
            )}
          `
        ),
        section(
          "countdown",
          "mdi:timer-lock-outline",
          "config_panel.acc_countdown",
          entitiesSummary(this.hass, [z.countdown_entity_id], noneSummary(this.hass)),
          () => html`
          <div class="field-row">
            ${renderNativeEntityField(
              this.hass,
              countdownDomains,
              t(this.hass, "config_panel.zones_countdown_entity"),
              z.countdown_entity_id,
              (v) => {
                z.countdown_entity_id = v;
                this.requestUpdate();
              }
            )}
          </div>
          <div class="field-row">
            <select
              class="field-select"
              .value=${z.countdown_unit || ""}
              ?disabled=${!z.countdown_entity_id}
              @change=${(e: Event) => {
                z.countdown_unit = (e.target as HTMLSelectElement).value;
                this.requestUpdate();
              }}
            >
              <option value="">${t(this.hass, "config_panel.zones_countdown_unit_auto")}</option>
              <option value="minutes">${t(this.hass, "config_panel.zones_duration_unit_minutes")}</option>
              <option value="seconds">${t(this.hass, "config_panel.zones_duration_unit_seconds")}</option>
            </select>
          </div>
          ${renderInlineHelp(
              this.hass,
              "config_panel.zones_countdown_help_summary",
              ["config_panel.zones_countdown_desc"],
              "mdi:information-outline"
            )}
          `
        ),
      ],
    };
  }

  private _renderZoneFields(z: ZoneRow): TemplateResult {
    const sections = this._zoneSections(z);
    const toggle = (id: string | null): void => {
      this._openSection = id;
    };
    return html`
      <div class="acc-lead">
        <ha-input
          .label=${t(this.hass, "config_panel.zones_field_zone_name")}
          .value=${z.name}
          @input=${(e: Event) => {
            z.name = (e.target as HTMLInputElement).value;
            this.requestUpdate();
          }}
        ></ha-input>
        <ha-switch
          aria-label=${t(this.hass, "config_panel.zones_enabled")}
          title=${t(this.hass, "config_panel.zones_enabled")}
          .disabled=${this._busy}
          .checked=${z.enabled}
          @change=${(e: Event) => {
            z.enabled = Boolean((e.target as HTMLInputElement & { checked: boolean }).checked);
            this.requestUpdate();
          }}
        ></ha-switch>
      </div>
      ${renderAccordion(sections.basics, this._openSection, toggle)}
      ${renderAccordionGroup(t(this.hass, "config_panel.acc_more_options"))}
      ${renderAccordion(sections.options, this._openSection, toggle)}
    `;
  }

  /** Seconds, 0..3600; an empty field is "nothing entered". */
  private _secondsFrom(e: Event): number | null {
    const raw = (e.target as HTMLInputElement).value.trim();
    const n = Math.round(Number(raw));
    return raw === "" || !Number.isFinite(n) ? null : Math.max(0, Math.min(3600, n));
  }

  private _renderSupplyFields(z: ZoneRow): TemplateResult {
    const installationDelay = Number(this.installation?.pre_start_delay_sec ?? 10);
    return html`
        <div class="field-row">
          <div class="entity-picker-rows">
            ${z.supply_entity_ids.map(
              (eid, i) => html`
                <div class="entity-picker-row">
                  ${renderNativeEntityField(
                    this.hass,
                    this.outputEntityDomains ?? defaultDomains,
                    t(this.hass, "config_panel.zones_supply_output_n", { n: i + 1 }),
                    eid,
                    (v) => {
                      const next = [...z.supply_entity_ids];
                      next[i] = v;
                      z.supply_entity_ids = next;
                      this.requestUpdate();
                    }
                  )}
                  ${z.supply_entity_ids.length > 1
                    ? html`<button
                        type="button"
                        class="row-remove"
                        @click=${() => {
                          z.supply_entity_ids = z.supply_entity_ids.filter((_id, j) => j !== i);
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
                z.supply_entity_ids = [...z.supply_entity_ids, ""];
                this.requestUpdate();
              }}
            >
              ${t(this.hass, "config_panel.zones_supply_add")}
            </button>
          </div>
        </div>
        <div class="field-row supply-delays">
          <ha-input
            type="number"
            min="0"
            max="3600"
            .label=${t(this.hass, "config_panel.zones_supply_lead", { n: installationDelay })}
            .value=${z.supply_lead_sec === null ? "" : String(z.supply_lead_sec)}
            @input=${(e: Event) => {
              z.supply_lead_sec = this._secondsFrom(e);
              this.requestUpdate();
            }}
          ></ha-input>
          <ha-input
            type="number"
            min="0"
            max="3600"
            .label=${t(this.hass, "config_panel.zones_supply_trail")}
            .value=${String(z.supply_trail_sec)}
            @input=${(e: Event) => {
              z.supply_trail_sec = this._secondsFrom(e) ?? 0;
              this.requestUpdate();
            }}
          ></ha-input>
        </div>
        ${renderInlineHelp(
          this.hass,
          "config_panel.zones_supply_help_summary",
          ["config_panel.zones_supply_desc"],
          "mdi:information-outline"
        )}
    `;
  }

  private _renderRow(
    z: ZoneRow,
    slotsPerZone: Record<string, number>,
    zoneOrder: string[]
  ): TemplateResult {
    const outs = z.switch_entity_ids.filter(Boolean);
    const issue = this._zoneIssue(z);
    const active = this._activeZoneIds().includes(z.zone_id);
    const queued = !active && this._queuedZoneIds().includes(z.zone_id);
    const inRun = active || queued;
    const runState = this._runStateWord();
    // A manual run accepts more zones; a scheduled one answers "busy" -- grey the
    // button out instead of letting the click produce that error.
    const foreignRun = this._runBusy() && !Boolean(this._rs().manual_run);
    const runDisabled =
      this._busy ||
      !z.enabled ||
      outs.length === 0 ||
      inRun ||
      foreignRun ||
      runState === "stopping";
    const stopDisabled = this._busy || runState === "stopping";
    const stopLabel = t(this.hass, "config_panel.zones_stop_zone");
    const endsAt = active ? this._zoneEndsAt(z.zone_id) : null;
    const mode = this._mode();
    const slotN = slotsPerZone[z.zone_id] ?? 0;
    const accentClass = !z.enabled ? "inactive" : issue ? "warn" : active ? "running" : "";
    const expanded = this._expanded.has(z.zone_id);
    const firstOut = outs[0] ?? "";
    const orderIndex = zoneOrder.indexOf(z.zone_id);
    const canReorder = this._filter === "all" && zoneOrder.length > 1;
    const dragging = this._drag?.zoneId === z.zone_id;

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
    const stopBtn = html`
      <button
        type="button"
        class="iconbtn danger"
        title=${stopLabel}
        aria-label=${stopLabel}
        ?disabled=${stopDisabled}
        @click=${() => this._stopZone(z.zone_id)}
      >
        <ha-icon icon="mdi:stop"></ha-icon>
      </button>
    `;
    const primaryBtn = inRun ? stopBtn : runBtn;
    // Beside the runtimes on a wide screen; on a phone behind the chevron,
    // so a row is a name and a line, and a list of zones fits the screen.
    const details = html`
      ${this._waterPerRun(z)
        ? html`<span class="meta"
            ><ha-icon icon="mdi:water-outline"></ha-icon>${this._waterPerRun(z)}
            ${t(this.hass, "config_panel.water_per_run")}</span
          >`
        : nothing}
      ${this._waterLastRun(z)
        ? html`<span class="meta"
            ><ha-icon icon="mdi:water-check-outline"></ha-icon>${t(
              this.hass,
              "config_panel.general_water_last_run"
            )}
            ${this._waterLastRun(z)}</span
          >`
        : nothing}
      ${slotN > 0
        ? html`<span class="meta"
            ><ha-icon icon="mdi:format-list-bulleted"></ha-icon>${slotN === 1
              ? t(this.hass, "config_panel.zones_in_cycles_one")
              : t(this.hass, "config_panel.zones_in_cycles_many", { n: slotN })}</span
          >`
        : nothing}
    `;
    const editBtn = html`
      <button
        type="button"
        class="iconbtn"
        title=${t(this.hass, "config_panel.zones_edit")}
        aria-label=${t(this.hass, "config_panel.zones_edit")}
        @click=${() => this._openEdit(z.zone_id)}
      >
        <ha-icon icon="mdi:pencil"></ha-icon>
      </button>
    `;
    const dragLabel = t(this.hass, "config_panel.zones_drag_to_reorder");
    const dragHandle = canReorder
      ? html`<button
          type="button"
          class="drag-handle"
          data-zone-id=${z.zone_id}
          title=${dragLabel}
          aria-label=${dragLabel}
          @pointerdown=${(e: PointerEvent) => this._onHandlePointerDown(e, z.zone_id)}
          @pointermove=${this._onHandlePointerMove}
          @pointerup=${this._onHandlePointerUp}
          @pointercancel=${this._endDrag}
          @keydown=${(e: KeyboardEvent) => this._onHandleKeydown(e, z.zone_id)}
        >
          <ha-icon icon="mdi:drag-vertical"></ha-icon>
        </button>`
      : nothing;
    return html`
      <div
        class="compact-row ${accentClass} ${dragging ? "dragging" : this._drag ? "shifting" : ""}"
        style=${styleMap(this._dragStyle(orderIndex))}
      >
        <div class="compact-row-header">
          ${dragHandle}
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
              ${active
                ? html`<span class="badge badge-primary badge-dot"
                    >${t(this.hass, "config_panel.zones_badge_running")}${endsAt !== null
                      ? html` · ${this._fmtRemaining(endsAt)}`
                      : nothing}</span
                  >`
                : queued
                  ? html`<span class="badge">${t(this.hass, "config_panel.zones_badge_queued")}</span>`
                  : nothing}
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
              <span class="meta-extra hide-narrow">
                ${details}
                ${firstOut
                  ? html`<span class="meta ellipsis"
                      ><ha-icon icon="mdi:toggle-switch-outline"></ha-icon>${firstOut}</span
                    >`
                  : nothing}
              </span>
            </div>
          </div>
          <div class="icon-group hide-narrow" role="group">
            ${primaryBtn}${editBtn}
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
              <div class="meta-line">
                ${details}
                ${outs.map(
                  (eid) => html`<span class="meta" title=${eid}
                    ><ha-icon icon="mdi:toggle-switch-outline"></ha-icon>${summaryEntityName(
                      this.hass,
                      eid
                    )}</span
                  >`
                )}
              </div>
              <div class="drawer-actions">
                ${inRun
                  ? html`<button type="button" class="btn-outline" ?disabled=${stopDisabled} @click=${() => this._stopZone(z.zone_id)}>
                      <ha-icon icon="mdi:stop"></ha-icon>
                      ${stopLabel}
                    </button>`
                  : html`<button type="button" class="btn-outline" ?disabled=${runDisabled} @click=${() => this._runZoneNow(z.zone_id)}>
                      <ha-icon icon="mdi:play"></ha-icon>
                      ${t(this.hass, "config_panel.schedule_run_now_short")}
                    </button>`}
                <button
                  type="button"
                  class="btn-outline"
                  @click=${() => this._openEdit(z.zone_id)}
                >
                  <ha-icon icon="mdi:pencil"></ha-icon>
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
    const zoneOrder = all.map((z) => z.zone_id);
    const issuesCount = all.filter((z) => this._zoneIssue(z)).length;
    const filtered = all.filter((z) => {
      if (this._filter === "enabled") return z.enabled;
      if (this._filter === "issues") return this._zoneIssue(z);
      return true;
    });
    const slotsPerZone = slotInclusionCountPerZone(this.installation ?? {});
    const edit = this._editDraft;

    return html`
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
            <button type="button" class="btn hide-narrow" @click=${() => this._openAdd()}>
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
            <p>${t(this.hass, "config_panel.zones_reorder_hint")}</p>
          </details>

          ${all.length === 0
            ? html`<div class="empty-state">
                <ha-icon icon="mdi:vector-square"></ha-icon>
                <p>${t(this.hass, "config_panel.zones_empty")}</p>
                <button type="button" class="btn" @click=${() => this._openAdd()}>
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
              : repeat(
                  filtered,
                  (z) => z.zone_id,
                  (z) => this._renderRow(z, slotsPerZone, zoneOrder)
                )}

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
        @click=${() => this._openAdd()}
      >
        <ha-icon icon="mdi:plus"></ha-icon>
      </button>

      <ha-dialog
        .open=${this._addDialogOpen}
        header-title=${t(this.hass, "config_panel.zones_dialog_new_title")}
        @closed=${() => this._closeAddDialog()}
      >
        ${this._addDialogOpen ? this._renderZoneFields(this._new) : nothing}
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
                ? html`<details class="more-menu">
                    <summary
                      aria-label=${t(this.hass, "config_panel.general_more")}
                      title=${t(this.hass, "config_panel.general_more")}
                    >
                      <ha-icon icon="mdi:dots-vertical"></ha-icon>
                    </summary>
                    <div class="more-pop">
                      <button
                        type="button"
                        class="danger"
                        ?disabled=${this._busy}
                        @click=${() => {
                          if (edit && confirm(t(this.hass, "config_panel.zones_confirm_delete"))) {
                            void this._saveZone("delete", edit.zone_id);
                          }
                        }}
                      >
                        <ha-icon icon="mdi:trash-can-outline"></ha-icon>
                        ${t(this.hass, "config_panel.zones_delete_zone")}
                      </button>
                    </div>
                  </details>`
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
