"""Simple Irrigation integration."""

from __future__ import annotations

import logging
import uuid
from typing import TYPE_CHECKING

from .const import (
    DOMAIN,
    MODE_NORMAL,
    PANEL_API_REGISTERED_KEY,
    PANEL_REGISTERED_KEY,
    PRE_START_DELAY_SEC,
)

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.typing import ConfigType

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up integration (YAML not used)."""
    from .services import async_setup_services

    hass.data.setdefault(DOMAIN, {})
    await async_setup_services(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Simple Irrigation from a config entry."""
    from homeassistant.const import Platform

    from .coordinator import SimpleIrrigationCoordinator
    from .models import Installation
    from .runtime import IrrigationRuntime
    from .scheduler import IrrigationScheduler
    from .store import SimpleIrrigationStore

    PLATFORMS: list[Platform] = [
        Platform.SELECT,
        Platform.SENSOR,
        Platform.BINARY_SENSOR,
        Platform.BUTTON,
    ]

    store = SimpleIrrigationStore(hass, entry.entry_id)

    inst_id = entry.data.get("installation_id") or str(uuid.uuid4())
    initial = Installation(
        installation_id=inst_id,
        name=entry.data.get("name", "Simple Irrigation"),
        pre_start_switches=list(entry.data.get("pre_start_switches", [])),
        pre_start_delay_sec=PRE_START_DELAY_SEC,
        mode=entry.data.get("default_mode", MODE_NORMAL),
        max_parallel_zones=int(entry.data.get("max_parallel_zones", 2)),
    )

    await store.async_load(initial=initial)

    coordinator = SimpleIrrigationCoordinator(hass, entry, store)
    runtime = IrrigationRuntime(hass, coordinator)
    scheduler = IrrigationScheduler(hass, coordinator, runtime)

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {
        "coordinator": coordinator,
        "runtime": runtime,
        "scheduler": scheduler,
    }

    await runtime.async_setup()
    await scheduler.async_setup()

    await coordinator.async_config_entry_first_refresh()

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    entry.async_on_unload(entry.add_update_listener(_async_update_listener))

    if not hass.data.get(PANEL_API_REGISTERED_KEY):
        from .panel_api import async_register_panel_api

        await async_register_panel_api(hass)

    if not hass.data.get(PANEL_REGISTERED_KEY):
        from .panel import async_register_panel

        await async_register_panel(hass)
        hass.data[PANEL_REGISTERED_KEY] = True

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload config entry."""
    from homeassistant.const import Platform

    from .runtime import IrrigationRuntime
    from .scheduler import IrrigationScheduler

    PLATFORMS: list[Platform] = [
        Platform.SELECT,
        Platform.SENSOR,
        Platform.BINARY_SENSOR,
        Platform.BUTTON,
    ]

    domain_data = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if domain_data:
        scheduler: IrrigationScheduler = domain_data["scheduler"]
        runtime: IrrigationRuntime = domain_data["runtime"]
        await scheduler.async_shutdown()
        await runtime.async_shutdown()

    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok and entry.entry_id in hass.data.get(DOMAIN, {}):
        hass.data[DOMAIN].pop(entry.entry_id)

    if unload_ok and hass.data.get(PANEL_REGISTERED_KEY):
        from homeassistant.config_entries import ConfigEntryState

        from .panel import async_unregister_panel

        still_loaded = any(
            e.state == ConfigEntryState.LOADED
            for e in hass.config_entries.async_entries(DOMAIN)
        )
        if not still_loaded:
            async_unregister_panel(hass)
            hass.data.pop(PANEL_REGISTERED_KEY, None)

    return unload_ok


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update."""
    from .scheduler import IrrigationScheduler

    domain_data = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if not domain_data:
        return
    scheduler: IrrigationScheduler = domain_data["scheduler"]
    await scheduler.async_reschedule_now()
