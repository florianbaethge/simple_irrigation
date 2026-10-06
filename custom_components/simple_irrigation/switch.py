"""Switch platform: global schedule enable + per-slot enable."""

from __future__ import annotations

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .coordinator import SimpleIrrigationCoordinator
from .entity import SimpleIrrigationEntity
from .models import ScheduleSlot

WEEKDAY_ABBR = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")


def _slot_label(slot: ScheduleSlot) -> str:
    """Human label for a slot, falling back to weekday(s) + time."""
    if slot.name:
        return slot.name
    wds = [d for d in slot.weekdays if 0 <= d < 7]
    if len(wds) == 7:
        days = "Daily"
    elif wds:
        days = ", ".join(WEEKDAY_ABBR[d] for d in wds)
    else:
        days = "?"
    return f"{days} {slot.time_local}"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up switches and keep per-slot switches in sync with the schedule."""
    coordinator: SimpleIrrigationCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]

    async_add_entities([ScheduleEnabledSwitch(coordinator)])

    known: set[str] = set()
    registry = er.async_get(hass)
    prefix, suffix = f"{entry.entry_id}_slot_", "_enabled"

    @callback
    def _sync_slot_switches() -> None:
        """Add switches for slots that appeared, remove those of slots that went."""
        current = {slot.slot_id for slot in coordinator.installation.schedule_slots}
        new_entities: list[SwitchEntity] = []
        for slot_id in current - known:
            known.add(slot_id)
            new_entities.append(SlotEnabledSwitch(coordinator, slot_id))
        if new_entities:
            async_add_entities(new_entities)
        # Not left behind as "unavailable" for good: the registry entry goes
        # with the slot. Also sweeps up what earlier versions left there.
        for registered in er.async_entries_for_config_entry(registry, entry.entry_id):
            unique_id = registered.unique_id
            if registered.domain != "switch" or not (
                unique_id.startswith(prefix) and unique_id.endswith(suffix)
            ):
                continue
            slot_id = unique_id[len(prefix) : -len(suffix)]
            if slot_id not in current:
                known.discard(slot_id)
                registry.async_remove(registered.entity_id)

    _sync_slot_switches()
    entry.async_on_unload(coordinator.async_add_listener(_sync_slot_switches))


class ScheduleEnabledSwitch(SimpleIrrigationEntity, SwitchEntity):
    """Global schedule on/off (mirrors installation.enabled)."""

    _attr_translation_key = "schedule_enabled"

    def __init__(self, coordinator: SimpleIrrigationCoordinator) -> None:
        """Initialize."""
        super().__init__(coordinator, "schedule_enabled")

    @property
    def is_on(self) -> bool:
        """Whether the schedule is enabled."""
        return self.coordinator.installation.enabled

    async def async_turn_on(self, **kwargs: object) -> None:
        """Enable the schedule."""
        await self._async_set_enabled(True)

    async def async_turn_off(self, **kwargs: object) -> None:
        """Disable the schedule."""
        await self._async_set_enabled(False)

    async def _async_set_enabled(self, value: bool) -> None:
        inst = self.coordinator.installation
        if inst.enabled == value:
            return
        inst.enabled = value
        await self.coordinator.async_update_installation(inst)


class SlotEnabledSwitch(SimpleIrrigationEntity, SwitchEntity):
    """Enable/disable a single schedule slot (mirrors slot.enabled)."""

    _attr_translation_key = "slot_enabled"

    def __init__(self, coordinator: SimpleIrrigationCoordinator, slot_id: str) -> None:
        """Initialize."""
        super().__init__(coordinator, f"slot_{slot_id}_enabled")
        self._slot_id = slot_id
        slot = self._slot
        self._attr_translation_placeholders = {
            "slot_name": _slot_label(slot) if slot else slot_id
        }

    @property
    def _slot(self) -> ScheduleSlot | None:
        return next(
            (s for s in self.coordinator.installation.schedule_slots if s.slot_id == self._slot_id),
            None,
        )

    @property
    def available(self) -> bool:
        """Unavailable once the slot has been removed from the schedule."""
        return super().available and self._slot is not None

    @property
    def is_on(self) -> bool | None:
        """Whether the slot is enabled."""
        slot = self._slot
        return slot.enabled if slot else None

    async def async_turn_on(self, **kwargs: object) -> None:
        """Enable the slot."""
        await self._async_set_enabled(True)

    async def async_turn_off(self, **kwargs: object) -> None:
        """Disable the slot."""
        await self._async_set_enabled(False)

    async def _async_set_enabled(self, value: bool) -> None:
        inst = self.coordinator.installation
        slot = next((s for s in inst.schedule_slots if s.slot_id == self._slot_id), None)
        if slot is None or slot.enabled == value:
            return
        slot.enabled = value
        await self.coordinator.async_update_installation(inst)
