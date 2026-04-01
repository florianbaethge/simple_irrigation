"""WebSocket + HTTP API for the custom panel (admin only)."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import Any

import voluptuous as vol
from aiohttp import web

from homeassistant.components import websocket_api
from homeassistant.components.http import HomeAssistantView
from homeassistant.components.http.data_validator import RequestDataValidator
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.util import dt as dt_util

from .const import (
    DOMAIN,
    MODES,
    OUTPUT_ENTITY_DOMAINS,
    PANEL_API_REGISTERED_KEY,
    RUN_STATE_ERROR,
    RUN_STATE_IDLE,
)
from .grouping import compute_phases
from .models import Installation, ScheduleSlot, Zone
from .runtime import ScheduleSlotRunError, ZoneManualRunError
from .scheduler import compute_next_runs, phases_for_slot
from .time_util import next_slot_fire_local, parse_hh_mm
from .validation import (
    parse_zone_switch_entities,
    validate_max_parallel,
    validate_mode,
    validate_pre_start_entities,
    validate_zone_payload,
)

_LOGGER = logging.getLogger(__name__)

WS_TYPE_PANEL_STATE = "simple_irrigation/panel/state"


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
        nxt = next_slot_fire_local(after, slot.weekday, slot.time_local, tz)
        if nxt is None:
            continue
        if abs((nxt - global_next).total_seconds()) < 1:
            matching.append(slot)

    zones = inst.zones
    out_slots: list[dict[str, Any]] = []
    for s in matching:
        names = [zones[zi].name if zi in zones else zi for zi in s.zone_ids_ordered]
        out_slots.append(
            {
                "slot_id": s.slot_id,
                "weekday": s.weekday,
                "time_local": s.time_local,
                "zone_names": names,
                "name": s.name or "",
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
                vol.Optional("enabled"): cv.boolean,
                vol.Optional("pause_until"): vol.Any(cv.string, None),
            }
        )
    )
    async def post(self, request, data: dict[str, Any]) -> web.Response:
        """Apply global updates."""
        _require_admin(request)
        hass = request.app["hass"]
        entry = _get_entry(hass, data["entry_id"])
        coord = _get_coordinator(hass, entry.entry_id)
        if coord is None:
            return self.json({"success": False, "error": "not_found"}, status=404)
        inst = coord.installation

        if "name" in data and data["name"]:
            inst.name = str(data["name"]).strip() or inst.name
        if "pre_start_switches" in data:
            err = validate_pre_start_entities(hass, data["pre_start_switches"])
            if err:
                return self.json({"success": False, "error": err}, status=400)
            inst.pre_start_switches = list(data["pre_start_switches"])
        if "mode" in data:
            if validate_mode(data["mode"]):
                return self.json({"success": False, "error": "invalid_mode"}, status=400)
            inst.mode = data["mode"]
        if "max_parallel_zones" in data:
            if validate_max_parallel(data["max_parallel_zones"]):
                return self.json({"success": False, "error": "invalid_max_parallel"}, status=400)
            inst.max_parallel_zones = int(data["max_parallel_zones"])
        if "pre_start_delay_sec" in data:
            inst.pre_start_delay_sec = int(data["pre_start_delay_sec"])
        if "enabled" in data:
            inst.enabled = bool(data["enabled"])
        if "pause_until" in data:
            raw = data["pause_until"]
            if raw in (None, ""):
                inst.pause_until = None
            else:
                try:
                    inst.pause_until = datetime.fromisoformat(str(raw))
                except ValueError:
                    return self.json({"success": False, "error": "invalid_pause_until"}, status=400)

        await coord.async_update_installation(inst)
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
                    }
                ),
            }
        )
    )
    async def post(self, request, data: dict[str, Any]) -> web.Response:
        """Zone CRUD."""
        _require_admin(request)
        hass = request.app["hass"]
        entry = _get_entry(hass, data["entry_id"])
        coord = _get_coordinator(hass, entry.entry_id)
        if coord is None:
            return self.json({"success": False, "error": "not_found"}, status=404)
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
            }
            err = validate_zone_payload(hass, payload)
            if err:
                return self.json({"success": False, "error": err}, status=400)
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
            )
            await coord.async_update_installation(inst)
            return self.json({"success": True, "zone_id": zid})

        zid = data.get("zone_id")
        if not zid or zid not in inst.zones:
            return self.json({"success": False, "error": "unknown_zone"}, status=400)

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
        }
        err = validate_zone_payload(hass, merged)
        if err:
            return self.json({"success": False, "error": err}, status=400)
        zone.name = merged["name"].strip()
        zone.switch_entity_ids = parse_zone_switch_entities(merged)
        zone.enabled = bool(merged["enabled"])
        zone.duration_eco_min = int(merged["duration_eco_min"])
        zone.duration_normal_min = int(merged["duration_normal_min"])
        zone.duration_extra_min = int(merged["duration_extra_min"])
        zone.exclusive = bool(merged["exclusive"])
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
                        "add_zone",
                        "reorder_zone",
                    )
                ),
                vol.Optional("slot_id"): cv.string,
                vol.Optional("weekday"): vol.All(int, vol.Range(min=0, max=6)),
                vol.Optional("time_local"): cv.string,
                vol.Optional("enabled"): cv.boolean,
                vol.Optional("zone_id"): cv.string,
                vol.Optional("direction"): vol.In(("up", "down")),
                vol.Optional("zone_ids_ordered"): [cv.string],
                vol.Optional("name"): cv.string,
            }
        )
    )
    async def post(self, request, data: dict[str, Any]) -> web.Response:
        """Slot CRUD and zone order in slot."""
        _require_admin(request)
        hass = request.app["hass"]
        _get_entry(hass, data["entry_id"])
        coord = _get_coordinator(hass, data["entry_id"])
        if coord is None:
            return self.json({"success": False, "error": "not_found"}, status=404)
        inst = coord.installation
        action = data["action"]

        def _find_slot(sid: str) -> ScheduleSlot | None:
            return next((s for s in inst.schedule_slots if s.slot_id == sid), None)

        if action == "add":
            t = data.get("time_local", "06:00")
            if parse_hh_mm(str(t).strip()) is None:
                return self.json({"success": False, "error": "invalid_time"}, status=400)
            wd = int(data.get("weekday", 0))
            slot = ScheduleSlot(
                slot_id=str(uuid.uuid4()),
                weekday=wd,
                time_local=str(t).strip(),
                enabled=bool(data.get("enabled", True)),
                name=str(data.get("name") or "").strip(),
            )
            inst.schedule_slots.append(slot)
            await coord.async_update_installation(inst)
            return self.json({"success": True, "slot_id": slot.slot_id})

        sid = data.get("slot_id")
        if not sid:
            return self.json({"success": False, "error": "missing_slot_id"}, status=400)
        slot = _find_slot(sid)
        if slot is None:
            return self.json({"success": False, "error": "unknown_slot"}, status=400)

        if action == "delete":
            inst.schedule_slots = [s for s in inst.schedule_slots if s.slot_id != sid]
            await coord.async_update_installation(inst)
            return self.json({"success": True})

        if action == "update":
            if "weekday" in data:
                slot.weekday = int(data["weekday"])
            if "time_local" in data:
                tl = str(data["time_local"]).strip()
                if parse_hh_mm(tl) is None:
                    return self.json({"success": False, "error": "invalid_time"}, status=400)
                slot.time_local = tl
            if "enabled" in data:
                slot.enabled = bool(data["enabled"])
            if "zone_ids_ordered" in data:
                new_order = list(data["zone_ids_ordered"])
                seen: set[str] = set()
                for zid in new_order:
                    if zid not in inst.zones:
                        return self.json({"success": False, "error": "unknown_zone"}, status=400)
                    if zid in seen:
                        return self.json({"success": False, "error": "duplicate_zone"}, status=400)
                    seen.add(zid)
                slot.zone_ids_ordered = new_order
            if "name" in data:
                slot.name = str(data["name"] or "").strip()
            await coord.async_update_installation(inst)
            return self.json({"success": True})

        if action == "add_zone":
            zid = data.get("zone_id")
            if not zid or zid not in inst.zones:
                return self.json({"success": False, "error": "unknown_zone"}, status=400)
            if zid in slot.zone_ids_ordered:
                return self.json({"success": False, "error": "duplicate_zone"}, status=400)
            slot.zone_ids_ordered.append(zid)
            await coord.async_update_installation(inst)
            return self.json({"success": True})

        if action == "reorder_zone":
            zid = data.get("zone_id")
            direction = data.get("direction")
            if not zid or zid not in slot.zone_ids_ordered or direction not in ("up", "down"):
                return self.json({"success": False, "error": "invalid_reorder"}, status=400)
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

        return self.json({"success": False, "error": "unsupported"}, status=400)


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
        hass = request.app["hass"]
        _get_entry(hass, data["entry_id"])
        coord = _get_coordinator(hass, data["entry_id"])
        runtime = _get_runtime(hass, data["entry_id"])
        if coord is None or runtime is None:
            return self.json({"success": False, "error": "not_found"}, status=404)
        sid = data["slot_id"]
        try:
            await runtime.async_run_schedule_slot(sid)
        except ScheduleSlotRunError as err:
            status = 409 if err.code == "busy" else 400
            return self.json({"success": False, "error": err.code}, status=status)
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
        hass = request.app["hass"]
        _get_entry(hass, data["entry_id"])
        coord = _get_coordinator(hass, data["entry_id"])
        runtime = _get_runtime(hass, data["entry_id"])
        if coord is None or runtime is None:
            return self.json({"success": False, "error": "not_found"}, status=404)
        zid = data["zone_id"]
        try:
            await runtime.async_run_zone(zid, duration_min=None)
        except ZoneManualRunError as err:
            status = 409 if err.code == "busy" else 400
            return self.json({"success": False, "error": err.code}, status=status)
        return self.json({"success": True})


class SimpleIrrigationPanelControlView(HomeAssistantView):
    """POST: stop run, skip phase, clear stale error message."""

    url = "/api/simple_irrigation/panel/control"
    name = "api:simple_irrigation:panel_control"

    @RequestDataValidator(
        vol.Schema(
            {
                vol.Required("entry_id"): cv.string,
                vol.Required("action"): vol.In(("stop", "skip_phase", "clear_error")),
            }
        )
    )
    async def post(self, request, data: dict[str, Any]) -> web.Response:
        """Runtime controls for the panel."""
        _require_admin(request)
        hass = request.app["hass"]
        _get_entry(hass, data["entry_id"])
        coord = _get_coordinator(hass, data["entry_id"])
        runtime = _get_runtime(hass, data["entry_id"])
        if coord is None:
            return self.json({"success": False, "error": "not_found"}, status=404)
        action = data["action"]

        if action == "clear_error":
            rs = coord.run_state
            rs.last_error = None
            if rs.run_state == RUN_STATE_ERROR:
                rs.run_state = RUN_STATE_IDLE
            await coord.async_update_run_state(rs)
            return self.json({"success": True})

        if runtime is None:
            return self.json({"success": False, "error": "not_found"}, status=404)

        if action == "stop":
            await runtime.async_stop_all()
            return self.json({"success": True})

        # skip_phase
        ok = await runtime.async_skip_to_next_phase()
        if not ok:
            return self.json({"success": False, "error": "not_running"}, status=409)
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
        hass = request.app["hass"]
        _get_entry(hass, data["entry_id"])
        coord = _get_coordinator(hass, data["entry_id"])
        if coord is None:
            return self.json({"success": False, "error": "not_found"}, status=404)
        inst = coord.installation
        tz = dt_util.get_time_zone(hass.config.time_zone)
        if tz is None:
            return self.json({"success": False, "error": "no_timezone"}, status=500)
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
