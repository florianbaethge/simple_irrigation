"""The panel's save endpoints, driven the way the browser drives them.

The helpers behind them are tested one by one elsewhere. What was missing is
the handlers themselves: that they call those helpers, carry every field from
one action to the next, refuse what must be refused -- and leave nothing
behind when they do.
"""

from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any
from unittest.mock import MagicMock

import pytest
from homeassistant.components.http import KEY_HASS
from homeassistant.components.http.const import KEY_HASS_USER
from homeassistant.exceptions import Unauthorized

from custom_components.simple_irrigation import panel_api
from custom_components.simple_irrigation.const import DOMAIN
from custom_components.simple_irrigation.models import (
    Installation,
    RunState,
    ScheduleSlot,
    Zone,
)

ENTRY = "entry1"
pytestmark = pytest.mark.asyncio


class Coordinator:
    """Holds the installation and keeps what the store would have written."""

    def __init__(self, inst: Installation) -> None:
        self.store = SimpleNamespace(installation=inst, run_state=RunState())
        self.saved: list[dict[str, Any]] = []

    @property
    def installation(self) -> Installation:
        return self.store.installation

    @property
    def run_state(self) -> RunState:
        return self.store.run_state

    async def async_update_installation(self, inst: Installation) -> None:
        self.store.installation = inst
        self.saved.append(json.loads(json.dumps(inst.to_dict())))


class Request(dict):
    def __init__(self, hass: Any, body: dict[str, Any], admin: bool) -> None:
        super().__init__()
        self.app = {KEY_HASS: hass}
        self[KEY_HASS_USER] = SimpleNamespace(is_admin=admin)
        self._body = body

    async def json(self) -> dict[str, Any]:
        return self._body


def _garden(*slots: ScheduleSlot, zones: tuple[str, ...] = ("a", "b", "c"), **installation):
    inst = Installation(
        installation_id="i1",
        name="Garden",
        zones={
            z: Zone(zone_id=z, name=z, switch_entity_ids=[f"switch.{z}"]) for z in zones
        },
        schedule_slots=list(slots),
        **installation,
    )
    coord = Coordinator(inst)
    hass = MagicMock()
    hass.data = {DOMAIN: {ENTRY: {"coordinator": coord, "runtime": MagicMock()}}}
    hass.config_entries.async_get_entry.return_value = SimpleNamespace(
        domain=DOMAIN, entry_id=ENTRY, data={}
    )
    hass.config_entries.async_entries.return_value = [SimpleNamespace(entry_id=ENTRY)]
    hass.config.time_zone = "Europe/Berlin"
    known = {f"switch.{z}" for z in zones} | {"switch.pump", "script.mower", "sensor.rain"}
    hass.states.get.side_effect = (
        lambda eid: SimpleNamespace(state="off", attributes={}) if eid in known else None
    )
    return hass, coord


async def _post(view: type, hass: Any, body: dict[str, Any], admin: bool = True):
    response = await view().post(Request(hass, {"entry_id": ENTRY, **body}, admin))
    return response.status, json.loads(response.body)


async def _slot(hass: Any, body: dict[str, Any], admin: bool = True):
    return await _post(panel_api.SimpleIrrigationPanelSlotView, hass, body, admin)


async def _zone(hass: Any, body: dict[str, Any], admin: bool = True):
    return await _post(panel_api.SimpleIrrigationPanelZoneView, hass, body, admin)


async def _global(hass: Any, body: dict[str, Any], admin: bool = True):
    return await _post(panel_api.SimpleIrrigationPanelGlobalView, hass, body, admin)


# Everything a schedule can be set to besides its days, time and zones.
EXTRAS = {
    "guards": [{"entity_id": "sensor.rain", "operator": "below", "value": 1}],
    "ignore_global_guards": True,
    "override_pre_start_script": True,
    "pre_start_script": "script.mower",
    "pre_start_script_timeout_sec": 60,
    "repetitions": 2,
    "soak_between_phases_min": 3,
    "soak_between_repetitions_min": 4,
    "zone_minutes": {"a": 0, "b": 9},
    "override_season": True,
    "season": [{"from": "04-01", "to": "10-31"}],
}


