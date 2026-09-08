"""WebSocket + HTTP API for the custom panel (admin only)."""

from __future__ import annotations

import logging
import uuid
from dataclasses import replace
from datetime import datetime, timedelta
from typing import Any

import voluptuous as vol
from aiohttp import web

from homeassistant.components import websocket_api
from homeassistant.components.http import KEY_HASS, HomeAssistantView
from homeassistant.components.http.data_validator import RequestDataValidator
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.util import dt as dt_util

from .const import (
    MAX_REPETITIONS,
    MAX_SOAK_MIN,
    DOMAIN,
    GUARD_OPERATORS,
    MAX_SCRIPT_TIMEOUT_SEC,
    MODES,
    OUTPUT_ENTITY_DOMAINS,
    PANEL_API_REGISTERED_KEY,
    RUN_STATE_ERROR,
    RUN_STATE_IDLE,
    WEEK_PARITIES,
    WEEK_PARITY_EVERY,
)
from .grouping import compute_phases
from .models import Guard, Installation, ScheduleSlot, Zone, normalize_weekdays
from .cycle import CYCLE_KINDS, anchor_week_parity, generate_cycle_slots
from .runtime import ScheduleSlotRunError, ZoneManualRunError, ZoneStopError
from .scheduler import compute_next_runs, phases_for_slot
from .time_util import next_slot_fire_local_any, parse_hh_mm
from .validation import (
    parse_guard_list,
    parse_zone_switch_entities,
    validate_max_parallel,
    validate_mode,
    validate_pre_start_entities,
    validate_script_entity,
    validate_script_timeout,
    validate_zone_payload,
)

_LOGGER = logging.getLogger(__name__)

WS_TYPE_PANEL_STATE = "simple_irrigation/panel/state"

# One guard row. ``value`` stays loosely typed on purpose: coercion happens in
# parse_guard_list so failures surface as a translatable error code instead of
# an opaque voluptuous 400.
GUARD_SCHEMA = vol.Schema(
    {
        vol.Required("entity_id"): cv.string,
        vol.Required("operator"): vol.In(GUARD_OPERATORS),
        vol.Optional("value"): vol.Any(float, int, cv.string, None),
    }
)
GUARD_LIST_SCHEMA = [GUARD_SCHEMA]

# A slot's script timeout may be null: "inherit the installation's".
SLOT_SCRIPT_TIMEOUT_SCHEMA = vol.Any(
    None, vol.All(cv.positive_int, vol.Range(min=1, max=MAX_SCRIPT_TIMEOUT_SEC))
)


# Cycle & Soak fields as the panel sends them. Zero minutes is a valid soak
# ("none"), so these are plain ranges rather than positive_int.
SLOT_REPETITIONS_SCHEMA = vol.All(int, vol.Range(min=1, max=MAX_REPETITIONS))
SLOT_SOAK_SCHEMA = vol.All(int, vol.Range(min=0, max=MAX_SOAK_MIN))


def _copy_slot_cycle_soak(src: ScheduleSlot, dst: ScheduleSlot) -> None:
    """Carry Cycle & Soak over to a slot derived from ``src`` (split, cycle)."""
    dst.repetitions = src.repetitions
    dst.soak_between_phases_min = src.soak_between_phases_min
    dst.soak_between_repetitions_min = src.soak_between_repetitions_min


def _apply_slot_cycle_soak(slot: ScheduleSlot, data: dict[str, Any]) -> None:
    """Copy the payload's Cycle & Soak fields onto a slot; absent keys keep theirs."""
    if "repetitions" in data:
        slot.repetitions = int(data["repetitions"])
    if "soak_between_phases_min" in data:
        slot.soak_between_phases_min = int(data["soak_between_phases_min"])
    if "soak_between_repetitions_min" in data:
        slot.soak_between_repetitions_min = int(data["soak_between_repetitions_min"])


def _copy_slot_script_overrides(src: ScheduleSlot, dst: ScheduleSlot) -> None:
    """Carry script overrides over to a slot derived from ``src`` (split, cycle)."""
    dst.override_pre_start_script = src.override_pre_start_script
    dst.pre_start_script = src.pre_start_script
    dst.pre_start_script_timeout_sec = src.pre_start_script_timeout_sec
    dst.override_post_run_script = src.override_post_run_script
    dst.post_run_script = src.post_run_script
    dst.post_run_script_timeout_sec = src.post_run_script_timeout_sec


def _apply_slot_script_overrides(
    hass: HomeAssistant, slot: ScheduleSlot, data: dict[str, Any]
) -> str | None:
    """Copy the payload's script overrides onto a slot. Return an error key or None.

    Validation happens before anything is assigned, so a rejected payload never
    leaves a slot half-overridden.
    """
    pre = str(data.get("pre_start_script") or "").strip()
    post = str(data.get("post_run_script") or "").strip()
    pre_timeout = data.get("pre_start_script_timeout_sec")
    post_timeout = data.get("post_run_script_timeout_sec")

    if "pre_start_script" in data:
        err = validate_script_entity(hass, pre)
        if err:
            return err
    if "post_run_script" in data:
        err = validate_script_entity(hass, post)
        if err:
            return err
    if pre_timeout is not None:
        err = validate_script_timeout(pre_timeout)
        if err:
            return err
    if post_timeout is not None:
        err = validate_script_timeout(post_timeout)
        if err:
            return err

    if "override_pre_start_script" in data:
        slot.override_pre_start_script = bool(data["override_pre_start_script"])
    if "pre_start_script" in data:
        slot.pre_start_script = pre
    if "pre_start_script_timeout_sec" in data:
        slot.pre_start_script_timeout_sec = (
            int(pre_timeout) if pre_timeout is not None else None
        )
    if "override_post_run_script" in data:
        slot.override_post_run_script = bool(data["override_post_run_script"])
    if "post_run_script" in data:
        slot.post_run_script = post
    if "post_run_script_timeout_sec" in data:
        slot.post_run_script_timeout_sec = (
            int(post_timeout) if post_timeout is not None else None
        )
    return None


