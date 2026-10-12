[![CI](https://github.com/florianbaethge/simple_irrigation/actions/workflows/ci.yml/badge.svg)](https://github.com/florianbaethge/simple_irrigation/actions/workflows/ci.yml)
[![HACS Default](https://img.shields.io/badge/HACS-Default-41BDF5.svg)](https://hacs.xyz)
[![License: MIT](https://img.shields.io/github/license/florianbaethge/simple_irrigation)](https://github.com/florianbaethge/simple_irrigation/blob/main/LICENSE)

<p align="center">
  <img
    src="https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/simple_irrigation_logo.png"
    alt="Simple Irrigation"
    width="760"
  >
</p>

**Irrigation scheduler for [Home Assistant](https://www.home-assistant.io/) with a built-in dashboard panel — zones, watering cycles & modes.**

- **Watering cycles, not raw cron** — a guided wizard turns *“every 2 days, evenings”* into a working schedule; the panel previews the **next 14 days** live before you save.
- **Three watering modes** — Eco / Normal / Extra, switchable by hand or from automations (weather, tank level, season …).
- **Smart runs** — ordered zones grouped into **phases**, configurable parallelism, and **exclusive** zones that always run alone.
- **Seasons** — the installation, and each schedule on its own, can water only in chosen periods of the year: daily in summer, every third day in spring and autumn, nothing in winter.
- **Cycle & Soak** — a slot can water in several short passes with rests in between, so the water soaks in instead of running off. Every output is closed while it rests.
- **Water use, honestly** — litres per run from a meter on the line or a flow rate you measured once, marked as measured or estimated, handed to Home Assistant's statistics and Energy dashboard through plain water sensors.
- **Everything in the UI** — Overview · Zones · Schedule · Timetable · Settings. No YAML for zones or schedules.
- **Multiple gardens** — add several installations for different plots or seasonal plans.

Outputs can be any mix of `switch`, `input_boolean`, `group` and `valve` entities. Zones can also use a **duration-aware start service** for irrigation integrations such as Rain Bird, Rachio, Hydrawise, B-hyve / Orbit and OpenSprinkler. A valve's own **hardware countdown** can be armed as a safety net for when Home Assistant is gone mid-run. Optional **pre-start** outputs (pump / master valve) fire first. Full **English**, **German**, **Italian**, **Dutch** and **French** translations. Responsive down to the Home Assistant companion app.

**Requirements:** Home Assistant **2024.1** or newer.

## Contents

- [How it works](#how-it-works)
- [The panel](#the-panel)
- [Dashboard card](#dashboard-card)
- [Installation](#installation)
- [First-time setup](#first-time-setup)
- [Entities](#entities)
- [Services](#services)
- [Events](#events)
- [Documentation](#documentation)
- [Logs and debugging](#logs-and-debugging)
- [Development](#development)
- [Contributing and support](#contributing-and-support)

## How it works

You build two things in the panel — **zones** and **schedules** — and Simple Irrigation runs them.

- **A zone** is one thing that gets watered: a name, one or more output entities, and a runtime for each watering mode (Eco / Normal / Extra). Optional extras sit behind **More options**: a supply only this zone needs, litres per run, a duration-aware start service, a hardware countdown.
- **A schedule** says when zones water: a **cycle** from the wizard (daily, every 2 or 3 days, x days per week, every 2 weeks …) or a single **slot**, with an ordered zone list. Optional per schedule: conditions, Cycle & Soak, a season, fixed minutes per zone, its own scripts.

Every start — scheduled or by hand — goes through the same pipeline, one run at a time:

```
pre-start script  →  pre-start outputs on  →  pre-start delay  →  zones  →  all outputs off  →  post-run script
```

The zones of a run are grouped into **phases** by the *max parallel* limit and the *exclusive* flags. The installation's **watering mode** picks each zone's runtime, unless the schedule fixes its minutes.

The details: [Zones](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/zones.md) · [Schedules](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/schedules.md) · [Runs: modes, pre-start and scripts](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/runs.md) · [Water use](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/water.md).

## The panel

| Tab | What it does |
|-----|----------------|
| **Overview** | Live run state with a countdown, the next runs, the watering mode and the quick actions: *Run next slot now*, *Skip today*, *Pause 48 h*, *Stop* / *Skip phase* |
| **Zones** | Zones with their outputs and runtimes; filter, reorder, run or stop a zone |
| **Schedule** | Cycles and single slots, the **New irrigation cycle** wizard, a 14-day run strip per row |
| **Timetable** | The week at a glance: zones × weekdays, with per-day totals |
| **Settings** | Pre-start, scripts, watering mode, season, water meter, global conditions |

<p align="center">
  <img src="https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/overview.png" alt="Overview tab — current run, next runs, watering mode" width="760">
</p>

All tabs and the editors with screenshots: [The panel](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/panel.md).

## Dashboard card

`custom:simple-irrigation-card` brings the irrigation onto your dashboards — for everyone in the household, not only administrators. It is registered automatically and has a visual editor. One card type with a **view** option:

| `view` | Shows |
|--------|-------|
| `status` *(default)* | What happens next and the actions worth reaching for; the remaining time and the queue while a run is active |
| `zones` | Every zone with its runtime: what is open, what is next, what is broken |
| `schedule` | The next runs resolved into real dates |
| `week` | The current week as a timetable |
| `run` | The manual run picker |

<p align="center">
  <img src="https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/card_status.png" alt="Card — status view" width="380">
  <img src="https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/card_week.png" alt="Card — week view" width="380">
</p>

```yaml
type: custom:simple-irrigation-card
view: status
```

All options, tap and hold actions, the manual run picker, the badge and more screenshots: [Dashboard card](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/card.md).

## Installation

### HACS (recommended)

1. Open HACS → search **Simple Irrigation**.
2. Click **Download** and restart Home Assistant.
3. **Settings → Devices & services → Add integration** → search **Simple Irrigation**.

### Manual install

Copy the folder `custom_components/simple_irrigation/` into your Home Assistant configuration directory (next to `configuration.yaml`), then restart. Add the integration as above.

## First-time setup

1. Complete the **config flow**: installation name, optional pre-start outputs, default mode, max parallel zones.
2. Open the sidebar entry **Simple Irrigation** (admin only). If you have several installations, pick one.
3. On **Zones**, add your zones and their output entities; set Eco / Normal / Extra runtimes and mark any **exclusive** zone.
4. On **Schedule**, click **New irrigation cycle** and let the wizard build the cadence — the 14-day strip previews exactly when it will run before you create it.
5. Use **Timetable** to see the whole week at a glance; click any run to open its editor.

You can add **multiple** config entries for separate gardens or seasonal plans (each appears in the panel picker, and its name shows in the panel header).

## Entities

| Entity | Purpose |
|--------|---------|
| `binary_sensor.<installation>_running` | On while a run is in progress; attributes say what it is doing (`run_state`, `active_zone_ids`, `active_script`, `soak_until`, `waiting_slot_ids`) |
| `sensor.<installation>_next_run` | Start of the next scheduled run |
| `sensor.<installation>_watering_until` | When the zones watering right now finish — also per zone |
| `sensor.<installation>_water` | Litres used as a running total — also per zone |
| `select.<installation>_mode` | Watering mode: Eco / Normal / Extra |
| `switch.<installation>_<slot>_enabled` | One schedule slot on or off |

Ids as a Home Assistant set to English creates them; zone entities appear after the integration has been reloaded. The full list: [Entities](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/automations.md#entities).

## Services

All services accept an optional `config_entry_id` (needed only with several installations).

| Service | Purpose |
|---------|---------|
| `simple_irrigation.run_zone` · `run_zone_with_duration` | Start one zone, for its mode's runtime or for given minutes |
| `simple_irrigation.run_schedule_slot` · `run_due_zones` | Run one slot now, or whatever is due |
| `simple_irrigation.stop_all` · `stop_zone` · `skip_phase` | Stop the run, one zone of it, or go on to the next phase |
| `simple_irrigation.set_mode` | Set `eco` / `normal` / `extra` |
| `simple_irrigation.set_zone_enabled` · `set_zone_duration` | Switch a zone on or off; set its minutes from your own calculation |
| `simple_irrigation.pause_until` · `clear_pause` | Pause automatic runs, and end the pause |

Fields and examples: [Services](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/automations.md#services).

## Events

`simple_irrigation_run_started`, `_run_finished` and `_run_failed` fire around every run, `simple_irrigation_zone_started` and `_zone_finished` around every zone, and `simple_irrigation_schedule_skipped` when a schedule came due and was kept from running, with its `reason` — ideal for notifications ("the evening run was skipped: busy"). Payloads: [Events](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/automations.md#events).

## Documentation

| Page | Content |
|------|---------|
| [The panel](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/panel.md) | The five tabs, the accordion editors and the timetable, with screenshots |
| [Zones](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/zones.md) | Outputs and runtimes, duration-aware start services (Rain Bird, Rachio, Hydrawise, B-hyve, OpenSprinkler), hardware countdown, supply, stopping a single zone |
| [Schedules](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/schedules.md) | Cycles and slots, several start times, fixed minutes, overlapping schedules, Cycle & Soak, conditions, season |
| [Runs: modes, pre-start and scripts](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/runs.md) | Watering modes, pre-start outputs, pause, pre-start and post-run scripts, per-schedule overrides |
| [Water use](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/water.md) | Flow rates and meters, how to measure, the water sensors and the Energy dashboard |
| [Dashboard card](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/card.md) | Views, all options, tap and hold, manual run, badges |
| [Automations](https://github.com/florianbaethge/simple_irrigation/blob/main/docs/automations.md) | Services with examples, events and their payloads, all entities, remaining run time |

## Logs and debugging

```yaml
logger:
  logs:
    custom_components.simple_irrigation: debug
```

- **Diagnostics:** **Settings → Devices & services → Simple Irrigation → Download diagnostics**.
- **Panel:** the **Settings** tab has a *Diagnostics (raw run state)* disclosure and a *For automations* block with service names and the `config_entry_id`.

## Development

```bash
# Panel and Lovelace card (from repo root) — one build produces both bundles
cd custom_components/simple_irrigation/frontend
npm ci
npm run build
cd ../../..

# Python tests. One of them builds the panel's schedule logic on its own and
# holds it against the Python side under Node; without Node and `npm ci` it is
# skipped locally (and fails in CI, where it must not go missing).
pip install -r requirements_test.txt
pytest tests/

# Regenerate screenshots against a running sandbox (headers of both scripts
# list what the sandbox needs)
cd scripts && npm i && cd ..

# Panel tabs and dialogs
HA_URL=http://localhost:8123 HA_TOKEN=<long-lived-token> SI_ENTRY=<config-entry-id> \
  node scripts/make_screenshots.js

# Lovelace card views and the card editor (needs the "si-card" demo dashboard)
HA_URL=http://localhost:8123 HA_TOKEN=<long-lived-token> \
  node scripts/make_card_screenshots.js
```

Commit the updated bundles in `frontend/dist/` when you change the panel or card sources so HACS users do not need Node.

### Version management

The version is centrally managed in the `VERSION` file:

```bash
make update-version VERSION=1.0.0   # or: python3 update_version.py 1.0.0
make version                        # show current version
```

This updates `VERSION`, `manifest.json`, `frontend/package.json`, the panel TypeScript/embedded version, and rebuilds `frontend/dist/simple-irrigation-panel.js`.

## Contributing and support

- **Issues:** [GitHub Issues](https://github.com/florianbaethge/simple_irrigation/issues)
- **License:** [MIT](LICENSE)

### Contributors

Ideas, bug reports, translations, prototypes and pull requests shape this integration as much as the code does. Thank you to everyone who sent a fix, a translation, a feature, a feature request or an issue:

[@1tygs](https://github.com/1tygs), [@7weazel7](https://github.com/7weazel7), [@akosos](https://github.com/akosos), [@apsillas](https://github.com/apsillas), [@brpeterso](https://github.com/brpeterso), [@bvgeleuken](https://github.com/bvgeleuken), [@fisch3009](https://github.com/fisch3009), [@gszigethy](https://github.com/gszigethy), [@HAuser1234](https://github.com/HAuser1234), [@hubcasale](https://github.com/hubcasale), [@inrulethonn](https://github.com/inrulethonn), [@JeanCoqs](https://github.com/JeanCoqs), [@jpeters001](https://github.com/jpeters001), [@koffienl](https://github.com/koffienl), [@Kohle93](https://github.com/Kohle93), [@maarken](https://github.com/maarken), [@macapus](https://github.com/macapus), [@MojitoJoe1813](https://github.com/MojitoJoe1813), [@scns](https://github.com/scns), [@silviopen](https://github.com/silviopen), [@skarsjo](https://github.com/skarsjo), [@talk-more](https://github.com/talk-more), [@terryhonn](https://github.com/terryhonn), [@thetornado76](https://github.com/thetornado76), [@tszekeres01](https://github.com/tszekeres01)
