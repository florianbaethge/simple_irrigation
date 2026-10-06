"""Cycle → schedule-slot generation (mirrored in frontend/src/cycle.ts).

A *cycle* is a user-facing watering cadence ("Every 2 days", "Twice daily", …).
It is pure presentation + generation metadata: the runtime only ever sees the
generated ``weekdays`` / ``time_local`` / ``week_parity`` on each member slot.

Cycle length is 7 or 14 days because ``week_parity`` can only express a 2-week
cycle. All rules here MUST match ``cycle.ts`` exactly so the wizard preview and
the created slots agree 100 %.
"""

from __future__ import annotations

import math
from datetime import date, timedelta
from typing import Any

from .const import WEEK_PARITY_EVEN, WEEK_PARITY_EVERY, WEEK_PARITY_ODD
from .time_util import parse_hh_mm

CYCLE_KINDS = (
    "daily",
    "twice_daily",
    "every_n_days",
    "n_per_week",
    "weekly",
    "biweekly",
    "custom",
)

# Start times a cycle may have on a watering day. Each one becomes a slot of
# its own, so the cap also bounds what a single request can create.
MAX_CYCLE_START_TIMES = 8


def round_half_up(x: float) -> int:
    """Round half away from zero-ish (half up), matching JS ``Math.round``.

    Python's built-in ``round`` uses banker's rounding, which diverges from the
    frontend for values like 10.5; use this everywhere offsets are computed.
    """
    return math.floor(x + 0.5)


def opposite_parity(parity: str) -> str:
    """Flip odd<->even; ``every`` stays ``every``."""
    if parity == WEEK_PARITY_ODD:
        return WEEK_PARITY_EVEN
    if parity == WEEK_PARITY_EVEN:
        return WEEK_PARITY_ODD
    return WEEK_PARITY_EVERY


def anchor_week_parity(anchor_weekday: int, today: date) -> str:
    """Parity (odd/even) of the ISO week containing the next occurrence of the anchor."""
    a = max(0, min(6, int(anchor_weekday)))
    for i in range(8):
        d = today + timedelta(days=i)
        if d.weekday() == a:
            return WEEK_PARITY_ODD if d.isocalendar()[1] % 2 == 1 else WEEK_PARITY_EVEN
    return WEEK_PARITY_EVERY


def normalize_start_times(raw: Any) -> list[str]:
    """``raw`` as ``HH:MM`` strings, each once and in the order of the clock.

    Whatever order the times were entered in, the day runs them earliest first;
    storing them that way keeps the wizard, the slots and the preview in step.
    """
    parsed = {
        hm
        for value in (raw if isinstance(raw, (list, tuple)) else [])
        if (hm := parse_hh_mm(str(value))) is not None
    }
    return [f"{h:02d}:{m:02d}" for h, m in sorted(parsed)][:MAX_CYCLE_START_TIMES]


def _times(meta: dict[str, Any] | None) -> list[str]:
    return normalize_start_times((meta or {}).get("times")) or ["06:00"]


def _anchor(meta: dict[str, Any] | None) -> int:
    try:
        return max(0, min(6, int((meta or {}).get("anchor_weekday", 0))))
    except (TypeError, ValueError):
        return 0


def _n(meta: dict[str, Any] | None, default: int = 2) -> int:
    try:
        return max(1, int((meta or {}).get("n", default)))
    except (TypeError, ValueError):
        return default


def _week_days(meta: dict[str, Any] | None) -> list[int]:
    raw = (meta or {}).get("week_days")
    out: list[int] = []
    seen: set[int] = set()
    if isinstance(raw, (list, tuple, set)):
        for x in raw:
            try:
                v = int(x)
            except (TypeError, ValueError):
                continue
            if 0 <= v <= 6 and v not in seen:
                seen.add(v)
                out.append(v)
    out.sort()
    return out


