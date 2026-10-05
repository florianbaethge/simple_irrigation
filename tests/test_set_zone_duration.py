"""Tests for the set_zone_duration service."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
import voluptuous as vol

from homeassistant.exceptions import HomeAssistantError

from custom_components.simple_irrigation.const import DOMAIN, SERVICE_SET_ZONE_DURATION
from custom_components.simple_irrigation.models import Zone
from custom_components.simple_irrigation.services import async_setup_services

ENTRY_ID = "entry1"


async def _service(mode: str = "normal") -> tuple[object, object, MagicMock]:
    """Register the services on a fake hass; return (handler, schema, coordinator)."""
    zone = Zone(
        zone_id="z1",
        name="Lawn",
        switch_entity_ids=["switch.lawn"],
        duration_eco_min=10,
        duration_normal_min=15,
        duration_extra_min=20,
    )
    coordinator = MagicMock()
    coordinator.installation = SimpleNamespace(mode=mode, zones={"z1": zone})
    coordinator.async_update_installation = AsyncMock()

    hass = MagicMock()
    hass.services.has_service.return_value = False
    hass.config_entries.async_entries.return_value = [SimpleNamespace(entry_id=ENTRY_ID)]
    hass.data = {DOMAIN: {ENTRY_ID: {"coordinator": coordinator, "runtime": MagicMock()}}}
    await async_setup_services(hass)

    for call in hass.services.async_register.call_args_list:
        _domain, name, handler = call.args[:3]
        if name == SERVICE_SET_ZONE_DURATION:
            return handler, call.kwargs["schema"], coordinator
    raise AssertionError("set_zone_duration was not registered")


async def _call(current_mode: str, **data: object) -> tuple[Zone, MagicMock]:
    handler, schema, coordinator = await _service(current_mode)
    await handler(SimpleNamespace(data=schema(data)))
    return coordinator.installation.zones["z1"], coordinator


def _durations(zone: Zone) -> tuple[int, int, int]:
    return zone.duration_eco_min, zone.duration_normal_min, zone.duration_extra_min


@pytest.mark.asyncio
async def test_default_target_is_the_current_mode() -> None:
    zone, coordinator = await _call("extra", zone_id="z1", duration_min=7)
    assert _durations(zone) == (10, 15, 7)
    coordinator.async_update_installation.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("mode", "expected"),
    [
        ("eco", (7, 15, 20)),
        ("normal", (10, 7, 20)),
        ("extra", (10, 15, 7)),
        ("all", (7, 7, 7)),
    ],
)
async def test_explicit_target(mode: str, expected: tuple[int, int, int]) -> None:
    zone, _ = await _call("normal", zone_id="z1", duration_min=7, mode=mode)
    assert _durations(zone) == expected


@pytest.mark.asyncio
async def test_unknown_zone_is_rejected_without_saving() -> None:
    handler, schema, coordinator = await _service()
    with pytest.raises(HomeAssistantError):
        await handler(SimpleNamespace(data=schema({"zone_id": "nope", "duration_min": 5})))
    coordinator.async_update_installation.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("bad", [0, -3, 1441])
async def test_schema_rejects_out_of_range_minutes(bad: int) -> None:
    _handler, schema, _coordinator = await _service()
    with pytest.raises(vol.Invalid):
        schema({"zone_id": "z1", "duration_min": bad})


@pytest.mark.asyncio
async def test_schema_rejects_unknown_target() -> None:
    _handler, schema, _coordinator = await _service()
    with pytest.raises(vol.Invalid):
        schema({"zone_id": "z1", "duration_min": 5, "mode": "turbo"})
