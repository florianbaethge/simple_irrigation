/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$2=globalThis,e$2=t$2.ShadowRoot&&(void 0===t$2.ShadyCSS||t$2.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s$2=Symbol(),o$4=new WeakMap;let n$3 = class n{constructor(t,e,o){if(this._$cssResult$=true,o!==s$2)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e;}get styleSheet(){let t=this.o;const s=this.t;if(e$2&&void 0===t){const e=void 0!==s&&1===s.length;e&&(t=o$4.get(s)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),e&&o$4.set(s,t));}return t}toString(){return this.cssText}};const r$4=t=>new n$3("string"==typeof t?t:t+"",void 0,s$2),i$3=(t,...e)=>{const o=1===t.length?t[0]:e.reduce((e,s,o)=>e+(t=>{if(true===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[o+1],t[0]);return new n$3(o,t,s$2)},S$1=(s,o)=>{if(e$2)s.adoptedStyleSheets=o.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const e of o){const o=document.createElement("style"),n=t$2.litNonce;void 0!==n&&o.setAttribute("nonce",n),o.textContent=e.cssText,s.appendChild(o);}},c$2=e$2?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return r$4(e)})(t):t;

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:i$2,defineProperty:e$1,getOwnPropertyDescriptor:h$1,getOwnPropertyNames:r$3,getOwnPropertySymbols:o$3,getPrototypeOf:n$2}=Object,a$1=globalThis,c$1=a$1.trustedTypes,l$1=c$1?c$1.emptyScript:"",p$1=a$1.reactiveElementPolyfillSupport,d$1=(t,s)=>t,u$1={toAttribute(t,s){switch(s){case Boolean:t=t?l$1:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t);}return t},fromAttribute(t,s){let i=t;switch(s){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t);}catch(t){i=null;}}return i}},f$1=(t,s)=>!i$2(t,s),b$1={attribute:true,type:String,converter:u$1,reflect:false,useDefault:false,hasChanged:f$1};Symbol.metadata??=Symbol("metadata"),a$1.litPropertyMetadata??=new WeakMap;let y$1 = class y extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t);}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,s=b$1){if(s.state&&(s.attribute=false),this._$Ei(),this.prototype.hasOwnProperty(t)&&((s=Object.create(s)).wrapped=true),this.elementProperties.set(t,s),!s.noAccessor){const i=Symbol(),h=this.getPropertyDescriptor(t,i,s);void 0!==h&&e$1(this.prototype,t,h);}}static getPropertyDescriptor(t,s,i){const{get:e,set:r}=h$1(this.prototype,t)??{get(){return this[s]},set(t){this[s]=t;}};return {get:e,set(s){const h=e?.call(this);r?.call(this,s),this.requestUpdate(t,h,i);},configurable:true,enumerable:true}}static getPropertyOptions(t){return this.elementProperties.get(t)??b$1}static _$Ei(){if(this.hasOwnProperty(d$1("elementProperties")))return;const t=n$2(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties);}static finalize(){if(this.hasOwnProperty(d$1("finalized")))return;if(this.finalized=true,this._$Ei(),this.hasOwnProperty(d$1("properties"))){const t=this.properties,s=[...r$3(t),...o$3(t)];for(const i of s)this.createProperty(i,t[i]);}const t=this[Symbol.metadata];if(null!==t){const s=litPropertyMetadata.get(t);if(void 0!==s)for(const[t,i]of s)this.elementProperties.set(t,i);}this._$Eh=new Map;for(const[t,s]of this.elementProperties){const i=this._$Eu(t,s);void 0!==i&&this._$Eh.set(i,t);}this.elementStyles=this.finalizeStyles(this.styles);}static finalizeStyles(s){const i=[];if(Array.isArray(s)){const e=new Set(s.flat(1/0).reverse());for(const s of e)i.unshift(c$2(s));}else void 0!==s&&i.push(c$2(s));return i}static _$Eu(t,s){const i=s.attribute;return  false===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=false,this.hasUpdated=false,this._$Em=null,this._$Ev();}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this));}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.();}removeController(t){this._$EO?.delete(t);}_$E_(){const t=new Map,s=this.constructor.elementProperties;for(const i of s.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t);}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return S$1(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(true),this._$EO?.forEach(t=>t.hostConnected?.());}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.());}attributeChangedCallback(t,s,i){this._$AK(t,i);}_$ET(t,s){const i=this.constructor.elementProperties.get(t),e=this.constructor._$Eu(t,i);if(void 0!==e&&true===i.reflect){const h=(void 0!==i.converter?.toAttribute?i.converter:u$1).toAttribute(s,i.type);this._$Em=t,null==h?this.removeAttribute(e):this.setAttribute(e,h),this._$Em=null;}}_$AK(t,s){const i=this.constructor,e=i._$Eh.get(t);if(void 0!==e&&this._$Em!==e){const t=i.getPropertyOptions(e),h="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:u$1;this._$Em=e;const r=h.fromAttribute(s,t.type);this[e]=r??this._$Ej?.get(e)??r,this._$Em=null;}}requestUpdate(t,s,i,e=false,h){if(void 0!==t){const r=this.constructor;if(false===e&&(h=this[t]),i??=r.getPropertyOptions(t),!((i.hasChanged??f$1)(h,s)||i.useDefault&&i.reflect&&h===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,i))))return;this.C(t,s,i);} false===this.isUpdatePending&&(this._$ES=this._$EP());}C(t,s,{useDefault:i,reflect:e,wrapped:h},r){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??s??this[t]),true!==h||void 0!==r)||(this._$AL.has(t)||(this.hasUpdated||i||(s=void 0),this._$AL.set(t,s)),true===e&&this._$Em!==t&&(this._$Eq??=new Set).add(t));}async _$EP(){this.isUpdatePending=true;try{await this._$ES;}catch(t){Promise.reject(t);}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,s]of this._$Ep)this[t]=s;this._$Ep=void 0;}const t=this.constructor.elementProperties;if(t.size>0)for(const[s,i]of t){const{wrapped:t}=i,e=this[s];true!==t||this._$AL.has(s)||void 0===e||this.C(s,void 0,i,e);}}let t=false;const s=this._$AL;try{t=this.shouldUpdate(s),t?(this.willUpdate(s),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(s)):this._$EM();}catch(s){throw t=false,this._$EM(),s}t&&this._$AE(s);}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=true,this.firstUpdated(t)),this.updated(t);}_$EM(){this._$AL=new Map,this.isUpdatePending=false;}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return  true}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM();}updated(t){}firstUpdated(t){}};y$1.elementStyles=[],y$1.shadowRootOptions={mode:"open"},y$1[d$1("elementProperties")]=new Map,y$1[d$1("finalized")]=new Map,p$1?.({ReactiveElement:y$1}),(a$1.reactiveElementVersions??=[]).push("2.1.2");

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$1=globalThis,i$1=t=>t,s$1=t$1.trustedTypes,e=s$1?s$1.createPolicy("lit-html",{createHTML:t=>t}):void 0,h="$lit$",o$2=`lit$${Math.random().toFixed(9).slice(2)}$`,n$1="?"+o$2,r$2=`<${n$1}>`,l=document,c=()=>l.createComment(""),a=t=>null===t||"object"!=typeof t&&"function"!=typeof t,u=Array.isArray,d=t=>u(t)||"function"==typeof t?.[Symbol.iterator],f="[ \t\n\f\r]",v=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,_=/-->/g,m=/>/g,p=RegExp(`>|${f}(?:([^\\s"'>=/]+)(${f}*=${f}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),g=/'/g,$=/"/g,y=/^(?:script|style|textarea|title)$/i,x=t=>(i,...s)=>({_$litType$:t,strings:i,values:s}),b=x(1),E=Symbol.for("lit-noChange"),A=Symbol.for("lit-nothing"),C=new WeakMap,P=l.createTreeWalker(l,129);function V(t,i){if(!u(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==e?e.createHTML(i):i}const N=(t,i)=>{const s=t.length-1,e=[];let n,l=2===i?"<svg>":3===i?"<math>":"",c=v;for(let i=0;i<s;i++){const s=t[i];let a,u,d=-1,f=0;for(;f<s.length&&(c.lastIndex=f,u=c.exec(s),null!==u);)f=c.lastIndex,c===v?"!--"===u[1]?c=_:void 0!==u[1]?c=m:void 0!==u[2]?(y.test(u[2])&&(n=RegExp("</"+u[2],"g")),c=p):void 0!==u[3]&&(c=p):c===p?">"===u[0]?(c=n??v,d=-1):void 0===u[1]?d=-2:(d=c.lastIndex-u[2].length,a=u[1],c=void 0===u[3]?p:'"'===u[3]?$:g):c===$||c===g?c=p:c===_||c===m?c=v:(c=p,n=void 0);const x=c===p&&t[i+1].startsWith("/>")?" ":"";l+=c===v?s+r$2:d>=0?(e.push(a),s.slice(0,d)+h+s.slice(d)+o$2+x):s+o$2+(-2===d?i:x);}return [V(t,l+(t[s]||"<?>")+(2===i?"</svg>":3===i?"</math>":"")),e]};class S{constructor({strings:t,_$litType$:i},e){let r;this.parts=[];let l=0,a=0;const u=t.length-1,d=this.parts,[f,v]=N(t,i);if(this.el=S.createElement(f,e),P.currentNode=this.el.content,2===i||3===i){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes);}for(;null!==(r=P.nextNode())&&d.length<u;){if(1===r.nodeType){if(r.hasAttributes())for(const t of r.getAttributeNames())if(t.endsWith(h)){const i=v[a++],s=r.getAttribute(t).split(o$2),e=/([.?@])?(.*)/.exec(i);d.push({type:1,index:l,name:e[2],strings:s,ctor:"."===e[1]?I:"?"===e[1]?L:"@"===e[1]?z:H}),r.removeAttribute(t);}else t.startsWith(o$2)&&(d.push({type:6,index:l}),r.removeAttribute(t));if(y.test(r.tagName)){const t=r.textContent.split(o$2),i=t.length-1;if(i>0){r.textContent=s$1?s$1.emptyScript:"";for(let s=0;s<i;s++)r.append(t[s],c()),P.nextNode(),d.push({type:2,index:++l});r.append(t[i],c());}}}else if(8===r.nodeType)if(r.data===n$1)d.push({type:2,index:l});else {let t=-1;for(;-1!==(t=r.data.indexOf(o$2,t+1));)d.push({type:7,index:l}),t+=o$2.length-1;}l++;}}static createElement(t,i){const s=l.createElement("template");return s.innerHTML=t,s}}function M(t,i,s=t,e){if(i===E)return i;let h=void 0!==e?s._$Co?.[e]:s._$Cl;const o=a(i)?void 0:i._$litDirective$;return h?.constructor!==o&&(h?._$AO?.(false),void 0===o?h=void 0:(h=new o(t),h._$AT(t,s,e)),void 0!==e?(s._$Co??=[])[e]=h:s._$Cl=h),void 0!==h&&(i=M(t,h._$AS(t,i.values),h,e)),i}class R{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i;}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:s}=this._$AD,e=(t?.creationScope??l).importNode(i,true);P.currentNode=e;let h=P.nextNode(),o=0,n=0,r=s[0];for(;void 0!==r;){if(o===r.index){let i;2===r.type?i=new k(h,h.nextSibling,this,t):1===r.type?i=new r.ctor(h,r.name,r.strings,this,t):6===r.type&&(i=new Z(h,this,t)),this._$AV.push(i),r=s[++n];}o!==r?.index&&(h=P.nextNode(),o++);}return P.currentNode=l,e}p(t){let i=0;for(const s of this._$AV) void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,i),i+=s.strings.length-2):s._$AI(t[i])),i++;}}class k{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,i,s,e){this.type=2,this._$AH=A,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=s,this.options=e,this._$Cv=e?.isConnected??true;}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return void 0!==i&&11===t?.nodeType&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=M(this,t,i),a(t)?t===A||null==t||""===t?(this._$AH!==A&&this._$AR(),this._$AH=A):t!==this._$AH&&t!==E&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):d(t)?this.k(t):this._(t);}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t));}_(t){this._$AH!==A&&a(this._$AH)?this._$AA.nextSibling.data=t:this.T(l.createTextNode(t)),this._$AH=t;}$(t){const{values:i,_$litType$:s}=t,e="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=S.createElement(V(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===e)this._$AH.p(i);else {const t=new R(e,this),s=t.u(this.options);t.p(i),this.T(s),this._$AH=t;}}_$AC(t){let i=C.get(t.strings);return void 0===i&&C.set(t.strings,i=new S(t)),i}k(t){u(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let s,e=0;for(const h of t)e===i.length?i.push(s=new k(this.O(c()),this.O(c()),this,this.options)):s=i[e],s._$AI(h),e++;e<i.length&&(this._$AR(s&&s._$AB.nextSibling,e),i.length=e);}_$AR(t=this._$AA.nextSibling,s){for(this._$AP?.(false,true,s);t!==this._$AB;){const s=i$1(t).nextSibling;i$1(t).remove(),t=s;}}setConnected(t){ void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t));}}class H{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,s,e,h){this.type=1,this._$AH=A,this._$AN=void 0,this.element=t,this.name=i,this._$AM=e,this.options=h,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=A;}_$AI(t,i=this,s,e){const h=this.strings;let o=false;if(void 0===h)t=M(this,t,i,0),o=!a(t)||t!==this._$AH&&t!==E,o&&(this._$AH=t);else {const e=t;let n,r;for(t=h[0],n=0;n<h.length-1;n++)r=M(this,e[s+n],i,n),r===E&&(r=this._$AH[n]),o||=!a(r)||r!==this._$AH[n],r===A?t=A:t!==A&&(t+=(r??"")+h[n+1]),this._$AH[n]=r;}o&&!e&&this.j(t);}j(t){t===A?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"");}}class I extends H{constructor(){super(...arguments),this.type=3;}j(t){this.element[this.name]=t===A?void 0:t;}}class L extends H{constructor(){super(...arguments),this.type=4;}j(t){this.element.toggleAttribute(this.name,!!t&&t!==A);}}class z extends H{constructor(t,i,s,e,h){super(t,i,s,e,h),this.type=5;}_$AI(t,i=this){if((t=M(this,t,i,0)??A)===E)return;const s=this._$AH,e=t===A&&s!==A||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,h=t!==A&&(s===A||e);e&&this.element.removeEventListener(this.name,this,s),h&&this.element.addEventListener(this.name,this,t),this._$AH=t;}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t);}}class Z{constructor(t,i,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=s;}get _$AU(){return this._$AM._$AU}_$AI(t){M(this,t);}}const B=t$1.litHtmlPolyfillSupport;B?.(S,k),(t$1.litHtmlVersions??=[]).push("3.3.2");const D=(t,i,s)=>{const e=s?.renderBefore??i;let h=e._$litPart$;if(void 0===h){const t=s?.renderBefore??null;e._$litPart$=h=new k(i.insertBefore(c(),t),t,void 0,s??{});}return h._$AI(t),h};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const s=globalThis;class i extends y$1{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0;}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const r=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=D(r,this.renderRoot,this.renderOptions);}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(true);}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(false);}render(){return E}}i._$litElement$=true,i["finalized"]=true,s.litElementHydrateSupport?.({LitElement:i});const o$1=s.litElementPolyfillSupport;o$1?.({LitElement:i});(s.litElementVersions??=[]).push("4.2.2");

const fetchPanelState = (hass, entryId) => hass.callWS({
    type: "simple_irrigation/panel/state",
    entry_id: entryId,
});
const saveGlobal = (hass, entryId, body) => hass.callApi("POST", "simple_irrigation/panel/global", { entry_id: entryId, ...body });
const saveZone = (hass, entryId, body) => hass.callApi("POST", "simple_irrigation/panel/zone", { entry_id: entryId, ...body });
const saveSlot = (hass, entryId, body) => hass.callApi("POST", "simple_irrigation/panel/slot", { entry_id: entryId, ...body });
const runSlotNow = (hass, entryId, slotId) => hass.callApi("POST", "simple_irrigation/panel/run_slot", {
    entry_id: entryId,
    slot_id: slotId,
});
const skipIrrigationToday = (hass, entryId) => hass.callApi("POST", "simple_irrigation/panel/skip_today", { entry_id: entryId });
const panelControl = (hass, entryId, action) => hass.callApi("POST", "simple_irrigation/panel/control", {
    entry_id: entryId,
    action,
});
const listSimpleIrrigationEntries = (hass) => hass.callWS({
    type: "config_entries/get",
    domain: "simple_irrigation",
});

function fireEvent(node, type, detail) {
    const event = new CustomEvent(type, {
        bubbles: true,
        composed: true,
        detail: detail ?? {},
    });
    node.dispatchEvent(event);
}

/** Must match `DOMAIN` in the Python integration. */
const TRANSLATION_DOMAIN = "simple_irrigation";
/** Flat key under `component.simple_irrigation.*` (e.g. `config_panel.tab_general`). */
function t(hass, path, placeholders) {
    if (!hass?.localize) {
        return path;
    }
    const fullKey = `component.${TRANSLATION_DOMAIN}.${path}`;
    const hasValues = Boolean(placeholders && Object.keys(placeholders).length);
    // HA uses IntlMessageFormat; placeholders must be passed here, not substituted afterward.
    let s = hasValues
        ? hass.localize(fullKey, placeholders)
        : hass.localize(fullKey);
    if (!s || s === fullKey) {
        s = path;
        if (placeholders) {
            for (const [k, v] of Object.entries(placeholders)) {
                s = s.split(`{${k}}`).join(String(v));
            }
        }
    }
    return s;
}

/** Home Assistant callApi may put a string or structured object in `error`. */
function formatApiError(value, hass) {
    const fallback = hass?.localize != null
        ? t(hass, "config_panel.errors_request_failed")
        : "Request failed";
    if (value == null || value === "") {
        return fallback;
    }
    if (typeof value === "string") {
        return value;
    }
    if (value instanceof Error) {
        return value.message;
    }
    if (typeof value === "object") {
        const o = value;
        if (typeof o.message === "string") {
            return o.message;
        }
        if (typeof o.error === "string") {
            return o.error;
        }
        try {
            return JSON.stringify(value);
        }
        catch {
            return fallback;
        }
    }
    return String(value);
}
/** Safe when the panel bundle runs twice (navigation, scoped custom element registry). */
function defineCustomElementOnce(name, constructor, options) {
    if (customElements.get(name) !== undefined) {
        return;
    }
    customElements.define(name, constructor, options);
}
const navigate = (_node, path, replace = false) => {
    if (replace) {
        history.replaceState(null, "", path);
    }
    else {
        history.pushState(null, "", path);
    }
    fireEvent(window, "location-changed", { replace });
};

/** Wait until core HA custom elements used by the panel are defined. */
async function loadHaPanelElements() {
    const tags = [
        "ha-menu-button",
        "ha-tab-group",
        "ha-tab-group-tab",
        "ha-card",
        "ha-dialog",
        "ha-textfield",
        "ha-icon",
        "ha-switch",
    ];
    await Promise.all(tags.map((t) => customElements.whenDefined(t).catch(() => undefined)));
}

const BASE = "simple-irrigation";
const getPath = () => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] !== BASE) {
        return { entryId: null, page: "general" };
    }
    if (parts.length < 2) {
        return { entryId: null, page: "general" };
    }
    const entryId = parts[1];
    const page = parts[2] || "general";
    return { entryId, page };
};
const exportPath = (entryId, page) => {
    return `/${BASE}/${entryId}/${page}`;
};

const panelStyles = i$3 `
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

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const o={attribute:true,type:String,converter:u$1,reflect:false,hasChanged:f$1},r$1=(t=o,e,r)=>{const{kind:n,metadata:i}=r;let s=globalThis.litPropertyMetadata.get(i);if(void 0===s&&globalThis.litPropertyMetadata.set(i,s=new Map),"setter"===n&&((t=Object.create(t)).wrapped=true),s.set(r.name,t),"accessor"===n){const{name:o}=r;return {set(r){const n=e.get.call(this);e.set.call(this,r),this.requestUpdate(o,n,t,true,r);},init(e){return void 0!==e&&this.C(o,void 0,t,e),e}}}if("setter"===n){const{name:o}=r;return function(r){const n=this[o];e.call(this,r),this.requestUpdate(o,n,t,true,r);}}throw Error("Unsupported decorator location: "+n)};function n(t){return (e,o)=>"object"==typeof o?r$1(t,e,o):((t,e,o)=>{const r=e.hasOwnProperty(o);return e.constructor.createProperty(o,t),r?Object.getOwnPropertyDescriptor(e,o):void 0})(t,e,o)}

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function r(r){return n({...r,state:true,attribute:false})}

/** Entity IDs for allowed output domains (same rule set as the backend). */
function entityIdsForDomains(hass, domains) {
    return Object.keys(hass.states)
        .filter((eid) => domains.includes(eid.split(".", 1)[0]))
        .sort((a, b) => a.localeCompare(b));
}
/** One shared `<datalist>` per form (by stable `listId`). */
function renderEntityDatalist(hass, listId, domains) {
    const ids = entityIdsForDomains(hass, domains);
    return b `
    <datalist id=${listId}>
      ${ids.map((id) => b `<option value=${id}></option>`)}
    </datalist>
  `;
}
/**
 * Browser autocomplete for entity_id — works inside panel_custom scoped registries where
 * `ha-entity-picker` is not registered.
 */
function renderNativeEntityField(hass, listId, label, value, onValue) {
    return b `
    <div class="native-entity-field">
      <label class="native-entity-label">${label}</label>
      <input
        type="text"
        class="entity-id-input"
        list=${listId}
        .value=${value}
        placeholder=${t(hass, "config_panel.entity_placeholder_example")}
        spellcheck="false"
        autocomplete="off"
        @input=${(e) => onValue(e.target.value)}
      />
    </div>
  `;
}

/** Shared stacked form layout: titles, helper text, full-width controls. */
const formLayoutStyles = i$3 `
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
  .field-row ha-textfield {
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
  .entity-picker-row .native-entity-field {
    flex: 1;
    min-width: 0;
  }
  .native-entity-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .native-entity-label {
    font-size: 0.75rem;
    color: var(--secondary-text-color);
  }
  .entity-id-input {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 16px;
    border-radius: 4px;
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    color: var(--primary-text-color);
    font-size: 1rem;
    font-family: inherit;
    min-height: 48px;
  }
  .entity-id-input:focus {
    outline: none;
    border-color: var(--primary-color);
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
  .duration-row ha-textfield {
    width: 100%;
    display: block;
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

const LOCAL_TZ = Intl.DateTimeFormat?.().resolvedOptions?.().timeZone ?? "UTC";
function resolveTimeZonePref(localeTz, serverTimeZone) {
    if (localeTz === "local" && LOCAL_TZ)
        return LOCAL_TZ;
    return serverTimeZone;
}
function useAmPmFromLocale(locale) {
    const tf = locale.time_format;
    if (tf === "language" || tf === "system") {
        const testLang = tf === "language" ? locale.language : undefined;
        const test = new Date("January 1, 2023 22:00:00").toLocaleString(testLang);
        return test.includes("10");
    }
    return tf === "12";
}
function formatDateNumericPart(date, locale, serverTz) {
    const tz = resolveTimeZonePref(locale.time_zone, serverTz);
    const df = locale.date_format;
    if (df === "language" || df === "system") {
        return new Intl.DateTimeFormat(df === "system" ? undefined : locale.language, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            timeZone: tz,
        }).format(date);
    }
    const formatter = new Intl.DateTimeFormat(locale.language, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        timeZone: tz,
    });
    const parts = formatter.formatToParts(date);
    const literal = parts.find((p) => p.type === "literal")?.value ?? "/";
    const day = parts.find((p) => p.type === "day")?.value ?? "";
    const month = parts.find((p) => p.type === "month")?.value ?? "";
    const year = parts.find((p) => p.type === "year")?.value ?? "";
    const lastPart = parts[parts.length - 1];
    const lastLiteral = lastPart?.type === "literal" ? lastPart.value : "";
    if (df === "DMY")
        return `${day}${literal}${month}${literal}${year}${lastLiteral}`;
    if (df === "MDY")
        return `${month}${literal}${day}${literal}${year}${lastLiteral}`;
    if (df === "YMD")
        return `${year}${literal}${month}${literal}${day}${lastLiteral}`;
    return formatter.format(date);
}
function formatTimePart(date, locale, serverTz) {
    const tz = resolveTimeZonePref(locale.time_zone, serverTz);
    const ampm = useAmPmFromLocale(locale);
    return new Intl.DateTimeFormat(locale.language, {
        hour: ampm ? "numeric" : "2-digit",
        minute: "2-digit",
        hourCycle: ampm ? "h12" : "h23",
        timeZone: tz,
    }).format(date);
}
/**
 * Absolute instant (e.g. next run, pause until): weekday + profile date + profile time + TZ preference.
 */
function formatDateTimeForProfile(hass, date) {
    if (!hass)
        return date.toLocaleString();
    const loc = hass.locale;
    const serverTz = hass.config?.time_zone ?? LOCAL_TZ;
    const lang = (loc?.language ?? hass.language)?.replace(/_/g, "-");
    const locComplete = loc &&
        typeof loc.language === "string" &&
        typeof loc.time_format === "string" &&
        typeof loc.date_format === "string";
    if (!locComplete) {
        return new Intl.DateTimeFormat(lang, {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    }
    const tz = resolveTimeZonePref(loc.time_zone, serverTz);
    const weekday = new Intl.DateTimeFormat(loc.language, {
        weekday: "long",
        timeZone: tz,
    }).format(date);
    const datePart = formatDateNumericPart(date, loc, serverTz);
    const timePart = formatTimePart(date, loc, serverTz);
    return `${weekday}, ${datePart}, ${timePart}`;
}
/**
 * Schedule slot wall time (stored as HH:MM): same clock face, 12h/24h and spacing from profile.
 */
function formatSlotTimeForProfile(hass, timeLocal) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(timeLocal).trim());
    if (!m)
        return timeLocal;
    const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
    const d = new Date(2000, 0, 1, h, min, 0, 0);
    const loc = hass?.locale;
    const lang = (loc?.language ?? hass?.language)?.replace(/_/g, "-") ?? undefined;
    if (!loc?.language || !loc.time_format) {
        return new Intl.DateTimeFormat(lang, {
            hour: "2-digit",
            minute: "2-digit",
        }).format(d);
    }
    const ampm = useAmPmFromLocale(loc);
    return new Intl.DateTimeFormat(loc.language, {
        hour: ampm ? "numeric" : "2-digit",
        minute: "2-digit",
        hourCycle: ampm ? "h12" : "h23",
    }).format(d);
}

function locale(hass) {
    const lang = hass?.locale?.language ?? hass?.language;
    if (!lang)
        return undefined;
    return lang.replace(/_/g, "-");
}
/**
 * Schedule slots use weekday 0 = Monday … 6 = Sunday (same as the Python model).
 * Uses the user's HA language for localized weekday names.
 */
function weekdayLong(hass, mondayBasedIndex) {
    const i = Math.max(0, Math.min(6, mondayBasedIndex));
    // 2024-01-01 is a Monday in local calendar semantics for display.
    const d = new Date(2024, 0, 1 + i);
    return new Intl.DateTimeFormat(locale(hass), { weekday: "long" }).format(d);
}
/**
 * Absolute instant: weekday + date + time using the user’s profile (12h/24h, DMY/MDY/YMD, server vs local TZ).
 */
function formatDateTimeForDisplay(hass, date) {
    return formatDateTimeForProfile(hass, date);
}
/** Slot wall time HH:MM with profile 12h/24h (same numbers as stored; presentation only). */
function formatTimeLocalForDisplay(hass, timeLocal) {
    return formatSlotTimeForProfile(hass, timeLocal);
}

class ViewGeneral extends i {
    constructor() {
        super(...arguments);
        this._busy = false;
        this._runCtrlBusy = false;
        this._name = "";
        this._mode = "normal";
        this._maxParallel = 2;
        this._preStart = [];
        this._planEnabled = true;
    }
    static { this.properties = {
        hass: { attribute: false },
        entryId: { type: String },
        installation: { type: Object },
        scheduleNext: { type: Object },
        runState: { type: Object },
        onSaved: { attribute: false },
    }; }
    static { this.styles = [
        formLayoutStyles,
        i$3 `
      ha-card {
        margin-bottom: 16px;
      }
      .card-content {
        padding: 0 8px 16px;
      }
      .error {
        color: var(--error-color);
        margin-bottom: 8px;
      }
      button.save {
        padding: 10px 20px;
        border-radius: 4px;
        border: none;
        background: var(--primary-color);
        color: var(--text-primary-color);
        cursor: pointer;
        font-size: 1rem;
      }
      button.save:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .schedule-overview-inner {
        margin-top: 4px;
      }
      .schedule-hero {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 18px 18px 20px;
        border-radius: 12px;
        border: 1px solid var(--divider-color);
        background: linear-gradient(
          145deg,
          rgba(var(--rgb-primary-color, 33, 150, 243), 0.12) 0%,
          transparent 55%
        );
        margin-bottom: 16px;
      }
      .schedule-hero-icon {
        flex-shrink: 0;
        --mdc-icon-size: 36px;
        color: var(--primary-color);
        opacity: 0.9;
        margin-top: 2px;
      }
      .schedule-hero-text {
        flex: 1;
        min-width: 0;
      }
      .schedule-hero-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--secondary-text-color);
        margin: 0 0 6px;
      }
      .schedule-next-big {
        font-size: 1.35rem;
        font-weight: 600;
        margin: 0;
        line-height: 1.25;
        letter-spacing: -0.02em;
        color: var(--primary-text-color);
      }
      .schedule-slot-pills {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .schedule-slot-pill {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 10px;
        border: 1px solid var(--divider-color);
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
        line-height: 1.45;
        font-size: 0.9375rem;
      }
      .schedule-slot-pill ha-icon {
        flex-shrink: 0;
        --mdc-icon-size: 22px;
        color: var(--primary-color);
        opacity: 0.85;
        margin-top: 1px;
      }
      .schedule-slot-pill-main {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .schedule-slot-name {
        font-weight: 600;
        font-size: 0.8125rem;
        color: var(--primary-color);
      }
      .schedule-slot-time {
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .schedule-slot-zones {
        display: block;
        margin-top: 4px;
        font-size: 0.875rem;
        color: var(--secondary-text-color);
      }
      .plan-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px 20px;
        margin-bottom: 16px;
      }
      .plan-row ha-switch {
        margin-right: 8px;
      }
      .plan-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1rem;
      }
      .muted-box {
        font-size: 0.875rem;
        color: var(--secondary-text-color);
        line-height: 1.45;
        margin: 0 0 12px;
      }
      .run-hero {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 18px 18px 20px;
        border-radius: 12px;
        border: 1px solid var(--divider-color);
        background: linear-gradient(
          145deg,
          rgba(var(--rgb-primary-color, 33, 150, 243), 0.1) 0%,
          transparent 50%
        );
        margin-bottom: 14px;
      }
      .run-hero-icon {
        flex-shrink: 0;
        --mdc-icon-size: 38px;
        color: var(--primary-color);
        opacity: 0.92;
        margin-top: 2px;
      }
      .run-hero-body {
        flex: 1;
        min-width: 0;
      }
      .run-hero-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--secondary-text-color);
        margin: 0 0 6px;
      }
      .run-hero-state {
        font-size: 1.35rem;
        font-weight: 600;
        margin: 0 0 10px;
        line-height: 1.25;
        letter-spacing: -0.02em;
        color: var(--primary-text-color);
      }
      .run-detail-pills {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .run-detail-pill {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--divider-color);
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
        font-size: 0.9rem;
        line-height: 1.45;
      }
      .run-detail-pill ha-icon {
        flex-shrink: 0;
        --mdc-icon-size: 20px;
        color: var(--primary-color);
        opacity: 0.85;
        margin-top: 2px;
      }
      .run-detail-pill strong {
        font-weight: 600;
        color: var(--primary-text-color);
      }
      button.ctrl {
        padding: 10px 16px;
        border-radius: 4px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        cursor: pointer;
        font-size: 0.95rem;
      }
      button.ctrl.danger {
        border-color: var(--error-color);
        color: var(--error-color);
      }
      button.ctrl:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
    ]; }
    willUpdate(changed) {
        if (changed.has("installation") && this.installation) {
            const inst = this.installation;
            this._name = String(inst.name ?? "");
            this._mode = String(inst.mode ?? "normal");
            this._maxParallel = Number(inst.max_parallel_zones ?? 2);
            this._planEnabled = Boolean(inst.enabled ?? true);
            const ps = Array.isArray(inst.pre_start_switches)
                ? inst.pre_start_switches.filter(Boolean)
                : [];
            this._preStart = ps.length ? [...ps] : [""];
        }
    }
    _pauseIsActive() {
        const raw = this.installation?.pause_until;
        if (!raw || typeof raw !== "string")
            return false;
        const t = Date.parse(raw);
        return !Number.isNaN(t) && t > Date.now();
    }
    _fmtWhen(iso) {
        if (!iso)
            return t(this.hass, "config_panel.general_none_scheduled");
        try {
            const d = new Date(iso);
            return formatDateTimeForDisplay(this.hass, d);
        }
        catch {
            return String(iso);
        }
    }
    _wd(i) {
        return weekdayLong(this.hass, i);
    }
    _fmtPauseUntil() {
        const raw = this.installation?.pause_until;
        if (!raw || typeof raw !== "string")
            return "";
        return this._fmtWhen(raw);
    }
    async _save() {
        this._busy = true;
        this._msg = undefined;
        this.requestUpdate();
        try {
            const res = await saveGlobal(this.hass, this.entryId, {
                name: this._name,
                pre_start_switches: this._preStart.filter(Boolean),
                mode: this._mode,
                max_parallel_zones: this._maxParallel,
            });
            if (!res.success) {
                this._msg = formatApiError(res.error, this.hass);
            }
            else {
                this.onSaved?.();
            }
        }
        catch (e) {
            this._msg = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
            this.requestUpdate();
        }
    }
    async _setPlanEnabled(enabled) {
        this._busy = true;
        this._msg = undefined;
        this.requestUpdate();
        try {
            const res = await saveGlobal(this.hass, this.entryId, { enabled });
            if (!res.success) {
                this._msg = formatApiError(res.error, this.hass);
            }
            else {
                this._planEnabled = enabled;
                this.onSaved?.();
            }
        }
        catch (e) {
            this._msg = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
            this.requestUpdate();
        }
    }
    async _clearPause() {
        this._busy = true;
        this._msg = undefined;
        this.requestUpdate();
        try {
            const res = await saveGlobal(this.hass, this.entryId, { pause_until: null });
            if (!res.success) {
                this._msg = formatApiError(res.error, this.hass);
            }
            else {
                this.onSaved?.();
            }
        }
        catch (e) {
            this._msg = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
            this.requestUpdate();
        }
    }
    async _skipToday() {
        this._busy = true;
        this._msg = undefined;
        this.requestUpdate();
        try {
            const res = await skipIrrigationToday(this.hass, this.entryId);
            if (!res.success) {
                this._msg = formatApiError(res.error, this.hass);
            }
            else {
                this.onSaved?.();
            }
        }
        catch (e) {
            this._msg = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
            this.requestUpdate();
        }
    }
    _generalEntityListId() {
        return `si-ent-g-${this.entryId}`;
    }
    _zoneName(zoneId) {
        const zones = this.installation?.zones;
        const z = zones?.[zoneId];
        return z ? String(z.name ?? zoneId) : zoneId;
    }
    _runStateBusy(rs) {
        const s = String(rs.run_state ?? "idle");
        return ["preparing", "running", "stopping"].includes(s);
    }
    _formatUpcomingPhases(rs) {
        const up = rs.upcoming_phases;
        if (!Array.isArray(up) || up.length === 0)
            return "";
        const parts = [];
        for (const grp of up) {
            if (!Array.isArray(grp) || grp.length === 0)
                continue;
            parts.push(grp.map((id) => this._zoneName(String(id))).join(", "));
        }
        return parts.join(" → ");
    }
    async _panelControlAction(action) {
        this._runCtrlBusy = true;
        this._msg = undefined;
        this.requestUpdate();
        try {
            const res = await panelControl(this.hass, this.entryId, action);
            if (!res.success) {
                const err = res.error ?? "request_failed";
                this._msg =
                    err === "not_running" && action === "skip_phase"
                        ? t(this.hass, "config_panel.errors_not_running_skip")
                        : String(err);
            }
            else {
                this.onSaved?.();
            }
        }
        catch (e) {
            this._msg = formatApiError(e, this.hass);
        }
        finally {
            this._runCtrlBusy = false;
            this.requestUpdate();
        }
    }
    render() {
        const domains = ["switch", "input_boolean", "group"];
        const sn = this.scheduleNext ?? { fire_at: null, slots: [] };
        const nextGlobal = sn.fire_at || this.runState?.next_run_global || null;
        const pauseOn = this._pauseIsActive();
        const rs = (this.runState ?? {});
        const runBusy = this._runStateBusy(rs);
        const runStateStr = String(rs.run_state ?? "idle");
        const activeIds = Array.isArray(rs.active_zone_ids)
            ? rs.active_zone_ids
            : [];
        const lastErr = rs.last_error ? String(rs.last_error) : "";
        const showStop = ["preparing", "running", "stopping"].includes(runStateStr);
        const upcomingLen = Array.isArray(rs.upcoming_phases) ? rs.upcoming_phases.length : 0;
        const showSkip = showStop &&
            runStateStr !== "stopping" &&
            (runStateStr === "preparing" || upcomingLen > 0);
        const showClearErr = Boolean(lastErr);
        const nextZonesLine = this._formatUpcomingPhases(rs);
        return b `
      ${renderEntityDatalist(this.hass, this._generalEntityListId(), domains)}
      <ha-card .header=${t(this.hass, "config_panel.general_card_current_run")}>
        <div class="card-content">
          <div class="run-hero">
            <ha-icon class="run-hero-icon" icon="mdi:sprinkler-variant"></ha-icon>
            <div class="run-hero-body">
              <p class="run-hero-label">${t(this.hass, "config_panel.general_label_irrigation_state")}</p>
              <p class="run-hero-state">
                ${runBusy
            ? runStateStr === "preparing"
                ? t(this.hass, "config_panel.general_state_preparing")
                : runStateStr === "stopping"
                    ? t(this.hass, "config_panel.general_state_stopping")
                    : t(this.hass, "config_panel.general_state_running")
            : runStateStr === "error"
                ? t(this.hass, "config_panel.general_state_error_idle")
                : t(this.hass, "config_panel.general_state_idle")}
              </p>
              ${runBusy && runStateStr === "preparing"
            ? b `<p class="muted-box" style="margin:0">
                    ${t(this.hass, "config_panel.general_preparing_hint")}
                  </p>`
            : A}
            </div>
          </div>
          ${activeIds.length || nextZonesLine || lastErr
            ? b `
                <ul class="run-detail-pills">
                  ${activeIds.length
                ? b `
                        <li class="run-detail-pill">
                          <ha-icon icon="mdi:water"></ha-icon>
                          <span
                            ><strong>${t(this.hass, "config_panel.general_active_zones")}</strong>
                            ${activeIds.map((id) => this._zoneName(id)).join(", ")}</span
                          >
                        </li>
                      `
                : A}
                  ${nextZonesLine
                ? b `
                        <li class="run-detail-pill">
                          <ha-icon icon="mdi:playlist-play"></ha-icon>
                          <span
                            ><strong>${t(this.hass, "config_panel.general_next_zones")}</strong>
                            ${nextZonesLine}</span
                          >
                        </li>
                      `
                : A}
                  ${lastErr
                ? b `
                        <li class="run-detail-pill">
                          <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
                          <span
                            ><strong>${t(this.hass, "config_panel.general_last_error")}</strong>
                            ${lastErr}</span
                          >
                        </li>
                      `
                : A}
                </ul>
              `
            : A}
          ${showStop
            ? b `<p class="muted-box" style="margin-top:0">
                ${t(this.hass, "config_panel.general_scheduled_pause_hint")}
              </p>`
            : A}
          ${showStop || showSkip || showClearErr
            ? b `<div class="action-row">
                ${showStop
                ? b `
                      <button
                        type="button"
                        class="ctrl danger"
                        ?disabled=${this._runCtrlBusy || !runBusy}
                        @click=${() => this._panelControlAction("stop")}
                      >
                        ${t(this.hass, "config_panel.general_stop_irrigation")}
                      </button>
                    `
                : A}
                ${showSkip
                ? b `
                      <button
                        type="button"
                        class="ctrl"
                        ?disabled=${this._runCtrlBusy || !runBusy || runStateStr === "stopping"}
                        @click=${() => this._panelControlAction("skip_phase")}
                      >
                        ${t(this.hass, "config_panel.general_skip_phase")}
                      </button>
                    `
                : A}
                ${showClearErr
                ? b `
                      <button
                        type="button"
                        class="ctrl"
                        ?disabled=${this._runCtrlBusy}
                        @click=${() => this._panelControlAction("clear_error")}
                      >
                        ${t(this.hass, "config_panel.general_clear_error")}
                      </button>
                    `
                : A}
              </div>`
            : A}
        </div>
      </ha-card>

      <ha-card .header=${t(this.hass, "config_panel.general_card_schedule_overview")}>
        <div class="card-content">
          ${!this._planEnabled
            ? b `<p class="muted-box">${t(this.hass, "config_panel.general_plan_off_hint")}</p>`
            : A}
          <div class="schedule-overview-inner">
            <div class="schedule-hero">
              <ha-icon class="schedule-hero-icon" icon="mdi:calendar-clock"></ha-icon>
              <div class="schedule-hero-text">
                <p class="schedule-hero-label">${t(this.hass, "config_panel.general_next_scheduled_run")}</p>
                <p class="schedule-next-big">${this._fmtWhen(nextGlobal)}</p>
              </div>
            </div>
            ${sn.slots?.length
            ? b `
                  <ul class="schedule-slot-pills">
                    ${sn.slots.map((s) => b `
                        <li class="schedule-slot-pill">
                          <ha-icon icon="mdi:playlist-play"></ha-icon>
                          <div class="schedule-slot-pill-main">
                            ${s.name?.trim()
                ? b `<span class="schedule-slot-name">${s.name.trim()}</span>`
                : A}
                            <span class="schedule-slot-time"
                              >${this._wd(s.weekday)} ${formatTimeLocalForDisplay(this.hass, s.time_local)}</span
                            >
                            ${s.zone_names?.length
                ? b `<span class="schedule-slot-zones"
                                  >${s.zone_names.join(", ")}</span
                                >`
                : A}
                          </div>
                        </li>
                      `)}
                  </ul>
                `
            : b `<p class="muted-box">${t(this.hass, "config_panel.general_no_slots")}</p>`}
          </div>
        </div>
      </ha-card>

      <ha-card .header=${t(this.hass, "config_panel.general_card_plan_control")}>
        <div class="card-content">
          ${this._msg ? b `<div class="error">${this._msg}</div>` : A}
          <div class="plan-row">
            <label class="plan-label">
              <ha-switch
                .disabled=${this._busy}
                .checked=${this._planEnabled}
                @change=${(e) => {
            const tgt = e.target;
            void this._setPlanEnabled(Boolean(tgt.checked));
        }}
              ></ha-switch>
              ${t(this.hass, "config_panel.general_enable_plan")}
            </label>
          </div>
          ${pauseOn
            ? b `<p class="muted-box">
                ${t(this.hass, "config_panel.general_pause_active_hint", {
                when: this._fmtPauseUntil(),
            })}
              </p>`
            : A}
          <div class="action-row">
            <button
              type="button"
              class="btn-outline"
              ?disabled=${this._busy || !this._planEnabled}
              @click=${() => this._skipToday()}
            >
              ${t(this.hass, "config_panel.general_skip_today")}
            </button>
            <button
              type="button"
              class="btn-outline"
              ?disabled=${this._busy || !pauseOn}
              @click=${() => this._clearPause()}
            >
              ${t(this.hass, "config_panel.general_clear_pause")}
            </button>
          </div>
        </div>
      </ha-card>

      <ha-card .header=${t(this.hass, "config_panel.general_card_settings")}>
        <div class="card-content">
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_installation_name")}</span>
            <p class="field-desc">${t(this.hass, "config_panel.general_installation_name_desc")}</p>
            <div class="field-row">
              <ha-textfield
                .label=${t(this.hass, "config_panel.general_field_name")}
                .value=${this._name}
                @input=${(e) => {
            this._name = e.target.value;
        }}
              ></ha-textfield>
            </div>
          </div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_pre_start_title")}</span>
            <p class="field-desc">${t(this.hass, "config_panel.general_pre_start_desc")}</p>
            <div class="field-row">
              <div class="entity-picker-rows">
                ${this._preStart.map((eid, i) => b `
                    <div class="entity-picker-row">
                      ${renderNativeEntityField(this.hass, this._generalEntityListId(), i === 0
            ? t(this.hass, "config_panel.general_pre_start_output_n")
            : t(this.hass, "config_panel.general_pre_start_output_i", { n: i + 1 }), eid, (v) => {
            const next = [...this._preStart];
            next[i] = v;
            this._preStart = next;
            this.requestUpdate();
        })}
                      ${this._preStart.length > 1
            ? b `
                            <button
                              type="button"
                              class="row-remove"
                              @click=${() => {
                this._preStart.splice(i, 1);
                if (this._preStart.length === 0) {
                    this._preStart = [""];
                }
                this.requestUpdate();
            }}
                            >
                              ${t(this.hass, "config_panel.general_remove")}
                            </button>
                          `
            : A}
                    </div>
                  `)}
                <button
                  type="button"
                  class="btn-outline"
                  @click=${() => {
            this._preStart = [...this._preStart, ""];
            this.requestUpdate();
        }}
                >
                  ${t(this.hass, "config_panel.general_add_pre_start")}
                </button>
              </div>
            </div>
          </div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_watering_mode")}</span>
            <p class="field-desc">${t(this.hass, "config_panel.general_watering_mode_desc")}</p>
            <div class="field-row">
              <select
                class="field-select"
                @change=${(e) => {
            this._mode = e.target.value;
        }}
              >
                <option value="eco" ?selected=${this._mode === "eco"}>
                  ${t(this.hass, "config_panel.general_mode_eco")}
                </option>
                <option value="normal" ?selected=${this._mode === "normal"}>
                  ${t(this.hass, "config_panel.general_mode_normal")}
                </option>
                <option value="extra" ?selected=${this._mode === "extra"}>
                  ${t(this.hass, "config_panel.general_mode_extra")}
                </option>
              </select>
            </div>
          </div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_max_parallel")}</span>
            <p class="field-desc">${t(this.hass, "config_panel.general_max_parallel_desc")}</p>
            <div class="field-row">
              <ha-textfield
                type="number"
                .label=${t(this.hass, "config_panel.general_max_parallel_field")}
                .value=${String(this._maxParallel)}
                min="1"
                max="16"
                @input=${(e) => {
            this._maxParallel = Math.max(1, Math.min(16, parseInt(e.target.value, 10) || 1));
        }}
              ></ha-textfield>
            </div>
          </div>
          <div class="action-row">
            <button type="button" class="save" @click=${() => this._save()} ?disabled=${this._busy}>
              ${this._busy
            ? t(this.hass, "config_panel.general_saving")
            : t(this.hass, "config_panel.general_save")}
            </button>
          </div>
        </div>
      </ha-card>
    `;
    }
}
__decorate([
    r()
], ViewGeneral.prototype, "_runCtrlBusy", void 0);
defineCustomElementOnce("si-view-general", ViewGeneral);

