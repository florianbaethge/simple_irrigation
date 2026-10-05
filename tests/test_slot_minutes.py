"""Fixed minutes: how long a zone waters in one schedule, whatever the mode.

A slot may fix the minutes of any of its zones; a zone it says nothing about
follows the mode. The run plan only remembers which slot a phase came from, so
the minutes are read when the zone opens -- late enough for a pre-start script
or an automation to have set them.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.simple_irrigation.card_api import _slot_duration_min, _slot_water_l
from custom_components.simple_irrigation.const import MAX_ZONE_DURATION_MIN
from custom_components.simple_irrigation.models import (
    Installation,
    RunState,
    ScheduleSlot,
    Zone,
    parse_zone_minutes,
)
from custom_components.simple_irrigation.panel_api import _apply_slot_zone_minutes
from custom_components.simple_irrigation.program import (
    Phase,
    Soak,
    expand_program,
    phase_slot_id,
    watering_steps,
)
from custom_components.simple_irrigation.runtime import IrrigationRuntime, _copy_steps


def _zone(zid: str, **kwargs) -> Zone:
    base = {
        "zone_id": zid,
        "name": zid,
        "switch_entity_ids": [f"switch.{zid}"],
        "duration_eco_min": 10,
        "duration_normal_min": 15,
        "duration_extra_min": 20,
    }
    base.update(kwargs)
    return Zone(**base)


def _slot(slot_id: str, zone_ids: list[str], **kwargs) -> ScheduleSlot:
    return ScheduleSlot(
        slot_id=slot_id, weekdays=[0], time_local="06:00", zone_ids_ordered=zone_ids, **kwargs
    )


def _installation(*slots: ScheduleSlot, **kwargs) -> Installation:
    base = {
        "installation_id": "i1",
        "name": "Garden",
        "zones": {zid: _zone(zid) for zid in ("z1", "z2")},
        "schedule_slots": list(slots),
        "max_parallel_zones": 1,
    }
    base.update(kwargs)
    return Installation(**base)


# --- the slot ------------------------------------------------------------------


def test_a_zone_without_fixed_minutes_follows_the_mode() -> None:
    slot = _slot("am", ["z1", "z2"], zone_minutes={"z1": 4})

    assert slot.duration_for(_zone("z1"), "extra") == 4
    assert slot.duration_for(_zone("z2"), "eco") == 10
    assert slot.duration_for(_zone("z2"), "extra") == 20


def test_zero_minutes_are_fixed_minutes_too() -> None:
    slot = _slot("am", ["z1"], zone_minutes={"z1": 0})

    assert slot.duration_for(_zone("z1"), "normal") == 0


def test_a_slot_from_before_fixed_minutes_existed_has_none() -> None:
    raw = _slot("am", ["z1"]).to_dict()
    raw.pop("zone_minutes")

    assert ScheduleSlot.from_dict(raw).zone_minutes == {}


def test_fixed_minutes_survive_the_store() -> None:
    slot = _slot("am", ["z1", "z2"], zone_minutes={"z2": 7})

    assert ScheduleSlot.from_dict(slot.to_dict()).zone_minutes == {"z2": 7}


def test_minutes_are_kept_for_the_slots_own_zones_and_within_range() -> None:
    raw = {"z1": 999, "z2": -5, "gone": 8, "z3": "soon", "z4": True}

    assert parse_zone_minutes(raw, ["z1", "z2", "z3", "z4"]) == {
        "z1": MAX_ZONE_DURATION_MIN,
        "z2": 0,
    }
    assert parse_zone_minutes(None, ["z1"]) == {}


def test_a_zone_that_leaves_the_slot_takes_its_minutes_along() -> None:
    """Otherwise they would come back to life when the zone is added again."""
    slot = _slot("am", ["z1", "z2"], zone_minutes={"z1": 4, "z2": 7})

    slot.zone_ids_ordered = ["z2"]
    _apply_slot_zone_minutes(slot, {})

    assert slot.zone_minutes == {"z2": 7}


def test_a_payload_replaces_the_fixed_minutes() -> None:
    slot = _slot("am", ["z1", "z2"], zone_minutes={"z1": 4})

    _apply_slot_zone_minutes(slot, {"zone_minutes": {"z2": 9, "elsewhere": 3}})

    assert slot.zone_minutes == {"z2": 9}


# --- the plan ------------------------------------------------------------------


def test_every_phase_of_a_slot_knows_its_slot() -> None:
    slot = _slot("am", ["z1", "z2"], repetitions=2, soak_between_repetitions_min=5)

    steps = expand_program([["z1"], ["z2"]], slot)

    assert [phase_slot_id(s) for s in steps if not isinstance(s, Soak)] == ["am"] * 4
    # Read as plain lists by everything that only wants the zones.
    assert watering_steps(steps) == [["z1"], ["z2"], ["z1"], ["z2"]]


def test_a_manual_phase_belongs_to_no_slot() -> None:
    assert phase_slot_id(["z1"]) is None


def test_the_runs_own_copy_of_the_plan_keeps_the_slots() -> None:
    steps = [Phase(["z1"], "am"), Soak(60), ["z2"]]

    copied = _copy_steps(steps)

    assert [phase_slot_id(s) for s in copied] == ["am", None, None]
    assert copied[0] is not steps[0]


# --- the run -------------------------------------------------------------------


def _runtime(inst: Installation) -> tuple[IrrigationRuntime, list[tuple[str, int]]]:
    """A runtime that records (zone, minutes) instead of opening anything."""
    hass = MagicMock()
    hass.services.async_call = AsyncMock()
    coordinator = MagicMock()
    coordinator.installation = inst
    coordinator.run_state = RunState()
    coordinator.async_update_run_state = AsyncMock()
    runtime = IrrigationRuntime(hass, coordinator)
    ran: list[tuple[str, int]] = []

    async def _zone_run(zone: Zone, duration_min: int) -> None:
        ran.append((zone.zone_id, duration_min))

    runtime._async_zone_run = _zone_run
    return runtime, ran


@pytest.mark.asyncio
async def test_a_zone_waters_for_the_minutes_its_slot_fixes() -> None:
    inst = _installation(_slot("am", ["z1", "z2"], zone_minutes={"z1": 4}))
    runtime, ran = _runtime(inst)

    await runtime._async_run_phase_expandable(Phase(["z1"], "am"), "normal")
    await runtime._async_run_phase_expandable(Phase(["z2"], "am"), "normal")

    assert ran == [("z1", 4), ("z2", 15)]


@pytest.mark.asyncio
async def test_the_minutes_are_read_when_the_zone_opens_not_when_the_run_is_planned() -> None:
    """A pre-start script sets them after the plan exists."""
    slot = _slot("am", ["z1"])
    runtime, ran = _runtime(_installation(slot))
    plan = expand_program([["z1"]], slot)

    slot.zone_minutes["z1"] = 6
    await runtime._async_run_phase_expandable(plan[0], "normal")

    assert ran == [("z1", 6)]


@pytest.mark.asyncio
async def test_two_slots_due_together_keep_their_own_minutes_for_the_same_zone() -> None:
    short = _slot("short", ["z1"], zone_minutes={"z1": 3})
    long = _slot("long", ["z1"], zone_minutes={"z1": 30})
    runtime, ran = _runtime(_installation(short, long))

    for step in expand_program([["z1"]], short) + expand_program([["z1"]], long):
        await runtime._async_run_phase_expandable(step, "normal")

    assert ran == [("z1", 3), ("z1", 30)]


@pytest.mark.asyncio
async def test_a_zone_with_no_minutes_is_not_opened() -> None:
    """Zero means leave it out; opening the valve for an instant is not that."""
    inst = _installation(_slot("am", ["z1", "z2"], zone_minutes={"z1": 0}))
    inst.zones["z2"].duration_normal_min = 0
    runtime, ran = _runtime(inst)

    await runtime._async_run_phase_expandable(Phase(["z1"], "am"), "normal")
    await runtime._async_run_phase_expandable(["z2"], "normal")

    assert ran == []


@pytest.mark.asyncio
async def test_a_manual_run_brings_its_own_duration_past_the_slot() -> None:
    inst = _installation(_slot("am", ["z1"], zone_minutes={"z1": 4}))
    runtime, ran = _runtime(inst)
    runtime._duration_overrides = {"z1": 9}

    await runtime._async_run_phase_expandable(["z1"], "normal")

    assert ran == [("z1", 9)]


@pytest.mark.asyncio
async def test_a_deleted_slot_falls_back_to_the_mode() -> None:
    runtime, ran = _runtime(_installation())

    await runtime._async_run_phase_expandable(Phase(["z1"], "gone"), "extra")

    assert ran == [("z1", 20)]


def test_dropping_a_queued_zone_leaves_the_phase_with_its_slot() -> None:
    runtime, _ran = _runtime(_installation())
    runtime._phase_queue = [Phase(["z1", "z2"], "am")]

    runtime._discard_queued_zone("z1")

    assert runtime._phase_queue == [["z2"]]
    assert phase_slot_id(runtime._phase_queue[0]) == "am"


# --- the estimates ---------------------------------------------------------------


def test_a_slots_length_counts_its_fixed_minutes() -> None:
    slot = _slot("am", ["z1", "z2"], zone_minutes={"z1": 4})
    inst = _installation(slot)

    assert _slot_duration_min(inst, slot) == 4 + 15


def test_a_slots_water_forecast_counts_its_fixed_minutes() -> None:
    slot = _slot("am", ["z1"], zone_minutes={"z1": 4})
    inst = _installation(slot)
    inst.zones["z1"].flow_rate_lpm = 10

    assert _slot_water_l(inst, slot) == 40
