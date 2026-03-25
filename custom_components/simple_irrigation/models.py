"""Typed models for Simple Irrigation."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from .const import MODE_NORMAL, RUN_STATE_IDLE


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
        )


@dataclass
class ScheduleSlot:
    """Weekly time slot with ordered zone IDs."""

    slot_id: str
    weekday: int  # 0 = Monday .. 6 = Sunday (datetime.weekday())
    time_local: str  # "HH:MM"
    enabled: bool = True
    zone_ids_ordered: list[str] = field(default_factory=list)
    name: str = ""  # optional label for automations / recognition in the UI

    def to_dict(self) -> dict[str, Any]:
        """Serialize to JSON-compatible dict."""
        return {
            "slot_id": self.slot_id,
            "weekday": self.weekday,
            "time_local": self.time_local,
            "enabled": self.enabled,
            "zone_ids_ordered": list(self.zone_ids_ordered),
            "name": self.name,
        }

    @staticmethod
    def from_dict(data: dict[str, Any]) -> ScheduleSlot:
        """Deserialize from store dict."""
        return ScheduleSlot(
            slot_id=data["slot_id"],
            weekday=int(data["weekday"]),
            time_local=str(data["time_local"]),
            enabled=bool(data.get("enabled", True)),
            zone_ids_ordered=list(data.get("zone_ids_ordered", [])),
            name=str(data.get("name") or ""),
        )


@dataclass
class Installation:
    """Global installation settings."""

    installation_id: str
    name: str
    enabled: bool = True
    pre_start_switches: list[str] = field(default_factory=list)
    pre_start_delay_sec: int = 10
    mode: str = MODE_NORMAL
    pause_until: datetime | None = None
    max_parallel_zones: int = 2
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
            "mode": self.mode,
            "pause_until": self.pause_until.isoformat() if self.pause_until else None,
            "max_parallel_zones": self.max_parallel_zones,
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
            mode=str(data.get("mode", MODE_NORMAL)),
            pause_until=pause_until,
            max_parallel_zones=max(1, int(data.get("max_parallel_zones", 2))),
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
        )
