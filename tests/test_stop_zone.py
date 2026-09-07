"""Tests for stopping a single zone of a running irrigation cycle."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.simple_irrigation.const import (
    EVENT_ZONE_FINISHED,
    RUN_STATE_IDLE,
    RUN_STATE_PREPARING,
    RUN_STATE_RUNNING,
)
from custom_components.simple_irrigation.models import RunState, Zone
from custom_components.simple_irrigation.runtime import IrrigationRuntime, ZoneStopError


def _zone(zid: str) -> Zone:
    return Zone(zone_id=zid, name=zid.upper(), switch_entity_ids=[f"switch.{zid}"])


def _runtime(*zones: Zone) -> IrrigationRuntime:
    hass = MagicMock()
    hass.services.async_call = AsyncMock()
    hass.bus.async_fire = MagicMock()

    coordinator = MagicMock()
    coordinator.installation = MagicMock(zones={z.zone_id: z for z in zones}, max_parallel_zones=2)
    coordinator.run_state = RunState()
    coordinator.async_update_run_state = AsyncMock()
    return IrrigationRuntime(hass, coordinator)


@pytest.mark.asyncio
async def test_stop_zone_ends_only_that_zones_wait() -> None:
    """The stopped zone leaves its wait loop; a parallel zone keeps waiting."""
    runtime = _runtime(_zone("z1"), _zone("z2"))
    rs = runtime.coordinator.run_state
    rs.run_state = RUN_STATE_RUNNING
    rs.active_zone_ids = ["z1", "z2"]

    await runtime.async_stop_zone("z1")

    assert "z1" in runtime._zone_stop_requests
    await asyncio.wait_for(runtime._async_wait_zone_duration(600, "z1"), timeout=1)
    with pytest.raises(TimeoutError):
        await asyncio.wait_for(runtime._async_wait_zone_duration(600, "z2"), timeout=0.3)
    assert not runtime._stop_event.is_set()


@pytest.mark.asyncio
async def test_stop_queued_zone_removes_it_from_the_plan() -> None:
    """A zone that has not started is dropped; the panel sees the shorter plan."""
    runtime = _runtime(_zone("z1"), _zone("z2"), _zone("z3"))
    rs = runtime.coordinator.run_state
    rs.run_state = RUN_STATE_RUNNING
    rs.active_zone_ids = ["z1"]
    runtime._phase_queue = [["z2"], ["z3"]]

    await runtime.async_stop_zone("z2")

    assert runtime._phase_queue == [["z3"]]
    assert rs.upcoming_phases == [["z3"]]
    assert "z2" not in runtime._zone_stop_requests
    runtime.coordinator.async_update_run_state.assert_awaited()


@pytest.mark.asyncio
async def test_stop_zone_rejects_idle_and_unknown_zone() -> None:
    runtime = _runtime(_zone("z1"))

    with pytest.raises(ZoneStopError) as idle:
        await runtime.async_stop_zone("z1")
    assert idle.value.code == "zone_not_running"

    runtime.coordinator.run_state.run_state = RUN_STATE_RUNNING
    with pytest.raises(ZoneStopError) as unknown:
        await runtime.async_stop_zone("nope")
    assert unknown.value.code == "unknown_zone"

    # Running, but this zone is neither active nor queued.
    with pytest.raises(ZoneStopError) as absent:
        await runtime.async_stop_zone("z1")
    assert absent.value.code == "zone_not_running"


@pytest.mark.asyncio
async def test_zone_finished_event_flags_a_stopped_zone() -> None:
    """Automations can tell a cut-short zone from one that ran its full duration."""
    zone = _zone("z1")
    runtime = _runtime(zone)
    runtime._zone_stop_requests.add("z1")

    await asyncio.wait_for(runtime._async_zone_run(zone, duration_min=10), timeout=2)

    finished = [
        c.args[1] for c in runtime.hass.bus.async_fire.call_args_list if c.args[0] == EVENT_ZONE_FINISHED
    ]
    assert finished == [
        {"zone_id": "z1", "entity_id": "switch.z1", "entity_ids": ["switch.z1"], "stopped": True}
    ]
    assert "z1" not in runtime._zone_stop_requests
    # The safety off still ran.
    runtime.hass.services.async_call.assert_any_await(
        "switch", "turn_off", {"entity_id": "switch.z1"}, blocking=True
    )


@pytest.mark.asyncio
async def test_stopping_the_only_zone_while_preparing_ends_the_run() -> None:
    """No point in finishing the pre-start delay for a run with nothing left in it."""
    runtime = _runtime(_zone("z1"))
    rs = runtime.coordinator.run_state
    rs.run_state = RUN_STATE_PREPARING
    runtime._manual_zone_order = ["z1"]
    runtime._phase_queue = [["z1"]]

    await runtime.async_stop_zone("z1")

    assert runtime._stop_event.is_set()
    assert runtime._phase_queue == []
    assert rs.upcoming_phases == []


@pytest.mark.asyncio
async def test_stop_all_clears_pending_zone_stops() -> None:
    runtime = _runtime(_zone("z1"))
    runtime._zone_stop_requests.add("z1")

    await runtime.async_stop_all()

    assert runtime._zone_stop_requests == set()
    assert runtime.coordinator.run_state.run_state == RUN_STATE_IDLE
