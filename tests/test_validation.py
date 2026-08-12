"""Tests for validation helpers."""

from unittest.mock import MagicMock

import pytest

from custom_components.simple_irrigation.const import MAX_GUARDS
from custom_components.simple_irrigation.validation import (
    domain_of,
    is_allowed_output_domain,
    parse_guard_list,
    parse_zone_switch_entities,
    validate_output_entity_id,
    validate_zone_payload,
)


@pytest.mark.parametrize(
    ("entity_id", "ok"),
    [
        ("switch.pump", True),
        ("input_boolean.zone_1", True),
        ("group.valves", True),
        ("valve.master", True),
        ("light.kitchen", False),
        ("", False),
    ],
)
def test_validate_output_entity_id_domain(entity_id: str, ok: bool) -> None:
    hass = MagicMock()
    hass.states.get.return_value = MagicMock()
    err = validate_output_entity_id(hass, entity_id)
    if ok:
        assert err is None
    else:
        assert err is not None


def test_domain_of() -> None:
    assert domain_of("switch.x") == "switch"
    assert domain_of("") == ""


def test_is_allowed_output_domain() -> None:
    assert is_allowed_output_domain("switch") is True
    assert is_allowed_output_domain("valve") is True
    assert is_allowed_output_domain("light") is False


def test_parse_zone_switch_entities_list_and_legacy() -> None:
    assert parse_zone_switch_entities(
        {"switch_entity_ids": ["switch.a", " switch.b ", "switch.a"]}
    ) == ["switch.a", "switch.b"]
    assert parse_zone_switch_entities({"switch_entity_id": "switch.x"}) == ["switch.x"]
    assert parse_zone_switch_entities(
        {"switch_entity_ids": [], "switch_entity_id": "switch.y"}
    ) == ["switch.y"]
    assert parse_zone_switch_entities({}) == []


def _hass_with_entities() -> MagicMock:
    """hass whose states.get() resolves every entity."""
    hass = MagicMock()
    hass.states.get.return_value = MagicMock()
    return hass


def test_parse_guard_list_happy_path() -> None:
    hass = _hass_with_entities()
    guards, err = parse_guard_list(
        hass,
        [
            {"entity_id": "sensor.tank", "operator": "above", "value": 20},
            {"entity_id": "binary_sensor.rain", "operator": "is_false", "value": 99},
        ],
    )
    assert err is None
    assert len(guards) == 2
    assert guards[0].entity_id == "sensor.tank"
    assert guards[0].value == 20.0
    # Boolean operators never carry a value, even when the payload sends one.
    assert guards[1].value is None


def test_parse_guard_list_empty_and_none() -> None:
    hass = _hass_with_entities()
    assert parse_guard_list(hass, []) == ([], None)
    assert parse_guard_list(hass, None) == ([], None)


def test_parse_guard_list_accepts_any_domain() -> None:
    """Regression: PR #24 restricted guards to sensor.* which breaks rain/tank."""
    hass = _hass_with_entities()
    for eid in ("binary_sensor.rain", "input_boolean.holiday", "number.tank_level"):
        guards, err = parse_guard_list(
            hass, [{"entity_id": eid, "operator": "is_true"}]
        )
        assert err is None, eid
        assert guards[0].entity_id == eid


def test_parse_guard_list_accepts_values_outside_percent_range() -> None:
    """Regression: the 0-100 clamp blocked litres and mm."""
    hass = _hass_with_entities()
    for value in (-5, 250, 1200.5):
        guards, err = parse_guard_list(
            hass, [{"entity_id": "sensor.tank", "operator": "above", "value": value}]
        )
        assert err is None, value
        assert guards[0].value == float(value)


def test_parse_guard_list_coerces_string_numbers() -> None:
    hass = _hass_with_entities()
    guards, err = parse_guard_list(
        hass, [{"entity_id": "sensor.tank", "operator": "below", "value": "40.5"}]
    )
    assert err is None
    assert guards[0].value == 40.5


