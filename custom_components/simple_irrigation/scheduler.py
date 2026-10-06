"""Schedule next slot fires and trigger runs."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any

from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.event import async_track_point_in_time
from homeassistant.util import dt as dt_util

from .const import (
    EVENT_SCHEDULE_SKIPPED,
    SKIP_BUSY,
    SKIP_CONDITIONS,
    SKIP_ERROR,
    SKIP_EXPIRED,
    SKIP_QUEUE_FULL,
)
from .grouping import compute_phases
from .guards import guards_allow_run
from .models import Installation, ScheduleSlot, Zone
from .program import RunStep, expand_program
from .season import next_slot_fire

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
        nxt = next_slot_fire(inst, slot, after, tz)
        if nxt is None:
            continue
        if global_next is None or nxt.timestamp() < global_next.timestamp():
            global_next = nxt
        for zid in slot.zone_ids_ordered:
            # A zone this slot leaves out -- fixed to 0 minutes -- has no next
            # run in it.
            if zid in zone_next and slot.duration_for(inst.zones[zid], inst.mode) > 0:
                cur = zone_next[zid]
                if cur is None or nxt.timestamp() < cur.timestamp():
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


def program_for_slot(
    slot: ScheduleSlot,
    zones: dict[str, Zone],
    max_parallel: int,
) -> list[RunStep]:
    """The slot's phases as run steps, repeated and rested per Cycle & Soak."""
    return expand_program(phases_for_slot(slot, zones, max_parallel), slot)


def program_for_slots(slots: list[ScheduleSlot], inst: Installation) -> list[RunStep]:
    """Slots due in the same minute as one run, back to back.

    Each keeps its own Cycle & Soak steps; the queue is the one place they meet.
    """
    steps: list[RunStep] = []
    for slot in slots:
        steps.extend(program_for_slot(slot, inst.zones, inst.max_parallel_zones))
    return steps


# Skipped for a reason nobody chose: worth a warning. The others are somebody's
# doing -- a condition, a pause, the Stop button -- and only worth a note.
_UNEXPECTED_SKIPS = frozenset({SKIP_BUSY, SKIP_EXPIRED, SKIP_QUEUE_FULL, SKIP_ERROR})


def report_schedule_skipped(
    hass: HomeAssistant, slot: ScheduleSlot, due_at: datetime, reason: str
) -> None:
    """A schedule that was due did not run: say so, in the log and as an event."""
    _LOGGER.log(
        logging.WARNING if reason in _UNEXPECTED_SKIPS else logging.INFO,
        "Schedule %s, due %s, was skipped: %s",
        slot.name or slot.slot_id,
        dt_util.as_local(due_at).strftime("%H:%M"),
        reason,
    )
    hass.bus.async_fire(
        EVENT_SCHEDULE_SKIPPED,
        {
            "slot_id": slot.slot_id,
            "name": slot.name,
            "due_at": due_at.isoformat(),
            "reason": reason,
        },
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
        # The occurrence of each slot that was last dealt with. A slot due
        # within the next minute is taken along with the one firing now; when
        # its own minute comes it must not count as due a second time.
        self._handled: dict[str, datetime] = {}

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
        self.hass.async_create_task(self._async_reschedule())

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
            # In real time, not by the wall clock: around a change of the
            # clocks the two disagree, and a timer armed in the past fires at
            # once, finds nothing due and arms itself again -- without end.
            when_utc = dt_util.as_utc(when)
            if when_utc <= dt_util.as_utc(now):
                when_utc = dt_util.as_utc(now) + timedelta(seconds=1)

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

            due_slots: list[ScheduleSlot] = []
            for slot in inst.schedule_slots:
                if not slot.enabled:
                    continue
                nxt = next_slot_fire(inst, slot, now - timedelta(minutes=1), tz)
                if nxt is None:
                    continue
                # By timestamp: the difference of two wall clocks is off by an
                # hour on the night the clocks change.
                if abs(now.timestamp() - nxt.timestamp()) < 90:
                    if self._handled.get(slot.slot_id) == nxt:
                        continue
                    self._handled[slot.slot_id] = nxt
                    if guards_allow_run(self.hass, inst, slot):
                        due_slots.append(slot)
                    else:
                        report_schedule_skipped(self.hass, slot, now, SKIP_CONDITIONS)

            if not due_slots:
                return

            # Behind whatever is running, and behind whoever is waiting already.
            if self.runtime.is_busy() or self.runtime.has_waiting():
                await self.runtime.async_wait_or_skip(due_slots, now)
                return

            merged_steps = program_for_slots(due_slots, inst)
            if not merged_steps:
                return

            started = await self.runtime.async_run_phases(
                merged_steps,
                scheduled=True,
                slot_ids=[s.slot_id for s in due_slots],
            )
            if not started:
                # A manual run got in first, in this very moment.
                await self.runtime.async_wait_or_skip(due_slots, now)
        finally:
            await self._async_reschedule()

