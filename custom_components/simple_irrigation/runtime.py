"""Run irrigation phases: pre-start switches, zone timers, stop."""

from __future__ import annotations

import asyncio
import logging
from datetime import timedelta
from contextlib import suppress
from typing import TYPE_CHECKING

from homeassistant.exceptions import HomeAssistantError
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .const import (
    EVENT_RUN_FAILED,
    EVENT_RUN_FINISHED,
    EVENT_RUN_STARTED,
    EVENT_ZONE_FINISHED,
    EVENT_ZONE_STARTED,
    RUN_STATE_ERROR,
    RUN_STATE_IDLE,
    RUN_STATE_PREPARING,
    RUN_STATE_RUNNING,
    RUN_STATE_STOPPING,
)
from .grouping import can_join_active_phase, compute_phases
from .models import RunState, Zone
from .scheduler import phases_for_slot

if TYPE_CHECKING:
    from .coordinator import SimpleIrrigationCoordinator

_LOGGER = logging.getLogger(__name__)


class ZoneManualRunError(HomeAssistantError):
    """Manual zone run cannot start; ``code`` is used by the panel HTTP API."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        super().__init__(message)


class ScheduleSlotRunError(HomeAssistantError):
    """Manual schedule slot run cannot start; ``code`` is used by the panel HTTP API."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        super().__init__(message)