def test_parse_guard_list_text_operator() -> None:
    hass = _hass_with_entities()
    guards, err = parse_guard_list(
        hass,
        [{"entity_id": "input_select.season", "operator": "state_is", "value": "Summer"}],
    )
    assert err is None
    assert guards[0].value == "Summer"


@pytest.mark.parametrize(
    ("payload", "expected"),
    [
        ([{"operator": "above", "value": 1}], "invalid_guard_entity"),
        ([{"entity_id": "nodot", "operator": "above", "value": 1}], "invalid_guard_entity"),
        ([{"entity_id": "sensor.a", "operator": "nope", "value": 1}], "invalid_guard_operator"),
        ([{"entity_id": "sensor.a", "operator": "above"}], "missing_guard_value"),
        ([{"entity_id": "sensor.a", "operator": "above", "value": ""}], "missing_guard_value"),
        ([{"entity_id": "sensor.a", "operator": "above", "value": "abc"}], "invalid_guard_value"),
        ([{"entity_id": "sensor.a", "operator": "state_is", "value": ""}], "missing_guard_value"),
    ],
)
def test_parse_guard_list_errors(payload: list, expected: str) -> None:
    hass = _hass_with_entities()
    guards, err = parse_guard_list(hass, payload)
    assert err == expected
    # On any error nothing is applied.
    assert guards == []


def test_parse_guard_list_unknown_entity() -> None:
    hass = MagicMock()
    hass.states.get.return_value = None
    guards, err = parse_guard_list(
        hass, [{"entity_id": "sensor.ghost", "operator": "above", "value": 1}]
    )
    assert err == "unknown_entity"
    assert guards == []


def test_parse_guard_list_too_many() -> None:
    hass = _hass_with_entities()
    payload = [
        {"entity_id": f"sensor.s{i}", "operator": "is_true"} for i in range(MAX_GUARDS + 1)
    ]
    guards, err = parse_guard_list(hass, payload)
    assert err == "too_many_guards"
    assert guards == []


def _hass_with_known_entities(
    entity_ids: set[str],
    services: set[str] | None = None,
) -> MagicMock:
    hass = MagicMock()

    def _get(entity_id: str):
        return MagicMock() if entity_id in entity_ids else None

    known_services = {
        "hydrawise.start_watering",
        "rainbird.start_irrigation",
        "opensprinkler.run",
    } if services is None else services

    hass.states.get.side_effect = _get
    hass.services.has_service.side_effect = (
        lambda domain, service: f"{domain}.{service}" in known_services
    )
    return hass


def test_validate_zone_payload_accepts_default_behavior_without_advanced_fields() -> None:
    hass = _hass_with_known_entities({"switch.zone_1"})
    payload = {
        "name": "Front lawn",
        "switch_entity_ids": ["switch.zone_1"],
        "duration_eco_min": 10,
        "duration_normal_min": 15,
        "duration_extra_min": 20,
        "exclusive": False,
    }
    assert validate_zone_payload(hass, payload) is None


def test_validate_zone_payload_accepts_complete_duration_service_config() -> None:
    hass = _hass_with_known_entities({"switch.zone_1", "binary_sensor.zone_1"})
    payload = {
        "name": "Front lawn",
        "switch_entity_ids": ["switch.zone_1"],
        "duration_eco_min": 10,
        "duration_normal_min": 15,
        "duration_extra_min": 20,
        "exclusive": False,
        "start_service": "hydrawise.start_watering",
        "duration_field": "duration",
        "duration_unit": "minutes",
        "start_entity_id": "binary_sensor.zone_1",
    }
    assert validate_zone_payload(hass, payload) is None


