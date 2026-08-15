import { CARD_STRINGS as S } from "./card-strings";

type StateObj = { entity_id: string; state: string; attributes: Record<string, unknown> };
type RegistryEntry = { entity_id: string; device_id?: string; platform?: string; unique_id?: string; translation_key?: string };
type Hass = {
  states: Record<string, StateObj>;
  entities?: Record<string, { platform?: string; device_id?: string; translation_key?: string }>;
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  callService(domain: string, service: string, data?: Record<string, unknown>, target?: Record<string, unknown>): Promise<unknown>;
  locale?: { language?: string };
};
type CardConfig = { type?: string; entity?: string; title?: string; show_details?: boolean };

const DOMAIN = "simple_irrigation";
const CARD = "simple-irrigation-card";
const suffixes: Record<string, string> = {
  running: "binary_running", paused: "binary_paused", error: "binary_error",
  active: "sensor_active_zones", next: "sensor_next_run", mode: "mode",
  stop: "button_stop_all",
};

function friendly(state?: StateObj): string {
  return String(state?.attributes.friendly_name || state?.entity_id || "");
}
function esc(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}

export class SimpleIrrigationCard extends HTMLElement {
  private config: CardConfig = {};
  private _hass?: Hass;
  private root = this.attachShadow({ mode: "open" });
  private related: Record<string, string> = {};
  private resolvedFor?: string;
  private resolving = false;
  private busy = false;
  private error?: string;
  private scheduleTarget?: { slotId: string; configEntryId: string };

  static getConfigForm() {
    return {
      schema: [
        {
          name: "entity",
          required: true,
          selector: {
            entity: {
              filter: {
                integration: DOMAIN,
                domain: "switch",
              },
            },
          },
        },
        { name: "title", selector: { text: {} } },
        { name: "show_details", selector: { boolean: {} } },
      ],
      computeLabel: (schema: { name: string }) => ({ entity: S.entity, title: S.title, show_details: S.showDetails }[schema.name]),
      computeHelper: (schema: { name: string }) => schema.name === "entity" ? S.entityHelp : undefined,
      assertConfig: (config: CardConfig) => {
        if (config.entity !== undefined && typeof config.entity !== "string") throw new Error("entity must be a string");
      },
    };
  }

  static getConfigElement() {
    return document.createElement("simple-irrigation-card-editor");
  }

  static getStubConfig(_hass?: Hass, entities?: string[], entitiesFallback?: string[]) {
    const candidates = [...(entities || []), ...(entitiesFallback || [])];
    const schedule = candidates.find((entityId) =>
      _hass?.entities?.[entityId]?.platform === DOMAIN
      && _hass.entities[entityId]?.translation_key === "slot_enabled",
    );
    return { entity: schedule || "", show_details: true };
  }

  setConfig(config: CardConfig) {
    if (!config || typeof config !== "object") throw new Error("Invalid Simple Irrigation card configuration");
    if (config.entity !== undefined && typeof config.entity !== "string") throw new Error("entity must be a string");
    this.config = { show_details: true, ...config };
    if (this.resolvedFor !== this.config.entity) {
      this.related = {};
      this.scheduleTarget = undefined;
    }
    this.render();
    void this.resolveEntities();
  }

  set hass(hass: Hass) {
    const previous = this.stateSignature(this._hass);
    this._hass = hass;
    if (previous !== this.stateSignature(hass)) this.render();
    void this.resolveEntities();
  }

  getCardSize() { return this.config.show_details === false ? 2 : 4; }
  getGridOptions() { return { columns: 6, min_columns: 3 }; }

  private async resolveEntities() {
    const entity = this.config.entity;
    if (!this._hass || !entity || this.resolving || this.resolvedFor === entity) return;
    this.resolving = true;
    try {
      const entries = await Promise.race([
        this._hass.callWS<RegistryEntry[]>({ type: "config/entity_registry/list" }),
        new Promise<RegistryEntry[]>((_, reject) =>
          window.setTimeout(() => reject(new Error("Entity registry lookup timed out")), 5000),
        ),
      ]);
      const anchor = entries.find((item) => item.entity_id === entity);
      const match = anchor?.unique_id?.match(/^(.+)_slot_(.+)_enabled$/);
      if (!anchor?.device_id || anchor.platform !== DOMAIN || !match) {
        this.error = S.noDevice;
        return;
      }
      this.scheduleTarget = { configEntryId: match[1], slotId: match[2] };
      const deviceEntries = entries.filter((item) => item.device_id === anchor.device_id && item.platform === DOMAIN);
      this.related = {};
      for (const [key, suffix] of Object.entries(suffixes)) {
        const found = deviceEntries.find((item) => item.unique_id?.endsWith(`_${suffix}`));
        if (found) this.related[key] = found.entity_id;
      }
      this.related.schedule = entity;
      this.error = undefined;
      this.resolvedFor = entity;
    } catch {
      this.error = S.actionFailed;
    } finally {
      this.resolving = false;
      this.render();
    }
  }

