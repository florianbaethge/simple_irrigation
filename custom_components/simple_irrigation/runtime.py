"""Run irrigation phases: pre-start switches, zone timers, stop."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from contextlib import suppress
from collections.abc import Callable
from typing import TYPE_CHECKING

from homeassistant.exceptions import HomeAssistantError
from homeassistant.core import CALLBACK_TYPE, HomeAssistant
from homeassistant.helpers.start import async_at_started
from homeassistant.util import dt as dt_util

from .const import (
    DOMAIN,
    EVENT_RUN_FAILED,
    EVENT_RUN_FINISHED,
    EVENT_RUN_STARTED,
    EVENT_ZONE_FINISHED,
    EVENT_ZONE_STARTED,
    MAX_WAITING_RUNS,
    RUN_STATE_ERROR,
    RUN_STATE_IDLE,
    RUN_STATE_PREPARING,
    RUN_STATE_RUNNING,
    RUN_STATE_STOPPING,
    SCRIPT_DOMAIN,
    SKIP_BUSY,
    SKIP_CONDITIONS,
    SKIP_ERROR,
    SKIP_EXPIRED,
    SKIP_PAUSED,
    SKIP_QUEUE_FULL,
    SKIP_STOPPED,
)
from .countdown import async_set_countdown, clear_value, countdown_value
from .grouping import can_join_active_phase, compute_phases
from .guards import guards_allow_run
from .models import RunState, ScheduleSlot, WaitingRun, Zone
from .program import Phase, RunStep, Soak, phase_slot_id, watering_steps
from .scheduler import (
    phases_for_slot,
    program_for_slot,
    program_for_slots,
    report_schedule_skipped,
)
from .season import next_slot_fire
from .scripts import ScriptCall, effective_post_run_script, effective_pre_start_script
from .water import (
    SOURCE_ESTIMATED,
    SOURCE_MEASURED,
    estimated_litres,
    meter_delta,
    meter_litres,
)

if TYPE_CHECKING:
    from .coordinator import SimpleIrrigationCoordinator

_LOGGER = logging.getLogger(__name__)

# How long a duration-aware start service may take to acknowledge the run before
# the zone stops waiting on it. Generous — the call only has to reach the
# controller, not carry out the watering.
START_SERVICE_TIMEOUT_SEC = 30

# How long closing the outputs may hold up Home Assistant's own shutdown.
SHUTDOWN_CLOSE_TIMEOUT_SEC = 20


def _copy_steps(steps: list[RunStep]) -> list[RunStep]:
    """A queue of our own: phases are copied, soaks are immutable already."""
    return [
        step if isinstance(step, Soak) else Phase(step, phase_slot_id(step)) for step in steps
    ]


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


class ZoneStopError(HomeAssistantError):
    """A single zone cannot be stopped; ``code`` is used by the panel HTTP API."""

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
        # Hardware countdowns armed for this run; cleared once their valve is shut.
        self._armed_countdowns: set[str] = set()
        # Outputs a clean-up could not close. Every later clean-up tries them
        # again, and for as long as one is left the run has not ended cleanly.
        self._unclosed: set[str] = set()
        # Supply outputs this run has opened, and how many watering zones need
        # each of them. One that nobody needs any more is closed -- unless the
        # next phase is about to ask for it again.
        self._open_supplies: set[str] = set()
        self._supply_refs: dict[str, int] = {}
        self._duration_overrides: dict[str, int] = {}
        # What the run still has ahead of it: phases (zone ids watering in
        # parallel) and, with Cycle & Soak, the rests between them.
        self._phase_queue: list[RunStep] = []
        self._manual_zone_order: list[str] = []
        self._after_phase_zone_order: list[str] = []
        self._mid_phase_extensions: list[str] = []
        self._phase_extend_event = asyncio.Event()
        # Zones asked to end early while watering (stop_zone). The zone's wait
        # loop polls this once a second, the rest of the run is not touched.
        self._zone_stop_requests: set[str] = set()
        # Slots behind the current run; they may override the pipeline's scripts.
        self._run_slots: list[ScheduleSlot] = []
        # The supply-line meter's reading when the run began, if there is one.
        self._run_meter_start: float | None = None
        # Zones a run was watering when Home Assistant went down under it.
        self._interrupted_zone_ids: list[str] = []
        self._unsub_started: CALLBACK_TYPE | None = None
        # Schedules waiting for their turn live in run_state.waiting_runs. One
        # of them is started at a time, and none while Stop is being carried out.
        self._waiting_lock = asyncio.Lock()
        self._stopping_all = 0
        # Home Assistant is going down: nothing starts any more.
        self._shutting_down = False
        # A run was cut off by a restart; what it may have left open is closed.
        self._interrupted = False
        # What each watering zone took of its supply, and how long that trails:
        # released as it was taken, whatever the zone is set to by then.
        self._zone_supplies: dict[str, tuple[list[str], int]] = {}
        # Zones of the phase whose supply is coming up; not open yet, but
        # already there for Stop zone to find.
        self._leading_zone_ids: set[str] = set()

    async def async_setup(self) -> None:
        """Reset state on startup and shut what an interrupted run left open."""
        rs = self.coordinator.run_state
        # Unconditional: a leftover end time is meaningless in a fresh process, and
        # a run that was already in ERROR skips the branch below.
        rs.zone_ends_at = {}
        rs.zone_started_at = {}
        rs.soak_until = None
        if rs.run_state not in (RUN_STATE_IDLE, RUN_STATE_ERROR):
            rs.run_state = RUN_STATE_ERROR
            rs.last_error = "Interrupted by Home Assistant restart"
            self._interrupted = True
            self._interrupted_zone_ids = list(rs.active_zone_ids)
            rs.active_zone_ids = []
            rs.queued_zone_ids = []
            rs.current_slot_id = None
            rs.upcoming_phases = []
            rs.phase_index = 0
            rs.active_script = None
            rs.active_script_started_at = None
            rs.active_script_timeout_sec = None
            await self.coordinator.async_update_run_state(rs)
        started = bool(self.hass.is_running)
        await self._async_close_after_interruption(final=started)
        if not started:
            # While Home Assistant starts, the integration behind a valve may not
            # be loaded yet, and a call to it goes nowhere. Once more when all are.
            self._unsub_started = async_at_started(self.hass, self._async_close_once_started)

    async def _async_close_once_started(self, _hass: HomeAssistant) -> None:
        self._unsub_started = None
        await self._async_close_after_interruption(final=True)

    async def _async_close_after_interruption(self, *, final: bool) -> None:
        """Shut the pre-start outputs and the zones a run was cut off in. Never raises.

        A fresh process has opened nothing, so anything open is left over. Only
        outputs of zones on record as watering are touched -- a valve somebody
        opened by hand is none of our business.
        """
        inst = self.coordinator.installation
        zones = [inst.zones[zid] for zid in self._interrupted_zone_ids if zid in inst.zones]
        # Downstream first: the zones, what supplies them, the pre-start outputs.
        # A run that began in the meantime keeps what it holds.
        outputs = [eid for zone in zones for eid in zone.switch_entity_ids]
        if self._interrupted:
            # Every supply, not only that of the zones on record: one that was
            # still coming up, or trailing behind a zone that had closed, has
            # no zone to its name.
            outputs.extend(
                eid for zone in inst.zones.values() for eid in zone.supply_entity_ids
            )
        if not self.is_busy():
            outputs.extend(inst.pre_start_switches)
        failed: list[str] = []
        for entity_id in dict.fromkeys(outputs):
            if entity_id in self._touched_entities:
                continue
            try:
                await self._async_switch_turn_off(entity_id)
            except Exception:  # noqa: BLE001 - one bad output must not strand the rest
                failed.append(entity_id)
        if not final:
            return
        self._interrupted = False
        self._interrupted_zone_ids = []
        for zone in zones:
            countdown = zone.countdown_entity_id.strip()
            if countdown and countdown not in self._armed_countdowns:
                self._armed_countdowns.add(countdown)
                await self._async_disarm_countdown(countdown)
        if failed:
            _LOGGER.error("Could not turn off after a restart: %s", ", ".join(failed))
            rs = self.coordinator.run_state
            rs.last_error = f"Could not turn off: {', '.join(failed)}"
            await self.coordinator.async_update_run_state(rs)

    async def async_close_for_shutdown(self) -> None:
        """Home Assistant is stopping: end the run and shut its outputs.

        Integrations stop side by side, so the one behind a valve may be gone
        before the call reaches it. The run therefore stays on record as cut
        off, and the next start closes the same outputs once more.
        """
        busy = self.is_busy()
        # From here on nothing starts: a schedule coming due while Home
        # Assistant winds down would open a valve nobody is left to close.
        self._shutting_down = True
        self._drop_waiting(SKIP_STOPPED)
        if not busy:
            return
        rs = self.coordinator.run_state
        state, watering = rs.run_state, list(rs.active_zone_ids)
        try:
            await asyncio.wait_for(self.async_stop_all(), SHUTDOWN_CLOSE_TIMEOUT_SEC)
        except TimeoutError:
            # The run is stuck somewhere, a script most likely. Close without it.
            _LOGGER.warning("Run did not stop in time for shutdown; closing its outputs")
            with suppress(TimeoutError):
                await asyncio.wait_for(
                    self._async_turn_off_all_tracked(), SHUTDOWN_CLOSE_TIMEOUT_SEC
                )
        rs.run_state = state
        rs.active_zone_ids = watering
        # Straight to the store: entities need not hear of a run that is over.
        await self.coordinator.store.async_save()

    async def async_shutdown(self) -> None:
        """Cancel running task."""
        if self._unsub_started is not None:
            self._unsub_started()
            self._unsub_started = None
        await self.async_stop_all()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    def is_busy(self) -> bool:
        """Return True if a run is active, or none may start any more."""
        rs = self.coordinator.run_state
        return self._shutting_down or rs.run_state in (
            RUN_STATE_PREPARING,
            RUN_STATE_RUNNING,
            RUN_STATE_STOPPING,
        )

    async def async_run_phases(
        self,
        phases: list[RunStep],
        *,
        scheduled: bool,
        slot_ids: list[str] | None = None,
        duration_overrides: dict[str, int] | None = None,
    ) -> bool:
        """Start a background run of these phases; False if it could not start."""
        if not phases:
            return False
        async with self._run_lock:
            if self.is_busy():
                _LOGGER.warning("Run skipped: already busy")
                return False
            self._duration_overrides = dict(duration_overrides or {})
            self._phase_queue = _copy_steps(phases)
            self._manual_zone_order.clear()
            self._after_phase_zone_order.clear()
            self._mid_phase_extensions.clear()
            self._phase_extend_event.clear()
            self._stop_event.clear()
            self._skip_phase_event.clear()
            self._touched_entities.clear()
            self._forget_supplies()
            self._launch(scheduled, slot_ids or [])
            return True

    def _launch(self, scheduled: bool, slot_ids: list[str]) -> None:
        """Hand the prepared run to its task.

        Busy from this line on, not from the task's first step: two starts in
        the same moment -- a waiting schedule and a tap on the card -- must not
        both find the installation idle.
        """
        rs = self.coordinator.run_state
        rs.run_state = RUN_STATE_PREPARING
        rs.manual_run = not scheduled
        self._task = self.hass.async_create_task(
            self._async_run_pipeline(scheduled, slot_ids),
        )

    async def _async_run_pipeline(self, scheduled: bool, slot_ids: list[str]) -> None:
        """Run one pipeline, then let the next waiting schedule have its turn.

        Only once the pipeline is through its ``finally``: that clears the phase
        queue, which the next run has just been given.
        """
        await self._async_run_pipeline_once(scheduled, slot_ids)
        rs = self.coordinator.run_state
        if not rs.waiting_runs or self._stopping_all:
            return
        try:
            if rs.run_state == RUN_STATE_ERROR:
                # Watering on as if nothing had happened would bury the error.
                self._drop_waiting(SKIP_ERROR)
                await self.coordinator.async_update_run_state(rs)
                return
            await self._async_start_next_waiting()
        except Exception:  # noqa: BLE001 - the run that just ended is not at fault
            _LOGGER.exception("Could not start the next waiting schedule")

    async def _async_run_pipeline_once(
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
            self._zone_stop_requests.clear()

            rs.run_state = RUN_STATE_PREPARING
            rs.manual_run = not scheduled
            rs.current_slot_id = slot_ids[0] if slot_ids else None
            rs.current_run_started_at = dt_util.utcnow()
            rs.run_water_l = None
            rs.run_water_source = ""
            self._run_meter_start = meter_litres(self.hass, inst.water_meter_entity_id)
            # active_zone_ids empty until first phase; upcoming = phases not yet started.
            rs.upcoming_phases = watering_steps(self._phase_queue)
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
            rs.upcoming_phases = watering_steps(self._phase_queue)
            await self.coordinator.async_update_run_state(rs)

            # The phase before this step watered nothing.
            dry = False
            while True:
                if self._stop_event.is_set():
                    break

                if not self._phase_queue and self._after_phase_zone_order:
                    self._phase_queue = list(
                        compute_phases(
                            self._after_phase_zone_order,
                            inst.zones,
                            inst.max_parallel_zones,
                        )
                    )
                    self._after_phase_zone_order.clear()

                if not self._phase_queue:
                    break

                # Still set here when Skip phase ended the previous step.
                skipped = self._skip_phase_event.is_set() or dry
                dry = False
                self._skip_phase_event.clear()
                step = self._phase_queue.pop(0)
                rs = self.coordinator.run_state
                rs.upcoming_phases = watering_steps(self._phase_queue)
                if isinstance(step, Soak):
                    # A skipped phase takes the rest after it along -- whoever
                    # skips wants to see the next zone, not a pause. So does a
                    # phase that watered nothing: there is nothing to soak in.
                    # And a rest with nothing left to water behind it is pointless.
                    if skipped or not self._watering_ahead():
                        await self.coordinator.async_update_run_state(rs)
                        continue
                    await self._async_soak(step.seconds)
                    continue
                if not self._phase_waters(step, inst.mode):
                    # Every zone at 0 minutes, or switched off: not a phase at all.
                    dry = True
                    await self.coordinator.async_update_run_state(rs)
                    continue
                rs.phase_index += 1
                await self.coordinator.async_update_run_state(rs)
                await self._async_run_phase_expandable(step, inst.mode)

            await self._async_finish_run(RUN_STATE_IDLE, error=None)

        except Exception as err:  # noqa: BLE001
            _LOGGER.exception("Irrigation run failed: %s", err)
            self.hass.bus.async_fire(
                EVENT_RUN_FAILED,
                {"error": str(err)},
            )
            try:
                await self._async_finish_run(RUN_STATE_ERROR, error=str(err))
            except Exception:  # noqa: BLE001 - never leave the run on "stopping"
                # The clean-up failed as well. Stuck on "stopping" the
                # installation would refuse every run until a restart.
                _LOGGER.exception("Cleaning up after the failed run failed too")
                self._clear_run()
                self._settle(RUN_STATE_ERROR, str(err))
                with suppress(Exception):
                    await self.coordinator.async_update_run_state(rs)
        finally:
            # A run that got as far as its end has cleared up already, and the
            # next one may be under way. Only a run cut off before that -- its
            # task cancelled -- still has to, and no run can have followed it.
            if self.coordinator.run_state.run_state in (
                RUN_STATE_PREPARING,
                RUN_STATE_RUNNING,
                RUN_STATE_STOPPING,
            ) and self._task in (None, asyncio.current_task()):
                self._clear_run()

    def _slot_by_id(self, slot_id: str | None) -> ScheduleSlot | None:
        if slot_id is None:
            return None
        slots = self.coordinator.installation.schedule_slots
        return next((s for s in slots if s.slot_id == slot_id), None)

    def _zone_minutes(self, zone: Zone, mode: str, slot_id: str | None) -> int:
        """How long ``zone`` waters now: a manual duration, its slot's fixed minutes, the mode."""
        override = self._duration_overrides.get(zone.zone_id)
        if override is not None:
            return override
        slot = self._slot_by_id(slot_id)
        return slot.duration_for(zone, mode) if slot else zone.duration_for_mode(mode)

    # --- waiting schedules ----------------------------------------------------

    def has_waiting(self) -> bool:
        """Whether a schedule is waiting for its turn."""
        return bool(self.coordinator.run_state.waiting_runs)

    async def async_wait_or_skip(self, slots: list[ScheduleSlot], due_at: datetime) -> None:
        """Schedules came due while something else is running.

        They take their turn behind it if the installation lets schedules wait,
        and are reported as skipped otherwise. One that is running right now or
        waiting already is not lined up a second time.
        """
        inst = self.coordinator.installation
        rs = self.coordinator.run_state
        refused: str | None = None
        if self._stopping_all or self._shutting_down:
            refused = SKIP_STOPPED
        elif self.is_busy() and not inst.wait_when_busy:
            refused = SKIP_BUSY
        elif len(rs.waiting_runs) >= MAX_WAITING_RUNS:
            refused = SKIP_QUEUE_FULL
        taken = {slot.slot_id for slot in self._run_slots}
        taken.update(slot_id for run in rs.waiting_runs for slot_id in run.slot_ids)
        fresh: list[ScheduleSlot] = []
        for slot in slots:
            if refused is None and slot.slot_id not in taken:
                fresh.append(slot)
            else:
                report_schedule_skipped(self.hass, slot, due_at, refused or SKIP_BUSY)
        if not fresh:
            return
        rs.waiting_runs.append(WaitingRun([slot.slot_id for slot in fresh], due_at))
        _LOGGER.info(
            "Waiting for the current run to finish: %s",
            ", ".join(slot.name or slot.slot_id for slot in fresh),
        )
        await self.coordinator.async_update_run_state(rs)
        await self._async_start_next_waiting()

    def _drop_waiting(self, reason: str) -> None:
        """Nobody waits any more; each schedule is reported as skipped."""
        rs = self.coordinator.run_state
        for run in rs.waiting_runs:
            for slot_id in run.slot_ids:
                slot = self._slot_by_id(slot_id)
                if slot is not None:
                    report_schedule_skipped(self.hass, slot, run.due_at, reason)
        rs.waiting_runs = []

    def _still_due(self, run: WaitingRun) -> list[ScheduleSlot]:
        """The schedules of a waiting run that may start now.

        Its turn has come, and everything that would have kept it from running
        at its own time is looked at again: a pause, a switch, a condition. On
        top of that it must not have waited longer than the installation allows.
        """
        inst = self.coordinator.installation
        dropped: str | None = None
        pause_until = inst.pause_until
        if not inst.enabled or (pause_until is not None and dt_util.now() < pause_until):
            dropped = SKIP_PAUSED
        elif dt_util.utcnow() - run.due_at > timedelta(minutes=inst.wait_max_min):
            dropped = SKIP_EXPIRED
        due: list[ScheduleSlot] = []
        for slot_id in run.slot_ids:
            slot = self._slot_by_id(slot_id)
            if slot is None:
                continue
            reason = dropped
            if reason is None and not slot.enabled:
                reason = SKIP_PAUSED
            if reason is None and not guards_allow_run(self.hass, inst, slot):
                reason = SKIP_CONDITIONS
            if reason is None:
                due.append(slot)
            else:
                report_schedule_skipped(self.hass, slot, run.due_at, reason)
        return due

    async def _async_start_next_waiting(self) -> None:
        """Start the schedule that has waited longest, if nothing is in its way."""
        async with self._waiting_lock:
            rs = self.coordinator.run_state
            changed = False
            try:
                while rs.waiting_runs and not self.is_busy() and not self._stopping_all:
                    slots = self._still_due(rs.waiting_runs[0])
                    steps = program_for_slots(slots, self.coordinator.installation)
                    if steps and not await self.async_run_phases(
                        steps,
                        scheduled=True,
                        slot_ids=[slot.slot_id for slot in slots],
                    ):
                        # Somebody got in between; our turn comes after theirs.
                        return
                    rs.waiting_runs.pop(0)
                    changed = True
                    if steps:
                        return
            finally:
                if changed:
                    await self.coordinator.async_update_run_state(rs)

    # --- supply ---------------------------------------------------------------

    def _forget_supplies(self) -> None:
        self._open_supplies.clear()
        self._supply_refs.clear()
        self._zone_supplies.clear()
        self._leading_zone_ids.clear()

    async def _async_open_supplies(self, zones: list[Zone]) -> None:
        """Bring up what these zones need, then give it its lead time.

        A supply that is open already -- another zone has it, or the last phase
        handed it over -- is neither switched nor waited for.
        """
        inst = self.coordinator.installation
        lead = 0
        for zone in zones:
            opened = False
            # Released as taken: the zone may be saved differently, or deleted,
            # before it is done.
            self._zone_supplies[zone.zone_id] = (
                list(zone.supply_entity_ids),
                zone.supply_trail_sec,
            )
            for entity_id in zone.supply_entity_ids:
                self._supply_refs[entity_id] = self._supply_refs.get(entity_id, 0) + 1
                if entity_id not in self._open_supplies:
                    self._open_supplies.add(entity_id)
                    await self._async_switch_turn_on(entity_id)
                    opened = True
            if opened:
                own = zone.supply_lead_sec
                lead = max(lead, inst.pre_start_delay_sec if own is None else own)
        await self._async_sleep_interruptible(float(lead))

    async def _async_release_supplies(self, zone_id: str, keep: frozenset[str]) -> None:
        """A zone has closed: let go of what it took, after its trail time.

        The trail only runs when something is really about to close. Stop and
        Skip phase cut it short.
        """
        taken, trail_sec = self._zone_supplies.pop(zone_id, ([], 0))
        held = [e for e in taken if self._supply_refs.get(e, 0) > 0]
        if any(self._supply_refs[e] == 1 and e not in keep for e in held):
            await self._async_sleep_interruptible(float(trail_sec))
        for entity_id in held:
            self._supply_refs[entity_id] -= 1
        await self._async_close_idle_supplies(keep)

    async def _async_close_idle_supplies(self, keep: frozenset[str] = frozenset()) -> None:
        """Close every supply no watering zone needs, except what ``keep`` names."""
        inst = self.coordinator.installation
        # Not ours to close, whatever the configuration says: an output the
        # whole run keeps on, and the valve of a zone that is watering.
        busy = set(inst.pre_start_switches)
        for zone_id in self.coordinator.run_state.active_zone_ids:
            zone = inst.zones.get(zone_id)
            if zone is not None:
                busy.update(zone.switch_entity_ids)
        for entity_id in sorted(self._open_supplies):
            if self._supply_refs.get(entity_id, 0) > 0 or entity_id in keep:
                continue
            self._open_supplies.discard(entity_id)
            if entity_id not in busy:
                await self._async_switch_turn_off(entity_id)

    def _supplies_needed_next(self, mode: str) -> frozenset[str]:
        """What the next phase that waters needs; nothing across a rest."""
        inst = self.coordinator.installation
        passed_dry = False
        for step in self._phase_queue:
            if isinstance(step, Soak):
                if passed_dry:
                    # The rest behind a phase that waters nothing is left out.
                    continue
                return frozenset()
            if not self._phase_waters(step, mode):
                passed_dry = True
                continue
            slot_id = phase_slot_id(step)
            return frozenset(
                entity_id
                for zone_id in step
                if (zone := inst.zones.get(zone_id)) is not None
                and zone.enabled
                and self._zone_minutes(zone, mode, slot_id) > 0
                for entity_id in zone.supply_entity_ids
            )
        return frozenset()

    def _slots_for_ids(self, slot_ids: list[str]) -> list[ScheduleSlot]:
        """The run's slots, in the order they were merged into it."""
        by_id = {s.slot_id: s for s in self.coordinator.installation.schedule_slots}
        return [by_id[sid] for sid in slot_ids if sid in by_id]

    def _clear_run(self) -> None:
        """Forget what belonged to the run that is ending."""
        self._duration_overrides.clear()
        self._manual_zone_order.clear()
        self._after_phase_zone_order.clear()
        self._mid_phase_extensions.clear()
        self._phase_queue.clear()
        self._zone_stop_requests.clear()
        self._run_slots = []

    def _settle(self, state: str, error: str | None) -> None:
        """The run is over: ``state`` it ends in, and nothing left of it on show."""
        rs = self.coordinator.run_state
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
        rs.zone_started_at = {}
        rs.soak_until = None
        if error:
            rs.last_error = error
        elif state == RUN_STATE_IDLE:
            rs.last_error = None

    async def _async_finish_run(self, state: str, error: str | None) -> None:
        rs = self.coordinator.run_state
        rs.run_state = RUN_STATE_STOPPING
        await self.coordinator.async_update_run_state(rs)

        failed = await self._async_turn_off_all_tracked()
        self._book_run_water()
        await self._async_post_run()

        if failed and not error:
            # Water may still be running: that is no clean end, whatever the
            # run itself did.
            state, error = RUN_STATE_ERROR, f"Could not turn off: {', '.join(failed)}"
        # Before the state says idle: from that moment the next run may be
        # handed its queue, and this one must not sweep it away afterwards.
        self._clear_run()
        self._settle(state, error)
        await self.coordinator.async_update_run_state(rs)

        self.hass.bus.async_fire(
            EVENT_RUN_FINISHED,
            {"run_state": state, "error": error},
        )

    def _phase_waters(self, step: list[str], mode: str) -> bool:
        """Whether a phase would open a valve: an enabled zone with minutes to run."""
        inst = self.coordinator.installation
        slot_id = phase_slot_id(step)
        return any(
            (zone := inst.zones.get(zone_id)) is not None
            and zone.enabled
            and self._zone_minutes(zone, mode, slot_id) > 0
            for zone_id in step
        )

    def _watering_ahead(self) -> bool:
        """Whether any phase that waters is still waiting to run."""
        mode = self.coordinator.installation.mode
        return any(
            not isinstance(step, Soak) and self._phase_waters(step, mode)
            for step in self._phase_queue
        ) or bool(self._after_phase_zone_order)

    async def _async_soak(self, seconds: int) -> None:
        """Rest between Cycle & Soak steps with every output closed.

        The pre-start outputs go off for the rest as well: a pump left running
        against closed valves for half an hour is exactly what a soak must not
        do. They come back up, with the usual delay, before watering resumes.
        Stop ends the rest for good, Skip phase cuts it short.
        """
        inst = self.coordinator.installation
        rs = self.coordinator.run_state
        rs.soak_until = dt_util.utcnow() + timedelta(seconds=seconds)
        rs.active_zone_ids = []
        await self.coordinator.async_update_run_state(rs)
        # Every output closed means the supplies too, whatever is still held.
        self._supply_refs.clear()
        self._zone_supplies.clear()
        await self._async_close_idle_supplies()
        for entity_id in inst.pre_start_switches:
            await self._async_switch_turn_off(entity_id)
        try:
            # Ends early once nothing is left to water behind it: the last
            # zone may be taken out of the run while it rests.
            await self._async_sleep_interruptible(
                float(seconds), over=lambda: not self._watering_ahead()
            )
        finally:
            # No await here: stop_all() may cancel this task, and an await in
            # the finally of a cancelled task raises straight away. stop_all()
            # pushes the cleared field out itself.
            rs.soak_until = None
        await self.coordinator.async_update_run_state(rs)
        if self._stop_event.is_set() or not inst.pre_start_switches:
            return
        if not self._watering_ahead():
            return
        for entity_id in inst.pre_start_switches:
            await self._async_switch_turn_on(entity_id)
        await self._async_sleep_interruptible(float(inst.pre_start_delay_sec), skippable=False)

    # --- water ---------------------------------------------------------------

    def _book_zone_water(self, zone: Zone, started, meter_start: float | None) -> None:
        """Credit what one zone run used: the meter's word, else the rate's.

        Measured against the wall clock, so a zone stopped early books only
        what it actually delivered. A zone that tracks no water books nothing.
        """
        litres: float | None = None
        source = ""
        if zone.water_meter_entity_id.strip():
            litres = meter_delta(
                meter_start, meter_litres(self.hass, zone.water_meter_entity_id)
            )
            if litres is None:
                _LOGGER.warning(
                    "Water meter %s of zone %s could not be read for this run",
                    zone.water_meter_entity_id,
                    zone.name,
                )
            else:
                source = SOURCE_MEASURED
        if litres is None:
            elapsed = (dt_util.utcnow() - started).total_seconds()
            litres = estimated_litres(zone, elapsed)
            source = SOURCE_ESTIMATED
        if litres is None:
            return
        rs = self.coordinator.run_state
        rs.water_last_run_l[zone.zone_id] = litres
        rs.water_total_l[zone.zone_id] = rs.water_total_l.get(zone.zone_id, 0.0) + litres
        rs.water_source[zone.zone_id] = source
        rs.run_water_l = (rs.run_water_l or 0.0) + litres
        # One estimated zone makes the run's figure an estimate.
        if source == SOURCE_ESTIMATED or rs.run_water_source == SOURCE_ESTIMATED:
            rs.run_water_source = SOURCE_ESTIMATED
        else:
            rs.run_water_source = SOURCE_MEASURED

    def _book_run_water(self) -> None:
        """Close the run's water account once every output is off.

        The supply-line meter, when there is one, replaces the per-zone sum:
        it saw everything that flowed, parallel zones included.
        """
        inst = self.coordinator.installation
        rs = self.coordinator.run_state
        if inst.water_meter_entity_id.strip():
            measured = meter_delta(
                self._run_meter_start, meter_litres(self.hass, inst.water_meter_entity_id)
            )
            if measured is not None:
                rs.run_water_l = measured
                rs.run_water_source = SOURCE_MEASURED
        self._run_meter_start = None
        if rs.run_water_l is None:
            return
        rs.last_run_water_l = rs.run_water_l
        rs.last_run_water_source = rs.run_water_source
        rs.water_total_installation_l += rs.run_water_l
        rs.run_water_l = None
        rs.run_water_source = ""

    async def _async_sleep_interruptible(
        self,
        delay_sec: float,
        *,
        skippable: bool = True,
        over: Callable[[], bool] | None = None,
    ) -> None:
        """Sleep, but wake early on stop -- and on skip phase, unless told not to.

        ``over`` is asked once a second whether the wait still has a point.
        """
        if delay_sec <= 0:
            return
        loop = asyncio.get_running_loop()
        deadline = loop.time() + delay_sec
        while True:
            if self._stop_event.is_set():
                return
            if skippable and self._skip_phase_event.is_set():
                return
            if over is not None and over():
                return
            remaining = deadline - loop.time()
            if remaining <= 0:
                return
            chunk = min(remaining, 1.0)
            wake = self._wait_stop_or_skip() if skippable else self._stop_event.wait()
            try:
                await asyncio.wait_for(wake, timeout=chunk)
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
        # The pump's time to build pressure: Stop ends it, Skip phase does not.
        await self._async_sleep_interruptible(float(delay_sec), skippable=False)

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
        slot_id = phase_slot_id(initial_zone_ids)
        # Zones of this phase whose supply is up, and the closing of it once a
        # zone is done -- kept apart from the zone's own task, so a zone that
        # has closed does not go on counting as watering while its supply trails.
        supplied: set[str] = set()
        releases: list[asyncio.Task[None]] = []

        async def _run_one_zone(zid: str) -> None:
            zone = inst.zones.get(zid)
            if zone is None or not zone.enabled:
                return
            if zid in self._zone_stop_requests:
                # Stopped in the moment between launch and first poll.
                self._zone_stop_requests.discard(zid)
                return
            # Looked up only now, with the zone about to open: a pre-start
            # script or an automation may have set the minutes a moment ago.
            duration = self._zone_minutes(zone, mode, slot_id)
            if duration <= 0:
                # No minutes, no water: opening the valve for an instant is not it.
                return
            if zid not in supplied:
                # Joined a phase that is already under way.
                supplied.add(zid)
                await self._async_open_supplies([zone])
                if self._stop_event.is_set() or self._skip_phase_event.is_set():
                    # Stopped or skipped while its supply was coming up.
                    return
                if zid in self._zone_stop_requests:
                    self._zone_stop_requests.discard(zid)
                    return
            await self._async_zone_run(zone, duration)

        # What supplies the phase comes up first, for all its zones at once.
        first = [
            zone
            for zid in initial_zone_ids
            if (zone := inst.zones.get(zid)) is not None
            and zone.enabled
            and self._zone_minutes(zone, mode, slot_id) > 0
        ]
        supplied.update(zone.zone_id for zone in first)
        # Not open yet, but Stop zone can already reach them.
        self._leading_zone_ids = set(supplied)
        try:
            await self._async_open_supplies(first)
        finally:
            self._leading_zone_ids = set()
        # A supply held over from the last phase that this one did not claim.
        await self._async_close_idle_supplies()

        def _launch(zid: str) -> None:
            if zid in tasks_by_zone:
                return
            tasks_by_zone[zid] = asyncio.create_task(_run_one_zone(zid))

        def _let_go(zid: str) -> None:
            """Start closing the supply of a zone that is done with it."""
            if zid not in supplied:
                return
            supplied.discard(zid)
            # With the phase over, what the next one needs is handed on to it
            # instead of closing now and opening again a moment later.
            keep = frozenset() if tasks_by_zone else self._supplies_needed_next(mode)
            releases.append(asyncio.create_task(self._async_release_supplies(zid, keep)))

        if self._stop_event.is_set() or self._skip_phase_event.is_set():
            # Stopped or skipped while the supply was coming up: the phase is
            # over before a valve has opened.
            for zid in list(supplied):
                _let_go(zid)
        else:
            for zid in initial_zone_ids:
                _launch(zid)

        async def _sync_active() -> None:
            rs.active_zone_ids = [
                zid for zid, t in tasks_by_zone.items() if not t.done()
            ]
            await self.coordinator.async_update_run_state(rs)

        await _sync_active()

        try:
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
                    _let_go(zid)

                await _sync_active()

            # On stop the run's cleanup closes everything; nothing trails then.
            if not self._stop_event.is_set():
                await asyncio.gather(*releases)
        except Exception:
            # One zone failed. Its neighbours must not water on behind a run
            # that is over -- and later close their valve under the next one.
            leftover = [*tasks_by_zone.values(), *releases]
            for task in leftover:
                task.cancel()
            await asyncio.gather(*leftover, return_exceptions=True)
            raise
        finally:
            # No await here: this is also where a cancelled run comes through.
            for task in (*tasks_by_zone.values(), *releases):
                task.cancel()

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
        for step in self._phase_queue:
            if not isinstance(step, Soak) and zone_id in step:
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
                if zone_id and zone_id in self._zone_stop_requests:
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
                self.coordinator.run_state.zone_started_at.pop(zone_id, None)

    async def _async_publish_zone_end(self, zone_id: str, timeout_sec: float) -> None:
        """Record when this zone is planned to finish and notify listeners."""
        rs = self.coordinator.run_state
        now = dt_util.utcnow()
        rs.zone_started_at[zone_id] = now
        rs.zone_ends_at[zone_id] = now + timedelta(seconds=timeout_sec)
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
        started = dt_util.utcnow()
        meter_start = meter_litres(self.hass, zone.water_meter_entity_id)
        await self._async_arm_countdown(zone, duration_min)
        handled_by_service = await self._async_zone_run_with_duration_service(
            zone,
            duration_min,
        )
        if not handled_by_service:
            await asyncio.gather(*(self._async_switch_turn_on(eid) for eid in outputs))
            await self._async_wait_zone_duration(duration_min * 60, zone.zone_id)
            await asyncio.gather(*(self._async_switch_turn_off(eid) for eid in outputs))
        await self._async_disarm_countdown(zone.countdown_entity_id)
        self._book_zone_water(zone, started, meter_start)
        stopped = zone.zone_id in self._zone_stop_requests
        self._zone_stop_requests.discard(zone.zone_id)
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
                # True when stop_zone cut the zone short of its planned duration.
                "stopped": stopped,
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
                self._zone_stop_requests.discard(zone_id)
                if rs.run_state == RUN_STATE_PREPARING and not self._run_slots:
                    self._manual_zone_order.append(zone_id)
                    self._phase_queue = compute_phases(
                        self._manual_zone_order,
                        inst.zones,
                        inst.max_parallel_zones,
                    )
                    rs.upcoming_phases = [list(g) for g in self._phase_queue]
                    await self.coordinator.async_update_run_state(rs)
                    return
                if rs.run_state == RUN_STATE_PREPARING:
                    # "Run this slot now" is preparing: the slot keeps its
                    # program -- zones, rests, minutes -- and this zone follows it.
                    self._after_phase_zone_order.append(zone_id)
                    rs.upcoming_phases = self._upcoming_phases_snapshot()
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
                        rs.upcoming_phases = self._upcoming_phases_snapshot()
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
            self._forget_supplies()
            self._launch(scheduled=False, slot_ids=[])

    async def async_run_schedule_slot(self, slot_id: str) -> None:
        """Run one schedule slot now (same pipeline as “Run this slot now” in the panel)."""
        inst = self.coordinator.installation
        slot = next((s for s in inst.schedule_slots if s.slot_id == slot_id), None)
        if slot is None:
            raise ScheduleSlotRunError("unknown_slot", f"Unknown schedule slot {slot_id}")
        if not slot.zone_ids_ordered:
            raise ScheduleSlotRunError("empty_slot", "Schedule slot has no zones")
        if not phases_for_slot(slot, inst.zones, inst.max_parallel_zones):
            raise ScheduleSlotRunError("no_runnable_zones", "No enabled zones to run in this slot")
        if self.is_busy():
            raise ScheduleSlotRunError("busy", "Irrigation is already running")
        await self.async_run_phases(
            program_for_slot(slot, inst.zones, inst.max_parallel_zones),
            scheduled=False,
            slot_ids=[slot.slot_id],
        )

    async def async_run_due_now(self) -> None:
        """Run phases for schedule slots that are due now (service)."""
        inst = self.coordinator.installation
        tz = dt_util.get_time_zone(self.hass.config.time_zone)
        if tz is None:
            return
        now = dt_util.now()
        due_slots = []
        for slot in inst.schedule_slots:
            if not slot.enabled:
                continue
            nxt = next_slot_fire(inst, slot, now - timedelta(minutes=2), tz)
            if nxt is None:
                continue
            if abs(now.timestamp() - nxt.timestamp()) < 120:
                if guards_allow_run(self.hass, inst, slot):
                    due_slots.append(slot)
        merged: list[RunStep] = []
        for slot in due_slots:
            merged.extend(program_for_slot(slot, inst.zones, inst.max_parallel_zones))
        if merged:
            await self.async_run_phases(
                merged,
                scheduled=False,
                slot_ids=[s.slot_id for s in due_slots],
            )

    def _upcoming_phases_snapshot(self) -> list[list[str]]:
        """What the run still has ahead of it, in the shape the panel shows."""
        inst = self.coordinator.installation
        phases = watering_steps(self._phase_queue)
        if self._after_phase_zone_order:
            tail = compute_phases(
                self._after_phase_zone_order,
                inst.zones,
                inst.max_parallel_zones,
            )
            phases.extend(list(g) for g in tail)
        return phases

    def _discard_queued_zone(self, zone_id: str) -> bool:
        """Drop a zone that has not started yet from every place it is waiting."""
        found = False
        if zone_id in self._manual_zone_order:
            self._manual_zone_order.remove(zone_id)
            found = True
        kept: list[RunStep] = []
        for step in self._phase_queue:
            if isinstance(step, Soak):
                kept.append(step)
                continue
            if zone_id in step:
                found = True
                step = Phase([z for z in step if z != zone_id], phase_slot_id(step))
            if step:
                kept.append(step)
        # Where a whole phase went, the rests on either side of it would now
        # follow each other: one of them is enough.
        self._phase_queue[:] = [
            step
            for i, step in enumerate(kept)
            if not (isinstance(step, Soak) and i > 0 and isinstance(kept[i - 1], Soak))
        ]
        if zone_id in self._after_phase_zone_order:
            self._after_phase_zone_order.remove(zone_id)
            found = True
        if zone_id in self._mid_phase_extensions:
            self._mid_phase_extensions.remove(zone_id)
            found = True
        return found

    async def async_stop_zone(self, zone_id: str) -> None:
        """End one zone of the current run; every other zone carries on.

        A watering zone is told to stop, its outputs go off on the next poll of
        its wait loop, and the run continues with whatever is left -- so stopping
        the last zone simply lets the run finish (post-run script included). A
        zone that is still queued is taken out of the plan. During the pre-start
        phase, removing the only zone ends the run right away instead of letting
        the pre-start outputs and script run for nothing.
        """
        inst = self.coordinator.installation
        if zone_id not in inst.zones:
            raise ZoneStopError("unknown_zone", f"Unknown zone {zone_id}")

        async with self._run_lock:
            rs = self.coordinator.run_state
            if not self.is_busy() or rs.run_state == RUN_STATE_STOPPING:
                raise ZoneStopError("zone_not_running", "Zone is not part of the current run")

            # Watering, or about to: its supply is coming up.
            active = zone_id in rs.active_zone_ids or zone_id in self._leading_zone_ids
            queued = self._discard_queued_zone(zone_id)
            if not active and not queued:
                raise ZoneStopError("zone_not_running", "Zone is not part of the current run")

            if active:
                self._zone_stop_requests.add(zone_id)

            others_active = [z for z in rs.active_zone_ids if z != zone_id]
            nothing_left = (
                not others_active
                and not self._watering_ahead()
                and not self._mid_phase_extensions
            )
            if nothing_left and rs.run_state == RUN_STATE_PREPARING:
                self._stop_event.set()

            rs.upcoming_phases = self._upcoming_phases_snapshot()
            await self.coordinator.async_update_run_state(rs)

    async def async_stop_all(self) -> None:
        """Signal stop and turn off outputs. Whatever waited for its turn is off too."""
        self._stopping_all += 1
        try:
            self._drop_waiting(SKIP_STOPPED)
            await self._async_stop_all()
        finally:
            self._stopping_all -= 1

    async def _async_stop_all(self) -> None:
        self._stop_event.set()
        self._zone_stop_requests.clear()
        stopped = self._task
        if stopped and not stopped.done():
            try:
                await asyncio.wait_for(stopped, timeout=300)
            except TimeoutError:
                stopped.cancel()
        # Once more, in case the run could not close up itself. Under the lock
        # every start takes: none slips in between, to have its pump switched
        # off and its state set to idle under it.
        async with self._run_lock:
            if self._task is not stopped:
                # A run began in the moment the stopped one ended. It is none
                # of this Stop's business.
                return
            failed = await self._async_turn_off_all_tracked()
            self._clear_run()
            if failed:
                # A valve that will not close is not "idle".
                self._settle(RUN_STATE_ERROR, f"Could not turn off: {', '.join(failed)}")
            else:
                self._settle(RUN_STATE_IDLE, None)
            await self.coordinator.async_update_run_state(self.coordinator.run_state)

    async def async_skip_to_next_phase(self) -> bool:
        """End the current phase early (parallel zones stop) and run the next phase.

        Only while the run is watering or resting. Before that there is no
        phase to skip -- only the pump's time to build pressure, and that is
        not to be cut short.
        """
        if self.coordinator.run_state.run_state != RUN_STATE_RUNNING:
            return False
        self._skip_phase_event.set()
        return True

    async def _async_arm_countdown(self, zone: Zone, duration_min: int) -> None:
        """Set the valve's own timer to the pass, before the outputs open.

        Before, not after: some valves restart or ignore a countdown written
        while they are already open. A backstop must not block the run, so a
        failed write is logged and the zone waters on Simple Irrigation's
        timing alone.
        """
        entity_id = zone.countdown_entity_id.strip()
        if not entity_id:
            return
        value = countdown_value(self.hass, zone, duration_min)
        if value is None:
            _LOGGER.warning(
                "Zone %s: cannot tell the unit of countdown %s; hardware timer not set",
                zone.zone_id,
                entity_id,
            )
            return
        try:
            await async_set_countdown(self.hass, entity_id, value)
        except Exception:  # noqa: BLE001 - the timer is a safety net, not the run
            _LOGGER.exception(
                "Zone %s: could not set countdown %s; running without hardware timer",
                zone.zone_id,
                entity_id,
            )
            return
        self._armed_countdowns.add(entity_id)

    async def _async_disarm_countdown(self, entity_id: str) -> None:
        """Clear the valve's timer once its outputs are shut. Never raises."""
        entity_id = entity_id.strip()
        if entity_id not in self._armed_countdowns:
            return
        self._armed_countdowns.discard(entity_id)
        value = clear_value(self.hass, entity_id)
        if value is None:
            return
        try:
            await async_set_countdown(self.hass, entity_id, value)
        except Exception:  # noqa: BLE001 - a stale countdown on a closed valve is harmless
            _LOGGER.warning("Could not clear countdown %s", entity_id, exc_info=True)

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

    async def _async_turn_off_all_tracked(self) -> list[str]:
        """Close everything this run touched; returns what would not close. Never raises.

        This is the cleanup path — it runs from _async_finish_run() and from
        async_stop_all(). A raise here would skip the remaining outputs and leave
        run_state stuck on "stopping", which is_busy() reports as busy, so the
        integration would refuse every further run until Home Assistant restarts.
        Failures are collected into last_error instead.
        """
        inst = self.coordinator.installation
        # Downstream first: zone valves, then what supplies them, then the
        # pre-start outputs -- touched or not, they are the run's to close.
        supplies = {eid for zone in inst.zones.values() for eid in zone.supply_entity_ids}
        upstream = supplies | set(inst.pre_start_switches)
        tracked = self._touched_entities | self._unclosed
        pending = (
            sorted(tracked - upstream)
            + sorted(tracked & supplies - set(inst.pre_start_switches))
            + list(inst.pre_start_switches)
        )
        failed: list[str] = []
        for entity_id in pending:
            try:
                await self._async_switch_turn_off(entity_id)
            except Exception:  # noqa: BLE001 - one bad output must not strand the rest
                _LOGGER.exception("Could not turn off %s during cleanup", entity_id)
                failed.append(entity_id)
        self._unclosed = set(failed)
        self._touched_entities.clear()
        self._forget_supplies()
        for entity_id in list(self._armed_countdowns):
            await self._async_disarm_countdown(entity_id)
        if failed:
            self.coordinator.run_state.last_error = (
                f"Could not turn off: {', '.join(failed)}"
            )
        return failed
