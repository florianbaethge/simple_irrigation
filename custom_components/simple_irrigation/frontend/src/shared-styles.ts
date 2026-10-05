import { css } from "lit";

/**
 * Shared visual system for the Simple Irrigation panel views.
 *
 * Ported from the advanced_cover integration's `sharedStyles`, minus the
 * cover-specific primitives (`.position-bar`, `.cond-row` sentence rows,
 * `.compass`). Every view imports `[sharedStyles, formLayoutStyles, css` …local… `]`
 * so cards, rows, buttons, chips, badges and dialogs stay identical across tabs.
 */
export const sharedStyles = css`
  ha-card {
    margin-bottom: 20px;
    border-radius: 14px;
  }
  .card-content {
    padding: 20px 22px 22px;
  }
  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 22px 0;
    font-size: 1.25rem;
    font-weight: 500;
    letter-spacing: -0.01em;
    line-height: 1.3;
  }
  .card-header ha-icon {
    --mdc-icon-size: 22px;
    color: var(--primary-color);
    flex-shrink: 0;
  }
  .card-header .header-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    font-weight: 400;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .intro {
    font-size: 0.875rem;
    color: var(--secondary-text-color);
    line-height: 1.5;
    margin: 6px 0 18px;
  }

  /* Expandable inline help (info icon) — tier 2 help text. */
  details.inline-help {
    margin: 6px 0 10px;
    font-size: 0.82rem;
  }
  details.inline-help summary {
    cursor: pointer;
    color: var(--secondary-text-color);
    list-style: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    user-select: none;
    transition: color 0.15s ease;
  }
  details.inline-help summary::-webkit-details-marker {
    display: none;
  }
  details.inline-help summary:hover,
  details.inline-help[open] summary {
    color: var(--primary-color);
  }
  details.inline-help summary:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    border-radius: 4px;
  }
  details.inline-help .inline-help-icon {
    --mdc-icon-size: 16px;
    flex-shrink: 0;
    color: currentColor;
  }
  details.inline-help p,
  details.inline-help .help-body {
    margin: 8px 0 4px;
    padding: 10px 14px;
    border-left: 3px solid var(--primary-color);
    border-radius: 0 8px 8px 0;
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    color: var(--secondary-text-color);
    line-height: 1.55;
    max-width: 640px;
  }
  details.inline-help .help-body code {
    font-family: var(--code-font-family, monospace);
    font-size: 0.92em;
    background: color-mix(in srgb, var(--primary-color) 10%, transparent);
    padding: 1px 5px;
    border-radius: 4px;
  }

  /* Tier-1 microcopy: one-line consequence, always visible under a control. */
  .hint {
    font-size: 0.8rem;
    color: var(--secondary-text-color);
    line-height: 1.4;
    margin: 4px 0 0;
  }

  .error {
    color: var(--error-color);
    margin: 8px 0;
  }
  .warning {
    color: var(--warning-color, #b85c00);
    margin: 8px 0;
    font-size: 0.875rem;
  }
  .muted {
    color: var(--secondary-text-color);
    font-size: 0.875rem;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: flex-end;
    margin-bottom: 12px;
  }
  .grow {
    flex: 1;
    min-width: 160px;
  }
  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--secondary-text-color);
    margin: 26px 0 10px;
  }
  .section-title::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--divider-color);
  }
  .section-title:first-child {
    margin-top: 0;
  }
  .section-desc {
    font-size: 0.825rem;
    color: var(--secondary-text-color);
    margin: 0 0 10px;
    line-height: 1.4;
  }

  /* Buttons */
  .btn,
  .btn-outline,
  .btn-danger,
  .btn-icon {
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 8px;
    padding: 8px 16px;
    cursor: pointer;
    border: 1px solid transparent;
    box-sizing: border-box;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      opacity 0.15s ease;
  }
  .btn {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  .btn:hover:not(:disabled) {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
  }
  .btn:disabled,
  .btn-outline:disabled,
  .btn-danger:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .btn-outline {
    background: transparent;
    color: var(--primary-color);
    border-color: var(--primary-color);
  }
  .btn-outline:hover:not(:disabled) {
    background: rgba(var(--rgb-primary-color, 33, 150, 243), 0.08);
  }
  .btn-danger {
    background: transparent;
    color: var(--error-color);
    border-color: var(--error-color);
  }
  .btn-danger:hover:not(:disabled) {
    background: rgba(244, 67, 54, 0.08);
  }
  .btn-icon {
    background: transparent;
    color: var(--primary-text-color);
    border: 1px solid var(--divider-color);
    padding: 6px 10px;
    line-height: 1;
  }
  .btn-icon:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
  .btn:focus-visible,
  .btn-outline:focus-visible,
  .btn-danger:focus-visible,
  .btn-icon:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  /* Inputs */
  label.field-label {
    display: block;
    font-size: 0.78rem;
    color: var(--secondary-text-color);
    margin-bottom: 4px;
  }
  input[type="text"],
  input[type="time"],
  input[type="number"],
  select {
    font: inherit;
    color: var(--primary-text-color);
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    padding: 8px 10px;
    box-sizing: border-box;
    width: 100%;
  }
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }
  input[type="range"] {
    width: 100%;
  }
  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
    font-size: 0.9rem;
  }

  /* Chips */
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    font: inherit;
    font-size: 0.8rem;
    padding: 5px 10px;
    border-radius: 14px;
    border: 1px solid var(--divider-color);
    background: transparent;
    color: var(--primary-text-color);
    cursor: pointer;
  }
  .chip.selected {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
    border-color: var(--primary-color);
  }
  .chip.readonly {
    cursor: default;
    color: var(--secondary-text-color);
  }
  .chip:disabled {
    opacity: 0.55;
    cursor: default;
  }

  /* Status badges */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
    color: var(--secondary-text-color);
  }
  .badge.badge-dot::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }
  .badge-primary {
    color: var(--primary-color);
  }
  .badge-warn {
    color: var(--warning-color, #b85c00);
  }
  .badge-danger {
    color: var(--error-color);
  }
  .badge-muted {
    color: var(--secondary-text-color);
  }
  .badge ha-icon {
    --mdc-icon-size: 14px;
  }

  /* Dialog (plain, works inside scoped registries) */
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 4vh 16px;
    z-index: 10;
    overflow-y: auto;
  }
  .dialog {
    background: var(--card-background-color);
    color: var(--primary-text-color);
    border-radius: 16px;
    width: 100%;
    max-width: 680px;
    padding: 26px 28px;
    box-sizing: border-box;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }
  .dialog h3 {
    margin: 0 0 20px;
    font-size: 1.3rem;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
    flex-wrap: wrap;
  }
  .dialog-actions .spacer {
    flex: 1;
  }

  /* Empty states */
  .empty-state {
    text-align: center;
    padding: 36px 20px;
    color: var(--secondary-text-color);
  }
  .empty-state ha-icon {
    --mdc-icon-size: 44px;
    opacity: 0.35;
    display: block;
    margin: 0 auto 10px;
  }
  .empty-state p {
    margin: 0 0 12px;
    font-size: 0.92rem;
    line-height: 1.5;
  }
  .empty-state .btn,
  .empty-state .btn-outline {
    margin-top: 4px;
  }

  table.plain {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  table.plain th,
  table.plain td {
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid var(--divider-color);
    vertical-align: top;
  }
  table.plain th {
    color: var(--secondary-text-color);
    font-weight: 500;
  }

  /* Preflight / status badge (would run / issue / unknown). */
  .preflight-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    padding: 3px 9px 3px 7px;
    border-radius: 999px;
    border: 1px solid transparent;
    white-space: nowrap;
  }
  .preflight-badge ha-icon {
    --mdc-icon-size: 15px;
  }
  .preflight-badge.would_run {
    color: var(--primary-color);
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    border-color: color-mix(in srgb, var(--primary-color) 45%, transparent);
  }
  .preflight-badge.would_skip {
    color: var(--warning-color, #f0b23a);
    background: color-mix(in srgb, var(--warning-color, #f0b23a) 12%, transparent);
    border-color: color-mix(in srgb, var(--warning-color, #f0b23a) 45%, transparent);
  }
  .preflight-badge.unknown {
    color: var(--secondary-text-color);
    background: color-mix(in srgb, var(--secondary-text-color) 12%, transparent);
    border-color: color-mix(in srgb, var(--secondary-text-color) 40%, transparent);
  }

  /* Segmented icon button group (run · edit · expand). */
  .icon-group {
    display: inline-flex;
    border: 1px solid var(--divider-color);
    border-radius: 9px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .icon-group button {
    font: inherit;
    border: none;
    background: transparent;
    color: var(--primary-text-color);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 38px;
    height: 34px;
    padding: 0 6px;
    border-left: 1px solid var(--divider-color);
    transition:
      background 0.12s ease,
      color 0.12s ease;
  }
  .icon-group button:first-child {
    border-left: none;
  }
  .icon-group button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    color: var(--primary-color);
  }
  .icon-group button.selected {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  .icon-group button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .icon-group ha-icon {
    --mdc-icon-size: 20px;
  }

  /* Compact list row: header + optional expanded detail stack vertically. */
  .compact-row {
    border: 1px solid var(--divider-color);
    border-left: 3px solid var(--primary-color);
    border-radius: 10px;
    background: var(--card-background-color);
    margin-bottom: 8px;
    overflow: hidden;
    transition: background 0.12s ease;
  }
  .compact-row:hover {
    background: color-mix(in srgb, var(--primary-color) 4%, var(--card-background-color));
  }
  .compact-row.inactive {
    border-left-color: var(--disabled-text-color, #6d7476);
  }
  .compact-row.warn {
    border-left-color: var(--warning-color, #f0b23a);
  }
  .compact-row.danger {
    border-left-color: var(--error-color, #d93025);
  }
  .compact-row-header {
    display: flex;
    align-items: center;
    gap: 10px 14px;
    padding: 12px 14px;
    flex-wrap: wrap;
  }
  .compact-row-main {
    flex: 1;
    min-width: 0;
  }
  .compact-row-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 10px;
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 4px;
    min-width: 0;
  }
  .compact-row-detail {
    padding: 12px 14px 14px;
    border-top: 1px solid var(--divider-color);
    margin-top: -2px;
  }
  /* A small heading inside a row's detail, over what it introduces. */
  .detail-caption {
    margin: 14px 0 6px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--secondary-text-color);
  }
  .compact-row-detail > .detail-caption:first-child {
    margin-top: 0;
  }

  /* Icon-only button with a guaranteed hit area + focus ring. */
  .iconbtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: var(--primary-text-color);
    cursor: pointer;
    flex-shrink: 0;
  }
  .iconbtn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    color: var(--primary-color);
  }
  .iconbtn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .iconbtn.danger:hover:not(:disabled) {
    background: color-mix(in srgb, var(--error-color) 14%, transparent);
    color: var(--error-color);
  }
  .iconbtn ha-icon {
    --mdc-icon-size: 22px;
  }
  .iconbtn:focus-visible,
  .icon-group button:focus-visible,
  .chip:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  /* Meta line with inline mdi icons. */
  .meta-line {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 0.8rem;
    color: var(--secondary-text-color);
    min-width: 0;
  }
  .meta-line .meta {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }
  .meta-line .meta.strong {
    color: var(--primary-text-color);
    font-weight: 600;
  }
  .meta-line ha-icon {
    --mdc-icon-size: 16px;
    flex-shrink: 0;
  }

  /* Segmented filter control (All / Enabled / Issues). */
  .segmented {
    display: inline-flex;
    border: 1px solid var(--divider-color);
    border-radius: 9px;
    overflow: hidden;
  }
  .segmented button {
    font: inherit;
    font-size: 0.8rem;
    border: none;
    border-left: 1px solid var(--divider-color);
    background: transparent;
    color: var(--secondary-text-color);
    padding: 6px 12px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .segmented button:first-child {
    border-left: none;
  }
  .segmented button.selected {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  .segmented button:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
  .segmented .count {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--warning-color, #f0b23a) 22%, transparent);
    color: var(--warning-color, #f0b23a);
  }
  .segmented button.selected .count {
    background: rgba(255, 255, 255, 0.25);
    color: inherit;
  }

  /* 14-day run strip (rhythm preview + expanded rhythm rows). */
  /* Two weeks in a row; on a phone one week under the other, so a day always
     sits under the same day and no leftover cell is stretched across the row. */
  .day-strip {
    display: grid;
    grid-template-columns: repeat(14, minmax(0, 1fr));
    gap: 4px;
    margin: 6px 0;
  }
  @container siview (max-width: 700px) {
    /* Two rows need air between them, and a cell a finger's worth of height. */
    .day-strip {
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 6px;
    }
    .day-strip .day-cell {
      height: 42px;
      font-size: 0.68rem;
    }
  }
  .day-strip .day-cell {
    min-width: 0;
    height: 34px;
    border-radius: 7px;
    border: 1px solid var(--divider-color);
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 0.62rem;
    line-height: 1.1;
    color: var(--secondary-text-color);
    box-sizing: border-box;
  }
  .day-strip .day-cell .dc-dow {
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .day-strip .day-cell .dc-dom {
    opacity: 0.8;
  }
  .day-strip .day-cell.run {
    background: color-mix(in srgb, var(--primary-color) 80%, var(--card-background-color));
    border-color: color-mix(in srgb, var(--primary-color) 45%, transparent);
    color: var(--text-primary-color, #fff);
  }
  /* Due by its rhythm, but out of season: drawn, not filled. */
  .day-strip .day-cell.off {
    border-style: dashed;
    border-color: color-mix(in srgb, var(--primary-color) 55%, transparent);
    background: transparent;
  }
  .day-strip .day-cell.today {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  /* Truncating text that must never wrap in a data row. */
  .ellipsis {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ---- Mobile / narrow (container query — collapses sidebar-open too) ---- */
  @container siview (max-width: 700px) {
    .card-content {
      padding: 14px 16px 16px;
    }
    .card-header {
      padding: 16px 16px 0;
      font-size: 1.15rem;
    }
    ha-card {
      border-radius: 12px;
    }
    .compact-row-header {
      padding: 12px 14px;
    }
    /* Touch targets: paired dialog buttons split the width. */
    .dialog-actions .btn,
    .dialog-actions .btn-outline,
    .dialog-actions .btn-danger {
      flex: 1;
      min-height: 44px;
    }
    .chip {
      min-height: 34px;
      display: inline-flex;
      align-items: center;
    }
  }
  /* Floating action button for the primary add action on narrow screens. */
  .fab {
    position: fixed;
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    width: 56px;
    height: 56px;
    border-radius: 18px;
    border: none;
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 6;
  }
  .fab ha-icon {
    --mdc-icon-size: 28px;
  }
  .fab:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
  @container siview (max-width: 700px) {
    /* A row's name is the one thing a phone must not cut off. */
    .compact-row-title .ellipsis {
      white-space: normal;
      overflow-wrap: anywhere;
    }
    .fab {
      display: inline-flex;
    }
    .hide-narrow {
      display: none !important;
    }
  }
  @container siview (min-width: 701px) {
    .only-narrow {
      display: none !important;
    }
    /* With the phone's drawer gone, the caption is the first thing in the detail. */
    .only-narrow + .detail-caption {
      margin-top: 0;
    }
  }
  /* What a row can do, behind its chevron on a phone: side by side. */
  .drawer-actions {
    display: flex;
    gap: 8px;
    padding: 12px 0 0;
  }
  .drawer-actions .btn-outline {
    flex: 1 1 0;
    min-width: 0;
    min-height: 44px;
    margin-top: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 10px;
    font-size: 0.9rem;
    --mdc-icon-size: 18px;
  }
  /* Details of a row that sit in its meta line on a wide screen and behind
     its chevron on a phone: the wrapper itself takes no part in the layout. */
  .meta-extra {
    display: contents;
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
      animation: none !important;
    }
  }
`;
