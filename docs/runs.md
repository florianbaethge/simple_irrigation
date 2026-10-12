# Runs: modes, pre-start and scripts

[← Back to the README](../README.md)

What a run does around the zones themselves: which runtime it picks, what is switched on before the first valve, and what your own scripts may do before and after.

## Contents

- [Modes, pre-start, pause](#modes-pre-start-pause)
- [Pre-start and post-run scripts](#pre-start-and-post-run-scripts)
- [Per-schedule overrides](#per-schedule-overrides)

## Modes, pre-start, pause

- **Watering mode (Eco / Normal / Extra):** chosen on Overview or Settings, or via `simple_irrigation.set_mode` for weather/tank automations.
- **Max parallel zones:** caps concurrency; exclusive zones still run alone.
- **Season:** when in the year schedules water by themselves — see [Season](schedules.md#season).
- **Let schedules wait for their turn:** what happens to a schedule that comes due during another run — see [When schedules overlap](schedules.md#when-schedules-overlap).
- **Pre-start / post-run scripts:** optional scripts run **before** the pre-start outputs and **after** the last one goes off — see below.
- **Pre-start outputs & delay:** outputs turned on before any zone (pump / master valve), with an editable delay to build pressure — both configured on **Settings**. An output that only some zones need goes into those zones' [Supply](zones.md#supply-an-upstream-valve-or-a-pump-for-some-of-the-zones) instead.
- **Pause / Skip today / Pause 48 h:** affect **scheduled** starts only; an already-running cycle is stopped from **Overview**, or one zone at a time from **Zones**.

## Pre-start and post-run scripts

Sometimes the garden has to be made ready before a drop of water flows: send the robot mower home, close a window, switch a well pump’s power over — and let it all go back to normal afterwards. **Settings → Scripts** takes one `script.*` entity for each end of the pipeline and runs it **to completion**:

```
pre-start script  →  pre-start outputs on  →  pre-start delay  →  zones  →  all outputs off  →  post-run script
```

Because the scripts block, they may *wait* — that is the part an automation on `simple_irrigation_run_started` cannot do:

```yaml
# script.mower_go_home — send the mower back and wait until it has docked
sequence:
  - action: lawn_mower.dock
    target:
      entity_id: lawn_mower.garden
  - wait_for_trigger:
      - trigger: state
        entity_id: lawn_mower.garden
        to: docked
    timeout: "00:08:00"
```

- **A stuck script never costs a run.** When the configured **timeout** (default 300 s) expires the script is stopped, a warning is logged, and the run continues anyway — the same fail-open rule as conditions.
- **You can see what it is waiting for.** While a script blocks, Overview says *“Waiting for the pre-start script: …”* under **Preparing** (and the same for the post-run script under **Stopping…**), so a five-minute mower script no longer looks like a hung run. The same detail is on `binary_sensor.<installation>_running` as the `run_state`, `active_zone_ids` and `active_script` attributes, for your own dashboards and automations.
- **Stop** is greyed out while the post-run script runs: the run is already ending, and stopping cannot cut its cleanup short.
- Both run for **every** start through the pipeline: scheduled runs, *Run now*, *Run this slot now* and *Run zone now*.
- The **post-run script** runs at the end of *every* run — finished, failed, or stopped from Overview — so whatever the pre-start script prepared is always undone. `Stop all` therefore waits for it before the run is reported idle.
- Use a **script**, not an automation. `automation.trigger` skips the automation’s conditions by default and silently does nothing when the automation is already running in `single` mode — a silent no-op at exactly the wrong moment. Scripts also take parameters and are what the built-in `script.<name>` blocking call is designed for.

## Per-schedule overrides

Not every run needs the same preparation: the lawn sprinklers want the mower out of the way, drip irrigation does not care. **Schedule → edit a slot (or the cycle wizard) → Scripts** overrides either script for that schedule:

| Setting | Effect |
|---------|--------|
| Switch off (default) | The installation’s script runs. |
| Switch on, entity filled in | That script runs **instead** of the installation’s, with its own timeout (empty = the installation’s). |
| Switch on, entity empty | **No script at all** for this schedule — the drip-irrigation case. |

Scripts belong to the **schedule**, not to the zone: zones run in parallel phases, so a per-zone script would have no single point in the pipeline to run at. Keep zones that need different preparation in different slots rather than mixing them.

When several slots are due in the same minute their zones are merged into one run — and a run has one pre-start and one post-run script. The first overriding slot wins and the disagreement is logged; build slots that do not mix if that matters to you.
