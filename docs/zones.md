# Zones

[← Back to the README](../README.md)

A zone is one thing that gets watered: a name, the outputs that open it, and how long it runs in each watering mode. Everything beyond that is optional and sits under **More options** in the zone editor.

## Contents

- [The basics](#the-basics)
- [Duration-aware start services](#duration-aware-start-services)
- [Hardware countdown as a safety net](#hardware-countdown-as-a-safety-net)
- [Supply: an upstream valve or a pump for some of the zones](#supply-an-upstream-valve-or-a-pump-for-some-of-the-zones)
- [Stopping a single zone](#stopping-a-single-zone)

## The basics

- **Outputs:** any mix of `switch`, `input_boolean`, `group` and `valve` entities. Most use `turn_on` / `turn_off`; valves use `open_valve` / `close_valve`. A zone can drive **several outputs** at once.
- **Runtimes:** three values per zone — Eco / Normal / Extra. The installation’s active **mode** picks which one is used, unless a schedule fixes the zone's minutes (see [Cycles and slots](schedules.md#cycles-and-slots)). A zone with 0 minutes is left out of the run; its valve is not opened.
- **Exclusive:** the zone never runs in parallel with others (high-flow lines, shared supply, drip circuits).
- **Issues filter:** zones whose output entity is missing or `unavailable` are flagged so you can spot broken wiring at a glance.
- **Order:** on the **All** filter, drag a zone by its handle — with a mouse or a finger — or focus the handle and press the up or down arrow key. The order applies wherever zones are listed (Zones, Timetable, the dashboard card) and is the run order a new cycle starts with. Existing cycles keep their run order.

Litres per zone — a meter on its line or a flow rate you measured — are described under [Water use](water.md).

## Duration-aware start services

Some irrigation integrations do not start a zone with a regular `turn_on`. Instead, their start action requires the watering duration in the same service call. Open a zone and, under **More options**, its **Start service** section.

![Edit zone — Start service section with preset, duration field and start target](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/zone_edit_advanced.png)

Leave the whole section empty and nothing changes: the zone keeps the normal `turn_on` / wait / `turn_off` behavior. Built-in presets fill in the service, duration field and unit for:

| Preset | Service | Duration field | Unit | Start target |
|--------|---------|----------------|------|--------------|
| **Rain Bird** | `rainbird.start_irrigation` | `duration` | minutes | leave empty |
| **Rachio** | `rachio.start_watering` | `duration` | minutes | leave empty |
| **Hydrawise** | `hydrawise.start_watering` | `duration` | minutes | the zone's `binary_sensor` |
| **B-hyve / Orbit** | `bhyve.start_watering` | `minutes` | minutes | leave empty |
| **OpenSprinkler** | `opensprinkler.run` | `run_seconds` | seconds | leave empty |

Choose **Custom** for another integration and enter its `domain.service`, duration field and whether that field expects minutes or seconds.

- **Stopping always runs via the zone outputs.** Simple Irrigation waits for the configured mode duration and then sends the normal off/close action to every output, as a safety net against a controller that doesn't stop by itself.
- The optional **start target entity** only changes *what the start call addresses*, for integrations whose start service does not target the output. Hydrawise is the case this exists for: it starts via the zone's `binary_sensor`, while the water is carried by the `valve` entity. Put the `valve` in the zone outputs and the `binary_sensor` in the start target — closing the valve stops the run. **An output has to control the same valve as the start target**, otherwise *Stop* cannot end the run.
- All outputs of a zone start together, exactly like the default path, and the zone takes its configured duration regardless of how many outputs it has.
- A failed off action stops the run and is reported, so a potentially open valve cannot go unnoticed while another zone starts. The cleanup that follows still closes every other output.
- **The start service has to return once the run has started**, which is what all the presets above do. A service that instead blocks for the whole watering time — a script entered under **Custom**, typically — is given 30 seconds and then dropped, so the zone keeps its own timing. Note that dropping it cancels the call, so put the waiting in Simple Irrigation's duration, not in the start service.

## Hardware countdown as a safety net

Simple Irrigation closes every output itself — but only while Home Assistant is running. A run that is under way when Home Assistant shuts down is ended and its outputs are closed on the way down; whatever was watering when Home Assistant stopped or crashed is closed once more as soon as it is back. In between — a crash, a power cut, a dead network — nobody is there to close anything. Some valves carry a **timer of their own** that shuts them when it runs out, whatever happened to the controller in the meantime: Tuya and Sonoff water timers expose it as a `number` entity (`countdown`, `timer`, …) next to the valve's switch. Open a zone and, under **More options**, its **Hardware countdown** section.

- Pick the **countdown entity**. Right before the zone opens, it is set to the duration of the pass (every Cycle & Soak pass on its own), so the valve closes on time even if Home Assistant, the network or the integration dies mid-run. Once the outputs are closed again — at the end, after *Stop zone* or *Stop* — the countdown is set back to zero, where the entity allows a zero.
- The **unit** is read off the entity (`min` or `s`). A unit chosen by hand takes precedence over the entity's, so choose one only when the entity carries no unit.
- The value is rounded up to whole units and clamped to the entity's range; a pass longer than the timer's maximum is logged and covered as far as the timer reaches.
- **The timer never blocks a run.** Simple Irrigation keeps stopping the zone itself; if the countdown cannot be set, a warning is logged and the zone waters on the integration's own timing.
- Set the countdown before the switch, not after: some valves restart or ignore a countdown written while they are already open. That order is fixed.

## Supply: an upstream valve or a pump for some of the zones

The installation's **pre-start outputs** are on for a whole run and for every zone. Some gardens need less than that: a master valve that feeds only the drip lines, a cistern pump that only some zones draw from. Open a zone and, under **More options**, its **Supply** section to name the outputs that must be open for *this* zone to get water.

- The supply opens **before** the zone and closes **after** it — never the other way round, also on *Stop* and *Skip phase*.
- Zones that name the same output **share** it. It is switched once for three drip lines watering one after the other, and it stays open for zones watering together.
- It closes as soon as **no watering zone needs it**: a pump does not go on running against closed valves while another zone finishes.
- **Lead time** is how long the zone waits after its supply has opened; empty, the installation's pre-start delay applies. It is only waited for when the supply really had to be opened. **Trail time** keeps the supply open that long after the zone has closed.
- During a Cycle & Soak rest the supply is closed like every other output. After a restart that cut a run off, every supply is closed — also one that was still coming up or trailing, with no zone watering at that moment.
- An output is a zone's valve **or** a supply, not both: the panel refuses a supply that is the valve of any zone, and the other way round.

A pump that only some zones need belongs here rather than in the pre-start outputs. Everything else stays as it is: a zone without a supply runs exactly as before. What it does not do is wait for a valve to *report* open, or start a supply through a service that takes a duration — a supply is an output that is switched on and off.

## Stopping a single zone

While a zone waters, its row in **Zones** shows the remaining time and a stop button (■); the same is available as `simple_irrigation.stop_zone`. Only that zone ends — its outputs go off, the other zones of the run carry on, and a zone still waiting its turn is taken out of the plan. Stopping the last zone simply lets the run finish normally, post-run script included. The `simple_irrigation_zone_finished` event carries `stopped: true` for a zone that was cut short.
