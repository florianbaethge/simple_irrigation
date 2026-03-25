"""Base entity for Simple Irrigation."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import SimpleIrrigationCoordinator


class SimpleIrrigationEntity(CoordinatorEntity[SimpleIrrigationCoordinator]):
    """Base entity."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: SimpleIrrigationCoordinator,
        unique_id_suffix: str,
    ) -> None:
        """Initialize entity."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{coordinator.config_entry.entry_id}_{unique_id_suffix}"
        entry = coordinator.config_entry
        inst = coordinator.installation
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=inst.name,
            manufacturer="Florian Bäthge",
            model="Simple Irrigation",
        )
