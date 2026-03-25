"""Binary sensor platform."""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import DOMAIN, RUN_STATE_PREPARING, RUN_STATE_RUNNING, RUN_STATE_STOPPING
from .coordinator import SimpleIrrigationCoordinator
from .entity import SimpleIrrigationEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up binary sensors."""
    coordinator: SimpleIrrigationCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    entities: list[BinarySensorEntity] = [
        RunningBinarySensor(coordinator),
        PausedBinarySensor(coordinator),
        ErrorBinarySensor(coordinator),
    ]
    for zid, zone in coordinator.installation.zones.items():
        entities.append(ZoneActiveBinarySensor(coordinator, zid, zone.name))
    async_add_entities(entities)


class RunningBinarySensor(SimpleIrrigationEntity, BinarySensorEntity):
    """True when a run is in progress."""

    _attr_translation_key = "running"

    def __init__(self, coordinator: SimpleIrrigationCoordinator) -> None:
        """Initialize."""
        super().__init__(coordinator, "binary_running")

    @property
    def is_on(self) -> bool | None:
        """Running."""
        rs = self.coordinator.run_state.run_state
        return rs in (RUN_STATE_PREPARING, RUN_STATE_RUNNING, RUN_STATE_STOPPING)


class PausedBinarySensor(SimpleIrrigationEntity, BinarySensorEntity):
    """True when pause_until is active."""

    _attr_translation_key = "paused"

    def __init__(self, coordinator: SimpleIrrigationCoordinator) -> None:
        """Initialize."""
        super().__init__(coordinator, "binary_paused")

    @property
    def is_on(self) -> bool | None:
        """Paused."""
        pu = self.coordinator.installation.pause_until
        if pu is None:
            return False
        return dt_util.utcnow() < pu


class ErrorBinarySensor(SimpleIrrigationEntity, BinarySensorEntity):
    """True when last state is error."""

    _attr_translation_key = "error_state"

    def __init__(self, coordinator: SimpleIrrigationCoordinator) -> None:
        """Initialize."""
        super().__init__(coordinator, "binary_error")

    @property
    def is_on(self) -> bool | None:
        """Error."""
        from .const import RUN_STATE_ERROR

        return self.coordinator.run_state.run_state == RUN_STATE_ERROR


class ZoneActiveBinarySensor(SimpleIrrigationEntity, BinarySensorEntity):
    """Zone valve active."""

    def __init__(
        self,
        coordinator: SimpleIrrigationCoordinator,
        zone_id: str,
        zone_name: str,
    ) -> None:
        """Initialize."""
        super().__init__(coordinator, f"zone_{zone_id}_active")
        self._zone_id = zone_id
        self._attr_translation_key = "zone_active"
        self._attr_name = f"{zone_name} active"

    @property
    def is_on(self) -> bool | None:
        """Zone in active list."""
        return self._zone_id in self.coordinator.run_state.active_zone_ids
