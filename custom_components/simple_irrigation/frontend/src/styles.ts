import { css } from "lit";

export const panelStyles = css`
  :host {
    display: block;
    color: var(--primary-text-color);
  }
  .header {
    background-color: var(--app-header-background-color);
    color: var(--app-header-text-color, white);
    border-bottom: var(--app-header-border-bottom, none);
  }
  .toolbar {
    height: var(--header-height);
    display: flex;
    align-items: center;
    font-size: 20px;
    padding: 0 16px;
    font-weight: 400;
    box-sizing: border-box;
  }
  .main-title {
    margin: 0 0 0 24px;
    line-height: 20px;
    flex-grow: 1;
  }
  .version {
    font-size: 14px;
    opacity: 0.85;
  }
  ha-tab-group {
    margin-left: max(env(safe-area-inset-left), 24px);
    margin-right: max(env(safe-area-inset-right), 24px);
    --ha-tab-active-text-color: var(--app-header-text-color, white);
    --ha-tab-indicator-color: var(--app-header-text-color, white);
    --ha-tab-track-color: transparent;
  }
  .view {
    min-height: calc(100vh - 112px);
    display: flex;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
  }
  .view-inner {
    width: 100%;
    max-width: 840px;
  }
  .entry-picker {
    padding: 24px;
    max-width: 560px;
    margin: 0 auto;
  }
  .entry-picker h2 {
    margin: 0 0 8px;
    font-size: 1.5rem;
    font-weight: 600;
  }
  .entry-picker .lead {
    margin: 0 0 20px;
    color: var(--secondary-text-color);
    line-height: 1.5;
    font-size: 0.95rem;
  }
  .entry-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .entry-card {
    display: block;
    width: 100%;
    text-align: left;
    padding: 16px 18px;
    border-radius: 12px;
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    color: var(--primary-text-color);
    cursor: pointer;
    font: inherit;
    box-sizing: border-box;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }
  .entry-card:hover {
    border-color: var(--primary-color);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  }
  .entry-card:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
  .entry-card-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    margin-bottom: 6px;
  }
  .entry-card-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
    flex: 1;
    min-width: 0;
  }
  .entry-badge {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 4px 8px;
    border-radius: 6px;
    flex-shrink: 0;
  }
  .entry-badge-on {
    color: var(--primary-color);
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
  }
  .entry-badge-off {
    color: var(--warning-color, #b85c00);
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
  }
  .entry-badge-ha {
    color: var(--error-color);
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
  }
  .entry-card-desc {
    margin: 0;
    font-size: 0.875rem;
    color: var(--secondary-text-color);
    line-height: 1.45;
  }
  .howto-add {
    margin-top: 28px;
    padding: 16px;
    border-radius: 8px;
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--secondary-text-color);
  }
  .entry-picker a {
    color: var(--primary-color);
  }
  ha-card {
    margin-bottom: 16px;
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
  .error {
    color: var(--error-color);
    margin: 8px 0;
  }
  .muted {
    opacity: 0.8;
    font-size: 0.9rem;
  }
  .error {
    color: var(--error-color);
  }
`;
