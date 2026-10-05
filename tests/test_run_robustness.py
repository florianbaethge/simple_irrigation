"""The run engine where it is hard to get right: crashes, races, errors, edges.

Every test here was a bug once, found by an audit before 1.13. The fake Home
Assistant keeps a state table and its sleeps are real, so a Stop or a Skip
arrives the way it does in a garden -- in the middle of something.
"""

from __future__ import annotations

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.simple_irrigation.const import (
    RUN_STATE_ERROR,
    RUN_STATE_IDLE,
    RUN_STATE_PREPARING,
    RUN_STATE_RUNNING,
)
from custom_components.simple_irrigation.models import (
    Installation,
    RunState,
    ScheduleSlot,
    Zone,
)
from custom_components.simple_irrigation.program import Soak
from custom_components.simple_irrigation.runtime import (
    IrrigationRuntime,
    ZoneManualRunError,
)
from custom_components.simple_irrigation.scheduler import program_for_slot

VALVE = "valve.drip_main"
PUMP = "switch.pump"


def zone(zid: str, *supply: str, **kwargs) -> Zone:
    kwargs.setdefault("duration_normal_min", 1)
    return Zone(
        zone_id=zid,
        name=zid,
        switch_entity_ids=[f"switch.{zid}"],
        supply_entity_ids=list(supply),
        **kwargs,
    )


class Garden:
    """A runtime over a fake Home Assistant. Sleeps are real; zones can be held open."""

    def __init__(self, *zones: Zone, **installation) -> None:
        self.on: set[str] = set()
        self.log: list[tuple[str, str]] = []
        self.held: dict[str, list[asyncio.Event]] = {}
        self.failing_on: set[str] = set()
        self.failing_off: set[str] = set()
        self.slow_off: dict[str, float] = {}
        self.events: list[tuple[str, dict]] = []
        self.inst = Installation(
            installation_id="i1",
            name="Garden",
            zones={z.zone_id: z for z in zones},
            max_parallel_zones=installation.pop("max_parallel_zones", 1),
            pre_start_delay_sec=installation.pop("pre_start_delay_sec", 0),
            **installation,
        )
        self.hass = MagicMock()
        self.hass.services.async_call = AsyncMock(side_effect=self._call)
        self.hass.async_create_task = lambda coro, name=None: asyncio.ensure_future(coro)
        self.hass.states.get = lambda _entity_id: None
        self.hass.bus.async_fire = lambda name, data=None: self.events.append((name, data or {}))
        self.hass.is_running = True
        self.coordinator = MagicMock()
        self.coordinator.installation = self.inst
        self.coordinator.run_state = RunState()
        self.coordinator.async_update_run_state = AsyncMock()
        self.coordinator.store.async_save = AsyncMock()
        self.runtime = IrrigationRuntime(self.hass, self.coordinator)
        self.runtime._async_wait_zone_duration = self._wait

    @property
    def rs(self) -> RunState:
        return self.coordinator.run_state

    async def _call(self, _domain, service, data=None, **_kwargs) -> None:
        entity_id = (data or {}).get("entity_id", "")
        opening = service in ("turn_on", "open_valve")
        if opening and entity_id in self.failing_on:
            raise RuntimeError(f"{entity_id} cannot open")
        if not opening and entity_id in self.failing_off:
            raise RuntimeError(f"{entity_id} cannot close")
        if not opening and entity_id in self.slow_off:
            await asyncio.sleep(self.slow_off[entity_id])
        # What changed, not what was sent: a run closes everything it touched
        # once more at its end, open or not.
        if opening != (entity_id in self.on):
            self.log.append(("on" if opening else "off", entity_id))
        (self.on.add if opening else self.on.discard)(entity_id)

    async def _wait(self, _seconds: float, zone_id: str | None = None) -> None:
        queue = self.held.get(zone_id or "")
        if not queue:
            return
        release = queue.pop(0)
        runtime = self.runtime
        while not (
            release.is_set()
            or runtime._stop_event.is_set()
            or runtime._skip_phase_event.is_set()
            or zone_id in runtime._zone_stop_requests
        ):
            await asyncio.sleep(0.005)

    def hold(self, zone_id: str) -> asyncio.Event:
        release = asyncio.Event()
        self.held.setdefault(zone_id, []).append(release)
        return release

    def restarted(self) -> "Garden":
        """A fresh process over the same hardware, with what the store holds now."""
        fresh = Garden(
            *self.inst.zones.values(), pre_start_switches=list(self.inst.pre_start_switches)
        )
        fresh.on = set(self.on)
        fresh.coordinator.run_state = RunState.from_dict(self.rs.to_dict())
        return fresh


