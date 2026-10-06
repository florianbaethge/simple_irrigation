import { css } from "lit";

/**
 * The concept's two colour sets map one-to-one onto Home Assistant's own theme
 * variables — its light/dark values for text, dividers and the primary colour
 * are literally the ones the design was drawn with. Only the alpha-derived
 * tints have no HA equivalent, so they are mixed here, with separate light and
 * dark strengths (a flat alpha reads muddy on a dark card).
 *
 * `[data-dark]` is set from `hass.themes.darkMode` rather than
 * `prefers-color-scheme`: a user can pick a dark HA theme on a light OS.
 */
export const cardStyles = css`
  :host {
    --si-fg: var(--primary-text-color);
    --si-fg2: var(--secondary-text-color);
    --si-div: var(--divider-color);
    --si-pri: var(--primary-color);
    --si-prifg: var(--text-primary-color, #fff);
    --si-err: var(--error-color, #db4437);
    --si-warn: var(--warning-color, #e07c00);
    --si-surface: var(--ha-card-background, var(--card-background-color, #fff));

    --si-soft: color-mix(in srgb, var(--primary-text-color) 5%, transparent);
    --si-tint: color-mix(in srgb, var(--si-pri) 12%, transparent);
    --si-errT: color-mix(in srgb, var(--si-err) 12%, transparent);
    --si-warnT: color-mix(in srgb, var(--si-warn) 12%, transparent);
    --si-errB: color-mix(in srgb, var(--si-err) 45%, transparent);
    --si-warnB: color-mix(in srgb, var(--si-warn) 45%, transparent);

    --si-mono: var(
      --ha-font-family-code,
      ui-monospace,
      "Roboto Mono",
      SFMono-Regular,
      monospace
    );

    display: block;
  }

  /* Several rows are full-width with their own padding; without this they
     overflow their card by exactly that padding and ha-card clips the trailing
     control (the Stop button on the manual-run row, most visibly). */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  :host([data-dark]) {
    --si-soft: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
    --si-tint: color-mix(in srgb, var(--si-pri) 18%, transparent);
    --si-errT: color-mix(in srgb, var(--si-err) 16%, transparent);
    --si-warnT: color-mix(in srgb, var(--si-warn) 16%, transparent);
  }

  ha-card {
    color: var(--si-fg);
    overflow: hidden;
    height: 100%;
    box-sizing: border-box;
  }

  button {
    font: inherit;
    cursor: pointer;
    color: inherit;
  }
  button:disabled {
    cursor: default;
    opacity: 0.5;
  }
  button:focus-visible,
  [tabindex]:focus-visible {
    outline: 2px solid var(--si-pri);
    outline-offset: 2px;
  }

  /* Rows that carry a tap/hold action. Configuring both to "none" drops the
     class, and the row goes back to being just a row — no pointer, no focus
     stop, nothing that promises an interaction it does not have. */
  .tappable {
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .head.tappable:hover,
  .ctap.tappable:hover,
  .zrow.tappable:hover,
  .zcrow.tappable:hover,
  .srun.tappable:hover,
  .wtrack.tappable:hover {
    background: var(--si-soft);
  }
  /* A bar is already the primary colour; tinting it would fight the legend. */
  .wbar.tappable:hover {
    filter: brightness(1.2);
  }
  @media (hover: none) {
    .tappable:hover {
      background: transparent;
      filter: none;
    }
  }

  /* ---- header ---------------------------------------------------------- */

  .head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 16px 0;
  }
  .head > ha-icon {
    --mdc-icon-size: 22px;
    color: var(--si-pri);
    flex: none;
  }
  .head .title {
    font-size: 16px;
    font-weight: 500;
    letter-spacing: -0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .head .count {
    margin-left: auto;
    font-size: 12.5px;
    color: var(--si-fg2);
    font-variant-numeric: tabular-nums;
    flex: none;
  }

  .pill {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--si-soft);
    color: var(--si-fg2);
    flex: none;
    white-space: nowrap;
  }
  .pill .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  .pill.pri {
    background: var(--si-tint);
    color: var(--si-pri);
  }
  .pill.warn {
    background: var(--si-warnT);
    color: var(--si-warn);
  }
  .pill.err {
    background: var(--si-errT);
    color: var(--si-err);
  }
  /* The issue counter is a quieter, sentence-case sibling of the state pill. */
  .pill.issues {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: normal;
    text-transform: none;
    padding: 3px 9px;
    gap: 5px;
  }
  .pill.issues ha-icon {
    --mdc-icon-size: 13px;
  }

  /* ---- status: idle ---------------------------------------------------- */

  .body {
    padding: 14px 16px 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-start;
  }
  .summary {
    flex: 1 1 150px;
    min-width: 0;
  }
  .label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--si-fg2);
  }
  .big {
    font-size: 26px;
    font-weight: 400;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin: 4px 0;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sub {
    font-size: 13.5px;
    color: var(--si-fg2);
    line-height: 1.5;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    margin-top: 12px;
    font-size: 12.5px;
    color: var(--si-fg2);
  }
  .meta > span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .meta ha-icon {
    --mdc-icon-size: 16px;
  }
  .meta strong {
    color: var(--si-fg);
    font-weight: 600;
  }

  .actions {
    flex: 0 1 148px;
    min-width: 138px;
    margin-left: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .btn {
    font-size: 13px;
    font-weight: 500;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--si-div);
    background: transparent;
    color: var(--si-fg);
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    text-align: left;
  }
  .btn ha-icon {
    --mdc-icon-size: 18px;
    color: var(--si-fg2);
    flex: none;
  }
  /* A resized card can end up narrower than any label; ellipsis beats clipping. */
  .btn {
    overflow: hidden;
  }
  .btn > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .btn.primary {
    background: var(--si-pri);
    color: var(--si-prifg);
    border-color: transparent;
  }
  .btn.primary ha-icon {
    color: inherit;
  }
  .btn.danger {
    border-color: var(--si-err);
    color: var(--si-err);
  }
  .btn.danger ha-icon {
    color: inherit;
  }
  /* Inline variant: sits in a row rather than in the action column. */
  .btn.inline {
    width: auto;
    padding: 9px 16px;
    justify-content: center;
  }
  .btn.small {
    padding: 8px 14px;
  }
  .btn.outline-pri {
    border-color: var(--si-pri);
    color: var(--si-pri);
  }
  .btn.outline-pri ha-icon {
    color: inherit;
  }

  .foot {
    flex: 1 1 100%;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding-top: 14px;
    border-top: 1px solid var(--si-div);
  }
  .cap {
    font-size: 12.5px;
    color: var(--si-fg2);
  }

  .seg {
    flex: none;
    margin-left: auto;
    display: inline-flex;
    border: 1px solid var(--si-div);
    border-radius: 9px;
    overflow: hidden;
  }
  .seg button {
    font-size: 12.5px;
    padding: 7px 14px;
    border: 0;
    background: transparent;
    color: var(--si-fg2);
    white-space: nowrap;
  }
  .seg button + button {
    border-left: 1px solid var(--si-div);
  }
  .seg button.on {
    background: var(--si-pri);
    color: var(--si-prifg);
  }
  .seg.tight button {
    font-size: 12px;
    padding: 6px 13px;
  }

  /* ---- status: running ------------------------------------------------- */

  .body.run {
    display: block;
    padding: 12px 16px 16px;
  }
  .big.pri {
    font-size: 36px;
    font-weight: 300;
    letter-spacing: -0.03em;
    line-height: 1.1;
    margin: 2px 0 10px;
    color: var(--si-pri);
  }
  .bar {
    height: 6px;
    border-radius: 999px;
    background: var(--si-soft);
    overflow: hidden;
  }
  .bar > i {
    display: block;
    height: 100%;
    background: var(--si-pri);
    transition: width 1s linear;
  }
  .bar.thin {
    height: 4px;
    margin-top: 10px;
  }
  .queue {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin-top: 14px;
  }
  .qrow {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13.5px;
    min-width: 0;
  }
  .qrow .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .qdot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--si-pri);
    flex: none;
  }
  .qrow.pending {
    color: var(--si-fg2);
  }
  .qrow.pending .qdot {
    background: transparent;
    border: 1px solid currentColor;
    box-sizing: border-box;
  }
  .qrow .val {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
    color: var(--si-pri);
    flex: none;
  }
  .qrow.pending .val {
    color: inherit;
    font-size: 12px;
  }
  .runfoot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 16px;
    flex-wrap: wrap;
  }
  .runbtns {
    display: flex;
    flex: none;
    gap: 8px;
    margin-left: auto;
  }
  .btn.inline.icon {
    padding: 9px 10px;
  }

  /* ---- status: edge states --------------------------------------------- */

  .state {
    padding: 14px 16px 16px;
  }
  .srow {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .srow > ha-icon {
    --mdc-icon-size: 20px;
    flex: none;
  }
  .srow .title {
    font-size: 15px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .stext {
    font-size: 14px;
    margin-top: 10px;
  }
  .stext strong {
    font-weight: 600;
  }
  .smono {
    font-family: var(--si-mono);
    font-size: 12px;
    color: var(--si-fg2);
    margin-top: 3px;
    word-break: break-all;
  }
  .snote {
    font-size: 12.5px;
    color: var(--si-fg2);
    margin-top: 3px;
  }
  .scode {
    font-family: var(--si-mono);
    font-size: 12px;
    color: var(--si-fg2);
    margin-top: 6px;
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--si-soft);
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .sbtns {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
  }

  /* ---- zones ----------------------------------------------------------- */

  .zbody {
    padding: 8px 16px 14px;
    display: flex;
    flex-direction: column;
  }
  .zrow {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 0;
    border-bottom: 1px solid var(--si-div);
    width: 100%;
    background: transparent;
    text-align: left;
    min-width: 0;
  }
  .zrow:last-of-type {
    border-bottom: 0;
  }
  .zrow.disabled {
    opacity: 0.55;
  }
  .zdot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: none;
  }
  .zdot.on {
    background: var(--si-pri);
  }
  .zdot.off {
    border: 1px solid var(--si-fg2);
    box-sizing: border-box;
  }
  .zdot.dis {
    border: 1px dashed var(--si-fg2);
    box-sizing: border-box;
  }
  .zwarn {
    --mdc-icon-size: 14px;
    color: var(--si-warn);
    margin: 0 -3px;
    flex: none;
  }
  .zmain {
    min-width: 0;
  }
  .zname {
    font-size: 14.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .zsub {
    font-size: 12px;
    color: var(--si-fg2);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .zsub.pri {
    color: var(--si-pri);
  }
  .zsub.warn {
    color: var(--si-warn);
  }
  .zdur {
    margin-left: auto;
    font-size: 12.5px;
    color: var(--si-fg2);
    font-variant-numeric: tabular-nums;
    flex: none;
  }
  .znote {
    font-size: 12px;
    color: var(--si-fg2);
    margin-top: 10px;
    line-height: 1.5;
  }

  /* zones, compact */
  .zc {
    padding: 6px 14px;
  }
  .zcrow {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--si-div);
    min-width: 0;
  }
  .zcrow:last-child {
    border-bottom: 0;
  }
  .zcrow .zdot {
    width: 7px;
    height: 7px;
  }
  .zcrow .name {
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .zcrow .val {
    margin-left: auto;
    font-size: 13px;
    color: var(--si-fg2);
    font-variant-numeric: tabular-nums;
    flex: none;
    padding-left: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* Only a live countdown earns the accent colour. */
  .zcrow.on .val {
    color: var(--si-pri);
  }

  /* ---- schedule -------------------------------------------------------- */

  .sbody {
    padding: 14px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .srun {
    border: 1px solid var(--si-div);
    border-radius: 10px;
    padding: 11px 13px;
  }
  .srun.next {
    border-left: 3px solid var(--si-pri);
  }
  .srun.far {
    border-style: dashed;
    opacity: 0.75;
  }
  .srun.far.next {
    border-left-style: solid;
  }
  .srun.skipped {
    opacity: 0.55;
  }
  .sline {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }
  .swhen {
    font-size: 14px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .swhat {
    font-size: 12.5px;
    color: var(--si-fg2);
  }
  .sdur {
    margin-left: auto;
    font-size: 12.5px;
    color: var(--si-pri);
    font-variant-numeric: tabular-nums;
  }
  .srun.far .sdur,
  .srun.skipped .sdur {
    color: var(--si-fg2);
  }
  .szones {
    font-size: 12.5px;
    color: var(--si-fg2);
    margin-top: 4px;
  }

  /* ---- week ------------------------------------------------------------ */

  .wbody {
    padding: 16px;
  }
  .wgrid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .wcol {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }
  .wday {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    color: var(--si-fg2);
  }
  .wcol.today .wday {
    color: var(--si-pri);
  }
  .wtrack {
    width: 100%;
    height: 86px;
    border-radius: 8px;
    background: var(--si-soft);
    border: 1px solid var(--si-div);
    position: relative;
    box-sizing: border-box;
  }
  .wcol.today .wtrack {
    border-color: var(--si-pri);
  }
  .wbar {
    position: absolute;
    left: 4px;
    right: 4px;
    border-radius: 3px;
    background: var(--si-pri);
  }
  .wbar.parity {
    background: transparent;
    border: 1px dashed var(--si-pri);
    box-sizing: border-box;
  }
  .wbar.paused {
    background: var(--si-fg2);
    opacity: 0.5;
  }
  .wtot {
    font-size: 11px;
    color: var(--si-fg2);
    font-variant-numeric: tabular-nums;
  }
  .wcol.today .wtot {
    color: var(--si-fg);
    font-weight: 600;
  }
  .wlegend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin-top: 12px;
    font-size: 11.5px;
    color: var(--si-fg2);
  }
  .wlegend > span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .lkey {
    width: 14px;
    height: 6px;
    border-radius: 3px;
    background: var(--si-pri);
    flex: none;
  }
  .lkey.dash {
    background: transparent;
    border: 1px dashed var(--si-pri);
    box-sizing: border-box;
  }

  /* ---- manual run ------------------------------------------------------ */

  .head.run {
    padding: 14px 16px 0;
  }
  .rbody {
    padding: 13px 16px 16px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 8px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    padding: 7px 13px;
    border-radius: 999px;
    background: transparent;
    color: var(--si-fg);
    border: 1px solid var(--si-div);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chip.on {
    background: var(--si-pri);
    color: var(--si-prifg);
    border-color: transparent;
  }
  .chip.warn {
    color: var(--si-warn);
    border-color: var(--si-warnB);
  }
  .chip.dis {
    color: var(--si-fg2);
    border: 1px dashed var(--si-div);
    opacity: 0.6;
  }
  .chip ha-icon {
    --mdc-icon-size: 16px;
    flex: none;
  }
  /* The place a picked zone has in the run. */
  .chip .order {
    flex: none;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    background: var(--si-prifg);
    color: var(--si-pri);
    font-size: 11px;
    font-weight: 700;
    line-height: 16px;
    text-align: center;
  }

  .rrow {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
    padding-top: 13px;
    border-top: 1px solid var(--si-div);
  }
  .rlaunch {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 14px;
  }
  .rlaunch .cap {
    line-height: 1.5;
  }
  .rlaunch .btn {
    margin-left: auto;
    width: auto;
    padding: 10px 16px;
    justify-content: center;
  }

  .slotrow {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 10px 0;
    border-bottom: 1px solid var(--si-div);
    width: 100%;
    background: transparent;
    border-left: 0;
    border-right: 0;
    border-top: 0;
    text-align: left;
    min-width: 0;
  }
  .slotrow:last-of-type {
    border-bottom: 0;
  }
  .slotrow.disabled {
    opacity: 0.55;
  }
  .radio {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    border: 1px solid var(--si-fg2);
    box-sizing: border-box;
    flex: none;
  }
  .radio.on {
    border: 5px solid var(--si-pri);
  }
  .slotmain {
    min-width: 0;
  }
  .slotname {
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .slotsub {
    font-size: 12px;
    color: var(--si-fg2);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .slotdur {
    margin-left: auto;
    font-size: 12.5px;
    color: var(--si-fg2);
    font-variant-numeric: tabular-nums;
    flex: none;
  }
  .slotrow.on .slotdur {
    color: var(--si-pri);
  }

  .toggle {
    flex: none;
    margin-left: auto;
    width: 34px;
    height: 20px;
    border-radius: 999px;
    background: var(--si-div);
    position: relative;
    border: 0;
    padding: 0;
  }
  .toggle .knob {
    position: absolute;
    left: 2px;
    top: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--si-surface);
    border: 1px solid var(--si-div);
    box-sizing: border-box;
    transition: left 0.15s ease;
  }
  .toggle.on {
    background: var(--si-pri);
  }
  .toggle.on .knob {
    left: 16px;
    background: #fff;
    border-color: transparent;
  }

  /* collapsed "Run now" header + the row a launched run leaves behind */
  .collapse {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 16px;
    width: 100%;
    background: transparent;
    border: 0;
    text-align: left;
    min-width: 0;
  }
  .collapse > ha-icon {
    --mdc-icon-size: 22px;
    color: var(--si-pri);
    flex: none;
  }
  .collapse .chev {
    --mdc-icon-size: 22px;
    color: var(--si-fg2);
    margin-left: auto;
    flex: none;
    transition: transform 0.15s ease;
  }
  .chevbtn {
    margin-left: auto;
    flex: none;
    background: transparent;
    border: 0;
    padding: 0;
    display: flex;
    align-items: center;
  }
  .chev.up {
    transform: rotate(180deg);
    margin-left: 0;
  }
  .cmain {
    min-width: 0;
  }
  .ctitle {
    font-size: 14.5px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .csub {
    font-size: 12.5px;
    color: var(--si-fg2);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .csub.pri {
    color: var(--si-pri);
    font-variant-numeric: tabular-nums;
  }
  .collapse .btn {
    margin-left: auto;
    width: auto;
    flex: none;
    padding: 9px 15px;
  }
  /* The run section is a sibling block under the main view, not a second card. */
  .section {
    border-top: 1px solid var(--si-div);
  }

  /* ---- compact --------------------------------------------------------- */

  .crow {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    width: 100%;
    background: transparent;
    border: 0;
    text-align: left;
    min-width: 0;
  }
  /* The row's tappable area; the action button beside it stays its own target. */
  .ctap {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1 1 auto;
    min-width: 0;
    padding: 0;
    background: transparent;
    border: 0;
    text-align: left;
  }
  .cname {
    font-size: 14.5px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cstate {
    font-size: 12.5px;
    color: var(--si-fg2);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cicon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--si-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
  .cicon ha-icon {
    --mdc-icon-size: 21px;
    color: var(--si-fg2);
  }
  .cicon.pri {
    background: var(--si-tint);
  }
  .cicon.pri ha-icon {
    color: var(--si-pri);
  }
  .cicon.warn ha-icon {
    color: var(--si-warn);
  }
  .cicon.err ha-icon {
    color: var(--si-err);
  }
  .cstate.pri {
    color: var(--si-pri);
  }
  .cstate.warn {
    color: var(--si-warn);
  }
  .cstate.err {
    color: var(--si-err);
  }
  .cbtn {
    margin-left: auto;
    flex: none;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    border: 1px solid var(--si-div);
    background: transparent;
    color: var(--si-pri);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cbtn.danger {
    color: var(--si-err);
  }
  .cbtn.muted {
    color: var(--si-fg2);
  }
  .cbtn ha-icon {
    --mdc-icon-size: 20px;
  }

  /* ---- shared ---------------------------------------------------------- */

  .empty {
    padding: 16px;
    font-size: 13.5px;
    color: var(--si-fg2);
    line-height: 1.5;
  }
  .error {
    margin: 0 16px 14px;
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--si-errT);
    color: var(--si-err);
    font-size: 12.5px;
  }

  .drip {
    animation: drip 1.8s ease-in-out infinite;
  }
  @keyframes drip {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .drip {
      animation: none;
    }
    .bar > i,
    .toggle .knob,
    .collapse .chev {
      transition: none;
    }
  }

  /* ---- narrow (≈ two columns of the sections grid) --------------------- */

  :host([data-narrow]) .head {
    padding: 14px 14px 0;
    gap: 10px;
  }
  :host([data-narrow]) .head > ha-icon {
    --mdc-icon-size: 20px;
  }
  :host([data-narrow]) .head .title {
    font-size: 15px;
  }
  :host([data-narrow]) .body {
    padding: 12px 14px 14px;
    gap: 12px;
    flex-direction: column;
    flex-wrap: nowrap;
  }
  :host([data-narrow]) .big {
    font-size: 24px;
  }
  :host([data-narrow]) .big.pri {
    font-size: 30px;
  }
  :host([data-narrow]) .sub {
    font-size: 12.5px;
  }
  :host([data-narrow]) .meta {
    gap: 5px 12px;
    margin-top: 10px;
    font-size: 11.5px;
  }
  :host([data-narrow]) .meta ha-icon {
    --mdc-icon-size: 15px;
  }
  /* The action column keeps its width but drops under the summary. */
  :host([data-narrow]) .actions {
    flex: 1 1 100%;
    width: 100%;
    margin-left: 0;
  }
  :host([data-narrow]) .foot {
    gap: 9px;
    padding-top: 11px;
  }
  :host([data-narrow]) .cap {
    font-size: 11.5px;
  }
  :host([data-narrow]) .seg button {
    font-size: 11.5px;
    padding: 6px 11px;
  }
  :host([data-narrow]) .body.run,
  :host([data-narrow]) .state,
  :host([data-narrow]) .sbody,
  :host([data-narrow]) .rbody {
    padding-left: 14px;
    padding-right: 14px;
  }
  :host([data-narrow]) .zbody {
    padding-left: 14px;
    padding-right: 14px;
  }
  :host([data-narrow]) .wbody {
    padding: 14px;
  }
  :host([data-narrow]) .wtrack {
    height: 64px;
  }
  :host([data-narrow]) .wgrid {
    gap: 4px;
  }
  :host([data-narrow]) .wday,
  :host([data-narrow]) .wtot {
    font-size: 10px;
  }
  /* The legend costs more room than it explains at this width. */
  :host([data-narrow]) .wlegend {
    display: none;
  }
  :host([data-narrow]) .rlaunch .btn,
  :host([data-narrow]) .runbtns {
    width: 100%;
    margin-left: 0;
  }
  :host([data-narrow]) .runbtns .btn {
    flex: 1;
  }
  :host([data-narrow]) .rlaunch,
  :host([data-narrow]) .runfoot {
    gap: 10px;
  }

  /* ---- tiny -----------------------------------------------------------
     Narrower than the concept's 232 px reference. A user can always drag a
     card down to three grid columns, so the layout has to shrink rather than
     clip — nothing here is a designed state, only a graceful floor. */

  :host([data-tiny]) .head,
  :host([data-tiny]) .body,
  :host([data-tiny]) .body.run,
  :host([data-tiny]) .state,
  :host([data-tiny]) .sbody,
  :host([data-tiny]) .rbody,
  :host([data-tiny]) .zbody,
  :host([data-tiny]) .wbody {
    padding-left: 10px;
    padding-right: 10px;
  }
  :host([data-tiny]) .big {
    font-size: 19px;
  }
  :host([data-tiny]) .big.pri {
    font-size: 24px;
  }
  :host([data-tiny]) .btn {
    padding: 9px 10px;
    gap: 7px;
    font-size: 12.5px;
  }
  :host([data-tiny]) .pill {
    /* The dot plus a word does not fit; the colour already carries the state. */
    display: none;
  }
  :host([data-tiny]) .seg {
    margin-left: 0;
  }
  :host([data-tiny]) .seg button {
    padding: 6px 8px;
    font-size: 11px;
  }
  :host([data-tiny]) .foot {
    gap: 6px;
  }
  :host([data-tiny]) .meta {
    font-size: 11px;
  }
  :host([data-tiny]) .wtrack {
    height: 52px;
  }
  :host([data-tiny]) .wday,
  :host([data-tiny]) .wtot {
    font-size: 9px;
    letter-spacing: 0;
  }
  :host([data-tiny]) .wgrid {
    gap: 2px;
  }
`;
