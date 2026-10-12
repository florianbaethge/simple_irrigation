# Water use

[← Back to the README](../README.md)

Optional, and honest by design: Simple Irrigation reports litres only where it can back them up.

## Contents

- [Sources](#sources)
- [How to measure a flow rate](#how-to-measure-a-flow-rate)
- [Where the numbers go](#where-the-numbers-go)
- [Water sensors](#water-sensors)

## Sources

Two sources, per zone under **Zones → edit → Water**, and one for the whole installation under **Settings → Water**:

| Source | What it does |
|--------|--------------|
| **Flow rate** (per zone) | Litres per minute you measured once. Every run of the zone is **estimated** from its actual watering time and shown with a tilde (`~120 L`). |
| **Water meter** (per zone) | A volume sensor on the zone's own line. Read when the zone opens and closes; the difference is **measured** and wins over the rate. |
| **Water meter** (installation) | A volume sensor on the supply line. Measures each run as a whole, parallel zones included, and replaces the zones' sum for the run total. |

![Edit zone — Water section with meter entity, flow rate and how to measure it](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/zone_edit_water.png)

Any sensor with a volume unit works (`L`, `m³`, `gal`, `ft³`, …); values are converted. Everything is stored in litres and shown in your Home Assistant unit system — gallons in the US, including the flow-rate field.

## How to measure a flow rate

Run the zone alone for 10 minutes, read the water meter before and after, divide the difference by 10. Some irrigation systems depend on water pressure and deliver a different flow with a different supply — measure again after such a change, or keep the conditions constant, for example with a pressure regulator. A rate is only as good as the setup it was measured in.

## Where the numbers go

No history of its own, no extra tab: the integration books what a run used and hands it to Home Assistant.

- `sensor.<installation>_water` and `sensor.<installation>_<zone>_water` are `total_increasing` **water** sensors (running totals, attributes `source` and `last_run_l`). That gives you history graphs, long-term statistics, the **Energy dashboard's water section** and a **Utility Meter** for daily or monthly figures — the same tools you use for the rest of the house. Both stay *unknown* until the first run reports water, so nothing shows a bogus zero.
- The panel shows the forecast per zone, schedule slot and next run (`~120 L per run`), what the current run has used so far, and the last run. The card shows the forecast for the next run, the last run, and a live figure while watering.
- Zones without a rate or meter contribute nothing — a forecast for a slot is only shown when at least one of its zones can estimate, and a run total is marked as an estimate as soon as one zone's figure is.

## Water sensors

`total_increasing` sensors hand the litres to Home Assistant — one for the installation and one per zone. They always exist; without a source they stay `unknown`:

| Entity | Value |
|--------|-------|
| `sensor.<installation>_water` | Running total of the installation, in litres (attributes `source`, `last_run_l`) |
| `sensor.<installation>_<zone>_water` | Running total of that zone (same attributes) |

Both are **water** sensors, so they appear in the Energy dashboard's water section, in long-term statistics and in a **Utility Meter** without further setup. They stay `unknown` until the first run reports water.
