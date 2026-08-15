"""Tests for the read-only irrigation calendar."""

from datetime import datetime
from zoneinfo import ZoneInfo

from custom_components.simple_irrigation.calendar import calendar_events
from custom_components.simple_irrigation.models import Installation, ScheduleSlot, Zone

TZ = ZoneInfo("Europe/Amsterdam")


def _installation(*, parity: str = "every") -> Installation:
    return Installation(
        installation_id="garden",
        name="Garden",
        pre_start_delay_sec=60,
        mode="normal",
        max_parallel_zones=2,
        zones={
            "front": Zone(
                zone_id="front", name="Front lawn", duration_normal_min=10
            ),
            "back": Zone(
                zone_id="back", name="Back lawn", duration_normal_min=20
            ),
            "drip": Zone(
                zone_id="drip",
                name="Drip line",
                duration_normal_min=5,
                exclusive=True,
            ),
        },
        schedule_slots=[
            ScheduleSlot(
                slot_id="morning",
                weekdays=[0],
                time_local="06:00",
                zone_ids_ordered=["front", "back", "drip"],
                week_parity=parity,
            )
        ],
    )


def test_calendar_expands_slot_and_uses_phase_duration() -> None:
    """Parallel zones use their maximum duration, then the exclusive phase runs."""
    events = calendar_events(
        _installation(),
        datetime(2026, 8, 10, tzinfo=TZ),
        datetime(2026, 8, 11, tzinfo=TZ),
        TZ,
    )

    assert len(events) == 1
    assert events[0].start == datetime(2026, 8, 10, 6, 0, tzinfo=TZ)
    assert events[0].end == datetime(2026, 8, 10, 6, 26, tzinfo=TZ)
    assert events[0].summary == "Front lawn, Back lawn, Drip line"
    assert events[0].uid == "garden:morning:2026-08-10"


def test_calendar_honours_week_parity() -> None:
    """Biweekly slots only appear in matching ISO calendar weeks."""
    events = calendar_events(
        _installation(parity="odd"),
        datetime(2026, 8, 10, tzinfo=TZ),  # ISO week 33 (odd)
        datetime(2026, 8, 25, tzinfo=TZ),
        TZ,
    )

    assert [event.start.date().isoformat() for event in events] == [
        "2026-08-10",
        "2026-08-24",
    ]


def test_calendar_omits_disabled_or_empty_runs() -> None:
    """Do not advertise runs that the scheduler cannot execute."""
    installation = _installation()
    installation.zones["front"].enabled = False
    installation.zones["back"].enabled = False
    installation.zones["drip"].enabled = False

    assert not calendar_events(
        installation,
        datetime(2026, 8, 10, tzinfo=TZ),
        datetime(2026, 8, 11, tzinfo=TZ),
        TZ,
    )


def test_calendar_range_overlap_is_exclusive() -> None:
    """Include overlapping events but not one ending exactly at the lower bound."""
    installation = _installation()
    assert calendar_events(
        installation,
        datetime(2026, 8, 10, 6, 10, tzinfo=TZ),
        datetime(2026, 8, 10, 6, 11, tzinfo=TZ),
        TZ,
    )
    assert not calendar_events(
        installation,
        datetime(2026, 8, 10, 6, 26, tzinfo=TZ),
        datetime(2026, 8, 10, 7, 0, tzinfo=TZ),
        TZ,
    )