def _extras_of(slot: ScheduleSlot) -> tuple:
    return (
        len(slot.guards),
        slot.ignore_global_guards,
        slot.override_pre_start_script,
        slot.pre_start_script,
        slot.pre_start_script_timeout_sec,
        slot.repetitions,
        slot.soak_between_phases_min,
        slot.soak_between_repetitions_min,
        dict(slot.zone_minutes),
        slot.override_season,
        [p.to_dict() for p in slot.season],
    )


def _every_2_days(**extra) -> dict[str, Any]:
    return {
        "action": "cycle_upsert",
        "cycle_kind": "every_n_days",
        "cycle_meta": {"n": 2, "anchor_weekday": 0, "times": ["06:00"], "label": "Lawn"},
        "zone_ids_ordered": ["a", "b"],
        **extra,
    }


# --- a cycle carries everything through its life -----------------------------------


async def test_a_new_cycle_gives_every_member_everything() -> None:
    hass, coord = _garden()
    body = _every_2_days(**EXTRAS)
    body["cycle_meta"]["times"] = ["18:00", "06:00"]

    status, result = await _slot(hass, body)

    slots = coord.installation.schedule_slots
    assert status == 200 and len(slots) == 4 and len(result["slots"]) == 4
    assert sorted(s.time_local for s in slots) == ["06:00", "06:00", "18:00", "18:00"]
    assert len({repr(_extras_of(s)) for s in slots}) == 1
    assert _extras_of(slots[0])[8:] == ({"a": 0, "b": 9}, True, [{"from": "04-01", "to": "10-31"}])
    # ...and it is what the store writes and reads back.
    again = Installation.from_dict(coord.saved[-1])
    assert [_extras_of(s) for s in again.schedule_slots] == [_extras_of(s) for s in slots]


async def test_an_edit_that_says_nothing_about_a_field_keeps_it() -> None:
    hass, coord = _garden()
    _status, created = await _slot(hass, _every_2_days(**EXTRAS))
    before = _extras_of(coord.installation.schedule_slots[0])

    status, _result = await _slot(hass, _every_2_days(cycle_id=created["cycle_id"]))

    assert status == 200
    assert all(_extras_of(s) == before for s in coord.installation.schedule_slots)


async def test_a_zone_taken_out_of_a_cycle_takes_its_fixed_minutes_along() -> None:
    hass, coord = _garden()
    _status, created = await _slot(hass, _every_2_days(**EXTRAS))

    await _slot(hass, {**_every_2_days(cycle_id=created["cycle_id"]), "zone_ids_ordered": ["b"]})

    assert all(s.zone_minutes == {"b": 9} for s in coord.installation.schedule_slots)


async def test_a_cycle_that_shrinks_to_one_slot_is_no_cycle_but_keeps_its_settings() -> None:
    hass, coord = _garden()
    _status, created = await _slot(hass, _every_2_days(**EXTRAS))

    await _slot(
        hass,
        {
            "action": "cycle_upsert",
            "cycle_id": created["cycle_id"],
            "cycle_kind": "weekly",
            "cycle_meta": {"anchor_weekday": 2, "times": ["06:00"], "label": "Lawn"},
            "zone_ids_ordered": ["a", "b"],
        },
    )

    (slot,) = coord.installation.schedule_slots
    assert slot.cycle_id is None and slot.weekdays == [2]
    assert _extras_of(slot)[5:] == (2, 3, 4, {"a": 0, "b": 9}, True, [{"from": "04-01", "to": "10-31"}])


