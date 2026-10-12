# Dashboard card

[← Back to the README](../README.md)

The integration ships a Lovelace card, `custom:simple-irrigation-card`, and registers it as a dashboard resource automatically — nothing to add under **Settings → Dashboards → Resources**. Pick it from the card picker as *Simple Irrigation Card*. (Dashboards kept in YAML mode cannot be written to: add `/simple_irrigation/simple-irrigation-card.js` as a `module` resource yourself.)

The card is one card type with a **view** option. Dropped on a dashboard with no options at all it picks the only installation and shows the status view:

```yaml
type: custom:simple-irrigation-card
```

![Status view — next run, its length and zones, the actions and the watering mode](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/card_status.png)

## Contents

- [Views](#views)
- [Options](#options)
- [Tap and hold](#tap-and-hold)
- [Manual run](#manual-run)
- [Badges](#badges)
- [Layout and theming](#layout-and-theming)

## Views

| `view` | Shows |
|--------|-------|
| `status` *(default)* | What happens next, how long it takes, and the two or three actions worth reaching for. While a run is active it leads with the remaining time of the open zone and lists the queue, with **Skip phase** beside **Stop**; during a Cycle & Soak rest it shows **Soaking** with the countdown. With water tracking it adds the expected litres of the next run, the last run, and a live figure while watering. |
| `zones` | Every zone with its runtime for the active mode: what is open, what is next, what is broken. |
| `schedule` | The next runs resolved into real dates — no cron rules to decode. |
| `week` | The current week as a timetable; bar height is the run's duration, position its time of day. |
| `run` | The manual run picker (see below). |

![Zones view — every zone with its runtime for the active mode](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/card_zones.png)

![Schedule view — the next runs resolved into real dates](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/card_schedule.png)

![Week view — the current week as a timetable, bar height is duration](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/card_week.png)

## Options

| Option | Default | Meaning |
|--------|---------|---------|
| `entry_id` | auto | Which installation. Optional — a single installation is picked automatically, and with several the one marked as default wins. |
| `view` | `status` | `status` · `zones` · `schedule` · `week` · `run` |
| `compact` | `false` | One tile-style row instead of the full card. In the `zones` view, a compact zone list. |
| `show_mode` | `true` | Eco / Normal / Extra selector on the status view |
| `manual_start` | `off` | `off` · `zones` · `slot` · `both` — adds a collapsible **Run now** section below the card |
| `manual_duration` | `false` | Offer a duration override in the zones picker |
| `actions` | `run_next, skip_today, pause_48h` | Any of `run_next` · `stop` · `skip_today` · `pause_48h` · `pause_until`. The first one is the primary button; `stop` only appears while something is running. |
| `next_runs` | `4` | How many runs the schedule view lists (1–12) |
| `zones` | `all` | `all` · `active` · an explicit list of zone ids (the zones' UUIDs, see *Download diagnostics*) |
| `tap_action` / `hold_action` | open the entity / open the panel | Header row and, in the compact layout, the whole row |
| `zone_tap_action` / `zone_hold_action` | open the zone / open the panel's Zones page | Zone rows in the `zones` view |
| `run_tap_action` / `run_hold_action` | open the run's slot / nothing | Rows in the `schedule` view and the bars of the `week` view |

A fully specified card — this is what every option looks like, not what you need:

```yaml
type: custom:simple-irrigation-card
entry_id: 1a2b3c…
view: status
compact: false
show_mode: true
manual_start: zones
manual_duration: false
actions:
  - run_next
  - stop
  - skip_today
next_runs: 4
zones: all
```

![Compact layout — one tile-style row with the primary action](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/card_compact.png)

## Tap and hold

Every row of the card carries a **tap** and a **long press** action, configured in the visual editor under *Interactions* or in YAML. Out of the box a tap opens what the row stands for and a long press opens the panel page it lives on — a zone row opens the zone's entity, holding it opens the panel's **Zones** page, and a run in the schedule or week view opens its own slot in the **Schedule** editor.

| `action` | Does |
|----------|------|
| `more-info` | Open the more-info dialog — the zone's entity on a zone row, the installation's otherwise. `entity` overrides it. |
| `panel` | Open the Simple Irrigation panel. `panel_page` picks `overview` · `zones` · `schedule` · `timetable` · `settings`; left out, the row picks the page it belongs to, and a run deep-links to its own slot. |
| `navigate` | Go to `navigation_path`, e.g. another dashboard view. |
| `url` | Open `url_path`. |
| `perform-action` | Call `perform_action` (`domain.service`) with optional `data` and `target`. |
| `none` | Nothing — the row stops being tappable at all, rather than looking clickable and doing nothing. |

```yaml
type: custom:simple-irrigation-card
view: zones
zone_tap_action:
  action: perform-action
  perform_action: simple_irrigation.run_zone
  data:
    zone_id: "..."      # the zone's UUID, see Download diagnostics
zone_hold_action:
  action: panel
  panel_page: zones
```

A `perform-action` is called with exactly the `data` written here: it does not learn which row was tapped, so the example above waters the same zone from every row. It fits a card narrowed to that one zone with `zones:`.

The panel is registered for administrators only. A `panel` action falls back to the more-info dialog for everyone else, so a shared dashboard does not send family members to an empty page.

The badge takes the same `tap_action` and `hold_action` (YAML only — badges have no visual editor).

![Card editor — the Interactions section with tap and long press per row kind](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/card_editor.png)

## Manual run

Selecting is separated from launching: nothing is watered until the start button is pressed, so a mis-tap on a chip costs nothing.

![Manual run picker — zone chips, duration override and the start button](https://raw.githubusercontent.com/florianbaethge/simple_irrigation/main/screenshots/card_run.png)

- **Zones** — pick any number. They run in the order you picked them — each chip carries its place — and are grouped into phases by the installation's *max parallel* limit and *exclusive* flags, like the zones of a schedule slot. The line above the start button spells the plan out before you press it: `20 + 20 + 12 min` one after another, `(20 ‖ 20) + 12 min` where two may water together. The same pipeline as `simple_irrigation.run_zone` (or `run_zone_with_duration` when the duration is overridden). A disabled zone stays visible but is not selectable; a zone with a missing output is selectable and fails loudly.
- **Slot** — runs a whole schedule slot like `simple_irrigation.run_schedule_slot`, reusing the slot's own zone list and runtimes. A manual slot run normally ignores the slot's conditions; the **Apply the slot conditions** toggle opts back in, and the run then refuses when a condition is not met.

## Badges

`custom:simple-irrigation-badge` puts the same facts in the badge row of a sections dashboard, without a card slot:

```yaml
type: custom:simple-irrigation-badge
badges:
  - state    # Watering · 7:24, or Idle
  - next     # Next 19:30
  - mode     # Normal
  - pause    # only while paused
  - issues   # only when a zone output is unusable
```

## Layout and theming

Colours come from the active theme, so the card follows light and dark mode and any custom theme without configuration. The layout reflows on the card's own width, not the screen's: below roughly 300 px the action column drops under the summary and the week view falls back to weekday initials, so the card is at home in a two-column section, a phone view or a full-width slot alike.

The card works for every user, not just admins — it uses its own websocket API rather than the admin panel's. That API hands out what the card shows and takes the card's actions: every user who can see the card can start, stop, skip and pause watering and change the mode. Nothing can be configured through it.
