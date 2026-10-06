"""Clock changes and the calendar's odd corners.

Aware datetimes that share one tzinfo compare by the clock on the wall. In the
night the clocks change that is an hour off from real time -- enough to arm a
timer in the past, to run a slot twice or not at all. And a year with 53 weeks
puts three weeks between two even ones. Europe/Berlin 2026: forward on 29
March, back on 25 October, week 53 at the end of December.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.util import dt as dt_util

from custom_components.simple_irrigation.models import (
    Installation,
    RunState,
    ScheduleSlot,
    Zone,
)
from custom_components.simple_irrigation.scheduler import IrrigationScheduler, compute_next_runs
from custom_components.simple_irrigation.time_util import next_slot_fire_local_any

SCHEDULER = "custom_components.simple_irrigation.scheduler"
TZ = dt_util.get_time_zone("Europe/Berlin")
UTC = timezone.utc


def _inst(time_local: str) -> Installation:
    z = Zone(zone_id="a", name="a", switch_entity_ids=["switch.a"], duration_normal_min=1)
    slot = ScheduleSlot(slot_id="s", weekdays=list(range(7)), time_local=time_local, zone_ids_ordered=["a"])
    return Installation(installation_id="i", name="G", zones={"a": z}, schedule_slots=[slot])


def _scheduler(inst):
    hass = MagicMock()
    hass.config.time_zone = "Europe/Berlin"
    hass.states.get = lambda _e: None
    coordinator = MagicMock()
    coordinator.installation = inst
    coordinator.run_state = RunState()
    coordinator.async_update_run_state = AsyncMock()
    runtime = MagicMock()
    runtime.is_busy.return_value = False
    runtime.has_waiting.return_value = False
    runtime.async_run_phases = AsyncMock(return_value=True)
    runtime.async_wait_or_skip = AsyncMock()
    return IrrigationScheduler(hass, coordinator, runtime), runtime


def local(utc: datetime) -> datetime:
    return utc.astimezone(TZ)   # what dt_util.now() returns: same tzinfo object, fold set


@pytest.mark.asyncio
async def test_a_slot_in_the_hour_that_is_skipped_in_spring_still_runs() -> None:
    inst = _inst("02:30")
    # Saturday evening: when is the next run?
    before = local(datetime(2026, 3, 28, 20, 0, tzinfo=UTC))
    nxt, _ = compute_next_runs(inst, before, TZ)
    timer_utc = dt_util.as_utc(nxt)
    scheduler, runtime = _scheduler(inst)
    now = local(timer_utc + timedelta(milliseconds=50))
    with patch(f"{SCHEDULER}.dt_util.now", return_value=now), patch(f"{SCHEDULER}.async_track_point_in_time"):
        await scheduler._async_fire_at(now)
    assert runtime.async_run_phases.await_count == 1


@pytest.mark.asyncio
async def test_a_reschedule_in_the_repeated_hour_arms_no_timer_in_the_past() -> None:
    inst = _inst("02:30")
    scheduler, runtime = _scheduler(inst)
    # 02:30 CEST (first pass): the slot fires as it should.
    first = local(datetime(2026, 10, 25, 0, 30, 0, 50000, tzinfo=UTC))
    with patch(f"{SCHEDULER}.dt_util.now", return_value=first), patch(f"{SCHEDULER}.async_track_point_in_time"):
        await scheduler._async_fire_at(first)
    assert runtime.async_run_phases.await_count == 1
    # 02:10 CET (second pass through the hour): anything reschedules -- a setting saved, a restart.
    now = local(datetime(2026, 10, 25, 1, 10, tzinfo=UTC))
    assert now.fold == 1
    spins = 0
    for _ in range(50):
        with patch(f"{SCHEDULER}.dt_util.now", return_value=now), patch(f"{SCHEDULER}.async_track_point_in_time") as track:
            await scheduler._async_reschedule()
            when_utc = track.call_args.args[2]
            if when_utc > dt_util.as_utc(now):
                break
            spins += 1          # a timer in the past fires at once
            await scheduler._async_fire_at(now)
        now = local(dt_util.as_utc(now) + timedelta(milliseconds=5))
    # ...and when the wall clock shows 02:30 for the second time:
    again = local(datetime(2026, 10, 25, 1, 30, 0, 50000, tzinfo=UTC))
    with patch(f"{SCHEDULER}.dt_util.now", return_value=again), patch(f"{SCHEDULER}.async_track_point_in_time"):
        await scheduler._async_fire_at(again)
    assert spins == 0
    assert runtime.async_run_phases.await_count == 1


@pytest.mark.asyncio
async def test_a_restart_in_the_repeated_hour_does_not_run_the_slot_again() -> None:
    inst = _inst("02:30")
    scheduler, runtime = _scheduler(inst)      # fresh process, started 02:10 CET; slot already ran at 02:30 CEST
    again = local(datetime(2026, 10, 25, 1, 30, 0, 50000, tzinfo=UTC))
    with patch(f"{SCHEDULER}.dt_util.now", return_value=again), patch(f"{SCHEDULER}.async_track_point_in_time"):
        await scheduler._async_fire_at(again)
    assert runtime.async_run_phases.await_count == 0


# --- week 53 ----------------------------------------------------------------------


def test_an_even_week_slot_finds_its_next_run_across_week_53() -> None:
    """Week 52, then 53 and 1, both odd: three weeks from one even week to the next."""
    after = datetime(2026, 12, 25, 7, 0, tzinfo=TZ)

    fire = next_slot_fire_local_any(after, [4], "06:00", TZ, "even")

    assert fire == datetime(2027, 1, 15, 6, 0, tzinfo=TZ)


def test_an_installation_of_even_week_slots_keeps_a_next_run_over_new_year() -> None:
    inst = _inst("06:00")
    inst.schedule_slots[0].weekdays = [4]
    inst.schedule_slots[0].week_parity = "even"

    global_next, per_zone = compute_next_runs(inst, datetime(2026, 12, 28, 12, 0, tzinfo=TZ), TZ)

    assert global_next == datetime(2027, 1, 15, 6, 0, tzinfo=TZ)
    assert per_zone == {"a": global_next}
