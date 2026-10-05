"""Persistent installation-level zone ordering."""

from __future__ import annotations

from custom_components.simple_irrigation.models import (
    Installation,
    ScheduleSlot,
    Zone,
    normalize_zone_order,
)


def _zone(zone_id: str) -> Zone:
    return Zone(zone_id=zone_id, name=zone_id, switch_entity_ids=[f"switch.{zone_id}"])


def _installation(**changes) -> Installation:
    base = {
        "installation_id": "garden",
        "name": "Garden",
        "zones": {zone_id: _zone(zone_id) for zone_id in ("a", "b", "c")},
    }
    base.update(changes)
    return Installation(**base)


def test_legacy_installation_uses_creation_order_and_persists_it() -> None:
    raw = _installation().to_dict()
    raw.pop("zone_order")

    restored = Installation.from_dict(raw)

    assert restored.zone_order == ["a", "b", "c"]
    assert restored.to_dict()["zone_order"] == ["a", "b", "c"]


def test_normalize_drops_stale_and_duplicate_ids_then_appends_missing() -> None:
    inst = _installation()

    assert normalize_zone_order(["c", "missing", "c", "a"], inst.zones) == [
        "c",
        "a",
        "b",
    ]


def test_round_trip_keeps_the_order_and_leaves_slot_run_orders_alone() -> None:
    slot = ScheduleSlot(
        slot_id="morning",
        weekdays=[0],
        time_local="06:00",
        zone_ids_ordered=["b", "a"],
    )
    inst = _installation(zone_order=["c", "a", "b"], schedule_slots=[slot])

    restored = Installation.from_dict(inst.to_dict())

    assert restored.ordered_zone_ids() == ["c", "a", "b"]
    assert restored.schedule_slots[0].zone_ids_ordered == ["b", "a"]


def test_set_zone_order_adopts_a_permutation_of_the_current_zones() -> None:
    inst = _installation()

    assert inst.set_zone_order(["c", "a", "b"])
    assert inst.ordered_zone_ids() == ["c", "a", "b"]


def test_set_zone_order_refuses_a_list_from_a_changed_zone_set() -> None:
    """Another tab added or deleted a zone while this one was being dragged."""
    inst = _installation(zone_order=["b", "a", "c"])

    for stale in (["c", "a"], ["c", "a", "a"], ["c", "a", "missing"], ["c", "a", "b", "d"]):
        assert not inst.set_zone_order(stale)
    assert inst.ordered_zone_ids() == ["b", "a", "c"]


def test_a_new_zone_lands_at_the_end_of_a_custom_order() -> None:
    inst = _installation(zone_order=["c", "a", "b"])

    inst.zones["d"] = _zone("d")

    assert inst.ordered_zone_ids() == ["c", "a", "b", "d"]
    assert inst.to_dict()["zone_order"] == ["c", "a", "b", "d"]


def test_a_deleted_zone_leaves_the_rest_of_the_order_in_place() -> None:
    inst = _installation(zone_order=["c", "a", "b"])

    inst.zones.pop("a")

    assert inst.ordered_zone_ids() == ["c", "b"]
    assert inst.to_dict()["zone_order"] == ["c", "b"]
