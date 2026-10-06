"""Schedules that come due while something else is running.

By default such a schedule is skipped -- and says so. An installation may let
them wait instead: then each takes its turn once the run before it is done, as
a run of its own, and only if nothing that would have kept it from running at
its own time has come up meanwhile.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from custom_components.simple_irrigation.const import (
    EVENT_RUN_STARTED,
    EVENT_SCHEDULE_SKIPPED,
    GUARD_OP_IS_FALSE,
    MAX_WAITING_RUNS,
    RUN_STATE_ERROR,
    RUN_STATE_IDLE,
    RUN_STATE_PREPARING,
    SKIP_BUSY,
    SKIP_CONDITIONS,
    SKIP_ERROR,
    SKIP_EXPIRED,
    SKIP_PAUSED,
    SKIP_QUEUE_FULL,
    SKIP_STOPPED,
)
from custom_components.simple_irrigation.models import (
    Guard,
    Installation,
    RunState,
    ScheduleSlot,
    WaitingRun,
    Zone,
    parse_wait_max,
)
from custom_components.simple_irrigation.runtime import IrrigationRuntime
from custom_components.simple_irrigation.scheduler import IrrigationScheduler

SCHEDULER = "custom_components.simple_irrigation.scheduler"
RUNTIME = "custom_components.simple_irrigation.runtime"
PUMP = "switch.pump"
RAIN = "binary_sensor.rain"
NOW = datetime(2026, 6, 1, 6, 30, 20, tzinfo=timezone.utc)  # a Monday


def _zone(zid: str) -> Zone:
    return Zone(
        zone_id=zid,
        name=zid,
        switch_entity_ids=[f"switch.{zid}"],
        duration_normal_min=1,
        duration_extra_min=3,
    )


def _slot(sid: str, *zone_ids: str, **kwargs) -> ScheduleSlot:
    return ScheduleSlot(
        slot_id=sid,
        name=sid,
        weekdays=[0, 1, 2, 3, 4, 5, 6],
        time_local="06:30",
        zone_ids_ordered=list(zone_ids),
        **kwargs,
    )


class Garden:
    """A runtime over a fake Home Assistant, with zones the test can hold open."""

    def __init__(self, *slots: ScheduleSlot, wait: bool = True, **installation) -> None:
        zone_ids = dict.fromkeys(zid for slot in slots for zid in slot.zone_ids_ordered)
        self.inst = Installation(
            installation_id="i1",
            name="Garden",
            zones={zid: _zone(zid) for zid in zone_ids},
            schedule_slots=list(slots),
            pre_start_switches=[PUMP],
            pre_start_delay_sec=0,
            max_parallel_zones=1,
            wait_when_busy=wait,
            **installation,
        )
        self.log: list[tuple[str, str]] = []
        self.on: set[str] = set()
        self.minutes: dict[str, float] = {}
        self.held: dict[str, asyncio.Event] = {}
        self.states: dict[str, str] = {}
        self.hass = MagicMock()
        self.hass.services.async_call = AsyncMock(side_effect=self._call)
        self.hass.async_create_task = lambda coro, name=None: asyncio.ensure_future(coro)
        self.hass.states.get = lambda entity_id: (
            MagicMock(state=self.states[entity_id]) if entity_id in self.states else None
        )
        coordinator = MagicMock()
        coordinator.installation = self.inst
        coordinator.run_state = RunState()
        coordinator.async_update_run_state = AsyncMock()
        self.runtime = IrrigationRuntime(self.hass, coordinator)
        self.runtime._async_wait_zone_duration = self._wait
        self.runtime._async_sleep_interruptible = AsyncMock()

    @property
    def rs(self) -> RunState:
        return self.runtime.coordinator.run_state

    async def _call(self, _domain, service, data=None, **_kwargs) -> None:
        entity_id = (data or {}).get("entity_id", "")
        opening = service in ("turn_on", "open_valve")
        if opening != (entity_id in self.on):
            self.log.append(("on" if opening else "off", entity_id))
        (self.on.add if opening else self.on.discard)(entity_id)

    async def _wait(self, seconds: float, zone_id: str | None = None) -> None:
        self.minutes[zone_id or ""] = seconds / 60
        if zone_id in self.held:
            runtime = self.runtime
            for _ in range(2000):
                if (
                    self.held[zone_id].is_set()
                    or runtime._stop_event.is_set()
                    or runtime._skip_phase_event.is_set()
                    or zone_id in runtime._zone_stop_requests
                ):
                    return
                await asyncio.sleep(0.005)

    def hold(self, zone_id: str) -> asyncio.Event:
        self.held[zone_id] = asyncio.Event()
        return self.held[zone_id]

    def slot(self, slot_id: str) -> ScheduleSlot:
        return next(s for s in self.inst.schedule_slots if s.slot_id == slot_id)

    async def start(self, slot_id: str) -> None:
        """The schedule starts, as the scheduler would start it on an idle installation."""
        slot = self.slot(slot_id)
        await self.runtime.async_run_phases(
            [list(slot.zone_ids_ordered)], scheduled=True, slot_ids=[slot_id]
        )

    async def due(self, *slot_ids: str, at: datetime | None = None) -> None:
        """Schedules come due while something else is running."""
        await self.runtime.async_wait_or_skip(
            [self.slot(sid) for sid in slot_ids], at or datetime.now(timezone.utc)
        )

    async def settle(self) -> None:
        """Wait until nothing runs and nobody waits any more."""
        for _ in range(1000):
            task = self.runtime._task
            if (task is None or task.done()) and not self.runtime.is_busy():
                return
            await asyncio.sleep(0.005)
        raise AssertionError("the installation did not come to rest")

    def waiting(self) -> list[list[str]]:
        return [list(run.slot_ids) for run in self.rs.waiting_runs]

    def skipped(self) -> list[tuple[str, str]]:
        return [
            (call.args[1]["slot_id"], call.args[1]["reason"])
            for call in self.hass.bus.async_fire.call_args_list
            if call.args[0] == EVENT_SCHEDULE_SKIPPED
        ]

    def runs_started(self) -> list[list[str]]:
        return [
            call.args[1]["slot_ids"]
            for call in self.hass.bus.async_fire.call_args_list
            if call.args[0] == EVENT_RUN_STARTED
        ]

    def opened(self) -> list[str]:
        return [eid for what, eid in self.log if what == "on" and eid != PUMP]


async def _busy_with(garden: Garden, slot_id: str, zone_id: str) -> asyncio.Event:
    """Start a schedule and hold its zone open; returns what lets it go."""
    release = garden.hold(zone_id)
    await garden.start(slot_id)
    for _ in range(500):
        if f"switch.{zone_id}" in garden.on:
            return release
        await asyncio.sleep(0.005)
    raise AssertionError("the zone did not open")


# --- schedules do not wait (the default) ---------------------------------------


@pytest.mark.asyncio
async def test_a_schedule_due_during_a_run_is_skipped_and_says_so() -> None:
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"), wait=False)
    release = await _busy_with(garden, "lawn", "a")

    await garden.due("beds")
    release.set()
    await garden.settle()

    assert garden.skipped() == [("beds", SKIP_BUSY)]
    assert garden.waiting() == []
    assert garden.opened() == ["switch.a"]


def test_an_installation_lets_nothing_wait_unless_told_to() -> None:
    inst = Installation.from_dict({"installation_id": "i1", "name": "Garden"})

    assert inst.wait_when_busy is False
    assert inst.wait_max_min == 120


def test_the_setting_survives_the_store() -> None:
    inst = Installation(installation_id="i1", name="G", wait_when_busy=True, wait_max_min=45)

    again = Installation.from_dict(inst.to_dict())

    assert (again.wait_when_busy, again.wait_max_min) == (True, 45)


@pytest.mark.parametrize(
    ("raw", "minutes"),
    [(45, 45), ("90", 90), (1, 1), (720, 720), (0, 120), (721, 120), (None, 120), ("x", 120)],
)
def test_minutes_to_wait_outside_the_range_fall_back_to_the_default(raw, minutes) -> None:
    assert parse_wait_max(raw) == minutes


def test_a_waiting_schedule_does_not_survive_a_restart() -> None:
    rs = RunState(waiting_runs=[WaitingRun(["beds"], NOW)])

    assert rs.to_dict()["waiting_runs"] == [{"slot_ids": ["beds"], "due_at": NOW.isoformat()}]
    assert RunState.from_dict(rs.to_dict()).waiting_runs == []


# --- schedules wait -------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_waiting_schedule_runs_once_the_run_before_it_is_done() -> None:
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"))
    release = await _busy_with(garden, "lawn", "a")

    await garden.due("beds")
    assert garden.waiting() == [["beds"]]
    assert garden.opened() == ["switch.a"]

    release.set()
    await garden.settle()

    assert garden.skipped() == []
    assert garden.waiting() == []
    assert garden.rs.run_state == RUN_STATE_IDLE
    # A run of its own: the first is shut down completely before it begins.
    assert garden.log == [
        ("on", PUMP),
        ("on", "switch.a"),
        ("off", "switch.a"),
        ("off", PUMP),
        ("on", PUMP),
        ("on", "switch.b"),
        ("off", "switch.b"),
        ("off", PUMP),
    ]
    assert garden.runs_started() == [["lawn"], ["beds"]]


@pytest.mark.asyncio
async def test_waiting_schedules_run_in_the_order_they_came_due() -> None:
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"), _slot("drip", "c"))
    release = await _busy_with(garden, "lawn", "a")

    await garden.due("drip")
    await garden.due("beds")
    release.set()
    await garden.settle()

    assert garden.opened() == ["switch.a", "switch.c", "switch.b"]


@pytest.mark.asyncio
async def test_schedules_due_in_the_same_minute_wait_as_one_run() -> None:
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"), _slot("drip", "c"))
    release = await _busy_with(garden, "lawn", "a")

    await garden.due("beds", "drip")
    release.set()
    await garden.settle()

    assert garden.runs_started() == [["lawn"], ["beds", "drip"]]


@pytest.mark.asyncio
async def test_a_schedule_is_not_lined_up_twice() -> None:
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"))
    release = await _busy_with(garden, "lawn", "a")

    await garden.due("beds")
    await garden.due("beds")
    # Nor behind itself, should its time come round while it is running.
    await garden.due("lawn")

    assert garden.waiting() == [["beds"]]
    assert garden.skipped() == [("beds", SKIP_BUSY), ("lawn", SKIP_BUSY)]
    release.set()
    await garden.settle()


@pytest.mark.asyncio
async def test_no_more_than_a_handful_may_wait() -> None:
    slots = [_slot(f"s{i}", f"z{i}") for i in range(MAX_WAITING_RUNS + 2)]
    garden = Garden(*slots)
    release = await _busy_with(garden, "s0", "z0")

    for slot in slots[1:]:
        await garden.due(slot.slot_id)

    assert len(garden.waiting()) == MAX_WAITING_RUNS
    assert garden.skipped() == [(slots[-1].slot_id, SKIP_QUEUE_FULL)]
    await garden.runtime.async_stop_all()
    release.set()


@pytest.mark.asyncio
async def test_minutes_are_worked_out_when_the_turn_comes() -> None:
    """Not when the schedule came due: the mode may have changed since."""
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"))
    release = await _busy_with(garden, "lawn", "a")
    await garden.due("beds")

    garden.inst.mode = "extra"
    release.set()
    await garden.settle()

    assert garden.minutes["b"] == 3


# --- what is looked at again when the turn comes --------------------------------


@pytest.mark.asyncio
async def test_a_schedule_that_waited_too_long_is_dropped() -> None:
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"), wait_max_min=30)
    release = await _busy_with(garden, "lawn", "a")

    await garden.due("beds", at=datetime.now(timezone.utc) - timedelta(minutes=31))
    release.set()
    await garden.settle()

    assert garden.skipped() == [("beds", SKIP_EXPIRED)]
    assert garden.opened() == ["switch.a"]


@pytest.mark.asyncio
async def test_a_schedule_within_its_time_still_runs() -> None:
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"), wait_max_min=30)
    release = await _busy_with(garden, "lawn", "a")

    await garden.due("beds", at=datetime.now(timezone.utc) - timedelta(minutes=29))
    release.set()
    await garden.settle()

    assert garden.opened() == ["switch.a", "switch.b"]


@pytest.mark.asyncio
async def test_a_pause_set_meanwhile_drops_the_waiting_schedule() -> None:
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"))
    release = await _busy_with(garden, "lawn", "a")
    await garden.due("beds")

    garden.inst.pause_until = datetime.now(timezone.utc) + timedelta(hours=6)
    release.set()
    await garden.settle()

    assert garden.skipped() == [("beds", SKIP_PAUSED)]
    assert garden.opened() == ["switch.a"]


@pytest.mark.asyncio
async def test_a_schedule_switched_off_meanwhile_is_dropped_the_rest_runs() -> None:
    """This is how one waiting schedule is taken out of the line."""
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"), _slot("drip", "c"))
    release = await _busy_with(garden, "lawn", "a")
    await garden.due("beds")
    await garden.due("drip")

    garden.slot("beds").enabled = False
    release.set()
    await garden.settle()

    assert garden.skipped() == [("beds", SKIP_PAUSED)]
    assert garden.opened() == ["switch.a", "switch.c"]


@pytest.mark.asyncio
async def test_a_deleted_schedule_is_simply_gone() -> None:
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"))
    release = await _busy_with(garden, "lawn", "a")
    await garden.due("beds")

    garden.inst.schedule_slots.pop()
    release.set()
    await garden.settle()

    assert garden.skipped() == []
    assert garden.opened() == ["switch.a"]


@pytest.mark.asyncio
async def test_conditions_are_those_of_the_moment_it_starts() -> None:
    """Dry when it came due, raining when its turn comes: it does not water."""
    beds = _slot("beds", "b", guards=[Guard(RAIN, GUARD_OP_IS_FALSE)])
    garden = Garden(_slot("lawn", "a"), beds)
    garden.states[RAIN] = "off"
    release = await _busy_with(garden, "lawn", "a")
    await garden.due("beds")

    garden.states[RAIN] = "on"
    release.set()
    await garden.settle()

    assert garden.skipped() == [("beds", SKIP_CONDITIONS)]
    assert garden.opened() == ["switch.a"]


# --- stop, skip, error ------------------------------------------------------------


@pytest.mark.asyncio
async def test_stop_ends_the_run_and_sends_the_waiting_ones_home() -> None:
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"), _slot("drip", "c"))
    await _busy_with(garden, "lawn", "a")
    await garden.due("beds")
    await garden.due("drip")

    await garden.runtime.async_stop_all()
    await garden.settle()

    assert garden.skipped() == [("beds", SKIP_STOPPED), ("drip", SKIP_STOPPED)]
    assert garden.waiting() == []
    assert garden.opened() == ["switch.a"]
    assert garden.on == set()
    assert garden.rs.run_state == RUN_STATE_IDLE


@pytest.mark.asyncio
async def test_nothing_lines_up_while_stop_is_being_carried_out() -> None:
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"))
    await _busy_with(garden, "lawn", "a")

    garden.runtime._stopping_all = 1
    await garden.due("beds")
    garden.runtime._stopping_all = 0

    assert garden.skipped() == [("beds", SKIP_STOPPED)]
    assert garden.waiting() == []
    await garden.runtime.async_stop_all()


@pytest.mark.asyncio
async def test_skip_phase_leaves_the_waiting_schedule_alone() -> None:
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"))
    await _busy_with(garden, "lawn", "a")
    await garden.due("beds")

    await garden.runtime.async_skip_to_next_phase()
    await garden.settle()

    assert garden.opened() == ["switch.a", "switch.b"]


@pytest.mark.asyncio
async def test_stopping_the_last_zone_leaves_the_waiting_schedule_alone() -> None:
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"))
    await _busy_with(garden, "lawn", "a")
    await garden.due("beds")

    await garden.runtime.async_stop_zone("a")
    await garden.settle()

    assert garden.opened() == ["switch.a", "switch.b"]


@pytest.mark.asyncio
async def test_a_failed_run_takes_the_waiting_schedules_down_with_it() -> None:
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"))
    release = await _busy_with(garden, "lawn", "a")
    await garden.due("beds")

    # The post-run step fails once; the clean-up after the failure goes through.
    with patch.object(
        garden.runtime, "_async_post_run", AsyncMock(side_effect=[RuntimeError("burst pipe"), None])
    ):
        release.set()
        await garden.settle()

    assert garden.rs.run_state == RUN_STATE_ERROR
    assert garden.skipped() == [("beds", SKIP_ERROR)]
    assert garden.opened() == ["switch.a"]


@pytest.mark.asyncio
async def test_a_manual_run_keeps_a_schedule_waiting_too() -> None:
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"))
    release = garden.hold("a")
    await garden.runtime.async_run_zone("a")
    await garden.due("beds")
    assert garden.waiting() == [["beds"]]

    release.set()
    await garden.settle()

    assert garden.opened() == ["switch.a", "switch.b"]


@pytest.mark.asyncio
async def test_two_starts_in_the_same_moment_cannot_both_win() -> None:
    """Busy from the start call on, not from the first step of the task."""
    garden = Garden(_slot("lawn", "a"), _slot("beds", "b"))

    first = await garden.runtime.async_run_phases([["a"]], scheduled=True, slot_ids=["lawn"])
    assert garden.rs.run_state == RUN_STATE_PREPARING
    second = await garden.runtime.async_run_phases([["b"]], scheduled=True, slot_ids=["beds"])
    await garden.settle()

    assert (first, second) == (True, False)
    assert garden.opened() == ["switch.a"]


# --- the scheduler ----------------------------------------------------------------


def _scheduler(*slots: ScheduleSlot, busy: bool = False, waiting: bool = False, raining=False):
    hass = MagicMock()
    hass.config.time_zone = "UTC"
    hass.states.get = lambda _eid: MagicMock(state="on" if raining else "off")
    coordinator = MagicMock()
    coordinator.installation = Installation(
        installation_id="i1",
        name="Garden",
        zones={zid: _zone(zid) for slot in slots for zid in slot.zone_ids_ordered},
        schedule_slots=list(slots),
    )
    coordinator.run_state = RunState()
    coordinator.async_update_run_state = AsyncMock()
    runtime = MagicMock()
    runtime.is_busy.return_value = busy
    runtime.has_waiting.return_value = waiting
    runtime.async_run_phases = AsyncMock(return_value=True)
    runtime.async_wait_or_skip = AsyncMock()
    return IrrigationScheduler(hass, coordinator, runtime), runtime, hass


async def _fire(scheduler: IrrigationScheduler) -> None:
    with (
        patch(f"{SCHEDULER}.dt_util.now", return_value=NOW),
        patch(f"{SCHEDULER}.async_track_point_in_time"),
    ):
        await scheduler._async_fire_at(NOW)


@pytest.mark.asyncio
async def test_the_scheduler_starts_a_due_schedule_on_an_idle_installation() -> None:
    scheduler, runtime, _hass = _scheduler(_slot("beds", "b"))

    await _fire(scheduler)

    runtime.async_run_phases.assert_awaited_once()
    assert runtime.async_run_phases.await_args.kwargs["slot_ids"] == ["beds"]
    runtime.async_wait_or_skip.assert_not_awaited()


@pytest.mark.asyncio
async def test_the_scheduler_hands_a_due_schedule_over_when_something_is_running() -> None:
    scheduler, runtime, _hass = _scheduler(_slot("beds", "b"), busy=True)

    await _fire(scheduler)

    runtime.async_run_phases.assert_not_awaited()
    slots, due_at = runtime.async_wait_or_skip.await_args.args
    assert [slot.slot_id for slot in slots] == ["beds"]
    assert due_at == NOW


@pytest.mark.asyncio
async def test_the_scheduler_does_not_jump_the_line() -> None:
    """Idle for a moment between two runs, but somebody is waiting already."""
    scheduler, runtime, _hass = _scheduler(_slot("beds", "b"), waiting=True)

    await _fire(scheduler)

    runtime.async_run_phases.assert_not_awaited()
    runtime.async_wait_or_skip.assert_awaited_once()


@pytest.mark.asyncio
async def test_a_start_lost_to_a_manual_run_is_not_lost_for_good() -> None:
    scheduler, runtime, _hass = _scheduler(_slot("beds", "b"))
    runtime.async_run_phases.return_value = False

    await _fire(scheduler)

    runtime.async_wait_or_skip.assert_awaited_once()


@pytest.mark.asyncio
async def test_a_schedule_its_conditions_keep_from_running_says_so() -> None:
    beds = _slot("beds", "b", guards=[Guard(RAIN, GUARD_OP_IS_FALSE)])
    scheduler, runtime, hass = _scheduler(beds, raining=True)

    await _fire(scheduler)

    runtime.async_run_phases.assert_not_awaited()
    runtime.async_wait_or_skip.assert_not_awaited()
    event, data = hass.bus.async_fire.call_args.args
    assert event == EVENT_SCHEDULE_SKIPPED
    assert data == {
        "slot_id": "beds",
        "name": "beds",
        "due_at": NOW.isoformat(),
        "reason": SKIP_CONDITIONS,
    }


@pytest.mark.asyncio
async def test_a_schedule_taken_along_a_minute_early_is_not_due_again() -> None:
    """Two schedules a minute apart start as one run; the second minute adds nothing."""
    later = _slot("drip", "c")
    later.time_local = "06:31"
    scheduler, runtime, hass = _scheduler(_slot("beds", "b"), later)

    await _fire(scheduler)
    assert runtime.async_run_phases.await_args.kwargs["slot_ids"] == ["beds", "drip"]

    runtime.is_busy.return_value = True
    with (
        patch(f"{SCHEDULER}.dt_util.now", return_value=NOW + timedelta(seconds=40)),
        patch(f"{SCHEDULER}.async_track_point_in_time"),
    ):
        await scheduler._async_fire_at(NOW)

    runtime.async_wait_or_skip.assert_not_awaited()
    hass.bus.async_fire.assert_not_called()


@pytest.mark.asyncio
async def test_a_schedule_that_is_not_due_is_none_of_this() -> None:
    scheduler, runtime, hass = _scheduler(_slot("beds", "b"), busy=True)
    scheduler.coordinator.installation.schedule_slots[0].time_local = "18:00"

    await _fire(scheduler)

    runtime.async_wait_or_skip.assert_not_awaited()
    hass.bus.async_fire.assert_not_called()