@pytest.mark.parametrize(
    "partial",
    [
        {"start_service": "rainbird.start_irrigation"},
        {"duration_field": "duration"},
        {"duration_unit": "minutes"},
        {"start_service": "rainbird.start_irrigation", "duration_field": "duration"},
    ],
)
def test_validate_zone_payload_rejects_incomplete_duration_service_config(partial: dict) -> None:
    hass = _hass_with_known_entities({"switch.zone_1"})
    payload = {
        "name": "Front lawn",
        "switch_entity_ids": ["switch.zone_1"],
        "duration_eco_min": 10,
        "duration_normal_min": 15,
        "duration_extra_min": 20,
        "exclusive": False,
        **partial,
    }
    assert validate_zone_payload(hass, payload) == "invalid_duration_service"


@pytest.mark.parametrize(
    ("service_name", "expected"),
    [
        ("invalid", "invalid_duration_service"),
        ("rainbird.", "invalid_duration_service"),
        (".start", "invalid_duration_service"),
        ("rainbird.start.extra", "invalid_duration_service"),
        ("RainBird.start", "invalid_duration_service"),
    ],
)
def test_validate_zone_payload_rejects_invalid_service_name(service_name: str, expected: str) -> None:
    hass = _hass_with_known_entities({"switch.zone_1"})
    payload = {
        "name": "Front lawn",
        "switch_entity_ids": ["switch.zone_1"],
        "duration_eco_min": 10,
        "duration_normal_min": 15,
        "duration_extra_min": 20,
        "exclusive": False,
        "start_service": service_name,
        "duration_field": "duration",
        "duration_unit": "minutes",
    }
    assert validate_zone_payload(hass, payload) == expected


def test_validate_zone_payload_rejects_service_that_is_not_registered() -> None:
    hass = _hass_with_known_entities({"switch.zone_1"}, services=set())
    payload = {
        "name": "Front lawn",
        "switch_entity_ids": ["switch.zone_1"],
        "duration_eco_min": 10,
        "duration_normal_min": 15,
        "duration_extra_min": 20,
        "exclusive": False,
        "start_service": "bhyve.start_watering",
        "duration_field": "minutes",
        "duration_unit": "minutes",
    }
    assert validate_zone_payload(hass, payload) == "unknown_service"


def test_validate_zone_payload_rejects_unknown_start_target_entity() -> None:
    hass = _hass_with_known_entities({"switch.zone_1"})
    payload = {
        "name": "Front lawn",
        "switch_entity_ids": ["switch.zone_1"],
        "duration_eco_min": 10,
        "duration_normal_min": 15,
        "duration_extra_min": 20,
        "exclusive": False,
        "start_service": "hydrawise.start_watering",
        "duration_field": "duration",
        "duration_unit": "minutes",
        "start_entity_id": "binary_sensor.missing",
    }
    assert validate_zone_payload(hass, payload) == "unknown_entity"


def test_validate_zone_payload_rejects_invalid_duration_unit() -> None:
    hass = _hass_with_known_entities({"switch.zone_1"})
    payload = {
        "name": "Front lawn",
        "switch_entity_ids": ["switch.zone_1"],
        "duration_eco_min": 10,
        "duration_normal_min": 15,
        "duration_extra_min": 20,
        "exclusive": False,
        "start_service": "hydrawise.start_watering",
        "duration_field": "duration",
        "duration_unit": "hours",
    }
    assert validate_zone_payload(hass, payload) == "invalid_duration_service"


@pytest.mark.parametrize("duration_field", ["entity_id", "run-seconds", "1duration"])
def test_validate_zone_payload_rejects_invalid_duration_field(duration_field: str) -> None:
    hass = _hass_with_known_entities({"switch.zone_1"})
    payload = {
        "name": "Front lawn",
        "switch_entity_ids": ["switch.zone_1"],
        "duration_eco_min": 10,
        "duration_normal_min": 15,
        "duration_extra_min": 20,
        "exclusive": False,
        "start_service": "hydrawise.start_watering",
        "duration_field": duration_field,
        "duration_unit": "minutes",
    }
    assert validate_zone_payload(hass, payload) == "invalid_duration_service"
