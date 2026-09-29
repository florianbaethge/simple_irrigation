"""Schedule-specific runtimes remain local to each scheduled occurrence."""

from custom_components.simple_irrigation.card_api import _slot_duration_min
from custom_components.simple_irrigation.models import Installation, ScheduleSlot, Zone
from custom_components.simple_irrigation.program import PlannedZone, watering_steps
from custom_components.simple_irrigation.scheduler import program_for_slot
from custom_components.simple_irrigation.validation import (
    schedule_specific_incomplete_slots,
    validate_mode_for_installation,
)


def _zone(zone_id: str, normal: int = 10) -> Zone:
    return Zone(
        zone_id=zone_id,
        name=zone_id,
        switch_entity_ids=[f"switch.{zone_id}"],
        duration_eco_min=5,
        duration_normal_min=normal,
        duration_extra_min=20,
    )


def _installation(slot: ScheduleSlot) -> Installation:
    return Installation(
        installation_id="i1",
        name="Garden",
        zones={"z1": _zone("z1"), "z2": _zone("z2")},
        schedule_slots=[slot],
        mode="schedule_specific",
        max_parallel_zones=1,
    )


def test_duration_map_round_trips_without_affecting_legacy_slots() -> None:
    slot = ScheduleSlot(
        slot_id="s1",
        weekdays=[0],
        time_local="06:00",
        zone_ids_ordered=["z1"],
        zone_durations_min={"z1": 17},
    )

    restored = ScheduleSlot.from_dict(slot.to_dict())

    assert restored.zone_durations_min == {"z1": 17}
    assert ScheduleSlot.from_dict(
        {"slot_id": "old", "weekday": 0, "time_local": "06:00"}
    ).zone_durations_min == {}


def test_mode_transition_rejects_enabled_incomplete_slots() -> None:
    slot = ScheduleSlot(
        slot_id="s1",
        weekdays=[0],
        time_local="06:00",
        zone_ids_ordered=["z1", "z2"],
        zone_durations_min={"z1": 12},
    )
    inst = _installation(slot)

    assert schedule_specific_incomplete_slots(inst) == [slot]
    assert (
        validate_mode_for_installation(inst, "schedule_specific")
        == "schedule_durations_incomplete"
    )
    slot.enabled = False
    assert validate_mode_for_installation(inst, "schedule_specific") is None


def test_program_carries_each_slots_own_duration() -> None:
    slot = ScheduleSlot(
        slot_id="s1",
        weekdays=[0],
        time_local="06:00",
        zone_ids_ordered=["z1", "z2"],
        zone_durations_min={"z1": 7, "z2": 13},
    )
    inst = _installation(slot)

    program = program_for_slot(slot, inst.zones, 1, "schedule_specific")

    assert program == [[PlannedZone("z1", 7)], [PlannedZone("z2", 13)]]
    # Run-state/UI compatibility: planned objects never leak into snapshots.
    assert watering_steps(program) == [["z1"], ["z2"]]


def test_slot_estimate_uses_schedule_specific_durations() -> None:
    slot = ScheduleSlot(
        slot_id="s1",
        weekdays=[0],
        time_local="06:00",
        zone_ids_ordered=["z1", "z2"],
        zone_durations_min={"z1": 7, "z2": 13},
    )
    inst = _installation(slot)

    assert _slot_duration_min(inst, slot) == 20