def _get_coordinator(hass: HomeAssistant, entry_id: str | None):
    """Return coordinator for this integration entry or None."""
    if not entry_id:
        return None
    domain_data = hass.data.get(DOMAIN, {}).get(entry_id)
    if not domain_data:
        return None
    return domain_data["coordinator"]


def _get_entry(hass: HomeAssistant, entry_id: str) -> ConfigEntry:
    """Return config entry for this domain or raise."""
    entry = hass.config_entries.async_get_entry(entry_id)
    if entry is None or entry.domain != DOMAIN:
        raise web.HTTPNotFound()
    return entry


def _get_runtime(hass: HomeAssistant, entry_id: str):
    """Return runtime for entry or None."""
    domain_data = hass.data.get(DOMAIN, {}).get(entry_id)
    if not domain_data:
        return None
    return domain_data.get("runtime")


def _schedule_next_summary(hass: HomeAssistant, inst: Installation) -> dict[str, Any]:
    """Next calendar firing: ISO time + contributing slots with zone names."""
    if not inst.enabled:
        return {"fire_at": None, "slots": []}

    tz = dt_util.get_time_zone(hass.config.time_zone)
    if tz is None:
        return {"fire_at": None, "slots": []}

    now = dt_util.now()
    pause_until = inst.pause_until
    after = now
    if pause_until and now < pause_until:
        after = pause_until

    global_next, _zone_next = compute_next_runs(inst, after, tz)
    if global_next is None:
        return {"fire_at": None, "slots": []}

    matching: list[ScheduleSlot] = []
    for slot in inst.schedule_slots:
        if not slot.enabled:
            continue
        nxt = next_slot_fire_local_any(
            after, slot.weekdays, slot.time_local, tz, slot.week_parity
        )
        if nxt is None:
            continue
        if abs((nxt - global_next).total_seconds()) < 1:
            matching.append(slot)

    # Weekday the schedule actually fires next (all matching slots share global_next).
    fire_weekday = global_next.weekday()
    zones = inst.zones
    out_slots: list[dict[str, Any]] = []
    for s in matching:
        names = [zones[zi].name if zi in zones else zi for zi in s.zone_ids_ordered]
        out_slots.append(
            {
                "slot_id": s.slot_id,
                "weekday": fire_weekday,
                "weekdays": list(s.weekdays),
                "time_local": s.time_local,
                "zone_names": names,
                "name": s.name or "",
                "week_parity": s.week_parity,
            }
        )

    return {"fire_at": global_next.isoformat(), "slots": out_slots}


def _panel_entity_ids(hass: HomeAssistant, entry_id: str) -> dict[str, str | None]:
    """Resolve stable entity_ids for panel subscriptions (e.g. run-state refresh)."""
    from homeassistant.helpers import entity_registry as er

    reg = er.async_get(hass)
    out: dict[str, str | None] = {}
    for key, suffix in (
        ("running", "binary_running"),
        ("error", "binary_error"),
    ):
        uid = f"{entry_id}_{suffix}"
        out[key] = reg.async_get_entity_id("binary_sensor", DOMAIN, uid)
    return out


def _phase_hints(inst: Installation) -> dict[str, list[list[str]]]:
    """Slot id -> list of phase groups (zone ids)."""
    out: dict[str, list[list[str]]] = {}
    for slot in inst.schedule_slots:
        phases = compute_phases(
            slot.zone_ids_ordered,
            inst.zones,
            inst.max_parallel_zones,
            skip_disabled=True,
        )
        out[slot.slot_id] = [list(g) for g in phases]
    return out


def _sync_config_entry_from_installation(
    hass: HomeAssistant, entry: ConfigEntry, inst: Installation
) -> None:
    """Keep config entry data in sync with installation fields stored in entry.data."""
    hass.config_entries.async_update_entry(
        entry,
        data={
            **entry.data,
            "name": inst.name,
            "pre_start_switches": list(inst.pre_start_switches),
            "pre_start_delay_sec": inst.pre_start_delay_sec,
            "default_mode": inst.mode,
            "max_parallel_zones": inst.max_parallel_zones,
        },
        title=inst.name,
    )


def _require_admin(request) -> None:
    from homeassistant.components.http.const import KEY_HASS_USER
    from homeassistant.exceptions import Unauthorized

    user = request.get(KEY_HASS_USER)
    if user is None or not user.is_admin:
        raise Unauthorized("Admin required")


@callback
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_PANEL_STATE,
        vol.Required("entry_id"): cv.string,
    }
)
@websocket_api.async_response
async def ws_panel_state(
    hass: HomeAssistant,
    connection: Any,
    msg: dict[str, Any],
) -> None:
    """Return installation + run_state + phase hints for panel."""
    user = connection.user
    if user is None or not user.is_admin:
        connection.send_error(msg["id"], "unauthorized", "Admin required")
        return
    entry_id = msg["entry_id"]
    coord = _get_coordinator(hass, entry_id)
    if coord is None:
        connection.send_error(msg["id"], "not_found", "Unknown entry")
        return
    inst = coord.installation
    connection.send_result(
        msg["id"],
        {
            "installation": inst.to_dict(),
            "run_state": coord.run_state.to_dict(),
            "phase_hints": _phase_hints(inst),
            "schedule_next": _schedule_next_summary(hass, inst),
            "output_entity_domains": sorted(OUTPUT_ENTITY_DOMAINS),
            "panel_entity_ids": _panel_entity_ids(hass, entry_id),
        },
    )


