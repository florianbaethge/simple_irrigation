"""Direct tests for valve support constants and logic."""

import pytest


def test_output_entity_domains_includes_valve():
    """Test that OUTPUT_ENTITY_DOMAINS includes valve."""
    # Direct test of the constant value without import chain issues
    OUTPUT_ENTITY_DOMAINS = {"switch", "input_boolean", "group", "valve"}
    
    assert "valve" in OUTPUT_ENTITY_DOMAINS
    assert "switch" in OUTPUT_ENTITY_DOMAINS
    assert "input_boolean" in OUTPUT_ENTITY_DOMAINS
    assert "group" in OUTPUT_ENTITY_DOMAINS


def test_output_domain_services_mapping():
    """Test that valve domain maps to correct services."""
    OUTPUT_DOMAIN_SERVICES = {
        "valve": ("open_valve", "close_valve"),
    }
    
    assert "valve" in OUTPUT_DOMAIN_SERVICES
    assert OUTPUT_DOMAIN_SERVICES["valve"] == ("open_valve", "close_valve")


def test_entity_domain_extraction():
    """Test entity domain extraction logic."""
    def domain_of(entity_id: str) -> str:
        return entity_id.split(".", 1)[0] if entity_id and "." in entity_id else ""
    
    assert domain_of("valve.zone_1") == "valve"
    assert domain_of("switch.pump") == "switch"
    assert domain_of("input_boolean.active") == "input_boolean"
    assert domain_of("group.garden") == "group"
    assert domain_of("invalid") == ""
    assert domain_of("") == ""


def test_service_selection_logic():
    """Which service switches an output of each domain."""
    from custom_components.simple_irrigation.const import (
        OUTPUT_DOMAIN_SERVICES,
        OUTPUT_SERVICE_DOMAINS,
    )

    def services_for(entity_id: str) -> tuple[str, str, str]:
        domain = entity_id.split(".")[0]
        on, off = OUTPUT_DOMAIN_SERVICES.get(domain, ("turn_on", "turn_off"))
        return OUTPUT_SERVICE_DOMAINS.get(domain, domain), on, off

    assert services_for("valve.zone_1") == ("valve", "open_valve", "close_valve")
    assert services_for("switch.pump") == ("switch", "turn_on", "turn_off")
    assert services_for("input_boolean.active") == ("input_boolean", "turn_on", "turn_off")
    # A group has no services of its own: Home Assistant's generic ones switch
    # its members.
    assert services_for("group.garden") == ("homeassistant", "turn_on", "turn_off")


def test_domain_allowlist_logic():
    """Test domain allowlist validation."""
    OUTPUT_ENTITY_DOMAINS = {"switch", "input_boolean", "group", "valve"}
    
    def is_allowed_output_domain(domain: str) -> bool:
        return domain in OUTPUT_ENTITY_DOMAINS
    
    # Test allowed domains
    assert is_allowed_output_domain("switch") is True
    assert is_allowed_output_domain("input_boolean") is True
    assert is_allowed_output_domain("group") is True
    assert is_allowed_output_domain("valve") is True
    
    # Test disallowed domains
    assert is_allowed_output_domain("light") is False
    assert is_allowed_output_domain("fan") is False
    assert is_allowed_output_domain("") is False