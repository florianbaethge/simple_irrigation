"""Tests for per-zone custom start services carrying duration."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest
from homeassistant.exceptions import HomeAssistantError

from custom_components.simple_irrigation.models import RunState, Zone
from custom_components.simple_irrigation import runtime as runtime_module
from custom_components.simple_irrigation.runtime import IrrigationRuntime


def _runtime(calls: list[tuple[str, str, dict]], zone: Zone) -> IrrigationRuntime:
    hass = MagicMock()

    async def _call(domain, service, data=None, **_kwargs):
        calls.append((domain, service, dict(data or {})))

    hass.services.async_call = AsyncMock(side_effect=_call)
    hass.bus.async_fire = MagicMock()

    coordinator = MagicMock()
    coordinator.installation = MagicMock(zones={zone.zone_id: zone})
    coordinator.run_state = RunState()
    coordinator.async_update_run_state = AsyncMock()

    runtime = IrrigationRuntime(hass, coordinator)
    runtime._async_wait_zone_duration = AsyncMock()
    return runtime


@pytest.mark.asyncio
async def test_zone_uses_custom_start_service_with_minutes() -> None:
    calls: list[tuple[str, str, dict]] = []
    zone = Zone(
        zone_id="z1",
        name="Front",
        switch_entity_ids=["switch.front"],
        start_service="rainbird.start_irrigation",
        duration_field="duration",
        duration_unit="minutes",
    )
    runtime = _runtime(calls, zone)

    await runtime._async_zone_run(zone, duration_min=15)

    assert calls[0] == (
        "rainbird",
        "start_irrigation",
        {"entity_id": "switch.front", "duration": 15},
    )
    # Safety off still runs after the configured duration.
    assert calls[1] == ("switch", "turn_off", {"entity_id": "switch.front"})
    assert "switch.front" in runtime._touched_entities


@pytest.mark.asyncio
async def test_zone_uses_custom_target_and_seconds_conversion() -> None:
    calls: list[tuple[str, str, dict]] = []
    zone = Zone(
        zone_id="z1",
        name="Front",
        switch_entity_ids=["switch.front"],
        start_service="opensprinkler.run",
        duration_field="run_seconds",
        duration_unit="seconds",
        start_entity_id="binary_sensor.front_zone",
    )
    runtime = _runtime(calls, zone)

    await runtime._async_zone_run(zone, duration_min=2)

    assert calls[0] == (
        "opensprinkler",
        "run",
        {"entity_id": "binary_sensor.front_zone", "run_seconds": 120},
    )
    assert calls[1] == ("switch", "turn_off", {"entity_id": "switch.front"})


@pytest.mark.asyncio
async def test_zone_starts_all_outputs_in_parallel_when_no_target_is_set() -> None:
    """All outputs start together, like the default path — a zone with two outputs
    must not take twice its configured duration."""
    calls: list[tuple[str, str, dict]] = []
    zone = Zone(
        zone_id="z1",
        name="Front",
        switch_entity_ids=["switch.front", "switch.back"],
        start_service="rainbird.start_irrigation",
        duration_field="duration",
        duration_unit="minutes",
    )
    runtime = _runtime(calls, zone)

    await runtime._async_zone_run(zone, duration_min=7)

    starts, offs = calls[:2], calls[2:]
    assert sorted(starts) == [
        ("rainbird", "start_irrigation", {"entity_id": "switch.back", "duration": 7}),
        ("rainbird", "start_irrigation", {"entity_id": "switch.front", "duration": 7}),
    ]
    assert sorted(offs) == [
        ("switch", "turn_off", {"entity_id": "switch.back"}),
        ("switch", "turn_off", {"entity_id": "switch.front"}),
    ]
    # Exactly one wait for the whole zone, not one per output.
    assert runtime._async_wait_zone_duration.await_count == 1


@pytest.mark.asyncio
async def test_zone_falls_back_to_default_start_on_unknown_duration_unit() -> None:
    calls: list[tuple[str, str, dict]] = []
    zone = Zone(
        zone_id="z1",
        name="Front",
        switch_entity_ids=["switch.front"],
        start_service="rainbird.start_irrigation",
        duration_field="duration",
        duration_unit="hours",
    )
    runtime = _runtime(calls, zone)

    await runtime._async_zone_run(zone, duration_min=5)

    assert calls[0] == ("switch", "turn_on", {"entity_id": "switch.front"})
    assert calls[1] == ("switch", "turn_off", {"entity_id": "switch.front"})


@pytest.mark.asyncio
async def test_zone_falls_back_to_default_start_without_custom_service() -> None:
    calls: list[tuple[str, str, dict]] = []
    zone = Zone(
        zone_id="z1",
        name="Front",
        switch_entity_ids=["switch.front"],
    )
    runtime = _runtime(calls, zone)

    await runtime._async_zone_run(zone, duration_min=5)

    assert calls[0] == ("switch", "turn_on", {"entity_id": "switch.front"})
    assert calls[1] == ("switch", "turn_off", {"entity_id": "switch.front"})


@pytest.mark.asyncio
async def test_turn_off_failure_stops_before_next_zone_starts() -> None:
    calls: list[tuple[str, str, dict]] = []
    first_zone = Zone(
        zone_id="z1",
        name="Front",
        switch_entity_ids=["switch.front"],
        start_service="rainbird.start_irrigation",
        duration_field="duration",
        duration_unit="minutes",
    )
    hass = MagicMock()

    async def _call(domain, service, data=None, **_kwargs):
        payload = dict(data or {})
        calls.append((domain, service, payload))
        if service == "turn_off" and payload.get("entity_id") == "switch.front":
            raise HomeAssistantError("already off")

    hass.services.async_call = AsyncMock(side_effect=_call)
    hass.bus.async_fire = MagicMock()

    coordinator = MagicMock()
    coordinator.installation = MagicMock(zones={first_zone.zone_id: first_zone})
    coordinator.run_state = RunState()
    coordinator.async_update_run_state = AsyncMock()

    runtime = IrrigationRuntime(hass, coordinator)
    runtime._async_wait_zone_duration = AsyncMock()

    with pytest.raises(HomeAssistantError, match="already off"):
        await runtime._async_zone_run(first_zone, duration_min=15)

    assert calls[0] == (
        "rainbird",
        "start_irrigation",
        {"entity_id": "switch.front", "duration": 15},
    )
    assert calls[1] == ("switch", "turn_off", {"entity_id": "switch.front"})
    assert len(calls) == 2


@pytest.mark.asyncio
async def test_cleanup_closes_every_output_even_when_one_fails() -> None:
    """The cleanup path must not strand the remaining outputs, and must not raise.

    It runs from _async_finish_run() and async_stop_all(); a raise there leaves
    run_state on "stopping", which is_busy() reports as busy forever.
    """
    calls: list[tuple[str, str, dict]] = []
    zone = Zone(zone_id="z1", name="Front", switch_entity_ids=["switch.front"])
    runtime = _runtime(calls, zone)
    runtime.coordinator.installation.pre_start_switches = ["switch.pump"]

    async def _call(domain, service, data=None, **_kwargs):
        payload = dict(data or {})
        calls.append((domain, service, payload))
        if payload.get("entity_id") == "switch.broken":
            raise HomeAssistantError("entity unavailable")

    runtime.hass.services.async_call = AsyncMock(side_effect=_call)
    runtime._touched_entities.update({"switch.broken", "switch.front"})

    await runtime._async_turn_off_all_tracked()

    turned_off = {c[2]["entity_id"] for c in calls if c[1] == "turn_off"}
    assert turned_off == {"switch.broken", "switch.front", "switch.pump"}
    assert runtime._touched_entities == set()
    assert "switch.broken" in runtime.coordinator.run_state.last_error


@pytest.mark.asyncio
async def test_start_service_that_never_returns_does_not_park_the_zone(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A start service is expected to acknowledge and return. One that blocks for
    the whole watering time must not swallow the duration wait and stop_all()."""
    monkeypatch.setattr(runtime_module, "START_SERVICE_TIMEOUT_SEC", 0.05)
    calls: list[tuple[str, str, dict]] = []
    zone = Zone(
        zone_id="z1",
        name="Front",
        switch_entity_ids=["switch.front"],
        start_service="script.blocks_forever",
        duration_field="duration",
        duration_unit="minutes",
    )
    runtime = _runtime(calls, zone)

    async def _call(domain, service, data=None, **_kwargs):
        calls.append((domain, service, dict(data or {})))
        if domain == "script":
            await asyncio.sleep(30)

    runtime.hass.services.async_call = AsyncMock(side_effect=_call)

    await runtime._async_zone_run(zone, duration_min=15)

    assert calls[0] == (
        "script",
        "blocks_forever",
        {"entity_id": "switch.front", "duration": 15},
    )
    # The run carried on: duration waited once, output closed.
    assert runtime._async_wait_zone_duration.await_count == 1
    assert calls[1] == ("switch", "turn_off", {"entity_id": "switch.front"})