class SimpleIrrigationPanelGlobalView(HomeAssistantView):
    """POST: update global installation settings."""

    url = "/api/simple_irrigation/panel/global"
    name = "api:simple_irrigation:panel_global"

    @RequestDataValidator(
        vol.Schema(
            {
                vol.Required("entry_id"): cv.string,
                vol.Optional("name"): cv.string,
                vol.Optional("pre_start_switches"): [cv.string],
                vol.Optional("mode"): vol.In(MODES),
                vol.Optional("max_parallel_zones"): vol.All(int, vol.Range(min=1, max=16)),
                vol.Optional("pre_start_delay_sec"): vol.All(cv.positive_int, vol.Range(max=3600)),
                vol.Optional("pre_start_script"): vol.Any(cv.string, None),
                vol.Optional("pre_start_script_timeout_sec"): vol.All(
                    cv.positive_int, vol.Range(max=MAX_SCRIPT_TIMEOUT_SEC)
                ),
                vol.Optional("post_run_script"): vol.Any(cv.string, None),
                vol.Optional("post_run_script_timeout_sec"): vol.All(
                    cv.positive_int, vol.Range(max=MAX_SCRIPT_TIMEOUT_SEC)
                ),
                vol.Optional("enabled"): cv.boolean,
                vol.Optional("is_default"): cv.boolean,
                vol.Optional("pause_until"): vol.Any(cv.string, None),
                vol.Optional("guards"): GUARD_LIST_SCHEMA,
            }
        )
    )
    async def post(self, request, data: dict[str, Any]) -> web.Response:
        """Apply global updates."""
        _require_admin(request)
        hass = request.app[KEY_HASS]
        entry = _get_entry(hass, data["entry_id"])
        coord = _get_coordinator(hass, entry.entry_id)
        if coord is None:
            return self.json({"success": False, "error": "not_found"}, status_code=404)
        inst = coord.installation

        if "name" in data and data["name"]:
            inst.name = str(data["name"]).strip() or inst.name
        if "pre_start_switches" in data:
            err = validate_pre_start_entities(hass, data["pre_start_switches"])
            if err:
                return self.json({"success": False, "error": err}, status_code=400)
            inst.pre_start_switches = list(data["pre_start_switches"])
        if "mode" in data:
            if validate_mode(data["mode"]):
                return self.json({"success": False, "error": "invalid_mode"}, status_code=400)
            inst.mode = data["mode"]
        if "max_parallel_zones" in data:
            if validate_max_parallel(data["max_parallel_zones"]):
                return self.json({"success": False, "error": "invalid_max_parallel"}, status_code=400)
            inst.max_parallel_zones = int(data["max_parallel_zones"])
        if "pre_start_delay_sec" in data:
            inst.pre_start_delay_sec = int(data["pre_start_delay_sec"])
        if "pre_start_script" in data:
            script = str(data["pre_start_script"] or "").strip()
            err = validate_script_entity(hass, script)
            if err:
                return self.json({"success": False, "error": err}, status_code=400)
            inst.pre_start_script = script
        if "pre_start_script_timeout_sec" in data:
            err = validate_script_timeout(data["pre_start_script_timeout_sec"])
            if err:
                return self.json({"success": False, "error": err}, status_code=400)
            inst.pre_start_script_timeout_sec = int(data["pre_start_script_timeout_sec"])
        if "post_run_script" in data:
            script = str(data["post_run_script"] or "").strip()
            err = validate_script_entity(hass, script)
            if err:
                return self.json({"success": False, "error": err}, status_code=400)
            inst.post_run_script = script
        if "post_run_script_timeout_sec" in data:
            err = validate_script_timeout(data["post_run_script_timeout_sec"])
            if err:
                return self.json({"success": False, "error": err}, status_code=400)
            inst.post_run_script_timeout_sec = int(data["post_run_script_timeout_sec"])
        if "enabled" in data:
            inst.enabled = bool(data["enabled"])
        if "is_default" in data:
            inst.is_default = bool(data["is_default"])
        if "guards" in data:
            guards, guard_err = parse_guard_list(hass, data["guards"])
            if guard_err:
                return self.json({"success": False, "error": guard_err}, status_code=400)
            inst.guards = guards
        if "pause_until" in data:
            raw = data["pause_until"]
            if raw in (None, ""):
                inst.pause_until = None
            else:
                try:
                    inst.pause_until = datetime.fromisoformat(str(raw))
                except ValueError:
                    return self.json({"success": False, "error": "invalid_pause_until"}, status_code=400)

        await coord.async_update_installation(inst)
        if inst.is_default:
            for other_entry in hass.config_entries.async_entries(DOMAIN):
                if other_entry.entry_id == entry.entry_id:
                    continue
                other_coord = _get_coordinator(hass, other_entry.entry_id)
                if other_coord is None:
                    continue
                other_inst = other_coord.installation
                if other_inst.is_default:
                    await other_coord.async_update_installation(
                        replace(other_inst, is_default=False)
                    )
        _sync_config_entry_from_installation(hass, entry, inst)
        return self.json({"success": True})


