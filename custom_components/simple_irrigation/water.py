"""Water use: read a meter, or estimate from a flow rate.

Two sources, one rule: a number is reported only when it can be backed up.
A meter entity on the line is read before and after; the difference is
what flowed, whatever the pressure did. A flow rate the user measured once
(run the zone alone, read the house meter, divide by the minutes) turns the
actual watering time into an estimate. Everything is kept in litres; the
sensors and the UI convert to the unit system the user chose.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from homeassistant.const import UnitOfVolume
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util.unit_conversion import VolumeConverter

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .models import Zone

_LOGGER = logging.getLogger(__name__)

SOURCE_MEASURED = "measured"
SOURCE_ESTIMATED = "estimated"

UNREADABLE_STATES = ("unknown", "unavailable", "")


def meter_unit_error(hass: HomeAssistant, entity_id: str) -> str | None:
    """Why ``entity_id`` cannot serve as a water meter, or None when it can.

    It has to exist and carry a volume unit the converter knows. The state
    itself may be unavailable for the moment — a meter that is offline at
    setup time is still a meter.
    """
    state = hass.states.get(entity_id)
    if state is None:
        return "unknown_entity"
    unit = str(state.attributes.get("unit_of_measurement") or "").strip()
    if unit not in VolumeConverter.VALID_UNITS:
        return "invalid_water_meter"
    return None


def meter_litres(hass: HomeAssistant, entity_id: str) -> float | None:
    """The meter's reading in litres, or None when it cannot be read right now."""
    entity_id = (entity_id or "").strip()
    if not entity_id:
        return None
    state = hass.states.get(entity_id)
    if state is None or state.state in UNREADABLE_STATES:
        return None
    try:
        value = float(state.state)
    except (TypeError, ValueError):
        return None
    unit = str(state.attributes.get("unit_of_measurement") or "").strip()
    try:
        return VolumeConverter.convert(value, unit, UnitOfVolume.LITERS)
    except (HomeAssistantError, ValueError):
        _LOGGER.warning("Water meter %s has no volume unit (%r); ignoring", entity_id, unit)
        return None


def meter_delta(start: float | None, end: float | None) -> float | None:
    """Litres between two readings; None when either is missing or the meter reset."""
    if start is None or end is None:
        return None
    delta = end - start
    return delta if delta >= 0 else None


def estimated_litres(zone: Zone, seconds: float) -> float | None:
    """Litres the zone's flow rate says it used in ``seconds``; None without a rate."""
    if zone.flow_rate_lpm <= 0:
        return None
    return zone.flow_rate_lpm * max(0.0, seconds) / 60.0


def planned_litres(zone: Zone, minutes: int) -> float | None:
    """What a planned run of ``minutes`` would use, from the flow rate only.

    A meter can tell only afterwards, so a zone with a meter and no rate
    contributes nothing to a forecast.
    """
    if zone.flow_rate_lpm <= 0 or minutes <= 0:
        return None
    return zone.flow_rate_lpm * minutes
