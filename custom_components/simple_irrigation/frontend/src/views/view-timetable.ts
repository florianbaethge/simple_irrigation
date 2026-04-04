import { LitElement, html, css, nothing } from "lit";
import { defineCustomElementOnce, navigate } from "../helpers";
import { exportPath } from "../navigation";
import { t } from "../i18n";
import { weekdayLong } from "../date-format";
import { formatSlotTimeForProfile } from "../profile-datetime";
import {
  assignEntryLanes,
  buildTimetableEntries,
  entryDurationMinutesRounded,
  minutesToTimeLocal,
  TIMETABLE_BUCKET_INDICES,
  weekdayIndicesForDisplay,
  zoneDisplayName,
  zoneRowOrder,
  type TimetableBucket,
  type TimetableEntry,
} from "../timetable-model";
import type { HomeAssistant } from "../types";

export class ViewTimetable extends LitElement {
  static properties = {
    hass: { attribute: false },
    entryId: { type: String },
    installation: { type: Object },
  };

  hass!: HomeAssistant;
  entryId!: string;
  installation!: Record<string, unknown>;

  static styles = css`
    ha-card {
      margin-bottom: 16px;
    }
    .card-content {
      padding: 0 8px 16px;
    }
    .intro {
      font-size: 0.875rem;
      color: var(--secondary-text-color);
      line-height: 1.45;
      margin: 0 0 12px;
    }
    .table-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin: 0 -4px;
    }
    .tt-table {
      width: 100%;
      min-width: 520px;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 0.8125rem;
      background: var(--card-background-color, var(--ha-card-background));
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      overflow: hidden;
    }
    .tt-table th,
    .tt-table td {
      border: 1px solid var(--divider-color);
      vertical-align: top;
      padding: 6px 8px;
    }
    .tt-th-zone {
      width: 12%;
      max-width: 96px;
      text-align: left;
      font-weight: 600;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--secondary-text-color);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    .tt-th-bucket {
      width: 1.75rem;
      min-width: 1.75rem;
      max-width: 1.75rem;
      padding: 6px 2px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    .tt-th-day {
      text-align: center;
      font-weight: 600;
      font-size: 0.78rem;
      color: var(--primary-text-color);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    .tt-zone-name {
      text-align: left;
      font-weight: 600;
      font-size: 0.8125rem;
      line-height: 1.3;
      color: var(--primary-text-color);
      background: var(--card-background-color, var(--ha-card-background));
      word-break: break-word;
      hyphens: auto;
      padding: 6px 6px;
      vertical-align: middle;
    }
    .tt-bucket-icon {
      text-align: center;
      vertical-align: middle;
      padding: 4px 2px;
      width: 1.75rem;
      min-width: 1.75rem;
      max-width: 1.75rem;
      background: var(--card-background-color, var(--ha-card-background));
    }
    .tt-bucket-icon ha-icon {
      display: block;
      margin: 0 auto;
      color: var(--secondary-text-color);
      --mdc-icon-size: 18px;
      width: 18px;
      height: 18px;
    }
    .tt-bucket-cell {
      background: var(--card-background-color, var(--ha-card-background));
      padding: 4px 4px 6px;
      min-height: 52px;
    }
    .tt-blocks {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: stretch;
    }
    .tt-blocks--lanes {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 3px;
    }
    .tt-block {
      box-sizing: border-box;
      border-radius: 6px;
      padding: 5px 6px;
      font-size: 0.68rem;
      line-height: 1.25;
      min-height: 2.5rem;
      flex: 1 1 auto;
      min-width: 0;
      color: var(--text-primary-color, var(--primary-text-color));
      border: 1px solid transparent;
    }
    .tt-blocks--lanes .tt-block {
      flex: 1 1 calc(50% - 2px);
      min-width: calc(50% - 2px);
    }
    .tt-block--active {
      background: color-mix(in srgb, var(--primary-color) 78%, var(--card-background-color));
      border-color: color-mix(in srgb, var(--primary-color) 42%, transparent);
      color: var(--text-primary-color, var(--primary-text-color));
    }
    .tt-block--disabled {
      background: color-mix(in srgb, var(--disabled-color, #9e9e9e) 38%, var(--card-background-color));
      border-color: var(--divider-color);
      color: var(--secondary-text-color);
    }
    .tt-block:hover {
      filter: brightness(1.05);
    }
    .tt-block--clickable {
      cursor: pointer;
    }
    .tt-block--clickable:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .tt-block-time {
      font-weight: 600;
      display: block;
    }
    .tt-block-dur {
      font-size: 0.62rem;
      opacity: 0.92;
    }
    .foot {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid var(--divider-color);
      font-size: 0.75rem;
      color: var(--secondary-text-color);
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 14px;
      align-items: center;
    }
    .legend-sep {
      flex-shrink: 0;
      width: 1px;
      align-self: stretch;
      min-height: 1rem;
      margin: 2px 2px 2px 4px;
      background: var(--divider-color);
    }
    .legend-period {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      line-height: 1.35;
    }
    .legend-period ha-icon {
      flex-shrink: 0;
      color: var(--secondary-text-color);
      --mdc-icon-size: 18px;
      width: 18px;
      height: 18px;
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .swatch {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      flex-shrink: 0;
      border: 1px solid var(--divider-color);
    }
    .swatch--active {
      background: color-mix(in srgb, var(--primary-color) 78%, var(--card-background-color));
      border-color: color-mix(in srgb, var(--primary-color) 35%, transparent);
    }
    .swatch--disabled {
      background: color-mix(in srgb, var(--disabled-color, #9e9e9e) 38%, var(--card-background-color));
    }
    .empty {
      font-size: 0.875rem;
      color: var(--secondary-text-color);
      margin: 0;
      padding: 8px 0;
    }
    @media (max-width: 600px) {
      .intro {
        font-size: 0.8rem;
        margin-bottom: 8px;
      }
      .tt-table {
        min-width: 480px;
        font-size: 0.72rem;
      }
      .tt-table th,
      .tt-table td {
        padding: 4px 5px;
      }
      .tt-th-zone {
        font-size: 0.62rem;
        max-width: 80px;
      }
      .tt-th-bucket {
        width: 1.5rem;
        min-width: 1.5rem;
        max-width: 1.5rem;
      }
      .tt-th-day {
        font-size: 0.68rem;
      }
      .tt-zone-name {
        font-size: 0.72rem;
      }
      .tt-bucket-icon {
        padding: 3px 1px;
        width: 1.5rem;
        min-width: 1.5rem;
        max-width: 1.5rem;
      }
      .tt-bucket-icon ha-icon {
        --mdc-icon-size: 16px;
        width: 16px;
        height: 16px;
      }
      .tt-bucket-cell {
        min-height: 44px;
        padding: 3px 2px 4px;
      }
      .tt-block {
        font-size: 0.6rem;
        padding: 3px 4px;
        min-height: 2.1rem;
        border-radius: 4px;
      }
      .tt-block-dur {
        font-size: 0.55rem;
      }
      .foot {
        font-size: 0.68rem;
      }
      .legend-period ha-icon {
        --mdc-icon-size: 16px;
        width: 16px;
        height: 16px;
      }
    }
  `;