  private state(key: string) { const id = this.related[key]; return id ? this._hass?.states[id] : undefined; }
  private stateSignature(hass?: Hass) {
    if (!hass) return "";
    const ids = [this.config.entity, ...Object.values(this.related)].filter(Boolean) as string[];
    return ids.map((id) => {
      const state = hass.states[id];
      return state ? `${id}:${state.state}:${JSON.stringify(state.attributes)}` : `${id}:missing`;
    }).join("|");
  }
  private status(): { text: string; icon: string; kind: string } {
    if (this.state("error")?.state === "on") return { text: S.error, icon: "mdi:alert-circle-outline", kind: "error" };
    const running = this.state("running");
    if (running?.state === "on") {
      const phase = String(running.attributes.run_state || "running");
      return { text: ({ preparing: S.preparing, stopping: S.stopping, running: S.running } as Record<string, string>)[phase] || S.running, icon: "mdi:sprinkler-variant", kind: "active" };
    }
    if (this.state("paused")?.state === "on") return { text: S.paused, icon: "mdi:pause-circle-outline", kind: "paused" };
    return { text: S.idle, icon: "mdi:water-outline", kind: "idle" };
  }

  private async action(key: "run" | "stop") {
    const state = this.state(key);
    if (!this._hass || this.busy) return;
    if (key === "run") {
      if (!this.scheduleTarget || this.state("schedule")?.state === "unavailable") return;
      this.busy = true; this.error = undefined; this.render();
      try {
        await this._hass.callService(DOMAIN, "run_schedule_slot", {
          slot_id: this.scheduleTarget.slotId,
          config_entry_id: this.scheduleTarget.configEntryId,
        });
      } catch { this.error = S.actionFailed; }
      finally { this.busy = false; this.render(); }
      return;
    }
    if (!state || state.state === "unavailable") return;
    this.busy = true; this.error = undefined; this.render();
    try { await this._hass.callService("button", "press", {}, { entity_id: state.entity_id }); }
    catch { this.error = S.actionFailed; }
    finally { this.busy = false; this.render(); }
  }

  private async changeMode(value: string) {
    const state = this.state("mode");
    if (!this._hass || !state || this.busy) return;
    this.busy = true; this.render();
    try { await this._hass.callService("select", "select_option", { option: value }, { entity_id: state.entity_id }); }
    catch { this.error = S.actionFailed; }
    finally { this.busy = false; this.render(); }
  }

  private async toggleSchedule() {
    const state = this.state("schedule");
    if (!this._hass || !state || this.busy) return;
    this.busy = true; this.render();
    try { await this._hass.callService("switch", state.state === "on" ? "turn_off" : "turn_on", {}, { entity_id: state.entity_id }); }
    catch { this.error = S.actionFailed; }
    finally { this.busy = false; this.render(); }
  }