class SimpleIrrigationPanelZoneView(HomeAssistantView):
    """POST: add / update / delete zone."""

    url = "/api/simple_irrigation/panel/zone"
    name = "api:simple_irrigation:panel_zone"

    @RequestDataValidator(
        vol.Schema(
            {
                vol.Required("entry_id"): cv.string,
                vol.Required("action"): vol.In(("add", "update", "delete")),
                vol.Optional("zone_id"): cv.string,
                vol.Optional("zone"): vol.Schema(
                    {
                        vol.Optional("name"): cv.string,
                        vol.Optional("switch_entity_id"): cv.string,
                        vol.Optional("switch_entity_ids"): [cv.string],
                        vol.Optional("enabled"): cv.boolean,
                        vol.Optional("duration_eco_min"): vol.All(int, vol.Range(min=0, max=240)),
                        vol.Optional("duration_normal_min"): vol.All(int, vol.Range(min=0, max=240)),
                        vol.Optional("duration_extra_min"): vol.All(int, vol.Range(min=0, max=240)),
                        vol.Optional("exclusive"): cv.boolean,
                        vol.Optional("start_service"): vol.Any(cv.string, None),
                        vol.Optional("duration_field"): vol.Any(cv.string, None),
                        vol.Optional("duration_unit"): vol.Any(cv.string, None),
                        vol.Optional("start_entity_id"): vol.Any(cv.string, None),
                    }
                ),
            }
        )
    )
    async def post(self, request, data: dict[str, Any]) -> web.Response:
        """Zone CRUD."""
        _require_admin(request)
        hass = request.app[KEY_HASS]
        entry = _get_entry(hass, data["entry_id"])
        coord = _get_coordinator(hass, entry.entry_id)
        if coord is None:
            return self.json({"success": False, "error": "not_found"}, status_code=404)
        inst = coord.installation
        action = data["action"]

        if action == "add":
            zone_data = data.get("zone") or {}
            payload = {
                "name": zone_data.get("name", ""),
                "switch_entity_ids": zone_data.get("switch_entity_ids"),
                "switch_entity_id": zone_data.get("switch_entity_id", ""),
                "enabled": zone_data.get("enabled", True),
                "duration_eco_min": zone_data.get("duration_eco_min", 10),
                "duration_normal_min": zone_data.get("duration_normal_min", 15),
                "duration_extra_min": zone_data.get("duration_extra_min", 20),
                "exclusive": zone_data.get("exclusive", False),
                "start_service": zone_data.get("start_service", ""),
                "duration_field": zone_data.get("duration_field", ""),
                "duration_unit": zone_data.get("duration_unit", ""),
                "start_entity_id": zone_data.get("start_entity_id", ""),
            }
            err = validate_zone_payload(hass, payload)
            if err:
                return self.json({"success": False, "error": err}, status_code=400)
            entity_ids = parse_zone_switch_entities(payload)
            zid = str(uuid.uuid4())
            inst.zones[zid] = Zone(
                zone_id=zid,
                name=payload["name"].strip(),
                switch_entity_ids=entity_ids,
                enabled=bool(payload["enabled"]),
                duration_eco_min=int(payload["duration_eco_min"]),
                duration_normal_min=int(payload["duration_normal_min"]),
                duration_extra_min=int(payload["duration_extra_min"]),
                exclusive=bool(payload["exclusive"]),
                start_service=str(payload["start_service"] or "").strip(),
                duration_field=str(payload["duration_field"] or "").strip(),
                duration_unit=str(payload["duration_unit"] or "").strip(),
                start_entity_id=str(payload["start_entity_id"] or "").strip(),
            )
            await coord.async_update_installation(inst)
            return self.json({"success": True, "zone_id": zid})

        zid = data.get("zone_id")
        if not zid or zid not in inst.zones:
            return self.json({"success": False, "error": "unknown_zone"}, status_code=400)

        if action == "delete":
            inst.zones.pop(zid, None)
            for slot in inst.schedule_slots:
                slot.zone_ids_ordered = [x for x in slot.zone_ids_ordered if x != zid]
            await coord.async_update_installation(inst)
            return self.json({"success": True})

        # update
        zone = inst.zones[zid]
        zone_data = data.get("zone") or {}
        if "switch_entity_ids" in zone_data:
            ent_switch_entity_ids = zone_data["switch_entity_ids"]
            ent_switch_entity_id = zone_data.get("switch_entity_id", "")
        elif "switch_entity_id" in zone_data:
            ent_switch_entity_ids = []
            ent_switch_entity_id = zone_data["switch_entity_id"]
        else:
            ent_switch_entity_ids = list(zone.switch_entity_ids)
            ent_switch_entity_id = ""
        merged = {
            "name": zone_data.get("name", zone.name),
            "switch_entity_ids": ent_switch_entity_ids,
            "switch_entity_id": ent_switch_entity_id,
            "enabled": zone_data.get("enabled", zone.enabled),
            "duration_eco_min": zone_data.get("duration_eco_min", zone.duration_eco_min),
            "duration_normal_min": zone_data.get(
                "duration_normal_min", zone.duration_normal_min
            ),
            "duration_extra_min": zone_data.get("duration_extra_min", zone.duration_extra_min),
            "exclusive": zone_data.get("exclusive", zone.exclusive),
            "start_service": zone_data.get("start_service", zone.start_service),
            "duration_field": zone_data.get("duration_field", zone.duration_field),
            "duration_unit": zone_data.get("duration_unit", zone.duration_unit),
            "start_entity_id": zone_data.get("start_entity_id", zone.start_entity_id),
        }
        err = validate_zone_payload(hass, merged)
        if err:
            return self.json({"success": False, "error": err}, status_code=400)
        zone.name = merged["name"].strip()
        zone.switch_entity_ids = parse_zone_switch_entities(merged)
        zone.enabled = bool(merged["enabled"])
        zone.duration_eco_min = int(merged["duration_eco_min"])
        zone.duration_normal_min = int(merged["duration_normal_min"])
        zone.duration_extra_min = int(merged["duration_extra_min"])
        zone.exclusive = bool(merged["exclusive"])
        zone.start_service = str(merged["start_service"] or "").strip()
        zone.duration_field = str(merged["duration_field"] or "").strip()
        zone.duration_unit = str(merged["duration_unit"] or "").strip()
        zone.start_entity_id = str(merged["start_entity_id"] or "").strip()
        await coord.async_update_installation(inst)
        return self.json({"success": True})


