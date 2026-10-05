"""Tests for cycle → schedule-slot generation.

Mirrors the normative table in UI_CONCEPT_SPEC.md §3.4 (anchor = Monday) and the
acceptance criterion that ``Every 2 days`` fires every second day with no gap of
1 or 3 over a simulated 28-day window.
"""

from __future__ import annotations

import datetime as dt
from zoneinfo import ZoneInfo

from custom_components.simple_irrigation.cycle import (
    anchor_week_parity,
    generate_cycle_slots,
    opposite_parity,
    cycle_is_exact,
    round_half_up,
    simulate_fire_days,
    validate_cycle_start_times,
)
from custom_components.simple_irrigation.time_util import next_slot_fire_local_any


def _meta(**kw):
    base = {"times": ["19:00"], "anchor_weekday": 0}
    base.update(kw)
    return base


def test_round_half_up_matches_js() -> None:
    """Half rounds up (JS Math.round), unlike Python's banker's rounding."""
    assert round_half_up(3.5) == 4
    assert round_half_up(10.5) == 11
    assert round_half_up(2.8) == 3
    assert round_half_up(0) == 0


def test_daily() -> None:
    slots = generate_cycle_slots("daily", _meta())
    assert len(slots) == 1
    assert slots[0]["weekdays"] == [0, 1, 2, 3, 4, 5, 6]
    assert slots[0]["week_parity"] == "every"


def test_daily_supports_multiple_start_times() -> None:
    slots = generate_cycle_slots("daily", _meta(times=["06:00", "12:00", "19:00"]))

    assert [slot["time_local"] for slot in slots] == ["06:00", "12:00", "19:00"]
    assert all(slot["weekdays"] == [0, 1, 2, 3, 4, 5, 6] for slot in slots)


def test_start_time_validation_rejects_duplicates_and_unbounded_lists() -> None:
    assert validate_cycle_start_times([" 06:00 ", "19:00"]) == (
        ["06:00", "19:00"],
        None,
    )
    assert validate_cycle_start_times(["06:00", "06:00"])[1] == "duplicate_start_time"
    assert validate_cycle_start_times(["25:00"])[1] == "invalid_time"
    assert validate_cycle_start_times(["06:00"] * 9)[1] == "too_many_start_times"


def test_twice_daily() -> None:
    slots = generate_cycle_slots("twice_daily", _meta(times=["06:00", "19:00"]))
    assert len(slots) == 2
    assert {s["time_local"] for s in slots} == {"06:00", "19:00"}
    assert all(s["weekdays"] == [0, 1, 2, 3, 4, 5, 6] for s in slots)
    assert all(s["week_parity"] == "every" for s in slots)


def test_weekly() -> None:
    slots = generate_cycle_slots("weekly", _meta(anchor_weekday=2))
    assert slots == [{"weekdays": [2], "time_local": "19:00", "week_parity": "every"}]


def test_biweekly_uses_anchor_parity() -> None:
    slots = generate_cycle_slots("biweekly", _meta(anchor_weekday=0), anchor_parity="odd")
    assert slots == [{"weekdays": [0], "time_local": "19:00", "week_parity": "odd"}]


def test_n_per_week() -> None:
    slots = generate_cycle_slots("n_per_week", _meta(week_days=[0, 2, 4]))
    assert slots == [{"weekdays": [0, 2, 4], "time_local": "19:00", "week_parity": "every"}]


def test_selected_weekdays_are_repeated_at_each_start_time() -> None:
    slots = generate_cycle_slots(
        "custom",
        _meta(week_days=[1, 4], times=["05:30", "09:30", "13:30"]),
    )

    assert [slot["time_local"] for slot in slots] == ["05:30", "09:30", "13:30"]
    assert all(slot["weekdays"] == [1, 4] for slot in slots)


def test_every_2_days_two_parity_slots() -> None:
    """n=2 → odd: Mo We Fr Su · even: Tu Th Sa (spec §3.4)."""
    slots = generate_cycle_slots("every_n_days", _meta(n=2), anchor_parity="odd")
    assert len(slots) == 2
    by_parity = {s["week_parity"]: s["weekdays"] for s in slots}
    assert by_parity["odd"] == [0, 2, 4, 6]  # Mo We Fr Su
    assert by_parity["even"] == [1, 3, 5]  # Tu Th Sa


