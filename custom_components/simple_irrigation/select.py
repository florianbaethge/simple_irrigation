"""Select platform: global mode."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, MODES
from .coordinator import SimpleIrrigationCoordinator
from .entity import SimpleIrrigationEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up select entities."""
    coordinator: SimpleIrrigationCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    async_add_entities([SimpleIrrigationModeSelect(coordinator)])


class SimpleIrrigationModeSelect(SimpleIrrigationEntity, SelectEntity):
    """Global irrigation mode."""

    _attr_translation_key = "mode"

    def __init__(self, coordinator: SimpleIrrigationCoordinator) -> None:
        """Initialize mode select."""
        super().__init__(coordinator, "mode")
        self._attr_options = list(MODES)

    @property
    def current_option(self) -> str | None:
        """Current mode."""
        return self.coordinator.installation.mode

    async def async_select_option(self, option: str) -> None:
        """Set mode."""
        inst = self.coordinator.installation
        inst.mode = option
        await self.coordinator.async_update_installation(inst)
