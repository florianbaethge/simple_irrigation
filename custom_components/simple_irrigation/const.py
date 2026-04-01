"""Constants for Simple Irrigation."""

from typing import Final

DOMAIN: Final = "simple_irrigation"

# Full HA configuration dict from async_setup; needed for async_setup_component(..., config).
HASS_CONFIG_KEY: Final = "_hass_config"

INTEGRATION_VERSION: Final = "0.1.4"

CUSTOM_COMPONENTS: Final = "custom_components"
INTEGRATION_FOLDER: Final = DOMAIN
PANEL_FOLDER: Final = "frontend"
PANEL_FILENAME: Final = "dist/simple-irrigation-panel.js"
PANEL_URL_PATH: Final = "/api/simple_irrigation/panel.js"
PANEL_WEBCOMPONENT: Final = "simple-irrigation-panel"
PANEL_TITLE: Final = "Simple Irrigation"
PANEL_ICON: Final = "mdi:sprinkler-variant"
PANEL_FRONTEND_PATH: Final = "simple-irrigation"

PANEL_REGISTERED_KEY: Final = "_simple_irrigation_panel_registered"
PANEL_API_REGISTERED_KEY: Final = "_simple_irrigation_panel_api_registered"

# Domains that support standard turn_on / turn_off for irrigation outputs.
OUTPUT_ENTITY_DOMAINS: Final = frozenset({"switch", "input_boolean", "group"})

STORE_VERSION: Final = 1

CONF_INSTALLATION_NAME: Final = "installation_name"
CONF_PRE_START_SWITCHES: Final = "pre_start_switch_entities"
CONF_DEFAULT_MODE: Final = "default_mode"
CONF_MAX_PARALLEL_ZONES: Final = "max_parallel_zones"

MODE_ECO: Final = "eco"
MODE_NORMAL: Final = "normal"
MODE_EXTRA: Final = "extra"
MODES: Final = (MODE_ECO, MODE_NORMAL, MODE_EXTRA)

PRE_START_DELAY_SEC: Final = 10

RUN_STATE_IDLE: Final = "idle"
RUN_STATE_PREPARING: Final = "preparing"
RUN_STATE_RUNNING: Final = "running"
RUN_STATE_STOPPING: Final = "stopping"
RUN_STATE_PAUSED: Final = "paused"
RUN_STATE_ERROR: Final = "error"

ATTR_ZONE_ID: Final = "zone_id"
ATTR_SLOT_ID: Final = "slot_id"
ATTR_CONFIG_ENTRY_ID: Final = "config_entry_id"
ATTR_DURATION_MIN: Final = "duration_min"
ATTR_UNTIL: Final = "until"
ATTR_MODE: Final = "mode"
ATTR_ENABLED: Final = "enabled"
ATTR_SCHEDULED: Final = "scheduled"

EVENT_RUN_STARTED: Final = f"{DOMAIN}_run_started"
EVENT_RUN_FINISHED: Final = f"{DOMAIN}_run_finished"
EVENT_RUN_FAILED: Final = f"{DOMAIN}_run_failed"
EVENT_ZONE_STARTED: Final = f"{DOMAIN}_zone_started"
EVENT_ZONE_FINISHED: Final = f"{DOMAIN}_zone_finished"
EVENT_MODE_CHANGED: Final = f"{DOMAIN}_mode_changed"
EVENT_PAUSE_UNTIL_CHANGED: Final = f"{DOMAIN}_pause_until_changed"

SERVICE_RUN_ZONE: Final = "run_zone"
SERVICE_RUN_ZONE_WITH_DURATION: Final = "run_zone_with_duration"
SERVICE_RUN_DUE_ZONES: Final = "run_due_zones"
SERVICE_RUN_SCHEDULE_SLOT: Final = "run_schedule_slot"
SERVICE_STOP_ALL: Final = "stop_all"
SERVICE_SET_MODE: Final = "set_mode"
SERVICE_SET_ZONE_ENABLED: Final = "set_zone_enabled"
SERVICE_PAUSE_UNTIL: Final = "pause_until"
SERVICE_CLEAR_PAUSE: Final = "clear_pause"

WEEKDAYS: Final = (
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "sat",
    "sun",
)
