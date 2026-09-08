"""Water use: a meter's word, or a flow rate's estimate -- never a guess.

The integration keeps no history of its own. It books litres per zone and
per run into the run state, and two ``total_increasing`` water sensors hand
them to Home Assistant's statistics. What is tested here is the booking:
which source wins, what an unreadable meter does, and that nothing is
reported for a zone that tracks no water.
"""

from __future__ import annotations

from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from homeassistant.util import dt as dt_util

from custom_components.simple_irrigation.card_api import _slot_water_l, _snapshot
from custom_components.simple_irrigation.models import (
    Installation,
    RunState,
    ScheduleSlot,
    Zone,
)
from custom_components.simple_irrigation.runtime import IrrigationRuntime
from custom_components.simple_irrigation.sensor import WaterSensor, ZoneWaterSensor
from custom_components.simple_irrigation.validation import (
    validate_flow_rate,
    validate_water_meter_entity,
    validate_zone_payload,
)
from custom_components.simple_irrigation.water import (
    SOURCE_ESTIMATED,
    SOURCE_MEASURED,
    estimated_litres,
    meter_delta,
    meter_litres,
    planned_litres,
)


def _state(value, unit):
    return SimpleNamespace(state=str(value), attributes={"unit_of_measurement": unit})


def _hass(states: dict | None = None) -> MagicMock:
    hass = MagicMock()
    store = dict(states or {})
    hass.states.get = lambda eid: store.get(eid)
    hass.states.set = lambda eid, value, unit="L": store.__setitem__(eid, _state(value, unit))
    hass.services.async_call = AsyncMock()
    return hass


def _zone(zone_id="z1", **kw) -> Zone:
    return Zone(zone_id=zone_id, name=zone_id, switch_entity_ids=[f"switch.{zone_id}"], **kw)


def _runtime(hass, inst: Installation) -> IrrigationRuntime:
    coordinator = MagicMock()
    coordinator.installation = inst
    coordinator.run_state = RunState()
    coordinator.async_update_run_state = AsyncMock()
    return IrrigationRuntime(hass, coordinator)


# ---------------------------------------------------------------------------
# model
# ---------------------------------------------------------------------------


def test_a_zone_tracks_no_water_by_default() -> None:
    zone = _zone()
    assert not zone.tracks_water
    assert Zone.from_dict(zone.to_dict()).flow_rate_lpm == 0.0


def test_water_settings_round_trip_and_junk_is_dropped() -> None:
    zone = _zone(water_meter_entity_id="sensor.z1_meter", flow_rate_lpm=12.5)
    loaded = Zone.from_dict(zone.to_dict())
    assert loaded.water_meter_entity_id == "sensor.z1_meter"
    assert loaded.flow_rate_lpm == 12.5
    assert loaded.tracks_water
    assert Zone.from_dict({**zone.to_dict(), "flow_rate_lpm": "lots"}).flow_rate_lpm == 0.0
    assert Zone.from_dict({**zone.to_dict(), "flow_rate_lpm": -3}).flow_rate_lpm == 0.0


def test_water_totals_survive_a_restart_but_the_run_in_flight_does_not() -> None:
    rs = RunState(
        water_total_l={"z1": 120.5},
        water_last_run_l={"z1": 30.0},
        water_source={"z1": SOURCE_ESTIMATED},
        run_water_l=12.0,
        run_water_source=SOURCE_ESTIMATED,
        last_run_water_l=30.0,
        last_run_water_source=SOURCE_MEASURED,
        water_total_installation_l=400.0,
    )
    loaded = RunState.from_dict(rs.to_dict())
    assert loaded.water_total_l == {"z1": 120.5}
    assert loaded.water_last_run_l == {"z1": 30.0}
    assert loaded.water_source == {"z1": SOURCE_ESTIMATED}
    assert loaded.last_run_water_l == 30.0
    assert loaded.last_run_water_source == SOURCE_MEASURED
    assert loaded.water_total_installation_l == 400.0
    assert loaded.run_water_l is None
    assert loaded.run_water_source == ""


