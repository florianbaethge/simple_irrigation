"""Valves must not stay open across a Home Assistant restart or shutdown.

A run that Home Assistant goes down under leaves its zone valves open: the
new process has no memory of having opened them. The store has -- it knows
which zones were watering -- so startup closes those, and shutdown closes
what it can before the lights go out.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from custom_components.simple_irrigation.const import (
    RUN_STATE_ERROR,
    RUN_STATE_IDLE,
    RUN_STATE_RUNNING,
)
from custom_components.simple_irrigation.models import RunState, Zone
from custom_components.simple_irrigation.runtime import IrrigationRuntime

RUNTIME = "custom_components.simple_irrigation.runtime"
PUMP = "switch.pump"
COUNTDOWN = "number.front_countdown"


def _zone(zid: str, **kwargs) -> Zone:
    return Zone(zone_id=zid, name=zid.upper(), switch_entity_ids=[f"switch.{zid}"], **kwargs)


def _runtime(
    *zones: Zone,
    run_state: RunState | None = None,
    started: bool = True,
    failing: set[str] | None = None,
) -> tuple[IrrigationRuntime, list[tuple[str, str, str]]]:
    """A runtime over a fake Home Assistant, and the service calls it makes."""
    calls: list[tuple[str, str, str]] = []
    broken = failing if failing is not None else set()

    async def _call(domain, service, data=None, **_kwargs):
        entity_id = (data or {}).get("entity_id", "")
        if entity_id in broken:
            raise RuntimeError(f"{entity_id} is not there yet")
        calls.append((domain, service, entity_id))

    hass = MagicMock()
    hass.is_running = started
    hass.services.async_call = AsyncMock(side_effect=_call)
    hass.states.get = lambda _entity_id: None

    coordinator = MagicMock()
    coordinator.installation = MagicMock(
        zones={z.zone_id: z for z in zones},
        pre_start_switches=[PUMP],
    )
    coordinator.run_state = run_state or RunState()
    coordinator.async_update_run_state = AsyncMock()
    coordinator.store.async_save = AsyncMock()
    return IrrigationRuntime(hass, coordinator), calls


def _cut_off(*zone_ids: str) -> RunState:
    """The run state a crash leaves in the store."""
    return RunState(run_state=RUN_STATE_RUNNING, active_zone_ids=list(zone_ids))


def _closed(calls: list[tuple[str, str, str]]) -> list[str]:
    return [entity_id for _domain, service, entity_id in calls if service == "turn_off"]


@pytest.mark.asyncio
async def test_startup_closes_the_zones_a_run_was_cut_off_in() -> None:
    runtime, calls = _runtime(_zone("z1"), _zone("z2"), _zone("z3"), run_state=_cut_off("z1", "z2"))

    await runtime.async_setup()

    assert _closed(calls) == [PUMP, "switch.z1", "switch.z2"]
    rs = runtime.coordinator.run_state
    assert rs.run_state == RUN_STATE_ERROR
    assert rs.active_zone_ids == []


@pytest.mark.asyncio
async def test_startup_without_a_cut_off_run_leaves_the_zones_alone() -> None:
    """A valve somebody opened by hand stays as it is."""
    runtime, calls = _runtime(_zone("z1"), run_state=RunState(run_state=RUN_STATE_IDLE))

    await runtime.async_setup()

    assert _closed(calls) == [PUMP]


@pytest.mark.asyncio
async def test_startup_skips_a_zone_that_no_longer_exists() -> None:
    runtime, calls = _runtime(_zone("z1"), run_state=_cut_off("z1", "gone"))

    await runtime.async_setup()

    assert _closed(calls) == [PUMP, "switch.z1"]


@pytest.mark.asyncio
async def test_startup_clears_the_hardware_countdown_of_a_closed_zone() -> None:
    zone = _zone("z1", countdown_entity_id=COUNTDOWN)
    runtime, calls = _runtime(zone, run_state=_cut_off("z1"))

    await runtime.async_setup()

    assert ("number", "set_value", COUNTDOWN) in calls
    assert calls.index(("switch", "turn_off", "switch.z1")) < calls.index(
        ("number", "set_value", COUNTDOWN)
    )


@pytest.mark.asyncio
async def test_closing_is_repeated_once_home_assistant_has_started() -> None:
    """During startup the valve's integration may not be loaded: try again later."""
    failing = {"switch.z1"}
    runtime, calls = _runtime(_zone("z1"), run_state=_cut_off("z1"), started=False, failing=failing)

    with patch(f"{RUNTIME}.async_at_started") as at_started:
        await runtime.async_setup()

    # The first attempt failed quietly; nothing is reported yet.
    assert _closed(calls) == [PUMP]
    assert runtime.coordinator.run_state.last_error == "Interrupted by Home Assistant restart"
    at_started.assert_called_once()

    failing.clear()
    calls.clear()
    await at_started.call_args.args[1](runtime.hass)

    assert _closed(calls) == [PUMP, "switch.z1"]


