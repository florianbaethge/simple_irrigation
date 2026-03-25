"""Tests for validation helpers."""

from unittest.mock import MagicMock

import pytest

from custom_components.simple_irrigation.validation import (
    domain_of,
    is_allowed_output_domain,
    parse_zone_switch_entities,
    validate_output_entity_id,
)


@pytest.mark.parametrize(
    ("entity_id", "ok"),
    [
        ("switch.pump", True),
        ("input_boolean.zone_1", True),
        ("group.valves", True),
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