  private render() {
    const anchor = this.config.entity ? this._hass?.states[this.config.entity] : undefined;
    let message = "";
    if (!this.config.entity) message = S.missingConfig;
    else if (this._hass && !anchor) message = S.missingEntity;
    else if (anchor && ["unavailable", "unknown"].includes(anchor.state)) message = S.unavailable;
    else if (this.error && !this.resolvedFor) message = this.error;
    if (message) { this.root.innerHTML = `${this.styles()}<ha-card><div class="message"><ha-icon icon="mdi:sprinkler-variant"></ha-icon><span>${message}</span></div></ha-card>`; return; }
    if (!anchor) return;
    const status = this.status();
    const active = this.state("active"), next = this.state("next"), mode = this.state("mode"), schedule = this.state("schedule");
    const isRunning = this.state("running")?.state === "on";
    const options = Array.isArray(mode?.attributes.options) ? mode!.attributes.options as string[] : [];
    let nextText = "—";
    if (next && !["unknown", "unavailable"].includes(next.state)) {
      const date = new Date(next.state);
      if (!Number.isNaN(date.getTime())) nextText = new Intl.DateTimeFormat(this._hass?.locale?.language, { dateStyle: "medium", timeStyle: "short" }).format(date);
    }
    const details = this.config.show_details === false ? "" : `<div class="details">
      <div><span>${S.activeZones}</span><strong>${esc(active?.state && active.state !== "unknown" ? active.state : "—")}</strong></div>
      <div><span>${S.nextRun}</span><strong>${esc(nextText)}</strong></div>
      ${schedule ? `<button class="row" id="schedule" ${this.busy || schedule.state === "unavailable" ? "disabled" : ""}><span>${S.schedule}</span><strong>${schedule.state === "on" ? S.enabled : S.disabled}</strong></button>` : ""}
      ${mode ? `<label><span>${S.mode}</span><select id="mode" ${this.busy || mode.state === "unavailable" ? "disabled" : ""}>${options.map((o) => `<option value="${esc(o)}" ${o === mode.state ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></label>` : ""}
    </div>`;
    this.root.innerHTML = `${this.styles()}<ha-card>
      <div class="head"><ha-icon icon="${status.icon}" class="${status.kind}"></ha-icon><div><h2>${esc(this.config.title || friendly(anchor))}</h2><p>${status.text}</p></div></div>
      ${details}${this.error ? `<div class="error">${esc(this.error)}</div>` : ""}
      <div class="actions"><button id="run" ${this.busy || isRunning || !this.scheduleTarget || schedule?.state !== "on" ? "disabled" : ""}><ha-icon icon="mdi:play"></ha-icon>${S.run}</button><button id="stop" ${this.busy || !isRunning || !this.state("stop") ? "disabled" : ""}><ha-icon icon="mdi:stop"></ha-icon>${S.stop}</button></div>
    </ha-card>`;
    this.root.querySelector("#run")?.addEventListener("click", () => void this.action("run"));
    this.root.querySelector("#stop")?.addEventListener("click", () => void this.action("stop"));
    this.root.querySelector("#schedule")?.addEventListener("click", () => void this.toggleSchedule());
    this.root.querySelector<HTMLSelectElement>("#mode")?.addEventListener("change", (e) => void this.changeMode((e.target as HTMLSelectElement).value));
  }

  private styles() { return `<style>
    :host{display:block}ha-card{box-sizing:border-box;padding:16px;color:var(--primary-text-color);background:var(--ha-card-background,var(--card-background-color))}
    .head{display:flex;align-items:center;gap:14px}.head ha-icon{--mdc-icon-size:32px;color:var(--secondary-text-color)}.head ha-icon.active{color:var(--state-active-color)}.head ha-icon.error{color:var(--error-color)}
    h2{font-size:var(--ha-font-size-l,20px);font-weight:500;line-height:1.2;margin:0}p{margin:3px 0 0;color:var(--secondary-text-color)}
    .details{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.details>div,.row,label{min-width:0;border-radius:10px;background:var(--secondary-background-color);padding:10px 12px;box-sizing:border-box;border:0;color:inherit;font:inherit;text-align:left}
    .details span{display:block;color:var(--secondary-text-color);font-size:12px;margin-bottom:3px}.details strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}.row{cursor:pointer}select{width:100%;border:0;background:transparent;color:var(--primary-text-color);font:inherit;padding:0}.actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.actions button{display:flex;align-items:center;gap:6px;border:0;border-radius:18px;padding:8px 14px;background:var(--primary-color);color:var(--text-primary-color);font:inherit;cursor:pointer}.actions button:disabled,.row:disabled{opacity:.45;cursor:default}.actions button+button{background:var(--secondary-background-color);color:var(--primary-text-color)}
    .message{min-height:100px;display:flex;align-items:center;justify-content:center;gap:10px;color:var(--secondary-text-color);text-align:center}.error{color:var(--error-color);font-size:13px;margin-top:10px}
    @media(max-width:400px){.details{grid-template-columns:1fr}.actions button{flex:1;justify-content:center}}
  </style>`; }
}

class SimpleIrrigationCardEditor extends HTMLElement {
  private root = this.attachShadow({ mode: "open" });
  private config: CardConfig = {};
  private _hass?: Hass;

  set hass(value: Hass) {
    this._hass = value;
    const form = this.root.querySelector("ha-form") as
      | (HTMLElement & Record<string, unknown>)
      | null;
    if (form) form.hass = value;
    else this.render();
  }
  setConfig(config: CardConfig) {
    this.config = { show_details: true, ...config };
    const form = this.root.querySelector("ha-form") as
      | (HTMLElement & Record<string, unknown>)
      | null;
    if (form) form.data = this.config;
    else this.render();
  }

  private render() {
    if (!this._hass) return;
    this.root.innerHTML = `<ha-form></ha-form>`;
    const form = this.root.querySelector("ha-form") as HTMLElement & Record<string, unknown>;
    form.hass = this._hass;
    form.data = this.config;
    form.schema = SimpleIrrigationCard.getConfigForm().schema;
    form.computeLabel = SimpleIrrigationCard.getConfigForm().computeLabel;
    form.computeHelper = SimpleIrrigationCard.getConfigForm().computeHelper;
    form.addEventListener("value-changed", (event) => {
      const detail = (event as CustomEvent<{ value: CardConfig }>).detail;
      if (!detail?.value) return;
      this.config = detail.value;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this.config }, bubbles: true, composed: true }));
    });
  }
}

if (!customElements.get(CARD)) customElements.define(CARD, SimpleIrrigationCard);
if (!customElements.get("simple-irrigation-card-editor")) customElements.define("simple-irrigation-card-editor", SimpleIrrigationCardEditor);

declare global { interface Window { customCards?: Array<Record<string, unknown>> } }
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === CARD)) window.customCards.push({
  type: CARD, name: S.name, description: S.description, preview: false,
  documentationURL: "https://github.com/florianbaethge/simple_irrigation#lovelace-dashboard-card",
  getEntitySuggestion: (hass: Hass, entityId: string) => {
    const entry = hass.entities?.[entityId];
    return entry?.platform === DOMAIN
      && entry.translation_key === "slot_enabled"
      ? { config: { type: `custom:${CARD}`, entity: entityId, show_details: true } }
      : null;
  },
});
