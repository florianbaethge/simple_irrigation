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
        # Everything the slot is set to -- conditions, season, fixed minutes,
        # Cycle & Soak: whatever explains why it did or did not run.
        slots_diag.append({**slot.to_dict(), "computed_phases": phases})

    installation = inst.to_dict()
    zones = installation.pop("zones")
    installation.pop("schedule_slots")
    return {
        "installation": installation,
        "zones": zones,
        "schedule_slots": slots_diag,
        "run_state": rs.to_dict(),
    }
