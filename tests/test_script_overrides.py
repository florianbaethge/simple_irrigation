"""Per-slot script overrides and the post-run script.

The installation configures one pre-start and one post-run script; a schedule
slot may replace either. ``override_… = True`` with an empty entity_id is the
"no script for this slot" case — the drip line that should not send the mower
home. Everything stays fail-open: a broken script never costs a run.
"""

from __future__ import annotations

import asyncio
import logging
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.simple_irrigation.const import RUN_STATE_IDLE
from custom_components.simple_irrigation.panel_api import (
    _apply_slot_script_overrides,
    _copy_slot_script_overrides,
)
from custom_components.simple_irrigation.models import Installation, RunState, ScheduleSlot, Zone
from custom_components.simple_irrigation.runtime import IrrigationRuntime
from custom_components.simple_irrigation.scripts import (
    effective_post_run_script,
    effective_pre_start_script,
)


def _hass(calls: list[tuple[str, str, dict]]) -> MagicMock:
    """hass recording every service call, in order."""
    hass = MagicMock()

    async def _call(domain, service, data=None, **kwargs):
        calls.append((domain, service, dict(data or {})))

    hass.services.async_call = AsyncMock(side_effect=_call)
    hass.async_create_task = lambda coro, name=None: asyncio.ensure_future(coro)
    return hass


def _runtime(hass: MagicMock, inst: Installation) -> IrrigationRuntime:
    coordinator = MagicMock()
    coordinator.installation = inst
    coordinator.run_state = RunState()
    coordinator.async_update_run_state = AsyncMock()
    return IrrigationRuntime(hass, coordinator)


def _inst(**kwargs) -> Installation:
    base = {"installation_id": "i1", "name": "Garden"}
    base.update(kwargs)
    return Installation(**base)


def _slot(**kwargs) -> ScheduleSlot:
    base = {"slot_id": "s1", "weekdays": [0], "time_local": "06:00"}
    base.update(kwargs)
    return ScheduleSlot(**base)


# --- resolution ---------------------------------------------------------------


def test_no_slots_uses_the_installations_script() -> None:
    """Manual zone runs carry no slot at all."""
    inst = _inst(pre_start_script="script.mower_go_home", pre_start_script_timeout_sec=120)
    call = effective_pre_start_script(inst, [])
    assert call.entity_id == "script.mower_go_home"
    assert call.timeout_sec == 120


def test_slot_without_override_inherits() -> None:
    inst = _inst(post_run_script="script.mower_resume")
    call = effective_post_run_script(inst, [_slot(post_run_script="script.ignored")])
    assert call.entity_id == "script.mower_resume"


def test_override_replaces_the_global_script() -> None:
    inst = _inst(pre_start_script="script.mower_go_home", pre_start_script_timeout_sec=300)
    slot = _slot(override_pre_start_script=True, pre_start_script="script.close_window")
    call = effective_pre_start_script(inst, [slot])
    assert call.entity_id == "script.close_window"
    # No slot timeout configured: the installation's patience still applies.
    assert call.timeout_sec == 300


def test_override_may_carry_its_own_timeout() -> None:
    inst = _inst(pre_start_script="script.a", pre_start_script_timeout_sec=300)
    slot = _slot(
        override_pre_start_script=True,
        pre_start_script="script.b",
        pre_start_script_timeout_sec=600,
    )
    assert effective_pre_start_script(inst, [slot]).timeout_sec == 600


def test_empty_override_means_no_script_at_all() -> None:
    """The drip-irrigation case from issue #31: leave the mower mowing."""
    inst = _inst(pre_start_script="script.mower_go_home", post_run_script="script.mower_resume")
    slot = _slot(override_pre_start_script=True, override_post_run_script=True)
    assert effective_pre_start_script(inst, [slot]).entity_id == ""
    assert effective_post_run_script(inst, [slot]).entity_id == ""