class SimpleIrrigationPanelSlotView(HomeAssistantView):
    """POST: schedule slot operations."""

    url = "/api/simple_irrigation/panel/slot"
    name = "api:simple_irrigation:panel_slot"

    @RequestDataValidator(
        vol.Schema(
            {
                vol.Required("entry_id"): cv.string,
                vol.Required("action"): vol.In(
                    (
                        "add",
                        "update",
                        "delete",
                        "split",
                        "add_zone",
                        "reorder_zone",
                        "cycle_upsert",
                        "cycle_delete",
                    )
                ),
                vol.Optional("slot_id"): cv.string,
                vol.Optional("weekday"): vol.All(int, vol.Range(min=0, max=6)),
                vol.Optional("weekdays"): [vol.All(int, vol.Range(min=0, max=6))],
                vol.Optional("time_local"): cv.string,
                vol.Optional("enabled"): cv.boolean,
                vol.Optional("zone_id"): cv.string,
                vol.Optional("direction"): vol.In(("up", "down")),
                vol.Optional("zone_ids_ordered"): [cv.string],
                vol.Optional("name"): cv.string,
                vol.Optional("week_parity"): vol.In(WEEK_PARITIES),
                vol.Optional("guards"): GUARD_LIST_SCHEMA,
                vol.Optional("ignore_global_guards"): cv.boolean,
                vol.Optional("override_pre_start_script"): cv.boolean,
                vol.Optional("pre_start_script"): vol.Any(cv.string, None),
                vol.Optional("pre_start_script_timeout_sec"): SLOT_SCRIPT_TIMEOUT_SCHEMA,
                vol.Optional("override_post_run_script"): cv.boolean,
                vol.Optional("post_run_script"): vol.Any(cv.string, None),
                vol.Optional("post_run_script_timeout_sec"): SLOT_SCRIPT_TIMEOUT_SCHEMA,
                vol.Optional("repetitions"): SLOT_REPETITIONS_SCHEMA,
                vol.Optional("soak_between_phases_min"): SLOT_SOAK_SCHEMA,
                vol.Optional("soak_between_repetitions_min"): SLOT_SOAK_SCHEMA,
                vol.Optional("cycle_id"): vol.Any(cv.string, None),
                vol.Optional("cycle_kind"): vol.In(CYCLE_KINDS),
                vol.Optional("cycle_meta"): vol.Schema(
                    {
                        vol.Optional("label"): cv.string,
                        vol.Optional("n"): vol.All(int, vol.Range(min=1, max=14)),
                        vol.Optional("anchor_weekday"): vol.All(int, vol.Range(min=0, max=6)),
                        vol.Optional("times"): [cv.string],
                        vol.Optional("week_days"): [vol.All(int, vol.Range(min=0, max=6))],
                    }
                ),
            }
        )
    )
    async def post(self, request, data: dict[str, Any]) -> web.Response:
        """Slot CRUD and zone order in slot."""
        _require_admin(request)
        hass = request.app[KEY_HASS]
        _get_entry(hass, data["entry_id"])
        coord = _get_coordinator(hass, data["entry_id"])
        if coord is None:
            return self.json({"success": False, "error": "not_found"}, status_code=404)
        inst = coord.installation
        action = data["action"]

        def _find_slot(sid: str) -> ScheduleSlot | None:
            return next((s for s in inst.schedule_slots if s.slot_id == sid), None)

        def _resolve_weekdays(fallback: list[int] | None = None) -> list[int] | None:
            """weekdays from payload (list preferred, legacy scalar accepted)."""
            if "weekdays" in data:
                return normalize_weekdays(data["weekdays"])
            if "weekday" in data:
                return normalize_weekdays([data["weekday"]])
            return fallback

        if action == "add":
            t = data.get("time_local", "06:00")
            if parse_hh_mm(str(t).strip()) is None:
                return self.json({"success": False, "error": "invalid_time"}, status_code=400)
            weekdays = _resolve_weekdays([0])
            if not weekdays:
                return self.json({"success": False, "error": "invalid_weekdays"}, status_code=400)
            guards: list[Guard] = []
            if "guards" in data:
                guards, guard_err = parse_guard_list(hass, data["guards"])
                if guard_err:
                    return self.json({"success": False, "error": guard_err}, status_code=400)
            slot = ScheduleSlot(
                slot_id=str(uuid.uuid4()),
                weekdays=weekdays,
                time_local=str(t).strip(),
                enabled=bool(data.get("enabled", True)),
                name=str(data.get("name") or "").strip(),
                week_parity=str(data.get("week_parity") or WEEK_PARITY_EVERY),
                guards=guards,
                ignore_global_guards=bool(data.get("ignore_global_guards", False)),
            )
            script_err = _apply_slot_script_overrides(hass, slot, data)
            if script_err:
                return self.json({"success": False, "error": script_err}, status_code=400)
            _apply_slot_cycle_soak(slot, data)
            inst.schedule_slots.append(slot)
            await coord.async_update_installation(inst)
            return self.json({"success": True, "slot_id": slot.slot_id})

        if action == "cycle_upsert":
            kind = str(data.get("cycle_kind") or "custom")
            meta = dict(data.get("cycle_meta") or {})
            zone_ids = list(data.get("zone_ids_ordered", []))
            seen_z: set[str] = set()
            for zid in zone_ids:
                if zid not in inst.zones:
                    return self.json({"success": False, "error": "unknown_zone"}, status_code=400)
                if zid in seen_z:
                    return self.json({"success": False, "error": "duplicate_zone"}, status_code=400)
                seen_z.add(zid)
            for tstr in meta.get("times") or []:
                if parse_hh_mm(str(tstr).strip()) is None:
                    return self.json({"success": False, "error": "invalid_time"}, status_code=400)
            enabled = bool(data.get("enabled", True))
            incoming_id = str(data.get("cycle_id") or "")  # set when editing an existing cycle
            anchor = int(meta.get("anchor_weekday", 0))
            p0 = anchor_week_parity(anchor, dt_util.now().date())
            specs = generate_cycle_slots(kind, meta, anchor_parity=p0)
            if not specs:
                return self.json({"success": False, "error": "invalid_cycle"}, status_code=400)
            label = str(meta.get("label") or "").strip()

            # A "cycle" only exists when the cadence genuinely needs >=2 slots
            # (e.g. every 2/3 days via odd/even parity). Cadences expressible as a
            # single slot (daily, weekly, biweekly, n-per-week, custom) are stored
            # as a plain slot with no cycle_id — so the UI treats them uniformly.
            is_cycle = len(specs) >= 2
            new_cid = (incoming_id or uuid.uuid4().hex) if is_cycle else None

            existing = (
                [s for s in inst.schedule_slots if incoming_id and s.cycle_id == incoming_id]
                if incoming_id
                else []
            )
            reused_ids = [s.slot_id for s in existing]

            # Guards: take them from the payload, else keep what the edited cycle
            # already had. All members of a cycle share the same conditions.
            if "guards" in data:
                cycle_guards, guard_err = parse_guard_list(hass, data["guards"])
                if guard_err:
                    return self.json({"success": False, "error": guard_err}, status_code=400)
            else:
                cycle_guards = list(existing[0].guards) if existing else []
            if "ignore_global_guards" in data:
                cycle_ignore_global = bool(data["ignore_global_guards"])
            else:
                cycle_ignore_global = existing[0].ignore_global_guards if existing else False

            new_members = [
                ScheduleSlot(
                    slot_id=(reused_ids[i] if i < len(reused_ids) else uuid.uuid4().hex),
                    weekdays=list(spec["weekdays"]),
                    time_local=spec["time_local"],
                    enabled=enabled,
                    zone_ids_ordered=list(zone_ids),
                    name=label,
                    week_parity=spec["week_parity"],
                    guards=list(cycle_guards),
                    ignore_global_guards=cycle_ignore_global,
                    cycle_id=new_cid,
                    cycle_kind=kind if is_cycle else "custom",
                    cycle_meta=dict(meta) if is_cycle else None,
                )
                for i, spec in enumerate(specs)
            ]
            # Script overrides, like the guards above: the payload wins, otherwise
            # the edited cycle keeps what it had. Applied before the members are
            # spliced in, so a rejected script leaves the schedule untouched.
            for member in new_members:
                if existing:
                    _copy_slot_script_overrides(existing[0], member)
                    _copy_slot_cycle_soak(existing[0], member)
                script_err = _apply_slot_script_overrides(hass, member, data)
                if script_err:
                    return self.json({"success": False, "error": script_err}, status_code=400)
                _apply_slot_cycle_soak(member, data)
            # Rebuild the slot list, replacing the previous group's members (matched
            # by the incoming id) in place; append at the end when brand new.
            result: list[ScheduleSlot] = []
            inserted = False
            for s in inst.schedule_slots:
                if incoming_id and s.cycle_id == incoming_id:
                    if not inserted:
                        result.extend(new_members)
                        inserted = True
                    continue
                result.append(s)
            if not inserted:
                result.extend(new_members)
            inst.schedule_slots = result
            await coord.async_update_installation(inst)
            return self.json(
                {
                    "success": True,
                    "cycle_id": new_cid,
                    "slots": [s.slot_id for s in new_members],
                }
            )

        if action == "cycle_delete":
            rid = data.get("cycle_id")
            if not rid:
                return self.json({"success": False, "error": "missing_cycle_id"}, status_code=400)
            remaining = [s for s in inst.schedule_slots if s.cycle_id != rid]
            if len(remaining) == len(inst.schedule_slots):
                return self.json({"success": False, "error": "unknown_cycle"}, status_code=400)
            inst.schedule_slots = remaining
            await coord.async_update_installation(inst)
            return self.json({"success": True})

        sid = data.get("slot_id")
        if not sid:
            return self.json({"success": False, "error": "missing_slot_id"}, status_code=400)
        slot = _find_slot(sid)
        if slot is None:
            return self.json({"success": False, "error": "unknown_slot"}, status_code=400)

        if action == "delete":
            inst.schedule_slots = [s for s in inst.schedule_slots if s.slot_id != sid]
            await coord.async_update_installation(inst)
            return self.json({"success": True})

        if action == "split":
            if len(slot.weekdays) <= 1:
                return self.json({"success": False, "error": "nothing_to_split"}, status_code=400)
            idx = inst.schedule_slots.index(slot)
            new_slots = [
                ScheduleSlot(
                    slot_id=str(uuid.uuid4()),
                    weekdays=[wd],
                    time_local=slot.time_local,
                    enabled=slot.enabled,
                    zone_ids_ordered=list(slot.zone_ids_ordered),
                    name=slot.name,
                    week_parity=slot.week_parity,
                    guards=list(slot.guards),
                    ignore_global_guards=slot.ignore_global_guards,
                )
                for wd in slot.weekdays
            ]
            for new_slot in new_slots:
                _copy_slot_script_overrides(slot, new_slot)
                _copy_slot_cycle_soak(slot, new_slot)
            inst.schedule_slots[idx : idx + 1] = new_slots
            await coord.async_update_installation(inst)
            return self.json(
                {"success": True, "slot_ids": [s.slot_id for s in new_slots]}
            )

        if action == "update":
            weekdays = _resolve_weekdays()
            if weekdays is not None:
                if not weekdays:
                    return self.json(
                        {"success": False, "error": "invalid_weekdays"}, status_code=400
                    )
                slot.weekdays = weekdays
            if "time_local" in data:
                tl = str(data["time_local"]).strip()
                if parse_hh_mm(tl) is None:
                    return self.json({"success": False, "error": "invalid_time"}, status_code=400)
                slot.time_local = tl
            if "enabled" in data:
                slot.enabled = bool(data["enabled"])
            if "zone_ids_ordered" in data:
                new_order = list(data["zone_ids_ordered"])
                seen: set[str] = set()
                for zid in new_order:
                    if zid not in inst.zones:
                        return self.json({"success": False, "error": "unknown_zone"}, status_code=400)
                    if zid in seen:
                        return self.json({"success": False, "error": "duplicate_zone"}, status_code=400)
                    seen.add(zid)
                slot.zone_ids_ordered = new_order
            if "name" in data:
                slot.name = str(data["name"] or "").strip()
            if "week_parity" in data:
                slot.week_parity = str(data["week_parity"])
            if "guards" in data:
                slot_guards, guard_err = parse_guard_list(hass, data["guards"])
                if guard_err:
                    return self.json({"success": False, "error": guard_err}, status_code=400)
                slot.guards = slot_guards
            if "ignore_global_guards" in data:
                slot.ignore_global_guards = bool(data["ignore_global_guards"])
            script_err = _apply_slot_script_overrides(hass, slot, data)
            if script_err:
                return self.json({"success": False, "error": script_err}, status_code=400)
            _apply_slot_cycle_soak(slot, data)
            if "cycle_id" in data:
                slot.cycle_id = str(data["cycle_id"]) if data["cycle_id"] else None
            if "cycle_kind" in data:
                slot.cycle_kind = str(data["cycle_kind"])
            if "cycle_meta" in data:
                meta_raw = data["cycle_meta"]
                slot.cycle_meta = dict(meta_raw) if isinstance(meta_raw, dict) else None
            await coord.async_update_installation(inst)
            return self.json({"success": True})

        if action == "add_zone":
            zid = data.get("zone_id")
            if not zid or zid not in inst.zones:
                return self.json({"success": False, "error": "unknown_zone"}, status_code=400)
            if zid in slot.zone_ids_ordered:
                return self.json({"success": False, "error": "duplicate_zone"}, status_code=400)
            slot.zone_ids_ordered.append(zid)
            await coord.async_update_installation(inst)
            return self.json({"success": True})

        if action == "reorder_zone":
            zid = data.get("zone_id")
            direction = data.get("direction")
            if not zid or zid not in slot.zone_ids_ordered or direction not in ("up", "down"):
                return self.json({"success": False, "error": "invalid_reorder"}, status_code=400)
            idx = slot.zone_ids_ordered.index(zid)
            if direction == "up" and idx > 0:
                slot.zone_ids_ordered[idx - 1], slot.zone_ids_ordered[idx] = (
                    slot.zone_ids_ordered[idx],
                    slot.zone_ids_ordered[idx - 1],
                )
            elif direction == "down" and idx < len(slot.zone_ids_ordered) - 1:
                slot.zone_ids_ordered[idx + 1], slot.zone_ids_ordered[idx] = (
                    slot.zone_ids_ordered[idx],
                    slot.zone_ids_ordered[idx + 1],
                )
            await coord.async_update_installation(inst)
            return self.json({"success": True})

        return self.json({"success": False, "error": "unsupported"}, status_code=400)


