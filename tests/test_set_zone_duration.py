"""Tests for the set_zone_duration service.

It writes minutes in one of two places: a zone's runtime for one mode, or one
schedule's fixed minutes for that zone.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
import voluptuous as vol

from homeassistant.exceptions import HomeAssistantError

from custom_components.simple_irrigation.const import DOMAIN, SERVICE_SET_ZONE_DURATION
from custom_components.simple_irrigation.models import Installation, ScheduleSlot, Zone
from custom_components.simple_irrigation.services import async_setup_services

ENTRY_ID = "entry1"


def _slot(slot_id: str, zone_ids: list[str], **kwargs) -> ScheduleSlot:
    return ScheduleSlot(
        slot_id=slot_id, weekdays=[0], time_local="06:00", zone_ids_ordered=zone_ids, **kwargs
    )


async def _service(*slots: ScheduleSlot) -> tuple[object, object, MagicMock]:
    """Register the services on a fake hass; return (handler, schema, coordinator)."""
    zones = {
        zid: Zone(
            zone_id=zid,
            name=zid,
            switch_entity_ids=[f"switch.{zid}"],
            duration_eco_min=10,
            duration_normal_min=15,
            duration_extra_min=20,
        )
        for zid in ("z1", "z2")
    }
    coordinator = MagicMock()
    coordinator.installation = Installation(
        installation_id="i1", name="Garden", zones=zones, schedule_slots=list(slots)
    )
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


def _durations(zone: Zone) -> tuple[int, int, int]:
    return zone.duration_eco_min, zone.duration_normal_min, zone.duration_extra_min


# --- a zone's runtime for a mode ---------------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("mode", "expected"),
    [("eco", (7, 15, 20)), ("normal", (10, 7, 20)), ("extra", (10, 15, 7))],
)
async def test_sets_the_runtime_of_the_mode_it_was_given(
    mode: str, expected: tuple[int, int, int]
) -> None:
    handler, schema, coordinator = await _service()

    await handler(SimpleNamespace(data=schema({"zone_id": "z1", "duration_min": 7, "mode": mode})))

    assert _durations(coordinator.installation.zones["z1"]) == expected
    coordinator.async_update_installation.assert_awaited_once()


@pytest.mark.asyncio
async def test_the_same_value_again_is_not_saved() -> None:
    """An hourly automation mostly sends what is already there."""
    handler, schema, coordinator = await _service()

    await handler(SimpleNamespace(data=schema({"zone_id": "z1", "duration_min": 15, "mode": "normal"})))

    coordinator.async_update_installation.assert_not_awaited()


@pytest.mark.asyncio
async def test_unknown_zone_is_rejected_without_saving() -> None:
    handler, schema, coordinator = await _service()

    with pytest.raises(HomeAssistantError):
        await handler(SimpleNamespace(data=schema({"zone_id": "nope", "duration_min": 5, "mode": "eco"})))
    coordinator.async_update_installation.assert_not_awaited()


@pytest.mark.asyncio
async def test_a_mode_needs_minutes() -> None:
    handler, schema, _coordinator = await _service()

    with pytest.raises(HomeAssistantError):
        await handler(SimpleNamespace(data=schema({"zone_id": "z1", "mode": "eco"})))


@pytest.mark.asyncio
@pytest.mark.parametrize("bad", [-3, 241, 1440])
async def test_minutes_stay_within_what_the_panel_accepts(bad: int) -> None:
    """A value the panel would refuse must not get in through the service."""
    _handler, schema, _coordinator = await _service()

    with pytest.raises(vol.Invalid):
        schema({"zone_id": "z1", "duration_min": bad, "mode": "normal"})


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "data",
    [
        {"zone_id": "z1", "duration_min": 5},
        {"zone_id": "z1", "duration_min": 5, "mode": "turbo"},
        {"zone_id": "z1", "duration_min": 5, "mode": "eco", "slot_id": "s1"},
    ],
)
async def test_the_call_names_exactly_one_place_to_write_to(data: dict) -> None:
    _handler, schema, _coordinator = await _service()

    with pytest.raises(vol.Invalid):
        schema(data)


# --- fixed minutes in one schedule --------------------------------------------


@pytest.mark.asyncio
async def test_fixes_the_minutes_of_a_zone_in_one_schedule() -> None:
    morning, evening = _slot("am", ["z1", "z2"]), _slot("pm", ["z1"])
    handler, schema, coordinator = await _service(morning, evening)

    await handler(SimpleNamespace(data=schema({"zone_id": "z1", "duration_min": 4, "slot_id": "pm"})))

    assert evening.zone_minutes == {"z1": 4}
    assert morning.zone_minutes == {}
    assert _durations(coordinator.installation.zones["z1"]) == (10, 15, 20)
    coordinator.async_update_installation.assert_awaited_once()


@pytest.mark.asyncio
async def test_one_member_stands_for_the_whole_cycle() -> None:
    odd = _slot("odd", ["z1"], cycle_id="c1")
    even = _slot("even", ["z1"], cycle_id="c1")
    other = _slot("other", ["z1"])
    handler, schema, _coordinator = await _service(odd, even, other)

    await handler(SimpleNamespace(data=schema({"zone_id": "z1", "duration_min": 9, "slot_id": "even"})))

    assert (odd.zone_minutes, even.zone_minutes, other.zone_minutes) == ({"z1": 9}, {"z1": 9}, {})


@pytest.mark.asyncio
async def test_without_minutes_the_zone_follows_the_mode_again() -> None:
    slot = _slot("am", ["z1"], zone_minutes={"z1": 4})
    handler, schema, coordinator = await _service(slot)

    await handler(SimpleNamespace(data=schema({"zone_id": "z1", "slot_id": "am"})))

    assert slot.zone_minutes == {}
    coordinator.async_update_installation.assert_awaited_once()


@pytest.mark.asyncio
async def test_zero_minutes_is_a_value_of_its_own() -> None:
    """0 leaves the zone out of this schedule; it is not "no fixed minutes"."""
    slot = _slot("am", ["z1"])
    handler, schema, _coordinator = await _service(slot)

    await handler(SimpleNamespace(data=schema({"zone_id": "z1", "duration_min": 0, "slot_id": "am"})))

    assert slot.zone_minutes == {"z1": 0}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "data",
    [
        {"zone_id": "z1", "duration_min": 5, "slot_id": "nope"},
        {"zone_id": "z2", "duration_min": 5, "slot_id": "am"},
    ],
)
async def test_an_unknown_slot_or_a_zone_it_does_not_water_is_rejected(data: dict) -> None:
    handler, schema, coordinator = await _service(_slot("am", ["z1"]))

    with pytest.raises(HomeAssistantError):
        await handler(SimpleNamespace(data=schema(data)))
    coordinator.async_update_installation.assert_not_awaited()
