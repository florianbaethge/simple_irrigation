import { html, type TemplateResult } from "lit";

/** Schedule times are wall-clock values, always presented as 24-hour HH:MM. */
export function formatTime24(timeLocal: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeLocal.trim());
  if (!match) return timeLocal;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return timeLocal;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"));

/** Native time inputs follow the browser's clock preference; two selects do not. */
export function renderTime24Picker(
  label: string,
  timeLocal: string,
  onChange: (timeLocal: string) => void
): TemplateResult {
  const [hour = "00", minute = "00"] = formatTime24(timeLocal).split(":");
  // Lit applies the select's `.value` property before it inserts the dynamic
  // option list. A native select therefore falls back to option zero (00) on
  // first render, even when `hour`/`minute` contain a saved schedule time.
  // Marking the matching options selected as well makes initial rendering and
  // later edits deterministic while retaining `.value` for normal updates.
  return html`<span class="time24-picker" role="group" aria-label=${label}>
    <select
      aria-label=${`${label} HH`}
      .value=${hour}
      @change=${(event: Event) => {
        onChange(`${(event.target as HTMLSelectElement).value}:${minute}`);
      }}
    >
      ${HOURS.map(
        (value) => html`<option value=${value} .selected=${value === hour}>${value}</option>`
      )}
    </select>
    <span aria-hidden="true">:</span>
    <select
      aria-label=${`${label} MM`}
      .value=${minute}
      @change=${(event: Event) => {
        onChange(`${hour}:${(event.target as HTMLSelectElement).value}`);
      }}
    >
      ${MINUTES.map(
        (value) => html`<option value=${value} .selected=${value === minute}>${value}</option>`
      )}
    </select>
  </span>`;
}