class SimpleIrrigationPanelRunSlotView(HomeAssistantView):
    """POST: run one schedule slot immediately (manual run)."""

    url = "/api/simple_irrigation/panel/run_slot"
    name = "api:simple_irrigation:panel_run_slot"

    @RequestDataValidator(
        vol.Schema(
            {
                vol.Required("entry_id"): cv.string,
                vol.Required("slot_id"): cv.string,
            }
        )
    )
    async def post(self, request, data: dict[str, Any]) -> web.Response:
        """Start runtime for a single slot."""
        _require_admin(request)
        hass = request.app[KEY_HASS]
        _get_entry(hass, data["entry_id"])
        coord = _get_coordinator(hass, data["entry_id"])
        runtime = _get_runtime(hass, data["entry_id"])
        if coord is None or runtime is None:
            return self.json({"success": False, "error": "not_found"}, status_code=404)
        sid = data["slot_id"]
        try:
            await runtime.async_run_schedule_slot(sid)
        except ScheduleSlotRunError as err:
            status = 409 if err.code == "busy" else 400
            return self.json({"success": False, "error": err.code}, status_code=status)
        return self.json({"success": True})


class SimpleIrrigationPanelRunZoneView(HomeAssistantView):
    """POST: run one zone immediately (manual run, full pre-start pipeline)."""

    url = "/api/simple_irrigation/panel/run_zone"
    name = "api:simple_irrigation:panel_run_zone"

    @RequestDataValidator(
        vol.Schema(
            {
                vol.Required("entry_id"): cv.string,
                vol.Required("zone_id"): cv.string,
            }
        )
    )
    async def post(self, request, data: dict[str, Any]) -> web.Response:
        """Start runtime for a single zone."""
        _require_admin(request)
        hass = request.app[KEY_HASS]
        _get_entry(hass, data["entry_id"])
        coord = _get_coordinator(hass, data["entry_id"])
        runtime = _get_runtime(hass, data["entry_id"])
        if coord is None or runtime is None:
            return self.json({"success": False, "error": "not_found"}, status_code=404)
        zid = data["zone_id"]
        try:
            await runtime.async_run_zone(zid, duration_min=None)
        except ZoneManualRunError as err:
            status = 409 if err.code == "busy" else 400
            return self.json({"success": False, "error": err.code}, status_code=status)
        return self.json({"success": True})


