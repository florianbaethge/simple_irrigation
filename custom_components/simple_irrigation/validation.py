"""Shared validation for config flow and panel API."""

from __future__ import annotations

import re
from typing import Any

from .const import (
    GUARD_BOOLEAN_OPERATORS,
    GUARD_NUMERIC_OPERATORS,
    GUARD_OPERATORS,
    MAX_GUARDS,
    MAX_SCRIPT_TIMEOUT_SEC,
    MODES,
    OUTPUT_ENTITY_DOMAINS,
    SCRIPT_DOMAIN,
)
from .models import Guard

DURATION_UNITS = {"minutes", "seconds"}
SERVICE_REF_PATTERN = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
SERVICE_FIELD_PATTERN = re.compile(r"^[a-z_][a-z0-9_]*$")
RESERVED_SERVICE_FIELDS = {"entity_id"}

# Re-export for tests / callers
__all__ = [
    "OUTPUT_ENTITY_DOMAINS",
    "domain_of",
    "is_allowed_output_domain",
    "parse_guard_list",
    "parse_zone_switch_entities",
    "validate_output_entity_id",
    "validate_zone_payload",
    "validate_pre_start_entities",
    "validate_script_entity",
    "validate_script_timeout",
]


def domain_of(entity_id: str) -> str:
    """Return the domain part of an entity_id."""
    return entity_id.split(".", 1)[0] if entity_id and "." in entity_id else ""


def is_allowed_output_domain(domain: str) -> bool:
    """Return True if domain may be used for irrigation outputs.
    
    Most domains use turn_on/turn_off; valve domain uses open_valve/close_valve.
    """
    return domain in OUTPUT_ENTITY_DOMAINS


def validate_output_entity_id(hass: Any, entity_id: str | None) -> str | None:
    """Return error key or None if entity is allowed and exists."""
    if not entity_id or "." not in entity_id:
        return "invalid_output"
    dom = domain_of(entity_id)
    if not is_allowed_output_domain(dom):
        return "invalid_output"
    if hass.states.get(entity_id) is None:
        return "unknown_entity"
    return None


def parse_guard_list(hass: Any, raw: Any) -> tuple[list[Guard], str | None]:
    """Build a guard list from an API payload.

    Returns ``(guards, error_key)``; on any error the list is empty so callers
    never apply a partial result. Deliberately domain-agnostic: rain is a
    ``binary_sensor``, a manual override an ``input_boolean``, a tank level a
    ``number`` — restricting to ``sensor`` would break most real use cases.
    """
    if raw in (None, ""):
        return [], None
    if not isinstance(raw, (list, tuple)):
        return [], "invalid_guard_entity"
    if len(raw) > MAX_GUARDS:
        return [], "too_many_guards"

    guards: list[Guard] = []
    for item in raw:
        if not isinstance(item, dict):
            return [], "invalid_guard_entity"

        entity_id = str(item.get("entity_id") or "").strip()
        if not entity_id or "." not in entity_id:
            return [], "invalid_guard_entity"
        if hass.states.get(entity_id) is None:
            return [], "unknown_entity"

        operator = str(item.get("operator") or "").strip()
        if operator not in GUARD_OPERATORS:
            return [], "invalid_guard_operator"

        rawval = item.get("value")
        value: float | str | None
        if operator in GUARD_BOOLEAN_OPERATORS:
            value = None
        elif operator in GUARD_NUMERIC_OPERATORS:
            if rawval in (None, ""):
                return [], "missing_guard_value"
            try:
                value = float(rawval)
            except (TypeError, ValueError):
                return [], "invalid_guard_value"
        else:  # text operators
            value = str(rawval).strip() if rawval not in (None, "") else ""
            if not value:
                return [], "missing_guard_value"

        guards.append(Guard(entity_id=entity_id, operator=operator, value=value))

    return guards, None


def parse_zone_switch_entities(user_input: dict[str, Any]) -> list[str]:
    """Normalize switch outputs: list field or legacy single entity_id."""
    raw_ids = user_input.get("switch_entity_ids")
    if isinstance(raw_ids, list):
        out: list[str] = []
        seen: set[str] = set()
        for x in raw_ids:
            s = str(x).strip()
            if s and s not in seen:
                seen.add(s)
                out.append(s)
        if out:
            return out
    single = user_input.get("switch_entity_id")
    if single and str(single).strip():
        return [str(single).strip()]
    return []


def validate_zone_payload(hass: Any, user_input: dict[str, Any]) -> str | None:
    """Validate zone add/update fields. Return error key or None."""
    name = (user_input.get("name") or "").strip()
    if not name:
        return "invalid_name"
    try:
        eco = int(user_input["duration_eco_min"])
        norm = int(user_input["duration_normal_min"])
        ext = int(user_input["duration_extra_min"])
    except (KeyError, TypeError, ValueError):
        return "invalid_duration"
    if eco < 0 or norm < 0 or ext < 0:
        return "invalid_duration"
    ids = parse_zone_switch_entities(user_input)
    if not ids:
        return "invalid_output"
    for eid in ids:
        err = validate_output_entity_id(hass, eid)
        if err:
            return err

    start_service = str(user_input.get("start_service") or "").strip()
    duration_field = str(user_input.get("duration_field") or "").strip()
    duration_unit = str(user_input.get("duration_unit") or "").strip()
    start_entity_id = str(user_input.get("start_entity_id") or "").strip()

    if start_service or duration_field or duration_unit or start_entity_id:
        if not (start_service and duration_field and duration_unit):
            return "invalid_duration_service"
        if SERVICE_REF_PATTERN.fullmatch(start_service) is None:
            return "invalid_duration_service"
        service_domain, _, service_name = start_service.partition(".")
        if not hass.services.has_service(service_domain, service_name):
            return "unknown_service"
        if (
            SERVICE_FIELD_PATTERN.fullmatch(duration_field) is None
            or duration_field in RESERVED_SERVICE_FIELDS
        ):
            return "invalid_duration_service"
        if duration_unit not in DURATION_UNITS:
            return "invalid_duration_service"

        target_entity_id = start_entity_id or ids[0]
        if "." not in target_entity_id:
            return "invalid_target_entity"
        if hass.states.get(target_entity_id) is None:
            return "unknown_entity"

    return None


def validate_pre_start_entities(hass: Any, entity_ids: list[str] | None) -> str | None:
    """Validate pre-start entity list."""
    if not entity_ids:
        return None
    for eid in entity_ids:
        err = validate_output_entity_id(hass, eid)
        if err:
            return err
    return None


def validate_script_entity(hass: Any, entity_id: str | None) -> str | None:
    """Return error key or None; empty means "no script for this phase"."""
    if not entity_id:
        return None
    if domain_of(entity_id) != SCRIPT_DOMAIN:
        return "invalid_script"
    if hass.states.get(entity_id) is None:
        return "unknown_entity"
    return None


def validate_script_timeout(value: Any) -> str | None:
    """Return error key or None."""
    try:
        n = int(value)
    except (TypeError, ValueError):
        return "invalid_script_timeout"
    if n < 1 or n > MAX_SCRIPT_TIMEOUT_SEC:
        return "invalid_script_timeout"
    return None


def validate_mode(mode: str) -> str | None:
    """Return error key or None."""
    if mode not in MODES:
        return "invalid_mode"
    return None


def validate_max_parallel(value: Any) -> str | None:
    """Return error key or None."""
    try:
        n = int(value)
    except (TypeError, ValueError):
        return "invalid_max_parallel"
    if n < 1:
        return "invalid_max_parallel"
    return None