def test_first_overriding_slot_wins_and_the_conflict_is_logged(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Slots firing in the same minute merge into one run — one script runs."""
    inst = _inst(pre_start_script="script.global")
    lawn = _slot(slot_id="lawn", override_pre_start_script=True, pre_start_script="script.lawn")
    drip = _slot(slot_id="drip", override_pre_start_script=True, pre_start_script="script.drip")
    with caplog.at_level(logging.WARNING):
        call = effective_pre_start_script(inst, [lawn, drip])
    assert call.entity_id == "script.lawn"
    assert "lawn, drip" in caplog.text


def test_slots_that_agree_are_not_logged(caplog: pytest.LogCaptureFixture) -> None:
    inst = _inst()
    slots = [
        _slot(slot_id="a", override_pre_start_script=True, pre_start_script="script.same"),
        _slot(slot_id="b", override_pre_start_script=True, pre_start_script="script.same"),
    ]
    with caplog.at_level(logging.WARNING):
        assert effective_pre_start_script(inst, slots).entity_id == "script.same"
    assert caplog.text == ""


# --- runtime ------------------------------------------------------------------


@pytest.mark.asyncio
async def test_post_run_script_runs_after_the_outputs_went_off() -> None:
    calls: list[tuple[str, str, dict]] = []
    inst = _inst(pre_start_switches=["switch.pump"], post_run_script="script.mower_resume")
    runtime = _runtime(_hass(calls), inst)

    await runtime._async_finish_run(RUN_STATE_IDLE, error=None)

    assert calls == [
        ("switch", "turn_off", {"entity_id": "switch.pump"}),
        ("script", "mower_resume", {}),
    ]


@pytest.mark.asyncio
async def test_post_run_script_runs_even_when_the_run_was_stopped() -> None:
    """Stop All must still release the mower — that is the point of undoing."""
    calls: list[tuple[str, str, dict]] = []
    runtime = _runtime(_hass(calls), _inst(post_run_script="script.mower_resume"))
    runtime._stop_event.set()

    await runtime._async_finish_run(RUN_STATE_IDLE, error=None)

    assert calls == [("script", "mower_resume", {})]


@pytest.mark.asyncio
async def test_failing_post_run_script_fails_open() -> None:
    calls: list[tuple[str, str, dict]] = []
    hass = _hass(calls)

    async def _call(domain, service, data=None, **kwargs):
        if service == "boom":
            raise RuntimeError("script blew up")
        calls.append((domain, service, dict(data or {})))

    hass.services.async_call = AsyncMock(side_effect=_call)
    runtime = _runtime(hass, _inst(post_run_script="script.boom"))

    await runtime._async_finish_run(RUN_STATE_IDLE, error=None)

    assert calls == []
    assert runtime.coordinator.run_state.run_state == RUN_STATE_IDLE


@pytest.mark.asyncio
async def test_post_run_timeout_stops_the_script() -> None:
    calls: list[tuple[str, str, dict]] = []
    hass = _hass(calls)

    async def _call(domain, service, data=None, **kwargs):
        calls.append((domain, service, dict(data or {})))
        if service == "hangs":
            await asyncio.sleep(30)

    hass.services.async_call = AsyncMock(side_effect=_call)
    runtime = _runtime(
        hass, _inst(post_run_script="script.hangs", post_run_script_timeout_sec=1)
    )

    await runtime._async_finish_run(RUN_STATE_IDLE, error=None)

    assert calls == [
        ("script", "hangs", {}),
        ("script", "turn_off", {"entity_id": "script.hangs"}),
    ]


@pytest.mark.asyncio
async def test_full_pipeline_uses_the_slots_scripts() -> None:
    """One run, end to end: the slot's scripts bracket the watering."""
    calls: list[tuple[str, str, dict]] = []
    slot = _slot(
        slot_id="lawn",
        zone_ids_ordered=["z1"],
        override_pre_start_script=True,
        pre_start_script="script.mower_go_home",
        override_post_run_script=True,
        post_run_script="script.mower_resume",
    )
    inst = _inst(
        pre_start_switches=["switch.pump"],
        pre_start_delay_sec=0,
        pre_start_script="script.global_pre",
        post_run_script="script.global_post",
        zones={
            "z1": Zone(
                zone_id="z1",
                name="Lawn",
                switch_entity_ids=["switch.z1"],
                duration_normal_min=1,
            )
        },
        schedule_slots=[slot],
    )
    runtime = _runtime(_hass(calls), inst)
    runtime._async_wait_zone_duration = AsyncMock()  # the zone is over at once

    await runtime.async_run_phases([["z1"]], scheduled=True, slot_ids=["lawn"])
    await runtime._task

    # The slot's scripts bracket everything; the global ones never run.
    assert calls[0] == ("script", "mower_go_home", {})
    assert calls[1] == ("switch", "turn_on", {"entity_id": "switch.pump"})
    assert calls[2] == ("switch", "turn_on", {"entity_id": "switch.z1"})
    assert calls[-1] == ("script", "mower_resume", {})
    assert [c for c in calls[3:-1] if c[1] != "turn_off"] == []
    assert not [c for c in calls if c[0] == "script" and c[1].startswith("global")]


@pytest.mark.asyncio
async def test_manual_zone_run_uses_the_installations_scripts() -> None:
    """No slot behind the run, so the global scripts apply."""
    calls: list[tuple[str, str, dict]] = []
    inst = _inst(
        pre_start_delay_sec=0,
        pre_start_script="script.global_pre",
        post_run_script="script.global_post",
        zones={
            "z1": Zone(
                zone_id="z1",
                name="Lawn",
                switch_entity_ids=["switch.z1"],
                duration_normal_min=1,
            )
        },
    )
    runtime = _runtime(_hass(calls), inst)
    runtime._async_wait_zone_duration = AsyncMock()  # the zone is over at once

    await runtime.async_run_zone("z1")
    await runtime._task

    assert calls[0] == ("script", "global_pre", {})
    assert calls[-1] == ("script", "global_post", {})


# --- "what is it waiting for" -------------------------------------------------


@pytest.mark.asyncio
async def test_the_running_script_is_published_while_it_blocks() -> None:
    """Otherwise the panel just says "preparing" for five silent minutes."""
    seen: list[str | None] = []
    hass = _hass([])
    runtime = _runtime(hass, _inst(pre_start_script="script.slow"))

    async def _call(domain, service, data=None, **kwargs):
        if service == "slow":
            seen.append(runtime.coordinator.run_state.active_script)

    hass.services.async_call = AsyncMock(side_effect=_call)

    await runtime._async_pre_start(0)

    assert seen == ["script.slow"]
    # Cleared again once the script is through.
    assert runtime.coordinator.run_state.active_script is None


@pytest.mark.asyncio
async def test_a_failing_script_still_clears_the_published_name() -> None:
    hass = _hass([])

    async def _call(domain, service, data=None, **kwargs):
        raise RuntimeError("script blew up")

    hass.services.async_call = AsyncMock(side_effect=_call)
    runtime = _runtime(hass, _inst(post_run_script="script.boom"))

    await runtime._async_finish_run(RUN_STATE_IDLE, error=None)

    assert runtime.coordinator.run_state.active_script is None


def test_active_script_round_trips_and_defaults() -> None:
    rs = RunState(active_script="script.mower_go_home")
    assert RunState.from_dict(rs.to_dict()).active_script == "script.mower_go_home"
    assert RunState.from_dict({}).active_script is None


# --- panel API ----------------------------------------------------------------


def _hass_with_entities() -> MagicMock:
    hass = MagicMock()
    hass.states.get.return_value = MagicMock(state="off")
    return hass


def test_payload_overrides_are_applied_to_the_slot() -> None:
    slot = _slot()
    err = _apply_slot_script_overrides(
        _hass_with_entities(),
        slot,
        {
            "override_pre_start_script": True,
            "pre_start_script": " script.mower_go_home ",
            "pre_start_script_timeout_sec": 600,
            "override_post_run_script": True,
            "post_run_script": "",
            "post_run_script_timeout_sec": None,
        },
    )
    assert err is None
    assert slot.override_pre_start_script is True
    assert slot.pre_start_script == "script.mower_go_home"
    assert slot.pre_start_script_timeout_sec == 600
    assert slot.override_post_run_script is True
    assert slot.post_run_script == ""
    assert slot.post_run_script_timeout_sec is None


def test_keys_absent_from_the_payload_are_left_alone() -> None:
    """A slot edit that only moves the time must not wipe its scripts."""
    slot = _slot(override_pre_start_script=True, pre_start_script="script.keep")
    assert _apply_slot_script_overrides(_hass_with_entities(), slot, {"name": "x"}) is None
    assert slot.pre_start_script == "script.keep"


def test_a_rejected_script_leaves_the_slot_untouched() -> None:
    """Validation runs before anything is assigned — no half-applied override."""
    slot = _slot(override_pre_start_script=True, pre_start_script="script.keep")
    err = _apply_slot_script_overrides(
        _hass_with_entities(),
        slot,
        {
            "override_pre_start_script": True,
            "pre_start_script": "script.new",
            "post_run_script": "switch.not_a_script",
        },
    )
    assert err == "invalid_script"
    assert slot.pre_start_script == "script.keep"
    assert slot.post_run_script == ""


def test_split_and_cycle_members_inherit_the_overrides() -> None:
    src = _slot(
        override_post_run_script=True,
        post_run_script="script.mower_resume",
        post_run_script_timeout_sec=45,
    )
    dst = _slot(slot_id="s2")
    _copy_slot_script_overrides(src, dst)
    assert dst.override_post_run_script is True
    assert dst.post_run_script == "script.mower_resume"
    assert dst.post_run_script_timeout_sec == 45


# --- persistence --------------------------------------------------------------


def test_slot_overrides_round_trip_through_the_store() -> None:
    slot = _slot(
        override_pre_start_script=True,
        pre_start_script="script.mower_go_home",
        pre_start_script_timeout_sec=600,
        override_post_run_script=True,
        post_run_script="script.mower_resume",
    )
    restored = ScheduleSlot.from_dict(slot.to_dict())
    assert restored.override_pre_start_script is True
    assert restored.pre_start_script == "script.mower_go_home"
    assert restored.pre_start_script_timeout_sec == 600
    assert restored.override_post_run_script is True
    assert restored.post_run_script == "script.mower_resume"
    # Not configured: inherit the installation's timeout.
    assert restored.post_run_script_timeout_sec is None


def test_slots_stored_before_this_feature_load_with_defaults() -> None:
    """v1.2.0 stores have no script keys on a slot; STORE_VERSION stays 1."""
    old = {"slot_id": "s1", "weekday": 2, "time_local": "06:00"}
    restored = ScheduleSlot.from_dict(old)
    assert restored.override_pre_start_script is False
    assert restored.pre_start_script == ""
    assert restored.pre_start_script_timeout_sec is None
    assert restored.override_post_run_script is False
    assert restored.post_run_script == ""
    assert restored.post_run_script_timeout_sec is None


def test_installations_stored_before_this_feature_load_with_defaults() -> None:
    restored = Installation.from_dict({"installation_id": "i1", "name": "Garden"})
    assert restored.post_run_script == ""
    assert restored.post_run_script_timeout_sec == 300
