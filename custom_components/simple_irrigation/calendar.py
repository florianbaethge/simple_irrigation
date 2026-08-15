"""Read-only calendar platform for scheduled irrigation runs."""

from __future__ import annotations

from datetime import datetime, time, timedelta
from math import ceil
from typing import Any

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .coordinator import SimpleIrrigationCoordinator
from .entity import SimpleIrrigationEntity
from .models import Installation, ScheduleSlot
from .scheduler import phases_for_slot
from .time_util import parse_hh_mm, week_parity_matches


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the irrigation schedule calendar."""
    coordinator: SimpleIrrigationCoordinator = hass.data[DOMAIN][entry.entry_id][
        "coordinator"
    ]
    async_add_entities([IrrigationCalendar(coordinator)])


def _slot_duration(slot: ScheduleSlot, installation: Installation) -> timedelta:
    """Return the planned pipeline duration for one slot."""
    phases = phases_for_slot(
        slot, installation.zones, installation.max_parallel_zones
    )
    minutes = sum(
        max(
            installation.zones[zone_id].duration_for_mode(installation.mode)
            for zone_id in phase
        )
        for phase in phases
        if phase
    )
    return timedelta(seconds=max(0, installation.pre_start_delay_sec), minutes=minutes)


def _slot_summary(slot: ScheduleSlot, installation: Installation) -> str:
    """Build a concise, human-readable event title."""
    if slot.name.strip():
        return slot.name.strip()
    names = [
        installation.zones[zone_id].name
        for zone_id in slot.zone_ids_ordered
        if zone_id in installation.zones and installation.zones[zone_id].enabled
    ]
    return ", ".join(names) if names else installation.name


def _slot_description(slot: ScheduleSlot, installation: Installation) -> str:
    """Describe the zones and active watering mode."""
    names = [
        installation.zones[zone_id].name
        for zone_id in slot.zone_ids_ordered
        if zone_id in installation.zones and installation.zones[zone_id].enabled
    ]
    parts = []
    if names:
        parts.append(f"Zones: {', '.join(names)}")
    parts.append(f"Mode: {installation.mode.capitalize()}")
    return "\n".join(parts)


def calendar_events(
    installation: Installation,
    start: datetime,
    end: datetime,
    tz: Any,
) -> list[CalendarEvent]:
    """Expand recurring schedule slots into events overlapping a time range."""
    if not installation.enabled or end <= start:
        return []

    start_local = start.astimezone(tz)
    end_local = end.astimezone(tz)
    candidates: list[CalendarEvent] = []

    for slot in installation.schedule_slots:
        if not slot.enabled or not slot.weekdays:
            continue
        parsed = parse_hh_mm(slot.time_local)
        if parsed is None:
            continue
        duration = _slot_duration(slot, installation)
        if duration <= timedelta(seconds=max(0, installation.pre_start_delay_sec)):
            # No enabled, known zones means the runtime would have nothing to do.
            continue

        # Include starts before the query whose long event may overlap its lower bound.
        lookback_days = max(1, ceil(duration.total_seconds() / 86400))
        day = start_local.date() - timedelta(days=lookback_days)
        last_day = end_local.date()
        while day <= last_day:
            if day.weekday() in slot.weekdays and week_parity_matches(
                day, slot.week_parity
            ):
                event_start = datetime.combine(
                    day, time(parsed[0], parsed[1]), tzinfo=tz
                )
                event_end = event_start + duration
                if event_end > start_local and event_start < end_local:
                    candidates.append(
                        CalendarEvent(
                            start=event_start,
                            end=event_end,
                            summary=_slot_summary(slot, installation),
                            description=_slot_description(slot, installation),
                            uid=f"{installation.installation_id}:{slot.slot_id}:{day.isoformat()}",
                        )
                    )
            day += timedelta(days=1)

    return sorted(candidates, key=lambda event: event.start)


class IrrigationCalendar(SimpleIrrigationEntity, CalendarEntity):
    """Calendar containing the installation's planned irrigation runs."""

    _attr_translation_key = "schedule"
    _attr_icon = "mdi:calendar-clock"

    def __init__(self, coordinator: SimpleIrrigationCoordinator) -> None:
        """Initialize the calendar."""
        super().__init__(coordinator, "calendar_schedule")

    @property
    def event(self) -> CalendarEvent | None:
        """Return the active or next scheduled event."""
        tz = dt_util.get_time_zone(self.hass.config.time_zone)
        if tz is None:
            return None
        now = dt_util.now()
        events = calendar_events(
            self.coordinator.installation,
            now - timedelta(days=1),
            now + timedelta(days=15),
            tz,
        )
        return next((event for event in events if event.end > now), None)

    async def async_get_events(
        self,
        hass: HomeAssistant,
        start_date: datetime,
        end_date: datetime,
    ) -> list[CalendarEvent]:
        """Return planned events in the requested range."""
        tz = dt_util.get_time_zone(hass.config.time_zone)
        if tz is None:
            return []
        return calendar_events(
            self.coordinator.installation, start_date, end_date, tz
        )
