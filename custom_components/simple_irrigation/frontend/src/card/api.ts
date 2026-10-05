import type { EntryRow, HomeAssistant, Mode, Snapshot } from "./types";

const D = "simple_irrigation";

function withEntry(
  msg: Record<string, unknown>,
  entryId?: string
): Record<string, unknown> {
  return entryId ? { ...msg, entry_id: entryId } : msg;
}

export const listEntries = (hass: HomeAssistant): Promise<EntryRow[]> =>
  hass.callWS({ type: `${D}/card/entries` });

export const subscribeSnapshot = (
  hass: HomeAssistant,
  callback: (snapshot: Snapshot) => void,
  entryId?: string
): Promise<() => Promise<void>> =>
  hass.connection.subscribeMessage(
    callback,
    withEntry({ type: `${D}/card/subscribe` }, entryId)
  );

const action = (
  hass: HomeAssistant,
  entryId: string | undefined,
  payload: Record<string, unknown>
): Promise<unknown> =>
  hass.callWS(withEntry({ type: `${D}/card/action`, ...payload }, entryId));

export const runNext = (hass: HomeAssistant, entryId?: string) =>
  action(hass, entryId, { action: "run_next" });

export const runSlot = (
  hass: HomeAssistant,
  slotId: string,
  applyConditions: boolean,
  entryId?: string
) =>
  action(hass, entryId, {
    action: "run_slot",
    slot_id: slotId,
    apply_conditions: applyConditions,
  });

export const runZones = (
  hass: HomeAssistant,
  zoneIds: string[],
  durationMin: number | undefined,
  entryId?: string
) =>
  action(hass, entryId, {
    action: "run_zones",
    zone_ids: zoneIds,
    ...(durationMin ? { duration_min: durationMin } : {}),
  });

export const stopAll = (hass: HomeAssistant, entryId?: string) =>
  action(hass, entryId, { action: "stop" });

/** End the running phase (or the rest the run is in) and go on to the next. */
export const skipPhase = (hass: HomeAssistant, entryId?: string) =>
  action(hass, entryId, { action: "skip_phase" });

export const skipToday = (hass: HomeAssistant, entryId?: string) =>
  action(hass, entryId, { action: "skip_today" });

export const pauseHours = (hass: HomeAssistant, hours: number, entryId?: string) =>
  action(hass, entryId, { action: "pause", hours });

export const pauseUntil = (hass: HomeAssistant, until: string, entryId?: string) =>
  action(hass, entryId, { action: "pause", until });

export const clearPause = (hass: HomeAssistant, entryId?: string) =>
  action(hass, entryId, { action: "clear_pause" });

export const clearError = (hass: HomeAssistant, entryId?: string) =>
  action(hass, entryId, { action: "clear_error" });

export const setMode = (hass: HomeAssistant, mode: Mode, entryId?: string) =>
  action(hass, entryId, { action: "set_mode", mode });
