"""WebSocket API for the Lovelace card.

Deliberately separate from ``panel_api``: the panel is an admin configuration
surface, the card is a dashboard control every household member sees. The
snapshot here is therefore read-only, carries no configuration internals
(scripts, guards, output wiring beyond what a broken zone must reveal), and is
open to non-admin users — exactly like the switches, buttons and services this
integration already exposes.

Everything user-visible is sent as raw data (ISO timestamps, minute counts,
structured cadence descriptors) and formatted in the frontend, so dates and
labels follow each user's own locale instead of the server's.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.util import dt as dt_util

from .const import (
    CARD_API_REGISTERED_KEY,
    CARD_MAX_NEXT_RUNS,
    DOMAIN,
    MODES,
    RUN_STATE_ERROR,
    RUN_STATE_IDLE,
    RUN_STATE_PAUSED,
    RUN_STATE_RUNNING,
)
from .grouping import compute_phases
from .guards import guards_allow_run
from .models import Installation, ScheduleSlot, Zone
from .program import soak_minutes
from .runtime import ScheduleSlotRunError, ZoneManualRunError
from .time_util import parse_hh_mm, week_parity_matches

_LOGGER = logging.getLogger(__name__)

WS_ENTRIES = f"{DOMAIN}/card/entries"
WS_SUBSCRIBE = f"{DOMAIN}/card/subscribe"
WS_ACTION = f"{DOMAIN}/card/action"

CARD_ACTIONS = (
    "run_next",
    "run_slot",
    "run_zones",
    "stop",
    "skip_today",
    "pause",
    "clear_pause",
    "clear_error",
    "set_mode",
)


# --------------------------------------------------------------------------
# lookups
# --------------------------------------------------------------------------


def _entries(hass: HomeAssistant) -> list[tuple[str, Any]]:
    """Loaded (entry_id, domain_data) pairs, in config-entry order."""
    out: list[tuple[str, Any]] = []
    for entry in hass.config_entries.async_entries(DOMAIN):
        data = hass.data.get(DOMAIN, {}).get(entry.entry_id)
        if isinstance(data, dict) and "coordinator" in data:
            out.append((entry.entry_id, data))
    return out


def _resolve(hass: HomeAssistant, entry_id: str | None) -> tuple[str, Any] | None:
    """Resolve the requested entry, or auto-pick when there is exactly one.

    Auto-picking is what makes a bare ``type: custom:simple-irrigation-card``
    work; with several installations the card must name one.
    """
    entries = _entries(hass)
    if entry_id:
        for eid, data in entries:
            if eid == entry_id:
                return eid, data
        return None
    if len(entries) == 1:
        return entries[0]
    # Several installations: fall back to the one flagged as default, if any.
    for eid, data in entries:
        if data["coordinator"].installation.is_default:
            return eid, data
    return None


def _not_found(hass: HomeAssistant, connection: Any, msg: dict[str, Any]) -> None:
    """Explain *why* nothing resolved — none configured, or too many to guess."""
    if _entries(hass):
        connection.send_error(
            msg["id"], "ambiguous_entry", "Several installations; pick one"
        )
        return
    connection.send_error(
        msg["id"], websocket_api.ERR_NOT_FOUND, "No Simple Irrigation installation"
    )


# --------------------------------------------------------------------------
# snapshot helpers
# --------------------------------------------------------------------------


def _zone_issue(hass: HomeAssistant, zone: Zone) -> dict[str, Any] | None:
    """First unusable output of a zone, or None when the zone is fine."""
    if not zone.switch_entity_ids:
        # A zone driven through the advanced start service needs no switch.
        if zone.start_service:
            return None
        return {"reason": "no_output", "entity_id": ""}
    for entity_id in zone.switch_entity_ids:
        state = hass.states.get(entity_id)
        if state is None:
            return {"reason": "missing", "entity_id": entity_id}
        if state.state in (STATE_UNAVAILABLE, STATE_UNKNOWN):
            return {"reason": "unavailable", "entity_id": entity_id}
    return None


def _cadence(slot: ScheduleSlot) -> dict[str, Any]:
    """Structured rhythm descriptor ("every 2 days", "Mon, Wed, Fri", …).

    Returned as data rather than a sentence so the card can render it in the
    viewer's language; ``cycle_kind`` is presentation metadata written by the
    panel's cycle wizard and is only a hint — ``weekdays``/``week_parity`` stay
    authoritative.
    """
    meta = slot.cycle_meta or {}
    n_raw = meta.get("n")
    try:
        n = int(n_raw) if n_raw is not None else None
    except (TypeError, ValueError):
        n = None
    return {
        "kind": slot.cycle_kind or "custom",
        "n": n,
        "weekdays": list(slot.weekdays),
        "week_parity": slot.week_parity,
        "times_per_day": len(meta.get("times") or []) or 1,
    }


def _slot_zone_ids(inst: Installation, slot: ScheduleSlot) -> list[str]:
    """Zone ids of a slot that would actually water (enabled, known)."""
    return [
        zid
        for zid in slot.zone_ids_ordered
        if zid in inst.zones and inst.zones[zid].enabled
    ]


def _slot_duration_min(inst: Installation, slot: ScheduleSlot) -> int:
    """Wall-clock minutes a slot takes in the active mode, phases and soaks included.

    Zones inside one phase run in parallel, so a phase costs its longest zone —
    summing every zone would badly overstate an installation that waters two
    circuits at a time. With Cycle & Soak the passes repeat and the rests in
    between count too: the sprinklers are off, but the run is not over.
    """
    phases = compute_phases(
        slot.zone_ids_ordered,
        inst.zones,
        inst.max_parallel_zones,
        skip_disabled=True,
    )
    per_pass = 0
    for phase in phases:
        durations = [
            inst.zones[zid].duration_for_mode(inst.mode)
            for zid in phase
            if zid in inst.zones
        ]
        if durations:
            per_pass += max(durations)
    if per_pass == 0:
        return 0
    return per_pass * max(1, slot.repetitions) + soak_minutes(len(phases), slot)


def _slot_payload(inst: Installation, slot: ScheduleSlot) -> dict[str, Any]:
    """One schedule slot as the card needs it."""
    zone_ids = _slot_zone_ids(inst, slot)
    return {
        "slot_id": slot.slot_id,
        "name": slot.name or "",
        "enabled": slot.enabled,
        "time_local": slot.time_local,
        "weekdays": list(slot.weekdays),
        "week_parity": slot.week_parity,
        "zone_ids": zone_ids,
        "zone_names": [inst.zones[zid].name for zid in zone_ids],
        "duration_min": _slot_duration_min(inst, slot),
        "repetitions": slot.repetitions,
        "cadence": _cadence(slot),
        "has_conditions": bool(slot.guards) or bool(inst.guards),
    }


def _slot_fires_on(slot: ScheduleSlot, day: date) -> bool:
    """Whether an enabled slot fires on ``day`` (weekday + ISO-week parity)."""
    if not slot.enabled:
        return False
    if day.weekday() not in slot.weekdays:
        return False
    return week_parity_matches(day, slot.week_parity)


def _next_firings(
    hass: HomeAssistant, inst: Installation, limit: int
) -> list[dict[str, Any]]:
    """The next ``limit`` real firings across all slots, ascending.

    Resolved into concrete datetimes by walking forward day by day, so the card
    never has to decode weekday/parity rules — and a slot that fires twice in
    the window appears twice.
    """
    tz = dt_util.get_time_zone(hass.config.time_zone)
    if tz is None or not inst.enabled or limit <= 0:
        return []

    now = dt_util.now()
    today = now.astimezone(tz).date()
    pause_until = inst.pause_until

    firings: list[tuple[datetime, ScheduleSlot]] = []
    # Two ISO weeks is the longest gap an odd/even slot can have; three gives
    # head-room for a fully paused fortnight without an unbounded loop.
    for offset in range(21):
        day = today + timedelta(days=offset)
        for slot in inst.schedule_slots:
            if not _slot_fires_on(slot, day):
                continue
            parsed = parse_hh_mm(slot.time_local)
            if parsed is None:
                continue
            hour, minute = parsed
            fire_at = datetime.combine(
                day, datetime.min.time().replace(hour=hour, minute=minute), tzinfo=tz
            )
            if fire_at <= now:
                continue
            firings.append((fire_at, slot))
        if len(firings) >= limit * 2:
            break

    firings.sort(key=lambda pair: (pair[0], pair[1].slot_id))

    out: list[dict[str, Any]] = []
    for fire_at, slot in firings[:limit]:
        payload = _slot_payload(inst, slot)
        payload["fire_at"] = fire_at.isoformat()
        # A pause suppresses scheduled runs, so say so per row rather than
        # dropping them — "nothing until Saturday" is the useful information.
        payload["skipped_by_pause"] = bool(pause_until and fire_at < pause_until)
        out.append(payload)
    return out


def _week(hass: HomeAssistant, inst: Installation) -> dict[str, Any]:
    """The current Mon–Sun week as columns of runs (start minute + duration)."""
    tz = dt_util.get_time_zone(hass.config.time_zone)
    if tz is None:
        return {"days": [], "total_runs": 0, "total_min": 0}

    now = dt_util.now()
    today = now.astimezone(tz).date()
    monday = today - timedelta(days=today.weekday())
    pause_until = inst.pause_until

    days: list[dict[str, Any]] = []
    total_runs = 0
    total_min = 0

    for offset in range(7):
        day = monday + timedelta(days=offset)
        runs: list[dict[str, Any]] = []
        day_min = 0
        day_paused = False

        for slot in inst.schedule_slots:
            if not slot.enabled or day.weekday() not in slot.weekdays:
                continue
            parsed = parse_hh_mm(slot.time_local)
            if parsed is None:
                continue
            hour, minute = parsed
            duration = _slot_duration_min(inst, slot)
            # A parity slot that does not fall in this ISO week is still drawn,
            # dashed, so the rhythm stays visible in a single week's view.
            fires = week_parity_matches(day, slot.week_parity)
            fire_at = datetime.combine(
                day, datetime.min.time().replace(hour=hour, minute=minute), tzinfo=tz
            )
            paused = bool(pause_until and fire_at < pause_until)
            runs.append(
                {
                    "slot_id": slot.slot_id,
                    "name": slot.name or "",
                    "start_min": hour * 60 + minute,
                    "duration_min": duration,
                    "parity_only": not fires,
                    "paused": paused,
                }
            )
            if fires:
                if paused:
                    day_paused = True
                else:
                    day_min += duration
                    total_runs += 1
                    total_min += duration

        runs.sort(key=lambda run: run["start_min"])
        days.append(
            {
                "date": day.isoformat(),
                "weekday": day.weekday(),
                "today": day == today,
                "runs": runs,
                "total_min": day_min,
                # Only call a day "paused" when the pause is the reason it is empty.
                "paused": day_paused and day_min == 0,
            }
        )

    return {"days": days, "total_runs": total_runs, "total_min": total_min}


def _entity_id(hass: HomeAssistant, entry_id: str, suffix: str, platform: str) -> str:
    """Resolve one of this entry's own entities, for the card's more-info taps."""
    from homeassistant.helpers import entity_registry as er

    reg = er.async_get(hass)
    return reg.async_get_entity_id(platform, DOMAIN, f"{entry_id}_{suffix}") or ""


def _zones_payload(
    hass: HomeAssistant, inst: Installation, run_state: Any, entry_id: str
) -> list[dict[str, Any]]:
    """Every zone with its live role in the current run."""
    active = set(run_state.active_zone_ids)
    queued: set[str] = set(run_state.queued_zone_ids)
    for phase in run_state.upcoming_phases:
        queued.update(phase)
    queued -= active

    out: list[dict[str, Any]] = []
    for zone_id, zone in inst.zones.items():
        ends_at = run_state.zone_ends_at.get(zone_id)
        next_run = run_state.next_run_per_zone.get(zone_id)
        last_run = run_state.last_run_per_zone.get(zone_id)
        out.append(
            {
                "zone_id": zone_id,
                "name": zone.name,
                "enabled": zone.enabled,
                "active": zone_id in active,
                "queued": zone_id in queued,
                "duration_min": zone.duration_for_mode(inst.mode),
                "ends_at": ends_at.isoformat() if ends_at else None,
                "next_run": next_run.isoformat() if next_run else None,
                "last_run": last_run.isoformat() if last_run else None,
                "issue": _zone_issue(hass, zone),
                "entity_id": _entity_id(
                    hass, entry_id, f"zone_{zone_id}_active", "binary_sensor"
                ),
            }
        )
    return out


def _current_phase(run_state: Any) -> tuple[int | None, int | None]:
    """(index, total) of the phase running right now, 1-based."""
    if run_state.run_state != RUN_STATE_RUNNING or run_state.phase_index <= 0:
        return None, None
    index = run_state.phase_index
    # upcoming_phases only ever holds what is still queued, so the total is the
    # live phase plus whatever is behind it — and it grows when a manual run
    # appends a zone mid-flight, which is exactly what the card should show.
    return index, index + len(run_state.upcoming_phases)


def _snapshot(hass: HomeAssistant, entry_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Everything the card renders, for one installation."""
    coord = data["coordinator"]
    inst: Installation = coord.installation
    rs = coord.run_state

    now = dt_util.now()
    paused = bool(inst.pause_until and now < inst.pause_until)

    state = rs.run_state
    if state == RUN_STATE_IDLE and paused:
        state = RUN_STATE_PAUSED

    zones = _zones_payload(hass, inst, rs, entry_id)
    slots = [_slot_payload(inst, slot) for slot in inst.schedule_slots]
    next_runs = _next_firings(hass, inst, CARD_MAX_NEXT_RUNS)

    ends = [rs.zone_ends_at[zid] for zid in rs.active_zone_ids if zid in rs.zone_ends_at]
    phase_index, phase_total = _current_phase(rs)

    current_slot_name = ""
    if rs.current_slot_id:
        for slot in inst.schedule_slots:
            if slot.slot_id == rs.current_slot_id:
                current_slot_name = slot.name or ""
                break

    return {
        "entry_id": entry_id,
        "name": inst.name,
        "enabled": inst.enabled,
        "state": state,
        "mode": inst.mode,
        "modes": list(MODES),
        "paused_until": inst.pause_until.isoformat() if inst.pause_until else None,
        "manual_run": rs.manual_run,
        "last_error": rs.last_error,
        "active_script": rs.active_script,
        "active_script_started_at": (
            rs.active_script_started_at.isoformat()
            if rs.active_script_started_at
            else None
        ),
        "active_script_timeout_sec": rs.active_script_timeout_sec,
        "current_slot_id": rs.current_slot_id,
        "current_slot_name": current_slot_name,
        "phase_index": phase_index,
        "phase_total": phase_total,
        "run_started_at": (
            rs.current_run_started_at.isoformat() if rs.current_run_started_at else None
        ),
        "run_ends_at": max(ends).isoformat() if ends else None,
        # Set while the run rests between Cycle & Soak passes; the card counts
        # it down in place of a zone.
        "soak_until": rs.soak_until.isoformat() if rs.soak_until else None,
        "max_parallel_zones": inst.max_parallel_zones,
        "zones": zones,
        "slots": slots,
        "next_runs": next_runs,
        "week": _week(hass, inst),
        "issue_count": sum(1 for z in zones if z["issue"] and z["enabled"]),
        "has_conditions": bool(inst.guards),
        # Tapping a compact row should behave like any other HA tile.
        "entity_id": _entity_id(hass, entry_id, "binary_running", "binary_sensor"),
    }


