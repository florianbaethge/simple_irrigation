"""Shared validation for config flow and panel API."""

from __future__ import annotations

from typing import Any

from .const import MODES, OUTPUT_ENTITY_DOMAINS

# Re-export for tests / callers
__all__ = [
    "OUTPUT_ENTITY_DOMAINS",
    "domain_of",
    "is_allowed_output_domain",
    "parse_zone_switch_entities",
    "validate_output_entity_id",
    "validate_zone_payload",
    "validate_pre_start_entities",
]


def domain_of(entity_id: str) -> str:
    """Return the domain part of an entity_id."""
    return entity_id.split(".", 1)[0] if entity_id and "." in entity_id else ""


def is_allowed_output_domain(domain: str) -> bool:
    """Return True if domain may be used for on/off outputs (turn_on/turn_off)."""
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