/** Mirrors `grouping.compute_phases` for schedule slot preview in the panel. */
function computePhases(orderedZoneIds, zonesById, maxParallelZones, skipDisabled = true) {
    const mp = Math.max(1, maxParallelZones);
    const phases = [];
    let current = [];
    for (const zid of orderedZoneIds) {
        const zone = zonesById[zid];
        if (!zone)
            continue;
        if (skipDisabled && !zone.enabled)
            continue;
        if (zone.exclusive) {
            if (current.length) {
                phases.push(current);
                current = [];
            }
            phases.push([zid]);
            continue;
        }
        if (!current.length) {
            current = [zid];
            continue;
        }
        if (current.length >= mp) {
            phases.push(current);
            current = [zid];
            continue;
        }
        current.push(zid);
    }
    if (current.length)
        phases.push(current);
    return phases;
}
/** First occurrence of each zone id → 1-based phase index (same as `phase_index_per_zone`). */
function phaseIndexByZoneId(orderedZoneIds, zonesById, maxParallelZones) {
    const phases = computePhases(orderedZoneIds, zonesById, maxParallelZones, true);
    const m = new Map();
    for (let i = 0; i < phases.length; i++) {
        const n = i + 1;
        for (const zid of phases[i]) {
            if (!m.has(zid))
                m.set(zid, n);
        }
    }
    return m;
}