# --------------------------------------------------------------------------
# websocket commands
# --------------------------------------------------------------------------


@websocket_api.websocket_command({vol.Required("type"): WS_ENTRIES})
@callback
def ws_entries(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List installations so the card editor can offer a picker."""
    connection.send_result(
        msg["id"],
        [
            {
                "entry_id": entry_id,
                "name": data["coordinator"].installation.name,
                "is_default": data["coordinator"].installation.is_default,
            }
            for entry_id, data in _entries(hass)
        ],
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_SUBSCRIBE,
        vol.Optional("entry_id"): cv.string,
    }
)
@callback
def ws_subscribe(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Push a fresh snapshot whenever the installation or run state changes."""
    resolved = _resolve(hass, msg.get("entry_id"))
    if resolved is None:
        _not_found(hass, connection, msg)
        return
    entry_id, data = resolved

    @callback
    def _push() -> None:
        connection.send_message(
            websocket_api.event_message(msg["id"], _snapshot(hass, entry_id, data))
        )

    connection.subscriptions[msg["id"]] = data["coordinator"].async_add_listener(_push)
    connection.send_result(msg["id"])
    _push()


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_ACTION,
        vol.Optional("entry_id"): cv.string,
        vol.Required("action"): vol.In(CARD_ACTIONS),
        vol.Optional("slot_id"): cv.string,
        vol.Optional("zone_ids"): [cv.string],
        vol.Optional("duration_min"): vol.All(int, vol.Range(min=1, max=1440)),
        vol.Optional("hours"): vol.All(int, vol.Range(min=1, max=8760)),
        vol.Optional("until"): cv.string,
        vol.Optional("mode"): vol.In(MODES),
        vol.Optional("apply_conditions"): cv.boolean,
    }
)
@websocket_api.async_response
async def ws_action(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Run the card's controls.

    Open to non-admin users on purpose: every action here has an equivalent
    button, switch or service that a regular Home Assistant user may already
    call, so gating the card would only push people to the uglier route.
    """
    resolved = _resolve(hass, msg.get("entry_id"))
    if resolved is None:
        _not_found(hass, connection, msg)
        return
    entry_id, data = resolved
    coord = data["coordinator"]
    runtime = data["runtime"]
    inst: Installation = coord.installation
    action = msg["action"]

    try:
        if action == "stop":
            await runtime.async_stop_all()

        elif action == "run_next":
            slot_id = _next_slot_id(hass, inst)
            if slot_id is None:
                connection.send_error(
                    msg["id"], websocket_api.ERR_NOT_FOUND, "No upcoming schedule slot"
                )
                return
            await runtime.async_run_schedule_slot(slot_id)

        elif action == "run_slot":
            slot_id = msg.get("slot_id")
            if not slot_id:
                connection.send_error(
                    msg["id"], websocket_api.ERR_INVALID_FORMAT, "slot_id is required"
                )
                return
            # A manual slot run normally ignores guards — that is the point of
            # starting it by hand. The card can opt back in, in which case a
            # blocking guard must refuse loudly instead of watering anyway.
            if msg.get("apply_conditions"):
                slot = next(
                    (s for s in inst.schedule_slots if s.slot_id == slot_id), None
                )
                if slot is not None and not guards_allow_run(hass, inst, slot):
                    connection.send_error(
                        msg["id"], "conditions_not_met", "A slot condition is not met"
                    )
                    return
            await runtime.async_run_schedule_slot(slot_id)

        elif action == "run_zones":
            zone_ids = msg.get("zone_ids") or []
            if not zone_ids:
                connection.send_error(
                    msg["id"], websocket_api.ERR_INVALID_FORMAT, "zone_ids is required"
                )
                return
            duration = msg.get("duration_min")
            # Sequential on purpose: async_run_zone appends to the running
            # manual run, which is what produces the "runs in sequence" the
            # card promises before the user presses start.
            for zone_id in zone_ids:
                await runtime.async_run_zone(zone_id, duration_min=duration)

        elif action == "skip_today":
            await _set_pause(coord, inst, _next_local_midnight(hass))

        elif action == "pause":
            until = _pause_target(hass, msg)
            if until is None:
                connection.send_error(
                    msg["id"], websocket_api.ERR_INVALID_FORMAT, "hours or until required"
                )
                return
            await _set_pause(coord, inst, until)

        elif action == "clear_pause":
            await _set_pause(coord, inst, None)

        elif action == "clear_error":
            rs = coord.run_state
            rs.last_error = None
            if rs.run_state == RUN_STATE_ERROR:
                rs.run_state = RUN_STATE_IDLE
            await coord.async_update_run_state(rs)

        elif action == "set_mode":
            mode = msg.get("mode")
            if mode not in MODES:
                connection.send_error(
                    msg["id"], websocket_api.ERR_INVALID_FORMAT, "Unknown mode"
                )
                return
            inst.mode = mode
            await coord.async_update_installation(inst)

    except (ZoneManualRunError, ScheduleSlotRunError) as err:
        connection.send_error(msg["id"], err.code, str(err))
        return
    except HomeAssistantError as err:
        connection.send_error(msg["id"], websocket_api.ERR_UNKNOWN_ERROR, str(err))
        return

    connection.send_result(msg["id"], {"success": True})
    _LOGGER.debug("Card action %s on %s", action, entry_id)


def _next_slot_id(hass: HomeAssistant, inst: Installation) -> str | None:
    """Slot id of the next scheduled firing, ignoring an active pause.

    "Run next slot" is a manual override, so a pause must not hide the slot the
    user is explicitly asking for.
    """
    firings = _next_firings(hass, inst, 1)
    if firings:
        return str(firings[0]["slot_id"])
    return None


def _next_local_midnight(hass: HomeAssistant) -> datetime:
    """Start of the next local day — the end of "skip today"."""
    tz = dt_util.get_time_zone(hass.config.time_zone)
    local = dt_util.now().astimezone(tz)
    start_today = local.replace(hour=0, minute=0, second=0, microsecond=0)
    return start_today + timedelta(days=1)


def _pause_target(hass: HomeAssistant, msg: dict[str, Any]) -> datetime | None:
    """Absolute pause end from either a relative ``hours`` or an ISO ``until``."""
    hours = msg.get("hours")
    if hours:
        return dt_util.now() + timedelta(hours=int(hours))
    raw = msg.get("until")
    if not raw:
        return None
    parsed = dt_util.parse_datetime(str(raw))
    if parsed is None:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt_util.get_time_zone(hass.config.time_zone))
    return parsed


async def _set_pause(coord: Any, inst: Installation, until: datetime | None) -> None:
    """Write the pause window and let the scheduler re-plan."""
    inst.pause_until = until
    await coord.async_update_installation(inst)


async def async_register_card_api(hass: HomeAssistant) -> None:
    """Register the card's websocket commands once per HA lifetime."""
    if hass.data.get(CARD_API_REGISTERED_KEY):
        return
    websocket_api.async_register_command(hass, ws_entries)
    websocket_api.async_register_command(hass, ws_subscribe)
    websocket_api.async_register_command(hass, ws_action)
    hass.data[CARD_API_REGISTERED_KEY] = True
    _LOGGER.debug("Registered Simple Irrigation card API")
