import type { HassEntities } from "home-assistant-js-websocket";

import type { ActionConfig } from "./actions";

/** Minimal hass shape used by the card and its editor. */
export interface HomeAssistant {
  states: HassEntities;
  language?: string;
  locale?: {
    language: string;
    time_format?: string;
    date_format?: string;
    time_zone?: string;
    number_format?: string;
    first_weekday?: string;
  };
  themes?: { darkMode?: boolean };
  user?: { is_admin?: boolean };
  config?: { unit_system?: { volume?: string } };
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: Record<string, unknown>
  ): Promise<unknown>;
  connection: {
    subscribeMessage<Result>(
      callback: (result: Result) => void,
      message: Record<string, unknown>
    ): Promise<() => Promise<void>>;
  };
}

// ---- Snapshot payload (mirrors card_api.py `_snapshot`) ----

export type RunState =
  | "idle"
  | "preparing"
  | "running"
  | "stopping"
  | "paused"
  | "error";

export type Mode = "eco" | "normal" | "extra";

export interface ZoneIssue {
  reason: "missing" | "unavailable" | "no_output";
  entity_id: string;
}

export interface ZoneRow {
  zone_id: string;
  name: string;
  enabled: boolean;
  active: boolean;
  queued: boolean;
  duration_min: number;
  ends_at: string | null;
  next_run: string | null;
  last_run: string | null;
  issue: ZoneIssue | null;
  /** Litres per minute the zone was given; 0 when it estimates nothing. */
  flow_lpm: number;
  has_meter: boolean;
  last_run_l: number | null;
  water_source: "measured" | "estimated" | null;
  entity_id: string;
}

export interface Cadence {
  kind: string;
  n: number | null;
  weekdays: number[];
  week_parity: string;
  times_per_day: number;
}

export interface SlotRow {
  slot_id: string;
  name: string;
  enabled: boolean;
  time_local: string;
  weekdays: number[];
  week_parity: string;
  zone_ids: string[];
  zone_names: string[];
  duration_min: number;
  /** Cycle & Soak passes; 1 for a plain run. */
  repetitions: number;
  /** Forecast in litres from flow rates; null when no zone has one. */
  water_l: number | null;
  cadence: Cadence;
  has_conditions: boolean;
  /** Only present on `next_runs` entries. */
  fire_at?: string;
  skipped_by_pause?: boolean;
}

export interface WeekRun {
  slot_id: string;
  name: string;
  start_min: number;
  duration_min: number;
  parity_only: boolean;
  paused: boolean;
}

export interface WeekDay {
  date: string;
  weekday: number;
  today: boolean;
  runs: WeekRun[];
  total_min: number;
  paused: boolean;
}

export interface Week {
  days: WeekDay[];
  total_runs: number;
  total_min: number;
}

export interface Snapshot {
  entry_id: string;
  name: string;
  enabled: boolean;
  state: RunState;
  mode: Mode;
  modes: Mode[];
  paused_until: string | null;
  manual_run: boolean;
  last_error: string | null;
  active_script: string | null;
  active_script_started_at: string | null;
  active_script_timeout_sec: number | null;
  current_slot_id: string | null;
  current_slot_name: string;
  phase_index: number | null;
  phase_total: number | null;
  run_started_at: string | null;
  run_ends_at: string | null;
  /** End of the Cycle & Soak rest the run is in; null while a zone waters. */
  soak_until: string | null;
  /** Water, always in litres; the card converts to the unit system. */
  tracks_water: boolean;
  run_water_l: number | null;
  run_water_source: "measured" | "estimated" | null;
  last_run_water_l: number | null;
  last_run_water_source: "measured" | "estimated" | null;
  max_parallel_zones: number;
  zones: ZoneRow[];
  slots: SlotRow[];
  next_runs: SlotRow[];
  week: Week;
  issue_count: number;
  has_conditions: boolean;
  entity_id: string;
}

export interface EntryRow {
  entry_id: string;
  name: string;
  is_default: boolean;
}

// ---- Card configuration ----

export type CardView = "status" | "zones" | "schedule" | "week" | "run";
export type ManualStart = "off" | "zones" | "slot" | "both";
export type CardAction =
  | "run_next"
  | "stop"
  | "skip_today"
  | "pause_48h"
  | "pause_until";

export const CARD_VIEWS: CardView[] = [
  "status",
  "zones",
  "schedule",
  "week",
  "run",
];
export const CARD_ACTIONS: CardAction[] = [
  "run_next",
  "stop",
  "skip_today",
  "pause_48h",
  "pause_until",
];

export interface SimpleIrrigationCardConfig {
  type: string;
  entry_id?: string;
  view?: CardView;
  compact?: boolean;
  show_mode?: boolean;
  manual_start?: ManualStart;
  manual_duration?: boolean;
  actions?: CardAction[];
  next_runs?: number;
  /** "all" | "active" | an explicit list of zone ids. */
  zones?: "all" | "active" | string[];
  /** Header and compact row. */
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  /** Zone rows, in the zones view and its compact variant. */
  zone_tap_action?: ActionConfig;
  zone_hold_action?: ActionConfig;
  /** Schedule rows and the week timetable. */
  run_tap_action?: ActionConfig;
  run_hold_action?: ActionConfig;
}

/** Config keys the editor and the card treat as one tap/hold pair. */
export const ACTION_KEYS = {
  card: { tap: "tap_action", hold: "hold_action" },
  zone: { tap: "zone_tap_action", hold: "zone_hold_action" },
  run: { tap: "run_tap_action", hold: "run_hold_action" },
} as const;

export const DEFAULT_CONFIG: Required<
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
> = {
  view: "status",
  compact: false,
  show_mode: true,
  manual_start: "off",
  manual_duration: false,
  actions: ["run_next", "skip_today", "pause_48h"],
  next_runs: 4,
  zones: "all",
  // Tap opens what the row stands for, holding opens the panel page it lives
  // on. `panel` without a page follows the row: a run opens its own slot.
  tap_action: { action: "more-info" },
  hold_action: { action: "panel" },
  zone_tap_action: { action: "more-info" },
  zone_hold_action: { action: "panel" },
  run_tap_action: { action: "panel" },
  run_hold_action: { action: "none" },
};

export interface BadgeConfig {
  type: string;
  entry_id?: string;
  /** Which facts to show; each renders as its own pill. */
  badges?: BadgeKind[];
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

export type BadgeKind = "state" | "next" | "mode" | "pause" | "issues";

export const BADGE_KINDS: BadgeKind[] = [
  "state",
  "next",
  "mode",
  "pause",
  "issues",
];