@pytest.mark.asyncio
async def test_a_valve_that_still_will_not_close_is_reported() -> None:
    runtime, _calls = _runtime(_zone("z1"), run_state=_cut_off("z1"), failing={"switch.z1"})

    await runtime.async_setup()

    assert runtime.coordinator.run_state.last_error == "Could not turn off: switch.z1"


@pytest.mark.asyncio
async def test_the_second_pass_keeps_its_hands_off_a_run_that_began_since() -> None:
    runtime, calls = _runtime(_zone("z1"), _zone("z2"), run_state=_cut_off("z1", "z2"), started=False)

    with patch(f"{RUNTIME}.async_at_started") as at_started:
        await runtime.async_setup()
    # A new run is watering z1 by the time Home Assistant has finished starting.
    rs = runtime.coordinator.run_state
    rs.run_state = RUN_STATE_RUNNING
    rs.active_zone_ids = ["z1"]
    runtime._touched_entities = {PUMP, "switch.z1"}
    calls.clear()

    await at_started.call_args.args[1](runtime.hass)

    assert _closed(calls) == ["switch.z2"]


@pytest.mark.asyncio
async def test_unloading_before_the_start_event_cancels_the_second_pass() -> None:
    runtime, _calls = _runtime(_zone("z1"), started=False)

    with patch(f"{RUNTIME}.async_at_started") as at_started:
        await runtime.async_setup()
    await runtime.async_shutdown()

    at_started.return_value.assert_called_once()


@pytest.mark.asyncio
async def test_shutdown_closes_the_outputs_and_keeps_the_run_on_record() -> None:
    """The next start must find the run, so it can close the valves once more."""
    runtime, calls = _runtime(_zone("z1"), _zone("z2"), run_state=_cut_off("z1"))
    runtime._touched_entities = {PUMP, "switch.z1"}

    await runtime.async_close_for_shutdown()

    assert sorted(_closed(calls)) == [PUMP, "switch.z1"]
    rs = runtime.coordinator.run_state
    assert rs.run_state == RUN_STATE_RUNNING
    assert rs.active_zone_ids == ["z1"]
    runtime.coordinator.store.async_save.assert_awaited()


@pytest.mark.asyncio
async def test_shutdown_then_startup_closes_the_same_valves_again() -> None:
    """The call at shutdown may be lost to an integration that stopped first."""
    lost = {"switch.z1"}
    runtime, calls = _runtime(_zone("z1"), run_state=_cut_off("z1"), failing=lost)
    runtime._touched_entities = {"switch.z1"}
    await runtime.async_close_for_shutdown()
    assert "switch.z1" not in _closed(calls)

    restarted, calls = _runtime(_zone("z1"), run_state=runtime.coordinator.run_state)
    await restarted.async_setup()

    assert "switch.z1" in _closed(calls)


@pytest.mark.asyncio
async def test_shutdown_while_idle_does_nothing() -> None:
    runtime, calls = _runtime(_zone("z1"))

    await runtime.async_close_for_shutdown()

    assert calls == []
    runtime.coordinator.store.async_save.assert_not_awaited()


@pytest.mark.asyncio
async def test_shutdown_closes_the_outputs_of_a_run_that_will_not_stop() -> None:
    """A run stuck in a script must not keep the valves open past shutdown."""
    runtime, calls = _runtime(_zone("z1"), run_state=_cut_off("z1"))
    runtime._touched_entities = {"switch.z1"}
    runtime._task = asyncio.ensure_future(asyncio.sleep(3600))

    with patch(f"{RUNTIME}.SHUTDOWN_CLOSE_TIMEOUT_SEC", 0.05):
        await runtime.async_close_for_shutdown()

    assert "switch.z1" in _closed(calls)
    assert runtime._task.cancelled()