def _every_n_days_slots(n: int, anchor: int, p0: str) -> list[dict[str, Any]]:
    """Split an every-N-days cadence over a 7/14-day cycle into weekday sets."""
    runs = max(1, round_half_up(14 / n))
    offsets = [round_half_up(k * 14 / runs) for k in range(runs)]

    week_a: list[int] = []
    week_b: list[int] = []
    seen_a: set[int] = set()
    seen_b: set[int] = set()
    for off in offsets:
        wd = (anchor + off) % 7
        if off < 7:
            if wd not in seen_a:
                seen_a.add(wd)
                week_a.append(wd)
        else:
            if wd not in seen_b:
                seen_b.add(wd)
                week_b.append(wd)
    week_a.sort()
    week_b.sort()

    if week_a and week_b and seen_a == seen_b:
        return [{"weekdays": week_a, "week_parity": WEEK_PARITY_EVERY}]

    slots: list[dict[str, Any]] = []
    if week_a:
        slots.append({"weekdays": week_a, "week_parity": p0})
    if week_b:
        slots.append({"weekdays": week_b, "week_parity": opposite_parity(p0)})
    return slots


def generate_cycle_slots(
    kind: str,
    meta: dict[str, Any] | None,
    *,
    anchor_parity: str = WEEK_PARITY_ODD,
) -> list[dict[str, Any]]:
    """Slot specs for a cycle: its cadence, once for every start time.

    A slot waters on its weekdays at one time of day. A cadence that needs odd
    and even weeks takes two slots, and every further start time takes the
    cadence's slots again -- "every 2 days at 06:00 and 18:00" is four.
    """
    return [
        {**slot, "time_local": time_local}
        for slot in _cadence_slots(kind, meta, anchor_parity)
        for time_local in _times(meta)
    ]


def _cadence_slots(
    kind: str, meta: dict[str, Any] | None, anchor_parity: str
) -> list[dict[str, Any]]:
    """The cadence as ``[{weekdays, week_parity}, …]``, without a time of day.

    ``anchor_parity`` (``P0``) is the parity of the ISO week containing the next
    occurrence of the anchor weekday; only ``biweekly`` and the two-slot
    ``every_n_days`` case use it.
    """
    anchor = _anchor(meta)

    # ``twice_daily`` is how releases before 1.13 spelled "daily, two times".
    if kind in ("daily", "twice_daily"):
        return [{"weekdays": [0, 1, 2, 3, 4, 5, 6], "week_parity": WEEK_PARITY_EVERY}]

    if kind == "weekly":
        return [{"weekdays": [anchor], "week_parity": WEEK_PARITY_EVERY}]

    if kind == "biweekly":
        return [{"weekdays": [anchor], "week_parity": anchor_parity}]

    if kind == "every_n_days":
        return _every_n_days_slots(_n(meta), anchor, anchor_parity)

    # n_per_week, custom (or unknown): the chosen weekdays.
    return [{"weekdays": _week_days(meta) or [anchor], "week_parity": WEEK_PARITY_EVERY}]


def cycle_is_exact(kind: str, meta: dict[str, Any] | None) -> bool:
    """Whether the cadence divides the 14-day cycle evenly (no ``approx`` badge)."""
    if kind != "every_n_days":
        return True
    return 14 % _n(meta) == 0


def simulate_fire_days(
    slots: list[dict[str, Any]], start: date, days: int
) -> list[date]:
    """Dates on which any slot fires in ``[start, start+days)`` (runtime semantics)."""
    from .time_util import week_parity_matches

    fires: list[date] = []
    for i in range(days):
        d = start + timedelta(days=i)
        for s in slots:
            if d.weekday() not in s["weekdays"]:
                continue
            if not week_parity_matches(d, s["week_parity"]):
                continue
            fires.append(d)
            break
    return fires


def cycle_gaps(
    kind: str, meta: dict[str, Any] | None, start: date, anchor_parity: str = WEEK_PARITY_ODD
) -> list[int]:
    """Real day-gap sequence between consecutive fires over a two-cycle window."""
    slots = generate_cycle_slots(kind, meta, anchor_parity=anchor_parity)
    fires = simulate_fire_days(slots, start, 28)
    if len(fires) < 2:
        return []
    return [(fires[i + 1] - fires[i]).days for i in range(len(fires) - 1)]