  private _bucketIcon(bucket: TimetableBucket): string {
    if (bucket === 0) return "mdi:weather-sunset-up";
    if (bucket === 1) return "mdi:white-balance-sunny";
    return "mdi:weather-sunset";
  }

  private _bucketAriaLabel(bucket: TimetableBucket): string {
    if (bucket === 0) return t(this.hass, "config_panel.timetable_bucket_aria_morning");
    if (bucket === 1) return t(this.hass, "config_panel.timetable_bucket_aria_day");
    return t(this.hass, "config_panel.timetable_bucket_aria_evening");
  }

  private _bucketLegendCaption(bucket: TimetableBucket): string {
    if (bucket === 0) return t(this.hass, "config_panel.timetable_legend_bucket_morning");
    if (bucket === 1) return t(this.hass, "config_panel.timetable_legend_bucket_day");
    return t(this.hass, "config_panel.timetable_legend_bucket_evening");
  }

  private _entryTooltip(e: TimetableEntry): string {
    const start = formatSlotTimeForProfile(this.hass, minutesToTimeLocal(e.startMin));
    const end = formatSlotTimeForProfile(this.hass, minutesToTimeLocal(e.endMin));
    const modeKey =
      e.mode === "eco"
        ? "config_panel.timetable_mode_eco"
        : e.mode === "extra"
          ? "config_panel.timetable_mode_extra"
          : "config_panel.timetable_mode_normal";
    const modeLabel = t(this.hass, modeKey);
    return t(this.hass, "config_panel.timetable_bar_tooltip", {
      start,
      end,
      mode: modeLabel,
    });
  }

  private _entriesForCell(
    map: Map<string, TimetableEntry[]>,
    weekday: number,
    zoneId: string,
    bucket: TimetableBucket
  ): TimetableEntry[] {
    return map.get(`${weekday}\t${zoneId}\t${bucket}`) ?? [];
  }

  private _openSlotEditor(slotId: string): void {
    if (!slotId || !this.entryId) return;
    const q = new URLSearchParams({ editSlot: slotId });
    navigate(this, `${exportPath(this.entryId, "schedule")}?${q.toString()}`);
  }

