"""Seasons: when in the year a schedule waters by itself.

The installation has a season, a slot may bring its own, and each is made of
periods that come round every year. Outside its season a schedule is not due:
nothing starts, nothing is reported as skipped, and its next run is the first
one after the season opens again.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from zoneinfo import ZoneInfo

import pytest

from custom_components.simple_irrigation.card_api import _next_firings, _week
from custom_components.simple_irrigation.const import MAX_SEASON_PERIODS
from custom_components.simple_irrigation.models import (
    Installation,
    Period,
    RunState,
    ScheduleSlot,
    Zone,
    parse_season,
)
from custom_components.simple_irrigation.panel_api import (
    _apply_slot_season,
    _season_from_payload,
)
from custom_components.simple_irrigation.scheduler import IrrigationScheduler, compute_next_runs
from custom_components.simple_irrigation.season import (
    in_season,
    next_day_in_season,
    next_slot_fire,
    season_for,
    slot_in_season,
)

TZ = ZoneInfo("Europe/Berlin")
SCHEDULER = "custom_components.simple_irrigation.scheduler"
CARD = "custom_components.simple_irrigation.card_api"

SUMMER = Period((6, 1), (8, 31))
SPRING = Period((4, 1), (5, 31))
AUTUMN = Period((9, 1), (10, 31))
WHOLE = Period((4, 1), (10, 31))
WINTER = Period((11, 1), (2, 28))


def _slot(sid: str = "s1", time_local: str = "06:00", **kwargs) -> ScheduleSlot:
    return ScheduleSlot(
        slot_id=sid,
        name=sid,
        weekdays=kwargs.pop("weekdays", [0, 1, 2, 3, 4, 5, 6]),
        time_local=time_local,
        zone_ids_ordered=["z1"],
        **kwargs,
    )


def _inst(*slots: ScheduleSlot, season: list[Period] | None = None) -> Installation:
    return Installation(
        installation_id="i1",
        name="Garden",
        zones={"z1": Zone(zone_id="z1", name="Lawn", switch_entity_ids=["switch.z1"])},
        schedule_slots=list(slots),
        season=season or [],
    )


def _at(year: int, month: int, day: int, hour: int = 12, minute: int = 0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=TZ)


# --- a period ------------------------------------------------------------------


@pytest.mark.parametrize(
    ("day", "inside"),
    [
        (date(2026, 5, 31), False),
        (date(2026, 6, 1), True),
        (date(2026, 7, 15), True),
        (date(2026, 8, 31), True),
        (date(2026, 9, 1), False),
    ],
)
def test_a_period_includes_both_its_days(day: date, inside: bool) -> None:
    assert SUMMER.contains(day) is inside


@pytest.mark.parametrize(
    ("day", "inside"),
    [
        (date(2026, 10, 31), False),
        (date(2026, 11, 1), True),
        (date(2026, 12, 31), True),
        (date(2027, 1, 1), True),
        (date(2027, 2, 28), True),
        (date(2027, 3, 1), False),
    ],
)
def test_a_period_may_run_across_new_year(day: date, inside: bool) -> None:
    assert WINTER.contains(day) is inside


def test_the_29th_of_february_needs_no_rule_of_its_own() -> None:
    until_leap_day = Period((1, 1), (2, 29))
    from_leap_day = Period((2, 29), (3, 31))

    # A year without one: the period ends on the 28th, the other starts on 1 March.
    assert until_leap_day.contains(date(2027, 2, 28))
    assert not until_leap_day.contains(date(2027, 3, 1))
    assert not from_leap_day.contains(date(2027, 2, 28))
    assert from_leap_day.contains(date(2027, 3, 1))
    # A leap year: the day itself belongs to both.
    assert until_leap_day.contains(date(2028, 2, 29))
    assert from_leap_day.contains(date(2028, 2, 29))


def test_a_period_survives_the_store() -> None:
    assert SUMMER.to_dict() == {"from": "06-01", "to": "08-31"}
    assert Period.from_dict(SUMMER.to_dict()) == SUMMER


@pytest.mark.parametrize(
    "raw",
    [
        {"from": "02-30", "to": "03-01"},
        {"from": "13-01", "to": "03-01"},
        {"from": "04-01"},
        {"from": "april", "to": "may"},
        {"from": "04-31", "to": "05-01"},
        "04-01",
        None,
    ],
)
def test_a_period_that_names_no_day_of_the_year_is_none(raw) -> None:
    assert Period.from_dict(raw) is None


def test_a_season_keeps_its_usable_periods_each_once() -> None:
    raw = [SPRING.to_dict(), {"from": "02-30", "to": "03-01"}, SPRING.to_dict(), AUTUMN.to_dict()]

    assert parse_season(raw) == [SPRING, AUTUMN]


def test_a_season_has_no_more_than_six_periods() -> None:
    raw = [{"from": f"{month:02d}-01", "to": f"{month:02d}-10"} for month in range(1, 13)]

    assert len(parse_season(raw)) == MAX_SEASON_PERIODS


def test_no_periods_at_all_is_the_whole_year() -> None:
    assert in_season([], date(2026, 1, 15))
    assert in_season([SPRING, AUTUMN], date(2026, 4, 15))
    assert in_season([SPRING, AUTUMN], date(2026, 10, 1))
    assert not in_season([SPRING, AUTUMN], date(2026, 7, 15))


# --- installation and slot -------------------------------------------------------


def test_a_slot_follows_the_installation_unless_it_brings_its_own() -> None:
    plain = _slot("beds")
    summer = _slot("lawn", override_season=True, season=[SUMMER])
    inst = _inst(plain, summer, season=[WHOLE])

    assert season_for(inst, plain) == [WHOLE]
    assert season_for(inst, summer) == [SUMMER]
    assert slot_in_season(inst, plain, date(2026, 4, 15))
    assert not slot_in_season(inst, summer, date(2026, 4, 15))


def test_own_periods_stand_in_for_the_installation_they_are_not_added_to_it() -> None:
    """A slot from March waters in March, though the installation opens in April."""
    early = _slot("early", override_season=True, season=[Period((3, 1), (5, 31))])
    inst = _inst(early, season=[WHOLE])

    assert slot_in_season(inst, early, date(2026, 3, 15))


def test_a_slot_with_the_flag_and_no_periods_waters_all_year() -> None:
    greenhouse = _slot("greenhouse", override_season=True)
    inst = _inst(greenhouse, season=[WHOLE])

    assert slot_in_season(inst, greenhouse, date(2026, 1, 15))


def test_a_slot_s_periods_do_not_count_without_the_flag() -> None:
    slot = _slot("beds", season=[SUMMER])
    inst = _inst(slot, season=[WHOLE])

    assert slot_in_season(inst, slot, date(2026, 4, 15))


def test_the_season_survives_the_store() -> None:
    slot = _slot("lawn", override_season=True, season=[SPRING, AUTUMN])
    inst = _inst(slot, season=[WHOLE])

    again = Installation.from_dict(inst.to_dict())

    assert again.season == [WHOLE]
    assert again.schedule_slots[0].override_season is True
    assert again.schedule_slots[0].season == [SPRING, AUTUMN]


def test_an_installation_from_before_seasons_waters_all_year() -> None:
    inst = Installation.from_dict(
        {
            "installation_id": "i1",
            "name": "Garden",
            "schedule_slots": [{"slot_id": "s1", "weekdays": [0], "time_local": "06:00"}],
        }
    )

    assert inst.season == []
    assert inst.schedule_slots[0].override_season is False
    assert inst.schedule_slots[0].season == []


# --- the next fire ---------------------------------------------------------------


def test_in_season_the_next_fire_is_the_next_fire() -> None:
    inst = _inst(_slot(), season=[WHOLE])

    fire = next_slot_fire(inst, inst.schedule_slots[0], _at(2026, 7, 10), TZ)

    assert fire == _at(2026, 7, 11, 6)


def test_out_of_season_the_next_fire_is_the_first_one_of_the_season() -> None:
    inst = _inst(_slot(), season=[WHOLE])

    fire = next_slot_fire(inst, inst.schedule_slots[0], _at(2026, 12, 10), TZ)

    assert fire == _at(2027, 4, 1, 6)


def test_the_last_day_of_the_season_still_fires() -> None:
    inst = _inst(_slot(time_local="20:00"), season=[WHOLE])

    fire = next_slot_fire(inst, inst.schedule_slots[0], _at(2026, 10, 31, 12), TZ)

    assert fire == _at(2026, 10, 31, 20)


def test_a_fire_at_midnight_on_the_first_day_counts() -> None:
    inst = _inst(_slot(time_local="00:00"), season=[WHOLE])

    fire = next_slot_fire(inst, inst.schedule_slots[0], _at(2027, 3, 20), TZ)

    assert fire == _at(2027, 4, 1, 0)


def test_between_two_periods_the_next_fire_waits_for_the_second() -> None:
    slot = _slot(override_season=True, season=[SPRING, AUTUMN])
    inst = _inst(slot)

    assert next_slot_fire(inst, slot, _at(2026, 5, 31, 12), TZ) == _at(2026, 9, 1, 6)
    assert next_slot_fire(inst, slot, _at(2026, 10, 31, 12), TZ) == _at(2027, 4, 1, 6)


def test_the_weekday_still_decides_inside_the_season() -> None:
    """The season opens on a Thursday; a Monday slot starts the Monday after."""
    slot = _slot(weekdays=[0])
    inst = _inst(slot, season=[WHOLE])

    assert next_slot_fire(inst, slot, _at(2026, 12, 10), TZ) == _at(2027, 4, 5, 6)


def test_a_period_shorter_than_the_rhythm_is_passed_over() -> None:
    """Three days that hold no Monday: the slot fires in the period after it."""
    slot = _slot(weekdays=[0], override_season=True, season=[Period((4, 1), (4, 3)), SUMMER])
    inst = _inst(slot)

    assert next_slot_fire(inst, slot, _at(2027, 3, 20), TZ) == _at(2027, 6, 7, 6)


def test_the_first_day_in_season_from_a_day_on() -> None:
    assert next_day_in_season([WHOLE], date(2026, 7, 1)) == date(2026, 7, 1)
    assert next_day_in_season([WHOLE], date(2026, 11, 5)) == date(2027, 4, 1)
    assert next_day_in_season([], date(2026, 1, 1)) == date(2026, 1, 1)


def test_next_runs_follow_each_slot_s_own_season() -> None:
    lawn = _slot("lawn", override_season=True, season=[SUMMER])
    beds = _slot("beds", time_local="07:00")
    inst = _inst(lawn, beds, season=[WHOLE])
    inst.zones["z2"] = Zone(zone_id="z2", name="Beds", switch_entity_ids=["switch.z2"])
    beds.zone_ids_ordered = ["z2"]

    global_next, per_zone = compute_next_runs(inst, _at(2026, 4, 10), TZ)

    assert global_next == _at(2026, 4, 11, 7)
    assert per_zone == {"z1": _at(2026, 6, 1, 6), "z2": _at(2026, 4, 11, 7)}


# --- the scheduler ---------------------------------------------------------------


def _scheduler(inst: Installation):
    hass = MagicMock()
    hass.config.time_zone = "Europe/Berlin"
    hass.states.get = lambda _eid: None
    coordinator = MagicMock()
    coordinator.installation = inst
    coordinator.run_state = RunState()
    coordinator.async_update_run_state = AsyncMock()
    runtime = MagicMock()
    runtime.is_busy.return_value = False
    runtime.has_waiting.return_value = False
    runtime.async_run_phases = AsyncMock(return_value=True)
    runtime.async_wait_or_skip = AsyncMock()
    return IrrigationScheduler(hass, coordinator, runtime), runtime, hass


async def _fire(scheduler: IrrigationScheduler, now: datetime) -> None:
    with (
        patch(f"{SCHEDULER}.dt_util.now", return_value=now),
        patch(f"{SCHEDULER}.async_track_point_in_time"),
    ):
        await scheduler._async_fire_at(now)


@pytest.mark.asyncio
async def test_in_season_the_schedule_starts() -> None:
    scheduler, runtime, _hass = _scheduler(_inst(_slot(), season=[WHOLE]))

    await _fire(scheduler, _at(2026, 7, 10, 6, 0))

    runtime.async_run_phases.assert_awaited_once()


@pytest.mark.asyncio
async def test_out_of_season_nothing_starts_and_nothing_is_reported() -> None:
    """Not due is not skipped: no warning and no event, every day all winter."""
    scheduler, runtime, hass = _scheduler(_inst(_slot(), season=[WHOLE]))

    await _fire(scheduler, _at(2026, 12, 10, 6, 0))

    runtime.async_run_phases.assert_not_awaited()
    runtime.async_wait_or_skip.assert_not_awaited()
    hass.bus.async_fire.assert_not_called()


@pytest.mark.asyncio
async def test_at_the_same_minute_only_the_slot_in_season_starts() -> None:
    lawn = _slot("lawn", override_season=True, season=[SUMMER])
    beds = _slot("beds")
    scheduler, runtime, _hass = _scheduler(_inst(lawn, beds, season=[WHOLE]))

    await _fire(scheduler, _at(2026, 4, 10, 6, 0))

    assert runtime.async_run_phases.await_args.kwargs["slot_ids"] == ["beds"]


# --- the card --------------------------------------------------------------------


def _card_hass() -> MagicMock:
    hass = MagicMock()
    hass.config.time_zone = "Europe/Berlin"
    return hass


def test_out_of_season_the_card_s_next_runs_begin_where_the_season_does() -> None:
    inst = _inst(_slot(), season=[WHOLE])

    with patch(f"{CARD}.dt_util.now", return_value=_at(2026, 12, 10)):
        runs = _next_firings(_card_hass(), inst, 3)

    assert [run["fire_at"] for run in runs] == [
        _at(2027, 4, 1, 6).isoformat(),
        _at(2027, 4, 2, 6).isoformat(),
        _at(2027, 4, 3, 6).isoformat(),
    ]


def test_the_card_s_next_runs_leave_out_a_slot_that_is_out_of_season() -> None:
    lawn = _slot("lawn", override_season=True, season=[SUMMER])
    beds = _slot("beds", time_local="07:00")
    inst = _inst(lawn, beds, season=[WHOLE])

    with patch(f"{CARD}.dt_util.now", return_value=_at(2026, 4, 10)):
        runs = _next_firings(_card_hass(), inst, 4)

    assert {run["slot_id"] for run in runs} == {"beds"}


def test_the_card_s_week_draws_a_day_out_of_season_but_does_not_count_it() -> None:
    """The week of Mon 26 Oct 2026: the season ends on Saturday the 31st."""
    inst = _inst(_slot(), season=[WHOLE])

    with patch(f"{CARD}.dt_util.now", return_value=_at(2026, 10, 28)):
        week = _week(_card_hass(), inst)

    flags = [day["runs"][0]["off_season"] for day in week["days"]]
    assert flags == [False] * 6 + [True]
    assert week["days"][6]["runs"][0]["parity_only"] is True
    assert week["total_runs"] == 6


# --- the panel payload -------------------------------------------------------------


def test_the_payload_s_periods_are_taken_each_once() -> None:
    raw = [SPRING.to_dict(), AUTUMN.to_dict(), SPRING.to_dict()]

    assert _season_from_payload(raw) == [SPRING, AUTUMN]


def test_a_payload_with_a_day_that_does_not_exist_is_refused() -> None:
    assert _season_from_payload([{"from": "02-30", "to": "03-01"}]) is None


def test_a_slot_takes_its_season_from_the_payload() -> None:
    slot = _slot()

    assert _apply_slot_season(slot, {"override_season": True, "season": [SUMMER.to_dict()]}) is None
    assert (slot.override_season, slot.season) == (True, [SUMMER])
    # Absent keys keep what the slot has.
    assert _apply_slot_season(slot, {}) is None
    assert (slot.override_season, slot.season) == (True, [SUMMER])
    # Back to the installation's season; its own periods are kept for next time.
    assert _apply_slot_season(slot, {"override_season": False}) is None
    assert (slot.override_season, slot.season) == (False, [SUMMER])


def test_a_slot_refuses_a_season_with_a_day_that_does_not_exist() -> None:
    slot = _slot()

    assert _apply_slot_season(slot, {"season": [{"from": "06-31", "to": "07-01"}]}) == "invalid_season"
    assert slot.season == []


def test_a_day_s_distance_is_what_the_calendar_says() -> None:
    """A sanity check on the test dates above: 1 April 2027 is a Thursday."""
    assert date(2027, 4, 1).weekday() == 3
    assert date(2027, 4, 5) - date(2027, 4, 1) == timedelta(days=4)
