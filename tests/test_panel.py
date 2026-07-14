"""Regression tests for panel registration.

aiohttp static routes cannot be removed once added, so re-registering the
panel (config entry reload, second entry, setup retry) must not call
async_register_static_paths again — otherwise HA raises
"RuntimeError: Added route will never be executed, method GET is already
registered". Config entries of the domain are also set up concurrently, so
the guard must be claimed before the first await, not checked-then-set
around one.
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from custom_components.simple_irrigation.const import PANEL_STATIC_REGISTERED_KEY
from custom_components.simple_irrigation.panel import async_register_panel


def _make_hass() -> MagicMock:
    hass = MagicMock()
    hass.data = {}
    hass.config.path.return_value = "/config/custom_components"
    hass.config.language = "en"
    hass.http.async_register_static_paths = AsyncMock()
    return hass


def _patch_panel_deps():
    return (
        patch(
            "custom_components.simple_irrigation.panel.async_get_translations",
            AsyncMock(return_value={}),
        ),
        patch(
            "custom_components.simple_irrigation.panel.panel_custom.async_register_panel",
            AsyncMock(),
        ),
    )


@pytest.mark.asyncio
async def test_static_path_registered_only_once_on_reload() -> None:
    """Sequential re-registration (entry reload) must not re-add the route."""
    hass = _make_hass()

    translations_patch, panel_custom_patch = _patch_panel_deps()
    with translations_patch, panel_custom_patch as register_panel_custom:
        await async_register_panel(hass)
        # Simulates entry reload: async_unregister_panel cannot remove the
        # aiohttp route, then the panel is registered again.
        await async_register_panel(hass)

    assert hass.http.async_register_static_paths.await_count == 1
    assert hass.data[PANEL_STATIC_REGISTERED_KEY] is True
    # The sidebar panel itself is (re-)registered on every call.
    assert register_panel_custom.await_count == 2


@pytest.mark.asyncio
async def test_static_path_registered_only_once_concurrently() -> None:
    """Two config entries setting up in parallel must not race the guard.

    HA sets up entries of the same domain concurrently; a check-then-set
    guard with an await in between lets both entries pass and the second
    aiohttp add_route call raises RuntimeError.
    """
    hass = _make_hass()

    async def slow_register(_configs) -> None:
        # Yield to the event loop so the second caller reaches the guard
        # while the first registration is still in flight.
        await asyncio.sleep(0)

    hass.http.async_register_static_paths = AsyncMock(side_effect=slow_register)

    translations_patch, panel_custom_patch = _patch_panel_deps()
    with translations_patch, panel_custom_patch:
        await asyncio.gather(
            async_register_panel(hass),
            async_register_panel(hass),
        )

    assert hass.http.async_register_static_paths.await_count == 1


@pytest.mark.asyncio
async def test_second_registration_does_not_raise_route_conflict() -> None:
    """A second registration must not hit aiohttp's duplicate-route error."""
    hass = _make_hass()
    hass.http.async_register_static_paths = AsyncMock(
        side_effect=[
            None,
            RuntimeError(
                "Added route will never be executed, "
                "method GET is already registered"
            ),
        ]
    )

    translations_patch, panel_custom_patch = _patch_panel_deps()
    with translations_patch, panel_custom_patch:
        await async_register_panel(hass)
        # Would raise RuntimeError without the guard.
        await async_register_panel(hass)
