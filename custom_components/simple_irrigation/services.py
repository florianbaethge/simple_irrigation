"""Services for Simple Irrigation."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import config_validation as cv
from homeassistant.util import dt as dt_util

from .const import (
    ATTR_CONFIG_ENTRY_ID,
    ATTR_DURATION_MIN,
    ATTR_ENABLED,
    ATTR_MODE,
    ATTR_SLOT_ID,
    ATTR_UNTIL,
    ATTR_ZONE_ID,
    DOMAIN,
    MAX_ZONE_DURATION_MIN,
    MODES,
    SERVICE_CLEAR_PAUSE,
    SERVICE_PAUSE_UNTIL,
    SERVICE_RUN_DUE_ZONES,
    SERVICE_RUN_SCHEDULE_SLOT,
    SERVICE_RUN_ZONE,
    SERVICE_RUN_ZONE_WITH_DURATION,
    SERVICE_SET_MODE,
    SERVICE_SET_ZONE_DURATION,
    SERVICE_SET_ZONE_ENABLED,
    SERVICE_SKIP_PHASE,
    SERVICE_STOP_ALL,
    SERVICE_STOP_ZONE,
)
from .models import Installation
from .validation import not_bool


def _set_slot_zone_minutes(
    inst: Installation, slot_id: str, zone_id: str, minutes: int | None
) -> bool:
    """Fix how long a zone waters in one schedule, or let it follow the mode again.

    The members of a cycle share their fixed minutes, as they share their zones:
    any member's id sets them for all. Returns whether anything changed.
    """
    slot = next((s for s in inst.schedule_slots if s.slot_id == slot_id), None)
    if slot is None:
        msg = f"Unknown Simple Irrigation schedule slot: {slot_id}"
        raise ServiceValidationError(msg)
    members = (
        [s for s in inst.schedule_slots if s.cycle_id == slot.cycle_id]
        if slot.cycle_id
        else [slot]
    )
    if any(zone_id not in member.zone_ids_ordered for member in members):
        msg = f"Zone {zone_id} is not part of schedule slot {slot_id}"
        raise ServiceValidationError(msg)
    changed = False
    for member in members:
        if member.zone_minutes.get(zone_id) == minutes:
            continue
        if minutes is None:
            del member.zone_minutes[zone_id]
        else:
            member.zone_minutes[zone_id] = minutes
        changed = True
    return changed


def _get_domain_data(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """Resolve integration runtime data for a config entry.

    The one that is named; without a name the only one there is, else the one
    flagged as default -- the card picks the same way -- else the first loaded.
    """
    loaded: dict[str, dict[str, Any]] = hass.data.get(DOMAIN, {})
    entry_id = call.data.get(ATTR_CONFIG_ENTRY_ID)
    if entry_id:
        data = loaded.get(entry_id)
        if data is None:
            msg = f"Unknown Simple Irrigation config entry: {entry_id}"
            raise ServiceValidationError(msg)
        return data
    # hass.data[DOMAIN] also holds flags that are no installation; an entry
    # that is not loaded has nothing there at all.
    candidates = [
        loaded[entry.entry_id]
        for entry in hass.config_entries.async_entries(DOMAIN)
        if isinstance(loaded.get(entry.entry_id), dict)
    ]
    if not candidates:
        raise ServiceValidationError("No Simple Irrigation installation is loaded")
    if len(candidates) > 1:
        for data in candidates:
            coordinator = data.get("coordinator")
            if coordinator is not None and coordinator.installation.is_default is True:
                return data
    return candidates[0]


async def async_setup_services(hass: HomeAssistant) -> None:
    """Register services once."""

    async def handle_run_zone(call: ServiceCall) -> None:
        data = _get_domain_data(hass, call)
        runtime = data["runtime"]
        zid = call.data[ATTR_ZONE_ID]
        await runtime.async_run_zone(zid, duration_min=None)

    async def handle_run_zone_duration(call: ServiceCall) -> None:
        data = _get_domain_data(hass, call)
        runtime = data["runtime"]
        zid = call.data[ATTR_ZONE_ID]
        dur = int(call.data[ATTR_DURATION_MIN])
        await runtime.async_run_zone(zid, duration_min=dur)

    async def handle_run_due(call: ServiceCall) -> None:
        data = _get_domain_data(hass, call)
        runtime = data["runtime"]
        await runtime.async_run_due_now()

    async def handle_run_schedule_slot(call: ServiceCall) -> None:
        data = _get_domain_data(hass, call)
        runtime = data["runtime"]
        await runtime.async_run_schedule_slot(call.data[ATTR_SLOT_ID])

    async def handle_stop_all(call: ServiceCall) -> None:
        data = _get_domain_data(hass, call)
        runtime = data["runtime"]
        await runtime.async_stop_all()

    async def handle_stop_zone(call: ServiceCall) -> None:
        data = _get_domain_data(hass, call)
        runtime = data["runtime"]
        await runtime.async_stop_zone(call.data[ATTR_ZONE_ID])

    async def handle_skip_phase(call: ServiceCall) -> None:
        data = _get_domain_data(hass, call)
        runtime = data["runtime"]
        # Nothing to skip is not an error: an automation may fire while idle.
        await runtime.async_skip_to_next_phase()

    async def handle_set_mode(call: ServiceCall) -> None:
        data = _get_domain_data(hass, call)
        coordinator = data["coordinator"]
        mode = call.data[ATTR_MODE]
        inst: Installation = coordinator.installation
        inst.mode = mode
        await coordinator.async_update_installation(inst)

    async def handle_set_zone_enabled(call: ServiceCall) -> None:
        data = _get_domain_data(hass, call)
        coordinator = data["coordinator"]
        inst: Installation = coordinator.installation
        zid = call.data[ATTR_ZONE_ID]
        if zid not in inst.zones:
            msg = f"Unknown Simple Irrigation zone: {zid}"
            raise ServiceValidationError(msg)
        inst.zones[zid].enabled = bool(call.data[ATTR_ENABLED])
        await coordinator.async_update_installation(inst)

    async def handle_set_zone_duration(call: ServiceCall) -> None:
        data = _get_domain_data(hass, call)
        coordinator = data["coordinator"]
        inst: Installation = coordinator.installation
        zid = call.data[ATTR_ZONE_ID]
        if zid not in inst.zones:
            msg = f"Unknown Simple Irrigation zone: {zid}"
            raise ServiceValidationError(msg)
        minutes = call.data.get(ATTR_DURATION_MIN)
        if ATTR_SLOT_ID in call.data:
            changed = _set_slot_zone_minutes(inst, call.data[ATTR_SLOT_ID], zid, minutes)
        elif minutes is None:
            raise ServiceValidationError(
                "duration_min is required to set a zone's runtime for a mode"
            )
        else:
            changed = inst.zones[zid].set_duration_for_mode(call.data[ATTR_MODE], minutes)
        # Called every hour by an automation, mostly with the value it had.
        if changed:
            await coordinator.async_update_installation(inst)

    async def handle_pause_until(call: ServiceCall) -> None:
        data = _get_domain_data(hass, call)
        coordinator = data["coordinator"]
        until = call.data[ATTR_UNTIL]
        inst = coordinator.installation
        inst.pause_until = until
        await coordinator.async_update_installation(inst)
        sched = data["scheduler"]
        sched.async_reschedule()

    async def handle_clear_pause(call: ServiceCall) -> None:
        data = _get_domain_data(hass, call)
        coordinator = data["coordinator"]
        inst = coordinator.installation
        inst.pause_until = None
        await coordinator.async_update_installation(inst)
        sched = data["scheduler"]
        sched.async_reschedule()

    if hass.services.has_service(DOMAIN, SERVICE_RUN_ZONE):
        return

    hass.services.async_register(
        DOMAIN,
        SERVICE_RUN_ZONE,
        handle_run_zone,
        schema=vol.Schema(
            {
                vol.Required(ATTR_ZONE_ID): cv.string,
                vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string,
            }
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_RUN_ZONE_WITH_DURATION,
        handle_run_zone_duration,
        schema=vol.Schema(
            {
                vol.Required(ATTR_ZONE_ID): cv.string,
                vol.Required(ATTR_DURATION_MIN): vol.All(
                    not_bool, vol.Coerce(int), vol.Range(min=1)
                ),
                vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string,
            }
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_RUN_DUE_ZONES,
        handle_run_due,
        schema=vol.Schema({vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string}),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_RUN_SCHEDULE_SLOT,
        handle_run_schedule_slot,
        schema=vol.Schema(
            {
                vol.Required(ATTR_SLOT_ID): cv.string,
                vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string,
            }
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_STOP_ALL,
        handle_stop_all,
        schema=vol.Schema({vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string}),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_STOP_ZONE,
        handle_stop_zone,
        schema=vol.Schema(
            {
                vol.Required(ATTR_ZONE_ID): cv.string,
                vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string,
            }
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_SKIP_PHASE,
        handle_skip_phase,
        schema=vol.Schema({vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string}),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_MODE,
        handle_set_mode,
        schema=vol.Schema(
            {
                vol.Required(ATTR_MODE): vol.In(MODES),
                vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string,
            }
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_ZONE_ENABLED,
        handle_set_zone_enabled,
        schema=vol.Schema(
            {
                vol.Required(ATTR_ZONE_ID): cv.string,
                vol.Required(ATTR_ENABLED): cv.boolean,
                vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string,
            }
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_ZONE_DURATION,
        handle_set_zone_duration,
        schema=vol.All(
            {
                vol.Required(ATTR_ZONE_ID): cv.string,
                vol.Optional(ATTR_DURATION_MIN): vol.All(
                    not_bool, vol.Coerce(int), vol.Range(min=0, max=MAX_ZONE_DURATION_MIN)
                ),
                # Where the minutes go: into the zone's runtime for one mode, or
                # into one schedule as that zone's fixed minutes. Not both.
                vol.Exclusive(ATTR_MODE, "target"): vol.In(MODES),
                vol.Exclusive(ATTR_SLOT_ID, "target"): cv.string,
                vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string,
            },
            cv.has_at_least_one_key(ATTR_MODE, ATTR_SLOT_ID),
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_PAUSE_UNTIL,
        handle_pause_until,
        schema=vol.Schema(
            {
                vol.Required(ATTR_UNTIL): cv.datetime,
                vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string,
            }
        ),
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_CLEAR_PAUSE,
        handle_clear_pause,
        schema=vol.Schema({vol.Optional(ATTR_CONFIG_ENTRY_ID): cv.string}),
    )
