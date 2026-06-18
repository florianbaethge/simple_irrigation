"""Tests for runtime output control (valve vs switch services)."""

from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from custom_components.simple_irrigation.runtime import RuntimeManager


@pytest.fixture
def mock_hass():
    """Create mock hass with services.async_call."""
    hass = MagicMock()
    hass.services.async_call = AsyncMock()
    return hass


@pytest.fixture  
def mock_coordinator(mock_hass):
    """Create mock coordinator."""
    coord = MagicMock()
    coord.hass = mock_hass
    return coord


@pytest.fixture
def runtime_manager(mock_coordinator):
    """Create RuntimeManager with mocked coordinator."""
    return RuntimeManager(mock_coordinator)


@pytest.mark.asyncio
async def test_switch_turn_on_valve_entity(runtime_manager, mock_hass):
    """Test that valve entities use open_valve service."""
    await runtime_manager._async_switch_turn_on("valve.zone_1")
    
    mock_hass.services.async_call.assert_called_once_with(
        "valve",
        "open_valve",
        {"entity_id": "valve.zone_1"},
        blocking=True,
    )


@pytest.mark.asyncio
async def test_switch_turn_off_valve_entity(runtime_manager, mock_hass):
    """Test that valve entities use close_valve service."""
    await runtime_manager._async_switch_turn_off("valve.zone_1")
    
    mock_hass.services.async_call.assert_called_once_with(
        "valve",
        "close_valve",
        {"entity_id": "valve.zone_1"},
        blocking=True,
    )


@pytest.mark.asyncio
async def test_switch_turn_on_switch_entity(runtime_manager, mock_hass):
    """Test that switch entities use turn_on service."""
    await runtime_manager._async_switch_turn_on("switch.pump")
    
    mock_hass.services.async_call.assert_called_once_with(
        "switch",
        "turn_on",
        {"entity_id": "switch.pump"},
        blocking=True,
    )


@pytest.mark.asyncio
async def test_switch_turn_off_switch_entity(runtime_manager, mock_hass):
    """Test that switch entities use turn_off service."""
    await runtime_manager._async_switch_turn_off("switch.pump")
    
    mock_hass.services.async_call.assert_called_once_with(
        "switch",
        "turn_off",
        {"entity_id": "switch.pump"},
        blocking=True,
    )


@pytest.mark.asyncio
async def test_switch_turn_on_input_boolean_entity(runtime_manager, mock_hass):
    """Test that input_boolean entities use turn_on service."""
    await runtime_manager._async_switch_turn_on("input_boolean.zone_active")
    
    mock_hass.services.async_call.assert_called_once_with(
        "input_boolean",
        "turn_on",
        {"entity_id": "input_boolean.zone_active"},
        blocking=True,
    )


@pytest.mark.asyncio
async def test_switch_turn_on_group_entity(runtime_manager, mock_hass):
    """Test that group entities use turn_on service."""
    await runtime_manager._async_switch_turn_on("group.garden_valves")
    
    mock_hass.services.async_call.assert_called_once_with(
        "group",
        "turn_on",
        {"entity_id": "group.garden_valves"},
        blocking=True,
    )


@pytest.mark.asyncio
async def test_touched_entities_tracking(runtime_manager):
    """Test that entities are added to touched_entities when turned on."""
    # Initially empty
    assert len(runtime_manager._touched_entities) == 0
    
    await runtime_manager._async_switch_turn_on("valve.zone_1")
    
    # Should be tracked after turn_on
    assert "valve.zone_1" in runtime_manager._touched_entities


@pytest.mark.asyncio
async def test_mixed_entity_types_in_zone(runtime_manager, mock_hass):
    """Test that mixed valve and switch entities work correctly."""
    # Simulate turning on both types
    await runtime_manager._async_switch_turn_on("valve.main")
    await runtime_manager._async_switch_turn_on("switch.pump")
    
    # Check both were called with appropriate services
    calls = mock_hass.services.async_call.call_args_list
    assert len(calls) == 2
    
    # First call should be valve.open_valve
    assert calls[0].args == ("valve", "open_valve")
    assert calls[0].kwargs == {"entity_id": "valve.main", "blocking": True}
    
    # Second call should be switch.turn_on
    assert calls[1].args == ("switch", "turn_on") 
    assert calls[1].kwargs == {"entity_id": "switch.pump", "blocking": True}