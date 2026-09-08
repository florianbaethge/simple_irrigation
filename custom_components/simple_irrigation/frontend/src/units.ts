/**
 * Volume in the user's unit system. The backend keeps litres; here they turn
 * into litres or gallons depending on what Home Assistant is set to, so a US
 * garden reads gallons everywhere without a setting of its own.
 */

const LITRES_PER_GALLON = 3.785411784;

export type VolumeUnit = "L" | "gal";

/** "L" or "gal", from the HA unit system; litres when unknown. */
export function volumeUnit(hass: { config?: { unit_system?: { volume?: string } } } | undefined): VolumeUnit {
  return hass?.config?.unit_system?.volume === "gal" ? "gal" : "L";
}

export function litresToUnit(litres: number, unit: VolumeUnit): number {
  return unit === "gal" ? litres / LITRES_PER_GALLON : litres;
}

export function unitToLitres(value: number, unit: VolumeUnit): number {
  return unit === "gal" ? value * LITRES_PER_GALLON : value;
}

/** A volume rounded for display: whole units above 10, one decimal below. */
export function formatVolumeNumber(value: number): string {
  const v = Math.max(0, value);
  return v >= 10 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toString();
}

/** A rate for the flow-rate field, in the display unit per minute, 2 decimals. */
export function formatRateNumber(value: number): string {
  return (Math.round(Math.max(0, value) * 100) / 100).toString();
}
