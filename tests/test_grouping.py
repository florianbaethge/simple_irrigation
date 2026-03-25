"""Tests for phase grouping."""

from __future__ import annotations

from custom_components.simple_irrigation.grouping import compute_phases
from custom_components.simple_irrigation.models import Zone


def _z(zid: str, exclusive: bool = False) -> Zone:
    return Zone(
        zone_id=zid,
        name=zid,
        switch_entity_ids=[f"switch.{zid}"],
        exclusive=exclusive,
    )


def test_grouping_exclusive_and_parallel() -> None:
    """Example: max 2, zone b exclusive."""
    zones = {
        "a": _z("a", False),
        "b": _z("b", True),
        "c": _z("c", False),
        "d": _z("d", False),
        "e": _z("e", False),
    }
    order = ["a", "b", "c", "d", "e"]
    phases = compute_phases(order, zones, 2, skip_disabled=True)
    assert phases == [["a"], ["b"], ["c", "d"], ["e"]]


def test_grouping_reorder_groups_parallel() -> None:
    """Move e after a → [a,e] parallel."""
    zones = {
        "a": _z("a", False),
        "b": _z("b", True),
        "c": _z("c", False),
        "d": _z("d", False),
        "e": _z("e", False),
    }
    order = ["a", "e", "b", "c", "d"]
    phases = compute_phases(order, zones, 2, skip_disabled=True)
    assert phases == [["a", "e"], ["b"], ["c", "d"]]


def test_grouping_empty() -> None:
    """Empty order."""
    assert compute_phases([], {}, 2) == []
