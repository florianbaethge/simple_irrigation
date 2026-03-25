"""Sensor platform."""

from __future__ import annotations

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from .const import DOMAIN
from .coordinator import SimpleIrrigationCoordinator
from .entity import SimpleIrrigationEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up sensors."""
    coordinator: SimpleIrrigationCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    entities: list[SensorEntity] = [
        ActiveZonesSensor(coordinator),
        NextRunSensor(coordinator),
        PauseUntilSensor(coordinator),
    ]
    for zid, zone in coordinator.installation.zones.items():
        entities.append(ZoneNextRunSensor(coordinator, zid, zone.name))
        entities.append(ZoneLastRunSensor(coordinator, zid, zone.name))
    async_add_entities(entities)


class ActiveZonesSensor(SimpleIrrigationEntity, SensorEntity):
    """Comma-separated active zone ids."""

    _attr_translation_key = "active_zones"
    _attr_icon = "mdi:sprinkler-variant"

    def __init__(self, coordinator: SimpleIrrigationCoordinator) -> None:
        """Initialize."""
        super().__init__(coordinator, "sensor_active_zones")

    @property
    def native_value(self) -> str | None:
        """Active zones."""
        ids = self.coordinator.run_state.active_zone_ids
        return ", ".join(ids) if ids else None


class NextRunSensor(SimpleIrrigationEntity, SensorEntity):
    """Next scheduled run (global)."""

    _attr_translation_key = "next_run"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, coordinator: SimpleIrrigationCoordinator) -> None:
        """Initialize."""
        super().__init__(coordinator, "sensor_next_run")

    @property
    def native_value(self):
        """Next run."""
        return self.coordinator.run_state.next_run_global


class PauseUntilSensor(SimpleIrrigationEntity, SensorEntity):
    """Pause until timestamp."""

    _attr_translation_key = "pause_until"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, coordinator: SimpleIrrigationCoordinator) -> None:
        """Initialize."""
        super().__init__(coordinator, "sensor_pause_until")

    @property
    def native_value(self):
        """Pause until."""
        return self.coordinator.installation.pause_until


class ZoneNextRunSensor(SimpleIrrigationEntity, SensorEntity):
    """Per-zone next run."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(
        self,
        coordinator: SimpleIrrigationCoordinator,
        zone_id: str,
        zone_name: str,
    ) -> None:
        """Initialize."""
        super().__init__(coordinator, f"zone_{zone_id}_next_run")
        self._zone_id = zone_id
        self._attr_translation_key = "zone_next_run"
        self._attr_name = f"{zone_name} next run"

    @property
    def native_value(self):
        """Next run for zone."""
        return self.coordinator.run_state.next_run_per_zone.get(self._zone_id)


class ZoneLastRunSensor(SimpleIrrigationEntity, SensorEntity):
    """Per-zone last run."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(
        self,
        coordinator: SimpleIrrigationCoordinator,
        zone_id: str,
        zone_name: str,
    ) -> None:
        """Initialize."""
        super().__init__(coordinator, f"zone_{zone_id}_last_run")
        self._zone_id = zone_id
        self._attr_translation_key = "zone_last_run"
        self._attr_name = f"{zone_name} last run"

    @property
    def native_value(self):
        """Last run for zone."""
        return self.coordinator.run_state.last_run_per_zone.get(self._zone_id)