class ViewSchedule extends i {
    constructor() {
        super(...arguments);
        this._busy = false;
        this._newWeekday = 0;
        this._newTime = "06:00";
        this._newEnabled = true;
        this._newSlotName = "";
        this._slotEditDraft = null;
        this._addSlotDialogOpen = false;
        this._addZonePick = "";
    }
    static { this.properties = {
        hass: { attribute: false },
        entryId: { type: String },
        installation: { type: Object },
        runState: { type: Object },
        onSaved: { attribute: false },
    }; }
    static { this.styles = [
        formLayoutStyles,
        i$3 `
      ha-card {
        margin-bottom: 16px;
      }
      .card-content {
        padding: 0 8px 16px;
      }
      .error {
        color: var(--error-color);
        margin: 8px 0;
      }
      .intro {
        font-size: 0.875rem;
        color: var(--secondary-text-color);
        line-height: 1.45;
        margin: 0 0 16px;
      }
      .slot-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px 12px;
        padding: 14px 16px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        margin-bottom: 12px;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
      }
      .slot-row-summary {
        flex: 1;
        min-width: 160px;
      }
      .slot-row-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0 0 4px;
      }
      .slot-row-title .slot-name {
        font-weight: 700;
      }
      .slot-row-meta {
        font-size: 0.875rem;
        color: var(--secondary-text-color);
        margin: 0;
      }
      .slot-row-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      /* Override form-layout-styles .btn-outline (align-self + margin-top) so row actions line up */
      .slot-row-actions button {
        align-self: center;
        margin-top: 0;
      }
      .toolbar {
        margin-bottom: 16px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
      }
      button {
        padding: 10px 16px;
        border-radius: 4px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        cursor: pointer;
        font-size: 1rem;
      }
      button.primary {
        background: var(--primary-color);
        color: var(--text-primary-color);
        border: none;
      }
      button.danger {
        border-color: var(--error-color);
        color: var(--error-color);
      }
      .zones {
        list-style: none;
        padding: 0;
        margin: 12px 0;
      }
      .zones li {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
        padding: 8px 0;
        border-bottom: 1px solid var(--divider-color);
      }
      .zones li:last-child {
        border-bottom: none;
      }
      .zones li.phase-sep {
        display: block;
        margin: 14px 0 6px;
        padding: 0;
        border-bottom: none;
      }
      .zones li.phase-sep span {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--secondary-text-color);
      }
      .zones li.phase-sep:first-child {
        margin-top: 0;
      }
      .zone-actions button {
        padding: 6px 12px;
        font-size: 0.875rem;
      }
      .zone-actions .btn-outline {
        padding: 6px 12px;
        font-size: 0.875rem;
        margin-top: 0;
      }
      .toolbar .btn-outline {
        margin-top: 0;
      }
    `,
    ]; }
    _wd(i) {
        return weekdayLong(this.hass, i);
    }
    _fmtSlotTime(timeLocal) {
        return formatTimeLocalForDisplay(this.hass, timeLocal);
    }
    _slots() {
        const s = this.installation?.schedule_slots;
        if (!Array.isArray(s))
            return [];
        return s.map((raw) => {
            const o = raw;
            return {
                slot_id: String(o.slot_id ?? ""),
                weekday: Number(o.weekday ?? 0),
                time_local: String(o.time_local ?? "06:00"),
                enabled: Boolean(o.enabled ?? true),
                zone_ids_ordered: Array.isArray(o.zone_ids_ordered)
                    ? [...o.zone_ids_ordered]
                    : [],
                name: String(o.name ?? "").trim(),
            };
        });
    }
    _cloneSlot(s) {
        return {
            ...s,
            zone_ids_ordered: [...s.zone_ids_ordered],
        };
    }
    _zoneName(zid) {
        const zones = this.installation?.zones;
        const z = zones?.[zid];
        return z ? String(z.name ?? zid) : zid;
    }
    async _call(body) {
        this._busy = true;
        this._msg = undefined;
        try {
            const res = await saveSlot(this.hass, this.entryId, body);
            if (!res.success) {
                this._msg = formatApiError(res.error, this.hass);
                return false;
            }
            this.onSaved?.();
            return true;
        }
        catch (e) {
            this._msg = formatApiError(e, this.hass);
            return false;
        }
        finally {
            this._busy = false;
        }
    }
    _runtimeBusy() {
        const rs = this.runState ?? {};
        const s = String(rs.run_state ?? "idle");
        return ["preparing", "running", "stopping"].includes(s);
    }
    async _runSlotNow(slotId) {
        if (this._runtimeBusy())
            return;
        this._busy = true;
        this._msg = undefined;
        this.requestUpdate();
        try {
            const res = (await runSlotNow(this.hass, this.entryId, slotId));
            if (!res.success) {
                const err = res.error ?? "run_failed";
                this._msg =
                    err === "busy"
                        ? t(this.hass, "config_panel.schedule_err_busy")
                        : err === "empty_slot"
                            ? t(this.hass, "config_panel.schedule_err_empty_slot")
                            : err === "no_runnable_zones"
                                ? t(this.hass, "config_panel.schedule_err_no_runnable")
                                : err === "unknown_slot"
                                    ? t(this.hass, "config_panel.schedule_err_unknown_slot")
                                    : String(err);
            }
            else {
                this.onSaved?.();
            }
        }
        catch (e) {
            this._msg = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
            this.requestUpdate();
        }
    }
    _closeEditDialog() {
        this._slotEditDraft = null;
    }
    _resetNewSlotForm() {
        this._newWeekday = 0;
        this._newTime = "06:00";
        this._newEnabled = true;
        this._newSlotName = "";
    }
    _closeAddSlotDialog() {
        this._addSlotDialogOpen = false;
        this._resetNewSlotForm();
    }
    _zonesMap() {
        return this.installation?.zones;
    }
    _maxParallelZones() {
        const n = Number(this.installation?.max_parallel_zones ?? 2);
        return Number.isFinite(n) && n >= 1 ? n : 2;
    }
    _zonesPhaseInput() {
        const zones = this.installation?.zones;
        if (!zones)
            return {};
        const out = {};
        for (const [id, z] of Object.entries(zones)) {
            out[id] = {
                enabled: Boolean(z?.enabled ?? true),
                exclusive: Boolean(z?.exclusive ?? false),
            };
        }
        return out;
    }
    _addZoneOptionsForDraft(draft) {
        const zones = this._zonesMap();
        if (!zones)
            return [];
        return Object.keys(zones).filter((id) => !draft.zone_ids_ordered.includes(id));
    }
    async _saveSlotDraft() {
        const d = this._slotEditDraft;
        if (!d)
            return;
        const ok = await this._call({
            action: "update",
            slot_id: d.slot_id,
            weekday: d.weekday,
            time_local: d.time_local,
            enabled: d.enabled,
            zone_ids_ordered: d.zone_ids_ordered,
            name: d.name.trim(),
        });
        if (ok) {
            this._closeEditDialog();
        }
    }
    async _deleteSlotDraft() {
        const d = this._slotEditDraft;
        if (!d)
            return;
        if (!confirm(t(this.hass, "config_panel.schedule_confirm_delete_slot")))
            return;
        const ok = await this._call({ action: "delete", slot_id: d.slot_id });
        if (ok) {
            this._closeEditDialog();
        }
    }
    render() {
        const slots = this._slots();
        const zones = this._zonesMap();
        const draft = this._slotEditDraft;
        const addZoneOpts = draft ? this._addZoneOptionsForDraft(draft) : [];
        const editSlotTitle = draft != null
            ? t(this.hass, "config_panel.schedule_edit_dialog_title", {
                summary: draft.name.trim()
                    ? `${draft.name.trim()} · ${this._wd(draft.weekday)} ${this._fmtSlotTime(draft.time_local)}`
                    : `${this._wd(draft.weekday)} ${this._fmtSlotTime(draft.time_local)}`,
            })
            : "";
        return b `
      <ha-card .header=${t(this.hass, "config_panel.schedule_card_title")}>
        <div class="card-content">
          ${this._msg ? b `<div class="error">${this._msg}</div>` : A}
          <p class="intro">${t(this.hass, "config_panel.schedule_intro")}</p>
          <div class="toolbar">
            <button
              type="button"
              class="btn-outline"
              @click=${() => {
            this._msg = undefined;
            this._addSlotDialogOpen = true;
        }}
            >
              ${t(this.hass, "config_panel.schedule_add_slot")}
            </button>
          </div>
          ${slots.map((slot) => {
            const n = slot.zone_ids_ordered.length;
            return b `
              <div class="slot-row">
                <div class="slot-row-summary">
                  <p class="slot-row-title">
                    ${slot.name
                ? b `<span class="slot-name">${slot.name}</span> · ${this._wd(slot.weekday)}
                        ${this._fmtSlotTime(slot.time_local)}`
                : b `${this._wd(slot.weekday)} ${this._fmtSlotTime(slot.time_local)}`}
                    ${slot.enabled ? "" : ` ${t(this.hass, "config_panel.schedule_disabled_suffix")}`}
                  </p>
                  <p class="slot-row-meta">
                    ${n === 1
                ? t(this.hass, "config_panel.schedule_zones_in_order_one")
                : t(this.hass, "config_panel.schedule_zones_in_order_many", { n })}
                  </p>
                </div>
                <div class="slot-row-actions">
                  <button
                    type="button"
                    class="btn-outline"
                    ?disabled=${this._busy ||
                this._runtimeBusy() ||
                slot.zone_ids_ordered.length === 0}
                    @click=${() => this._runSlotNow(slot.slot_id)}
                  >
                    ${t(this.hass, "config_panel.schedule_run_slot_now")}
                  </button>
                  <button
                    type="button"
                    class="btn-outline"
                    @click=${() => {
                this._msg = undefined;
                this._addZonePick = "";
                this._slotEditDraft = this._cloneSlot(slot);
            }}
                  >
                    ${t(this.hass, "config_panel.schedule_edit")}
                  </button>
                </div>
              </div>
            `;
        })}
        </div>
      </ha-card>

      <ha-dialog
        .open=${this._addSlotDialogOpen}
        header-title=${t(this.hass, "config_panel.schedule_dialog_new_title")}
        @closed=${() => this._closeAddSlotDialog()}
      >
        <p class="field-desc">${t(this.hass, "config_panel.schedule_dialog_new_hint")}</p>
        <div class="field-block">
          <span class="field-title">${t(this.hass, "config_panel.schedule_name_optional_title")}</span>
          <p class="field-desc">${t(this.hass, "config_panel.schedule_name_optional_desc")}</p>
          <div class="field-row">
            <ha-textfield
              .label=${t(this.hass, "config_panel.schedule_slot_name")}
              .value=${this._newSlotName}
              @input=${(e) => {
            this._newSlotName = e.target.value;
        }}
            ></ha-textfield>
          </div>
        </div>
        <div class="field-block">
          <span class="field-title">${t(this.hass, "config_panel.schedule_weekday_title")}</span>
          <p class="field-desc">${t(this.hass, "config_panel.schedule_weekday_desc")}</p>
          <select
            class="field-select"
            @change=${(e) => {
            this._newWeekday = parseInt(e.target.value, 10);
        }}
          >
            ${[0, 1, 2, 3, 4, 5, 6].map((i) => b `<option value=${i} ?selected=${this._newWeekday === i}>
                  ${this._wd(i)}
                </option>`)}
          </select>
        </div>
        <div class="field-block">
          <span class="field-title">${t(this.hass, "config_panel.schedule_local_time_title")}</span>
          <p class="field-desc">${t(this.hass, "config_panel.schedule_local_time_desc")}</p>
          <div class="field-row">
            <ha-textfield
              .label=${t(this.hass, "config_panel.schedule_time_hhmm")}
              .value=${this._newTime}
              @input=${(e) => {
            this._newTime = e.target.value;
        }}
            ></ha-textfield>
          </div>
        </div>
        <div class="field-block">
          <div class="checkboxes">
            <label
              ><input
                type="checkbox"
                .checked=${this._newEnabled}
                @change=${(e) => {
            this._newEnabled = e.target.checked;
        }}
              />
              ${t(this.hass, "config_panel.schedule_slot_enabled")}</label
            >
          </div>
        </div>
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead"></div>
            <div class="dialog-footer-actions">
              <button
                type="button"
                class="btn-outline"
                @click=${() => this._closeAddSlotDialog()}
                ?disabled=${this._busy}
              >
                ${t(this.hass, "config_panel.zones_cancel")}
              </button>
              <button
                type="button"
                class="primary"
                ?disabled=${this._busy}
                @click=${async () => {
            const ok = await this._call({
                action: "add",
                weekday: this._newWeekday,
                time_local: this._newTime,
                enabled: this._newEnabled,
                name: this._newSlotName.trim(),
            });
            if (ok) {
                this._closeAddSlotDialog();
            }
        }}
              >
                ${this._busy
            ? t(this.hass, "config_panel.schedule_adding")
            : t(this.hass, "config_panel.schedule_add_slot_btn")}
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>

      <ha-dialog
        .open=${draft !== null}
        header-title=${editSlotTitle}
        @closed=${() => this._closeEditDialog()}
      >
        ${draft
            ? b `
              <div class="field-block">
                <span class="field-title">${t(this.hass, "config_panel.schedule_name_optional_title")}</span>
                <div class="field-row">
                  <ha-textfield
                    .label=${t(this.hass, "config_panel.schedule_slot_name")}
                    .value=${draft.name}
                    @input=${(e) => {
                draft.name = e.target.value;
            }}
                  ></ha-textfield>
                </div>
              </div>
              <div class="field-block">
                <span class="field-title">${t(this.hass, "config_panel.schedule_weekday_title")}</span>
                <select
                  class="field-select"
                  .value=${String(draft.weekday)}
                  @change=${(e) => {
                draft.weekday = parseInt(e.target.value, 10);
                this.requestUpdate();
            }}
                >
                  ${[0, 1, 2, 3, 4, 5, 6].map((i) => b `<option value=${i} ?selected=${draft.weekday === i}>
                        ${this._wd(i)}
                      </option>`)}
                </select>
              </div>
              <div class="field-block">
                <span class="field-title">${t(this.hass, "config_panel.schedule_start_time_title")}</span>
                <div class="field-row">
                  <ha-textfield
                    .label=${t(this.hass, "config_panel.schedule_time_hhmm")}
                    .value=${draft.time_local}
                    @input=${(e) => {
                draft.time_local = e.target.value;
            }}
                  ></ha-textfield>
                </div>
              </div>
              <div class="field-block">
                <div class="checkboxes">
                  <label
                    ><input
                      type="checkbox"
                      .checked=${draft.enabled}
                      @change=${(e) => {
                draft.enabled = e.target.checked;
            }}
                    />
                    ${t(this.hass, "config_panel.schedule_slot_enabled")}</label
                  >
                </div>
              </div>
              <div class="field-block" style="margin-top:8px">
                <span class="field-title">${t(this.hass, "config_panel.schedule_run_order_title")}</span>
                <p class="field-desc">${t(this.hass, "config_panel.schedule_run_order_desc")}</p>
                <ul class="zones">
                  ${(() => {
                const pmap = phaseIndexByZoneId(draft.zone_ids_ordered, this._zonesPhaseInput(), this._maxParallelZones());
                return draft.zone_ids_ordered.map((zid, idx) => {
                    const pnum = pmap.get(zid);
                    const prevZid = idx > 0 ? draft.zone_ids_ordered[idx - 1] : undefined;
                    const prevP = prevZid !== undefined ? pmap.get(prevZid) : undefined;
                    const showPhase = pnum !== undefined && pnum !== prevP;
                    return b `
                        ${showPhase
                        ? b `<li class="phase-sep"><span>${t(this.hass, "config_panel.schedule_phase_n", { n: pnum ?? 0 })}</span></li>`
                        : A}
                        <li>
                        <span>${idx + 1}. ${this._zoneName(zid)}</span>
                        <span class="zone-actions">
                          <button
                            type="button"
                            class="btn-outline"
                            @click=${() => {
                        if (idx > 0) {
                            const a = draft.zone_ids_ordered;
                            [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
                            this.requestUpdate();
                        }
                    }}
                          >
                            ${t(this.hass, "config_panel.schedule_up")}
                          </button>
                          <button
                            type="button"
                            class="btn-outline"
                            @click=${() => {
                        const a = draft.zone_ids_ordered;
                        if (idx < a.length - 1) {
                            [a[idx + 1], a[idx]] = [a[idx], a[idx + 1]];
                            this.requestUpdate();
                        }
                    }}
                          >
                            ${t(this.hass, "config_panel.schedule_down")}
                          </button>
                          <button
                            type="button"
                            class="btn-outline"
                            @click=${() => {
                        draft.zone_ids_ordered = draft.zone_ids_ordered.filter((x) => x !== zid);
                        this.requestUpdate();
                    }}
                          >
                            ${t(this.hass, "config_panel.schedule_remove")}
                          </button>
                        </span>
                      </li>
                    `;
                });
            })()}
                </ul>
                ${addZoneOpts.length
                ? b `
                      <div class="field-block" style="margin-top:12px">
                        <span class="field-title">${t(this.hass, "config_panel.schedule_add_zone_title")}</span>
                        <select
                          class="field-select"
                          .value=${this._addZonePick}
                          @change=${(e) => {
                    this._addZonePick = e.target.value;
                }}
                        >
                          <option value="">${t(this.hass, "config_panel.schedule_choose_zone")}</option>
                          ${addZoneOpts.map((id) => b `<option value=${id}>${this._zoneName(id)}</option>`)}
                        </select>
                        <div class="action-row" style="margin-top:10px">
                          <button
                            type="button"
                            class="btn-outline"
                            ?disabled=${!this._addZonePick}
                            @click=${() => {
                    if (this._addZonePick &&
                        !draft.zone_ids_ordered.includes(this._addZonePick)) {
                        draft.zone_ids_ordered = [
                            ...draft.zone_ids_ordered,
                            this._addZonePick,
                        ];
                        this._addZonePick = "";
                        this.requestUpdate();
                    }
                }}
                          >
                            ${t(this.hass, "config_panel.schedule_add_to_list")}
                          </button>
                        </div>
                      </div>
                    `
                : zones && Object.keys(zones).length > 0
                    ? b `<p class="field-desc">${t(this.hass, "config_panel.schedule_all_zones_in_slot")}</p>`
                    : b `<p class="field-desc">${t(this.hass, "config_panel.schedule_create_zones_first")}</p>`}
              </div>
            `
            : A}
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead">
              ${draft
            ? b `
                    <button
                      type="button"
                      class="danger"
                      ?disabled=${this._busy}
                      @click=${() => this._deleteSlotDraft()}
                    >
                      ${t(this.hass, "config_panel.schedule_delete_slot")}
                    </button>
                  `
            : A}
            </div>
            <div class="dialog-footer-actions">
              <button
                type="button"
                class="btn-outline"
                @click=${() => this._closeEditDialog()}
                ?disabled=${this._busy}
              >
                ${t(this.hass, "config_panel.zones_cancel")}
              </button>
              <button
                type="button"
                class="primary"
                ?disabled=${this._busy || !draft}
                @click=${() => this._saveSlotDraft()}
              >
                ${this._busy
            ? t(this.hass, "config_panel.schedule_saving")
            : t(this.hass, "config_panel.schedule_save_slot")}
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>
    `;
    }
}
__decorate([
    r()
], ViewSchedule.prototype, "_busy", void 0);
__decorate([
    r()
], ViewSchedule.prototype, "_msg", void 0);
__decorate([
    r()
], ViewSchedule.prototype, "_slotEditDraft", void 0);
__decorate([
    r()
], ViewSchedule.prototype, "_addSlotDialogOpen", void 0);
__decorate([
    r()
], ViewSchedule.prototype, "_addZonePick", void 0);
defineCustomElementOnce("si-view-schedule", ViewSchedule);

