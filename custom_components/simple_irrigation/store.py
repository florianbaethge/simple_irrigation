"""Persistent JSON storage for installation and run state."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORE_VERSION
from .models import Installation, RunState

_LOGGER = logging.getLogger(__name__)

STORAGE_KEY = DOMAIN


def _migrate_data(data: dict[str, Any], version: int) -> dict[str, Any]:
    """Apply migrations from older store versions."""
    if version < 1:
        data = {"version": STORE_VERSION, "installation": {}, "run_state": {}}
    # Future: if version == 1: ...
    data["version"] = STORE_VERSION
    return data


class SimpleIrrigationStore:
    """Load/save installation and run state per config entry."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        """Initialize store for a config entry."""
        self.hass = hass
        self.entry_id = entry_id
        self._store = Store(
            hass,
            STORE_VERSION,
            f"{DOMAIN}.{entry_id}",
        )
        self.installation: Installation | None = None
        self.run_state: RunState = RunState()

    async def async_load(self, initial: Installation | None = None) -> Installation:
        """Load from disk; if missing, persist ``initial`` (required on first run)."""
        data = await self._store.async_load()
        if not data:
            if initial is None:
                msg = "No store data and no initial installation provided"
                raise ValueError(msg)
            self.installation = initial
            self.run_state = RunState()
            await self.async_save()
            return self.installation

        version = int(data.get("version", 1))
        if version != STORE_VERSION:
            data = _migrate_data(data, version)

        inst_data = data.get("installation") or {}
        self.installation = Installation.from_dict(inst_data)
        rs_data = data.get("run_state") or {}
        self.run_state = RunState.from_dict(rs_data)
        return self.installation

    async def async_save(self) -> None:
        """Persist current installation and run state."""
        if self.installation is None:
            _LOGGER.warning("async_save called with no installation")
            return
        payload = {
            "version": STORE_VERSION,
            "installation": self.installation.to_dict(),
            "run_state": self.run_state.to_dict(),
        }
        await self._store.async_save(payload)

    def update_run_state(self, run_state: RunState) -> None:
        """Replace run state reference."""
        self.run_state = run_state
