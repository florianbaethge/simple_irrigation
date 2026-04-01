import type { HomeAssistant, PanelStateResult } from "../types";

export const fetchPanelState = (
  hass: HomeAssistant,
  entryId: string
): Promise<PanelStateResult> =>
  hass.callWS({
    type: "simple_irrigation/panel/state",
    entry_id: entryId,
  });

export const saveGlobal = (
  hass: HomeAssistant,
  entryId: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> =>
  hass.callApi("POST", "simple_irrigation/panel/global", { entry_id: entryId, ...body });

export const saveZone = (
  hass: HomeAssistant,
  entryId: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; error?: string; zone_id?: string }> =>
  hass.callApi("POST", "simple_irrigation/panel/zone", { entry_id: entryId, ...body });

export const saveSlot = (
  hass: HomeAssistant,
  entryId: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; error?: string; slot_id?: string }> =>
  hass.callApi("POST", "simple_irrigation/panel/slot", { entry_id: entryId, ...body });

export const runSlotNow = (
  hass: HomeAssistant,
  entryId: string,
  slotId: string
): Promise<{ success: boolean; error?: string }> =>
  hass.callApi("POST", "simple_irrigation/panel/run_slot", {
    entry_id: entryId,
    slot_id: slotId,
  });

export const runZoneNow = (
  hass: HomeAssistant,
  entryId: string,
  zoneId: string
): Promise<{ success: boolean; error?: string }> =>
  hass.callApi("POST", "simple_irrigation/panel/run_zone", {
    entry_id: entryId,
    zone_id: zoneId,
  });

export const skipIrrigationToday = (
  hass: HomeAssistant,
  entryId: string
): Promise<{ success: boolean; error?: string; pause_until?: string }> =>
  hass.callApi("POST", "simple_irrigation/panel/skip_today", { entry_id: entryId });

export const panelControl = (
  hass: HomeAssistant,
  entryId: string,
  action: "stop" | "skip_phase" | "clear_error"
): Promise<{ success: boolean; error?: string }> =>
  hass.callApi("POST", "simple_irrigation/panel/control", {
    entry_id: entryId,
    action,
  });

export interface ConfigEntryRow {
  entry_id: string;
  title: string;
  domain: string;
  /** Set when the integration is disabled in HA (Settings → Devices). */
  disabled_by?: string | null;
}

export const listSimpleIrrigationEntries = (
  hass: HomeAssistant
): Promise<ConfigEntryRow[]> =>
  hass.callWS({
    type: "config_entries/get",
    domain: "simple_irrigation",
  });
