"""Tests for the Lovelace card's read model.

The card renders straight from this payload, so the parts worth pinning down are
the ones it cannot recompute: which installation a bare card resolves to, how a
slot's wall-clock duration accounts for parallel phases, which firings actually
land in the next-runs list, and how a pause and an odd/even rhythm show up in
the week grid.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo

import pytest

from custom_components.simple_irrigation.card_api import (
    _cadence,
    _next_firings,
    _resolve,
    _slot_duration_min,
    _snapshot,
    _week,
    _zone_issue,
)
from custom_components.simple_irrigation.const import (
    RUN_STATE_IDLE,
    RUN_STATE_RUNNING,
)
from custom_components.simple_irrigation.models import (
    Installation,
    RunState,
    ScheduleSlot,
    Zone,
)

TZ = ZoneInfo("Europe/Berlin")
# A Monday in an even ISO week (week 34), so "even" slots fire and "odd" ones do not.
NOW = datetime(2026, 8, 17, 10, 0, tzinfo=TZ)


def _zone(zone_id: str, name: str, normal: int, **kw) -> Zone:
    return Zone(
        zone_id=zone_id,
        name=name,
        switch_entity_ids=[f"switch.{zone_id}"],
        duration_normal_min=normal,
        duration_eco_min=normal - 2,
        duration_extra_min=normal + 5,
        **kw,
    )


def _slot(slot_id: str, weekdays, time_local, zone_ids, **kw) -> ScheduleSlot:
    return ScheduleSlot(
        slot_id=slot_id,
        weekdays=weekdays,
        time_local=time_local,
        zone_ids_ordered=zone_ids,
        **kw,
    )


def _installation(**kw) -> Installation:
    zones = {
        "z1": _zone("z1", "Front Lawn", 20),
        "z2": _zone("z2", "Back Lawn", 20),
        "z3": _zone("z3", "Flower Beds", 12),
    }
    inst = Installation(
        installation_id="i1",
        name="Garden irrigation",
        zones=zones,
        max_parallel_zones=2,
        schedule_slots=[
            _slot("morning", [0, 1, 2, 3, 4, 5, 6], "06:00", ["z1", "z2"], name="Morning lawns"),
            _slot("evening", [0, 2, 4], "19:30", ["z3"], name="Evening beds"),
        ],
    )
    for key, value in kw.items():
        setattr(inst, key, value)
    return inst


def _hass(states=None) -> MagicMock:
    hass = MagicMock()
    hass.config.time_zone = "Europe/Berlin"
    store = states or {}

    def _get(entity_id):
        return store.get(entity_id)

    hass.states.get.side_effect = _get
    return hass


def _state(value: str) -> MagicMock:
    st = MagicMock()
    st.state = value
    return st


def _freeze():
    """Pin dt_util.now so schedule maths is not a calendar lottery."""
    return patch(
        "custom_components.simple_irrigation.card_api.dt_util.now", return_value=NOW
    )


# --- installation resolution ------------------------------------------------


def _entry(entry_id: str, inst: Installation):
    coord = MagicMock()
    coord.installation = inst
    return entry_id, {"coordinator": coord, "runtime": MagicMock()}


def test_resolve_auto_picks_the_only_installation() -> None:
    """A card dropped on a dashboard with no options must still find its data."""
    hass = _hass()
    entries = [_entry("e1", _installation())]
    with patch("custom_components.simple_irrigation.card_api._entries", return_value=entries):
        assert _resolve(hass, None)[0] == "e1"


def test_resolve_prefers_the_default_installation_when_several_exist() -> None:
    """Two installations and no entry_id: the one flagged default wins."""
    hass = _hass()
    entries = [
        _entry("e1", _installation()),
        _entry("e2", _installation(is_default=True)),
    ]
    with patch("custom_components.simple_irrigation.card_api._entries", return_value=entries):
        assert _resolve(hass, None)[0] == "e2"


def test_resolve_returns_none_when_the_choice_is_ambiguous() -> None:
    """Without a default the card must ask rather than guess."""
    hass = _hass()
    entries = [_entry("e1", _installation()), _entry("e2", _installation())]
    with patch("custom_components.simple_irrigation.card_api._entries", return_value=entries):
        assert _resolve(hass, None) is None


def test_resolve_rejects_an_unknown_entry_id() -> None:
    """A stale entry_id in a dashboard must not silently fall back to another one."""
    hass = _hass()
    entries = [_entry("e1", _installation())]
    with patch("custom_components.simple_irrigation.card_api._entries", return_value=entries):
        assert _resolve(hass, "gone") is None


# --- zone issues ------------------------------------------------------------


@pytest.mark.parametrize(
    ("states", "reason"),
    [
        ({}, "missing"),
        ({"switch.z1": _state("unavailable")}, "unavailable"),
        ({"switch.z1": _state("unknown")}, "unavailable"),
    ],
)
def test_zone_issue_flags_unusable_outputs(states, reason) -> None:
    """A zone whose valve is gone must say so instead of looking ready."""
    issue = _zone_issue(_hass(states), _zone("z1", "Front Lawn", 20))
    assert issue is not None
    assert issue["reason"] == reason
    assert issue["entity_id"] == "switch.z1"


def test_zone_issue_is_none_for_a_healthy_zone() -> None:
    hass = _hass({"switch.z1": _state("off")})
    assert _zone_issue(hass, _zone("z1", "Front Lawn", 20)) is None


def test_zone_without_switch_but_with_start_service_is_not_an_issue() -> None:
    """Duration-aware controllers are driven by a service, not by a switch."""
    zone = Zone(
        zone_id="z9",
        name="Hydrawise",
        switch_entity_ids=[],
        start_service="hydrawise.start_zone",
    )
    assert _zone_issue(_hass(), zone) is None


def test_zone_without_any_output_is_an_issue() -> None:
    zone = Zone(zone_id="z9", name="Orphan", switch_entity_ids=[])
    assert _zone_issue(_hass(), zone)["reason"] == "no_output"


# --- durations --------------------------------------------------------------


def test_slot_duration_counts_a_parallel_phase_once() -> None:
    """Two zones watering together cost the longer one, not their sum."""
    inst = _installation()
    slot = inst.schedule_slots[0]  # z1 + z2, both 20 min, max_parallel 2
    assert _slot_duration_min(inst, slot) == 20


def test_slot_duration_adds_up_sequential_phases() -> None:
    """With one valve at a time the same slot takes twice as long."""
    inst = _installation(max_parallel_zones=1)
    assert _slot_duration_min(inst, inst.schedule_slots[0]) == 40


def test_slot_duration_follows_the_active_mode() -> None:
    """Eco shortens every zone, so the estimate has to move with it."""
    inst = _installation(mode="eco")
    assert _slot_duration_min(inst, inst.schedule_slots[0]) == 18


def test_slot_duration_skips_disabled_zones() -> None:
    inst = _installation()
    inst.zones["z1"].enabled = False
    assert _slot_duration_min(inst, inst.schedule_slots[0]) == 20


# --- cadence ----------------------------------------------------------------


def test_cadence_carries_the_wizard_metadata() -> None:
    """The card localizes the phrase; the backend only supplies the numbers."""
    slot = _slot(
        "s", [0, 2, 4], "19:30", ["z1"],
        cycle_kind="every_n_days",
        cycle_meta={"n": 2, "times": ["19:30"]},
    )
    cadence = _cadence(slot)
    assert cadence["kind"] == "every_n_days"
    assert cadence["n"] == 2
    assert cadence["weekdays"] == [0, 2, 4]


def test_cadence_survives_unusable_metadata() -> None:
    """A hand-edited store must not break the whole snapshot."""
    slot = _slot("s", [0], "06:00", ["z1"], cycle_meta={"n": "not a number"})
    assert _cadence(slot)["n"] is None


# --- next runs --------------------------------------------------------------


def test_next_firings_are_resolved_dates_in_order() -> None:
    """The card shows real dates, so the backend does the weekday maths."""
    hass = _hass()
    with _freeze():
        runs = _next_firings(hass, _installation(), 4)

    stamps = [r["fire_at"] for r in runs]
    assert stamps == sorted(stamps)
    # Today is Monday: the evening slot fires tonight, the morning one tomorrow.
    assert runs[0]["slot_id"] == "evening"
    assert runs[0]["fire_at"].startswith("2026-08-17T19:30")
    assert runs[1]["slot_id"] == "morning"
    assert runs[1]["fire_at"].startswith("2026-08-18T06:00")


def test_next_firings_skip_todays_time_that_has_already_passed() -> None:
    """06:00 is behind us at 10:00, so today's morning run must not be listed."""
    hass = _hass()
    with _freeze():
        runs = _next_firings(hass, _installation(), 4)
    assert not any(r["fire_at"].startswith("2026-08-17T06:00") for r in runs)


