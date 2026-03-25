"""Schedule next slot fires and trigger runs."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.event import async_track_point_in_time
from homeassistant.util import dt as dt_util

from .grouping import compute_phases
from .models import Installation, ScheduleSlot, Zone
from .time_util import next_slot_fire_local

if TYPE_CHECKING:
    from .coordinator import SimpleIrrigationCoordinator
    from .runtime import IrrigationRuntime

_LOGGER = logging.getLogger(__name__)


def compute_next_runs(
    inst: Installation,
    after: datetime,
    tz: Any,
) -> tuple[datetime | None, dict[str, datetime | None]]:
    """Return next global fire and per-zone next run (aware datetimes)."""
    if not inst.schedule_slots:
        return None, {zid: None for zid in inst.zones}

    zone_next: dict[str, datetime | None] = {zid: None for zid in inst.zones}
    global_next: datetime | None = None

    for slot in inst.schedule_slots:
        if not slot.enabled:
            continue
        nxt = next_slot_fire_local(
            after,
            slot.weekday,
            slot.time_local,
            tz,
        )
        if nxt is None:
            continue
        if global_next is None or nxt < global_next:
            global_next = nxt
        for zid in slot.zone_ids_ordered:
            if zid in zone_next:
                cur = zone_next[zid]
                if cur is None or nxt < cur:
                    zone_next[zid] = nxt

    return global_next, zone_next


def phases_for_slot(
    slot: ScheduleSlot,
    zones: dict[str, Zone],
    max_parallel: int,
) -> list[list[str]]:
    """Compute phases for a slot."""
    return compute_phases(
        slot.zone_ids_ordered,
        zones,
        max_parallel,
        skip_disabled=True,
    )


class IrrigationScheduler:
    """Track point-in-time for next irrigation slot."""

    def __init__(
        self,
        hass: HomeAssistant,
        coordinator: SimpleIrrigationCoordinator,
        runtime: IrrigationRuntime,
    ) -> None:
        """Initialize scheduler."""
        self.hass = hass
        self.coordinator = coordinator
        self.runtime = runtime
        self._unsub: CALLBACK_TYPE | None = None
        self._lock = asyncio.Lock()

    async def async_setup(self) -> None:
        """Start scheduling."""
        await self._async_update_next_runs_in_state()
        await self.async_reschedule_now()

    async def async_shutdown(self) -> None:
        """Cancel scheduled callback."""
        self._cancel_track()
        self._unsub = None

    def _cancel_track(self) -> None:
        if self._unsub is not None:
            self._unsub()
            self._unsub = None

    async def _async_update_next_runs_in_state(self) -> None:
        """Persist computed next-run times into run_state."""
        inst = self.coordinator.installation
        rs = self.coordinator.run_state
        tz = dt_util.get_time_zone(self.hass.config.time_zone)
        if tz is None:
            return
        if not inst.enabled:
            rs.next_run_global = None
            rs.next_run_per_zone = {zid: None for zid in inst.zones}
            await self.coordinator.async_update_run_state(rs)
            return
        now = dt_util.now()
        pause_until = inst.pause_until
        global_next, zone_next = compute_next_runs(inst, now, tz)

        if pause_until and now < pause_until:
            # Next eligible after pause
            global_next, zone_next = compute_next_runs(inst, pause_until, tz)

        rs.next_run_global = global_next
        rs.next_run_per_zone = zone_next
        await self.coordinator.async_update_run_state(rs)

    @callback
    def async_reschedule(self) -> None:
        """Schedule next wake (sync entry point from listener)."""
        asyncio.create_task(self._async_reschedule())

    async def async_reschedule_now(self) -> None:
        """Await reschedule (e.g. after options save)."""
        await self._async_reschedule()

    async def _async_reschedule(self) -> None:
        async with self._lock:
            self._cancel_track()
            await self._async_update_next_runs_in_state()

            inst = self.coordinator.installation
            rs = self.coordinator.run_state
            tz = dt_util.get_time_zone(self.hass.config.time_zone)
            if tz is None:
                return

            now = dt_util.now()
            when = rs.next_run_global
            if when is None:
                return
            if when <= now:
                when = now + timedelta(seconds=1)

            when_utc = dt_util.as_utc(when)

            self._unsub = async_track_point_in_time(
                self.hass,
                self._async_fire_at,
                when_utc,
            )

    async def _async_fire_at(self, _now: datetime) -> None:
        """Called at scheduled time — match slots and start run."""
        self._unsub = None
        try:
            inst = self.coordinator.installation
            tz = dt_util.get_time_zone(self.hass.config.time_zone)
            if tz is None:
                return

            now = dt_util.now()
            if not inst.enabled:
                return

            pause_until = inst.pause_until
            if pause_until and now < pause_until:
                return

            if self.runtime.is_busy():
                _LOGGER.debug("Scheduler skipped: runtime busy")
                return

            due_slots: list[ScheduleSlot] = []
            for slot in inst.schedule_slots:
                if not slot.enabled:
                    continue
                nxt = next_slot_fire_local(
                    now - timedelta(minutes=1),
                    slot.weekday,
                    slot.time_local,
                    tz,
                )
                if nxt is None:
                    continue
                if abs((now - nxt).total_seconds()) < 90:
                    due_slots.append(slot)

            if not due_slots:
                return

            merged_phases: list[list[str]] = []
            for slot in due_slots:
                merged_phases.extend(
                    phases_for_slot(slot, inst.zones, inst.max_parallel_zones),
                )

            if not merged_phases:
                return

            slot_ids = [s.slot_id for s in due_slots]
            await self.runtime.async_run_phases(
                merged_phases,
                scheduled=True,
                slot_ids=slot_ids,
            )
        finally:
            await self._async_reschedule()

