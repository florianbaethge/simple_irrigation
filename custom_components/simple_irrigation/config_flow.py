"""Config flow for Simple Irrigation (initial setup only; panel handles the rest)."""

from __future__ import annotations

import uuid
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.helpers.selector import (
    EntitySelector,
    NumberSelector,
    NumberSelectorConfig,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
)

from .const import DOMAIN, MODES
from .validation import validate_max_parallel


def _output_entity_selector(multiple: bool) -> EntitySelector:
    """Allow switch-like outputs from any supported integration."""
    return EntitySelector(
        {"domain": ["switch", "input_boolean", "group"], "multiple": multiple}
    )


class SimpleIrrigationConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """First-time config flow."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Prompt for installation basics."""
        errors: dict[str, str] = {}
        if user_input is not None:
            err = validate_max_parallel(user_input.get("max_parallel_zones"))
            if err:
                errors["base"] = err
            else:
                inst_id = str(uuid.uuid4())
                max_p = int(user_input["max_parallel_zones"])
                delay_raw = user_input.get("pre_start_delay_sec", 10)
                pre_start_delay_sec = int(delay_raw) if delay_raw is not None else 10
                pre_start_delay_sec = max(1, min(3600, pre_start_delay_sec))
                return self.async_create_entry(
                    title=user_input["name"],
                    data={
                        "installation_id": inst_id,
                        "name": user_input["name"],
                        "pre_start_switches": list(
                            user_input.get("pre_start_switches") or []
                        ),
                        "pre_start_delay_sec": pre_start_delay_sec,
                        "default_mode": user_input["default_mode"],
                        "max_parallel_zones": max_p,
                    },
                )

        schema = vol.Schema(
            {
                vol.Required("name", default="Simple Irrigation"): str,
                vol.Optional("pre_start_switches"): _output_entity_selector(
                    multiple=True
                ),
                vol.Optional("pre_start_delay_sec", default=10): NumberSelector(
                    NumberSelectorConfig(min=1, max=3600, mode="box")
                ),
                vol.Required("default_mode", default=MODES[1]): SelectSelector(
                    SelectSelectorConfig(
                        options=list(MODES),
                        translation_key="default_mode",
                        mode=SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Required("max_parallel_zones", default=2): NumberSelector(
                    NumberSelectorConfig(min=1, max=16, mode="box")
                ),
            }
        )
        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)