def test_next_firings_respect_the_week_parity() -> None:
    """An odd-week slot must not appear during an even ISO week."""
    inst = _installation()
    inst.schedule_slots = [
        _slot("odd", [1], "07:00", ["z1"], week_parity="odd"),
    ]
    hass = _hass()
    with _freeze():
        runs = _next_firings(hass, inst, 2)
    # Tuesday of this even week is skipped; the next one is a fortnight out.
    assert runs[0]["fire_at"].startswith("2026-08-25")


def test_next_firings_mark_runs_a_pause_will_swallow() -> None:
    """Paused runs stay listed — "nothing until Wednesday" is the useful bit."""
    inst = _installation(pause_until=NOW + timedelta(days=1))
    hass = _hass()
    with _freeze():
        runs = _next_firings(hass, inst, 4)
    assert runs[0]["skipped_by_pause"] is True
    assert any(r["skipped_by_pause"] is False for r in runs)


def test_next_firings_ignore_disabled_slots() -> None:
    inst = _installation()
    inst.schedule_slots[1].enabled = False
    hass = _hass()
    with _freeze():
        runs = _next_firings(hass, inst, 4)
    assert all(r["slot_id"] == "morning" for r in runs)


def test_next_firings_are_empty_for_a_disabled_installation() -> None:
    hass = _hass()
    with _freeze():
        assert _next_firings(hass, _installation(enabled=False), 4) == []


