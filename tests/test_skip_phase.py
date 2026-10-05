"""Skip phase from outside the panel: the service, the card, and the clock a card
needs to draw a zone's progress."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from custom_components.simple_irrigation.card_api import CARD_ACTIONS, _snapshot
from custom_components.simple_irrigation.const import (
    DOMAIN,
    RUN_STATE_RUNNING,
    SERVICE_SKIP_PHASE,
)
from custom_components.simple_irrigation.models import Installation, RunState, Zone
from custom_components.simple_irrigation.runtime import IrrigationRuntime
from custom_components.simple_irrigation.services import async_setup_services


def _zone(zid: str, **kwargs) -> Zone:
    return Zone(zone_id=zid, name=zid.upper(), switch_entity_ids=[f"switch.{zid}"], **kwargs)


def _runtime(*zones: Zone) -> IrrigationRuntime:
    hass = MagicMock()
    hass.services.async_call = AsyncMock()
    coordinator = MagicMock()
    coordinator.installation = MagicMock(zones={z.zone_id: z for z in zones}, max_parallel_zones=2)
    coordinator.run_state = RunState()
    coordinator.async_update_run_state = AsyncMock()
    return IrrigationRuntime(hass, coordinator)


async def _registered_handler(runtime) -> tuple:
    """Set the services up on a fake Home Assistant and hand back skip_phase."""
    handlers: dict[str, object] = {}
    hass = MagicMock()
    hass.services.has_service.return_value = False
    hass.services.async_register = lambda _domain, name, handler, schema=None: handlers.__setitem__(
        name, (handler, schema)
    )
    hass.data = {DOMAIN: {"e1": {"runtime": runtime}}}
    hass.config_entries.async_entries.return_value = [SimpleNamespace(entry_id="e1")]
    await async_setup_services(hass)
    return handlers[SERVICE_SKIP_PHASE]


@pytest.mark.asyncio
async def test_skip_phase_service_ends_the_running_phase() -> None:
    runtime = _runtime(_zone("z1"))
    runtime.coordinator.run_state.run_state = RUN_STATE_RUNNING
    handler, schema = await _registered_handler(runtime)

    await handler(SimpleNamespace(data=schema({})))

    assert runtime._skip_phase_event.is_set()


@pytest.mark.asyncio
async def test_skip_phase_service_is_quiet_when_nothing_runs() -> None:
    """An automation may call it at any time; idle is not an error."""
    runtime = _runtime(_zone("z1"))
    handler, schema = await _registered_handler(runtime)

    await handler(SimpleNamespace(data=schema({})))

    assert not runtime._skip_phase_event.is_set()


def test_the_card_may_skip_a_phase() -> None:
    assert "skip_phase" in CARD_ACTIONS


@pytest.mark.asyncio
async def test_a_skipped_phase_ends_the_wait_of_every_zone_in_it() -> None:
    runtime = _runtime(_zone("z1"), _zone("z2"))
    runtime.coordinator.run_state.run_state = RUN_STATE_RUNNING
    waits = [
        asyncio.ensure_future(runtime._async_wait_zone_duration(600, zid)) for zid in ("z1", "z2")
    ]
    await asyncio.sleep(0)

    assert await runtime.async_skip_to_next_phase()

    await asyncio.wait_for(asyncio.gather(*waits), timeout=2)


@pytest.mark.asyncio
async def test_a_watering_zone_carries_its_start_beside_its_end() -> None:
    """Progress is start to end; the mode's duration says nothing about a manual run."""
    runtime = _runtime(_zone("z1"))
    rs = runtime.coordinator.run_state

    await runtime._async_publish_zone_end("z1", 300)

    assert rs.zone_ends_at["z1"] - rs.zone_started_at["z1"] == timedelta(seconds=300)
    assert rs.to_dict()["zone_started_at"] == {"z1": rs.zone_started_at["z1"].isoformat()}


@pytest.mark.asyncio
async def test_the_start_is_gone_once_the_zone_has_finished() -> None:
    runtime = _runtime(_zone("z1"))
    rs = runtime.coordinator.run_state

    await runtime._async_wait_zone_duration(0.01, "z1")

    assert rs.zone_started_at == {}
    assert rs.zone_ends_at == {}


def test_a_restored_run_state_has_no_zone_start() -> None:
    started = datetime(2026, 8, 15, 10, 0, tzinfo=timezone.utc)
    restored = RunState.from_dict(RunState(zone_started_at={"z1": started}).to_dict())

    assert restored.zone_started_at == {}


def test_the_card_gets_start_end_and_exclusive_for_every_zone() -> None:
    started = datetime(2026, 8, 15, 10, 0, tzinfo=timezone.utc)
    ends = started + timedelta(minutes=5)
    inst = Installation(
        installation_id="i1",
        name="Garden",
        zones={"z1": _zone("z1"), "z2": _zone("z2", exclusive=True)},
    )
    rs = RunState(
        run_state=RUN_STATE_RUNNING,
        active_zone_ids=["z1"],
        zone_started_at={"z1": started},
        zone_ends_at={"z1": ends},
    )
    hass = MagicMock()
    hass.states.get.return_value = None
    hass.config.time_zone = "UTC"
    data = {"coordinator": SimpleNamespace(installation=inst, run_state=rs)}

    with patch("custom_components.simple_irrigation.card_api._entity_id", return_value=""):
        zones = {z["zone_id"]: z for z in _snapshot(hass, "e1", data)["zones"]}

    assert zones["z1"]["started_at"] == started.isoformat()
    assert zones["z1"]["ends_at"] == ends.isoformat()
    assert zones["z2"]["started_at"] is None
    assert (zones["z1"]["exclusive"], zones["z2"]["exclusive"]) == (False, True)
