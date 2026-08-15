const CARD_STRINGS = {
    name: "Simple Irrigation",
    description: "Status and controls for a Simple Irrigation installation.",
    entity: "Schedule",
    entityHelp: "Choose the enabled switch for an individual irrigation schedule.",
    title: "Title",
    showDetails: "Show details",
    missingConfig: "Choose a Simple Irrigation entity in the card editor.",
    missingEntity: "The configured entity does not exist.",
    unavailable: "Simple Irrigation is unavailable",
    loading: "Loading irrigation entities…",
    noDevice: "Choose an individual Simple Irrigation schedule switch.",
    idle: "Idle",
    running: "Running",
    preparing: "Preparing",
    stopping: "Stopping",
    paused: "Paused",
    error: "Error",
    unknown: "Unknown",
    activeZones: "Active zones",
    nextRun: "Next run",
    mode: "Watering mode",
    schedule: "Schedule",
    enabled: "Enabled",
    disabled: "Disabled",
    run: "Run schedule",
    stop: "Stop",
    actionFailed: "The action could not be completed.",
};

const DOMAIN = "simple_irrigation";
const CARD = "simple-irrigation-card";
const suffixes = {
    running: "binary_running", paused: "binary_paused", error: "binary_error",
    active: "sensor_active_zones", next: "sensor_next_run", mode: "mode",
    stop: "button_stop_all",
};
function friendly(state) {
    return String(state?.attributes.friendly_name || state?.entity_id || "");
}
function esc(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
class SimpleIrrigationCard extends HTMLElement {
    constructor() {
        super(...arguments);
        this.config = {};
        this.root = this.attachShadow({ mode: "open" });
        this.related = {};
        this.resolving = false;
        this.busy = false;
    }
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
            computeLabel: (schema) => ({ entity: CARD_STRINGS.entity, title: CARD_STRINGS.title, show_details: CARD_STRINGS.showDetails }[schema.name]),
            computeHelper: (schema) => schema.name === "entity" ? CARD_STRINGS.entityHelp : undefined,
            assertConfig: (config) => {
                if (config.entity !== undefined && typeof config.entity !== "string")
                    throw new Error("entity must be a string");
            },
        };
    }
    static getConfigElement() {
        return document.createElement("simple-irrigation-card-editor");
    }
    static getStubConfig(_hass, entities, entitiesFallback) {
        const candidates = [...(entities || []), ...(entitiesFallback || [])];
        const schedule = candidates.find((entityId) => _hass?.entities?.[entityId]?.platform === DOMAIN
            && _hass.entities[entityId]?.translation_key === "slot_enabled");
        return { entity: schedule || "", show_details: true };
    }
    setConfig(config) {
        if (!config || typeof config !== "object")
            throw new Error("Invalid Simple Irrigation card configuration");
        if (config.entity !== undefined && typeof config.entity !== "string")
            throw new Error("entity must be a string");
        this.config = { show_details: true, ...config };
        if (this.resolvedFor !== this.config.entity) {
            this.related = {};
            this.scheduleTarget = undefined;
        }
        this.render();
        void this.resolveEntities();
    }
    set hass(hass) {
        const previous = this.stateSignature(this._hass);
        this._hass = hass;
        if (previous !== this.stateSignature(hass))
            this.render();
        void this.resolveEntities();
    }
    getCardSize() { return this.config.show_details === false ? 2 : 4; }
    getGridOptions() { return { columns: 6, min_columns: 3 }; }
    async resolveEntities() {
        const entity = this.config.entity;
        if (!this._hass || !entity || this.resolving || this.resolvedFor === entity)
            return;
        this.resolving = true;
        try {
            const entries = await Promise.race([
                this._hass.callWS({ type: "config/entity_registry/list" }),
                new Promise((_, reject) => window.setTimeout(() => reject(new Error("Entity registry lookup timed out")), 5000)),
            ]);
            const anchor = entries.find((item) => item.entity_id === entity);
            const match = anchor?.unique_id?.match(/^(.+)_slot_(.+)_enabled$/);
            if (!anchor?.device_id || anchor.platform !== DOMAIN || !match) {
                this.error = CARD_STRINGS.noDevice;
                return;
            }
            this.scheduleTarget = { configEntryId: match[1], slotId: match[2] };
            const deviceEntries = entries.filter((item) => item.device_id === anchor.device_id && item.platform === DOMAIN);
            this.related = {};
            for (const [key, suffix] of Object.entries(suffixes)) {
                const found = deviceEntries.find((item) => item.unique_id?.endsWith(`_${suffix}`));
                if (found)
                    this.related[key] = found.entity_id;
            }
            this.related.schedule = entity;
            this.error = undefined;
            this.resolvedFor = entity;
        }
        catch {
            this.error = CARD_STRINGS.actionFailed;
        }
        finally {
            this.resolving = false;
            this.render();
        }
    }
    state(key) { const id = this.related[key]; return id ? this._hass?.states[id] : undefined; }
    stateSignature(hass) {
        if (!hass)
            return "";
        const ids = [this.config.entity, ...Object.values(this.related)].filter(Boolean);
        return ids.map((id) => {
            const state = hass.states[id];
            return state ? `${id}:${state.state}:${JSON.stringify(state.attributes)}` : `${id}:missing`;
        }).join("|");
    }
    status() {
        if (this.state("error")?.state === "on")
            return { text: CARD_STRINGS.error, icon: "mdi:alert-circle-outline", kind: "error" };
        const running = this.state("running");
        if (running?.state === "on") {
            const phase = String(running.attributes.run_state || "running");
            return { text: { preparing: CARD_STRINGS.preparing, stopping: CARD_STRINGS.stopping, running: CARD_STRINGS.running }[phase] || CARD_STRINGS.running, icon: "mdi:sprinkler-variant", kind: "active" };
        }
        if (this.state("paused")?.state === "on")
            return { text: CARD_STRINGS.paused, icon: "mdi:pause-circle-outline", kind: "paused" };
        return { text: CARD_STRINGS.idle, icon: "mdi:water-outline", kind: "idle" };
    }
    async action(key) {
        const state = this.state(key);
        if (!this._hass || this.busy)
            return;
        if (key === "run") {
            if (!this.scheduleTarget || this.state("schedule")?.state === "unavailable")
                return;
            this.busy = true;
            this.error = undefined;
            this.render();
            try {
                await this._hass.callService(DOMAIN, "run_schedule_slot", {
                    slot_id: this.scheduleTarget.slotId,
                    config_entry_id: this.scheduleTarget.configEntryId,
                });
            }
            catch {
                this.error = CARD_STRINGS.actionFailed;
            }
            finally {
                this.busy = false;
                this.render();
            }
            return;
        }
        if (!state || state.state === "unavailable")
            return;
        this.busy = true;
        this.error = undefined;
        this.render();
        try {
            await this._hass.callService("button", "press", {}, { entity_id: state.entity_id });
        }
        catch {
            this.error = CARD_STRINGS.actionFailed;
        }
        finally {
            this.busy = false;
            this.render();
        }
    }
    async changeMode(value) {
        const state = this.state("mode");
        if (!this._hass || !state || this.busy)
            return;
        this.busy = true;
        this.render();
        try {
            await this._hass.callService("select", "select_option", { option: value }, { entity_id: state.entity_id });
        }
        catch {
            this.error = CARD_STRINGS.actionFailed;
        }
        finally {
            this.busy = false;
            this.render();
        }
    }
    async toggleSchedule() {
        const state = this.state("schedule");
        if (!this._hass || !state || this.busy)
            return;
        this.busy = true;
        this.render();
        try {
            await this._hass.callService("switch", state.state === "on" ? "turn_off" : "turn_on", {}, { entity_id: state.entity_id });
        }
        catch {
            this.error = CARD_STRINGS.actionFailed;
        }
        finally {
            this.busy = false;
            this.render();
        }
    }
    render() {
        const anchor = this.config.entity ? this._hass?.states[this.config.entity] : undefined;
        let message = "";
        if (!this.config.entity)
            message = CARD_STRINGS.missingConfig;
        else if (this._hass && !anchor)
            message = CARD_STRINGS.missingEntity;
        else if (anchor && ["unavailable", "unknown"].includes(anchor.state))
            message = CARD_STRINGS.unavailable;
        else if (this.error && !this.resolvedFor)
            message = this.error;
        if (message) {
            this.root.innerHTML = `${this.styles()}<ha-card><div class="message"><ha-icon icon="mdi:sprinkler-variant"></ha-icon><span>${message}</span></div></ha-card>`;
            return;
        }
        if (!anchor)
            return;
        const status = this.status();
        const active = this.state("active"), next = this.state("next"), mode = this.state("mode"), schedule = this.state("schedule");
        const isRunning = this.state("running")?.state === "on";
        const options = Array.isArray(mode?.attributes.options) ? mode.attributes.options : [];
        let nextText = "—";
        if (next && !["unknown", "unavailable"].includes(next.state)) {
            const date = new Date(next.state);
            if (!Number.isNaN(date.getTime()))
                nextText = new Intl.DateTimeFormat(this._hass?.locale?.language, { dateStyle: "medium", timeStyle: "short" }).format(date);
        }
        const details = this.config.show_details === false ? "" : `<div class="details">
      <div><span>${CARD_STRINGS.activeZones}</span><strong>${esc(active?.state && active.state !== "unknown" ? active.state : "—")}</strong></div>
      <div><span>${CARD_STRINGS.nextRun}</span><strong>${esc(nextText)}</strong></div>
      ${schedule ? `<button class="row" id="schedule" ${this.busy || schedule.state === "unavailable" ? "disabled" : ""}><span>${CARD_STRINGS.schedule}</span><strong>${schedule.state === "on" ? CARD_STRINGS.enabled : CARD_STRINGS.disabled}</strong></button>` : ""}
      ${mode ? `<label><span>${CARD_STRINGS.mode}</span><select id="mode" ${this.busy || mode.state === "unavailable" ? "disabled" : ""}>${options.map((o) => `<option value="${esc(o)}" ${o === mode.state ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></label>` : ""}
    </div>`;
        this.root.innerHTML = `${this.styles()}<ha-card>
      <div class="head"><ha-icon icon="${status.icon}" class="${status.kind}"></ha-icon><div><h2>${esc(this.config.title || friendly(anchor))}</h2><p>${status.text}</p></div></div>
      ${details}${this.error ? `<div class="error">${esc(this.error)}</div>` : ""}
      <div class="actions"><button id="run" ${this.busy || isRunning || !this.scheduleTarget || schedule?.state !== "on" ? "disabled" : ""}><ha-icon icon="mdi:play"></ha-icon>${CARD_STRINGS.run}</button><button id="stop" ${this.busy || !isRunning || !this.state("stop") ? "disabled" : ""}><ha-icon icon="mdi:stop"></ha-icon>${CARD_STRINGS.stop}</button></div>
    </ha-card>`;
        this.root.querySelector("#run")?.addEventListener("click", () => void this.action("run"));
        this.root.querySelector("#stop")?.addEventListener("click", () => void this.action("stop"));
        this.root.querySelector("#schedule")?.addEventListener("click", () => void this.toggleSchedule());
        this.root.querySelector("#mode")?.addEventListener("change", (e) => void this.changeMode(e.target.value));
    }
    styles() {
        return `<style>
    :host{display:block}ha-card{box-sizing:border-box;padding:16px;color:var(--primary-text-color);background:var(--ha-card-background,var(--card-background-color))}
    .head{display:flex;align-items:center;gap:14px}.head ha-icon{--mdc-icon-size:32px;color:var(--secondary-text-color)}.head ha-icon.active{color:var(--state-active-color)}.head ha-icon.error{color:var(--error-color)}
    h2{font-size:var(--ha-font-size-l,20px);font-weight:500;line-height:1.2;margin:0}p{margin:3px 0 0;color:var(--secondary-text-color)}
    .details{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.details>div,.row,label{min-width:0;border-radius:10px;background:var(--secondary-background-color);padding:10px 12px;box-sizing:border-box;border:0;color:inherit;font:inherit;text-align:left}
    .details span{display:block;color:var(--secondary-text-color);font-size:12px;margin-bottom:3px}.details strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}.row{cursor:pointer}select{width:100%;border:0;background:transparent;color:var(--primary-text-color);font:inherit;padding:0}.actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.actions button{display:flex;align-items:center;gap:6px;border:0;border-radius:18px;padding:8px 14px;background:var(--primary-color);color:var(--text-primary-color);font:inherit;cursor:pointer}.actions button:disabled,.row:disabled{opacity:.45;cursor:default}.actions button+button{background:var(--secondary-background-color);color:var(--primary-text-color)}
    .message{min-height:100px;display:flex;align-items:center;justify-content:center;gap:10px;color:var(--secondary-text-color);text-align:center}.error{color:var(--error-color);font-size:13px;margin-top:10px}
    @media(max-width:400px){.details{grid-template-columns:1fr}.actions button{flex:1;justify-content:center}}
  </style>`;
    }
}
class SimpleIrrigationCardEditor extends HTMLElement {
    constructor() {
        super(...arguments);
        this.root = this.attachShadow({ mode: "open" });
        this.config = {};
    }
    set hass(value) {
        this._hass = value;
        const form = this.root.querySelector("ha-form");
        if (form)
            form.hass = value;
        else
            this.render();
    }
    setConfig(config) {
        this.config = { show_details: true, ...config };
        const form = this.root.querySelector("ha-form");
        if (form)
            form.data = this.config;
        else
            this.render();
    }
    render() {
        if (!this._hass)
            return;
        this.root.innerHTML = `<ha-form></ha-form>`;
        const form = this.root.querySelector("ha-form");
        form.hass = this._hass;
        form.data = this.config;
        form.schema = SimpleIrrigationCard.getConfigForm().schema;
        form.computeLabel = SimpleIrrigationCard.getConfigForm().computeLabel;
        form.computeHelper = SimpleIrrigationCard.getConfigForm().computeHelper;
        form.addEventListener("value-changed", (event) => {
            const detail = event.detail;
            if (!detail?.value)
                return;
            this.config = detail.value;
            this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this.config }, bubbles: true, composed: true }));
        });
    }
}
if (!customElements.get(CARD))
    customElements.define(CARD, SimpleIrrigationCard);
if (!customElements.get("simple-irrigation-card-editor"))
    customElements.define("simple-irrigation-card-editor", SimpleIrrigationCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === CARD))
    window.customCards.push({
        type: CARD, name: CARD_STRINGS.name, description: CARD_STRINGS.description, preview: false,
        documentationURL: "https://github.com/florianbaethge/simple_irrigation#lovelace-dashboard-card",
        getEntitySuggestion: (hass, entityId) => {
            const entry = hass.entities?.[entityId];
            return entry?.platform === DOMAIN
                && entry.translation_key === "slot_enabled"
                ? { config: { type: `custom:${CARD}`, entity: entityId, show_details: true } }
                : null;
        },
    });

export { SimpleIrrigationCard };
//# sourceMappingURL=simple-irrigation-card.js.map