# --- week -------------------------------------------------------------------


def test_week_starts_on_monday_and_marks_today() -> None:
    hass = _hass()
    with _freeze():
        week = _week(hass, _installation())
    assert [d["weekday"] for d in week["days"]] == [0, 1, 2, 3, 4, 5, 6]
    assert week["days"][0]["date"] == "2026-08-17"
    assert week["days"][0]["today"] is True
    assert sum(d["today"] for d in week["days"]) == 1


def test_week_places_runs_by_start_minute() -> None:
    """The column is a 24 h axis, so 19:30 has to arrive as 1170."""
    hass = _hass()
    with _freeze():
        week = _week(hass, _installation())
    monday = week["days"][0]
    assert [r["start_min"] for r in monday["runs"]] == [360, 1170]
    assert monday["total_min"] == 20 + 12


def test_week_keeps_off_rhythm_runs_visible_but_uncounted() -> None:
    """The dashed bar shows the rhythm; it must not inflate the week's total."""
    inst = _installation()
    inst.schedule_slots = [_slot("odd", [0], "07:00", ["z1"], week_parity="odd")]
    hass = _hass()
    with _freeze():
        week = _week(hass, inst)
    monday = week["days"][0]
    assert monday["runs"][0]["parity_only"] is True
    assert monday["total_min"] == 0
    assert week["total_runs"] == 0


def test_week_marks_days_a_pause_covers() -> None:
    inst = _installation(pause_until=NOW + timedelta(days=2))
    hass = _hass()
    with _freeze():
        week = _week(hass, inst)
    assert week["days"][0]["paused"] is True
    assert week["days"][0]["total_min"] == 0
    # Beyond the pause the week fills in again.
    assert week["days"][4]["total_min"] > 0


# --- snapshot ---------------------------------------------------------------


def _coordinator(inst: Installation, run_state: RunState):
    coord = MagicMock()
    coord.installation = inst
    coord.run_state = run_state
    return {"coordinator": coord, "runtime": MagicMock()}


def test_snapshot_reports_paused_even_though_the_runtime_says_idle() -> None:
    """`paused` is an installation setting, not a runtime state — the card
    still has to show one word for "nothing will happen"."""
    inst = _installation(pause_until=NOW + timedelta(hours=5))
    hass = _hass()
    with _freeze(), patch(
        "custom_components.simple_irrigation.card_api._entity_id", return_value=""
    ):
        snap = _snapshot(hass, "e1", _coordinator(inst, RunState(run_state=RUN_STATE_IDLE)))
    assert snap["state"] == "paused"
    assert snap["paused_until"] is not None


