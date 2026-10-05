"""The panel previews what the backend will do -- with code of its own.

cycle.ts, season.ts and timetable-model.ts work out in the browser what
cycle.py, season.py and the models work out in Home Assistant: which slots a
cadence makes, whether a day is in season, when a slot fires next, how long a
zone waters. Nothing kept the two in step but care. This builds the panel's
functions on their own, runs them under Node and holds every answer against
Python's.

Needs Node and the frontend's installed packages; CI has both. Without them
the test is skipped locally and fails in CI, where it must not go missing.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

from custom_components.simple_irrigation.cycle import (
    anchor_week_parity,
    generate_cycle_slots,
    normalize_start_times,
)
from custom_components.simple_irrigation.models import (
    Installation,
    ScheduleSlot,
    Zone,
    parse_season,
)
from custom_components.simple_irrigation.season import (
    in_season,
    next_day_in_season,
    next_slot_fire,
)

FRONTEND = Path(__file__).parent.parent / "custom_components" / "simple_irrigation" / "frontend"
ZONE = "Europe/Berlin"
TZ = ZoneInfo(ZONE)


def _days(start: date, end: date) -> list[date]:
    return [start + timedelta(days=i) for i in range((end - start).days + 1)]


# --- the cases ---------------------------------------------------------------------

TIME_SETS = [["06:00"], ["19:30", "06:00"], ["00:00", "12:15", "23:59"]]

CYCLES = [
    {"kind": kind, "meta": {**meta, "times": times}, "parity": parity}
    for kind, metas in {
        "daily": [{}],
        "twice_daily": [{}],
        "weekly": [{"anchor_weekday": a} for a in range(7)],
        "biweekly": [{"anchor_weekday": a} for a in range(7)],
        "every_n_days": [{"n": n, "anchor_weekday": a} for n in (2, 3) for a in range(7)],
        "n_per_week": [{"week_days": d} for d in ([0], [0, 2, 4], [1, 3, 5, 6], list(range(7)))],
    }.items()
    for meta in metas
    for times in TIME_SETS
    for parity in ("odd", "even")
]

TIMES = [
    ["18:00", "06:00", "06:00"],
    ["6:00", "06:00"],
    ["23:59", "00:00"],
    [],
    None,
    ["nope", "25:00", "07:60", "07:05"],
    ["06:00"] * 12,
    [f"{h:02d}:00" for h in range(12)],
]

# Year ends, including the ones with a week 53, and a day of every month.
WEEK_DAYS = (
    _days(date(2024, 12, 20), date(2025, 1, 12))
    + _days(date(2026, 12, 20), date(2027, 1, 17))
    + _days(date(2032, 12, 20), date(2033, 1, 16))
    + [date(2027, month, 15) for month in range(1, 13)]
)

ANCHORS = [(day, weekday) for day in WEEK_DAYS[::3] for weekday in range(7)]

SEASONS = [
    [],
    [{"from": "04-01", "to": "10-31"}],
    [{"from": "04-01", "to": "05-31"}, {"from": "09-01", "to": "10-31"}],
    [{"from": "11-01", "to": "02-28"}],
    [{"from": "01-01", "to": "02-29"}],
    [{"from": "02-29", "to": "03-31"}],
    [{"from": "06-15", "to": "06-15"}],
    [{"from": "12-31", "to": "01-01"}],
    [{"from": "04-01", "to": "10-31"}, {"from": "04-01", "to": "10-31"}],
    [{"from": "02-30", "to": "03-01"}, {"from": "13-01", "to": "03-01"}, {"from": "05-01"}],
    [{"from": f"{m:02d}-01", "to": f"{m:02d}-10"} for m in range(1, 13)],
    "not a list",
]
# A year without a leap day and one with.
SEASON_DAYS = _days(date(2027, 1, 1), date(2028, 12, 31))

FIRE_SLOTS = [
    {"weekdays": list(range(7)), "week_parity": "every", "time_local": "06:00"},
    {"weekdays": [2], "week_parity": "every", "time_local": "19:30"},
    {"weekdays": [4], "week_parity": "even", "time_local": "06:00"},
    {"weekdays": [0, 3], "week_parity": "odd", "time_local": "23:59"},
    {"weekdays": [6], "week_parity": "every", "time_local": "00:00"},
]
FIRE_SEASONS = [
    [],
    [{"from": "04-01", "to": "10-31"}],
    [{"from": "04-01", "to": "05-31"}, {"from": "09-01", "to": "10-31"}],
    [{"from": "04-01", "to": "04-03"}, {"from": "06-01", "to": "09-30"}],
    [{"from": "11-01", "to": "02-28"}],
]
FIRE_NOWS = [
    "2026-07-08T05:00",
    "2026-07-08T19:30",
    "2026-10-05T19:30",
    "2026-10-30T12:00",
    "2026-10-31T23:59",
    "2026-12-25T07:00",  # the three-week gap across week 53
    "2027-03-31T23:00",
    "2027-04-01T00:00",
    "2028-02-28T12:00",
]
FIRES = [
    {"slot": slot, "season": season, "now": now}
    for slot in FIRE_SLOTS
    for season in FIRE_SEASONS
    for now in FIRE_NOWS
]

MINUTES = [
    {"zone_id": "a", "zone": zone, "mode": mode, "fixed": fixed}
    for zone in (
        {"duration_eco_min": 5, "duration_normal_min": 15, "duration_extra_min": 25},
        {"duration_eco_min": 0, "duration_normal_min": 0, "duration_extra_min": 0},
    )
    for mode in ("eco", "normal", "extra")
    for fixed in ({}, {"a": 0}, {"a": 7}, {"b": 9})
]


# --- running the panel's side ------------------------------------------------------


@pytest.fixture(scope="module")
def panel() -> dict:
    """What the panel's functions make of the cases."""
    node = shutil.which("node")
    npx = shutil.which("npx")
    if not node or not npx or not (FRONTEND / "node_modules" / "rollup").exists():
        if os.environ.get("CI"):
            pytest.fail("Node and the frontend's packages are needed for the parity test")
        pytest.skip("Node or the frontend's node_modules are not here")
    subprocess.run(
        [npx, "rollup", "-c", "rollup.parity.config.js", "--silent"],
        cwd=FRONTEND,
        check=True,
        capture_output=True,
        timeout=180,
    )
    cases = {
        "cycles": CYCLES,
        "times": TIMES,
        "days": [d.isoformat() for d in WEEK_DAYS],
        "anchors": [{"day": d.isoformat(), "weekday": w} for d, w in ANCHORS],
        "seasons": [{"raw": raw, "days": [d.isoformat() for d in SEASON_DAYS]} for raw in SEASONS],
        "fires": FIRES,
        "minutes": MINUTES,
    }
    result = subprocess.run(
        [node, ".parity/parity.mjs"],
        cwd=FRONTEND,
        input=json.dumps(cases),
        check=True,
        capture_output=True,
        text=True,
        timeout=120,
        # The panel reads the clock of the browser; here that is this zone.
        env={**os.environ, "TZ": ZONE},
    )
    return json.loads(result.stdout)


