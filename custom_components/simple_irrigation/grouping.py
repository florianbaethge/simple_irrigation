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


def can_join_active_phase(
    active_zone_ids: list[str],
    new_zone_id: str,
    zones_by_id: dict[str, Zone],
    max_parallel_zones: int,
) -> bool:
    """Return True if ``new_zone_id`` may start while ``active_zone_ids`` are still running.

    Mirrors the non-exclusive parallel rules in :func:`compute_phases`: exclusive zones never
    join an in-flight phase; capacity is capped by ``max_parallel_zones``.
    """
    if max_parallel_zones < 1:
        max_parallel_zones = 1
    if not active_zone_ids:
        return False

    new_zone = zones_by_id.get(new_zone_id)
    if new_zone is None or not new_zone.enabled:
        return False
    if new_zone.exclusive:
        return False

    for zid in active_zone_ids:
        z = zones_by_id.get(zid)
        if z is not None and z.exclusive:
            return False

    return len(active_zone_ids) < max_parallel_zones


def phase_index_per_zone(ordered_zone_ids: list[str], phases: list[list[str]]) -> dict[str, int]:
    """Map each zone id to 1-based phase index for UI (first occurrence only)."""
    result: dict[str, int] = {}
    for idx, group in enumerate(phases, start=1):
        for zid in group:
            if zid not in result:
                result[zid] = idx
    return result
