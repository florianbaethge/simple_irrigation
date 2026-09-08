"""Typed models for Simple Irrigation."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from .const import (
    MAX_REPETITIONS,
    MAX_SOAK_MIN,
    GUARD_BOOLEAN_OPERATORS,
    GUARD_NUMERIC_OPERATORS,
    GUARD_OP_ABOVE,
    GUARD_OPERATORS,
    MODE_NORMAL,
    RUN_STATE_IDLE,
    SCRIPT_TIMEOUT_SEC,
    WEEK_PARITIES,
    WEEK_PARITY_EVERY,
)

_LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class Guard:
    """One condition that must hold for a scheduled run to start.

    ``value`` is interpreted by ``operator``: a number for the numeric operators,
    text for ``state_is``, and ignored (always ``None``) for the boolean ones.
    Guards are immutable value objects — the list is always replaced wholesale,
    never mutated in place, which makes copying between slots trivially safe.
    """

    entity_id: str
    operator: str = GUARD_OP_ABOVE
    value: float | str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict."""
        return {
            "entity_id": self.entity_id,
            "operator": self.operator,
            "value": self.value,
        }

    @staticmethod
    def from_dict(data: Any) -> Guard | None:
        """Deserialize one guard; return None when it cannot be used."""
        if not isinstance(data, dict):
            return None
        entity_id = str(data.get("entity_id") or "").strip()
        if not entity_id or "." not in entity_id:
            return None
        operator = str(data.get("operator") or "").strip()
        if operator not in GUARD_OPERATORS:
            return None

        raw = data.get("value")
        value: float | str | None
        if operator in GUARD_BOOLEAN_OPERATORS:
            value = None
        elif operator in GUARD_NUMERIC_OPERATORS:
            if raw in (None, ""):
                return None
            try:
                value = float(raw)
            except (TypeError, ValueError):
                return None
        else:  # text operators
            value = str(raw).strip() if raw not in (None, "") else None
            if not value:
                return None
        return Guard(entity_id=entity_id, operator=operator, value=value)


def parse_guards(raw: Any) -> list[Guard]:
    """Tolerantly build a guard list; unusable entries are dropped with a warning."""
    out: list[Guard] = []
    if not isinstance(raw, (list, tuple)):
        return out
    for item in raw:
        guard = Guard.from_dict(item)
        if guard is None:
            _LOGGER.warning("Dropping unusable guard definition: %r", item)
            continue
        out.append(guard)
    return out


