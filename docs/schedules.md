# Schedules

[← Back to the README](../README.md)

When the garden waters by itself: cycles and slots, what happens when two of them collide, watering in passes, and the two things that can keep a schedule from running — a condition and the season.

## Contents

- [Cycles and slots](#cycles-and-slots)
- [When schedules overlap](#when-schedules-overlap)
- [Cycle & Soak](#cycle--soak)
- [Conditions](#conditions)
- [Season](#season)

## Cycles and slots

A **cycle** is a repeating watering cadence. The wizard offers:

| Cadence | Result |
|---------|--------|
| **Daily** / **Weekly** / **Every 2 weeks** / **Set days per week** / **Custom days** | a single schedule slot |
| **Every 2 days** / **Every 3 days** | a grouped **cycle** of two linked slots |
| Any of them with **several start times** | a grouped **cycle**: the slots above, once for every start time |

Why the split? A slot waters on chosen weekdays at **one time of day** and, optionally, only in **odd** or **even** ISO calendar weeks. That covers most cadences in one slot — but a true *every-2-days* rhythm needs two slots on alternating parity (odd weeks Mon/Wed/Fri/Sun, even weeks Tue/Thu/Sat), and every further start time needs the cadence's slots once more. Whatever takes more than one slot appears as a **cycle** with member rows and a **Detach into single slots** action; everything else is a plain, single slot. Either way, **every row expands to a 14-day run strip** so you can see exactly when it fires.

- **Several start times a day:** fresh seed, pots in a heat wave and a greenhouse want water more than once a day. In the wizard's time step, **Add start time** gives a cycle up to eight start times. The whole cycle — zones, run order, conditions, Cycle & Soak — runs at each of them and stays one row to edit. This is not Cycle & Soak: that repeats the phases back to back with short rests, this spreads whole runs over the day. The wizard warns when two start times are closer together than one run takes — what becomes of the later one is described under [When schedules overlap](#when-schedules-overlap).
- **Fixed minutes:** in a slot's **Zones** section — and in the wizard's zone step — every zone has a minutes field. Empty, the zone waters as long as the active mode says, and the field shows what that is. A number fixes it for this schedule, whatever the mode: the lawn gets twenty minutes in the morning and five in the evening without a second set of zones. The row carries a **Fixed minutes** badge, and all estimates count with it. An automation can set and clear the same field with `simple_irrigation.set_zone_duration`.
- **Run order & phases:** the ordered zone list is grouped into **phases** by the *max parallel* limit and *exclusive* flags. The editor shows the phase breakdown live.
- **Optimize cycles:** detects single slots that are one schedule written out day by day — same time, zones, conditions, scripts, season and fixed minutes, on days a cadence of the wizard produces exactly — and offers to fold them into one cycle. Nothing runs differently afterwards; slots that differ in any of it are left alone.
- **Run now:** *Run next slot now* (Overview), *Run this slot now* (a schedule row) and *Run zone now* (Zones) all use the same pre-start and shutdown pipeline as a scheduled run.

## When schedules overlap

One run at a time: a schedule that comes due while something else is running — another schedule or a manual run — cannot start. Schedules due in the very same minute are no overlap; they run as one run, back to back.

By default the later schedule is **skipped**. That is no longer silent: the log says which schedule was skipped and why, and the `simple_irrigation_schedule_skipped` event carries the same (see [Events](automations.md#events)).

**Settings → Watering → Let schedules wait for their turn** makes it wait instead:

- It starts once the run before it is completely done — post-run script, outputs closed — as a run of its own, with its own pre-start, scripts and Cycle & Soak. Several waiting schedules run in the order they came due.
- When its turn comes, everything that would have kept it from running at its own time is looked at again: the installation is not paused or switched off, the schedule still exists and is enabled, its **conditions hold now**. Minutes and mode are those of the moment it starts.
- **Wait at most** (120 minutes by default) is counted from the time it was due. A schedule due at 06:30 starts by 08:30 or not at all — nothing drifts into the midday sun.
- **Stop** ends the run and sends the waiting schedules home with it; nothing starts behind a stop. *Skip phase* and stopping a single zone leave them alone. A run that ends in an error drops them too.
- To take one waiting schedule out of the line, switch that schedule off — or press *Skip today* to drop them all.
- Nothing waits across a restart of Home Assistant.

While a run is under way, Overview and the dashboard card name the schedules waiting behind it, and `binary_sensor.<installation>_running` lists them in `waiting_slot_ids`. Manual runs never wait: *Run now* during a run answers "already running", as before.

## Cycle & Soak

Sloped lawns and clay soil cannot take twenty minutes of water at once — it runs off before it soaks in. **Schedule → edit a slot (or the cycle wizard) → Cycle & Soak** waters the slot in several short passes instead:

![Edit slot — Cycle & Soak: repetitions and rests, with the help expanded](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/schedule_edit_cycle_soak.png)

| Setting | Effect |
|---------|--------|
| **Repetitions** | How often the slot's phases run, in order. `1` is a plain run. |
| **Rest between phases** | Minutes every output stays closed between two phases of the same pass. |
| **Rest between repetitions** | Minutes between the last phase of one pass and the first of the next. |

Example — one lawn zone, 3 repetitions of its 10-minute mode duration, 15 minutes rest between repetitions: it waters 10 min, rests 15, waters 10, rests 15, waters 10. The slot's estimated duration on Schedule, Overview, Timetable and the card counts the rests, and the Timetable draws every pass.

- A rest is a real pause: **every output is closed, pre-start outputs included** — a pump must not run against closed valves for a quarter of an hour. Before the next pass they come back up with the usual pre-start delay.
- **Stop** ends the run, rests included. **Skip phase** — on Overview, on the dashboard card and as `simple_irrigation.skip_phase` — cuts a rest short, and skipping a phase skips the rest after it too — whoever skips wants to see the next zone, not a pause.
- Overview and the card show **Soaking** with a countdown while the run rests; `binary_sensor.<installation>_running` carries the end of the rest as its `soak_until` attribute.
- Rests are per slot. Several slots due in the same minute run back to back, each with its own rests; a rest with nothing left to water behind it is skipped.

## Conditions

A **condition** states something that must hold for a scheduled run to start — "water, but only while the soil is dry". Each one is an entity, a comparison and a value:

| Operator | Meaning | Example |
|----------|---------|---------|
| **is above** / **is below** | numeric compare (strict) | `sensor.cistern_litres` is above `200` |
| **equals** | numeric compare with tolerance | `sensor.zones_open` equals `2` |
| **state is** | text compare, case-insensitive | `input_select.season` state is `summer` |
| **is on** / **is off** | boolean state | `binary_sensor.rain` is off |

Any numeric entity works — there is no unit restriction, so litres, millimetres, percent and degrees all compare the same way. Rain sensors (`binary_sensor`), manual overrides (`input_boolean`) and helpers (`input_number`, `input_select`) are just as valid as `sensor`.

Conditions live in two places and are combined with **AND** — all must hold:

- **Settings → Conditions:** apply to every scheduled run. This is where a rain sensor or a cistern level belongs.
- **Per schedule slot:** in the slot's **Conditions** section under **More options**, on top of the global ones. A slot can also **ignore the global conditions** — a greenhouse does not care about rain.

Two deliberate behaviours:

- **A broken sensor never stops irrigation.** If the entity is missing, `unavailable`, or its state cannot be read as a number, the run proceeds and a warning is logged. Plants dying because a sensor died is the worse failure.
- **Conditions are checked at start time only.** A blocked run is skipped for that day, not retried later, and the *next run* times shown in the panel ignore conditions — today's sensor reading says nothing about tomorrow's.

Manual runs (*Run now*, *Run zone now*) always start, regardless of conditions. The one exception is `simple_irrigation.run_due_zones` and its button: it runs only what is due right now, and asks conditions and season like the scheduler does.

## Season

A **season** says when in the year schedules water by themselves — 1 April to 31 October, and nothing in winter, without switching every schedule off in autumn and remembering to switch it on again in spring. It is made of **periods**: a day and a month to a day and a month, both days included, the same every year. A period may run across New Year, and there may be several of them.

- **Settings → Season** is the season of the whole installation. One period is all most gardens need; with no period, schedules water all year, as they always have.
- **A schedule can bring its own.** In the slot editor and the cycle wizard, **Season** offers *Like the installation*, *All year* and *Own periods*. Own periods **take the place of** the installation's season, they are not added to it — a schedule from 1 March waters in March, even if the installation opens in April.

That is what makes one garden with different rhythms through the year possible, without duplicating zones:

| Schedule | Season |
|----------|--------|
| Lawn, daily | Own periods: 1 Jun – 31 Aug |
| Lawn, every 3 days | Own periods: 1 Apr – 31 May **and** 1 Sep – 31 Oct |
| Beds | Like the installation (1 Apr – 31 Oct) |
| Greenhouse | All year |

Together with a schedule's **fixed minutes**, each of them can also water for a different length of time.

- **Out of season a schedule is simply not due.** It stays switched on and keeps everything it is set to; nothing is reported as skipped, and nothing waits. Its *next run* — in the panel, on the card and in the `next_run` sensors — is the first one after its season opens again.
- **Manual runs never ask.** *Run now*, *Run zone now* and the services start at any time of the year — except `run_due_zones`, which only runs what is due.
- Overview, Schedule and Timetable say when the installation is out of season and when it comes back; a schedule with its own season shows its periods in its row. The 14-day strips and the card's week draw days out of season dashed.
- The date that counts is the day the schedule is due, in Home Assistant's time zone. Pause and conditions apply on top, as before.