async def until(predicate, timeout: float = 5.0) -> None:
    for _ in range(int(timeout / 0.005)):
        if predicate():
            return
        await asyncio.sleep(0.005)
    raise AssertionError("condition not met in time")


async def _crash(garden: Garden) -> Garden:
    """Home Assistant dies under the run and comes back up."""
    fresh = garden.restarted()
    garden.runtime._task.cancel()
    await fresh.runtime.async_setup()
    return fresh


# --- a restart must close the supply, whatever stage the run was in ---------------


@pytest.mark.asyncio
async def test_a_crash_while_the_supply_comes_up_does_not_leave_it_open() -> None:
    """No zone is on record as watering yet, and still the supply is closed."""
    garden = Garden(zone("a", VALVE, supply_lead_sec=30), pre_start_switches=[PUMP])
    await garden.runtime.async_run_phases([["a"]], scheduled=True, slot_ids=[])
    await until(lambda: VALVE in garden.on)
    assert garden.rs.active_zone_ids == []

    fresh = await _crash(garden)

    assert fresh.on == set()
    assert fresh.rs.run_state == RUN_STATE_ERROR


@pytest.mark.asyncio
async def test_a_crash_while_the_supply_trails_does_not_leave_it_open() -> None:
    garden = Garden(zone("a", VALVE, supply_trail_sec=30), pre_start_switches=[PUMP])
    await garden.runtime.async_run_phases([["a"]], scheduled=True, slot_ids=[])
    await until(lambda: ("off", "switch.a") in garden.log)
    assert VALVE in garden.on

    fresh = await _crash(garden)

    assert fresh.on == set()


@pytest.mark.asyncio
async def test_a_supply_whose_integration_went_down_first_is_closed_at_the_next_start() -> None:
    """Shutdown could not reach it; the run stays on record so the next start does."""
    garden = Garden(zone("a", VALVE, supply_lead_sec=30), pre_start_switches=[PUMP])
    await garden.runtime.async_run_phases([["a"]], scheduled=True, slot_ids=[])
    await until(lambda: VALVE in garden.on)
    garden.failing_off = {VALVE}

    await garden.runtime.async_close_for_shutdown()
    assert VALVE in garden.on

    garden.failing_off = set()
    fresh = garden.restarted()
    await fresh.runtime.async_setup()

    assert VALVE not in fresh.on


@pytest.mark.asyncio
async def test_a_start_without_an_interrupted_run_leaves_the_supplies_alone() -> None:
    garden = Garden(zone("a", VALVE), pre_start_switches=[PUMP])
    garden.on = {VALVE}

    await garden.runtime.async_setup()

    assert VALVE in garden.on


# --- nothing starts while Home Assistant goes down --------------------------------


@pytest.mark.asyncio
async def test_nothing_starts_once_home_assistant_is_shutting_down() -> None:
    garden = Garden(zone("a"))
    runtime = garden.runtime

    await runtime.async_close_for_shutdown()

    assert await runtime.async_run_phases([["a"]], scheduled=True, slot_ids=[]) is False
    with pytest.raises(ZoneManualRunError):
        await runtime.async_run_zone("a")
    assert garden.on == set()


# --- Stop -------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_run_started_while_stop_still_cleans_up_keeps_its_pump() -> None:
    """Stop's second pass must not switch the pump off under the next run."""
    garden = Garden(zone("a"), zone("b"), pre_start_switches=[PUMP])
    garden.slow_off[PUMP] = 0.05
    runtime = garden.runtime
    garden.hold("a")
    await runtime.async_run_zone("a")
    await until(lambda: "switch.a" in garden.on)
    stopped = runtime._task

    stop = asyncio.ensure_future(runtime.async_stop_all())
    await until(stopped.done)
    garden.hold("b")
    await runtime.async_run_zone("b", 10)
    await until(lambda: "switch.b" in garden.on)
    await stop
    await asyncio.sleep(0.05)

    assert not runtime._task.done()
    assert garden.rs.run_state == RUN_STATE_RUNNING
    assert {PUMP, "switch.b"} <= garden.on
    await runtime.async_stop_all()