@dataclass
class Zone:
    """One irrigation zone (circuit)."""

    zone_id: str
    name: str
    switch_entity_ids: list[str] = field(default_factory=list)
    enabled: bool = True
    duration_eco_min: int = 10
    duration_normal_min: int = 15
    duration_extra_min: int = 20
    exclusive: bool = False
    # Optional advanced start path for integrations that need runtime in the start call.
    start_service: str = ""
    duration_field: str = ""
    duration_unit: str = ""
    start_entity_id: str = ""
    # --- Water ---------------------------------------------------------------
    # How much this zone uses. A meter entity on the zone's own line measures
    # it; a flow rate in litres per minute (read off the house meter once)
    # estimates it. The meter wins when both are set; neither means the zone
    # reports no water at all — never a guess it cannot back up.
    water_meter_entity_id: str = ""
    flow_rate_lpm: float = 0.0

    @property
    def tracks_water(self) -> bool:
        """Whether this zone can report litres, measured or estimated."""
        return bool(self.water_meter_entity_id.strip()) or self.flow_rate_lpm > 0

    def duration_for_mode(self, mode: str) -> int:
        """Return duration in minutes for the given global mode."""
        if mode == "eco":
            return self.duration_eco_min
        if mode == "extra":
            return self.duration_extra_min
        return self.duration_normal_min

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict."""
        first = self.switch_entity_ids[0] if self.switch_entity_ids else ""
        return {
            "zone_id": self.zone_id,
            "name": self.name,
            "switch_entity_ids": list(self.switch_entity_ids),
            "switch_entity_id": first,
            "enabled": self.enabled,
            "duration_eco_min": self.duration_eco_min,
            "duration_normal_min": self.duration_normal_min,
            "duration_extra_min": self.duration_extra_min,
            "exclusive": self.exclusive,
            "start_service": self.start_service,
            "duration_field": self.duration_field,
            "duration_unit": self.duration_unit,
            "start_entity_id": self.start_entity_id,
            "water_meter_entity_id": self.water_meter_entity_id,
            "flow_rate_lpm": self.flow_rate_lpm,
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> Zone:
        """Deserialize from store dict."""
        raw_ids = data.get("switch_entity_ids")
        ids: list[str] = []
        if isinstance(raw_ids, list):
            seen: set[str] = set()
            for x in raw_ids:
                s = str(x).strip()
                if s and s not in seen:
                    seen.add(s)
                    ids.append(s)
        if not ids and data.get("switch_entity_id"):
            ids = [str(data["switch_entity_id"]).strip()]
        return Zone(
            zone_id=data["zone_id"],
            name=data["name"],
            switch_entity_ids=ids,
            enabled=data.get("enabled", True),
            duration_eco_min=int(data.get("duration_eco_min", 10)),
            duration_normal_min=int(data.get("duration_normal_min", 15)),
            duration_extra_min=int(data.get("duration_extra_min", 20)),
            exclusive=bool(data.get("exclusive", False)),
            start_service=str(data.get("start_service") or "").strip(),
            duration_field=str(data.get("duration_field") or "").strip(),
            duration_unit=str(data.get("duration_unit") or "").strip(),
            start_entity_id=str(data.get("start_entity_id") or "").strip(),
            water_meter_entity_id=str(data.get("water_meter_entity_id") or "").strip(),
            flow_rate_lpm=_non_negative_float(data.get("flow_rate_lpm")),
        )


def normalize_weekdays(raw: Any) -> list[int]:
    """Sorted, de-duplicated weekday indices in 0..6 (Mon..Sun)."""
    out: list[int] = []
    seen: set[int] = set()
    if isinstance(raw, (list, tuple, set)):
        for x in raw:
            try:
                v = int(x)
            except (TypeError, ValueError):
                continue
            if 0 <= v <= 6 and v not in seen:
                seen.add(v)
                out.append(v)
    out.sort()
    return out


def parse_optional_timeout(raw: Any) -> int | None:
    """A slot's script timeout; ``None`` means "inherit the installation's"."""
    if raw in (None, ""):
        return None
    try:
        return max(1, int(raw))
    except (TypeError, ValueError):
        return None


