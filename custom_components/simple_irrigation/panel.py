"""Register a sidebar panel (same pattern as Alarmo: panel_custom + static JS)."""

from __future__ import annotations

import logging
import os

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.helpers.translation import async_get_translations

from .const import (
    CUSTOM_COMPONENTS,
    DOMAIN,
    INTEGRATION_FOLDER,
    INTEGRATION_VERSION,
    PANEL_FILENAME,
    PANEL_FOLDER,
    PANEL_FRONTEND_PATH,
    PANEL_ICON,
    PANEL_TITLE,
    PANEL_URL_PATH,
    PANEL_WEBCOMPONENT,
)

_LOGGER = logging.getLogger(__name__)


async def async_register_panel(hass) -> None:
    """Serve panel JS and register sidebar entry."""
    root_dir = os.path.join(hass.config.path(CUSTOM_COMPONENTS), INTEGRATION_FOLDER)
    panel_file = os.path.join(root_dir, PANEL_FOLDER, PANEL_FILENAME)

    try:
        cache_bust = int(os.path.getmtime(panel_file))
    except OSError:
        _LOGGER.warning("Panel file missing at %s", panel_file)
        cache_bust = 0

    await hass.http.async_register_static_paths(
        [StaticPathConfig(PANEL_URL_PATH, panel_file, cache_headers=False)]
    )

    translations = await async_get_translations(
        hass, hass.config.language, "panel", {DOMAIN}
    )
    sidebar_title = translations.get(
        f"component.{DOMAIN}.panel.sidebar_title", PANEL_TITLE
    )

    await panel_custom.async_register_panel(
        hass,
        webcomponent_name=PANEL_WEBCOMPONENT,
        frontend_url_path=PANEL_FRONTEND_PATH,
        module_url=f"{PANEL_URL_PATH}?v={INTEGRATION_VERSION}&m={cache_bust}",
        sidebar_title=sidebar_title,
        sidebar_icon=PANEL_ICON,
        require_admin=True,
        config={},
        config_panel_domain=DOMAIN,
    )


def async_unregister_panel(hass) -> None:
    """Remove sidebar panel."""
    frontend.async_remove_panel(hass, PANEL_FRONTEND_PATH)
    _LOGGER.debug("Removed Simple Irrigation panel")