@pytest.mark.asyncio
async def test_stop_does_not_hide_a_valve_that_would_not_close() -> None:
    garden = Garden(zone("a"))
    runtime = garden.runtime
    garden.hold("a")
    await runtime.async_run_zone("a", 10)
    await until(lambda: "switch.a" in garden.on)
    garden.failing_off = {"switch.a"}

    await runtime.async_stop_all()

    assert "switch.a" in garden.on
    assert garden.rs.run_state == RUN_STATE_ERROR
    assert garden.rs.last_error == "Could not turn off: switch.a"


@pytest.mark.asyncio
async def test_a_valve_that_would_not_close_is_tried_again_by_the_next_stop() -> None:
    garden = Garden(zone("a"))
    runtime = garden.runtime
    garden.hold("a")
    await runtime.async_run_zone("a", 10)
    await until(lambda: "switch.a" in garden.on)
    garden.failing_off = {"switch.a"}
    await runtime.async_stop_all()

    garden.failing_off = set()
    await runtime.async_stop_all()

    assert garden.on == set()
    assert garden.rs.run_state == RUN_STATE_IDLE
    assert garden.rs.last_error is None


@pytest.mark.asyncio
async def test_a_run_that_cannot_close_a_valve_at_its_end_ends_in_error() -> None:
    """Not only on Stop: a normal end with water still running is no clean end."""
    garden = Garden(zone("a"))
    garden.failing_off = {"switch.a"}

    await garden.runtime.async_run_phases([["a"]], scheduled=True, slot_ids=[])
    await until(garden.runtime._task.done)

    assert garden.rs.run_state == RUN_STATE_ERROR
    assert "switch.a" in garden.rs.last_error


# --- an error in one zone ---------------------------------------------------------


@pytest.mark.asyncio
async def test_a_zone_that_fails_does_not_leave_its_neighbour_running_behind_the_run() -> None:
    garden = Garden(zone("a"), zone("b"), max_parallel_zones=2)
    runtime = garden.runtime
    garden.failing_on = {"switch.a"}
    release_first_b = garden.hold("b")

    await runtime.async_run_phases([["a", "b"]], scheduled=True, slot_ids=[])
    await until(runtime._task.done)

    assert garden.rs.run_state == RUN_STATE_ERROR
    assert not [t for t in asyncio.all_tasks() if "_run_one_zone" in repr(t.get_coro())]
    # Zone b on its own afterwards is not closed by what is left of the first run.
    garden.failing_on = set()
    garden.hold("b")
    await runtime.async_run_zone("b", 30)
    await until(lambda: "switch.b" in garden.on and garden.rs.active_zone_ids == ["b"])
    release_first_b.set()
    await asyncio.sleep(0.1)
    assert "switch.b" in garden.on
    await runtime.async_stop_all()


@pytest.mark.asyncio
async def test_a_clean_up_that_fails_too_does_not_leave_the_run_on_stopping() -> None:
    garden = Garden(zone("a"))
    runtime = garden.runtime
    garden.failing_on = {"switch.a"}
    runtime._async_post_run = AsyncMock(side_effect=RuntimeError("script engine gone"))

    await runtime.async_run_phases([["a"]], scheduled=True, slot_ids=[])
    await until(runtime._task.done)

    assert garden.rs.run_state == RUN_STATE_ERROR
    assert not runtime.is_busy()


# --- the moment a run ends --------------------------------------------------------


@pytest.mark.asyncio
async def test_a_start_in_the_moment_a_run_ends_still_waters() -> None:
    """Idle is reported before the old run is quite gone; it must not take the new queue with it."""
    garden = Garden(zone("a"), zone("b"))
    runtime = garden.runtime
    started: list[bool] = []

    async def _store_write(rs):
        if rs.run_state == RUN_STATE_IDLE and not started and ("on", "switch.a") in garden.log:
            started.append(await runtime.async_run_phases([["b"]], scheduled=True, slot_ids=[]))
        await asyncio.sleep(0)

    garden.coordinator.async_update_run_state.side_effect = _store_write
    await runtime.async_run_phases([["a"]], scheduled=True, slot_ids=[])
    await until(lambda: started and runtime._task.done() and not runtime.is_busy())

    assert started == [True]
    assert ("on", "switch.b") in garden.log


