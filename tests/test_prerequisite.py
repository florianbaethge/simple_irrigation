"""A zone prerequisite opens first and always closes after its dependants."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.simple_irrigation.models import RunState, Zone, ZonePrerequisite
from custom_components.simple_irrigation.runtime import IrrigationRuntime
from custom_components.simple_irrigation.validation import validate_zone_payload


def _runtime(zone: Zone, calls: list[tuple[str, str, dict]]) -> IrrigationRuntime:
    hass = MagicMock()

    async def _call(domain, service, data=None, **_kwargs):
        calls.append((domain, service, dict(data or {})))

    hass.services.async_call = AsyncMock(side_effect=_call)
    hass.bus.async_fire = MagicMock()
    coordinator = SimpleNamespace(
        installation=SimpleNamespace(zones={zone.zone_id: zone}, pre_start_switches=[]),
        run_state=RunState(),
        async_update_run_state=AsyncMock(),
    )
    runtime = IrrigationRuntime(hass, coordinator)
    runtime._async_wait_zone_duration = AsyncMock()
    runtime._async_sleep_interruptible = AsyncMock()
    return runtime


def test_prerequisite_round_trip_and_legacy_default() -> None:
    legacy = Zone.from_dict(
        {"zone_id": "z1", "name": "Legacy", "switch_entity_ids": ["switch.zone"]}
    )
    assert legacy.prerequisite is None

    zone = Zone(
        zone_id="z1",
        name="Trees",
        switch_entity_ids=["switch.downstream"],
        prerequisite=ZonePrerequisite(
            output_entity_ids=["valve.supply"],
            start_service="hydrawise.start_watering",
            duration_field="duration",
            duration_unit="minutes",
            start_entity_id="binary_sensor.supply_watering",
            start_delay_sec=5,
            stop_delay_sec=10,
            require_open_state=True,
        ),
    )
    assert Zone.from_dict(zone.to_dict()).to_dict() == zone.to_dict()


def test_duration_service_covers_margins_and_shutdown_is_reversed() -> None:
    async def scenario() -> None:
        calls: list[tuple[str, str, dict]] = []
        zone = Zone(
            zone_id="z1",
            name="Trees",
            switch_entity_ids=["switch.downstream"],
            prerequisite=ZonePrerequisite(
                output_entity_ids=["valve.supply"],
                start_service="hydrawise.start_watering",
                duration_field="duration",
                duration_unit="minutes",
                start_entity_id="binary_sensor.supply_watering",
                start_delay_sec=5,
                stop_delay_sec=10,
            ),
        )
        runtime = _runtime(zone, calls)

        await runtime._async_zone_run(zone, 6)

        assert calls == [
            (
                "hydrawise",
                "start_watering",
                {"entity_id": "binary_sensor.supply_watering", "duration": 7},
            ),
            ("switch", "turn_on", {"entity_id": "switch.downstream"}),
            ("switch", "turn_off", {"entity_id": "switch.downstream"}),
            ("valve", "close_valve", {"entity_id": "valve.supply"}),
        ]

    asyncio.run(scenario())


def test_failed_supply_start_closes_dependant_then_supply() -> None:
    async def scenario() -> None:
        calls: list[tuple[str, str, dict]] = []
        zone = Zone(
            zone_id="z1",
            name="Trees",
            switch_entity_ids=["switch.downstream"],
            prerequisite=ZonePrerequisite(
                output_entity_ids=["valve.supply"],
                start_service="hydrawise.start_watering",
                duration_field="duration",
                duration_unit="minutes",
                start_entity_id="binary_sensor.supply_watering",
            ),
        )
        runtime = _runtime(zone, calls)
        original_call = runtime.hass.services.async_call

        async def _fail_start(domain, service, data=None, **kwargs):
            if domain == "hydrawise":
                raise RuntimeError("controller rejected start")
            await original_call(domain, service, data, **kwargs)

        runtime.hass.services.async_call = AsyncMock(side_effect=_fail_start)

        with pytest.raises(RuntimeError, match="controller rejected"):
            await runtime._async_zone_run(zone, 6)

        assert calls == [
            ("switch", "turn_off", {"entity_id": "switch.downstream"}),
            ("valve", "close_valve", {"entity_id": "valve.supply"}),
        ]

    asyncio.run(scenario())


def test_stop_during_supply_warmup_never_opens_dependant() -> None:
    async def scenario() -> None:
        calls: list[tuple[str, str, dict]] = []
        zone = Zone(
            zone_id="z1",
            name="Trees",
            switch_entity_ids=["switch.downstream"],
            prerequisite=ZonePrerequisite(
                output_entity_ids=["valve.supply"],
                start_delay_sec=10,
            ),
        )
        runtime = _runtime(zone, calls)

        async def _stop_during_delay(_seconds: float) -> None:
            runtime._zone_stop_requests.add(zone.zone_id)

        runtime._async_sleep_interruptible = AsyncMock(side_effect=_stop_during_delay)
        await runtime._async_zone_run(zone, 6)

        assert calls == [
            ("valve", "open_valve", {"entity_id": "valve.supply"}),
            ("valve", "close_valve", {"entity_id": "valve.supply"}),
        ]

    asyncio.run(scenario())


def test_validation_rejects_supply_that_is_also_a_zone_output() -> None:
    hass = MagicMock()
    hass.states.get.return_value = MagicMock()
    hass.services.has_service.return_value = True
    payload = {
        "name": "Trees",
        "switch_entity_ids": ["switch.same"],
        "duration_eco_min": 5,
        "duration_normal_min": 10,
        "duration_extra_min": 15,
        "prerequisite": {"output_entity_ids": ["switch.same"]},
    }

    assert validate_zone_payload(hass, payload) == "duplicate_prerequisite_output"


def test_validation_accepts_complete_duration_aware_supply() -> None:
    known = {
        "switch.downstream",
        "valve.supply",
        "binary_sensor.supply_watering",
    }
    hass = MagicMock()
    hass.states.get.side_effect = lambda entity_id: MagicMock() if entity_id in known else None
    hass.services.has_service.side_effect = (
        lambda domain, service: f"{domain}.{service}" == "hydrawise.start_watering"
    )
    payload = {
        "name": "Trees",
        "switch_entity_ids": ["switch.downstream"],
        "duration_eco_min": 5,
        "duration_normal_min": 10,
        "duration_extra_min": 15,
        "prerequisite": {
            "output_entity_ids": ["valve.supply"],
            "start_service": "hydrawise.start_watering",
            "duration_field": "duration",
            "duration_unit": "minutes",
            "start_entity_id": "binary_sensor.supply_watering",
            "start_delay_sec": 5,
            "stop_delay_sec": 10,
            "require_open_state": True,
        },
    }

    assert validate_zone_payload(hass, payload) is None


@pytest.mark.parametrize("delay", [-1, 3601, "later", True])
def test_validation_rejects_invalid_supply_delay(delay) -> None:
    hass = MagicMock()
    hass.states.get.return_value = MagicMock()
    payload = {
        "name": "Trees",
        "switch_entity_ids": ["switch.downstream"],
        "duration_eco_min": 5,
        "duration_normal_min": 10,
        "duration_extra_min": 15,
        "prerequisite": {
            "output_entity_ids": ["valve.supply"],
            "start_delay_sec": delay,
        },
    }

    assert validate_zone_payload(hass, payload) == "invalid_prerequisite_delay"
