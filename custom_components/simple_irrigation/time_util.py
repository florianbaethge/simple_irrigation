"""Local time helpers for weekly slots."""

from __future__ import annotations

import datetime as dt
import logging
from datetime import date, datetime, time, timedelta
from typing import Any

from .const import WEEK_PARITY_EVEN, WEEK_PARITY_EVERY, WEEK_PARITY_ODD


def parse_hh_mm(value: str) -> tuple[int, int] | None:
    """Parse 'HH:MM' string."""
    parts = value.strip().split(":")
    if len(parts) != 2:
        return None
    try:
        h = int(parts[0])
        m = int(parts[1])
    except ValueError:
        return None
    if not (0 <= h <= 23 and 0 <= m <= 59):
        return None
    return h, m


def week_parity_matches(day: date, week_parity: str) -> bool:
    """Whether ``day`` falls in a week matching the slot rhythm (ISO calendar week)."""
    if week_parity == WEEK_PARITY_ODD:
        return day.isocalendar()[1] % 2 == 1
    if week_parity == WEEK_PARITY_EVEN:
        return day.isocalendar()[1] % 2 == 0
    return True


def next_slot_fire_local(
    after: datetime,
    weekday: int,
    time_local: str,
    tz: Any,
    week_parity: str = WEEK_PARITY_EVERY,
) -> datetime | None:
    """Next occurrence of weekday at time_local in tz, strictly after ``after`` (aware).

    With ``week_parity`` "odd"/"even" only days in matching ISO calendar weeks
    qualify, so the occurrence may be up to two weeks out.
    """
    parsed = parse_hh_mm(time_local)
    if parsed is None:
        return None
    hour, minute = parsed

    if after.tzinfo is None:
        after = after.replace(tzinfo=dt.timezone.utc)
    loc = after.astimezone(tz)

    for i in range(15):
        d = loc.date() + timedelta(days=i)
        if d.weekday() != weekday:
            continue
        if not week_parity_matches(d, week_parity):
            continue
        cand = datetime.combine(d, time(hour, minute, tzinfo=tz))
        if cand > loc:
            return cand

    return None
