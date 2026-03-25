"""Compute execution phases from ordered zone list."""

from __future__ import annotations

from .models import Zone


def compute_phases(
    ordered_zone_ids: list[str],
    zones_by_id: dict[str, Zone],
    max_parallel_zones: int,
    *,
    skip_disabled: bool = True,
) -> list[list[str]]:
    """Build sequential phases: each inner list runs in parallel, phases run in order.

    Rules:
    - Exclusive zones run alone in a phase.
    - Non-exclusive zones share a phase up to max_parallel_zones.
    - Order is preserved by greedy filling.
    """
    if max_parallel_zones < 1:
        max_parallel_zones = 1

    phases: list[list[str]] = []
    current: list[str] = []

    for zid in ordered_zone_ids:
        zone = zones_by_id.get(zid)
        if zone is None:
            continue
        if skip_disabled and not zone.enabled:
            continue

        if zone.exclusive:
            if current:
                phases.append(current)
                current = []
            phases.append([zid])
            continue

        # Non-exclusive: add to current if possible
        if not current:
            current = [zid]
            continue

        # Cannot mix with exclusive (current should never have exclusive if we
        # closed phases correctly — exclusive always flushes alone)
        if len(current) >= max_parallel_zones:
            phases.append(current)
            current = [zid]
            continue

        current.append(zid)

    if current:
        phases.append(current)

    return phases


def phase_index_per_zone(ordered_zone_ids: list[str], phases: list[list[str]]) -> dict[str, int]:
    """Map each zone id to 1-based phase index for UI (first occurrence only)."""
    result: dict[str, int] = {}
    for idx, group in enumerate(phases, start=1):
        for zid in group:
            if zid not in result:
                result[zid] = idx
    return result
