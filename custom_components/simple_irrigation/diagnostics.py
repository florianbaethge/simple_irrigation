"""Diagnostics for Simple Irrigation."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .grouping import compute_phases


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: ConfigEntry
) -> dict[str, Any]:
    """Return diagnostics for a config entry."""
    data = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if not data:
        return {"error": "No runtime data"}

    coordinator = data["coordinator"]
    inst = coordinator.installation
    rs = coordinator.run_state

    slots_diag = []
    for slot in inst.schedule_slots:
        phases = compute_phases(
            slot.zone_ids_ordered,
            inst.zones,
            inst.max_parallel_zones,
            skip_disabled=True,
        )
        slots_diag.append(
            {
                "slot_id": slot.slot_id,
                "name": slot.name,
                "weekdays": list(slot.weekdays),
                "time_local": slot.time_local,
                "week_parity": slot.week_parity,
                "enabled": slot.enabled,
                "zone_ids_ordered": list(slot.zone_ids_ordered),
                "override_pre_start_script": slot.override_pre_start_script,
                "pre_start_script": slot.pre_start_script,
                "pre_start_script_timeout_sec": slot.pre_start_script_timeout_sec,
                "override_post_run_script": slot.override_post_run_script,
                "post_run_script": slot.post_run_script,
                "post_run_script_timeout_sec": slot.post_run_script_timeout_sec,
                "cycle_id": slot.cycle_id,
                "cycle_kind": slot.cycle_kind,
                "cycle_meta": slot.cycle_meta,
                "computed_phases": phases,
            }
        )

    return {
        "installation": {
            "name": inst.name,
            "mode": inst.mode,
            "max_parallel_zones": inst.max_parallel_zones,
            "pause_until": inst.pause_until.isoformat() if inst.pause_until else None,
            "pre_start_switches": inst.pre_start_switches,
            "pre_start_delay_sec": inst.pre_start_delay_sec,
            "pre_start_script": inst.pre_start_script,
            "pre_start_script_timeout_sec": inst.pre_start_script_timeout_sec,
            "post_run_script": inst.post_run_script,
            "post_run_script_timeout_sec": inst.post_run_script_timeout_sec,
        },
        "zones": {zid: z.to_dict() for zid, z in inst.zones.items()},
        "schedule_slots": slots_diag,
        "run_state": rs.to_dict(),
    }