def test_every_2_days_multiplies_parity_slots_by_start_times() -> None:
    slots = generate_cycle_slots(
        "every_n_days",
        _meta(n=2, times=["06:00", "18:00"]),
        anchor_parity="odd",
    )

    assert len(slots) == 4
    assert [(slot["week_parity"], slot["time_local"]) for slot in slots] == [
        ("odd", "06:00"),
        ("odd", "18:00"),
        ("even", "06:00"),
        ("even", "18:00"),
    ]


def test_every_3_days() -> None:
    """n=3 → odd: Mo Th Su · even: Tu Fr (spec §3.4)."""
    slots = generate_cycle_slots("every_n_days", _meta(n=3), anchor_parity="odd")
    by_parity = {s["week_parity"]: s["weekdays"] for s in slots}
    assert by_parity["odd"] == [0, 3, 6]  # Mo Th Su
    assert by_parity["even"] == [1, 4]  # Tu Fr
    assert cycle_is_exact("every_n_days", _meta(n=3)) is False


def test_every_4_days_single_slot() -> None:
    """n=4 → Mo + Fr every week, one slot (spec §3.4)."""
    slots = generate_cycle_slots("every_n_days", _meta(n=4), anchor_parity="odd")
    assert slots == [{"weekdays": [0, 4], "time_local": "19:00", "week_parity": "every"}]


def test_every_7_days_single_slot() -> None:
    slots = generate_cycle_slots("every_n_days", _meta(n=7), anchor_parity="odd")
    assert slots == [{"weekdays": [0], "time_local": "19:00", "week_parity": "every"}]


def test_every_14_days_single_parity_slot() -> None:
    slots = generate_cycle_slots("every_n_days", _meta(n=14), anchor_parity="even")
    assert slots == [{"weekdays": [0], "time_local": "19:00", "week_parity": "even"}]


def test_every_2_days_no_bad_gaps_over_28_days() -> None:
    """Acceptance §8.3: run every 2nd day, never a gap of 1 or 3."""
    # Pick a Monday whose ISO week parity we compute so slots line up.
    start = dt.date(2025, 3, 24)  # Monday, ISO week 13 (odd)
    p0 = anchor_week_parity(0, start)
    slots = generate_cycle_slots("every_n_days", _meta(n=2), anchor_parity=p0)
    fires = simulate_fire_days(slots, start, 28)
    gaps = [(fires[i + 1] - fires[i]).days for i in range(len(fires) - 1)]
    assert gaps, "expected fires"
    assert all(g == 2 for g in gaps), f"expected all 2-day gaps, got {gaps}"


def test_every_2_days_matches_next_slot_fire() -> None:
    """The generated parity slots reproduce a strict every-other-day cadence."""
    tz = ZoneInfo("Europe/Berlin")
    start = dt.date(2025, 3, 24)
    p0 = anchor_week_parity(0, start)
    slots = generate_cycle_slots("every_n_days", _meta(n=2), anchor_parity=p0)
    weekdays_by_parity = slots

    after = dt.datetime(2025, 3, 24, 0, 0, tzinfo=tz)
    fires: list[dt.datetime] = []
    cursor = after
    for _ in range(14):
        best = None
        for s in weekdays_by_parity:
            nxt = next_slot_fire_local_any(
                cursor, s["weekdays"], s["time_local"], tz, s["week_parity"]
            )
            if nxt and (best is None or nxt < best):
                best = nxt
        if best is None:
            break
        fires.append(best)
        cursor = best
    gaps = [(fires[i + 1] - fires[i]).days for i in range(len(fires) - 1)]
    assert all(g == 2 for g in gaps), f"got {gaps}"


def test_opposite_parity() -> None:
    assert opposite_parity("odd") == "even"
    assert opposite_parity("even") == "odd"
    assert opposite_parity("every") == "every"


def test_anchor_week_parity() -> None:
    # 2025-03-24 is Monday ISO week 13 (odd).
    assert anchor_week_parity(0, dt.date(2025, 3, 24)) == "odd"
    # 2025-03-31 is Monday ISO week 14 (even).
    assert anchor_week_parity(0, dt.date(2025, 3, 31)) == "even"
