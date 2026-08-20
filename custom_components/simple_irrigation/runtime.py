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
    DOMAIN,
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
    SCRIPT_DOMAIN,
)
from .grouping import can_join_active_phase, compute_phases
from .guards import guards_allow_run
from .models import RunState, ScheduleSlot, Zone
from .scheduler import phases_for_slot
from .scripts import ScriptCall, effective_post_run_script, effective_pre_start_script

if TYPE_CHECKING:
    from .coordinator import SimpleIrrigationCoordinator

_LOGGER = logging.getLogger(__name__)

# How long a duration-aware start service may take to acknowledge the run before
# the zone stops waiting on it. Generous — the call only has to reach the
# controller, not carry out the watering.
START_SERVICE_TIMEOUT_SEC = 30


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
        # Slots behind the current run; they may override the pipeline's scripts.
        self._run_slots: list[ScheduleSlot] = []

    async def async_setup(self) -> None:
        """Reset state on startup."""
        rs = self.coordinator.run_state
        # Unconditional: a leftover end time is meaningless in a fresh process, and
        # a run that was already in ERROR skips the branch below.
        rs.zone_ends_at = {}
        if rs.run_state not in (RUN_STATE_IDLE, RUN_STATE_ERROR):
            rs.run_state = RUN_STATE_ERROR
            rs.last_error = "Interrupted by Home Assistant restart"
            rs.active_zone_ids = []
            rs.queued_zone_ids = []
            rs.current_slot_id = None
            rs.upcoming_phases = []
            rs.phase_index = 0
            rs.active_script = None
            rs.active_script_started_at = None
            rs.active_script_timeout_sec = None
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
        self._run_slots = self._slots_for_ids(slot_ids)

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
            rs.phase_index = 0
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
                rs.phase_index += 1
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
            self._run_slots = []

    def _slots_for_ids(self, slot_ids: list[str]) -> list[ScheduleSlot]:
        """The run's slots, in the order they were merged into it."""
        by_id = {s.slot_id: s for s in self.coordinator.installation.schedule_slots}
        return [by_id[sid] for sid in slot_ids if sid in by_id]

    async def _async_finish_run(self, state: str, error: str | None) -> None:
        rs = self.coordinator.run_state
        rs.run_state = RUN_STATE_STOPPING
        await self.coordinator.async_update_run_state(rs)

        await self._async_turn_off_all_tracked()
        await self._async_post_run()

        rs.run_state = state
        rs.active_zone_ids = []
        rs.queued_zone_ids = []
        rs.current_slot_id = None
        rs.manual_run = False
        rs.upcoming_phases = []
        rs.phase_index = 0
        rs.active_script = None
        rs.active_script_started_at = None
        rs.active_script_timeout_sec = None
        rs.zone_ends_at = {}
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
        await self._async_run_script(
            effective_pre_start_script(inst, self._run_slots),
            "Pre-start",
            abort_on_stop=True,
        )
        if self._stop_event.is_set():
            return
        if not inst.pre_start_switches:
            # The delay exists to give a pump time to build pressure. With no
            # pre-start outputs nothing is coming up, so waiting would only push
            # every zone past its scheduled minute -- the pre-start script has
            # already run to completion by here.
            return
        for entity_id in inst.pre_start_switches:
            await self._async_switch_turn_on(entity_id)
        await self._async_sleep_interruptible(float(delay_sec))

    async def _async_post_run(self) -> None:
        """Run the post-run script once every output is off again.

        Whatever the pre-start script prepared usually has to be undone: release
        the mower, reopen the window. So this runs after *every* pipeline end —
        finished, failed or stopped — and is deliberately **not** aborted by the
        stop event, which is already set when the user pressed Stop All.
        """
        await self._async_run_script(
            effective_post_run_script(self.coordinator.installation, self._run_slots),
            "Post-run",
            abort_on_stop=False,
        )

    async def _async_run_script(
        self,
        script: ScriptCall,
        kind: str,
        *,
        abort_on_stop: bool,
    ) -> None:
        """Run one pipeline script to completion.

        Calling ``script.<object_id>`` rather than ``script.turn_on`` is what makes
        this block, so the script may wait for the world to be ready — a mower
        docking, a window closing — instead of only kicking something off.

        Fail-open, like the conditions in guards.py: a script that errors or
        overruns its timeout logs a warning and the run proceeds. A stuck helper
        must not cost a whole irrigation run.
        """
        entity_id = script.entity_id
        if not entity_id:
            return
        domain, _, object_id = entity_id.partition(".")
        if domain != SCRIPT_DOMAIN or not object_id:
            _LOGGER.warning("%s script %s is not a script entity; skipping", kind, entity_id)
            return

        timeout = max(1, int(script.timeout_sec))
        _LOGGER.debug("%s script %s: waiting up to %s s", kind, entity_id, timeout)
        await self._async_publish_active_script(entity_id, timeout)
        call = self.hass.async_create_task(
            self.hass.services.async_call(SCRIPT_DOMAIN, object_id, {}, blocking=True),
            f"{DOMAIN} {kind} script {entity_id}",
        )
        waiters: set[asyncio.Task] = {call}
        stop: asyncio.Task | None = None
        if abort_on_stop:
            stop = self.hass.async_create_task(self._stop_event.wait())
            waiters.add(stop)
        try:
            done, _pending = await asyncio.wait(
                waiters,
                timeout=timeout,
                return_when=asyncio.FIRST_COMPLETED,
            )
            if call in done:
                call.result()  # surface script errors to the handler below
                return
            if stop is not None and stop in done:
                _LOGGER.info("%s script %s aborted: run was stopped", kind, entity_id)
            else:
                _LOGGER.warning(
                    "%s script %s did not finish within %s s; continuing anyway",
                    kind,
                    entity_id,
                    timeout,
                )
            await self._async_script_turn_off(entity_id)
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("%s script %s failed (%s); continuing anyway", kind, entity_id, err)
        finally:
            for task in waiters:
                if not task.done():
                    task.cancel()
            await self._async_publish_active_script(None)

    async def _async_publish_active_script(
        self, entity_id: str | None, timeout_sec: int | None = None
    ) -> None:
        """Show in the panel which script the run is waiting for (None clears it).

        ``timeout_sec`` plus the start stamp let the card draw a real progress bar
        rather than an open-ended "preparing".
        """
        rs = self.coordinator.run_state
        if rs.active_script == entity_id:
            return
        rs.active_script = entity_id
        rs.active_script_started_at = dt_util.utcnow() if entity_id else None
        rs.active_script_timeout_sec = timeout_sec if entity_id else None
        await self.coordinator.async_update_run_state(rs)

    async def _async_script_turn_off(self, entity_id: str) -> None:
        """Stop a pipeline script we gave up on; leaving it running is worse."""
        with suppress(Exception):
            await self.hass.services.async_call(
                SCRIPT_DOMAIN,
                "turn_off",
                {"entity_id": entity_id},
                blocking=False,
            )

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
        # asyncio.wait() leaves the loser running, and cancelling the caller does
        # not reach these either -- both would be left pending once per second of
        # every zone run. Clean them up on the way out.
        waiters = [
            asyncio.create_task(self._stop_event.wait()),
            asyncio.create_task(self._skip_phase_event.wait()),
        ]
        try:
            await asyncio.wait(waiters, return_when=asyncio.FIRST_COMPLETED)
        finally:
            for waiter in waiters:
                waiter.cancel()

    async def _async_wait_zone_duration(self, timeout_sec: float, zone_id: str = "") -> None:
        """Block until duration elapses, stop_all, or skip phase.

        Both zone run paths funnel through here, so this is where the planned end
        of the zone is published — the countdown a dashboard shows is exactly the
        deadline this loop is waiting on, not an estimate computed elsewhere.
        """
        loop = asyncio.get_running_loop()
        deadline = loop.time() + timeout_sec
        if zone_id:
            await self._async_publish_zone_end(zone_id, timeout_sec)
        try:
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
        finally:
            # Drop the end time without awaiting: stop_all() cancels this task, and
            # an await in the finally of a cancelled task raises straight away. The
            # cleared dict is pushed out by the caller's run state update, by
            # _sync_active() in the phase loop, or by async_stop_all().
            if zone_id:
                self.coordinator.run_state.zone_ends_at.pop(zone_id, None)

    async def _async_publish_zone_end(self, zone_id: str, timeout_sec: float) -> None:
        """Record when this zone is planned to finish and notify listeners."""
        rs = self.coordinator.run_state
        rs.zone_ends_at[zone_id] = dt_util.utcnow() + timedelta(seconds=timeout_sec)
        await self.coordinator.async_update_run_state(rs)

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
        handled_by_service = await self._async_zone_run_with_duration_service(
            zone,
            duration_min,
        )
        if not handled_by_service:
            await asyncio.gather(*(self._async_switch_turn_on(eid) for eid in outputs))
            await self._async_wait_zone_duration(duration_min * 60, zone.zone_id)
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

    async def _async_zone_run_with_duration_service(
        self,
        zone: Zone,
        duration_min: int,
    ) -> bool:
        """Run a zone via an integration-specific service carrying duration.

        Returns True when the custom path handled the complete zone runtime,
        False when zone has no service configuration and should use the default
        output turn_on/turn_off path.
        """
        service_ref = zone.start_service.strip()
        duration_field = zone.duration_field.strip()
        duration_unit = zone.duration_unit.strip()
        if not service_ref or not duration_field or not duration_unit:
            return False

        domain, sep, service = service_ref.partition(".")
        if not sep or not domain or not service:
            _LOGGER.warning(
                "Zone %s has invalid start service '%s'; using default output start",
                zone.zone_id,
                service_ref,
            )
            return False

        outputs = list(zone.switch_entity_ids)
        if not outputs:
            return False

        if duration_unit == "minutes":
            duration_value = duration_min
        elif duration_unit == "seconds":
            duration_value = duration_min * 60
        else:
            _LOGGER.warning(
                "Zone %s has unknown duration unit '%s'; using default output start",
                zone.zone_id,
                duration_unit,
            )
            return False

        async def _start_target(target_entity_id: str) -> None:
            service_data = {
                "entity_id": target_entity_id,
                duration_field: duration_value,
            }
            # blocking=True so a ServiceNotFound or a rejected call still fails the
            # run. A start service is expected to return once the controller has
            # accepted the job — but a script entered as a custom start service may
            # block for the whole watering time, which would park the zone inside
            # this call: the duration wait would never start and stop_all() would
            # hang on it. Bound the wait and carry on instead.
            try:
                async with asyncio.timeout(START_SERVICE_TIMEOUT_SEC):
                    await self.hass.services.async_call(
                        domain,
                        service,
                        service_data,
                        blocking=True,
                    )
            except TimeoutError:
                _LOGGER.warning(
                    "Zone %s: start service %s did not return within %s s; "
                    "continuing with the configured duration. A start service must "
                    "return once the run has started, not run for its duration",
                    zone.zone_id,
                    service_ref,
                    START_SERVICE_TIMEOUT_SEC,
                )

        # The start service either addresses the outputs directly, or a separate
        # entity of the same zone (Hydrawise starts via its `binary_sensor`).
        # Either way the outputs are what actually carries the water, so they are
        # tracked and closed again — see _async_turn_off_all_tracked().
        explicit_target = zone.start_entity_id.strip()
        targets = [explicit_target] if explicit_target else outputs

        await asyncio.gather(*(_start_target(eid) for eid in targets))
        self._touched_entities.update(outputs)
        await self._async_wait_zone_duration(duration_min * 60, zone.zone_id)
        await asyncio.gather(*(self._async_switch_turn_off(eid) for eid in outputs))
        return True

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
        from .time_util import next_slot_fire_local_any

        inst = self.coordinator.installation
        tz = dt_util.get_time_zone(self.hass.config.time_zone)
        if tz is None:
            return
        now = dt_util.now()
        due_slots = []
        for slot in inst.schedule_slots:
            if not slot.enabled:
                continue
            nxt = next_slot_fire_local_any(
                now - timedelta(minutes=2),
                slot.weekdays,
                slot.time_local,
                tz,
                slot.week_parity,
            )
            if nxt is None:
                continue
            if abs((now - nxt).total_seconds()) < 120:
                if guards_allow_run(self.hass, inst, slot):
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
        rs.phase_index = 0
        rs.active_script = None
        rs.active_script_started_at = None
        rs.active_script_timeout_sec = None
        rs.zone_ends_at = {}
        await self.coordinator.async_update_run_state(rs)

    async def async_skip_to_next_phase(self) -> bool:
        """End the current phase early (parallel zones stop) and run the next phase."""
        if not self.is_busy():
            return False
        self._skip_phase_event.set()
        return True

    async def _async_switch_turn_on(self, entity_id: str) -> None:
        from .const import OUTPUT_DOMAIN_SERVICES
        
        self._touched_entities.add(entity_id)
        domain = entity_id.split(".")[0]
        
        if domain in OUTPUT_DOMAIN_SERVICES:
            service_on, _service_off = OUTPUT_DOMAIN_SERVICES[domain]
            await self.hass.services.async_call(
                domain,
                service_on,
                {"entity_id": entity_id},
                blocking=True,
            )
        else:
            await self.hass.services.async_call(
                domain,
                "turn_on",
                {"entity_id": entity_id},
                blocking=True,
            )

    async def _async_switch_turn_off(self, entity_id: str) -> None:
        from .const import OUTPUT_DOMAIN_SERVICES

        domain = entity_id.split(".")[0]

        if domain in OUTPUT_DOMAIN_SERVICES:
            _service_on, service_off = OUTPUT_DOMAIN_SERVICES[domain]
            await self.hass.services.async_call(
                domain,
                service_off,
                {"entity_id": entity_id},
                blocking=True,
            )
        else:
            await self.hass.services.async_call(
                domain,
                "turn_off",
                {"entity_id": entity_id},
                blocking=True,
            )

    async def _async_turn_off_all_tracked(self) -> None:
        """Close everything this run touched. Never raises.

        This is the cleanup path — it runs from _async_finish_run() and from
        async_stop_all(). A raise here would skip the remaining outputs and leave
        run_state stuck on "stopping", which is_busy() reports as busy, so the
        integration would refuse every further run until Home Assistant restarts.
        Failures are collected into last_error instead.
        """
        inst = self.coordinator.installation
        pending = list(self._touched_entities) + [
            eid for eid in inst.pre_start_switches if eid not in self._touched_entities
        ]
        failed: list[str] = []
        for entity_id in pending:
            try:
                await self._async_switch_turn_off(entity_id)
            except Exception:  # noqa: BLE001 - one bad output must not strand the rest
                _LOGGER.exception("Could not turn off %s during cleanup", entity_id)
                failed.append(entity_id)
        self._touched_entities.clear()
        if failed:
            self.coordinator.run_state.last_error = (
                f"Could not turn off: {', '.join(failed)}"
            )