async def test_a_member_switched_off_on_its_own_stays_off_through_an_edit() -> None:
    hass, coord = _garden()
    _status, created = await _slot(hass, _every_2_days())
    off = coord.installation.schedule_slots[1].slot_id
    await _slot(hass, {"action": "update", "slot_id": off, "enabled": False})

    await _slot(hass, _every_2_days(cycle_id=created["cycle_id"], name="renamed"))

    assert {s.slot_id: s.enabled for s in coord.installation.schedule_slots}[off] is False
    assert sum(s.enabled for s in coord.installation.schedule_slots) == 1


async def test_a_cycle_saved_with_a_word_on_it_switches_all_members() -> None:
    hass, coord = _garden()
    _status, created = await _slot(hass, _every_2_days())

    await _slot(hass, _every_2_days(cycle_id=created["cycle_id"], enabled=False))

    assert not any(s.enabled for s in coord.installation.schedule_slots)


async def test_moving_a_cycle_s_time_keeps_each_member_s_id() -> None:
    """The switch of the Tuesday run goes on switching the Tuesday run."""
    hass, coord = _garden()
    _status, created = await _slot(hass, _every_2_days())
    before = {tuple(s.weekdays): s.slot_id for s in coord.installation.schedule_slots}

    body = _every_2_days(cycle_id=created["cycle_id"])
    body["cycle_meta"]["times"] = ["07:00"]
    await _slot(hass, body)

    after = {tuple(s.weekdays): s.slot_id for s in coord.installation.schedule_slots}
    assert after == before
    assert {s.time_local for s in coord.installation.schedule_slots} == {"07:00"}


async def test_a_second_start_time_gets_ids_of_its_own() -> None:
    hass, coord = _garden()
    _status, created = await _slot(hass, _every_2_days())
    before = {s.slot_id for s in coord.installation.schedule_slots}

    body = _every_2_days(cycle_id=created["cycle_id"])
    body["cycle_meta"]["times"] = ["06:00", "18:00"]
    await _slot(hass, body)

    slots = coord.installation.schedule_slots
    assert {s.slot_id for s in slots if s.time_local == "06:00"} == before
    assert len({s.slot_id for s in slots}) == 4


async def test_cycle_start_times_are_stored_in_the_order_of_the_clock_each_once() -> None:
    hass, coord = _garden()
    body = _every_2_days()
    body["cycle_meta"]["times"] = ["18:00", "06:00", "18:00"]

    await _slot(hass, body)

    assert coord.installation.schedule_slots[0].cycle_meta["times"] == ["06:00", "18:00"]


# --- a single slot ------------------------------------------------------------------


def _single(**kwargs) -> ScheduleSlot:
    return ScheduleSlot(
        slot_id="s1", weekdays=[0, 2, 4], time_local="06:00", zone_ids_ordered=["a", "b"], **kwargs
    )


async def test_a_slot_update_stores_fixed_minutes_and_season() -> None:
    hass, coord = _garden(_single())

    status, _result = await _slot(
        hass,
        {
            "action": "update",
            "slot_id": "s1",
            "zone_minutes": {"a": 4, "c": 9},
            "override_season": True,
            "season": [{"from": "06-01", "to": "08-31"}],
        },
    )

    (slot,) = coord.installation.schedule_slots
    assert status == 200
    # Minutes for a zone the slot does not water are not kept.
    assert slot.zone_minutes == {"a": 4}
    assert slot.override_season and [p.to_dict() for p in slot.season] == [
        {"from": "06-01", "to": "08-31"}
    ]


async def test_splitting_a_slot_carries_everything_to_each_day() -> None:
    hass, coord = _garden(_single())
    await _slot(hass, {"action": "update", "slot_id": "s1", **EXTRAS})
    before = _extras_of(coord.installation.schedule_slots[0])

    status, _result = await _slot(hass, {"action": "split", "slot_id": "s1"})

    slots = coord.installation.schedule_slots
    assert status == 200 and [s.weekdays for s in slots] == [[0], [2], [4]]
    assert all(_extras_of(s) == before for s in slots)


