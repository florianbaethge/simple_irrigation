# The panel

[← Back to the README](../README.md)

Everything is configured in the **Simple Irrigation** sidebar panel (admins only). With several installations, pick one at the top; its name shows in the panel header.

## Contents

- [The five tabs](#the-five-tabs)
- [Editors are accordions](#editors-are-accordions)
- [A tour](#a-tour)
- [Timetable](#timetable)

## The five tabs

| Tab | What it does |
|-----|----------------|
| **Overview** | Live run state with a countdown to the next run, the next few upcoming runs (duration and expected litres), the active watering mode, water used so far while running, and quick actions: *Run next slot now*, *Skip today*, *Pause 48 h* (plus *Stop* / *Skip phase* while running). Shows **Soaking** with a countdown while a run rests. |
| **Zones** | Named zones with one or more output entities, Eco / Normal / Extra runtimes, an **enabled** toggle and **exclusive** flag. An optional **supply** — an upstream valve or a pump only this zone needs. Optional **water** tracking per zone: a meter entity or a flow rate, shown as litres per run and last run. A **start service** section supports integration-specific start services that receive the runtime, and a valve's own **hardware countdown** can be armed as a safety net. Filter by **All / Enabled / Issues**, reorder zones, run a zone now, and see how many cycles use it. |
| **Schedule** | Your watering **cycles** and single slots. A guided **New irrigation cycle** wizard (daily, every 2/3 days, x-per-week, weekly, every 2 weeks, custom), with one or several start times a day. Every row expands to a **14-day run strip**; multi-slot cycles show their members and can be detached. Per-slot **conditions** gate a run on soil moisture, rain, tank level or any other entity, per-slot **scripts** override the installation's pre-start / post-run script, **Cycle & Soak** repeats the slot's phases with rests in between, a **season** limits it to periods of the year, and **fixed minutes** per zone override the mode for one schedule. |
| **Timetable** | Week-at-a-glance grid (zones × weekdays, morning / daytime / evening) with per-day totals, using the same phase and mode timing as a real run — every Cycle & Soak pass is drawn. On phones it becomes a per-day list. Click a run to jump straight to its editor. |
| **Settings** | Installation name (shown in the panel header), optional **pre-start** and **post-run scripts**, pre-start outputs & delay, watering mode, max parallel zones, whether schedules that overlap **wait their turn**, the installation's **season**, an optional **water meter** on the supply line, global **conditions**, default installation, service reference and raw diagnostics. Every section is closed to a line that says what is set. |

## Editors are accordions

A zone, a schedule and the settings each open as a short list of sections, every one closed to a line that says what it holds — *When: Daily · 06:00*, *Zones: Front lawn, Back lawn · ~20 min*, *Cycle & Soak: Off*. What every schedule needs comes first; conditions, rests, season and scripts sit under **More options** and say by themselves whether they are in use. Explanations are behind the small info lines, so nothing has to be scrolled past on a phone. Deleting, and splitting a slot into single days, are in the **⋮** menu next to *Cancel* and *Save*.

## A tour

**Overview** — current run, next runs, watering mode:

![Overview tab — current run, next runs, watering mode](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/overview.png)

**Zones** — the zone list with modes, exclusive and issue filters, and the zone editor:

![Zones tab — zone list with modes, exclusive and issue filters](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/zones.png)

![Edit zone — sections with their summaries, outputs open](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/zone_edit.png)

![Edit zone — Water section with meter entity, flow rate and how to measure it](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/zone_edit_water.png)

More on what a zone can do: [Zones](zones.md).

**Schedule** — cycles and slots, the wizard and the slot editor:

![Schedule tab — cycles and slots, with a cycle expanded to its 14-day strip](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/schedule.png)

![New irrigation cycle wizard — live 14-day preview](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/cycle_wizard.png)

![Edit slot — sections with their summaries, When open: weekdays, start time, week cycle](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/schedule_edit.png)

![Edit slot — Cycle & Soak: repetitions and rests, with the help expanded](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/schedule_edit_cycle_soak.png)

More on cycles, overlaps, Cycle & Soak, conditions and seasons: [Schedules](schedules.md).

**Timetable** — the week by zone and weekday:

![Timetable tab — weekly overview by zone and weekday](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/timetable.png)

**Settings** — every section closed to a line that says what is set:

![Settings tab — every section closed to a line that says what is set](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/settings.png)

## Timetable

- **Grid:** one row group per zone; columns are weekdays (order follows your HA profile’s week start). Three time-of-day rows per zone (morning 0–8, daytime 8–16, evening 16–24), a **total per weekday** footer, and the same phase/mode timing as the runtime. Disabled zones/slots render muted.
- **Odd/even weeks:** a toggle switches between calendar-week parities when any cycle uses them; biweekly runs are drawn dashed.
- **Mobile:** below ~700 px the grid becomes a **per-day list** with the day’s runs and total — no horizontal scrolling.
- **Deep link:** clicking a run opens the **Schedule** editor for that slot (and expands its cycle).