# --- supplies ---------------------------------------------------------------------


@pytest.mark.asyncio
async def test_stop_while_a_joining_zone_s_supply_comes_up_opens_no_valve() -> None:
    garden = Garden(zone("a"), zone("c", VALVE, supply_lead_sec=30), max_parallel_zones=2)
    runtime = garden.runtime
    garden.hold("a")
    await runtime.async_run_zone("a", 10)
    await until(lambda: "switch.a" in garden.on)
    await runtime.async_run_zone("c", 10)
    await until(lambda: VALVE in garden.on)

    await runtime.async_stop_all()

    assert ("on", "switch.c") not in garden.log
    assert garden.on == set()


@pytest.mark.asyncio
async def test_a_zone_can_be_stopped_while_its_supply_comes_up() -> None:
    garden = Garden(zone("a", VALVE, supply_lead_sec=30))
    runtime = garden.runtime
    await runtime.async_run_phases([["a"]], scheduled=True, slot_ids=[])
    await until(lambda: VALVE in garden.on)

    await runtime.async_stop_zone("a")
    await runtime.async_skip_to_next_phase()  # nothing left to wait for
    await until(runtime._task.done)

    assert ("on", "switch.a") not in garden.log
    assert garden.on == set()


@pytest.mark.asyncio
async def test_a_supply_taken_out_of_the_zone_mid_run_is_still_let_go() -> None:
    """Released as it was taken, not as the zone is set by then."""
    a = zone("a", VALVE)
    garden = Garden(a, zone("b"))
    runtime = garden.runtime
    release = garden.hold("a")
    await runtime.async_run_phases([["a"], Soak(1800), ["b"]], scheduled=True, slot_ids=[])
    await until(lambda: "switch.a" in garden.on)

    a.supply_entity_ids = []
    release.set()
    await until(lambda: garden.rs.soak_until is not None)
    await asyncio.sleep(0.05)
    open_in_rest = set(garden.on)
    await runtime.async_stop_all()

    assert VALVE not in open_in_rest


# --- rests and zones that water nothing --------------------------------------------


def _slot_program(garden: Garden, **slot) -> list:
    slot_obj = ScheduleSlot(slot_id="s", weekdays=[0], time_local="06:00", **slot)
    garden.inst.schedule_slots = [slot_obj]
    return program_for_slot(slot_obj, garden.inst.zones, 1)


@pytest.mark.asyncio
async def test_a_zone_at_zero_minutes_does_not_double_the_rest_around_it() -> None:
    garden = Garden(zone("a"), zone("b"), zone("c"))
    runtime = garden.runtime
    rests: list[int] = []
    runtime._async_soak = AsyncMock(side_effect=rests.append)
    steps = _slot_program(
        garden,
        zone_ids_ordered=["a", "b", "c"],
        soak_between_phases_min=30,
        zone_minutes={"b": 0},
    )

    await runtime.async_run_phases(steps, scheduled=True, slot_ids=["s"])
    await until(runtime._task.done)

    assert rests == [30 * 60]
    assert [eid for what, eid in garden.log if what == "on"] == ["switch.a", "switch.c"]


@pytest.mark.asyncio
async def test_no_rest_before_a_last_zone_that_waters_nothing() -> None:
    garden = Garden(zone("a"), zone("b"))
    runtime = garden.runtime
    rests: list[int] = []
    runtime._async_soak = AsyncMock(side_effect=rests.append)
    steps = _slot_program(
        garden, zone_ids_ordered=["a", "b"], soak_between_phases_min=30, zone_minutes={"b": 0}
    )

    await runtime.async_run_phases(steps, scheduled=True, slot_ids=["s"])
    await until(runtime._task.done)

    assert rests == []


@pytest.mark.asyncio
async def test_a_supply_is_handed_over_a_zone_that_waters_nothing() -> None:
    garden = Garden(zone("a", VALVE), zone("b", VALVE), zone("c", VALVE))
    steps = _slot_program(garden, zone_ids_ordered=["a", "b", "c"], zone_minutes={"b": 0})

    await garden.runtime.async_run_phases(steps, scheduled=True, slot_ids=["s"])
    await until(garden.runtime._task.done)

    assert [what for what, eid in garden.log if eid == VALVE] == ["on", "off"]