def test_snapshot_phase_counter_includes_the_running_phase() -> None:
    """"Phase 2 of 5" cannot be derived from the queue alone."""
    rs = RunState(
        run_state=RUN_STATE_RUNNING,
        phase_index=2,
        upcoming_phases=[["z2"], ["z3"], ["z1"]],
        active_zone_ids=["z1"],
    )
    hass = _hass()
    with _freeze(), patch(
        "custom_components.simple_irrigation.card_api._entity_id", return_value=""
    ):
        snap = _snapshot(hass, "e1", _coordinator(_installation(), rs))
    assert (snap["phase_index"], snap["phase_total"]) == (2, 5)


def test_snapshot_has_no_phase_counter_while_idle() -> None:
    hass = _hass()
    with _freeze(), patch(
        "custom_components.simple_irrigation.card_api._entity_id", return_value=""
    ):
        snap = _snapshot(hass, "e1", _coordinator(_installation(), RunState()))
    assert snap["phase_index"] is None
    assert snap["phase_total"] is None


def test_snapshot_uses_the_saved_zone_order() -> None:
    """The Lovelace card should match the order chosen in the panel."""
    inst = _installation()
    assert inst.set_zone_order(["z3", "z1", "z2"])
    hass = _hass()
    with _freeze(), patch(
        "custom_components.simple_irrigation.card_api._entity_id", return_value=""
    ):
        snap = _snapshot(hass, "e1", _coordinator(inst, RunState()))
    assert [zone["zone_id"] for zone in snap["zones"]] == ["z3", "z1", "z2"]


def test_snapshot_counts_only_issues_on_enabled_zones() -> None:
    """A deliberately disabled zone with a dead valve is not a problem to report."""
    inst = _installation()
    inst.zones["z1"].enabled = False
    hass = _hass({"switch.z2": _state("on"), "switch.z3": _state("on")})
    with _freeze(), patch(
        "custom_components.simple_irrigation.card_api._entity_id", return_value=""
    ):
        snap = _snapshot(hass, "e1", _coordinator(inst, RunState()))
    assert snap["issue_count"] == 0
    assert next(z for z in snap["zones"] if z["zone_id"] == "z1")["issue"] is not None


def test_snapshot_marks_queued_zones_from_the_upcoming_phases() -> None:
    """The running card lists the queue, which lives in upcoming_phases."""
    rs = RunState(
        run_state=RUN_STATE_RUNNING,
        phase_index=1,
        active_zone_ids=["z1"],
        upcoming_phases=[["z2", "z3"]],
    )
    hass = _hass()
    with _freeze(), patch(
        "custom_components.simple_irrigation.card_api._entity_id", return_value=""
    ):
        snap = _snapshot(hass, "e1", _coordinator(_installation(), rs))
    by_id = {z["zone_id"]: z for z in snap["zones"]}
    assert by_id["z1"]["active"] and not by_id["z1"]["queued"]
    assert by_id["z2"]["queued"] and by_id["z3"]["queued"]


def test_snapshot_is_json_serializable() -> None:
    """It goes over the websocket verbatim; a stray datetime would 500 the card."""
    import json

    rs = RunState(
        run_state=RUN_STATE_RUNNING,
        phase_index=1,
        active_zone_ids=["z1"],
        zone_ends_at={"z1": NOW + timedelta(minutes=5)},
        next_run_per_zone={"z1": NOW + timedelta(days=1)},
        last_run_per_zone={"z1": NOW - timedelta(days=1)},
        current_run_started_at=NOW,
        active_script="script.mower_go_home",
        active_script_started_at=NOW,
        active_script_timeout_sec=300,
    )
    hass = _hass()
    with _freeze(), patch(
        "custom_components.simple_irrigation.card_api._entity_id", return_value=""
    ):
        snap = _snapshot(hass, "e1", _coordinator(_installation(), rs))
    json.dumps(snap)  # must not raise
    assert snap["active_script_timeout_sec"] == 300
    assert snap["run_ends_at"] is not None