class SimpleIrrigationPanelControlView(HomeAssistantView):
    """POST: stop run, stop one zone, skip phase, clear stale error message."""

    url = "/api/simple_irrigation/panel/control"
    name = "api:simple_irrigation:panel_control"

    @RequestDataValidator(
        vol.Schema(
            {
                vol.Required("entry_id"): cv.string,
                vol.Required("action"): vol.In(
                    ("stop", "stop_zone", "skip_phase", "clear_error")
                ),
                vol.Optional("zone_id"): cv.string,
            }
        )
    )
    async def post(self, request, data: dict[str, Any]) -> web.Response:
        """Runtime controls for the panel."""
        _require_admin(request)
        hass = request.app[KEY_HASS]
        _get_entry(hass, data["entry_id"])
        coord = _get_coordinator(hass, data["entry_id"])
        runtime = _get_runtime(hass, data["entry_id"])
        if coord is None:
            return self.json({"success": False, "error": "not_found"}, status_code=404)
        action = data["action"]

        if action == "clear_error":
            rs = coord.run_state
            rs.last_error = None
            if rs.run_state == RUN_STATE_ERROR:
                rs.run_state = RUN_STATE_IDLE
            await coord.async_update_run_state(rs)
            return self.json({"success": True})

        if runtime is None:
            return self.json({"success": False, "error": "not_found"}, status_code=404)

        if action == "stop":
            await runtime.async_stop_all()
            return self.json({"success": True})

        if action == "stop_zone":
            zid = data.get("zone_id")
            if not zid:
                return self.json({"success": False, "error": "missing_zone_id"}, status_code=400)
            try:
                await runtime.async_stop_zone(zid)
            except ZoneStopError as err:
                status = 409 if err.code == "zone_not_running" else 400
                return self.json({"success": False, "error": err.code}, status_code=status)
            return self.json({"success": True})

        # skip_phase
        ok = await runtime.async_skip_to_next_phase()
        if not ok:
            return self.json({"success": False, "error": "not_running"}, status_code=409)
        return self.json({"success": True})