# ---------------------------------------------------------------------------
# water.py
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("value", "unit", "litres"),
    [("42", "L", 42.0), ("1.5", "m³", 1500.0), ("2", "gal", 7.570823568), ("1", "ft³", 28.316846592)],
)
def test_meter_readings_are_converted_to_litres(value, unit, litres) -> None:
    hass = _hass({"sensor.meter": _state(value, unit)})
    assert meter_litres(hass, "sensor.meter") == pytest.approx(litres)


@pytest.mark.parametrize("bad", [_state("unavailable", "L"), _state("abc", "L"), _state("5", "kWh"), None])
def test_an_unreadable_meter_reads_as_none(bad) -> None:
    hass = _hass({"sensor.meter": bad} if bad is not None else {})
    assert meter_litres(hass, "sensor.meter") is None
    assert meter_litres(hass, "") is None


def test_a_meter_reset_between_readings_is_not_a_negative_run() -> None:
    assert meter_delta(100.0, 130.0) == 30.0
    assert meter_delta(100.0, 20.0) is None
    assert meter_delta(None, 20.0) is None
    assert meter_delta(100.0, None) is None


def test_estimates_follow_the_rate_and_the_actual_seconds() -> None:
    zone = _zone(flow_rate_lpm=10.0)
    assert estimated_litres(zone, 90) == 15.0
    assert estimated_litres(_zone(), 90) is None
    assert planned_litres(zone, 12) == 120.0
    assert planned_litres(zone, 0) is None
    assert planned_litres(_zone(water_meter_entity_id="sensor.m"), 12) is None


# ---------------------------------------------------------------------------
# validation
# ---------------------------------------------------------------------------


def test_flow_rate_bounds() -> None:
    assert validate_flow_rate(None) is None
    assert validate_flow_rate("") is None
    assert validate_flow_rate(12.5) is None
    assert validate_flow_rate(-1) == "invalid_flow_rate"
    assert validate_flow_rate(5000) == "invalid_flow_rate"
    assert validate_flow_rate("fast") == "invalid_flow_rate"


def test_a_water_meter_needs_a_volume_unit_but_may_be_offline() -> None:
    hass = _hass(
        {
            "sensor.good": _state("5", "m³"),
            "sensor.offline": _state("unavailable", "gal"),
            "sensor.energy": _state("5", "kWh"),
        }
    )
    assert validate_water_meter_entity(hass, "") is None
    assert validate_water_meter_entity(hass, "sensor.good") is None
    assert validate_water_meter_entity(hass, "sensor.offline") is None
    assert validate_water_meter_entity(hass, "sensor.energy") == "invalid_water_meter"
    assert validate_water_meter_entity(hass, "sensor.missing") == "unknown_entity"
    assert validate_water_meter_entity(hass, "nodot") == "invalid_water_meter"


def test_zone_payload_carries_the_water_checks() -> None:
    hass = _hass({"switch.z1": _state("off", None), "sensor.energy": _state("5", "kWh")})
    base = {
        "name": "Lawn",
        "switch_entity_ids": ["switch.z1"],
        "duration_eco_min": 1,
        "duration_normal_min": 1,
        "duration_extra_min": 1,
    }
    assert validate_zone_payload(hass, base) is None
    assert validate_zone_payload(hass, {**base, "flow_rate_lpm": -2}) == "invalid_flow_rate"
    assert (
        validate_zone_payload(hass, {**base, "water_meter_entity_id": "sensor.energy"})
        == "invalid_water_meter"
    )


# ---------------------------------------------------------------------------
# runtime booking
# ---------------------------------------------------------------------------


def test_a_rate_books_an_estimate_from_the_wall_clock() -> None:
    zone = _zone(flow_rate_lpm=10.0)
    runtime = _runtime(_hass(), Installation(installation_id="i", name="g", zones={"z1": zone}))
    runtime._book_zone_water(zone, dt_util.utcnow() - timedelta(seconds=90), None)
    rs = runtime.coordinator.run_state
    assert rs.water_last_run_l["z1"] == pytest.approx(15.0, abs=0.05)
    assert rs.water_total_l["z1"] == pytest.approx(15.0, abs=0.05)
    assert rs.water_source["z1"] == SOURCE_ESTIMATED
    assert rs.run_water_l == pytest.approx(15.0, abs=0.05)
    assert rs.run_water_source == SOURCE_ESTIMATED


