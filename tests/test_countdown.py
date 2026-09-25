"""A zone's hardware countdown is armed before the valve opens and cleared after.

The countdown is the valve's own timer: it closes the valve when Home
Assistant is no longer around to do so. It is a backstop, so it must never
block or shorten a run of its own.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.simple_irrigation.countdown import countdown_value
from custom_components.simple_irrigation.models import RunState, Zone
from custom_components.simple_irrigation.runtime import IrrigationRuntime
from custom_components.simple_irrigation.validation import validate_countdown_entity

COUNTDOWN = "number.valve_countdown_l1"


def _state(unit: str | None = "min", **attrs) -> MagicMock:
    state = MagicMock()
    state.attributes = {**attrs}
    if unit is not None:
        state.attributes["unit_of_measurement"] = unit
    return state


def _hass(calls: list[tuple[str, str, dict]], states: dict[str, MagicMock]) -> MagicMock:
    hass = MagicMock()

    async def _call(domain, service, data=None, **_kwargs):
        calls.append((domain, service, dict(data or {})))

    hass.services.async_call = AsyncMock(side_effect=_call)
    hass.states.get = lambda eid: states.get(eid)
    hass.bus.async_fire = MagicMock()
    return hass


def _runtime(hass: MagicMock, zone: Zone) -> IrrigationRuntime:
    coordinator = MagicMock()
    coordinator.installation = MagicMock(zones={zone.zone_id: zone}, pre_start_switches=[])
    coordinator.run_state = RunState()
    coordinator.async_update_run_state = AsyncMock()
    runtime = IrrigationRuntime(hass, coordinator)
    runtime._async_wait_zone_duration = AsyncMock()
    return runtime


def _zone(**kwargs) -> Zone:
    base = {
        "zone_id": "z1",
        "name": "Front",
        "switch_entity_ids": ["switch.front"],
        "countdown_entity_id": COUNTDOWN,
    }
    base.update(kwargs)
    return Zone(**base)


# --- runtime -----------------------------------------------------------------


@pytest.mark.asyncio
async def test_countdown_is_set_before_the_valve_opens_and_cleared_after() -> None:
    calls: list[tuple[str, str, dict]] = []
    hass = _hass(calls, {COUNTDOWN: _state("min", min=0, max=1440)})
    runtime = _runtime(hass, _zone())

    await runtime._async_zone_run(_zone(), duration_min=15)

    assert calls == [
        ("number", "set_value", {"entity_id": COUNTDOWN, "value": 15}),
        ("switch", "turn_on", {"entity_id": "switch.front"}),
        ("switch", "turn_off", {"entity_id": "switch.front"}),
        ("number", "set_value", {"entity_id": COUNTDOWN, "value": 0.0}),
    ]
    assert not runtime._armed_countdowns


@pytest.mark.asyncio
async def test_seconds_unit_read_off_the_entity() -> None:
    calls: list[tuple[str, str, dict]] = []
    hass = _hass(calls, {COUNTDOWN: _state("s")})
    await _runtime(hass, _zone())._async_zone_run(_zone(), duration_min=2)

    assert calls[0] == ("number", "set_value", {"entity_id": COUNTDOWN, "value": 120})


@pytest.mark.asyncio
async def test_explicit_unit_wins_over_the_entity() -> None:
    calls: list[tuple[str, str, dict]] = []
    hass = _hass(calls, {COUNTDOWN: _state("min")})
    zone = _zone(countdown_unit="seconds")
    await _runtime(hass, zone)._async_zone_run(zone, duration_min=2)

    assert calls[0] == ("number", "set_value", {"entity_id": COUNTDOWN, "value": 120})


@pytest.mark.asyncio
async def test_no_countdown_configured_changes_nothing() -> None:
    calls: list[tuple[str, str, dict]] = []
    hass = _hass(calls, {})
    zone = _zone(countdown_entity_id="")
    await _runtime(hass, zone)._async_zone_run(zone, duration_min=5)

    assert [c[1] for c in calls] == ["turn_on", "turn_off"]


@pytest.mark.asyncio
async def test_unknown_unit_skips_the_timer_and_still_waters() -> None:
    calls: list[tuple[str, str, dict]] = []
    hass = _hass(calls, {COUNTDOWN: _state(None)})
    await _runtime(hass, _zone())._async_zone_run(_zone(), duration_min=5)

    assert [c[1] for c in calls] == ["turn_on", "turn_off"]


@pytest.mark.asyncio
async def test_failed_set_value_does_not_block_the_run() -> None:
    calls: list[tuple[str, str, dict]] = []
    hass = _hass(calls, {COUNTDOWN: _state("min")})

    async def _call(domain, service, data=None, **_kwargs):
        if service == "set_value":
            raise RuntimeError("device offline")
        calls.append((domain, service, dict(data or {})))

    hass.services.async_call = AsyncMock(side_effect=_call)
    runtime = _runtime(hass, _zone())

    await runtime._async_zone_run(_zone(), duration_min=5)

    assert [c[1] for c in calls] == ["turn_on", "turn_off"]
    assert not runtime._armed_countdowns


@pytest.mark.asyncio
async def test_stop_all_clears_an_armed_countdown() -> None:
    """stop_all cancels the zone task, so the cleanup has to disarm the timer."""
    calls: list[tuple[str, str, dict]] = []
    hass = _hass(calls, {COUNTDOWN: _state("min", min=0)})
    runtime = _runtime(hass, _zone())

    await runtime._async_arm_countdown(_zone(), 10)
    runtime._touched_entities.add("switch.front")
    await runtime._async_turn_off_all_tracked()

    assert calls[-2:] == [
        ("switch", "turn_off", {"entity_id": "switch.front"}),
        ("number", "set_value", {"entity_id": COUNTDOWN, "value": 0.0}),
    ]
    assert not runtime._armed_countdowns


@pytest.mark.asyncio
async def test_entity_that_cannot_go_to_zero_is_not_rearmed_on_clear() -> None:
    calls: list[tuple[str, str, dict]] = []
    hass = _hass(calls, {COUNTDOWN: _state("min", min=1, max=60)})
    await _runtime(hass, _zone())._async_zone_run(_zone(), duration_min=5)

    assert [c[1] for c in calls] == ["set_value", "turn_on", "turn_off"]


# --- value -------------------------------------------------------------------


def test_value_is_clamped_to_the_entity_range() -> None:
    hass = _hass([], {COUNTDOWN: _state("min", min=0, max=60)})
    assert countdown_value(hass, _zone(), 90) == 60
    assert countdown_value(hass, _zone(), 30) == 30


def test_value_rounds_up_to_whole_units() -> None:
    hass = _hass([], {COUNTDOWN: _state("min")})
    assert countdown_value(hass, _zone(), 7) == 7
    assert isinstance(countdown_value(hass, _zone(), 7), int)


# --- validation --------------------------------------------------------------


def test_validation_accepts_empty() -> None:
    hass = _hass([], {})
    assert validate_countdown_entity(hass, "", "") is None
    assert validate_countdown_entity(hass, None, None) is None


def test_validation_accepts_number_with_unit() -> None:
    hass = _hass([], {COUNTDOWN: _state("min")})
    assert validate_countdown_entity(hass, COUNTDOWN, "") is None
    assert validate_countdown_entity(hass, "input_number.timer", "minutes") == "unknown_entity"


def test_validation_rejects_wrong_domain_and_missing_unit() -> None:
    hass = _hass([], {COUNTDOWN: _state(None), "switch.x": _state(None)})
    assert validate_countdown_entity(hass, "switch.x", "") == "invalid_countdown"
    assert validate_countdown_entity(hass, COUNTDOWN, "") == "invalid_countdown_unit"
    assert validate_countdown_entity(hass, COUNTDOWN, "hours") == "invalid_countdown_unit"
    assert validate_countdown_entity(hass, COUNTDOWN, "minutes") is None
    assert validate_countdown_entity(hass, "number.missing", "minutes") == "unknown_entity"
