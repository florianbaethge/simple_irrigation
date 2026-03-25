"""Local time helpers for weekly slots."""

from __future__ import annotations

import datetime as dt
import logging
from datetime import datetime, time, timedelta
from typing import Any

_LOGGER = logging.getLogger(__name__)


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


def next_slot_fire_local(
    after: datetime,
    weekday: int,
    time_local: str,
    tz: Any,
) -> datetime | None:
    """Next occurrence of weekday at time_local in tz, strictly after ``after`` (aware)."""
    parsed = parse_hh_mm(time_local)
    if parsed is None:
        return None
    hour, minute = parsed

    if after.tzinfo is None:
        after = after.replace(tzinfo=dt.timezone.utc)
    loc = after.astimezone(tz)

    for i in range(8):
        d = loc.date() + timedelta(days=i)
        if d.weekday() != weekday:
            continue
        cand = datetime.combine(d, time(hour, minute, tzinfo=tz))
        if cand > loc:
            return cand

    return None