# --- holding it against Python -----------------------------------------------------


def test_a_cadence_makes_the_same_slots(panel: dict) -> None:
    assert len(CYCLES) > 200
    for case, got in zip(CYCLES, panel["cycles"], strict=True):
        want = generate_cycle_slots(case["kind"], dict(case["meta"]), anchor_parity=case["parity"])
        assert got == want, case


def test_start_times_are_put_in_order_the_same_way(panel: dict) -> None:
    for raw, got in zip(TIMES, panel["times"], strict=True):
        assert got == normalize_start_times(raw), raw


def test_the_calendar_week_is_the_same_also_around_week_53(panel: dict) -> None:
    assert 53 in panel["weeks"]
    for day, got in zip(WEEK_DAYS, panel["weeks"], strict=True):
        assert got == day.isocalendar()[1], day


def test_a_rhythm_is_anchored_in_the_same_week(panel: dict) -> None:
    for (day, weekday), got in zip(ANCHORS, panel["anchors"], strict=True):
        assert got == anchor_week_parity(weekday, day), (day, weekday)


def test_a_season_is_read_and_applied_the_same_way(panel: dict) -> None:
    for raw, got in zip(SEASONS, panel["seasons"], strict=True):
        periods = parse_season(raw)
        assert got["periods"] == [p.to_dict() for p in periods], raw
        assert got["inside"] == [in_season(periods, d) for d in SEASON_DAYS], raw
        opens = [next_day_in_season(periods, d) for d in SEASON_DAYS]
        assert got["opens"] == [d.isoformat() if d else None for d in opens], raw


def test_a_slot_fires_next_at_the_same_moment(panel: dict) -> None:
    """Rhythm, season, today's time already passed, and the gap across week 53."""
    assert len(FIRES) > 200
    for case, got in zip(FIRES, panel["fires"], strict=True):
        slot = ScheduleSlot(slot_id="s", zone_ids_ordered=["a"], **case["slot"])
        inst = Installation(
            installation_id="i", name="G", schedule_slots=[slot], season=parse_season(case["season"])
        )
        now = datetime.fromisoformat(case["now"]).replace(tzinfo=TZ)
        fire = next_slot_fire(inst, slot, now, TZ)
        assert got == (fire.strftime("%Y-%m-%dT%H:%M") if fire else None), case


def test_a_zone_waters_for_the_same_minutes(panel: dict) -> None:
    for case, got in zip(MINUTES, panel["minutes"], strict=True):
        zone = Zone(zone_id="a", name="a", switch_entity_ids=["switch.a"], **case["zone"])
        slot = ScheduleSlot(
            slot_id="s",
            weekdays=[0],
            time_local="06:00",
            zone_ids_ordered=["a", "b"],
            zone_minutes=dict(case["fixed"]),
        )
        assert got == slot.duration_for(zone, case["mode"]), case
