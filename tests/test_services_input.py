"""What the services are handed, and what they make of it.

A date without a time zone and a duration without an upper bound both went
straight through: the first stopped every schedule, the second planned a valve
open for weeks.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import voluptuous as vol
from homeassistant.util import dt as dt_util

from custom_components.simple_irrigation.const import (
    DOMAIN,
    MAX_MANUAL_DURATION_MIN,
    SERVICE_PAUSE_UNTIL,
    SERVICE_RUN_ZONE_WITH_DURATION,
)
from custom_components.simple_irrigation.models import (
    Installation,
    RunState,
    ScheduleSlot,
    Zone,
)
from custom_components.simple_irrigation.scheduler import IrrigationScheduler
from custom_components.simple_irrigation.services import async_setup_services

ENTRY_ID = "entry1"
SCHEDULER = "custom_components.simple_irrigation.scheduler"
BERLIN = dt_util.get_time_zone("Europe/Berlin")
UTC = timezone.utc


@pytest.fixture(autouse=True)
def _home_assistant_in_berlin():
    """A date without a zone is meant in Home Assistant's."""
    before = dt_util.DEFAULT_TIME_ZONE
    dt_util.set_default_time_zone(BERLIN)
    yield
    dt_util.set_default_time_zone(before)


def _installation() -> Installation:
    zone = Zone(zone_id="a", name="a", switch_entity_ids=["switch.a"], duration_normal_min=1)
    slot = ScheduleSlot(
        slot_id="s", weekdays=list(range(7)), time_local="06:00", zone_ids_ordered=["a"]
    )
    return Installation(installation_id="i", name="G", zones={"a": zone}, schedule_slots=[slot])


async def _service(name: str) -> tuple[object, object, MagicMock]:
    """Register the services on a fake hass; return (handler, schema, coordinator)."""
    coordinator = MagicMock()
    coordinator.installation = _installation()
    coordinator.async_update_installation = AsyncMock()

    hass = MagicMock()
    hass.services.has_service.return_value = False
    hass.config_entries.async_entries.return_value = [SimpleNamespace(entry_id=ENTRY_ID)]
    hass.data = {
        DOMAIN: {
            ENTRY_ID: {"coordinator": coordinator, "runtime": MagicMock(), "scheduler": MagicMock()}
        }
    }
    await async_setup_services(hass)

    for call in hass.services.async_register.call_args_list:
        _domain, registered, handler = call.args[:3]
        if registered == name:
            return handler, call.kwargs["schema"], coordinator
    raise AssertionError(f"{name} was not registered")


def _scheduler(inst: Installation) -> IrrigationScheduler:
    hass = MagicMock()
    hass.config.time_zone = "Europe/Berlin"
    coordinator = MagicMock()
    coordinator.installation = inst
    coordinator.run_state = RunState()
    coordinator.async_update_run_state = AsyncMock()
    return IrrigationScheduler(hass, coordinator, MagicMock())


# --- pause_until ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_a_pause_without_a_time_zone_is_meant_in_home_assistant_s() -> None:
    """What the date picker of an action hands over: "2026-10-20 08:00:00"."""
    handler, schema, coordinator = await _service(SERVICE_PAUSE_UNTIL)

    await handler(SimpleNamespace(data=schema({"until": "2026-10-20 08:00:00"})))

    until = coordinator.installation.pause_until
    assert until.tzinfo is not None
    assert until == datetime(2026, 10, 20, 8, 0, tzinfo=BERLIN)


@pytest.mark.asyncio
async def test_a_pause_with_a_time_zone_keeps_its_moment() -> None:
    handler, schema, coordinator = await _service(SERVICE_PAUSE_UNTIL)

    await handler(SimpleNamespace(data=schema({"until": "2026-10-20T08:00:00+00:00"})))

    assert coordinator.installation.pause_until == datetime(2026, 10, 20, 8, 0, tzinfo=UTC)


def test_a_pause_stored_without_a_time_zone_is_read_back_with_one() -> None:
    """1.13.0 stored it as it came; every comparison with "now" then failed."""
    stored = _installation().to_dict()
    stored["pause_until"] = "2026-10-20T08:00:00"

    until = Installation.from_dict(stored).pause_until

    assert until == datetime(2026, 10, 20, 8, 0, tzinfo=BERLIN)
    assert dt_util.utcnow() < until or dt_util.utcnow() >= until  # comparable at all


@pytest.mark.asyncio
async def test_a_pause_to_the_end_of_the_calendar_does_not_stop_the_scheduler() -> None:
    inst = _installation()
    inst.pause_until = datetime(9999, 12, 31, 12, 0, tzinfo=UTC)
    scheduler = _scheduler(inst)

    with patch(f"{SCHEDULER}.async_track_point_in_time") as track:
        await scheduler.async_setup()

    assert scheduler.coordinator.run_state.next_run_global is None
    track.assert_not_called()


@pytest.mark.asyncio
async def test_a_reschedule_that_fails_tries_again_instead_of_leaving_no_timer() -> None:
    """The timer is cancelled first; without a new one no schedule runs again."""
    scheduler = _scheduler(_installation())
    now = datetime(2026, 7, 6, 12, 0, tzinfo=UTC)

    with (
        patch(f"{SCHEDULER}.dt_util.utcnow", return_value=now),
        patch(f"{SCHEDULER}.compute_next_runs", side_effect=RuntimeError("boom")),
        patch(f"{SCHEDULER}.async_track_point_in_time") as track,
    ):
        await scheduler.async_reschedule_now()

    assert track.call_args.args[2] == now + timedelta(minutes=1)
    assert scheduler._unsub is track.return_value


# --- run_zone_with_duration -------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize("minutes", [1, 45, MAX_MANUAL_DURATION_MIN])
async def test_a_manual_duration_up_to_a_day_is_taken(minutes: int) -> None:
    _handler, schema, _coordinator = await _service(SERVICE_RUN_ZONE_WITH_DURATION)

    assert schema({"zone_id": "a", "duration_min": minutes})["duration_min"] == minutes


@pytest.mark.asyncio
@pytest.mark.parametrize("minutes", [0, MAX_MANUAL_DURATION_MIN + 1, 100_000])
async def test_a_manual_duration_out_of_range_is_refused(minutes: int) -> None:
    """Seconds handed over as minutes used to open the valve for weeks."""
    _handler, schema, _coordinator = await _service(SERVICE_RUN_ZONE_WITH_DURATION)

    with pytest.raises(vol.Invalid):
        schema({"zone_id": "a", "duration_min": minutes})
