import type { HassConfig, HassEntities } from "home-assistant-js-websocket";

/** Minimal hass shape for the custom panel. */
export interface HomeAssistant {
  auth?: { data?: { user?: { is_admin?: boolean } } };
  states: HassEntities;
  config?: HassConfig;
  /** User profile (Language & region): time/date format, time zone display preference. */
  locale?: {
    language: string;
    time_format: string;
    date_format: string;
    time_zone?: string;
    number_format?: string;
    first_weekday?: string;
  };
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  callApi<T>(method: string, path: string, parameters?: Record<string, unknown>): Promise<T>;
  callService?(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>
  ): Promise<unknown>;
  /** Integration and UI strings (`component.simple_irrigation.*`). */
  localize?: (
    key: string,
    values?: Record<string, string | number | null | undefined>
  ) => string;
  /** Fetch backend translation category for an integration (required for custom panel strings). */
  loadBackendTranslation?(
    category: string,
    integration?: string | string[],
    configFlow?: boolean
  ): Promise<(key: string) => string>;
  connection?: {
    subscribeEvents<EventType>(
      callback: (ev: EventType) => void,
      eventType?: string
    ): Promise<() => Promise<void>>;
  };
  language?: string;
}

export interface ScheduleNextSlot {
  slot_id: string;
  weekday: number;
  time_local: string;
  zone_names: string[];
  /** Optional user-defined label for this slot. */
  name?: string;
}

export interface ScheduleNext {
  fire_at: string | null;
  slots: ScheduleNextSlot[];
}

export interface PanelStateResult {
  installation: Record<string, unknown>;
  run_state: Record<string, unknown>;
  phase_hints: Record<string, string[][]>;
  schedule_next?: ScheduleNext;
  output_entity_domains: string[];
  /** binary_sensor entity_ids for live panel refresh */
  panel_entity_ids?: { running?: string | null; error?: string | null };
}
