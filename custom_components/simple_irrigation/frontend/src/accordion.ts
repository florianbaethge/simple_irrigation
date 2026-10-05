import { css, html, nothing, type TemplateResult } from "lit";

/**
 * Editors as an accordion: every section closed to one line that says what it
 * holds, at most one of them open. The usual case -- when, which zones -- is
 * the first thing on the screen, and what a schedule can do besides is there
 * to open, not there to scroll past.
 */
export interface AccordionSection {
  id: string;
  icon: string;
  label: string;
  /** What the section holds, in a line. */
  summary: string;
  /** "muted": nothing set, the default applies. "warn": something is missing. */
  tone?: "" | "muted" | "warn";
  body: () => unknown;
}

export function renderAccordion(
  sections: AccordionSection[],
  openId: string | null,
  onToggle: (id: string | null) => void
): TemplateResult {
  return html`${sections.map((section) => {
    const open = section.id === openId;
    return html`
      <section class="acc ${open ? "open" : ""}" data-section=${section.id}>
        <button
          type="button"
          class="acc-head"
          aria-expanded=${open ? "true" : "false"}
          @click=${(e: Event) => {
            const host = (e.currentTarget as HTMLElement).closest(".acc");
            onToggle(open ? null : section.id);
            // Once it has rendered: the section that opened, in view.
            if (!open) {
              requestAnimationFrame(() =>
                requestAnimationFrame(() =>
                  host?.scrollIntoView({ block: "nearest", behavior: "smooth" })
                )
              );
            }
          }}
        >
          <span class="acc-icon"><ha-icon icon=${section.icon}></ha-icon></span>
          <span class="acc-text">
            <span class="acc-label">${section.label}</span>
            <span class="acc-summary ${section.tone ?? ""}">${section.summary}</span>
          </span>
          <ha-icon class="acc-chevron" icon="mdi:chevron-down"></ha-icon>
        </button>
        ${open ? html`<div class="acc-body">${section.body()}</div>` : nothing}
      </section>
    `;
  })}`;
}

/** The line between what everybody sets and what only some do. */
export function renderAccordionGroup(label: string): TemplateResult {
  return html`<div class="acc-group">${label}</div>`;
}

export const accordionStyles = css`
  .acc {
    border: 1px solid var(--divider-color);
    border-radius: 12px;
    margin-bottom: 10px;
    transition: border-color 0.15s ease;
  }
  .acc.open {
    border-color: color-mix(in srgb, var(--primary-color) 55%, var(--divider-color));
  }
  .acc-head {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: none;
    border-radius: 11px;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .acc-head:hover {
    background: color-mix(in srgb, var(--primary-color) 6%, transparent);
  }
  .acc-head:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
  .acc-icon {
    flex: none;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--primary-color) 14%, transparent);
    color: var(--primary-color);
    --mdc-icon-size: 18px;
  }
  .acc-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .acc-label {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--secondary-text-color);
  }
  .acc.open .acc-label {
    color: var(--primary-color);
  }
  .acc-summary {
    font-size: 0.92rem;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
  .acc-summary.muted {
    color: var(--secondary-text-color);
  }
  .acc-summary.warn {
    color: var(--warning-color, #f0b23a);
  }
  .acc-chevron {
    flex: none;
    color: var(--secondary-text-color);
    --mdc-icon-size: 20px;
    transition: transform 0.15s ease;
  }
  .acc.open .acc-chevron {
    transform: rotate(180deg);
  }
  .acc-body {
    padding: 4px 14px 14px;
  }
  .acc-body > :first-child {
    margin-top: 0;
  }
  .acc-body > :last-child {
    margin-bottom: 0;
  }
  .acc-group {
    margin: 16px 2px 8px;
    font-size: 0.78rem;
    color: var(--secondary-text-color);
  }
  /* The row above an accordion: what the thing is called, and its switch. */
  .acc-lead {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  .acc-lead ha-input {
    flex: 1;
    min-width: 0;
  }
  /* "More" in a dialog's footer: the rare and the final, out of the way. */
  .more-menu {
    position: relative;
  }
  .more-menu > summary {
    list-style: none;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid var(--divider-color);
    color: var(--secondary-text-color);
    cursor: pointer;
    --mdc-icon-size: 20px;
  }
  .more-menu > summary::-webkit-details-marker {
    display: none;
  }
  .more-menu[open] > summary,
  .more-menu > summary:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
  .more-menu .more-pop {
    position: absolute;
    left: 0;
    bottom: calc(100% + 6px);
    z-index: 3;
    min-width: 220px;
    padding: 6px;
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    background: var(--card-background-color);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .more-menu .more-pop button {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: none;
    border-radius: 6px;
    background: none;
    color: var(--primary-text-color);
    font: inherit;
    text-align: left;
    cursor: pointer;
    --mdc-icon-size: 18px;
  }
  .more-menu .more-pop button:hover {
    background: color-mix(in srgb, var(--primary-color) 10%, transparent);
  }
  .more-menu .more-pop button.danger {
    color: var(--error-color);
  }
`;