const BUSY_STATES = new Set(["preparing", "running", "stopping"]);
class ViewStatus extends i {
    constructor() {
        super(...arguments);
        this._showRaw = false;
    }
    static { this.properties = {
        hass: { attribute: false },
        runState: { type: Object },
        installation: { type: Object },
    }; }
    static { this.styles = i$3 `
    ha-card {
      margin-bottom: 16px;
    }
    .muted {
      font-size: 0.875rem;
      color: var(--secondary-text-color);
      line-height: 1.45;
      margin: 0 0 12px;
    }
    .summary {
      margin: 0 0 12px;
      line-height: 1.5;
    }
    .summary strong {
      font-weight: 600;
    }
    ul.inline {
      margin: 8px 0 0;
      padding-left: 1.25rem;
    }
    pre {
      overflow: auto;
      font-size: 12px;
      margin: 0;
      white-space: pre-wrap;
    }
    button.toggle-raw {
      margin-top: 12px;
      padding: 8px 14px;
      border-radius: 4px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      cursor: pointer;
      font-size: 0.9rem;
    }
  `; }
    _zoneName(zoneId) {
        const zones = this.installation?.zones;
        const z = zones?.[zoneId];
        return z ? String(z.name ?? zoneId) : zoneId;
    }
    _zoneList(ids) {
        return ids.map((id) => this._zoneName(id)).join(", ");
    }
    render() {
        const rs = this.runState ?? {};
        const stateStr = String(rs.run_state ?? "idle");
        const busy = BUSY_STATES.has(stateStr);
        const manual = Boolean(rs.manual_run);
        const active = Array.isArray(rs.active_zone_ids)
            ? rs.active_zone_ids
            : [];
        const queued = Array.isArray(rs.queued_zone_ids)
            ? rs.queued_zone_ids
            : [];
        const lastErr = rs.last_error ? String(rs.last_error) : "";
        return b `
      <ha-card .header=${t(this.hass, "config_panel.status_card_title")}>
        <div class="card-content">
          <p class="muted">${t(this.hass, "config_panel.status_intro")}</p>
          <div class="summary">
            <p>
              <strong>${t(this.hass, "config_panel.status_state_label")}</strong>
              ${busy
            ? t(this.hass, "config_panel.status_state_run_in_progress")
            : stateStr === "error"
                ? t(this.hass, "config_panel.status_state_error")
                : t(this.hass, "config_panel.status_state_idle")}
            </p>
            ${busy && manual
            ? b `<p>
                  <strong>${t(this.hass, "config_panel.status_manual_label")}</strong>
                  ${t(this.hass, "config_panel.status_manual_text")}
                </p>`
            : busy && !manual
                ? b `<p>
                    <strong>${t(this.hass, "config_panel.status_scheduled_label")}</strong>
                    ${t(this.hass, "config_panel.status_scheduled_text")}
                  </p>`
                : b `<p class="muted">${t(this.hass, "config_panel.status_idle_hint")}</p>`}
            ${active.length
            ? b `<p>
                  <strong>${t(this.hass, "config_panel.status_active_zones")}</strong>
                  ${this._zoneList(active)}
                </p>`
            : A}
            ${queued.length
            ? b `<p>
                  <strong>${t(this.hass, "config_panel.status_queued_zones")}</strong>
                  ${this._zoneList(queued)}
                </p>`
            : A}
            ${lastErr
            ? b `<p>
                  <strong>${t(this.hass, "config_panel.status_last_error")}</strong>
                  ${lastErr}
                </p>`
            : A}
            <p class="muted" style="margin-top:12px">
              ${t(this.hass, "config_panel.status_error_clear_hint")}
            </p>
          </div>
          <button
            type="button"
            class="toggle-raw"
            @click=${() => {
            this._showRaw = !this._showRaw;
        }}
          >
            ${this._showRaw
            ? t(this.hass, "config_panel.status_hide_raw")
            : t(this.hass, "config_panel.status_show_raw")}
          </button>
          ${this._showRaw
            ? b `<pre>${JSON.stringify(this.runState, null, 2)}</pre>`
            : A}
        </div>
      </ha-card>
    `;
    }
}
__decorate([
    r()
], ViewStatus.prototype, "_showRaw", void 0);
defineCustomElementOnce("si-view-status", ViewStatus);

