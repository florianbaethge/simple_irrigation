"""Data coordinator for Simple Irrigation."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .const import DOMAIN
from .models import Installation, RunState
from .store import SimpleIrrigationStore

_LOGGER = logging.getLogger(__name__)


class SimpleIrrigationCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Holds installation + run state and notifies listeners."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        store: SimpleIrrigationStore,
    ) -> None:
        """Initialize coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=None,
        )
        self.config_entry = entry
        self.store = store

    @property
    def installation(self) -> Installation:
        """Return installation; must be loaded."""
        assert self.store.installation is not None
        return self.store.installation

    def _async_reschedule_scheduler(self) -> None:
        """Notify scheduler after installation changes."""
        domain_data = self.hass.data.get(DOMAIN, {}).get(self.config_entry.entry_id)
        if not domain_data:
            return
        sched = domain_data.get("scheduler")
        if sched is not None:
            sched.async_reschedule()

    @property
    def run_state(self) -> RunState:
        """Volatile run state."""
        return self.store.run_state

    async def _async_update_data(self) -> dict[str, Any]:
        """Unused polling path — state is pushed via async_refresh_listeners."""
        return {"installation": self.store.installation, "run_state": self.store.run_state}

    async def async_update_installation(self, installation: Installation) -> None:
        """Replace installation and persist."""
        self.store.installation = installation
        await self.store.async_save()
        self.async_update_listeners()
        self._async_reschedule_scheduler()

    async def async_update_run_state(self, run_state: RunState) -> None:
        """Update run state and persist."""
        self.store.run_state = run_state
        await self.store.async_save()
        self.async_update_listeners()

    async def async_refresh_listeners(self) -> None:
        """Notify entity listeners after external updates."""
        self.async_update_listeners()
