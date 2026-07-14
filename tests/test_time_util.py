"""Tests for time helpers."""

from __future__ import annotations

import datetime as dt
from zoneinfo import ZoneInfo

from custom_components.simple_irrigation.models import ScheduleSlot
from custom_components.simple_irrigation.time_util import (
    next_slot_fire_local,
    parse_hh_mm,
    week_parity_matches,
)


def test_parse_hh_mm() -> None:
    """Parse valid times."""
    assert parse_hh_mm("04:30") == (4, 30)
    assert parse_hh_mm("bad") is None


def test_next_slot_fire_local() -> None:
    """Next Monday 06:00 after a Sunday."""
    tz = ZoneInfo("Europe/Berlin")
    # Sunday 2025-03-23 12:00 local
    after = dt.datetime(2025, 3, 23, 12, 0, tzinfo=tz)
    nxt = next_slot_fire_local(after, 0, "06:00", tz)  # Monday = 0
    assert nxt is not None
    assert nxt.weekday() == 0
    assert nxt.hour == 6
    assert nxt.minute == 0


def test_week_parity_matches() -> None:
    """ISO calendar week parity."""
    odd_day = dt.date(2025, 3, 24)  # ISO week 13
    even_day = dt.date(2025, 3, 31)  # ISO week 14
    assert week_parity_matches(odd_day, "every")
    assert week_parity_matches(odd_day, "odd")
    assert not week_parity_matches(odd_day, "even")
    assert week_parity_matches(even_day, "even")
    assert not week_parity_matches(even_day, "odd")


def test_next_slot_fire_local_week_parity() -> None:
    """Odd/even week slots skip non-matching weeks."""
    tz = ZoneInfo("Europe/Berlin")
    # Sunday 2025-03-23 12:00 local, ISO week 12 (even)
    after = dt.datetime(2025, 3, 23, 12, 0, tzinfo=tz)

    # Next Monday (2025-03-24) is in ISO week 13 (odd).
    nxt_odd = next_slot_fire_local(after, 0, "06:00", tz, "odd")
    assert nxt_odd is not None
    assert nxt_odd.date() == dt.date(2025, 3, 24)

    # Even weeks: skip a week to Monday 2025-03-31 (ISO week 14).
    nxt_even = next_slot_fire_local(after, 0, "06:00", tz, "even")
    assert nxt_even is not None
    assert nxt_even.date() == dt.date(2025, 3, 31)

    # Default matches explicit "every".
    assert next_slot_fire_local(after, 0, "06:00", tz) == next_slot_fire_local(
        after, 0, "06:00", tz, "every"
    )


def test_next_slot_fire_local_week_parity_two_weeks_out() -> None:
    """Same weekday, time already passed, matching week — fires 14 days later."""
    tz = ZoneInfo("Europe/Berlin")
    # Sunday 2025-03-23 12:00 local, ISO week 12 (even); Sunday slot at 06:00 passed.
    after = dt.datetime(2025, 3, 23, 12, 0, tzinfo=tz)
    nxt = next_slot_fire_local(after, 6, "06:00", tz, "even")
    assert nxt is not None
    assert nxt.date() == dt.date(2025, 4, 6)  # Sunday, ISO week 14


def test_schedule_slot_week_parity_serialization() -> None:
    """Round-trip and legacy defaults for week_parity."""
    legacy = ScheduleSlot.from_dict(
        {"slot_id": "a", "weekday": 1, "time_local": "06:00"}
    )
    assert legacy.week_parity == "every"

    slot = ScheduleSlot.from_dict(
        {"slot_id": "b", "weekday": 2, "time_local": "07:00", "week_parity": "odd"}
    )
    assert slot.week_parity == "odd"
    assert ScheduleSlot.from_dict(slot.to_dict()).week_parity == "odd"

    bogus = ScheduleSlot.from_dict(
        {"slot_id": "c", "weekday": 3, "time_local": "08:00", "week_parity": "nope"}
    )
    assert bogus.week_parity == "every"
