"""Tests for the planned zone end time behind the remaining-run-time display."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.simple_irrigation.const import (
    RUN_STATE_ERROR,
    RUN_STATE_RUNNING,
)
from custom_components.simple_irrigation.models import RunState, Zone
from custom_components.simple_irrigation.runtime import IrrigationRuntime


def _runtime(zone: Zone) -> IrrigationRuntime:
    hass = MagicMock()
    hass.services.async_call = AsyncMock()
    hass.async_create_task = lambda coro, name=None: asyncio.ensure_future(coro)
    hass.bus.async_fire = MagicMock()

    coordinator = MagicMock()
    coordinator.installation = MagicMock(zones={zone.zone_id: zone})
    coordinator.run_state = RunState()
    coordinator.async_update_run_state = AsyncMock()
    return IrrigationRuntime(hass, coordinator)


def test_to_dict_carries_zone_ends_at() -> None:
    """The panel reads the end time out of the run state payload."""
    ends = datetime(2026, 8, 15, 10, 30, tzinfo=timezone.utc)
    rs = RunState(zone_ends_at={"z1": ends})

    assert rs.to_dict()["zone_ends_at"] == {"z1": ends.isoformat()}


def test_from_dict_drops_zone_ends_at() -> None:
    """A restored end time would count down against a run that no longer exists."""
    ends = datetime(2026, 8, 15, 10, 30, tzinfo=timezone.utc)
    restored = RunState.from_dict(RunState(zone_ends_at={"z1": ends}).to_dict())

    assert restored.zone_ends_at == {}


@pytest.mark.asyncio
async def test_wait_publishes_and_clears_zone_end() -> None:
    """The deadline is visible while waiting and gone once the zone finished."""
    zone = Zone(zone_id="z1", name="Front", switch_entity_ids=["switch.front"])
    runtime = _runtime(zone)
    rs = runtime.coordinator.run_state

    published: list[datetime] = []
    original = runtime._async_publish_zone_end

    async def _capture(zone_id: str, timeout_sec: float) -> None:
        await original(zone_id, timeout_sec)
        published.append(rs.zone_ends_at[zone_id])

    runtime._async_publish_zone_end = _capture  # type: ignore[method-assign]

    # Stop immediately so the wait loop returns on its first pass.
    runtime._stop_event.set()
    await runtime._async_wait_zone_duration(600, zone.zone_id)

    assert len(published) == 1
    assert published[0] - datetime.now(timezone.utc) > timedelta(minutes=9)
    assert rs.zone_ends_at == {}


@pytest.mark.asyncio
async def test_cancelled_wait_clears_zone_end() -> None:
    """stop_all() cancels the zone task -- the deadline must not survive it."""
    zone = Zone(zone_id="z1", name="Front", switch_entity_ids=["switch.front"])
    runtime = _runtime(zone)
    rs = runtime.coordinator.run_state

    task = asyncio.create_task(runtime._async_wait_zone_duration(600, zone.zone_id))
    for _ in range(100):
        if zone.zone_id in rs.zone_ends_at:
            break
        await asyncio.sleep(0)
    assert zone.zone_id in rs.zone_ends_at
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    # Let the inner stop/skip waiters process their cancellation.
    await asyncio.sleep(0)

    assert rs.zone_ends_at == {}


@pytest.mark.asyncio
async def test_setup_clears_stale_zone_end_in_error_state() -> None:
    """Recovery skips the ERROR branch, so the end time is cleared unconditionally."""
    zone = Zone(zone_id="z1", name="Front", switch_entity_ids=["switch.front"])
    runtime = _runtime(zone)
    rs = runtime.coordinator.run_state
    rs.run_state = RUN_STATE_ERROR
    rs.zone_ends_at = {"z1": datetime.now(timezone.utc) + timedelta(minutes=5)}
    runtime._async_turn_off_all_tracked = AsyncMock()

    await runtime.async_setup()

    assert rs.zone_ends_at == {}


@pytest.mark.asyncio
async def test_stop_all_clears_zone_end() -> None:
    """A stopped run leaves no deadline behind."""
    zone = Zone(zone_id="z1", name="Front", switch_entity_ids=["switch.front"])
    runtime = _runtime(zone)
    rs = runtime.coordinator.run_state
    rs.run_state = RUN_STATE_RUNNING
    rs.zone_ends_at = {"z1": datetime.now(timezone.utc) + timedelta(minutes=5)}
    runtime._async_turn_off_all_tracked = AsyncMock()

    await runtime.async_stop_all()

    assert rs.zone_ends_at == {}
