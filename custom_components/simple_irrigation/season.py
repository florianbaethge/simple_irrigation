"""Seasons: when in the year a schedule waters by itself.

An installation has a season, a slot may bring its own, and each is a handful
of periods that come round every year. Outside its season a schedule is simply
not due -- it is not skipped, it does not wait, and its next run is the first
one after the season opens again. Manual runs never ask.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Any

from .models import Installation, Period, ScheduleSlot
from .time_util import next_slot_fire_local_any

# A period shorter than a slot's rhythm can pass without a single fire, so the
# search moves on to the next opening. Six periods a year, two years' worth.
_MAX_OPENINGS = 12


def season_for(inst: Installation, slot: ScheduleSlot) -> list[Period]:
    """The periods that decide for ``slot``: its own, or the installation's."""
    return slot.season if slot.override_season else inst.season


def in_season(periods: list[Period], day: date) -> bool:
    """Whether ``day`` is in season. No periods at all is the whole year."""
    return not periods or any(period.contains(day) for period in periods)


def slot_in_season(inst: Installation, slot: ScheduleSlot, day: date) -> bool:
    """Whether ``slot`` waters by itself on ``day``."""
    return in_season(season_for(inst, slot), day)


def next_day_in_season(periods: list[Period], day: date) -> date | None:
    """The first day from ``day`` on that is in season."""
    for offset in range(367):
        candidate = day + timedelta(days=offset)
        if in_season(periods, candidate):
            return candidate
    return None


def next_slot_fire(
    inst: Installation, slot: ScheduleSlot, after: datetime, tz: Any
) -> datetime | None:
    """The slot's next fire strictly after ``after`` that falls into its season."""
    periods = season_for(inst, slot)
    for _ in range(_MAX_OPENINGS):
        fire = next_slot_fire_local_any(
            after, slot.weekdays, slot.time_local, tz, slot.week_parity
        )
        if fire is None or in_season(periods, fire.date()):
            return fire
        opening = next_day_in_season(periods, fire.date())
        if opening is None:
            return None
        # Just before the season opens, so a fire at midnight still counts.
        after = datetime.combine(opening, time(0, 0, tzinfo=tz)) - timedelta(seconds=1)
    return None
