"""Hardware countdown: arm a valve's own timer as a safety net.

Simple Irrigation closes every output itself. Some valves (Tuya and Sonoff
water timers, for one) carry a countdown of their own that shuts the valve
when it runs out, whether Home Assistant is still there or not. A zone may
name that ``number`` entity; it is set to the pass duration right before the
outputs open and cleared again once they are closed. If Home Assistant, the
network or the integration dies mid-run, the valve still closes on time.

The countdown is a backstop, never the primary stop: a failure to set it is
logged and the run goes ahead.
"""

from __future__ import annotations

import logging
import math
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .models import Zone

_LOGGER = logging.getLogger(__name__)

COUNTDOWN_DOMAINS = frozenset({"number", "input_number"})

_MINUTE_UNITS = frozenset({"min", "minutes", "minute", "m"})
_SECOND_UNITS = frozenset({"s", "sec", "secs", "second", "seconds"})


def unit_from_entity(hass: HomeAssistant, entity_id: str) -> str | None:
    """``minutes`` or ``seconds`` from the entity's own unit, None when unclear."""
    state = hass.states.get(entity_id)
    if state is None:
        return None
    unit = str(state.attributes.get("unit_of_measurement") or "").strip().lower()
    if unit in _MINUTE_UNITS:
        return "minutes"
    if unit in _SECOND_UNITS:
        return "seconds"
    return None


def countdown_unit(hass: HomeAssistant, zone: Zone) -> str | None:
    """The unit the countdown expects: the zone's explicit choice, else the entity's."""
    explicit = zone.countdown_unit.strip()
    if explicit:
        return explicit
    return unit_from_entity(hass, zone.countdown_entity_id)


def _bound(hass: HomeAssistant, entity_id: str, attr: str) -> float | None:
    state = hass.states.get(entity_id)
    if state is None:
        return None
    try:
        return float(state.attributes[attr])
    except (KeyError, TypeError, ValueError):
        return None


def countdown_value(hass: HomeAssistant, zone: Zone, duration_min: int) -> float | None:
    """What to write so the timer covers the pass, or None when it cannot be known.

    Rounded up to the entity's unit so the hardware never cuts a pass short,
    then clamped to the entity's own range: a timer that tops out at a day
    covers a three-hour pass with its maximum, not with a rejected call.
    """
    unit = countdown_unit(hass, zone)
    if unit == "minutes":
        value = float(duration_min)
    elif unit == "seconds":
        value = float(duration_min * 60)
    else:
        return None
    value = math.ceil(value)
    top = _bound(hass, zone.countdown_entity_id, "max")
    if top is not None and value > top:
        _LOGGER.warning(
            "Zone %s: countdown %s tops out at %s %s, pass needs %s; the timer "
            "will not cover the whole pass",
            zone.zone_id,
            zone.countdown_entity_id,
            top,
            unit,
            value,
        )
        value = top
    floor = _bound(hass, zone.countdown_entity_id, "min")
    if floor is not None and value < floor:
        value = floor
    return value


def clear_value(hass: HomeAssistant, entity_id: str) -> float | None:
    """The value that disarms the timer, or None when the entity cannot go to zero."""
    floor = _bound(hass, entity_id, "min")
    if floor is not None and floor > 0:
        return None
    return 0.0


async def async_set_countdown(hass: HomeAssistant, entity_id: str, value: float) -> None:
    """Write ``value`` to the countdown entity. Raises on a rejected call."""
    domain = entity_id.split(".", 1)[0]
    await hass.services.async_call(
        domain,
        "set_value",
        {"entity_id": entity_id, "value": value},
        blocking=True,
    )