async def test_a_refused_slot_update_leaves_nothing_behind() -> None:
    """Half of it used to stay in memory -- and be written by the next save."""
    hass, coord = _garden(_single(name="Lawn"))

    status, result = await _slot(
        hass,
        {
            "action": "update",
            "slot_id": "s1",
            "weekdays": [1],
            "time_local": "21:30",
            "enabled": False,
            "zone_ids_ordered": ["c"],
            "name": "Changed",
            "season": [{"from": "02-30", "to": "03-01"}],
        },
    )

    assert (status, result["error"]) == (400, "invalid_season")
    (slot,) = coord.installation.schedule_slots
    assert (slot.weekdays, slot.time_local, slot.enabled, slot.zone_ids_ordered, slot.name) == (
        [0, 2, 4],
        "06:00",
        True,
        ["a", "b"],
        "Lawn",
    )
    assert coord.saved == []
    # An unrelated save afterwards writes the slot as it was.
    await _zone(hass, {"action": "reorder", "zone_order": ["c", "b", "a"]})
    assert coord.saved[-1]["schedule_slots"][0]["time_local"] == "06:00"


async def test_a_slot_with_an_unknown_condition_entity_is_refused_whole() -> None:
    hass, coord = _garden(_single())

    status, _result = await _slot(
        hass,
        {
            "action": "update",
            "slot_id": "s1",
            "time_local": "22:00",
            "guards": [{"entity_id": "sensor.gone", "operator": "below", "value": 1}],
        },
    )

    assert status == 400
    assert coord.installation.schedule_slots[0].time_local == "06:00"


# --- zones --------------------------------------------------------------------------


async def test_deleting_a_zone_takes_it_out_of_every_slot() -> None:
    hass, coord = _garden(_single(zone_minutes={"a": 3, "b": 9}))

    status, _result = await _zone(hass, {"action": "delete", "zone_id": "b"})

    (slot,) = coord.installation.schedule_slots
    assert status == 200
    assert (slot.zone_ids_ordered, slot.zone_minutes) == (["a"], {"a": 3})
    assert "b" not in coord.installation.zones


async def test_a_zone_keeps_its_supply_through_a_partial_update() -> None:
    hass, coord = _garden()
    _status, added = await _zone(
        hass,
        {
            "action": "add",
            "zone": {
                "name": "Drip",
                "switch_entity_ids": ["switch.pump"],
                "supply_entity_ids": ["script.mower"],
            },
        },
    )
    assert _status == 400  # a script is no output: refused before anything is added

    _status, added = await _zone(
        hass,
        {
            "action": "add",
            "zone": {
                "name": "Drip",
                "switch_entity_ids": ["switch.a"],
                "supply_entity_ids": ["switch.pump"],
                "supply_lead_sec": 0,
                "supply_trail_sec": 30,
            },
        },
    )
    zone_id = added["zone_id"]

    await _zone(hass, {"action": "update", "zone_id": zone_id, "zone": {"enabled": False}})

    zone = coord.installation.zones[zone_id]
    assert (zone.supply_entity_ids, zone.supply_lead_sec, zone.supply_trail_sec, zone.enabled) == (
        ["switch.pump"],
        0,
        30,
        False,
    )


async def test_an_output_cannot_be_a_valve_and_a_supply() -> None:
    hass, coord = _garden()

    own = await _zone(
        hass, {"action": "update", "zone_id": "a", "zone": {"supply_entity_ids": ["switch.a"]}}
    )
    other = await _zone(
        hass, {"action": "update", "zone_id": "a", "zone": {"supply_entity_ids": ["switch.b"]}}
    )
    await _zone(
        hass, {"action": "update", "zone_id": "a", "zone": {"supply_entity_ids": ["switch.pump"]}}
    )
    reverse = await _zone(
        hass, {"action": "update", "zone_id": "b", "zone": {"switch_entity_ids": ["switch.pump"]}}
    )

    for status, result in (own, other, reverse):
        assert (status, result["error"]) == (400, "supply_is_zone_output")
    assert coord.installation.zones["a"].supply_entity_ids == ["switch.pump"]
    assert coord.installation.zones["b"].switch_entity_ids == ["switch.b"]


