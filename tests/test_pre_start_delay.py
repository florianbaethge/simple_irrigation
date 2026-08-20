"""The pre-start delay must not push a scheduled run past its minute.

The delay exists to let a pump build pressure. An installation without
pre-start outputs has no pump, so it must open its zones at the scheduled
second -- not one tick later.
"""

from __future__ import annotations

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.simple_irrigation.config_flow import SimpleIrrigationConfigFlow
from custom_components.simple_irrigation.models import Installation, RunState, Zone
from custom_components.simple_irrigation.runtime import IrrigationRuntime


def _hass(calls: list[tuple[float, str, str, dict]]) -> MagicMock:
    """hass recording every service call with the moment it happened."""
    hass = MagicMock()

    async def _call(domain, service, data=None, **kwargs):
        calls.append((time.monotonic(), domain, service, dict(data or {})))

    hass.services.async_call = AsyncMock(side_effect=_call)
    hass.async_create_task = lambda coro, name=None: asyncio.ensure_future(coro)
    return hass


def _runtime(hass: MagicMock, inst: Installation) -> IrrigationRuntime:
    coordinator = MagicMock()
    coordinator.installation = inst
    coordinator.run_state = RunState()
    coordinator.async_update_run_state = AsyncMock()
    return IrrigationRuntime(hass, coordinator)


def _installation(**kwargs) -> Installation:
    base = {
        "installation_id": "i1",
        "name": "Garden",
        "zones": {"z1": Zone(zone_id="z1", name="Zone 1", switch_entity_ids=["switch.z1"])},
    }
    base.update(kwargs)
    return Installation(**base)


async def _seconds_until_zone_opens(inst: Installation) -> float:
    """Run one phase and report how long the valve stayed shut."""
    calls: list[tuple[float, str, str, dict]] = []
    runtime = _runtime(_hass(calls), inst)

    started = time.monotonic()
    await runtime.async_run_phases([["z1"]], scheduled=True, slot_ids=[])
    for _ in range(500):
        if any(c[2] == "turn_on" and c[3].get("entity_id") == "switch.z1" for c in calls):
            break
        await asyncio.sleep(0.01)
    await runtime.async_stop_all()

    opened = next(
        c[0] for c in calls if c[2] == "turn_on" and c[3].get("entity_id") == "switch.z1"
    )
    return opened - started


@pytest.mark.asyncio
async def test_no_pre_start_outputs_opens_the_zone_immediately() -> None:
    """No pump configured: the delay must not be served at all."""
    inst = _installation(pre_start_switches=[], pre_start_delay_sec=10)
    assert await _seconds_until_zone_opens(inst) < 0.5


@pytest.mark.asyncio
async def test_pre_start_outputs_still_get_their_delay() -> None:
    """A pump still gets the full configured time to build pressure."""
    inst = _installation(pre_start_switches=["switch.pump"], pre_start_delay_sec=1)
    assert await _seconds_until_zone_opens(inst) >= 1.0


@pytest.mark.asyncio
async def test_pre_start_outputs_come_up_before_the_zone() -> None:
    """Order is unchanged: pump first, then the zone."""
    calls: list[tuple[float, str, str, dict]] = []
    inst = _installation(pre_start_switches=["switch.pump"], pre_start_delay_sec=1)
    runtime = _runtime(_hass(calls), inst)

    await runtime.async_run_phases([["z1"]], scheduled=True, slot_ids=[])
    for _ in range(500):
        if any(c[3].get("entity_id") == "switch.z1" for c in calls):
            break
        await asyncio.sleep(0.01)
    await runtime.async_stop_all()

    turned_on = [c[3].get("entity_id") for c in calls if c[2] == "turn_on"]
    assert turned_on.index("switch.pump") < turned_on.index("switch.z1")


@pytest.mark.asyncio
async def test_config_flow_offers_zero_as_the_lowest_delay() -> None:
    """The setup form must let someone without a pump ask for no delay at all."""
    flow = SimpleIrrigationConfigFlow()
    flow.hass = MagicMock()
    result = await flow.async_step_user(None)

    selector = next(
        v
        for k, v in result["data_schema"].schema.items()
        if str(k) == "pre_start_delay_sec"
    )
    assert selector.config["min"] == 0