const domains = ["switch", "input_boolean", "group"];
class ViewZones extends i {
    constructor() {
        super(...arguments);
        this._busy = false;
        this._addDialogOpen = false;
        this._editDraft = null;
        this._new = {
            zone_id: "",
            name: "",
            switch_entity_ids: [""],
            enabled: true,
            duration_eco_min: 10,
            duration_normal_min: 15,
            duration_extra_min: 20,
            exclusive: false,
        };
    }
    static { this.properties = {
        hass: { attribute: false },
        entryId: { type: String },
        installation: { type: Object },
        onSaved: { attribute: false },
    }; }
    static { this.styles = [
        formLayoutStyles,
        i$3 `
      ha-card {
        margin-bottom: 16px;
      }
      .card-content {
        padding: 0 8px 16px;
      }
      .error {
        color: var(--error-color);
        margin: 8px 0;
      }
      .intro {
        font-size: 0.875rem;
        color: var(--secondary-text-color);
        line-height: 1.45;
        margin: 0 0 16px;
      }
      .toolbar {
        margin-bottom: 16px;
      }
      .zone-list-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px 16px;
        padding: 14px 16px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        margin-bottom: 12px;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
      }
      .zone-list-main {
        flex: 1;
        min-width: 160px;
      }
      .zone-list-name {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0 0 4px;
      }
      .zone-list-detail {
        font-size: 0.875rem;
        color: var(--secondary-text-color);
        margin: 0;
        line-height: 1.4;
      }
      .zone-list-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .zone-list-actions .btn-outline {
        margin-top: 0;
      }
      button {
        padding: 10px 18px;
        border-radius: 4px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        cursor: pointer;
        font-size: 1rem;
      }
      button.danger {
        border-color: var(--error-color);
        color: var(--error-color);
      }
      button.primary {
        background: var(--primary-color);
        color: var(--text-primary-color);
        border: none;
      }
      button.primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
    ]; }
    _cloneZone(z) {
        return {
            ...z,
            switch_entity_ids: [...z.switch_entity_ids],
        };
    }
    _zonesFromInstallation() {
        const z = this.installation?.zones;
        if (!z)
            return [];
        return Object.entries(z).map(([zone_id, o]) => {
            const raw = o.switch_entity_ids;
            let switch_entity_ids = [];
            if (Array.isArray(raw)) {
                switch_entity_ids = raw.map((x) => String(x)).filter(Boolean);
            }
            else if (o.switch_entity_id) {
                switch_entity_ids = [String(o.switch_entity_id)];
            }
            if (switch_entity_ids.length === 0) {
                switch_entity_ids = [""];
            }
            return {
                zone_id,
                name: String(o.name ?? ""),
                switch_entity_ids,
                enabled: Boolean(o.enabled ?? true),
                duration_eco_min: Number(o.duration_eco_min ?? 10),
                duration_normal_min: Number(o.duration_normal_min ?? 15),
                duration_extra_min: Number(o.duration_extra_min ?? 20),
                exclusive: Boolean(o.exclusive ?? false),
            };
        });
    }
    _resetNewZone() {
        this._new = {
            zone_id: "",
            name: "",
            switch_entity_ids: [""],
            enabled: true,
            duration_eco_min: 10,
            duration_normal_min: 15,
            duration_extra_min: 20,
            exclusive: false,
        };
    }
    _closeAddDialog() {
        this._addDialogOpen = false;
        this._resetNewZone();
    }
    _closeEditDialog() {
        this._editDraft = null;
    }
    _canSaveZone(zone) {
        return Boolean(zone.name.trim() && zone.switch_entity_ids.some((id) => id.trim()));
    }
    _zonesEntityListId() {
        return `si-ent-z-${this.entryId}`;
    }
    async _saveZone(action, zoneId, zone) {
        this._busy = true;
        this._msg = undefined;
        try {
            const body = { action };
            if (zoneId)
                body.zone_id = zoneId;
            if (zone && action !== "delete") {
                body.zone = {
                    name: zone.name,
                    switch_entity_ids: zone.switch_entity_ids.filter(Boolean),
                    enabled: zone.enabled,
                    duration_eco_min: zone.duration_eco_min,
                    duration_normal_min: zone.duration_normal_min,
                    duration_extra_min: zone.duration_extra_min,
                    exclusive: zone.exclusive,
                };
            }
            const res = await saveZone(this.hass, this.entryId, body);
            if (!res.success) {
                this._msg = formatApiError(res.error, this.hass);
            }
            else {
                if (action === "update" || action === "delete") {
                    this._closeEditDialog();
                }
                if (action === "add") {
                    this._closeAddDialog();
                }
                this.onSaved?.();
            }
        }
        catch (e) {
            this._msg = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
        }
    }
    _renderZoneFields(z) {
        return b `
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.zones_field_name_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.zones_field_name_desc")}</p>
        <div class="field-row">
          <ha-textfield
            .label=${t(this.hass, "config_panel.zones_field_zone_name")}
            .value=${z.name}
            @input=${(e) => {
            z.name = e.target.value;
            this.requestUpdate();
        }}
          ></ha-textfield>
        </div>
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.zones_outputs_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.zones_outputs_desc")}</p>
        <div class="field-row">
          <div class="entity-picker-rows">
            ${z.switch_entity_ids.map((eid, i) => b `
                <div class="entity-picker-row">
                  ${renderNativeEntityField(this.hass, this._zonesEntityListId(), i === 0
            ? t(this.hass, "config_panel.zones_output_first")
            : t(this.hass, "config_panel.zones_output_n", { n: i + 1 }), eid, (v) => {
            const next = [...z.switch_entity_ids];
            next[i] = v;
            z.switch_entity_ids = next;
            this.requestUpdate();
        })}
                  ${z.switch_entity_ids.length > 1
            ? b `
                        <button
                          type="button"
                          class="row-remove"
                          @click=${() => {
                z.switch_entity_ids.splice(i, 1);
                if (z.switch_entity_ids.length === 0) {
                    z.switch_entity_ids = [""];
                }
                this.requestUpdate();
            }}
                        >
                          ${t(this.hass, "config_panel.general_remove")}
                        </button>
                      `
            : A}
                </div>
              `)}
            <button
              type="button"
              class="btn-outline"
              @click=${() => {
            z.switch_entity_ids = [...z.switch_entity_ids, ""];
            this.requestUpdate();
        }}
            >
              ${t(this.hass, "config_panel.zones_add_output")}
            </button>
          </div>
        </div>
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.zones_runtime_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.zones_runtime_desc")}</p>
        <div class="duration-row">
          <ha-textfield
            type="number"
            .label=${t(this.hass, "config_panel.zones_duration_eco")}
            .value=${String(z.duration_eco_min)}
            min="0"
            max="240"
            @input=${(e) => {
            z.duration_eco_min = parseInt(e.target.value, 10) || 0;
        }}
          ></ha-textfield>
          <ha-textfield
            type="number"
            .label=${t(this.hass, "config_panel.zones_duration_normal")}
            .value=${String(z.duration_normal_min)}
            min="0"
            max="240"
            @input=${(e) => {
            z.duration_normal_min = parseInt(e.target.value, 10) || 0;
        }}
          ></ha-textfield>
          <ha-textfield
            type="number"
            .label=${t(this.hass, "config_panel.zones_duration_extra")}
            .value=${String(z.duration_extra_min)}
            min="0"
            max="240"
            @input=${(e) => {
            z.duration_extra_min = parseInt(e.target.value, 10) || 0;
        }}
          ></ha-textfield>
        </div>
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.zones_behavior_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.zones_behavior_desc")}</p>
        <div class="checkboxes">
          <label
            ><input
              type="checkbox"
              .checked=${z.enabled}
              @change=${(e) => {
            z.enabled = e.target.checked;
        }}
            />
            ${t(this.hass, "config_panel.zones_enabled")}</label
          >
          <label
            ><input
              type="checkbox"
              .checked=${z.exclusive}
              @change=${(e) => {
            z.exclusive = e.target.checked;
        }}
            />
            ${t(this.hass, "config_panel.zones_exclusive")}</label
          >
        </div>
      </div>
    `;
    }
    render() {
        const zones = this._zonesFromInstallation();
        const edit = this._editDraft;
        return b `
      ${renderEntityDatalist(this.hass, this._zonesEntityListId(), domains)}
      <ha-card .header=${t(this.hass, "config_panel.zones_card_title")}>
        <div class="card-content">
          ${this._msg ? b `<div class="error">${this._msg}</div>` : A}
          <p class="intro">${t(this.hass, "config_panel.zones_intro")}</p>
          <div class="field-block toolbar">
            <button
              type="button"
              class="btn-outline"
              @click=${() => {
            this._addDialogOpen = true;
        }}
            >
              ${t(this.hass, "config_panel.zones_add_zone")}
            </button>
          </div>
          ${zones.map((z) => {
            const outs = z.switch_entity_ids.filter(Boolean).length;
            return b `
              <div class="zone-list-row">
                <div class="zone-list-main">
                  <p class="zone-list-name">${z.name || z.zone_id.slice(0, 8)}</p>
                  <p class="zone-list-detail">
                    ${(() => {
                const parts = [];
                if (!z.enabled) {
                    parts.push(t(this.hass, "config_panel.zones_detail_disabled"));
                }
                if (z.exclusive) {
                    parts.push(t(this.hass, "config_panel.zones_detail_exclusive"));
                }
                parts.push(t(this.hass, "config_panel.zones_detail_durations", {
                    eco: z.duration_eco_min,
                    normal: z.duration_normal_min,
                    extra: z.duration_extra_min,
                }));
                if (outs === 1) {
                    parts.push(t(this.hass, "config_panel.zones_detail_outputs_one"));
                }
                else if (outs > 1) {
                    parts.push(t(this.hass, "config_panel.zones_detail_outputs_many", { n: outs }));
                }
                return parts.join(" · ");
            })()}
                  </p>
                </div>
                <div class="zone-list-actions">
                  <button
                    type="button"
                    class="btn-outline"
                    @click=${() => {
                this._msg = undefined;
                this._editDraft = this._cloneZone(z);
            }}
                  >
                    ${t(this.hass, "config_panel.zones_edit")}
                  </button>
                </div>
              </div>
            `;
        })}
        </div>
      </ha-card>

      <ha-dialog
        .open=${this._addDialogOpen}
        header-title=${t(this.hass, "config_panel.zones_dialog_new_title")}
        @closed=${() => this._closeAddDialog()}
      >
        ${this._renderZoneFields(this._new)}
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead"></div>
            <div class="dialog-footer-actions">
              <button type="button" class="btn-outline" @click=${() => this._closeAddDialog()} ?disabled=${this._busy}>
                ${t(this.hass, "config_panel.zones_cancel")}
              </button>
              <button
                type="button"
                class="primary"
                ?disabled=${this._busy || !this._canSaveZone(this._new)}
                @click=${() => this._saveZone("add", undefined, { ...this._new, zone_id: "" })}
              >
                ${this._busy
            ? t(this.hass, "config_panel.zones_adding")
            : t(this.hass, "config_panel.zones_add_zone_btn")}
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>

      <ha-dialog
        .open=${edit !== null}
        header-title=${edit
            ? t(this.hass, "config_panel.zones_dialog_edit_title", {
                name: edit.name || edit.zone_id.slice(0, 8),
            })
            : ""}
        @closed=${() => this._closeEditDialog()}
      >
        ${edit ? this._renderZoneFields(edit) : A}
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead">
              ${edit
            ? b `
                    <button
                      type="button"
                      class="danger"
                      ?disabled=${this._busy}
                      @click=${() => {
                if (!edit)
                    return;
                if (confirm(t(this.hass, "config_panel.zones_confirm_delete"))) {
                    void this._saveZone("delete", edit.zone_id);
                }
            }}
                    >
                      ${t(this.hass, "config_panel.zones_delete_zone")}
                    </button>
                  `
            : A}
            </div>
            <div class="dialog-footer-actions">
              <button
                type="button"
                class="btn-outline"
                @click=${() => this._closeEditDialog()}
                ?disabled=${this._busy}
              >
                ${t(this.hass, "config_panel.zones_cancel")}
              </button>
              <button
                type="button"
                class="primary"
                ?disabled=${this._busy || !edit || !this._canSaveZone(edit)}
                @click=${() => edit && this._saveZone("update", edit.zone_id, edit)}
              >
                ${this._busy
            ? t(this.hass, "config_panel.zones_saving_changes")
            : t(this.hass, "config_panel.zones_save_changes")}
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>
    `;
    }
}
__decorate([
    r()
], ViewZones.prototype, "_busy", void 0);
__decorate([
    r()
], ViewZones.prototype, "_msg", void 0);
__decorate([
    r()
], ViewZones.prototype, "_addDialogOpen", void 0);
__decorate([
    r()
], ViewZones.prototype, "_editDraft", void 0);
defineCustomElementOnce("si-view-zones", ViewZones);

const VERSION = "0.1.2";
class SimpleIrrigationPanel extends i {
    constructor() {
        super(...arguments);
        this.narrow = false;
        this._state = null;
        this._loading = true;
        this._entries = [];
        this._entriesLoading = false;
        /** After first successful panel translation fetch (or no loader API). */
        this._initialPanelI18nDone = false;
        this._locChanged = () => {
            if (!window.location.pathname.includes("simple-irrigation"))
                return;
            this._reloadPath();
        };
    }
    static { this.properties = {
        hass: { attribute: false },
        narrow: { type: Boolean, reflect: true },
        route: { attribute: false },
        panel: { attribute: false },
    }; }
    static { this.styles = panelStyles; }
    setProperties(props) {
        if (props.hass !== undefined) {
            const next = props.hass;
            if (this.hass?.language !== next?.language) {
                this._panelI18nLang = undefined;
            }
            this.hass = next;
            void this._ensurePanelI18n();
        }
        if (props.narrow !== undefined)
            this.narrow = Boolean(props.narrow);
        if (props.route !== undefined)
            this.route = props.route;
        if (props.panel !== undefined)
            this.panel = props.panel;
        this.requestUpdate();
    }
    async _ensurePanelI18n() {
        if (!this.hass) {
            return;
        }
        if (!this.hass.loadBackendTranslation) {
            if (!this._initialPanelI18nDone) {
                this._initialPanelI18nDone = true;
                this.requestUpdate();
            }
            return;
        }
        const lang = this.hass.language ?? "en";
        if (this._panelI18nLang === lang) {
            if (!this._initialPanelI18nDone) {
                this._initialPanelI18nDone = true;
                this.requestUpdate();
            }
            return;
        }
        try {
            await this.hass.loadBackendTranslation("config_panel", TRANSLATION_DOMAIN);
        }
        catch {
            /* localize may keep returning missing keys */
        }
        this._panelI18nLang = lang;
        if (!this._initialPanelI18nDone) {
            this._initialPanelI18nDone = true;
        }
        this.requestUpdate();
    }
    connectedCallback() {
        super.connectedCallback();
        window.addEventListener("location-changed", this._locChanged);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener("location-changed", this._locChanged);
        void this._teardownRunStateListeners();
    }
    _clearRunStateDebounce() {
        if (this._runStateDebounceTimer !== undefined) {
            window.clearTimeout(this._runStateDebounceTimer);
            this._runStateDebounceTimer = undefined;
        }
    }
    async _teardownRunStateListeners() {
        this._clearRunStateDebounce();
        if (this._runStatePollTimer !== undefined) {
            window.clearInterval(this._runStatePollTimer);
            this._runStatePollTimer = undefined;
        }
        if (this._runStateUnsub) {
            try {
                await this._runStateUnsub();
            }
            catch {
                /* ignore */
            }
            this._runStateUnsub = undefined;
        }
        this._watchedRunningEntity = undefined;
        this._watchedEntryId = undefined;
    }
    _scheduleSilentRefresh(entryId) {
        this._clearRunStateDebounce();
        this._runStateDebounceTimer = window.setTimeout(() => {
            this._runStateDebounceTimer = undefined;
            void this._loadState(entryId, { silent: true });
        }, 200);
    }
    async _syncRunStateListeners(entryId) {
        if (!this.hass || !this._state) {
            await this._teardownRunStateListeners();
            return;
        }
        const runningId = this._state.panel_entity_ids?.running ?? undefined;
        if (!runningId || !this.hass.connection) {
            await this._teardownRunStateListeners();
            return;
        }
        const subChanged = this._watchedEntryId !== entryId || this._watchedRunningEntity !== runningId;
        if (subChanged && this._runStateUnsub) {
            try {
                await this._runStateUnsub();
            }
            catch {
                /* ignore */
            }
            this._runStateUnsub = undefined;
        }
        this._watchedEntryId = entryId;
        this._watchedRunningEntity = runningId;
        if (!this._runStateUnsub) {
            this._runStateUnsub = await this.hass.connection.subscribeEvents((ev) => {
                if (ev.data?.entity_id !== runningId)
                    return;
                this._scheduleSilentRefresh(entryId);
            }, "state_changed");
        }
        if (this._runStatePollTimer === undefined) {
            this._runStatePollTimer = window.setInterval(() => {
                if (!window.location.pathname.includes("simple-irrigation"))
                    return;
                const { entryId: eid } = getPath();
                if (!eid || eid !== this._watchedEntryId || !this.hass || !this._state)
                    return;
                const rid = this._state.panel_entity_ids?.running;
                if (!rid || this.hass.states?.[rid]?.state !== "on")
                    return;
                void this._loadState(eid, { silent: true });
            }, 1000);
        }
    }
    async _reloadPath() {
        const { entryId, page } = getPath();
        if (!entryId) {
            await this._teardownRunStateListeners();
            await this._loadEntryList();
            this._loading = false;
            this._state = null;
            this.requestUpdate();
            return;
        }
        await this._loadState(entryId);
        if (page && !["general", "zones", "schedule", "status"].includes(page)) {
            navigate(this, exportPath(entryId, "general"));
        }
    }
    async _loadEntryList() {
        if (!this.hass)
            return;
        this._entriesLoading = true;
        this.requestUpdate();
        try {
            const entries = await listSimpleIrrigationEntries(this.hass);
            const hass = this.hass;
            this._entries = await Promise.all(entries.map(async (e) => {
                let plan_enabled = true;
                try {
                    const st = await fetchPanelState(hass, e.entry_id);
                    const inst = st.installation;
                    plan_enabled = Boolean(inst.enabled ?? true);
                }
                catch {
                    /* ignore; show as active */
                }
                return { ...e, plan_enabled };
            }));
        }
        catch (e) {
            this._error = String(e);
            this._entries = [];
        }
        finally {
            this._entriesLoading = false;
        }
    }
    async _loadState(entryId, opts) {
        if (!this.hass)
            return;
        const silent = Boolean(opts?.silent);
        if (!silent) {
            this._loading = true;
            this._error = undefined;
            this.requestUpdate();
        }
        try {
            this._state = await fetchPanelState(this.hass, entryId);
            if (silent) {
                this._error = undefined;
            }
        }
        catch (e) {
            this._error = String(e);
            if (!silent) {
                this._state = null;
            }
        }
        finally {
            if (!silent) {
                this._loading = false;
            }
            if (!this._state) {
                void this._teardownRunStateListeners();
            }
            else {
                void this._syncRunStateListeners(entryId);
            }
            this.requestUpdate();
        }
    }
    async firstUpdated() {
        await loadHaPanelElements();
        await this._ensurePanelI18n();
        if (this.hass) {
            await this._reloadPath();
        }
    }
    updated(changed) {
        if (changed.has("hass") && this.hass && changed.get("hass") === undefined) {
            void this._reloadPath();
        }
    }
    _onTab(ev) {
        const name = ev.detail?.name;
        const { entryId } = getPath();
        if (!name || !entryId)
            return;
        const cur = getPath().page;
        if (name !== cur) {
            navigate(this, exportPath(entryId, name));
            this.requestUpdate();
        }
    }
    _pickEntry(entryId) {
        navigate(this, exportPath(entryId, "general"));
        this._loadState(entryId);
    }
    render() {
        if (!this.hass) {
            return b `<div class="view"><div class="view-inner">Loading…</div></div>`;
        }
        if (!this._initialPanelI18nDone) {
            return b `<div class="view"><div class="view-inner">Loading…</div></div>`;
        }
        const path = getPath();
        const page = path.page || "general";
        if (!path.entryId) {
            return b `
        <div class="entry-picker">
          <h2>${t(this.hass, "config_panel.entry_picker_title")}</h2>
          <p class="lead">${t(this.hass, "config_panel.entry_picker_lead")}</p>
          ${this._error ? b `<p class="error">${this._error}</p>` : A}
          ${this._entriesLoading
                ? b `<p class="muted">${t(this.hass, "config_panel.entry_picker_loading")}</p>`
                : A}
          <div class="entry-cards">
            ${this._entries.map((e) => b `
                  <button
                    type="button"
                    class="entry-card"
                    @click=${() => this._pickEntry(e.entry_id)}
                  >
                    <div class="entry-card-head">
                      <div class="entry-card-title">${e.title}</div>
                      ${e.disabled_by
                ? b `<span class="entry-badge entry-badge-ha">${t(this.hass, "config_panel.entry_badge_ha")}</span>`
                : !e.plan_enabled
                    ? b `<span class="entry-badge entry-badge-off">${t(this.hass, "config_panel.entry_badge_plan_off")}</span>`
                    : b `<span class="entry-badge entry-badge-on">${t(this.hass, "config_panel.entry_badge_active")}</span>`}
                    </div>
                    <p class="entry-card-desc">${t(this.hass, "config_panel.entry_card_desc")}</p>
                  </button>
                `)}
          </div>
          ${!this._entries.length && !this._entriesLoading
                ? b `<p class="muted">${t(this.hass, "config_panel.entry_picker_empty")}</p>`
                : A}
          <div class="howto-add">${t(this.hass, "config_panel.entry_picker_howto")}</div>
        </div>
      `;
        }
        if (this._loading || !this._state) {
            return b `<div class="view"><div class="view-inner">${this._error ||
                t(this.hass, "config_panel.loading")}</div></div>`;
        }
        const inst = this._state.installation;
        const rs = this._state.run_state;
        const scheduleNext = this._state.schedule_next ?? { fire_at: null, slots: [] };
        return b `
      <div class="header">
        <div class="toolbar">
          <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
          <div class="main-title">${t(this.hass, "config_panel.main_title")}</div>
          <div class="version">v${VERSION}</div>
        </div>
        <ha-tab-group @wa-tab-show=${this._onTab}>
          ${["general", "zones", "schedule", "status"].map((p) => b `
              <ha-tab-group-tab slot="nav" panel=${p} .active=${page === p}>
                ${p === "general"
            ? t(this.hass, "config_panel.tab_general")
            : p === "zones"
                ? t(this.hass, "config_panel.tab_zones")
                : p === "schedule"
                    ? t(this.hass, "config_panel.tab_schedule")
                    : t(this.hass, "config_panel.tab_status")}
              </ha-tab-group-tab>
            `)}
        </ha-tab-group>
      </div>
      <div class="view">
        <div class="view-inner">
          ${page === "general"
            ? b `<si-view-general
                .hass=${this.hass}
                .entryId=${path.entryId}
                .installation=${inst}
                .scheduleNext=${scheduleNext}
                .runState=${rs}
                .onSaved=${() => this._loadState(path.entryId, { silent: true })}
              ></si-view-general>`
            : A}
          ${page === "zones"
            ? b `<si-view-zones
                .hass=${this.hass}
                .entryId=${path.entryId}
                .installation=${inst}
                .onSaved=${() => this._loadState(path.entryId, { silent: true })}
              ></si-view-zones>`
            : A}
          ${page === "schedule"
            ? b `<si-view-schedule
                .hass=${this.hass}
                .entryId=${path.entryId}
                .installation=${inst}
                .runState=${rs}
                .onSaved=${() => this._loadState(path.entryId, { silent: true })}
              ></si-view-schedule>`
            : A}
          ${page === "status"
            ? b `<si-view-status
                .hass=${this.hass}
                .runState=${rs}
                .installation=${inst}
              ></si-view-status>`
            : A}
        </div>
      </div>
    `;
    }
}
defineCustomElementOnce("simple-irrigation-panel", SimpleIrrigationPanel);

export { SimpleIrrigationPanel };
//# sourceMappingURL=simple-irrigation-panel.js.map
