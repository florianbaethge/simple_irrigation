"""Sensor platform."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfVolume
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import EntityCategory
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from .const import DOMAIN, RUN_STATE_RUNNING
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
        CurrentRunEndsAtSensor(coordinator),
        WaterSensor(coordinator),
    ]
    for zid, zone in coordinator.installation.zones.items():
        entities.append(ZoneNextRunSensor(coordinator, zid, zone.name))
        entities.append(ZoneLastRunSensor(coordinator, zid, zone.name))
        entities.append(ZoneEndsAtSensor(coordinator, zid, zone.name))
        entities.append(ZoneWaterSensor(coordinator, zid, zone.name))
    async_add_entities(entities)


class WaterSensor(SimpleIrrigationEntity, SensorEntity):
    """Litres the installation has used, as a running total.

    A ``total_increasing`` water sensor is all Home Assistant needs: long-term
    statistics, history graphs, the Energy dashboard's water section and a
    Utility Meter for monthly figures all come for free. The integration keeps
    no history of its own. ``source`` says whether the figure was measured by a
    meter or estimated from flow rates; the last finished run is an attribute.
    Unknown until the first run reports water, so an installation that tracks
    none never shows a bogus zero.
    """

    _attr_translation_key = "water_total"
    _attr_icon = "mdi:water"
    _attr_device_class = SensorDeviceClass.WATER
    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_native_unit_of_measurement = UnitOfVolume.LITERS
    _attr_suggested_display_precision = 0

    def __init__(self, coordinator: SimpleIrrigationCoordinator) -> None:
        """Initialize."""
        super().__init__(coordinator, "water_total")

    @property
    def native_value(self) -> float | None:
        """Running total in litres."""
        rs = self.coordinator.run_state
        if rs.last_run_water_l is None and rs.water_total_installation_l <= 0:
            return None
        return rs.water_total_installation_l

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """The last finished run and where the numbers come from."""
        rs = self.coordinator.run_state
        return {
            "source": rs.last_run_water_source or None,
            "last_run_l": (
                round(rs.last_run_water_l, 1) if rs.last_run_water_l is not None else None
            ),
        }


class ZoneWaterSensor(SimpleIrrigationEntity, SensorEntity):
    """Litres one zone has used, as a running total (see WaterSensor)."""

    _attr_icon = "mdi:water"
    _attr_device_class = SensorDeviceClass.WATER
    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_native_unit_of_measurement = UnitOfVolume.LITERS
    _attr_suggested_display_precision = 0

    def __init__(
        self,
        coordinator: SimpleIrrigationCoordinator,
        zone_id: str,
        zone_name: str,
    ) -> None:
        """Initialize."""
        super().__init__(coordinator, f"zone_{zone_id}_water")
        self._zone_id = zone_id
        self._attr_translation_key = "zone_water"
        self._attr_translation_placeholders = {"zone_name": zone_name}

    @property
    def native_value(self) -> float | None:
        """Running total in litres; unknown until the zone reports water."""
        return self.coordinator.run_state.water_total_l.get(self._zone_id)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """The last run and where the number comes from."""
        rs = self.coordinator.run_state
        last = rs.water_last_run_l.get(self._zone_id)
        return {
            "source": rs.water_source.get(self._zone_id),
            "last_run_l": round(last, 1) if last is not None else None,
        }


class ActiveZonesSensor(SimpleIrrigationEntity, SensorEntity):
    """Comma-separated active zone names."""

    _attr_translation_key = "active_zones"
    _attr_icon = "mdi:sprinkler-variant"
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, coordinator: SimpleIrrigationCoordinator) -> None:
        """Initialize."""
        super().__init__(coordinator, "sensor_active_zones")

    @property
    def native_value(self) -> str | None:
        """Active zones."""
        ids = self.coordinator.run_state.active_zone_ids
        if not ids:
            return None
        zones = self.coordinator.installation.zones
        return ", ".join(zones[zid].name if zid in zones else zid for zid in ids)


class NextRunSensor(SimpleIrrigationEntity, SensorEntity):
    """Next scheduled run (global)."""

    _attr_translation_key = "next_run"
    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_entity_category = EntityCategory.DIAGNOSTIC

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
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, coordinator: SimpleIrrigationCoordinator) -> None:
        """Initialize."""
        super().__init__(coordinator, "sensor_pause_until")

    @property
    def native_value(self):
        """Pause until."""
        return self.coordinator.installation.pause_until


class CurrentRunEndsAtSensor(SimpleIrrigationEntity, SensorEntity):
    """When the zones watering right now are planned to finish.

    A timestamp rather than a remaining-minutes value on purpose: the state then
    changes twice per zone run instead of continuously, which keeps the recorder
    quiet, and a dashboard can still render a live countdown from it
    (`format: relative` on an entities row).
    """

    _attr_translation_key = "current_run_ends_at"
    _attr_icon = "mdi:timer-sand"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, coordinator: SimpleIrrigationCoordinator) -> None:
        """Initialize."""
        super().__init__(coordinator, "sensor_current_run_ends_at")

    @property
    def native_value(self):
        """Latest planned end among the zones running right now."""
        rs = self.coordinator.run_state
        # Guarded by run_state, so a stale entry can never produce a phantom
        # countdown — whatever left it behind.
        if rs.run_state != RUN_STATE_RUNNING:
            return None
        ends = [rs.zone_ends_at[zid] for zid in rs.active_zone_ids if zid in rs.zone_ends_at]
        return max(ends) if ends else None


class ZoneNextRunSensor(SimpleIrrigationEntity, SensorEntity):
    """Per-zone next run."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_entity_category = EntityCategory.DIAGNOSTIC

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
        self._attr_translation_placeholders = {"zone_name": zone_name}

    @property
    def native_value(self):
        """Next run for zone."""
        return self.coordinator.run_state.next_run_per_zone.get(self._zone_id)


class ZoneLastRunSensor(SimpleIrrigationEntity, SensorEntity):
    """Per-zone last run."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_entity_category = EntityCategory.DIAGNOSTIC

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
        self._attr_translation_placeholders = {"zone_name": zone_name}

    @property
    def native_value(self):
        """Last run for zone."""
        return self.coordinator.run_state.last_run_per_zone.get(self._zone_id)


class ZoneEndsAtSensor(SimpleIrrigationEntity, SensorEntity):
    """Per-zone planned end of the current run.

    Useful with parallel zones, where each zone can have its own duration and the
    global sensor only reports the last one to finish.
    """

    _attr_icon = "mdi:timer-sand"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(
        self,
        coordinator: SimpleIrrigationCoordinator,
        zone_id: str,
        zone_name: str,
    ) -> None:
        """Initialize."""
        super().__init__(coordinator, f"zone_{zone_id}_ends_at")
        self._zone_id = zone_id
        self._attr_translation_key = "zone_ends_at"
        self._attr_translation_placeholders = {"zone_name": zone_name}

    @property
    def native_value(self):
        """Planned end for this zone while it is watering."""
        rs = self.coordinator.run_state
        if rs.run_state != RUN_STATE_RUNNING:
            return None
        return rs.zone_ends_at.get(self._zone_id)
