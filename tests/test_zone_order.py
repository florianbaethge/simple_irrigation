"""Persistent installation-level zone ordering."""

from __future__ import annotations

from custom_components.simple_irrigation.models import (
    Installation,
    ScheduleSlot,
    Zone,
    normalize_zone_order,
)
from custom_components.simple_irrigation.panel_api import _is_complete_zone_order


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


def test_round_trip_preserves_custom_order_without_reordering_a_schedule() -> None:
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


def test_reorder_api_requires_an_exact_current_permutation() -> None:
    inst = _installation()

    assert _is_complete_zone_order(["c", "a", "b"], inst)
    assert not _is_complete_zone_order(["c", "a"], inst)
    assert not _is_complete_zone_order(["c", "a", "a"], inst)
    assert not _is_complete_zone_order(["c", "a", "missing"], inst)
