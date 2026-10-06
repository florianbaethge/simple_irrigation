"""The order of an installation's zones, as arranged on the Zones tab."""

from __future__ import annotations

from custom_components.simple_irrigation.models import Installation, ScheduleSlot, Zone


def _zone(zone_id: str) -> Zone:
    return Zone(zone_id=zone_id, name=zone_id, switch_entity_ids=[f"switch.{zone_id}"])


def _installation(order: tuple[str, ...] = ("a", "b", "c"), **changes) -> Installation:
    return Installation(
        installation_id="garden",
        name="Garden",
        zones={zone_id: _zone(zone_id) for zone_id in order},
        **changes,
    )


def test_a_store_from_before_the_order_existed_keeps_its_creation_order() -> None:
    raw = _installation().to_dict()
    raw.pop("zone_order")

    restored = Installation.from_dict(raw)

    assert list(restored.zones) == ["a", "b", "c"]
    assert restored.to_dict()["zone_order"] == ["a", "b", "c"]


def test_the_saved_list_decides_even_when_the_zones_object_lost_its_key_order() -> None:
    """A JSON object's key order does not survive every tool; the list does."""
    raw = _installation(("c", "a", "b")).to_dict()
    raw["zones"] = dict(sorted(raw["zones"].items()))

    assert list(Installation.from_dict(raw).zones) == ["c", "a", "b"]


def test_loading_ignores_unknown_and_repeated_ids_and_appends_unlisted_zones() -> None:
    raw = _installation().to_dict()
    raw["zone_order"] = ["c", "missing", "c", "a"]

    assert list(Installation.from_dict(raw).zones) == ["c", "a", "b"]


def test_the_zones_object_is_written_in_order_for_versions_that_only_read_that() -> None:
    """After a downgrade the list is ignored, and the arrangement is still there."""
    inst = _installation()
    inst.set_zone_order(["c", "a", "b"])

    assert list(inst.to_dict()["zones"]) == ["c", "a", "b"]


def test_round_trip_keeps_the_order_and_leaves_slot_run_orders_alone() -> None:
    slot = ScheduleSlot(
        slot_id="morning",
        weekdays=[0],
        time_local="06:00",
        zone_ids_ordered=["b", "a"],
    )
    inst = _installation(("c", "a", "b"), schedule_slots=[slot])

    restored = Installation.from_dict(inst.to_dict())

    assert list(restored.zones) == ["c", "a", "b"]
    assert restored.schedule_slots[0].zone_ids_ordered == ["b", "a"]


def test_set_zone_order_rearranges_the_zones_it_was_given() -> None:
    inst = _installation()
    zones = inst.zones

    assert inst.set_zone_order(["c", "a", "b"])
    assert list(inst.zones) == ["c", "a", "b"]
    # Rearranged in place: whoever holds the dict sees the new order too.
    assert inst.zones is zones


def test_set_zone_order_refuses_a_list_from_a_changed_zone_set() -> None:
    """Another tab added or deleted a zone while this one was being dragged."""
    inst = _installation(("b", "a", "c"))

    for stale in (["c", "a"], ["c", "a", "a"], ["c", "a", "missing"], ["c", "a", "b", "d"]):
        assert not inst.set_zone_order(stale)
    assert list(inst.zones) == ["b", "a", "c"]


def test_a_new_zone_lands_at_the_end_of_a_custom_order() -> None:
    inst = _installation(("c", "a", "b"))

    inst.zones["d"] = _zone("d")

    assert inst.to_dict()["zone_order"] == ["c", "a", "b", "d"]


def test_a_deleted_zone_leaves_the_rest_of_the_order_in_place() -> None:
    inst = _installation(("c", "a", "b"))

    inst.zones.pop("a")

    assert inst.to_dict()["zone_order"] == ["c", "b"]