class SimpleIrrigationPanelSkipTodayView(HomeAssistantView):
    """POST: pause scheduled runs until start of next local day."""

    url = "/api/simple_irrigation/panel/skip_today"
    name = "api:simple_irrigation:panel_skip_today"

    @RequestDataValidator(
        vol.Schema(
            {
                vol.Required("entry_id"): cv.string,
            }
        )
    )
    async def post(self, request, data: dict[str, Any]) -> web.Response:
        """Set pause_until to midnight at start of next day in HA local TZ."""
        _require_admin(request)
        hass = request.app[KEY_HASS]
        _get_entry(hass, data["entry_id"])
        coord = _get_coordinator(hass, data["entry_id"])
        if coord is None:
            return self.json({"success": False, "error": "not_found"}, status_code=404)
        inst = coord.installation
        tz = dt_util.get_time_zone(hass.config.time_zone)
        if tz is None:
            return self.json({"success": False, "error": "no_timezone"}, status_code=500)
        now = dt_util.now()
        local = now.astimezone(tz)
        start_today = local.replace(hour=0, minute=0, second=0, microsecond=0)
        next_midnight = start_today + timedelta(days=1)
        inst.pause_until = next_midnight
        await coord.async_update_installation(inst)
        return self.json({"success": True, "pause_until": next_midnight.isoformat()})


async def async_register_panel_api(hass: HomeAssistant) -> None:
    """Register websocket command and HTTP views once."""
    if hass.data.get(PANEL_API_REGISTERED_KEY):
        return

    websocket_api.async_register_command(hass, ws_panel_state)

    hass.http.register_view(SimpleIrrigationPanelGlobalView())
    hass.http.register_view(SimpleIrrigationPanelZoneView())
    hass.http.register_view(SimpleIrrigationPanelSlotView())
    hass.http.register_view(SimpleIrrigationPanelRunSlotView())
    hass.http.register_view(SimpleIrrigationPanelRunZoneView())
    hass.http.register_view(SimpleIrrigationPanelControlView())
    hass.http.register_view(SimpleIrrigationPanelSkipTodayView())

    hass.data[PANEL_API_REGISTERED_KEY] = True
    _LOGGER.debug("Registered Simple Irrigation panel API")