  private _blockKeydown(ev: KeyboardEvent, slotId: string): void {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._openSlotEditor(slotId);
    }
  }

  protected render() {
    const inst = this.installation ?? {};
    const zones = inst.zones as Record<string, unknown> | undefined;
    const slots = inst.schedule_slots as unknown[] | undefined;
    const zoneIds = zoneRowOrder(inst);
    const entries = buildTimetableEntries(inst);
    const laneInfo = assignEntryLanes(entries);

    const colOrder = weekdayIndicesForDisplay(
      this.hass?.locale?.first_weekday,
      this.hass?.locale?.language ?? this.hass?.language
    );

    if (!zones || zoneIds.length === 0) {
      return html`
        <ha-card .header=${t(this.hass, "config_panel.timetable_card_title")}>
          <div class="card-content">
            <p class="intro">${t(this.hass, "config_panel.timetable_intro")}</p>
            <p class="empty">${t(this.hass, "config_panel.timetable_empty_no_zones")}</p>
          </div>
        </ha-card>
      `;
    }

    if (!slots?.length) {
      return html`
        <ha-card .header=${t(this.hass, "config_panel.timetable_card_title")}>
          <div class="card-content">
            <p class="intro">${t(this.hass, "config_panel.timetable_intro")}</p>
            <p class="empty">${t(this.hass, "config_panel.timetable_empty_no_slots")}</p>
          </div>
        </ha-card>
      `;
    }

    const byCell = new Map<string, TimetableEntry[]>();
    for (const e of entries) {
      const k = `${e.weekday}\t${e.zoneId}\t${e.bucket}`;
      if (!byCell.has(k)) byCell.set(k, []);
      byCell.get(k)!.push(e);
    }

    return html`
      <ha-card .header=${t(this.hass, "config_panel.timetable_card_title")}>
        <div class="card-content">
          <p class="intro">${t(this.hass, "config_panel.timetable_intro")}</p>
          <div class="table-wrap">
            <table class="tt-table">
              <thead>
                <tr>
                  <th class="tt-th-zone" scope="col">${t(this.hass, "config_panel.timetable_col_zone")}</th>
                  <th class="tt-th-bucket" scope="col" aria-hidden="true"></th>
                  ${colOrder.map(
                    (wd) =>
                      html`<th class="tt-th-day" scope="col">${weekdayLong(this.hass, wd)}</th>`
                  )}
                </tr>
              </thead>
              <tbody>
                ${zoneIds.flatMap((zid) => {
                  const name = zoneDisplayName(inst, zid);
                  return TIMETABLE_BUCKET_INDICES.map((bucket, bi) => {
                    return html`
                      <tr>
                        ${bi === 0
                          ? html`<th class="tt-zone-name" scope="row" rowspan="3">${name}</th>`
                          : nothing}
                        <th
                          class="tt-bucket-icon"
                          scope="row"
                          aria-label=${this._bucketAriaLabel(bucket)}
                        >
                          <ha-icon icon=${this._bucketIcon(bucket)}></ha-icon>
                        </th>
                        ${colOrder.map((wd) => {
                          const cellEntries = [...this._entriesForCell(byCell, wd, zid, bucket)].sort(
                            (a, b) => a.startMin - b.startMin
                          );
                          const multiLane = cellEntries.some((e) => {
                            const info = laneInfo.get(e);
                            return info && info.maxLanes > 1;
                          });
                          return html`
                            <td class="tt-bucket-cell">
                              ${cellEntries.length
                                ? html`
                                    <div class="tt-blocks ${multiLane ? "tt-blocks--lanes" : ""}">
                                      ${cellEntries.map((e) => {
                                        const start = formatSlotTimeForProfile(
                                          this.hass,
                                          minutesToTimeLocal(e.startMin)
                                        );
                                        const end = formatSlotTimeForProfile(
                                          this.hass,
                                          minutesToTimeLocal(e.endMin)
                                        );
                                        const dur = entryDurationMinutesRounded(e);
                                        const durLabel = t(this.hass, "config_panel.timetable_duration_min", {
                                          n: dur,
                                        });
                                        return html`
                                          <div
                                            class="tt-block tt-block--clickable ${e.enabled
                                              ? "tt-block--active"
                                              : "tt-block--disabled"}"
                                            title=${this._entryTooltip(e)}
                                            role="button"
                                            tabindex="0"
                                            @click=${() => this._openSlotEditor(e.slotId)}
                                            @keydown=${(ev: KeyboardEvent) =>
                                              this._blockKeydown(ev, e.slotId)}
                                          >
                                            <span class="tt-block-time">${start} – ${end}</span>
                                            <span class="tt-block-dur">${durLabel}</span>
                                          </div>
                                        `;
                                      })}
                                    </div>
                                  `
                                : nothing}
                            </td>
                          `;
                        })}
                      </tr>
                    `;
                  });
                })}
              </tbody>
            </table>
          </div>
          <div class="foot">
            <div class="legend" role="group" aria-label=${t(this.hass, "config_panel.timetable_legend_label")}>
              <span class="legend-item">
                <span class="swatch swatch--active" aria-hidden="true"></span>
                ${t(this.hass, "config_panel.timetable_legend_active")}
              </span>
              <span class="legend-item">
                <span class="swatch swatch--disabled" aria-hidden="true"></span>
                ${t(this.hass, "config_panel.timetable_legend_disabled")}
              </span>
              <span class="legend-sep" aria-hidden="true"></span>
              ${TIMETABLE_BUCKET_INDICES.map(
                (b) => html`
                  <span class="legend-period">
                    <ha-icon icon=${this._bucketIcon(b)}></ha-icon>
                    <span>${this._bucketLegendCaption(b)}</span>
                  </span>
                `
              )}
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }
}

defineCustomElementOnce("si-view-timetable", ViewTimetable);