class IrrigationRuntime:
    """Execute scheduled or manual irrigation runs."""

    def __init__(self, hass: HomeAssistant, coordinator: SimpleIrrigationCoordinator) -> None:
        """Initialize runtime."""
        self.hass = hass
        self.coordinator = coordinator
        self._task: asyncio.Task[None] | None = None
        self._stop_event = asyncio.Event()
        self._skip_phase_event = asyncio.Event()
        self._run_lock = asyncio.Lock()
        self._touched_entities: set[str] = set()
        self._duration_overrides: dict[str, int] = {}
        self._phase_queue: list[list[str]] = []
        self._manual_zone_order: list[str] = []
        self._after_phase_zone_order: list[str] = []
        self._mid_phase_extensions: list[str] = []
        self._phase_extend_event = asyncio.Event()

    async def async_setup(self) -> None:
        """Reset state on startup."""
        rs = self.coordinator.run_state
        if rs.run_state not in (RUN_STATE_IDLE, RUN_STATE_ERROR):
            rs.run_state = RUN_STATE_ERROR
            rs.last_error = "Interrupted by Home Assistant restart"
            rs.active_zone_ids = []
            rs.queued_zone_ids = []
            rs.current_slot_id = None
            rs.upcoming_phases = []
            await self.coordinator.async_update_run_state(rs)
        await self._async_turn_off_all_tracked()

    async def async_shutdown(self) -> None:
        """Cancel running task."""
        await self.async_stop_all()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    def is_busy(self) -> bool:
        """Return True if a run is active."""
        rs = self.coordinator.run_state
        return rs.run_state in (
            RUN_STATE_PREPARING,
            RUN_STATE_RUNNING,
            RUN_STATE_STOPPING,
        )

    async def async_run_phases(
        self,
        phases: list[list[str]],
        *,
        scheduled: bool,
        slot_ids: list[str] | None = None,
        duration_overrides: dict[str, int] | None = None,
    ) -> None:
        """Start background task to run phases."""
        if not phases:
            return
        async with self._run_lock:
            if self.is_busy():
                _LOGGER.warning("Run skipped: already busy")
                return
            self._duration_overrides = dict(duration_overrides or {})
            self._phase_queue = [list(g) for g in phases]
            self._manual_zone_order.clear()
            self._after_phase_zone_order.clear()
            self._mid_phase_extensions.clear()
            self._phase_extend_event.clear()
            self._stop_event.clear()
            self._skip_phase_event.clear()
            self._touched_entities.clear()
            self._task = self.hass.async_create_task(
                self._async_run_pipeline(scheduled, slot_ids or []),
            )

    async def _async_run_pipeline(
        self,
        scheduled: bool,
        slot_ids: list[str],
    ) -> None:
        inst = self.coordinator.installation
        rs = self.coordinator.run_state

        try:
            if scheduled:
                self._manual_zone_order.clear()
            self._phase_extend_event.clear()

            rs.run_state = RUN_STATE_PREPARING
            rs.manual_run = not scheduled
            rs.current_slot_id = slot_ids[0] if slot_ids else None
            rs.current_run_started_at = dt_util.utcnow()
            # active_zone_ids empty until first phase; upcoming = phases not yet started.
            rs.upcoming_phases = [list(g) for g in self._phase_queue]
            await self.coordinator.async_update_run_state(rs)

            self.hass.bus.async_fire(
                EVENT_RUN_STARTED,
                {
                    "scheduled": scheduled,
                    "slot_ids": slot_ids,
                },
            )

            await self._async_pre_start(inst.pre_start_delay_sec)
            if self._stop_event.is_set():
                await self._async_finish_run(RUN_STATE_IDLE, error=None)
                return

            rs.run_state = RUN_STATE_RUNNING
            self._manual_zone_order.clear()
            rs.upcoming_phases = [list(g) for g in self._phase_queue]
            await self.coordinator.async_update_run_state(rs)

            while True:
                if self._stop_event.is_set():
                    break

                if not self._phase_queue and self._after_phase_zone_order:
                    self._phase_queue = compute_phases(
                        self._after_phase_zone_order,
                        inst.zones,
                        inst.max_parallel_zones,
                    )
                    self._after_phase_zone_order.clear()

                if not self._phase_queue:
                    break

                self._skip_phase_event.clear()
                phase = self._phase_queue.pop(0)
                rs = self.coordinator.run_state
                rs.upcoming_phases = [list(g) for g in self._phase_queue]
                await self.coordinator.async_update_run_state(rs)
                await self._async_run_phase_expandable(phase, inst.mode)

            await self._async_finish_run(RUN_STATE_IDLE, error=None)

        except Exception as err:  # noqa: BLE001
            _LOGGER.exception("Irrigation run failed: %s", err)
            self.hass.bus.async_fire(
                EVENT_RUN_FAILED,
                {"error": str(err)},
            )
            await self._async_finish_run(RUN_STATE_ERROR, error=str(err))
        finally:
            self._duration_overrides.clear()
            self._manual_zone_order.clear()
            self._after_phase_zone_order.clear()
            self._mid_phase_extensions.clear()
            self._phase_queue.clear()

    async def _async_finish_run(self, state: str, error: str | None) -> None:
        rs = self.coordinator.run_state
        rs.run_state = RUN_STATE_STOPPING
        await self.coordinator.async_update_run_state(rs)

        await self._async_turn_off_all_tracked()

        rs.run_state = state
        rs.active_zone_ids = []
        rs.queued_zone_ids = []
        rs.current_slot_id = None
        rs.manual_run = False
        rs.upcoming_phases = []
        if error:
            rs.last_error = error
        elif state == RUN_STATE_IDLE:
            rs.last_error = None
        await self.coordinator.async_update_run_state(rs)

        self.hass.bus.async_fire(
            EVENT_RUN_FINISHED,
            {"run_state": state, "error": error},
        )

    async def _async_sleep_interruptible(self, delay_sec: float) -> None:
        """Sleep but wake early on stop or skip phase."""
        if delay_sec <= 0:
            return
        loop = asyncio.get_running_loop()
        deadline = loop.time() + delay_sec
        while True:
            if self._stop_event.is_set():
                return
            if self._skip_phase_event.is_set():
                return
            remaining = deadline - loop.time()
            if remaining <= 0:
                return
            chunk = min(remaining, 1.0)
            try:
                await asyncio.wait_for(self._wait_stop_or_skip(), timeout=chunk)
            except TimeoutError:
                pass

    async def _async_pre_start(self, delay_sec: int) -> None:
        inst = self.coordinator.installation
        for entity_id in inst.pre_start_switches:
            await self._async_switch_turn_on(entity_id)
        await self._async_sleep_interruptible(float(delay_sec))

    async def _async_run_phase_expandable(self, initial_zone_ids: list[str], mode: str) -> None:
        """Run one phase; extra manual zones may join mid-phase when parallel rules allow."""
        inst = self.coordinator.installation
        rs = self.coordinator.run_state
        self._phase_extend_event.clear()

        tasks_by_zone: dict[str, asyncio.Task[None]] = {}

        async def _run_one_zone(zid: str) -> None:
            zone = inst.zones.get(zid)
            if zone is None or not zone.enabled:
                return
            duration = self._duration_overrides.get(
                zid,
                zone.duration_for_mode(mode),
            )
            await self._async_zone_run(zone, duration)

        def _launch(zid: str) -> None:
            if zid in tasks_by_zone:
                return
            tasks_by_zone[zid] = asyncio.create_task(_run_one_zone(zid))

        for zid in initial_zone_ids:
            _launch(zid)

        async def _sync_active() -> None:
            rs.active_zone_ids = [
                zid for zid, t in tasks_by_zone.items() if not t.done()
            ]
            await self.coordinator.async_update_run_state(rs)

        await _sync_active()

        while tasks_by_zone:
            if self._stop_event.is_set():
                for t in tasks_by_zone.values():
                    t.cancel()
                await asyncio.gather(*tasks_by_zone.values(), return_exceptions=True)
                tasks_by_zone.clear()
                break

            ext_wait = asyncio.create_task(self._phase_extend_event.wait())
            done, _ = await asyncio.wait(
                set(tasks_by_zone.values()) | {ext_wait},
                return_when=asyncio.FIRST_COMPLETED,
            )

            extension_signalled = ext_wait in done
            if not extension_signalled:
                ext_wait.cancel()
            with suppress(asyncio.CancelledError):
                await ext_wait

            if extension_signalled:
                self._phase_extend_event.clear()
                for zid in self._drain_mid_phase_extensions():
                    _launch(zid)

            for t in done:
                if t is ext_wait:
                    continue
                zid = next((z for z, ut in tasks_by_zone.items() if ut is t), None)
                if zid is None:
                    continue
                tasks_by_zone.pop(zid, None)
                await t

            await _sync_active()

        rs = self.coordinator.run_state
        rs.active_zone_ids = []
        await self.coordinator.async_update_run_state(rs)

    def _drain_mid_phase_extensions(self) -> list[str]:
        out = list(self._mid_phase_extensions)
        self._mid_phase_extensions.clear()
        return out

    def _manual_zone_already_scheduled(self, zone_id: str, rs: RunState) -> bool:
        """True if this zone is active, queued for mid-phase, tail list, or remaining phases."""
        if rs.run_state == RUN_STATE_PREPARING and zone_id in self._manual_zone_order:
            return True
        if zone_id in rs.active_zone_ids:
            return True
        if zone_id in self._after_phase_zone_order:
            return True
        if zone_id in self._mid_phase_extensions:
            return True
        for grp in self._phase_queue:
            if zone_id in grp:
                return True
        return False

    async def _wait_stop_or_skip(self) -> None:
        await asyncio.wait(
            [
                asyncio.create_task(self._stop_event.wait()),
                asyncio.create_task(self._skip_phase_event.wait()),
            ],
            return_when=asyncio.FIRST_COMPLETED,
        )

    async def _async_wait_zone_duration(self, timeout_sec: float) -> None:
        """Block until duration elapses, stop_all, or skip phase."""
        loop = asyncio.get_running_loop()
        deadline = loop.time() + timeout_sec
        while True:
            if self._stop_event.is_set():
                return
            if self._skip_phase_event.is_set():
                return
            remaining = deadline - loop.time()
            if remaining <= 0:
                return
            chunk = min(remaining, 1.0)
            try:
                await asyncio.wait_for(self._wait_stop_or_skip(), timeout=chunk)
            except TimeoutError:
                pass

    async def _async_zone_run(self, zone: Zone, duration_min: int) -> None:
        outputs = list(zone.switch_entity_ids)
        first = outputs[0] if outputs else ""
        self.hass.bus.async_fire(
            EVENT_ZONE_STARTED,
            {
                "zone_id": zone.zone_id,
                "entity_id": first,
                "entity_ids": outputs,
            },
        )
        await asyncio.gather(*(self._async_switch_turn_on(eid) for eid in outputs))
        await self._async_wait_zone_duration(duration_min * 60)
        await asyncio.gather(*(self._async_switch_turn_off(eid) for eid in outputs))
        now = dt_util.utcnow()
        rs = self.coordinator.run_state
        rs.last_run_per_zone[zone.zone_id] = now
        await self.coordinator.async_update_run_state(rs)
        self.hass.bus.async_fire(
            EVENT_ZONE_FINISHED,
            {
                "zone_id": zone.zone_id,
                "entity_id": first,
                "entity_ids": outputs,
            },
        )

    async def async_run_zone(self, zone_id: str, duration_min: int | None = None) -> None:
        """Manual run for one zone (pre-start delay, current mode duration, then all outputs off)."""
        inst = self.coordinator.installation
        zone = inst.zones.get(zone_id)
        if zone is None:
            raise ZoneManualRunError("unknown_zone", f"Unknown zone {zone_id}")
        if not zone.enabled:
            raise ZoneManualRunError("zone_disabled", "Zone is disabled")
        if not zone.switch_entity_ids:
            raise ZoneManualRunError("zone_no_outputs", "Zone has no outputs configured")

        mode = inst.mode
        dur = duration_min if duration_min is not None else zone.duration_for_mode(mode)

        async with self._run_lock:
            rs = self.coordinator.run_state

            if self.is_busy():
                if rs.run_state == RUN_STATE_STOPPING or not rs.manual_run:
                    raise ZoneManualRunError("busy", "Irrigation is already running")
                if self._manual_zone_already_scheduled(zone_id, rs):
                    raise ZoneManualRunError(
                        "zone_already_queued",
                        "Zone is already part of this irrigation run",
                    )
                self._duration_overrides[zone_id] = dur
                if rs.run_state == RUN_STATE_PREPARING:
                    self._manual_zone_order.append(zone_id)
                    self._phase_queue = compute_phases(
                        self._manual_zone_order,
                        inst.zones,
                        inst.max_parallel_zones,
                    )
                    rs.upcoming_phases = [list(g) for g in self._phase_queue]
                    await self.coordinator.async_update_run_state(rs)
                    return
                if rs.run_state == RUN_STATE_RUNNING:
                    active = list(rs.active_zone_ids)
                    if can_join_active_phase(
                        active,
                        zone_id,
                        inst.zones,
                        inst.max_parallel_zones,
                    ):
                        self._mid_phase_extensions.append(zone_id)
                        self._phase_extend_event.set()
                    else:
                        self._after_phase_zone_order.append(zone_id)
                        tail = compute_phases(
                            self._after_phase_zone_order,
                            inst.zones,
                            inst.max_parallel_zones,
                        )
                        rs.upcoming_phases = [list(g) for g in self._phase_queue] + [
                            list(g) for g in tail
                        ]
                        await self.coordinator.async_update_run_state(rs)
                    return
                raise ZoneManualRunError("busy", "Irrigation is already running")

            overrides = {zone_id: dur}
            self._duration_overrides = overrides
            self._manual_zone_order = [zone_id]
            self._phase_queue = compute_phases(
                self._manual_zone_order,
                inst.zones,
                inst.max_parallel_zones,
            )
            self._after_phase_zone_order.clear()
            self._mid_phase_extensions.clear()
            self._phase_extend_event.clear()
            self._stop_event.clear()
            self._skip_phase_event.clear()
            self._touched_entities.clear()
            self._task = self.hass.async_create_task(
                self._async_run_pipeline(scheduled=False, slot_ids=[]),
            )

    async def async_run_schedule_slot(self, slot_id: str) -> None:
        """Run one schedule slot now (same pipeline as “Run this slot now” in the panel)."""
        inst = self.coordinator.installation
        slot = next((s for s in inst.schedule_slots if s.slot_id == slot_id), None)
        if slot is None:
            raise ScheduleSlotRunError("unknown_slot", f"Unknown schedule slot {slot_id}")
        if not slot.zone_ids_ordered:
            raise ScheduleSlotRunError("empty_slot", "Schedule slot has no zones")
        phases = phases_for_slot(slot, inst.zones, inst.max_parallel_zones)
        if not phases:
            raise ScheduleSlotRunError("no_runnable_zones", "No enabled zones to run in this slot")
        if self.is_busy():
            raise ScheduleSlotRunError("busy", "Irrigation is already running")
        await self.async_run_phases(
            phases,
            scheduled=False,
            slot_ids=[slot.slot_id],
        )

    async def async_run_due_now(self) -> None:
        """Run phases for schedule slots that are due now (service)."""
        from .time_util import next_slot_fire_local

        inst = self.coordinator.installation
        tz = dt_util.get_time_zone(self.hass.config.time_zone)
        if tz is None:
            return
        now = dt_util.now()
        due_slots = []
        for slot in inst.schedule_slots:
            if not slot.enabled:
                continue
            nxt = next_slot_fire_local(
                now - timedelta(minutes=2),
                slot.weekday,
                slot.time_local,
                tz,
            )
            if nxt is None:
                continue
            if abs((now - nxt).total_seconds()) < 120:
                due_slots.append(slot)
        merged: list[list[str]] = []
        for slot in due_slots:
            merged.extend(phases_for_slot(slot, inst.zones, inst.max_parallel_zones))
        if merged:
            await self.async_run_phases(
                merged,
                scheduled=False,
                slot_ids=[s.slot_id for s in due_slots],
            )

    async def async_stop_all(self) -> None:
        """Signal stop and turn off outputs."""
        self._stop_event.set()
        if self._task and not self._task.done():
            try:
                await asyncio.wait_for(self._task, timeout=300)
            except TimeoutError:
                self._task.cancel()
        await self._async_turn_off_all_tracked()
        rs = self.coordinator.run_state
        rs.run_state = RUN_STATE_IDLE
        rs.active_zone_ids = []
        rs.last_error = None
        rs.upcoming_phases = []
        await self.coordinator.async_update_run_state(rs)

    async def async_skip_to_next_phase(self) -> bool:
        """End the current phase early (parallel zones stop) and run the next phase."""
        if not self.is_busy():
            return False
        self._skip_phase_event.set()
        return True

    async def _async_switch_turn_on(self, entity_id: str) -> None:
        self._touched_entities.add(entity_id)
        domain = entity_id.split(".")[0]
        await self.hass.services.async_call(
            domain,
            "turn_on",
            {"entity_id": entity_id},
            blocking=True,
        )

    async def _async_switch_turn_off(self, entity_id: str) -> None:
        domain = entity_id.split(".")[0]
        await self.hass.services.async_call(
            domain,
            "turn_off",
            {"entity_id": entity_id},
            blocking=True,
        )

    async def _async_turn_off_all_tracked(self) -> None:
        inst = self.coordinator.installation
        for entity_id in self._touched_entities:
            await self._async_switch_turn_off(entity_id)
        for entity_id in inst.pre_start_switches:
            if entity_id not in self._touched_entities:
                await self._async_switch_turn_off(entity_id)
        self._touched_entities.clear()