async def test_a_zone_order_is_saved_as_given_and_refused_when_it_names_other_zones() -> None:
    hass, coord = _garden()

    status, _result = await _zone(hass, {"action": "reorder", "zone_order": ["c", "a", "b"]})
    refused, result = await _zone(hass, {"action": "reorder", "zone_order": ["a", "b"]})

    assert status == 200 and coord.saved[-1]["zone_order"] == ["c", "a", "b"]
    assert (refused, result["error"]) == (400, "invalid_zone_order")
    assert len(coord.saved) == 1


# --- the installation ---------------------------------------------------------------


async def test_the_installation_takes_season_and_waiting() -> None:
    hass, coord = _garden()

    status, _result = await _global(
        hass,
        {
            "season": [{"from": "04-01", "to": "10-31"}, {"from": "04-01", "to": "10-31"}],
            "wait_when_busy": True,
            "wait_max_min": 45,
        },
    )

    inst = coord.installation
    assert status == 200
    assert [p.to_dict() for p in inst.season] == [{"from": "04-01", "to": "10-31"}]
    assert (inst.wait_when_busy, inst.wait_max_min) == (True, 45)


async def test_a_refused_settings_save_leaves_nothing_behind() -> None:
    hass, coord = _garden()

    status, result = await _global(
        hass,
        {
            "name": "Changed",
            "enabled": False,
            "wait_when_busy": True,
            "season": [{"from": "04-01", "to": "10-31"}],
            "pause_until": "garbage",
        },
    )

    inst = coord.installation
    assert (status, result["error"]) == (400, "invalid_pause_until")
    assert (inst.name, inst.enabled, inst.wait_when_busy, inst.season) == ("Garden", True, False, [])
    assert coord.saved == []


@pytest.mark.parametrize(
    "body",
    [
        {"wait_max_min": 0},
        {"wait_max_min": 721},
        {"wait_max_min": True},
        {"season": [{"from": "01-01", "to": "01-02"}] * 7},
    ],
)
async def test_settings_out_of_range_are_refused(body) -> None:
    hass, coord = _garden()

    status, _result = await _global(hass, body)

    assert status == 400 and coord.saved == []


@pytest.mark.parametrize(
    "body",
    [
        {"zone_minutes": {"a": 241}},
        {"zone_minutes": {"a": -1}},
        {"zone_minutes": {"a": True}},
        {"repetitions": True},
    ],
)
async def test_slot_numbers_out_of_range_are_refused(body) -> None:
    hass, coord = _garden(_single())

    status, _result = await _slot(hass, {"action": "update", "slot_id": "s1", **body})

    assert status == 400 and coord.saved == []


@pytest.mark.parametrize("field", ["supply_lead_sec", "supply_trail_sec"])
@pytest.mark.parametrize("value", [-1, 3601, True])
async def test_supply_times_out_of_range_are_refused(field, value) -> None:
    hass, coord = _garden()

    status, _result = await _zone(
        hass, {"action": "update", "zone_id": "a", "zone": {field: value}}
    )

    assert status == 400 and coord.saved == []


# --- who may --------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("post", "body"),
    [
        (_slot, {"action": "delete", "slot_id": "s1"}),
        (_zone, {"action": "reorder", "zone_order": ["c", "b", "a"]}),
        (_global, {"enabled": False}),
    ],
)
async def test_only_an_admin_may_change_anything(post, body) -> None:
    hass, coord = _garden(_single())

    with pytest.raises(Unauthorized):
        await post(hass, body, admin=False)

    assert coord.saved == []
    assert len(coord.installation.schedule_slots) == 1
