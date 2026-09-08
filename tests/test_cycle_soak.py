"""Cycle & Soak: repeat a slot's phases with rests in between.

The runtime must not grow a second code path for repeated slots. A slot's
program is expanded into the same queue the runtime already walks -- phases
plus soak steps -- so Stop, Skip phase, manual zones and the phase counter
keep behaving exactly as they do for a plain run.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.simple_irrigation.card_api import _slot_duration_min
from custom_components.simple_irrigation.const import MAX_REPETITIONS, MAX_SOAK_MIN
from custom_components.simple_irrigation.models import (
    Installation,
    RunState,
    ScheduleSlot,
    Zone,
)
from custom_components.simple_irrigation.panel_api import (
    _apply_slot_cycle_soak,
    _copy_slot_cycle_soak,
)
from custom_components.simple_irrigation.program import (
    Soak,
    expand_program,
    soak_minutes,
    watering_steps,
)
from custom_components.simple_irrigation.runtime import IrrigationRuntime
from custom_components.simple_irrigation.scheduler import program_for_slot

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _zone(zone_id: str, minutes: int = 10, **kw) -> Zone:
    return Zone(
        zone_id=zone_id,
        name=zone_id,
        switch_entity_ids=[f"switch.{zone_id}"],
        duration_normal_min=minutes,
        duration_eco_min=minutes,
        duration_extra_min=minutes,
        **kw,
    )


def _slot(zone_ids: list[str], **kw) -> ScheduleSlot:
    return ScheduleSlot(
        slot_id="s1",
        weekdays=[0],
        time_local="06:00",
        zone_ids_ordered=zone_ids,
        **kw,
    )


def _installation(zones: dict[str, Zone], **kw) -> Installation:
    base = {"installation_id": "i1", "name": "Garden", "zones": zones, "max_parallel_zones": 1}
    base.update(kw)
    return Installation(**base)


# ---------------------------------------------------------------------------
# model
# ---------------------------------------------------------------------------


def test_a_slot_is_a_plain_run_by_default() -> None:
    slot = _slot(["z1"])
    assert slot.repetitions == 1
    assert slot.soak_between_phases_min == 0
    assert slot.soak_between_repetitions_min == 0
    assert not slot.cycle_soak


def test_slots_stored_before_cycle_soak_load_as_plain_runs() -> None:
    slot = ScheduleSlot.from_dict({"slot_id": "s", "weekdays": [0], "time_local": "06:00"})
    assert slot.repetitions == 1
    assert not slot.cycle_soak


def test_cycle_soak_round_trips_through_the_store() -> None:
    slot = _slot(["z1"], repetitions=3, soak_between_phases_min=5, soak_between_repetitions_min=20)
    loaded = ScheduleSlot.from_dict(slot.to_dict())
    assert loaded.repetitions == 3
    assert loaded.soak_between_phases_min == 5
    assert loaded.soak_between_repetitions_min == 20
    assert loaded.cycle_soak


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ({"repetitions": 0}, 1),
        ({"repetitions": -4}, 1),
        ({"repetitions": MAX_REPETITIONS + 50}, MAX_REPETITIONS),
        ({"repetitions": "three"}, 1),
        ({"repetitions": None}, 1),
    ],
)
def test_repetitions_are_clamped_on_load(raw: dict, expected: int) -> None:
    data = {"slot_id": "s", "weekdays": [0], "time_local": "06:00", **raw}
    assert ScheduleSlot.from_dict(data).repetitions == expected


def test_soaks_are_clamped_on_load() -> None:
    data = {
        "slot_id": "s",
        "weekdays": [0],
        "time_local": "06:00",
        "soak_between_phases_min": -1,
        "soak_between_repetitions_min": MAX_SOAK_MIN * 10,
    }
    slot = ScheduleSlot.from_dict(data)
    assert slot.soak_between_phases_min == 0
    assert slot.soak_between_repetitions_min == MAX_SOAK_MIN


def test_soak_until_is_serialized_but_never_restored() -> None:
    from datetime import UTC, datetime

    rs = RunState(soak_until=datetime(2026, 9, 8, 6, 0, tzinfo=UTC))
    data = rs.to_dict()
    assert data["soak_until"] == "2026-09-08T06:00:00+00:00"
    assert RunState.from_dict(data).soak_until is None


# ---------------------------------------------------------------------------
# program expansion
# ---------------------------------------------------------------------------


def test_a_plain_slot_expands_to_its_phases_only() -> None:
    steps = expand_program([["z1"], ["z2"]], _slot(["z1", "z2"]))
    assert steps == [["z1"], ["z2"]]


def test_repetitions_repeat_every_phase_in_order() -> None:
    slot = _slot(["z1", "z2"], repetitions=2)
    assert expand_program([["z1"], ["z2"]], slot) == [["z1"], ["z2"], ["z1"], ["z2"]]


def test_soaks_sit_between_phases_and_between_passes() -> None:
    slot = _slot(
        ["z1", "z2"], repetitions=2, soak_between_phases_min=5, soak_between_repetitions_min=30
    )
    assert expand_program([["z1"], ["z2"]], slot) == [
        ["z1"],
        Soak(300),
        ["z2"],
        Soak(1800),
        ["z1"],
        Soak(300),
        ["z2"],
    ]


def test_a_single_zone_soaks_only_between_passes() -> None:
    """The classic cycle-and-soak: one lawn, three short passes."""
    slot = _slot(["z1"], repetitions=3, soak_between_phases_min=5, soak_between_repetitions_min=10)
    assert expand_program([["z1"]], slot) == [["z1"], Soak(600), ["z1"], Soak(600), ["z1"]]


def test_zero_minute_soaks_are_left_out() -> None:
    slot = _slot(["z1", "z2"], repetitions=2, soak_between_repetitions_min=0)
    steps = expand_program([["z1"], ["z2"]], slot)
    assert not any(isinstance(s, Soak) for s in steps)


def test_a_program_never_starts_or_ends_on_a_soak() -> None:
    slot = _slot(["z1"], repetitions=3, soak_between_phases_min=9, soak_between_repetitions_min=9)
    steps = expand_program([["z1"]], slot)
    assert not isinstance(steps[0], Soak)
    assert not isinstance(steps[-1], Soak)


def test_no_phases_means_no_program() -> None:
    assert expand_program([], _slot([], repetitions=5, soak_between_repetitions_min=10)) == []


def test_watering_steps_drop_the_soaks_and_copy_the_phases() -> None:
    steps = [["z1"], Soak(60), ["z2"]]
    phases = watering_steps(steps)
    assert phases == [["z1"], ["z2"]]
    phases[0].append("x")
    assert steps[0] == ["z1"]


def test_program_for_slot_skips_disabled_zones_before_repeating() -> None:
    zones = {"z1": _zone("z1"), "z2": _zone("z2", enabled=False)}
    slot = _slot(["z1", "z2"], repetitions=2, soak_between_repetitions_min=1)
    assert program_for_slot(slot, zones, 1) == [["z1"], Soak(60), ["z1"]]


# ---------------------------------------------------------------------------
# duration estimate
# ---------------------------------------------------------------------------


def test_soak_minutes_count_every_rest() -> None:
    slot = _slot([], repetitions=3, soak_between_phases_min=5, soak_between_repetitions_min=20)
    # 2 phases: one 5-min rest per pass x 3 passes, plus 2 rests of 20 between passes.
    assert soak_minutes(2, slot) == 3 * 5 + 2 * 20
    assert soak_minutes(0, slot) == 0


def test_slot_duration_includes_repetitions_and_soaks() -> None:
    zones = {"z1": _zone("z1", 10), "z2": _zone("z2", 6)}
    inst = _installation(zones)
    plain = _slot(["z1", "z2"])
    assert _slot_duration_min(inst, plain) == 16
    soaked = _slot(
        ["z1", "z2"], repetitions=2, soak_between_phases_min=5, soak_between_repetitions_min=30
    )
    assert _slot_duration_min(inst, soaked) == 16 * 2 + 5 * 2 + 30


def test_slot_duration_is_zero_without_runnable_zones() -> None:
    inst = _installation({"z1": _zone("z1", enabled=False)})
    slot = _slot(["z1"], repetitions=4, soak_between_repetitions_min=30)
    assert _slot_duration_min(inst, slot) == 0


# ---------------------------------------------------------------------------
# panel api helpers
# ---------------------------------------------------------------------------


def test_the_panel_payload_sets_cycle_soak_and_absent_keys_keep_theirs() -> None:
    slot = _slot(["z1"], repetitions=2, soak_between_repetitions_min=15)
    _apply_slot_cycle_soak(slot, {"soak_between_phases_min": 3})
    assert (slot.repetitions, slot.soak_between_phases_min, slot.soak_between_repetitions_min) == (
        2,
        3,
        15,
    )
    _apply_slot_cycle_soak(
        slot, {"repetitions": 1, "soak_between_phases_min": 0, "soak_between_repetitions_min": 0}
    )
    assert not slot.cycle_soak


def test_derived_slots_inherit_cycle_soak() -> None:
    src = _slot(["z1"], repetitions=3, soak_between_phases_min=2, soak_between_repetitions_min=8)
    dst = _slot(["z1"])
    _copy_slot_cycle_soak(src, dst)
    assert dst.to_dict()["repetitions"] == 3
    assert dst.soak_between_phases_min == 2
    assert dst.soak_between_repetitions_min == 8


# ---------------------------------------------------------------------------
# runtime
# ---------------------------------------------------------------------------


def _hass(calls: list[tuple[str, str]]) -> MagicMock:
    """hass recording (service, entity_id) for every call, in order."""
    hass = MagicMock()

    async def _call(domain, service, data=None, **kwargs):
        calls.append((service, str((data or {}).get("entity_id", ""))))

    hass.services.async_call = AsyncMock(side_effect=_call)
    hass.async_create_task = lambda coro, name=None: asyncio.ensure_future(coro)
    return hass


def _runtime(hass: MagicMock, inst: Installation) -> IrrigationRuntime:
    coordinator = MagicMock()
    coordinator.installation = inst
    coordinator.run_state = RunState()
    coordinator.async_update_run_state = AsyncMock()
    return IrrigationRuntime(hass, coordinator)


async def _wait_until(predicate, timeout: float = 5.0) -> None:
    for _ in range(int(timeout / 0.01)):
        if predicate():
            return
        await asyncio.sleep(0.01)
    raise AssertionError("condition not met in time")


async def _wait_for_idle(runtime: IrrigationRuntime) -> None:
    await _wait_until(lambda: runtime._task is not None and runtime._task.done())


@pytest.mark.asyncio
async def test_the_run_rests_between_passes_with_the_zone_closed() -> None:
    """z1 on, off, soak, z1 on, off -- and the pump is off while it rests."""
    calls: list[tuple[str, str]] = []
    zones = {"z1": _zone("z1", 0)}
    inst = _installation(zones, pre_start_switches=["switch.pump"], pre_start_delay_sec=0)
    runtime = _runtime(_hass(calls), inst)

    await runtime.async_run_phases([["z1"], Soak(1), ["z1"]], scheduled=True, slot_ids=[])
    await _wait_until(lambda: runtime.coordinator.run_state.soak_until is not None)
    # Resting: zone and pump both closed.
    assert calls[-2:] == [("turn_off", "switch.z1"), ("turn_off", "switch.pump")]
    assert runtime.coordinator.run_state.active_zone_ids == []
    assert runtime.coordinator.run_state.upcoming_phases == [["z1"]]

    await _wait_for_idle(runtime)
    assert runtime.coordinator.run_state.soak_until is None
    # The pump came back before the second pass, the zone ran again.
    after_rest = calls[calls.index(("turn_off", "switch.pump")) + 1 :]
    assert after_rest[:2] == [("turn_on", "switch.pump"), ("turn_on", "switch.z1")]


@pytest.mark.asyncio
async def test_the_phase_counter_ignores_soaks() -> None:
    calls: list[tuple[str, str]] = []
    zones = {"z1": _zone("z1", 0), "z2": _zone("z2", 0)}
    runtime = _runtime(_hass(calls), _installation(zones))
    rs = runtime.coordinator.run_state
    seen: list[tuple[int, list[list[str]]]] = []
    runtime.coordinator.async_update_run_state = AsyncMock(
        side_effect=lambda state: seen.append((state.phase_index, list(state.upcoming_phases)))
    )

    await runtime.async_run_phases([["z1"], Soak(1), ["z2"]], scheduled=True, slot_ids=[])
    await _wait_for_idle(runtime)

    indices = sorted({idx for idx, _ in seen})
    assert indices == [0, 1, 2]
    # While resting after phase 1 the queue still says phase 2 is coming.
    assert (1, [["z2"]]) in seen
    assert rs.phase_index == 0  # reset when the run finished


@pytest.mark.asyncio
async def test_skip_phase_cuts_a_rest_short() -> None:
    calls: list[tuple[str, str]] = []
    zones = {"z1": _zone("z1", 0)}
    runtime = _runtime(_hass(calls), _installation(zones))

    await runtime.async_run_phases([["z1"], Soak(600), ["z1"]], scheduled=True, slot_ids=[])
    await _wait_until(lambda: runtime.coordinator.run_state.soak_until is not None)
    assert await runtime.async_skip_to_next_phase()
    await _wait_for_idle(runtime)

    assert calls.count(("turn_on", "switch.z1")) == 2


@pytest.mark.asyncio
async def test_skipping_a_phase_skips_the_rest_after_it_too() -> None:
    """Whoever skips wants the next zone now, not ten minutes of nothing."""
    calls: list[tuple[str, str]] = []
    zones = {"z1": _zone("z1", 60), "z2": _zone("z2", 0)}
    runtime = _runtime(_hass(calls), _installation(zones))

    await runtime.async_run_phases([["z1"], Soak(600), ["z2"]], scheduled=True, slot_ids=[])
    await _wait_until(lambda: ("turn_on", "switch.z1") in calls)
    assert await runtime.async_skip_to_next_phase()
    await _wait_for_idle(runtime)

    assert ("turn_on", "switch.z2") in calls
    assert runtime.coordinator.run_state.soak_until is None


@pytest.mark.asyncio
async def test_stop_during_a_rest_ends_the_run() -> None:
    calls: list[tuple[str, str]] = []
    zones = {"z1": _zone("z1", 0)}
    runtime = _runtime(_hass(calls), _installation(zones))

    await runtime.async_run_phases([["z1"], Soak(600), ["z1"]], scheduled=True, slot_ids=[])
    await _wait_until(lambda: runtime.coordinator.run_state.soak_until is not None)
    await runtime.async_stop_all()

    assert runtime.coordinator.run_state.soak_until is None
    assert runtime.coordinator.run_state.run_state == "idle"
    assert calls.count(("turn_on", "switch.z1")) == 1


@pytest.mark.asyncio
async def test_a_rest_with_nothing_behind_it_is_dropped() -> None:
    """stop_zone removed the last phase: the run ends now, not after the soak."""
    calls: list[tuple[str, str]] = []
    zones = {"z1": _zone("z1", 60), "z2": _zone("z2", 0)}
    runtime = _runtime(_hass(calls), _installation(zones))

    await runtime.async_run_phases([["z1"], Soak(600), ["z2"]], scheduled=True, slot_ids=[])
    await _wait_until(lambda: ("turn_on", "switch.z1") in calls)
    await runtime.async_stop_zone("z2")
    await runtime.async_stop_zone("z1")
    await _wait_for_idle(runtime)

    assert ("turn_on", "switch.z2") not in calls
    assert runtime.coordinator.run_state.soak_until is None


@pytest.mark.asyncio
async def test_a_zone_can_still_be_stopped_around_a_rest() -> None:
    """The soak in the queue is not a zone and must not confuse stop_zone."""
    calls: list[tuple[str, str]] = []
    zones = {"z1": _zone("z1", 60), "z2": _zone("z2", 60)}
    runtime = _runtime(_hass(calls), _installation(zones))

    await runtime.async_run_phases([["z1"], Soak(1), ["z2"]], scheduled=True, slot_ids=[])
    await _wait_until(lambda: ("turn_on", "switch.z1") in calls)
    await runtime.async_stop_zone("z2")
    assert runtime._phase_queue == [Soak(1)]
    assert runtime.coordinator.run_state.upcoming_phases == []
    await runtime.async_stop_all()


@pytest.mark.asyncio
async def test_run_this_slot_now_uses_the_slots_program() -> None:
    calls: list[tuple[str, str]] = []
    zones = {"z1": _zone("z1", 0)}
    slot = _slot(["z1"], repetitions=2, soak_between_repetitions_min=1)
    inst = _installation(zones, schedule_slots=[slot])
    runtime = _runtime(_hass(calls), inst)

    await runtime.async_run_schedule_slot("s1")
    assert [s for s in runtime._phase_queue if isinstance(s, Soak)] == [Soak(60)]
    await runtime.async_stop_all()
