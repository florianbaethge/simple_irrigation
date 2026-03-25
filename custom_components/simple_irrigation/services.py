"""Services for Simple Irrigation."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.util import dt as dt_util

from .const import (
    ATTR_CONFIG_ENTRY_ID,
    ATTR_DURATION_MIN,
    ATTR_MODE,
    ATTR_UNTIL,
    ATTR_ZONE_ID,
    DOMAIN,
    MODES,
    SERVICE_CLEAR_PAUSE,
    SERVICE_PAUSE_UNTIL,
    SERVICE_RUN_DUE_ZONES,
    SERVICE_RUN_ZONE,
    SERVICE_RUN_ZONE_WITH_DURATION,
    SERVICE_SET_MODE,
    SERVICE_STOP_ALL,
)
from .models import Installation

_LOGGER = logging.getLogger(__name__)


def _get_domain_data(hass: HomeAssistant, call: ServiceCall) -> dict[str, Any]:
    """Resolve integration runtime data for a config entry (explicit or first loaded)."""
    entry_id = call.data.get(ATTR_CONFIG_ENTRY_ID)
    if entry_id:
        data = hass.data.get(DOMAIN, {}).get(entry_id)
        if data is None:
            msg = f"Unknown Simple Irrigation config entry: {entry_id}"
            raise HomeAssistantError(msg)
        return data
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        raise HomeAssistantError("No Simple Irrigation config entry")
    first_id = entries[0].entry_id
    return hass.data[DOMAIN][first_id]


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

    async def handle_stop_all(call: ServiceCall) -> None:
        data = _get_domain_data(hass, call)
        runtime = data["runtime"]
        await runtime.async_stop_all()

    async def handle_set_mode(call: ServiceCall) -> None:
        data = _get_domain_data(hass, call)
        coordinator = data["coordinator"]
        mode = call.data[ATTR_MODE]
        inst: Installation = coordinator.installation
        inst.mode = mode
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
                vol.Required(ATTR_DURATION_MIN): vol.All(vol.Coerce(int), vol.Range(min=1)),
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
        SERVICE_STOP_ALL,
        handle_stop_all,
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
