# Automations: services, events and entities

[← Back to the README](../README.md)

Everything the panel does is also reachable from automations, scripts and dashboards.

## Contents

- [Services](#services)
- [Examples](#examples)
- [Events](#events)
- [Entities](#entities)
- [Remaining run time](#remaining-run-time)

## Services

All services accept an optional `config_entry_id` when you run more than one Simple Irrigation entry (find it in the panel under **Settings → For automations**, or in diagnostics). Without it a service goes to the only installation there is, or — like the dashboard card — to the one marked **Open this installation by default**. With several installations and no default it goes to the first one, so pass `config_entry_id` there.

| Service | Typical use |
|---------|-------------|
| `simple_irrigation.run_zone` | Start one zone with pre-start, duration from the current mode, then off |
| `simple_irrigation.run_zone_with_duration` | Same pipeline with a fixed duration (minutes) |
| `simple_irrigation.run_schedule_slot` | Run one slot’s full sequence now (`slot_id`) |
| `simple_irrigation.run_due_zones` | Trigger “what’s due now” |
| `simple_irrigation.stop_all` | Stop the active cycle |
| `simple_irrigation.stop_zone` | End one zone of the running cycle; the rest carries on (`zone_id`) |
| `simple_irrigation.skip_phase` | End the running phase, or the Cycle & Soak rest the run is in, and go on to the next. Does nothing while idle or before the first zone has opened — the pump's time to build pressure is never cut short |
| `simple_irrigation.set_mode` | Set `eco` / `normal` / `extra` |
| `simple_irrigation.set_zone_enabled` | Enable/disable a zone |
| `simple_irrigation.set_zone_duration` | Set how long a zone waters, from your own calculation: its runtime for a mode (`zone_id`, `duration_min`, `mode`), or its fixed minutes in one schedule (`zone_id`, `slot_id`, `duration_min`) |
| `simple_irrigation.pause_until` | Pause automatic runs until a datetime (`until` field) |
| `simple_irrigation.clear_pause` | Clear the pause |

Use **Developer tools → Actions** to explore fields with translated descriptions.

## Examples

Feed a zone's runtime from a calculation done in Home Assistant (weather, soil moisture, ET…), so schedule slots, conditions and the hardware countdown keep working as usual:

```yaml
action: simple_irrigation.set_zone_duration
data:
  zone_id: "..."          # the zone's UUID, see Download diagnostics
  duration_min: "{{ states('sensor.lawn_minutes') | int }}"
  mode: normal            # eco | normal | extra: which of the zone's runtimes to write
```

The same service fixes a zone's minutes in **one** schedule when it is given a `slot_id` instead of a `mode` — the evening run gets its own figure, the morning run keeps its own:

```yaml
action: simple_irrigation.set_zone_duration
data:
  zone_id: "..."
  slot_id: "..."          # any member of a cycle stands for the whole cycle
  duration_min: 6         # leave out to remove the fixed minutes again
```

`set_zone_duration` takes 0–240 minutes, the same range as the panel; `0` leaves the zone out. A zone that has not started yet picks the new value up, also in a run that is already under way — which is what lets a pre-start script set it. A manual *Run zone now* takes its duration when it is started. With Cycle & Soak the minutes apply to every pass.

Set the mode from an automation:

```yaml
action: simple_irrigation.set_mode
data:
  mode: eco
  # config_entry_id: abc123...  # if multiple entries
```

Get told when a schedule did not run:

```yaml
triggers:
  - trigger: event
    event_type: simple_irrigation_schedule_skipped
conditions: "{{ trigger.event.data.reason in ['busy', 'expired'] }}"
actions:
  - action: notify.mobile_app_phone
    data:
      message: "{{ trigger.event.data.name or trigger.event.data.slot_id }} was skipped ({{ trigger.event.data.reason }})"
```

## Events

| Event | Fires | Data |
|-------|-------|------|
| `simple_irrigation_run_started` | when a run begins, before the pre-start outputs | `scheduled`, `slot_ids` |
| `simple_irrigation_run_finished` | at the end of every run, after the post-run script | `run_state` (`idle` or `error`), `error` |
| `simple_irrigation_run_failed` | when a run is aborted by an error; `run_finished` follows | `error` |
| `simple_irrigation_zone_started` | right before a zone opens | `zone_id`, `entity_id`, `entity_ids` |
| `simple_irrigation_zone_finished` | when a zone has closed | `zone_id`, `entity_id`, `entity_ids`, `stopped` (`true` when `stop_zone` cut it short) |
| `simple_irrigation_schedule_skipped` | when a schedule came due and was kept from running | `slot_id`, `name` (empty for an unnamed slot), `due_at`, `reason` |

To catch every bad ending, watch `run_finished` with `run_state: error` rather than `run_failed`: a run whose outputs would not close ends that way without a `run_failed`.

The `reason` of a skipped schedule is one of `busy` (something was running and schedules do not wait), `expired` (waited longer than it may), `conditions`, `stopped` (a *Stop*, or Home Assistant shutting down, sent it home), `error` (the run before it failed), `queue_full`, or `paused` — for a schedule that was waiting its turn and finds the installation paused or switched off, or itself switched off, when the turn comes. A schedule that falls into a pause, belongs to a switched-off installation or slot, or is out of [season](schedules.md#season) is not due and is not reported.

## Entities

Every installation is one device. Entity ids start with the installation's name; zone and slot entities carry the zone's or slot's name behind it. The ids below are what a Home Assistant set to English creates; in another language the translated name is used (German: `binary_sensor.<installation>_lauft`), so look yours up on the installation's device page. Zone entities are created when the integration loads: after adding, renaming or deleting a zone, reload the integration.

| Entity | Purpose |
|--------|---------|
| `binary_sensor.<installation>_running` | On from the first pre-start second to the last post-run one. Attributes: `run_state`, `active_zone_ids`, `active_script`, `soak_until`, `waiting_slot_ids` |
| `binary_sensor.<installation>_paused` | On while a pause set by `pause_until`, *Skip today* or *Pause 48 h* lasts (not when the schedule switch is off) |
| `binary_sensor.<installation>_error` | On after a run failed, an output could not be closed, or a restart cut a run off; off again after the next clean run or *Stop* |
| `binary_sensor.<installation>_<zone>_active` | On while that zone waters |
| `sensor.<installation>_next_run` | Start of the next scheduled run (timestamp) |
| `sensor.<installation>_pause_until` | End of the pause (timestamp) |
| `sensor.<installation>_active_zones` | Names of the zones watering right now (diagnostic) |
| `sensor.<installation>_watering_until` | See [Remaining run time](#remaining-run-time) |
| `sensor.<installation>_<zone>_next_run` / `_last_run` / `_watering_until` | Next run, last run and end of the current one for a zone (timestamps) |
| `sensor.<installation>_water` · `sensor.<installation>_<zone>_water` | Litres used, see [Water sensors](water.md#water-sensors) |
| `select.<installation>_mode` | Watering mode: Eco / Normal / Extra |
| `switch.<installation>_schedule_enabled` | All automatic runs of the installation on or off |
| `switch.<installation>_<slot>_enabled` | One schedule slot on or off |
| `button.<installation>_run_due_zones` · `button.<installation>_stop_all` · `button.<installation>_<zone>_run_now` | The same as the services `run_due_zones`, `stop_all` and `run_zone` |

Every schedule slot is exposed as a **switch** entity, so you can enable and disable individual runs from dashboards and automations.

## Remaining run time

While a zone is watering, the integration publishes when it is planned to finish:

| Entity | Value |
|--------|-------|
| `sensor.<installation>_watering_until` | End of the zones running right now — the last one to finish |
| `sensor.<installation>_<zone>_watering_until` | End of that individual zone, useful when zones run in parallel |

Both are timestamps, not a minute counter: the state changes twice per zone run instead of every second, which keeps the recorder small, and the dashboard still renders a live countdown from it. Outside a running cycle both are `unknown`.

```yaml
type: entities
entities:
  - entity: sensor.simple_irrigation_watering_until
    name: Watering until
    format: relative   # "in 12 minutes", ticking
```

The panel’s **Overview** tab shows the same information as a `m:ss` countdown per active zone.
