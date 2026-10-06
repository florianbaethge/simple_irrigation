"""The edges other parts of Home Assistant touch: services, entities, diagnostics.

Small things each, and each one was wrong or untested before the 1.13 audit.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from zoneinfo import ZoneInfo

import pytest
import voluptuous as vol
import yaml
from homeassistant.exceptions import ServiceValidationError

from custom_components.simple_irrigation import switch as switch_platform
from custom_components.simple_irrigation.binary_sensor import RunningBinarySensor
from custom_components.simple_irrigation.card_api import _slot_payload
from custom_components.simple_irrigation.const import (
    DOMAIN,
    SERVICE_SET_ZONE_DURATION,
    SERVICE_SET_ZONE_ENABLED,
)
from custom_components.simple_irrigation.diagnostics import async_get_config_entry_diagnostics
from custom_components.simple_irrigation.models import (
    Installation,
    Period,
    RunState,
    ScheduleSlot,
    WaitingRun,
    Zone,
)
from custom_components.simple_irrigation.scheduler import compute_next_runs
from custom_components.simple_irrigation.services import async_setup_services

TZ = ZoneInfo("Europe/Berlin")
COMPONENT = Path(__file__).parent.parent / "custom_components" / "simple_irrigation"


def _installation(name: str = "Garden", **kwargs) -> Installation:
    zones = {
        zid: Zone(zone_id=zid, name=zid, switch_entity_ids=[f"switch.{zid}"]) for zid in ("a", "b")
    }
    return Installation(installation_id=name, name=name, zones=zones, **kwargs)


def _coordinator(inst: Installation) -> MagicMock:
    coordinator = MagicMock()
    coordinator.installation = inst
    coordinator.run_state = RunState()
    coordinator.async_update_installation = AsyncMock()
    return coordinator


async def _services(entries: dict[str, MagicMock], loaded: set[str] | None = None) -> dict:
    """Register the services over these installations; returns handlers by name."""
    hass = MagicMock()
    hass.services.has_service.return_value = False
    hass.config_entries.async_entries.return_value = [
        SimpleNamespace(entry_id=entry_id) for entry_id in entries
    ]
    hass.data = {
        DOMAIN: {
            entry_id: {"coordinator": coordinator, "runtime": MagicMock()}
            for entry_id, coordinator in entries.items()
            if loaded is None or entry_id in loaded
        }
    }
    # hass.data[DOMAIN] also carries flags that are no installation.
    hass.data[DOMAIN]["panel_registered"] = True
    await async_setup_services(hass)
    return {
        call.args[1]: (call.args[2], call.kwargs.get("schema"))
        for call in hass.services.async_register.call_args_list
    }


def _call(schema, **data) -> SimpleNamespace:
    return SimpleNamespace(data=schema(data))


# --- services: which installation -------------------------------------------------


@pytest.mark.asyncio
async def test_a_service_without_an_entry_goes_to_the_default_installation() -> None:
    """The card picks that way; a service going to the first one instead disagreed with it."""
    first = _coordinator(_installation("First"))
    default = _coordinator(_installation("Second", is_default=True))
    handler, schema = (await _services({"e1": first, "e2": default}))[SERVICE_SET_ZONE_ENABLED]

    await handler(_call(schema, zone_id="a", enabled=False))

    assert default.installation.zones["a"].enabled is False
    assert first.installation.zones["a"].enabled is True


@pytest.mark.asyncio
async def test_a_service_skips_an_installation_that_is_not_loaded() -> None:
    first = _coordinator(_installation("First"))
    second = _coordinator(_installation("Second"))
    handlers = await _services({"e1": first, "e2": second}, loaded={"e2"})
    handler, schema = handlers[SERVICE_SET_ZONE_ENABLED]

    await handler(_call(schema, zone_id="a", enabled=False))

    assert second.installation.zones["a"].enabled is False


@pytest.mark.asyncio
async def test_a_service_says_so_when_no_installation_is_loaded() -> None:
    handlers = await _services({"e1": _coordinator(_installation())}, loaded=set())
    handler, schema = handlers[SERVICE_SET_ZONE_ENABLED]

    with pytest.raises(ServiceValidationError):
        await handler(_call(schema, zone_id="a", enabled=False))


@pytest.mark.asyncio
async def test_what_the_caller_got_wrong_is_a_validation_error() -> None:
    handlers = await _services({"e1": _coordinator(_installation())})
    handler, schema = handlers[SERVICE_SET_ZONE_DURATION]

    with pytest.raises(ServiceValidationError):
        await handler(_call(schema, zone_id="nope", duration_min=5, mode="normal"))
    with pytest.raises(ServiceValidationError):
        await handler(_call(schema, zone_id="a", duration_min=5, config_entry_id="nope", mode="eco"))


@pytest.mark.asyncio
async def test_true_is_no_number_of_minutes() -> None:
    handlers = await _services({"e1": _coordinator(_installation())})
    _handler, schema = handlers[SERVICE_SET_ZONE_DURATION]

    with pytest.raises(vol.Invalid):
        schema({"zone_id": "a", "duration_min": True, "mode": "normal"})
    assert schema({"zone_id": "a", "duration_min": "20", "mode": "normal"})["duration_min"] == 20


@pytest.mark.asyncio
async def test_every_registered_service_is_described() -> None:
    handlers = await _services({"e1": _coordinator(_installation())})
    described = yaml.safe_load((COMPONENT / "services.yaml").read_text(encoding="utf-8"))

    assert set(handlers) == set(described)


# --- a zone at 0 minutes is not "next" ----------------------------------------------


def _slot(**kwargs) -> ScheduleSlot:
    return ScheduleSlot(
        slot_id="s1",
        weekdays=[0, 1, 2, 3, 4, 5, 6],
        time_local="06:00",
        zone_ids_ordered=["a", "b"],
        **kwargs,
    )


def test_a_zone_the_slot_leaves_out_has_no_next_run_in_it() -> None:
    inst = _installation(schedule_slots=[_slot(zone_minutes={"b": 0})])

    _global_next, per_zone = compute_next_runs(inst, datetime(2026, 7, 1, 12, tzinfo=TZ), TZ)

    assert per_zone["a"] is not None
    assert per_zone["b"] is None


def test_the_card_does_not_list_a_zone_the_slot_leaves_out() -> None:
    inst = _installation(schedule_slots=[_slot(zone_minutes={"b": 0})])

    payload = _slot_payload(inst, inst.schedule_slots[0])

    assert payload["zone_ids"] == ["a"]


# --- entities -----------------------------------------------------------------------


def test_the_running_sensor_lists_the_schedules_that_wait() -> None:
    coordinator = _coordinator(_installation())
    coordinator.config_entry = SimpleNamespace(entry_id="e1")
    coordinator.run_state.waiting_runs = [
        WaitingRun(["s1", "s2"], datetime(2026, 7, 1, 6, tzinfo=TZ)),
        WaitingRun(["s3"], datetime(2026, 7, 1, 7, tzinfo=TZ)),
    ]

    attributes = RunningBinarySensor(coordinator).extra_state_attributes

    assert attributes["waiting_slot_ids"] == ["s1", "s2", "s3"]


@pytest.mark.asyncio
async def test_the_switch_of_a_deleted_slot_goes_with_it() -> None:
    """Not left behind as "unavailable" for good -- and what was left before is swept up."""
    inst = _installation(schedule_slots=[_slot()])
    coordinator = _coordinator(inst)
    coordinator.config_entry = SimpleNamespace(entry_id="e1")
    listeners: list = []
    coordinator.async_add_listener = lambda callback: listeners.append(callback) or (lambda: None)
    hass = MagicMock()
    hass.data = {DOMAIN: {"e1": {"coordinator": coordinator}}}
    entry = SimpleNamespace(entry_id="e1", async_on_unload=lambda _unsub: None)

    def _registered(unique_id: str, domain: str = "switch") -> SimpleNamespace:
        return SimpleNamespace(
            unique_id=unique_id, domain=domain, entity_id=f"{domain}.{unique_id}"
        )

    registered = [
        _registered("e1_slot_s1_enabled"),
        _registered("e1_slot_old_enabled"),  # left behind by an earlier version
        _registered("e1_schedule_enabled"),
        _registered("e1_slot_s1_enabled", domain="sensor"),
    ]
    registry = MagicMock()
    added: list = []
    with (
        patch.object(switch_platform.er, "async_get", return_value=registry),
        patch.object(
            switch_platform.er, "async_entries_for_config_entry", side_effect=lambda *_: registered
        ),
    ):
        await switch_platform.async_setup_entry(hass, entry, added.extend)
        assert [call.args[0] for call in registry.async_remove.call_args_list] == [
            "switch.e1_slot_old_enabled"
        ]

        registry.async_remove.reset_mock()
        inst.schedule_slots.clear()
        listeners[0]()

    assert [call.args[0] for call in registry.async_remove.call_args_list] == [
        "switch.e1_slot_s1_enabled",
        "switch.e1_slot_old_enabled",
    ]


# --- diagnostics ----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_diagnostics_show_what_decides_whether_a_schedule_runs() -> None:
    inst = _installation(
        schedule_slots=[
            _slot(zone_minutes={"b": 0}, override_season=True, season=[Period((6, 1), (8, 31))])
        ],
        season=[Period((4, 1), (10, 31))],
        wait_when_busy=True,
        wait_max_min=45,
    )
    hass = MagicMock()
    hass.data = {DOMAIN: {"e1": {"coordinator": _coordinator(inst)}}}

    diagnostics = await async_get_config_entry_diagnostics(hass, SimpleNamespace(entry_id="e1"))

    installation, (slot,) = diagnostics["installation"], diagnostics["schedule_slots"]
    assert installation["season"] == [{"from": "04-01", "to": "10-31"}]
    assert (installation["wait_when_busy"], installation["wait_max_min"]) == (True, 45)
    assert "zones" not in installation and set(diagnostics["zones"]) == {"a", "b"}
    assert slot["zone_minutes"] == {"b": 0}
    assert slot["season"] == [{"from": "06-01", "to": "08-31"}]
    assert slot["computed_phases"] == [["a"], ["b"]] or slot["computed_phases"] == [["a", "b"]]