def test_a_zone_meter_wins_over_the_rate() -> None:
    zone = _zone(water_meter_entity_id="sensor.z1_meter", flow_rate_lpm=10.0)
    hass = _hass({"sensor.z1_meter": _state("0.230", "m³")})
    runtime = _runtime(hass, Installation(installation_id="i", name="g", zones={"z1": zone}))
    runtime._book_zone_water(zone, dt_util.utcnow() - timedelta(seconds=90), 200.0)
    rs = runtime.coordinator.run_state
    assert rs.water_last_run_l["z1"] == pytest.approx(30.0)
    assert rs.water_source["z1"] == SOURCE_MEASURED
    assert rs.run_water_source == SOURCE_MEASURED


def test_an_unreadable_zone_meter_falls_back_to_the_rate() -> None:
    zone = _zone(water_meter_entity_id="sensor.z1_meter", flow_rate_lpm=10.0)
    hass = _hass({"sensor.z1_meter": _state("unavailable", "L")})
    runtime = _runtime(hass, Installation(installation_id="i", name="g", zones={"z1": zone}))
    runtime._book_zone_water(zone, dt_util.utcnow() - timedelta(seconds=60), 200.0)
    rs = runtime.coordinator.run_state
    assert rs.water_last_run_l["z1"] == pytest.approx(10.0, abs=0.05)
    assert rs.water_source["z1"] == SOURCE_ESTIMATED


def test_a_zone_without_water_settings_books_nothing() -> None:
    zone = _zone()
    runtime = _runtime(_hass(), Installation(installation_id="i", name="g", zones={"z1": zone}))
    runtime._book_zone_water(zone, dt_util.utcnow() - timedelta(seconds=600), None)
    rs = runtime.coordinator.run_state
    assert rs.water_total_l == {}
    assert rs.run_water_l is None


def test_one_estimated_zone_makes_the_run_an_estimate() -> None:
    metered = _zone("z1", water_meter_entity_id="sensor.z1_meter")
    rated = _zone("z2", flow_rate_lpm=5.0)
    hass = _hass({"sensor.z1_meter": _state("130", "L")})
    inst = Installation(installation_id="i", name="g", zones={"z1": metered, "z2": rated})
    runtime = _runtime(hass, inst)
    runtime._book_zone_water(metered, dt_util.utcnow(), 100.0)
    assert runtime.coordinator.run_state.run_water_source == SOURCE_MEASURED
    runtime._book_zone_water(rated, dt_util.utcnow() - timedelta(seconds=60), None)
    rs = runtime.coordinator.run_state
    assert rs.run_water_source == SOURCE_ESTIMATED
    assert rs.run_water_l == pytest.approx(35.0, abs=0.05)


def test_the_supply_meter_replaces_the_zone_sum_for_the_run() -> None:
    zone = _zone(flow_rate_lpm=10.0)
    hass = _hass({"sensor.main": _state("1250", "L")})
    inst = Installation(
        installation_id="i", name="g", zones={"z1": zone}, water_meter_entity_id="sensor.main"
    )
    runtime = _runtime(hass, inst)
    runtime._run_meter_start = 1000.0
    runtime._book_zone_water(zone, dt_util.utcnow() - timedelta(seconds=60), None)
    runtime._book_run_water()
    rs = runtime.coordinator.run_state
    assert rs.last_run_water_l == 250.0
    assert rs.last_run_water_source == SOURCE_MEASURED
    assert rs.water_total_installation_l == 250.0
    assert rs.run_water_l is None
    assert runtime._run_meter_start is None


def test_a_run_without_water_leaves_the_last_run_untouched() -> None:
    runtime = _runtime(_hass(), Installation(installation_id="i", name="g", zones={}))
    rs = runtime.coordinator.run_state
    rs.last_run_water_l = 99.0
    runtime._book_run_water()
    assert rs.last_run_water_l == 99.0
    assert rs.water_total_installation_l == 0.0