@pytest.mark.asyncio
async def test_a_rest_ends_once_the_last_zone_behind_it_is_taken_out() -> None:
    garden = Garden(zone("a"), zone("b"), pre_start_switches=[PUMP])
    runtime = garden.runtime
    await runtime.async_run_phases([["a"], Soak(1800), ["b"]], scheduled=True, slot_ids=[])
    await until(lambda: garden.rs.soak_until is not None)

    await runtime.async_stop_zone("b")
    await until(runtime._task.done, timeout=3)

    assert garden.rs.run_state == RUN_STATE_IDLE
    # The pump does not come back up for nothing.
    assert [what for what, eid in garden.log if eid == PUMP] == ["on", "off"]


@pytest.mark.asyncio
async def test_taking_a_whole_phase_out_leaves_one_rest_not_two() -> None:
    garden = Garden(zone("a"), zone("b"), zone("c"))
    runtime = garden.runtime
    garden.hold("a")
    await runtime.async_run_phases(
        [["a"], Soak(600), ["b"], Soak(600), ["c"]], scheduled=True, slot_ids=[]
    )
    await until(lambda: "switch.a" in garden.on)

    await runtime.async_stop_zone("b")

    assert [type(step).__name__ for step in runtime._phase_queue] == ["Soak", "Phase"]
    await runtime.async_stop_all()


# --- Skip phase -------------------------------------------------------------------


@pytest.mark.asyncio
async def test_skip_phase_does_nothing_while_the_pump_builds_pressure() -> None:
    """Before the first zone there is no phase to skip, only the pump's lead."""
    garden = Garden(zone("a"), pre_start_switches=[PUMP], pre_start_delay_sec=1)
    runtime = garden.runtime
    garden.hold("a")
    await runtime.async_run_phases([["a"]], scheduled=False, slot_ids=[])
    await until(lambda: PUMP in garden.on)
    pump_on = time.monotonic()
    assert garden.rs.run_state == RUN_STATE_PREPARING

    assert await runtime.async_skip_to_next_phase() is False
    await until(lambda: "switch.a" in garden.on)

    assert time.monotonic() - pump_on >= 0.9
    await runtime.async_stop_all()


@pytest.mark.asyncio
async def test_skipping_a_rest_does_not_skip_the_pump_s_lead_after_it() -> None:
    garden = Garden(zone("a"), zone("b"), pre_start_switches=[PUMP])
    runtime = garden.runtime
    stamps: dict[str, float] = {}
    real_call = garden._call

    async def _call(domain, service, data=None, **kwargs):
        await real_call(domain, service, data, **kwargs)
        if service == "turn_on":
            stamps[data["entity_id"]] = time.monotonic()

    garden.hass.services.async_call.side_effect = _call
    garden.hold("b")
    await runtime.async_run_phases([["a"], Soak(1800), ["b"]], scheduled=True, slot_ids=[])
    await until(lambda: garden.rs.soak_until is not None)
    garden.inst.pre_start_delay_sec = 1

    assert await runtime.async_skip_to_next_phase() is True
    await until(lambda: "switch.b" in garden.on)

    assert stamps["switch.b"] - stamps[PUMP] >= 0.9
    await runtime.async_stop_all()


# --- a manual zone joining "Run this slot now" --------------------------------------


@pytest.mark.asyncio
async def test_a_zone_added_while_a_slot_run_prepares_follows_the_slot() -> None:
    """It used to replace the slot's whole program with itself."""
    garden = Garden(
        zone("a"), zone("b"), zone("c"), pre_start_switches=[PUMP], pre_start_delay_sec=30
    )
    garden.inst.schedule_slots = [
        ScheduleSlot(slot_id="s", weekdays=[0], time_local="06:00", zone_ids_ordered=["a", "b"])
    ]
    runtime = garden.runtime
    await runtime.async_run_schedule_slot("s")
    await until(lambda: PUMP in garden.on)

    await runtime.async_run_zone("c", 5)

    assert [list(step) for step in runtime._phase_queue] == [["a"], ["b"]]
    assert garden.rs.upcoming_phases == [["a"], ["b"], ["c"]]
    await runtime.async_stop_all()