@dataclass
class ScheduleSlot:
    """Weekly time slot with ordered zone IDs.

    A slot may fire on several weekdays (``weekdays``); a single-day slot is just
    ``weekdays=[n]``. The legacy scalar ``weekday`` key is still read (fallback) and
    written (as the first weekday) for backward/rollback compatibility.
    """

    slot_id: str
    weekdays: list[int]  # 0 = Monday .. 6 = Sunday (datetime.weekday())
    time_local: str  # "HH:MM"
    enabled: bool = True
    zone_ids_ordered: list[str] = field(default_factory=list)
    name: str = ""  # optional label for automations / recognition in the UI
    week_parity: str = WEEK_PARITY_EVERY  # every | odd | even (ISO calendar week)
    # Conditions for this slot; AND-combined with the installation's guards
    # unless ``ignore_global_guards`` opts out (e.g. a greenhouse ignoring rain).
    guards: list[Guard] = field(default_factory=list)
    ignore_global_guards: bool = False
    # --- Script overrides ---------------------------------------------------
    # A slot may replace the installation's pre-start / post-run script — the
    # lawn sends the mower home, the drip line does not care. The ``override_``
    # flag is what makes "no script at all for this slot" expressible: with the
    # flag set, an empty entity_id means none, not "fall back to the global".
    override_pre_start_script: bool = False
    pre_start_script: str = ""
    pre_start_script_timeout_sec: int | None = None  # None = inherit
    override_post_run_script: bool = False
    post_run_script: str = ""
    post_run_script_timeout_sec: int | None = None  # None = inherit
    # --- Cycle grouping (presentation + generation metadata only) -----------
    # The runtime never reads these; scheduling still uses weekdays/time/parity.
    cycle_id: str | None = None  # uuid4 shared by all slots of one cycle
    cycle_kind: str = "custom"  # daily | twice_daily | every_n_days | n_per_week | weekly | biweekly | custom
    cycle_meta: dict[str, Any] | None = None  # {"n", "anchor_weekday", "times", "label"}
    # --- Cycle & Soak --------------------------------------------------------
    # Water in several short passes with rests in between, so the water soaks in
    # instead of running off. One repetition with no pauses is a plain run; the
    # runtime sees the difference only as extra steps in its phase queue.
    repetitions: int = 1
    soak_between_phases_min: int = 0
    soak_between_repetitions_min: int = 0

    @property
    def cycle_soak(self) -> bool:
        """Whether this slot repeats or rests at all."""
        return (
            self.repetitions > 1
            or self.soak_between_phases_min > 0
            or self.soak_between_repetitions_min > 0
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict."""
        return {
            "slot_id": self.slot_id,
            "weekdays": list(self.weekdays),
            # Legacy key so a downgraded integration keeps a valid single day.
            "weekday": self.weekdays[0] if self.weekdays else 0,
            "time_local": self.time_local,
            "enabled": self.enabled,
            "zone_ids_ordered": list(self.zone_ids_ordered),
            "name": self.name,
            "week_parity": self.week_parity,
            "guards": [g.to_dict() for g in self.guards],
            "ignore_global_guards": self.ignore_global_guards,
            "override_pre_start_script": self.override_pre_start_script,
            "pre_start_script": self.pre_start_script,
            "pre_start_script_timeout_sec": self.pre_start_script_timeout_sec,
            "override_post_run_script": self.override_post_run_script,
            "post_run_script": self.post_run_script,
            "post_run_script_timeout_sec": self.post_run_script_timeout_sec,
            "cycle_id": self.cycle_id,
            "cycle_kind": self.cycle_kind,
            "cycle_meta": dict(self.cycle_meta) if self.cycle_meta else None,
            "repetitions": self.repetitions,
            "soak_between_phases_min": self.soak_between_phases_min,
            "soak_between_repetitions_min": self.soak_between_repetitions_min,
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> ScheduleSlot:
        """Deserialize from store dict (tolerates missing cycle keys)."""
        parity = str(data.get("week_parity") or WEEK_PARITY_EVERY)
        if parity not in WEEK_PARITIES:
            parity = WEEK_PARITY_EVERY
        weekdays = normalize_weekdays(data.get("weekdays"))
        if not weekdays and data.get("weekday") is not None:
            weekdays = normalize_weekdays([data.get("weekday")])
        if not weekdays:
            weekdays = [0]
        cycle_id_raw = data.get("cycle_id")
        cycle_id = str(cycle_id_raw) if cycle_id_raw else None
        cycle_kind = str(data.get("cycle_kind") or "custom")
        cycle_meta_raw = data.get("cycle_meta")
        cycle_meta = dict(cycle_meta_raw) if isinstance(cycle_meta_raw, dict) else None
        return ScheduleSlot(
            slot_id=data["slot_id"],
            weekdays=weekdays,
            time_local=str(data["time_local"]),
            enabled=bool(data.get("enabled", True)),
            zone_ids_ordered=list(data.get("zone_ids_ordered", [])),
            name=str(data.get("name") or ""),
            week_parity=parity,
            guards=parse_guards(data.get("guards")),
            ignore_global_guards=bool(data.get("ignore_global_guards", False)),
            override_pre_start_script=bool(data.get("override_pre_start_script", False)),
            pre_start_script=str(data.get("pre_start_script") or ""),
            pre_start_script_timeout_sec=parse_optional_timeout(
                data.get("pre_start_script_timeout_sec")
            ),
            override_post_run_script=bool(data.get("override_post_run_script", False)),
            post_run_script=str(data.get("post_run_script") or ""),
            post_run_script_timeout_sec=parse_optional_timeout(
                data.get("post_run_script_timeout_sec")
            ),
            cycle_id=cycle_id,
            cycle_kind=cycle_kind,
            cycle_meta=cycle_meta,
            repetitions=_clamp_int(data.get("repetitions"), 1, 1, MAX_REPETITIONS),
            soak_between_phases_min=_clamp_int(
                data.get("soak_between_phases_min"), 0, 0, MAX_SOAK_MIN
            ),
            soak_between_repetitions_min=_clamp_int(
                data.get("soak_between_repetitions_min"), 0, 0, MAX_SOAK_MIN
            ),
        )


def _non_negative_float(raw: Any) -> float:
    """A float >= 0; 0.0 when the value is missing or junk."""
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return 0.0
    return value if value > 0 else 0.0


def _clamp_int(raw: Any, default: int, lo: int, hi: int) -> int:
    """An int within [lo, hi]; ``default`` when the value is missing or junk."""
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, value))


@dataclass
class Installation:
    """Global installation settings."""

    installation_id: str
    name: str
    enabled: bool = True
    pre_start_switches: list[str] = field(default_factory=list)
    pre_start_delay_sec: int = 10
    # Script run to completion before the pre-start outputs; "" disables it.
    pre_start_script: str = ""
    pre_start_script_timeout_sec: int = SCRIPT_TIMEOUT_SEC
    # Script run once every output is off again; "" disables it.
    post_run_script: str = ""
    post_run_script_timeout_sec: int = SCRIPT_TIMEOUT_SEC
    mode: str = MODE_NORMAL
    pause_until: datetime | None = None
    max_parallel_zones: int = 2
    is_default: bool = False
    # Water meter on the supply line: measures a whole run, whatever ran in it.
    water_meter_entity_id: str = ""
    # Conditions applied to every scheduled run unless a slot opts out.
    guards: list[Guard] = field(default_factory=list)
    zones: dict[str, Zone] = field(default_factory=dict)
    schedule_slots: list[ScheduleSlot] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict."""
        return {
            "installation_id": self.installation_id,
            "name": self.name,
            "enabled": self.enabled,
            "pre_start_switches": list(self.pre_start_switches),
            "pre_start_delay_sec": self.pre_start_delay_sec,
            "pre_start_script": self.pre_start_script,
            "pre_start_script_timeout_sec": self.pre_start_script_timeout_sec,
            "post_run_script": self.post_run_script,
            "post_run_script_timeout_sec": self.post_run_script_timeout_sec,
            "mode": self.mode,
            "pause_until": self.pause_until.isoformat() if self.pause_until else None,
            "max_parallel_zones": self.max_parallel_zones,
            "is_default": self.is_default,
            "water_meter_entity_id": self.water_meter_entity_id,
            "guards": [g.to_dict() for g in self.guards],
            "zones": {k: v.to_dict() for k, v in self.zones.items()},
            "schedule_slots": [s.to_dict() for s in self.schedule_slots],
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> Installation:
        """Deserialize from store dict."""
        pause_raw = data.get("pause_until")
        pause_until: datetime | None = None
        if pause_raw:
            pause_until = datetime.fromisoformat(pause_raw)

        zones_data = data.get("zones") or {}
        zones: dict[str, Zone] = {}
        if isinstance(zones_data, dict):
            for zid, zd in zones_data.items():
                zones[zid] = Zone.from_dict(zd)

        slots_raw = data.get("schedule_slots") or []
        schedule_slots = [ScheduleSlot.from_dict(s) for s in slots_raw]

        return Installation(
            installation_id=data["installation_id"],
            name=data["name"],
            enabled=bool(data.get("enabled", True)),
            pre_start_switches=list(data.get("pre_start_switches", [])),
            pre_start_delay_sec=int(data.get("pre_start_delay_sec", 10)),
            pre_start_script=str(data.get("pre_start_script") or ""),
            pre_start_script_timeout_sec=int(
                data.get("pre_start_script_timeout_sec") or SCRIPT_TIMEOUT_SEC
            ),
            post_run_script=str(data.get("post_run_script") or ""),
            post_run_script_timeout_sec=int(
                data.get("post_run_script_timeout_sec") or SCRIPT_TIMEOUT_SEC
            ),
            mode=str(data.get("mode", MODE_NORMAL)),
            pause_until=pause_until,
            max_parallel_zones=max(1, int(data.get("max_parallel_zones", 2))),
            is_default=bool(data.get("is_default", False)),
            water_meter_entity_id=str(data.get("water_meter_entity_id") or "").strip(),
            guards=parse_guards(data.get("guards")),
            zones=zones,
            schedule_slots=schedule_slots,
        )


@dataclass
class RunState:
    """Volatile runtime state (persisted for recovery hints)."""

    run_state: str = RUN_STATE_IDLE
    active_zone_ids: list[str] = field(default_factory=list)
    queued_zone_ids: list[str] = field(default_factory=list)
    current_run_started_at: datetime | None = None
    last_run_per_zone: dict[str, datetime] = field(default_factory=dict)
    next_run_per_zone: dict[str, datetime | None] = field(default_factory=dict)
    next_run_global: datetime | None = None
    last_error: str | None = None
    current_slot_id: str | None = None
    manual_run: bool = False
    upcoming_phases: list[list[str]] = field(default_factory=list)
    # 1-based position of the phase watering right now; 0 while none is. With
    # ``upcoming_phases`` this gives an exact "phase 2 of 5" — the count cannot
    # be derived from the queue alone, which only ever holds what is still to come.
    phase_index: int = 0
    # Pipeline script the run is currently blocked on, so the panel can say what
    # it is waiting for instead of just "preparing" for five silent minutes.
    active_script: str | None = None
    # When that script was started and how long it may take, so a card can draw a
    # progress bar instead of an indefinite "preparing". Volatile like
    # ``zone_ends_at``: serialized for the UI, never restored from the store.
    active_script_started_at: datetime | None = None
    active_script_timeout_sec: int | None = None
    # Planned end of the currently running zones, so panel and sensors can show a
    # countdown without polling. Written by to_dict() for the panel payload but
    # deliberately never read back in from_dict() — see there.
    zone_ends_at: dict[str, datetime] = field(default_factory=dict)
    # End of the Cycle & Soak pause the run is resting in, so the UI can count
    # it down; None while watering. Volatile exactly like ``zone_ends_at``.
    soak_until: datetime | None = None
    # --- Water ---------------------------------------------------------------
    # Litres per zone: running total (what the water sensors report), the last
    # run, and whether that came from a meter ("measured") or a flow rate
    # ("estimated"). Zones that track no water simply have no entry.
    water_total_l: dict[str, float] = field(default_factory=dict)
    water_last_run_l: dict[str, float] = field(default_factory=dict)
    water_source: dict[str, str] = field(default_factory=dict)
    # The whole installation: the run in flight (None until a zone reports),
    # the last finished run, and the running total behind the water sensor.
    run_water_l: float | None = None
    run_water_source: str = ""
    last_run_water_l: float | None = None
    last_run_water_source: str = ""
    water_total_installation_l: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict."""
        return {
            "run_state": self.run_state,
            "active_zone_ids": list(self.active_zone_ids),
            "queued_zone_ids": list(self.queued_zone_ids),
            "current_run_started_at": (
                self.current_run_started_at.isoformat()
                if self.current_run_started_at
                else None
            ),
            "last_run_per_zone": {
                k: v.isoformat() for k, v in self.last_run_per_zone.items()
            },
            "next_run_per_zone": {
                k: (v.isoformat() if v else None)
                for k, v in self.next_run_per_zone.items()
            },
            "next_run_global": (
                self.next_run_global.isoformat() if self.next_run_global else None
            ),
            "last_error": self.last_error,
            "current_slot_id": self.current_slot_id,
            "manual_run": self.manual_run,
            "upcoming_phases": [list(g) for g in self.upcoming_phases],
            "phase_index": self.phase_index,
            "active_script": self.active_script,
            "active_script_started_at": (
                self.active_script_started_at.isoformat()
                if self.active_script_started_at
                else None
            ),
            "active_script_timeout_sec": self.active_script_timeout_sec,
            "zone_ends_at": {
                k: v.isoformat() for k, v in self.zone_ends_at.items()
            },
            "soak_until": self.soak_until.isoformat() if self.soak_until else None,
            "water_total_l": {k: round(v, 3) for k, v in self.water_total_l.items()},
            "water_last_run_l": {k: round(v, 3) for k, v in self.water_last_run_l.items()},
            "water_source": dict(self.water_source),
            "run_water_l": round(self.run_water_l, 3) if self.run_water_l is not None else None,
            "run_water_source": self.run_water_source,
            "last_run_water_l": (
                round(self.last_run_water_l, 3) if self.last_run_water_l is not None else None
            ),
            "last_run_water_source": self.last_run_water_source,
            "water_total_installation_l": round(self.water_total_installation_l, 3),
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> RunState:
        """Deserialize from store dict."""
        def _parse_dt(raw: str | None) -> datetime | None:
            if not raw:
                return None
            return datetime.fromisoformat(raw)

        last_run: dict[str, datetime] = {}
        for k, v in (data.get("last_run_per_zone") or {}).items():
            if v:
                last_run[k] = datetime.fromisoformat(v)

        next_zone: dict[str, datetime | None] = {}
        for k, v in (data.get("next_run_per_zone") or {}).items():
            next_zone[k] = _parse_dt(v) if v else None

        upcoming_phases: list[list[str]] = []
        raw_up = data.get("upcoming_phases")
        if isinstance(raw_up, list):
            for grp in raw_up:
                if isinstance(grp, list):
                    upcoming_phases.append([str(x) for x in grp])

        def _float_map(raw: Any) -> dict[str, float]:
            out: dict[str, float] = {}
            if isinstance(raw, dict):
                for k, v in raw.items():
                    try:
                        out[str(k)] = float(v)
                    except (TypeError, ValueError):
                        continue
            return out

        def _opt_float(raw: Any) -> float | None:
            try:
                return float(raw) if raw is not None else None
            except (TypeError, ValueError):
                return None

        raw_source = data.get("water_source")
        water_source = (
            {str(k): str(v) for k, v in raw_source.items()} if isinstance(raw_source, dict) else {}
        )

        return RunState(
            run_state=str(data.get("run_state", RUN_STATE_IDLE)),
            active_zone_ids=list(data.get("active_zone_ids", [])),
            queued_zone_ids=list(data.get("queued_zone_ids", [])),
            current_run_started_at=_parse_dt(data.get("current_run_started_at")),
            last_run_per_zone=last_run,
            next_run_per_zone=next_zone,
            next_run_global=_parse_dt(data.get("next_run_global")),
            last_error=data.get("last_error"),
            current_slot_id=data.get("current_slot_id"),
            manual_run=bool(data.get("manual_run", False)),
            upcoming_phases=upcoming_phases,
            active_script=data.get("active_script") or None,
            water_total_l=_float_map(data.get("water_total_l")),
            water_last_run_l=_float_map(data.get("water_last_run_l")),
            water_source=water_source,
            # A run cannot survive a restart, so what it used so far is dropped
            # with it; the last finished run and the totals stay.
            last_run_water_l=_opt_float(data.get("last_run_water_l")),
            last_run_water_source=str(data.get("last_run_water_source") or ""),
            water_total_installation_l=_opt_float(data.get("water_total_installation_l")) or 0.0,
            # zone_ends_at and soak_until are intentionally NOT restored. They only
            # mean something while this process is watering; after a restart no
            # zone is running any more and a recovered end time would render a
            # phantom countdown.
        )
