import { css } from "lit";

/** Shared stacked form layout: titles, helper text, full-width controls. */
export const formLayoutStyles = css`
  .field-block {
    margin-bottom: 20px;
  }
  .field-title {
    display: block;
    font-weight: 500;
    margin-bottom: 4px;
    color: var(--primary-text-color);
    font-size: 1rem;
  }
  .field-desc {
    font-size: 0.875rem;
    color: var(--secondary-text-color);
    margin-bottom: 10px;
    line-height: 1.45;
  }
  .field-row {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }
  .field-row ha-input {
    width: 100%;
    display: block;
  }
  .entity-picker-rows {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }
  .entity-picker-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    width: 100%;
  }
  .entity-picker-row ha-entity-picker {
    flex: 1;
    min-width: 0;
  }
  /* Guard rows carry up to three controls, so unlike .entity-picker-row they
     must wrap instead of overflowing on narrow screens. */
  .guard-rows {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }
  .guard-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 8px;
    width: 100%;
  }
  .guard-row ha-entity-picker {
    flex: 1 1 220px;
    min-width: 0;
  }
  .guard-row .guard-operator {
    flex: 0 0 160px;
  }
  .guard-row .guard-operator select.field-select {
    width: 100%;
  }
  .guard-row ha-input.guard-value {
    flex: 0 0 140px;
  }
  .guard-row ha-selector.guard-value {
    flex: 1 1 180px;
    min-width: 0;
  }
  .guard-row button.row-remove {
    flex: 0 0 auto;
    margin-left: auto;
  }
  /* Full-width note under a row (current reading, operator hint). */
  .guard-row .guard-reading {
    flex: 1 0 100%;
    margin: 0;
  }
  /* A plain label stacked above its own control (operator select, preset select) —
     the entity picker brings its own label, these do not. */
  .stacked-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .stacked-field-label {
    font-size: 0.75rem;
    color: var(--secondary-text-color);
  }
  ha-entity-picker {
    display: block;
    width: 100%;
  }
  button.row-remove {
    flex-shrink: 0;
    padding: 8px 12px;
    font-size: 0.875rem;
    border-radius: 4px;
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    color: var(--primary-text-color);
    cursor: pointer;
    font-family: inherit;
  }
  button.row-remove:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
  button.btn-outline {
    align-self: center;
    margin-top: 0;
    padding: 10px 18px;
    border-radius: 4px;
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    color: var(--primary-text-color);
    cursor: pointer;
    font-size: 1rem;
    font-family: inherit;
  }
  .entity-picker-rows > button.btn-outline {
    align-self: flex-start;
  }
  button.btn-outline:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
  button.add-row {
    align-self: flex-start;
    margin-top: 4px;
    padding: 8px 14px;
    font-size: 0.9rem;
  }
  .duration-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
    width: 100%;
  }
  .duration-row ha-input {
    width: 100%;
    display: block;
  }
  /* Three long labels do not fit two columns on a phone; one column keeps
     the floating label on a single line above its value. */
  @media (max-width: 480px) {
    .duration-row.cycle-soak-row {
      grid-template-columns: 1fr;
    }
  }
  select.field-select {
    width: 100%;
    max-width: 100%;
    padding: 10px 12px;
    border-radius: 4px;
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    color: var(--primary-text-color);
    font-size: 1rem;
    min-height: 48px;
    box-sizing: border-box;
  }
  .checkboxes {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .checkboxes label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 1rem;
  }
  .switch-rows {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .switch-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .switch-row ha-switch {
    flex-shrink: 0;
  }
  .switch-row .switch-row-label {
    font-size: 1rem;
    color: var(--primary-text-color);
    line-height: 1.3;
  }
  .action-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
  }
  .dialog-footer {
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
    box-sizing: border-box;
  }
  .dialog-footer-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    width: 100%;
  }
  .dialog-footer-lead {
    flex: 0 0 auto;
  }
  .dialog-footer-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-left: auto;
  }
`;
