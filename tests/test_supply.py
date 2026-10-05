"""Supply outputs: what must be open for a zone to get water.

A valve further up the line, a pump for some of the zones. It comes up before
its zones, stays up across phases that share it, and goes down once nobody
needs it -- after the zones, never before them.

The fake Home Assistant here keeps a state table, so the tests can ask what
was open at any moment instead of trusting a list of calls.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from custom_components.simple_irrigation.const import RUN_STATE_RUNNING
from custom_components.simple_irrigation.models import (
    Installation,
    RunState,
    ScheduleSlot,
    Zone,
    parse_supply_lead,
)
from custom_components.simple_irrigation.program import Soak
from custom_components.simple_irrigation.runtime import IrrigationRuntime
from custom_components.simple_irrigation.validation import validate_zone_payload

VALVE = "valve.drip_main"
PUMP = "switch.pump"


def _zone(zid: str, *supply: str, **kwargs) -> Zone:
    return Zone(
        zone_id=zid,
        name=zid,
        switch_entity_ids=[f"switch.{zid}"],
        duration_normal_min=1,
        supply_entity_ids=list(supply),
        **kwargs,
    )


class Garden:
    """A runtime over a fake Home Assistant that remembers what is open."""

    def __init__(self, *zones: Zone, **installation) -> None:
        self.on: set[str] = set()
        self.log: list[tuple[str, str]] = []
        self.sleeps: list[float] = []
        # Zones named here keep watering until the test lets them go.
        self.held: dict[str, asyncio.Event] = {}
        self.dry: list[str] = []
        self.inst = Installation(
            installation_id="i1",
            name="Garden",
            zones={z.zone_id: z for z in zones},
            max_parallel_zones=installation.pop("max_parallel_zones", 1),
            pre_start_delay_sec=installation.pop("pre_start_delay_sec", 0),
            **installation,
        )
        hass = MagicMock()
        hass.services.async_call = AsyncMock(side_effect=self._call)
        hass.async_create_task = lambda coro, name=None: asyncio.ensure_future(coro)
        hass.states.get = lambda _entity_id: None
        coordinator = MagicMock()
        coordinator.installation = self.inst
        coordinator.run_state = RunState()
        coordinator.async_update_run_state = AsyncMock()
        self.runtime = IrrigationRuntime(hass, coordinator)
        self.runtime._async_wait_zone_duration = self._wait
        self.runtime._async_sleep_interruptible = self._sleep

    async def _call(self, _domain, service, data=None, **_kwargs) -> None:
        entity_id = (data or {}).get("entity_id", "")
        opening = service in ("turn_on", "open_valve")
        # The log is what changed, not what was sent: a run closes everything
        # it touched once more at its end, whether it was still open or not.
        if opening != (entity_id in self.on):
            self.log.append(("on" if opening else "off", entity_id))
        if not opening:
            self.on.discard(entity_id)
            return
        self.on.add(entity_id)
        # The one thing that must never happen: a zone open without its supply.
        for zone in self.inst.zones.values():
            if entity_id in zone.switch_entity_ids:
                self.dry.extend(s for s in zone.supply_entity_ids if s not in self.on)

    async def _wait(self, _seconds: float, zone_id: str | None = None) -> None:
        if zone_id in self.held:
            stop = asyncio.ensure_future(self.runtime._stop_event.wait())
            hold = asyncio.ensure_future(self.held[zone_id].wait())
            await asyncio.wait({stop, hold}, return_when=asyncio.FIRST_COMPLETED)
            stop.cancel()
            hold.cancel()

    async def _sleep(self, seconds: float) -> None:
        if seconds > 0:
            self.sleeps.append(seconds)

    def hold(self, zone_id: str) -> asyncio.Event:
        self.held[zone_id] = asyncio.Event()
        return self.held[zone_id]

    async def run(self, *steps) -> None:
        await self.runtime.async_run_phases(list(steps), scheduled=True, slot_ids=[])
        await asyncio.wait_for(self.runtime._task, timeout=5)

    def switched(self, entity_id: str) -> list[str]:
        return [what for what, eid in self.log if eid == entity_id]

    def position(self, what: str, entity_id: str) -> int:
        return self.log.index((what, entity_id))


async def _until(predicate) -> None:
    for _ in range(500):
        if predicate():
            return
        await asyncio.sleep(0.01)
    raise AssertionError("condition not met in time")


# --- one zone ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_supply_opens_before_its_zone_and_closes_after_it() -> None:
    garden = Garden(_zone("a", VALVE))

    await garden.run(["a"])

    assert garden.log == [
        ("on", VALVE),
        ("on", "switch.a"),
        ("off", "switch.a"),
        ("off", VALVE),
    ]
    assert garden.on == set()


@pytest.mark.asyncio
async def test_a_zone_without_supply_runs_as_it_always_did() -> None:
    garden = Garden(_zone("a"))

    await garden.run(["a"])

    assert garden.log == [("on", "switch.a"), ("off", "switch.a")]
    assert garden.sleeps == []


@pytest.mark.asyncio
async def test_a_zone_with_no_minutes_does_not_bring_its_supply_up() -> None:
    zone = _zone("a", VALVE)
    zone.duration_normal_min = 0
    garden = Garden(zone)

    await garden.run(["a"])

    assert garden.log == []


# --- several zones ---------------------------------------------------------------


@pytest.mark.asyncio
async def test_phases_that_share_a_supply_switch_it_once() -> None:
    """Three drip lines behind one valve: it does not flutter between them."""
    garden = Garden(_zone("a", VALVE), _zone("b", VALVE), _zone("c", VALVE), _zone("d"))

    await garden.run(["a"], ["b"], ["c"], ["d"])

    assert garden.switched(VALVE) == ["on", "off"]
    assert garden.position("off", "switch.c") < garden.position("off", VALVE)
    # Closed again before the zone that does not need it begins.
    assert garden.position("off", VALVE) < garden.position("on", "switch.d")
    assert garden.dry == []


@pytest.mark.asyncio
async def test_zones_watering_together_share_one_supply() -> None:
    garden = Garden(_zone("a", VALVE), _zone("b", VALVE), max_parallel_zones=2)

    await garden.run(["a", "b"])

    assert garden.switched(VALVE) == ["on", "off"]
    assert garden.dry == []


@pytest.mark.asyncio
async def test_a_supply_closes_when_its_last_zone_does_while_others_water_on() -> None:
    """A pump must not run against closed valves for the rest of the phase."""
    garden = Garden(_zone("a", PUMP), _zone("b"), max_parallel_zones=2)
    release_b = garden.hold("b")

    task = asyncio.ensure_future(garden.run(["a", "b"]))
    await _until(lambda: ("off", PUMP) in garden.log)

    assert "switch.b" in garden.on
    release_b.set()
    await task


@pytest.mark.asyncio
async def test_each_zone_gets_its_own_supply() -> None:
    garden = Garden(_zone("a", VALVE), _zone("b", PUMP))

    await garden.run(["a"], ["b"])

    assert garden.position("off", VALVE) < garden.position("on", PUMP)
    assert garden.dry == []


@pytest.mark.asyncio
async def test_a_rest_closes_the_supply_and_the_next_pass_opens_it_again() -> None:
    garden = Garden(_zone("a", VALVE))

    await garden.run(["a"], Soak(1), ["a"])

    assert garden.switched(VALVE) == ["on", "off", "on", "off"]


# --- lead and trail --------------------------------------------------------------


@pytest.mark.asyncio
async def test_the_zone_waits_for_its_own_lead_time() -> None:
    garden = Garden(_zone("a", VALVE, supply_lead_sec=7), pre_start_delay_sec=30)

    await garden.run(["a"])

    assert garden.sleeps == [7]


@pytest.mark.asyncio
async def test_without_a_lead_of_its_own_the_installations_delay_applies() -> None:
    garden = Garden(_zone("a", VALVE), pre_start_delay_sec=30)

    await garden.run(["a"])

    assert garden.sleeps == [30]


@pytest.mark.asyncio
async def test_a_supply_that_is_open_already_is_not_waited_for_again() -> None:
    garden = Garden(_zone("a", VALVE, supply_lead_sec=7), _zone("b", VALVE, supply_lead_sec=7))

    await garden.run(["a"], ["b"])

    assert garden.sleeps == [7]


@pytest.mark.asyncio
async def test_the_supply_trails_its_zone() -> None:
    garden = Garden(_zone("a", VALVE, supply_lead_sec=0, supply_trail_sec=20))

    await garden.run(["a"])

    assert garden.sleeps == [20]
    assert garden.position("off", "switch.a") < garden.position("off", VALVE)


@pytest.mark.asyncio
async def test_nothing_trails_when_the_supply_is_handed_to_the_next_phase() -> None:
    garden = Garden(
        _zone("a", VALVE, supply_lead_sec=0, supply_trail_sec=20),
        _zone("b", VALVE, supply_lead_sec=0, supply_trail_sec=5),
    )

    await garden.run(["a"], ["b"])

    assert garden.sleeps == [5]


# --- stop, skip, restart -----------------------------------------------------------


@pytest.mark.asyncio
async def test_stop_closes_zone_supply_and_pre_start_in_that_order() -> None:
    garden = Garden(_zone("a", VALVE), pre_start_switches=[PUMP])
    garden.hold("a")

    task = asyncio.ensure_future(garden.run(["a"]))
    await _until(lambda: "switch.a" in garden.on)
    await garden.runtime.async_stop_all()
    await task

    assert garden.on == set()
    assert (
        garden.position("off", "switch.a")
        < garden.position("off", VALVE)
        < garden.position("off", PUMP)
    )


@pytest.mark.asyncio
async def test_skipping_while_the_supply_comes_up_opens_no_zone() -> None:
    garden = Garden(_zone("a", VALVE, supply_lead_sec=10), _zone("b"))

    async def _skip_during_lead(seconds: float) -> None:
        if seconds > 0:
            garden.runtime._skip_phase_event.set()

    garden.runtime._async_sleep_interruptible = _skip_during_lead

    await garden.run(["a"], ["b"])

    assert ("on", "switch.a") not in garden.log
    assert garden.switched(VALVE) == ["on", "off"]
    assert ("on", "switch.b") in garden.log


@pytest.mark.asyncio
async def test_a_restart_closes_the_supply_of_a_zone_that_was_cut_off() -> None:
    garden = Garden(_zone("a", VALVE), pre_start_switches=[PUMP])
    garden.on = {"switch.a", VALVE, PUMP}  # left open by the process that died
    garden.runtime.hass.is_running = True
    garden.runtime.coordinator.run_state = RunState(
        run_state=RUN_STATE_RUNNING, active_zone_ids=["a"]
    )

    await garden.runtime.async_setup()

    assert [eid for what, eid in garden.log if what == "off"] == ["switch.a", VALVE, PUMP]


# --- a configuration that does not add up -------------------------------------------


@pytest.mark.asyncio
async def test_a_supply_that_is_also_a_pre_start_output_stays_on_for_the_run() -> None:
    """The run keeps its pre-start outputs up; a zone must not take one down."""
    garden = Garden(_zone("a", PUMP), _zone("b"), pre_start_switches=[PUMP])

    await garden.run(["a"], ["b"])

    assert garden.switched(PUMP) == ["on", "off"]
    assert garden.position("on", "switch.b") < garden.position("off", PUMP)


@pytest.mark.asyncio
async def test_a_supply_that_is_another_zones_valve_is_left_to_that_zone() -> None:
    garden = Garden(_zone("a", "switch.b"), _zone("b"), max_parallel_zones=2)
    release_b = garden.hold("b")

    task = asyncio.ensure_future(garden.run(["a", "b"]))
    await _until(lambda: ("off", "switch.a") in garden.log)
    await asyncio.sleep(0.05)

    assert "switch.b" in garden.on
    release_b.set()
    await task


# --- the zone --------------------------------------------------------------------


def test_supply_settings_survive_the_store() -> None:
    zone = _zone("a", VALVE, PUMP, supply_lead_sec=4, supply_trail_sec=9)

    restored = Zone.from_dict(zone.to_dict())

    assert restored.supply_entity_ids == [VALVE, PUMP]
    assert (restored.supply_lead_sec, restored.supply_trail_sec) == (4, 9)


def test_a_zone_from_before_supply_existed_has_none() -> None:
    raw = _zone("a").to_dict()
    for key in ("supply_entity_ids", "supply_lead_sec", "supply_trail_sec"):
        raw.pop(key)

    restored = Zone.from_dict(raw)

    assert restored.supply_entity_ids == []
    assert (restored.supply_lead_sec, restored.supply_trail_sec) == (None, 0)


def test_an_empty_lead_means_the_installations_delay() -> None:
    assert parse_supply_lead(None) is None
    assert parse_supply_lead("") is None
    assert parse_supply_lead(0) == 0
    assert parse_supply_lead("12") == 12


def test_a_supply_output_must_be_an_output_like_any_other() -> None:
    payload = {
        "name": "Drip",
        "switch_entity_ids": ["switch.a"],
        "duration_eco_min": 5,
        "duration_normal_min": 10,
        "duration_extra_min": 15,
        "supply_entity_ids": ["sensor.not_a_valve"],
    }
    hass = MagicMock()

    with patch(
        "custom_components.simple_irrigation.validation.validate_output_entity_id",
        side_effect=lambda _hass, eid: None if eid.startswith("switch.") else "invalid_output",
    ):
        assert validate_zone_payload(hass, payload) == "invalid_output"
        assert validate_zone_payload(hass, {**payload, "supply_entity_ids": ["switch.pump"]}) is None