@pytest.mark.asyncio
async def test_a_full_run_books_the_zone_and_the_run() -> None:
    """End to end through the pipeline: meter read on open, again on close."""
    zone = _zone(water_meter_entity_id="sensor.z1_meter", duration_normal_min=0)
    hass = _hass({"sensor.z1_meter": _state("100", "L")})
    inst = Installation(installation_id="i", name="g", zones={"z1": zone})
    runtime = _runtime(hass, inst)

    async def _call(domain, service, data=None, **kw):
        # Water flows while the zone is open: bump the meter on turn_on.
        if service == "turn_on":
            hass.states.set("sensor.z1_meter", "118")

    hass.services.async_call = AsyncMock(side_effect=_call)
    hass.async_create_task = lambda coro, name=None: __import__("asyncio").ensure_future(coro)
    await runtime.async_run_phases([["z1"]], scheduled=True, slot_ids=[])
    for _ in range(300):
        if runtime._task is not None and runtime._task.done():
            break
        await __import__("asyncio").sleep(0.01)
    rs = runtime.coordinator.run_state
    assert rs.water_last_run_l["z1"] == 18.0
    assert rs.last_run_water_l == 18.0
    assert rs.last_run_water_source == SOURCE_MEASURED


# ---------------------------------------------------------------------------
# sensors and card
# ---------------------------------------------------------------------------


def _sensor(cls, rs: RunState, zone_id: str | None = None):
    sensor = object.__new__(cls)
    sensor.coordinator = SimpleNamespace(run_state=rs)
    if zone_id:
        sensor._zone_id = zone_id
    return sensor


def test_water_sensors_stay_unknown_until_something_flowed() -> None:
    rs = RunState()
    assert _sensor(WaterSensor, rs).native_value is None
    assert _sensor(ZoneWaterSensor, rs, "z1").native_value is None


def test_water_sensors_report_totals_and_the_last_run() -> None:
    rs = RunState(
        water_total_l={"z1": 120.55},
        water_last_run_l={"z1": 30.04},
        water_source={"z1": SOURCE_MEASURED},
        last_run_water_l=45.0,
        last_run_water_source=SOURCE_ESTIMATED,
        water_total_installation_l=800.0,
    )
    total = _sensor(WaterSensor, rs)
    assert total.native_value == 800.0
    assert total.extra_state_attributes == {"source": SOURCE_ESTIMATED, "last_run_l": 45.0}
    zone = _sensor(ZoneWaterSensor, rs, "z1")
    assert zone.native_value == 120.55
    assert zone.extra_state_attributes == {"source": SOURCE_MEASURED, "last_run_l": 30.0}


def test_a_slot_forecast_uses_rates_and_repetitions_only() -> None:
    zones = {
        "z1": _zone("z1", flow_rate_lpm=10.0, duration_normal_min=10),
        "z2": _zone("z2", water_meter_entity_id="sensor.m", duration_normal_min=10),
        "z3": _zone("z3", duration_normal_min=10),
    }
    inst = Installation(installation_id="i", name="g", zones=zones, max_parallel_zones=1)
    slot = ScheduleSlot(slot_id="s", weekdays=[0], time_local="06:00", zone_ids_ordered=["z1", "z2", "z3"], repetitions=3)
    assert _slot_water_l(inst, slot) == 300.0
    unknown = ScheduleSlot(slot_id="s", weekdays=[0], time_local="06:00", zone_ids_ordered=["z2", "z3"])
    assert _slot_water_l(inst, unknown) is None


def test_the_card_snapshot_says_whether_water_is_tracked() -> None:
    hass = _hass()
    hass.config.time_zone = "Europe/Berlin"
    zones = {"z1": _zone("z1", flow_rate_lpm=4.0, duration_normal_min=5)}
    inst = Installation(installation_id="i", name="g", zones=zones)
    rs = RunState(last_run_water_l=20.0, last_run_water_source=SOURCE_ESTIMATED)
    snap = _snapshot(hass, "entry", {"coordinator": SimpleNamespace(installation=inst, run_state=rs)})
    assert snap["tracks_water"] is True
    assert snap["last_run_water_l"] == 20.0
    assert snap["last_run_water_source"] == SOURCE_ESTIMATED
    assert snap["zones"][0]["flow_lpm"] == 4.0
    bare = _snapshot(
        hass,
        "entry",
        {
            "coordinator": SimpleNamespace(
                installation=Installation(installation_id="i", name="g", zones={"z1": _zone()}),
                run_state=RunState(),
            )
        },
    )
    assert bare["tracks_water"] is False
