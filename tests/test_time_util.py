"""Tests for time helpers."""

from __future__ import annotations

import datetime as dt
from zoneinfo import ZoneInfo

from custom_components.simple_irrigation.time_util import next_slot_fire_local, parse_hh_mm


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
