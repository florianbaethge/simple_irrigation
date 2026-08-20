/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$2=globalThis,e$5=t$2.ShadowRoot&&(void 0===t$2.ShadyCSS||t$2.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s$2=Symbol(),o$4=new WeakMap;let n$3 = class n{constructor(t,e,o){if(this._$cssResult$=true,o!==s$2)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e;}get styleSheet(){let t=this.o;const s=this.t;if(e$5&&void 0===t){const e=void 0!==s&&1===s.length;e&&(t=o$4.get(s)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),e&&o$4.set(s,t));}return t}toString(){return this.cssText}};const r$4=t=>new n$3("string"==typeof t?t:t+"",void 0,s$2),i$5=(t,...e)=>{const o=1===t.length?t[0]:e.reduce((e,s,o)=>e+(t=>{if(true===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[o+1],t[0]);return new n$3(o,t,s$2)},S$1=(s,o)=>{if(e$5)s.adoptedStyleSheets=o.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const e of o){const o=document.createElement("style"),n=t$2.litNonce;void 0!==n&&o.setAttribute("nonce",n),o.textContent=e.cssText,s.appendChild(o);}},c$2=e$5?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return r$4(e)})(t):t;

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:i$4,defineProperty:e$4,getOwnPropertyDescriptor:h$1,getOwnPropertyNames:r$3,getOwnPropertySymbols:o$3,getPrototypeOf:n$2}=Object,a$1=globalThis,c$1=a$1.trustedTypes,l$1=c$1?c$1.emptyScript:"",p$2=a$1.reactiveElementPolyfillSupport,d$1=(t,s)=>t,u$1={toAttribute(t,s){switch(s){case Boolean:t=t?l$1:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t);}return t},fromAttribute(t,s){let i=t;switch(s){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t);}catch(t){i=null;}}return i}},f$1=(t,s)=>!i$4(t,s),b$1={attribute:true,type:String,converter:u$1,reflect:false,useDefault:false,hasChanged:f$1};Symbol.metadata??=Symbol("metadata"),a$1.litPropertyMetadata??=new WeakMap;let y$1 = class y extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t);}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,s=b$1){if(s.state&&(s.attribute=false),this._$Ei(),this.prototype.hasOwnProperty(t)&&((s=Object.create(s)).wrapped=true),this.elementProperties.set(t,s),!s.noAccessor){const i=Symbol(),h=this.getPropertyDescriptor(t,i,s);void 0!==h&&e$4(this.prototype,t,h);}}static getPropertyDescriptor(t,s,i){const{get:e,set:r}=h$1(this.prototype,t)??{get(){return this[s]},set(t){this[s]=t;}};return {get:e,set(s){const h=e?.call(this);r?.call(this,s),this.requestUpdate(t,h,i);},configurable:true,enumerable:true}}static getPropertyOptions(t){return this.elementProperties.get(t)??b$1}static _$Ei(){if(this.hasOwnProperty(d$1("elementProperties")))return;const t=n$2(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties);}static finalize(){if(this.hasOwnProperty(d$1("finalized")))return;if(this.finalized=true,this._$Ei(),this.hasOwnProperty(d$1("properties"))){const t=this.properties,s=[...r$3(t),...o$3(t)];for(const i of s)this.createProperty(i,t[i]);}const t=this[Symbol.metadata];if(null!==t){const s=litPropertyMetadata.get(t);if(void 0!==s)for(const[t,i]of s)this.elementProperties.set(t,i);}this._$Eh=new Map;for(const[t,s]of this.elementProperties){const i=this._$Eu(t,s);void 0!==i&&this._$Eh.set(i,t);}this.elementStyles=this.finalizeStyles(this.styles);}static finalizeStyles(s){const i=[];if(Array.isArray(s)){const e=new Set(s.flat(1/0).reverse());for(const s of e)i.unshift(c$2(s));}else void 0!==s&&i.push(c$2(s));return i}static _$Eu(t,s){const i=s.attribute;return  false===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=false,this.hasUpdated=false,this._$Em=null,this._$Ev();}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this));}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.();}removeController(t){this._$EO?.delete(t);}_$E_(){const t=new Map,s=this.constructor.elementProperties;for(const i of s.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t);}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return S$1(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(true),this._$EO?.forEach(t=>t.hostConnected?.());}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.());}attributeChangedCallback(t,s,i){this._$AK(t,i);}_$ET(t,s){const i=this.constructor.elementProperties.get(t),e=this.constructor._$Eu(t,i);if(void 0!==e&&true===i.reflect){const h=(void 0!==i.converter?.toAttribute?i.converter:u$1).toAttribute(s,i.type);this._$Em=t,null==h?this.removeAttribute(e):this.setAttribute(e,h),this._$Em=null;}}_$AK(t,s){const i=this.constructor,e=i._$Eh.get(t);if(void 0!==e&&this._$Em!==e){const t=i.getPropertyOptions(e),h="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:u$1;this._$Em=e;const r=h.fromAttribute(s,t.type);this[e]=r??this._$Ej?.get(e)??r,this._$Em=null;}}requestUpdate(t,s,i,e=false,h){if(void 0!==t){const r=this.constructor;if(false===e&&(h=this[t]),i??=r.getPropertyOptions(t),!((i.hasChanged??f$1)(h,s)||i.useDefault&&i.reflect&&h===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,i))))return;this.C(t,s,i);} false===this.isUpdatePending&&(this._$ES=this._$EP());}C(t,s,{useDefault:i,reflect:e,wrapped:h},r){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??s??this[t]),true!==h||void 0!==r)||(this._$AL.has(t)||(this.hasUpdated||i||(s=void 0),this._$AL.set(t,s)),true===e&&this._$Em!==t&&(this._$Eq??=new Set).add(t));}async _$EP(){this.isUpdatePending=true;try{await this._$ES;}catch(t){Promise.reject(t);}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,s]of this._$Ep)this[t]=s;this._$Ep=void 0;}const t=this.constructor.elementProperties;if(t.size>0)for(const[s,i]of t){const{wrapped:t}=i,e=this[s];true!==t||this._$AL.has(s)||void 0===e||this.C(s,void 0,i,e);}}let t=false;const s=this._$AL;try{t=this.shouldUpdate(s),t?(this.willUpdate(s),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(s)):this._$EM();}catch(s){throw t=false,this._$EM(),s}t&&this._$AE(s);}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=true,this.firstUpdated(t)),this.updated(t);}_$EM(){this._$AL=new Map,this.isUpdatePending=false;}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return  true}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM();}updated(t){}firstUpdated(t){}};y$1.elementStyles=[],y$1.shadowRootOptions={mode:"open"},y$1[d$1("elementProperties")]=new Map,y$1[d$1("finalized")]=new Map,p$2?.({ReactiveElement:y$1}),(a$1.reactiveElementVersions??=[]).push("2.1.2");

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$1=globalThis,i$3=t=>t,s$1=t$1.trustedTypes,e$3=s$1?s$1.createPolicy("lit-html",{createHTML:t=>t}):void 0,h="$lit$",o$2=`lit$${Math.random().toFixed(9).slice(2)}$`,n$1="?"+o$2,r$2=`<${n$1}>`,l=document,c=()=>l.createComment(""),a=t=>null===t||"object"!=typeof t&&"function"!=typeof t,u=Array.isArray,d=t=>u(t)||"function"==typeof t?.[Symbol.iterator],f="[ \t\n\f\r]",v=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,_=/-->/g,m$1=/>/g,p$1=RegExp(`>|${f}(?:([^\\s"'>=/]+)(${f}*=${f}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),g=/'/g,$=/"/g,y=/^(?:script|style|textarea|title)$/i,x=t=>(i,...s)=>({_$litType$:t,strings:i,values:s}),b=x(1),E=Symbol.for("lit-noChange"),A=Symbol.for("lit-nothing"),C=new WeakMap,P=l.createTreeWalker(l,129);function V(t,i){if(!u(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==e$3?e$3.createHTML(i):i}const N=(t,i)=>{const s=t.length-1,e=[];let n,l=2===i?"<svg>":3===i?"<math>":"",c=v;for(let i=0;i<s;i++){const s=t[i];let a,u,d=-1,f=0;for(;f<s.length&&(c.lastIndex=f,u=c.exec(s),null!==u);)f=c.lastIndex,c===v?"!--"===u[1]?c=_:void 0!==u[1]?c=m$1:void 0!==u[2]?(y.test(u[2])&&(n=RegExp("</"+u[2],"g")),c=p$1):void 0!==u[3]&&(c=p$1):c===p$1?">"===u[0]?(c=n??v,d=-1):void 0===u[1]?d=-2:(d=c.lastIndex-u[2].length,a=u[1],c=void 0===u[3]?p$1:'"'===u[3]?$:g):c===$||c===g?c=p$1:c===_||c===m$1?c=v:(c=p$1,n=void 0);const x=c===p$1&&t[i+1].startsWith("/>")?" ":"";l+=c===v?s+r$2:d>=0?(e.push(a),s.slice(0,d)+h+s.slice(d)+o$2+x):s+o$2+(-2===d?i:x);}return [V(t,l+(t[s]||"<?>")+(2===i?"</svg>":3===i?"</math>":"")),e]};class S{constructor({strings:t,_$litType$:i},e){let r;this.parts=[];let l=0,a=0;const u=t.length-1,d=this.parts,[f,v]=N(t,i);if(this.el=S.createElement(f,e),P.currentNode=this.el.content,2===i||3===i){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes);}for(;null!==(r=P.nextNode())&&d.length<u;){if(1===r.nodeType){if(r.hasAttributes())for(const t of r.getAttributeNames())if(t.endsWith(h)){const i=v[a++],s=r.getAttribute(t).split(o$2),e=/([.?@])?(.*)/.exec(i);d.push({type:1,index:l,name:e[2],strings:s,ctor:"."===e[1]?I:"?"===e[1]?L:"@"===e[1]?z:H}),r.removeAttribute(t);}else t.startsWith(o$2)&&(d.push({type:6,index:l}),r.removeAttribute(t));if(y.test(r.tagName)){const t=r.textContent.split(o$2),i=t.length-1;if(i>0){r.textContent=s$1?s$1.emptyScript:"";for(let s=0;s<i;s++)r.append(t[s],c()),P.nextNode(),d.push({type:2,index:++l});r.append(t[i],c());}}}else if(8===r.nodeType)if(r.data===n$1)d.push({type:2,index:l});else {let t=-1;for(;-1!==(t=r.data.indexOf(o$2,t+1));)d.push({type:7,index:l}),t+=o$2.length-1;}l++;}}static createElement(t,i){const s=l.createElement("template");return s.innerHTML=t,s}}function M(t,i,s=t,e){if(i===E)return i;let h=void 0!==e?s._$Co?.[e]:s._$Cl;const o=a(i)?void 0:i._$litDirective$;return h?.constructor!==o&&(h?._$AO?.(false),void 0===o?h=void 0:(h=new o(t),h._$AT(t,s,e)),void 0!==e?(s._$Co??=[])[e]=h:s._$Cl=h),void 0!==h&&(i=M(t,h._$AS(t,i.values),h,e)),i}class R{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i;}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:s}=this._$AD,e=(t?.creationScope??l).importNode(i,true);P.currentNode=e;let h=P.nextNode(),o=0,n=0,r=s[0];for(;void 0!==r;){if(o===r.index){let i;2===r.type?i=new k(h,h.nextSibling,this,t):1===r.type?i=new r.ctor(h,r.name,r.strings,this,t):6===r.type&&(i=new Z(h,this,t)),this._$AV.push(i),r=s[++n];}o!==r?.index&&(h=P.nextNode(),o++);}return P.currentNode=l,e}p(t){let i=0;for(const s of this._$AV) void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,i),i+=s.strings.length-2):s._$AI(t[i])),i++;}}class k{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,i,s,e){this.type=2,this._$AH=A,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=s,this.options=e,this._$Cv=e?.isConnected??true;}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return void 0!==i&&11===t?.nodeType&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=M(this,t,i),a(t)?t===A||null==t||""===t?(this._$AH!==A&&this._$AR(),this._$AH=A):t!==this._$AH&&t!==E&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):d(t)?this.k(t):this._(t);}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t));}_(t){this._$AH!==A&&a(this._$AH)?this._$AA.nextSibling.data=t:this.T(l.createTextNode(t)),this._$AH=t;}$(t){const{values:i,_$litType$:s}=t,e="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=S.createElement(V(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===e)this._$AH.p(i);else {const t=new R(e,this),s=t.u(this.options);t.p(i),this.T(s),this._$AH=t;}}_$AC(t){let i=C.get(t.strings);return void 0===i&&C.set(t.strings,i=new S(t)),i}k(t){u(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let s,e=0;for(const h of t)e===i.length?i.push(s=new k(this.O(c()),this.O(c()),this,this.options)):s=i[e],s._$AI(h),e++;e<i.length&&(this._$AR(s&&s._$AB.nextSibling,e),i.length=e);}_$AR(t=this._$AA.nextSibling,s){for(this._$AP?.(false,true,s);t!==this._$AB;){const s=i$3(t).nextSibling;i$3(t).remove(),t=s;}}setConnected(t){ void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t));}}class H{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,s,e,h){this.type=1,this._$AH=A,this._$AN=void 0,this.element=t,this.name=i,this._$AM=e,this.options=h,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=A;}_$AI(t,i=this,s,e){const h=this.strings;let o=false;if(void 0===h)t=M(this,t,i,0),o=!a(t)||t!==this._$AH&&t!==E,o&&(this._$AH=t);else {const e=t;let n,r;for(t=h[0],n=0;n<h.length-1;n++)r=M(this,e[s+n],i,n),r===E&&(r=this._$AH[n]),o||=!a(r)||r!==this._$AH[n],r===A?t=A:t!==A&&(t+=(r??"")+h[n+1]),this._$AH[n]=r;}o&&!e&&this.j(t);}j(t){t===A?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"");}}class I extends H{constructor(){super(...arguments),this.type=3;}j(t){this.element[this.name]=t===A?void 0:t;}}class L extends H{constructor(){super(...arguments),this.type=4;}j(t){this.element.toggleAttribute(this.name,!!t&&t!==A);}}class z extends H{constructor(t,i,s,e,h){super(t,i,s,e,h),this.type=5;}_$AI(t,i=this){if((t=M(this,t,i,0)??A)===E)return;const s=this._$AH,e=t===A&&s!==A||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,h=t!==A&&(s===A||e);e&&this.element.removeEventListener(this.name,this,s),h&&this.element.addEventListener(this.name,this,t),this._$AH=t;}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t);}}class Z{constructor(t,i,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=s;}get _$AU(){return this._$AM._$AU}_$AI(t){M(this,t);}}const B=t$1.litHtmlPolyfillSupport;B?.(S,k),(t$1.litHtmlVersions??=[]).push("3.3.2");const D=(t,i,s)=>{const e=s?.renderBefore??i;let h=e._$litPart$;if(void 0===h){const t=s?.renderBefore??null;e._$litPart$=h=new k(i.insertBefore(c(),t),t,void 0,s??{});}return h._$AI(t),h};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const s=globalThis;let i$2 = class i extends y$1{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0;}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const r=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=D(r,this.renderRoot,this.renderOptions);}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(true);}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(false);}render(){return E}};i$2._$litElement$=true,i$2["finalized"]=true,s.litElementHydrateSupport?.({LitElement:i$2});const o$1=s.litElementPolyfillSupport;o$1?.({LitElement:i$2});(s.litElementVersions??=[]).push("4.2.2");

const fetchPanelState = (hass, entryId) => hass.callWS({
    type: "simple_irrigation/panel/state",
    entry_id: entryId,
});
const saveGlobal = (hass, entryId, body) => hass.callApi("POST", "simple_irrigation/panel/global", { entry_id: entryId, ...body });
const saveZone = (hass, entryId, body) => hass.callApi("POST", "simple_irrigation/panel/zone", { entry_id: entryId, ...body });
const saveSlot = (hass, entryId, body) => hass.callApi("POST", "simple_irrigation/panel/slot", { entry_id: entryId, ...body });
const upsertCycle = (hass, entryId, body) => hass.callApi("POST", "simple_irrigation/panel/slot", {
    entry_id: entryId,
    action: "cycle_upsert",
    ...body,
});
const deleteCycle = (hass, entryId, cycleId) => hass.callApi("POST", "simple_irrigation/panel/slot", {
    entry_id: entryId,
    action: "cycle_delete",
    cycle_id: cycleId,
});
const runSlotNow = (hass, entryId, slotId) => hass.callApi("POST", "simple_irrigation/panel/run_slot", {
    entry_id: entryId,
    slot_id: slotId,
});
const runZoneNow = (hass, entryId, zoneId) => hass.callApi("POST", "simple_irrigation/panel/run_zone", {
    entry_id: entryId,
    zone_id: zoneId,
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

/** Backend error codes are snake_case identifiers, never prose. */
const ERROR_CODE_RE = /^[a-z][a-z0-9_]*$/;
/**
 * Turn a backend error code into a translated sentence.
 * Falls back to the raw code when no translation exists, so new codes degrade
 * to the previous behaviour instead of showing an empty message.
 */
function translateErrorCode(value, hass) {
    if (hass?.localize == null || !ERROR_CODE_RE.test(value)) {
        return value;
    }
    const path = `config_panel.errors_${value}`;
    const translated = t(hass, path);
    return translated === path ? value : translated;
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
        return translateErrorCode(value, hass);
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
            return translateErrorCode(o.error, hass);
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

/** How long to wait for a core element before rendering anyway. */
const ELEMENT_TIMEOUT_MS = 2000;
/**
 * Wait until core HA custom elements used by the panel are defined.
 *
 * `customElements.whenDefined()` never rejects — it simply stays pending when an
 * element is not registered, and a `.catch()` would not help. The panel blocks
 * its first render on this, so an unresolved tag would leave a blank panel
 * rather than one unstyled field. `ha-entity-picker` and `ha-selector` are the
 * risky ones: they come from lazily loaded frontend chunks, so cap the wait and
 * render regardless once it elapses.
 */
async function loadHaPanelElements() {
    const tags = [
        "ha-menu-button",
        "ha-tab-group",
        "ha-tab-group-tab",
        "ha-card",
        "ha-dialog",
        "ha-input",
        "ha-entity-picker",
        "ha-selector",
        "ha-icon",
        "ha-switch",
    ];
    const ready = (tag) => Promise.race([
        customElements.whenDefined(tag),
        new Promise((resolve) => setTimeout(resolve, ELEMENT_TIMEOUT_MS)),
    ]).catch(() => undefined);
    await Promise.all(tags.map(ready));
}

const BASE = "simple-irrigation";
const getPath = () => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] !== BASE) {
        return { entryId: null, page: "overview" };
    }
    if (parts.length < 2) {
        return { entryId: null, page: "overview" };
    }
    const entryId = parts[1];
    const page = parts[2] || "overview";
    return { entryId, page };
};
const exportPath = (entryId, page) => {
    return `/${BASE}/${entryId}/${page}`;
};
/**
 * Remove `editSlot` from the current URL without dispatching `location-changed`.
 * Using `navigate()` would trigger a full panel reload and unmount the schedule view,
 * which closes the slot edit dialog immediately after opening it.
 */
function stripEditSlotQueryFromUrl() {
    try {
        const url = new URL(window.location.href);
        if (!url.searchParams.has("editSlot"))
            return;
        url.searchParams.delete("editSlot");
        const qs = url.searchParams.toString();
        history.replaceState(null, "", url.pathname + (qs ? `?${qs}` : "") + url.hash);
    }
    catch {
        /* ignore */
    }
}

const panelStyles = i$5 `
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
    max-width: 1100px;
    container-type: inline-size;
    container-name: siview;
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
  .entry-badge-default {
    color: var(--primary-color);
    background: rgba(var(--rgb-primary-color, 33, 150, 243), 0.12);
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

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e$2=(e,t,c)=>(c.configurable=true,c.enumerable=true,Reflect.decorate&&"object"!=typeof t&&Object.defineProperty(e,t,c),c);

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function e$1(e,r){return (n,s,i)=>{const o=t=>t.renderRoot?.querySelector(e)??null;return e$2(n,s,{get(){return o(this)}})}}

/**
 * Shared visual system for the Simple Irrigation panel views.
 *
 * Ported from the advanced_cover integration's `sharedStyles`, minus the
 * cover-specific primitives (`.position-bar`, `.cond-row` sentence rows,
 * `.compass`). Every view imports `[sharedStyles, formLayoutStyles, css` …local… `]`
 * so cards, rows, buttons, chips, badges and dialogs stay identical across tabs.
 */
const sharedStyles = i$5 `
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
    padding: 0 14px 14px;
    border-top: 1px solid var(--divider-color);
    margin-top: -2px;
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
  .day-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 6px 0;
  }
  .day-strip .day-cell {
    flex: 1 1 calc(100% / 14 - 4px);
    min-width: 30px;
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
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
      animation: none !important;
    }
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
/** Short localized weekday name (e.g. "Mon" / "Mo"), Monday-based index. */
function weekdayShort(hass, mondayBasedIndex) {
    const i = Math.max(0, Math.min(6, mondayBasedIndex));
    const d = new Date(2024, 0, 1 + i);
    return new Intl.DateTimeFormat(locale(hass), { weekday: "short" }).format(d);
}
/** Normalize to sorted, de-duplicated Monday-based indices in 0..6. */
function normalizeWeekdays(raw) {
    const out = [];
    const seen = new Set();
    const push = (v) => {
        const n = Number(v);
        if (Number.isInteger(n) && n >= 0 && n <= 6 && !seen.has(n)) {
            seen.add(n);
            out.push(n);
        }
    };
    if (Array.isArray(raw))
        raw.forEach(push);
    out.sort((a, b) => a - b);
    return out;
}
/**
 * Compact human summary of the weekdays a slot runs on:
 * "Daily" (all 7), "Mon–Fri" (workdays), "Weekend" (Sat/Sun), else a short list.
 */
function weekdaysSummary(hass, weekdays) {
    const wds = normalizeWeekdays(weekdays);
    if (wds.length === 0)
        return "";
    if (wds.length === 7)
        return t(hass, "config_panel.weekdays_summary_daily");
    const key = wds.join(",");
    if (key === "0,1,2,3,4")
        return t(hass, "config_panel.weekdays_summary_workdays");
    if (key === "5,6")
        return t(hass, "config_panel.weekdays_summary_weekend");
    return wds.map((i) => weekdayShort(hass, i)).join(", ");
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

/** Weekly timetable entries from schedule slots (local wall clock, Mon=0 … Sun=6). */
function normalizeWeekParity(raw) {
    return raw === "odd" || raw === "even" ? raw : "every";
}
/** ISO-8601 week number (same numbering as Python's isocalendar). */
function isoWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0
    date.setUTCDate(date.getUTCDate() - dayNum + 3); // Thursday decides the ISO week
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
    return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}
function weekParityOfWeekNumber(week) {
    return week % 2 === 1 ? "odd" : "even";
}
function parseTimeLocalToMinutes(timeLocal) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(timeLocal.trim());
    if (!m)
        return 0;
    const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
    return h * 60 + min;
}
function durationForMode(zone, mode) {
    if (!zone)
        return 0;
    if (mode === "eco")
        return Math.max(0, Number(zone.duration_eco_min ?? 0));
    if (mode === "extra")
        return Math.max(0, Number(zone.duration_extra_min ?? 0));
    return Math.max(0, Number(zone.duration_normal_min ?? 0));
}
/** Bucket by wall-clock hour of segment start ([0,8), [8,16), [16,24)). */
function bucketFromStartMin(startMin) {
    const h = Math.floor(Math.max(0, startMin) / 60);
    if (h < 8)
        return 0;
    if (h < 16)
        return 1;
    return 2;
}
/**
 * Weekday column order: values are internal indices 0=Monday … 6=Sunday.
 */
function weekdayIndicesForDisplay(firstWeekday, language) {
    const monFirst = [0, 1, 2, 3, 4, 5, 6];
    const sunFirst = [6, 0, 1, 2, 3, 4, 5];
    const fw = (firstWeekday || "monday").toLowerCase();
    if (fw === "sunday")
        return sunFirst;
    if (fw === "monday")
        return monFirst;
    if (fw === "language" && language) {
        try {
            const loc = new Intl.Locale(language.replace(/_/g, "-"));
            const fd = loc.weekInfo?.firstDay;
            if (fd === 7)
                return sunFirst;
            return monFirst;
        }
        catch {
            return monFirst;
        }
    }
    return monFirst;
}
function zonesPhaseInputFromInstallation(zones) {
    const out = {};
    if (!zones)
        return out;
    for (const [id, z] of Object.entries(zones)) {
        out[id] = {
            enabled: Boolean(z.enabled ?? true),
            exclusive: Boolean(z.exclusive),
        };
    }
    return out;
}
/**
 * Phase grouping includes disabled zones (they render gray) but phase advance
 * uses max duration among enabled zones only (matches runtime).
 */
function buildTimetableEntries(installation) {
    const planEnabled = Boolean(installation?.enabled ?? true);
    const preStartSec = Math.max(0, Number(installation?.pre_start_delay_sec ?? 10));
    const mode = String(installation?.mode ?? "normal");
    const maxParallel = Math.max(1, Number(installation?.max_parallel_zones ?? 2));
    const zones = installation?.zones;
    const slots = installation?.schedule_slots;
    const zonesById = zonesPhaseInputFromInstallation(zones);
    const entries = [];
    if (!slots?.length || !zones) {
        return entries;
    }
    for (const slot of slots) {
        const slotId = String(slot.slot_id ?? "");
        const slotEnabled = Boolean(slot.enabled ?? true);
        const rawWeekdays = Array.isArray(slot.weekdays)
            ? slot.weekdays
                .map((n) => Math.max(0, Math.min(6, Number(n))))
                .filter((n) => Number.isInteger(n))
            : [];
        // Fall back to the legacy scalar weekday for pre-migration data.
        const weekdays = rawWeekdays.length
            ? Array.from(new Set(rawWeekdays))
            : [Math.max(0, Math.min(6, Number(slot.weekday ?? 0)))];
        const timeLocal = String(slot.time_local ?? "00:00");
        const weekParity = normalizeWeekParity(slot.week_parity);
        const ordered = Array.isArray(slot.zone_ids_ordered)
            ? slot.zone_ids_ordered
            : [];
        const slotStartMin = parseTimeLocalToMinutes(timeLocal);
        const phases = computePhases(ordered, zonesById, maxParallel, false);
        for (const weekday of weekdays) {
            let cursor = slotStartMin + preStartSec / 60;
            for (const phase of phases) {
                const phaseStart = cursor;
                let phaseLenMin = 0;
                for (const zid of phase) {
                    const z = zones[zid];
                    if (!z)
                        continue;
                    if (Boolean(z.enabled ?? true)) {
                        const d = durationForMode(z, mode);
                        phaseLenMin = Math.max(phaseLenMin, d);
                    }
                }
                for (const zid of phase) {
                    const z = zones[zid];
                    if (!z)
                        continue;
                    const zoneEnabled = Boolean(z.enabled ?? true);
                    const dur = durationForMode(z, mode);
                    const startMin = phaseStart;
                    const endMin = phaseStart + dur;
                    entries.push({
                        zoneId: zid,
                        weekday,
                        startMin,
                        endMin,
                        bucket: bucketFromStartMin(startMin),
                        enabled: planEnabled && slotEnabled && zoneEnabled,
                        mode,
                        slotId,
                        weekParity,
                    });
                }
                cursor = phaseStart + phaseLenMin;
            }
        }
    }
    return entries;
}
function zoneRowOrder(installation) {
    const zones = installation?.zones;
    if (!zones)
        return [];
    return Object.keys(zones);
}
function zoneDisplayName(installation, zoneId) {
    const zones = installation?.zones;
    const z = zones?.[zoneId];
    const name = z?.name != null ? String(z.name) : "";
    return name.trim() || zoneId.slice(0, 8);
}
/** HH:MM for profile time formatting (minutes may be fractional from pre-start seconds). */
function minutesToTimeLocal(totalMin) {
    const t = Math.max(0, totalMin);
    const m = Math.floor(t);
    const h = Math.min(23, Math.floor(m / 60));
    const mm = m % 60;
    return `${h}:${String(mm).padStart(2, "0")}`;
}
/** Rounded duration in minutes for UI labels. */
function entryDurationMinutesRounded(entry) {
    return Math.max(0, Math.round(entry.endMin - entry.startMin));
}
const BUCKET_KEYS = [0, 1, 2];
/** Horizontal stacking when multiple entries share the same zone, weekday, and bucket. */
function assignEntryLanes(entries) {
    const byCell = new Map();
    for (const e of entries) {
        const k = `${e.weekday}:${e.zoneId}:${e.bucket}`;
        if (!byCell.has(k))
            byCell.set(k, []);
        byCell.get(k).push(e);
    }
    const out = new Map();
    for (const list of byCell.values()) {
        list.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
        const ends = [];
        for (const e of list) {
            let lane = 0;
            while (lane < ends.length && ends[lane] > e.startMin + 1e-3) {
                lane++;
            }
            if (lane === ends.length) {
                ends.push(e.endMin);
            }
            else {
                ends[lane] = Math.max(ends[lane], e.endMin);
            }
            out.set(e, { lane, maxLanes: 0 });
        }
        const maxLanes = Math.max(1, ends.length);
        for (const e of list) {
            out.get(e).maxLanes = maxLanes;
        }
    }
    return out;
}
const TIMETABLE_BUCKET_INDICES = BUCKET_KEYS;
/**
 * How many schedule slots include `zone_id` in `zone_ids_ordered` (distinct slots;
 * each slot counts at most once per zone).
 */
function slotInclusionCountPerZone(installation) {
    const slots = installation?.schedule_slots;
    const counts = {};
    if (!Array.isArray(slots))
        return counts;
    for (const slot of slots) {
        const ordered = Array.isArray(slot.zone_ids_ordered)
            ? slot.zone_ids_ordered
            : [];
        const seen = new Set();
        for (const zid of ordered) {
            if (seen.has(zid))
                continue;
            seen.add(zid);
            counts[zid] = (counts[zid] ?? 0) + 1;
        }
    }
    return counts;
}

/**
 * Cycle → schedule-slot generation, mirroring `cycle.py` exactly.
 *
 * Used for the live wizard preview; the identical rules run server-side in
 * `cycle.py` for `cycle_upsert`, so the preview and the created slots always
 * agree (acceptance §8.4). Cycle length is 7 or 14 days because `week_parity`
 * can only express a 2-week cycle.
 */
/** Round half up (matches JS Math.round and Python `round_half_up`). */
function roundHalfUp(x) {
    return Math.floor(x + 0.5);
}
function oppositeParity(p) {
    if (p === "odd")
        return "even";
    if (p === "even")
        return "odd";
    return "every";
}
/** Monday-based weekday of a JS Date (0 = Monday … 6 = Sunday). */
function mondayBasedWeekday(d) {
    return (d.getDay() + 6) % 7;
}
/** Parity of the ISO week containing the next occurrence of the anchor weekday. */
function anchorWeekParity(anchorWeekday, today) {
    const a = Math.max(0, Math.min(6, Math.round(anchorWeekday)));
    for (let i = 0; i < 8; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
        if (mondayBasedWeekday(d) === a) {
            return isoWeekNumber(d) % 2 === 1 ? "odd" : "even";
        }
    }
    return "odd";
}
function times(meta) {
    const raw = meta?.times;
    const out = [];
    if (Array.isArray(raw)) {
        for (const x of raw) {
            const s = String(x).trim();
            if (s)
                out.push(s);
        }
    }
    return out.length ? out : ["06:00"];
}
function anchor(meta) {
    const n = Number(meta?.anchor_weekday ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.min(6, Math.round(n))) : 0;
}
function nValue(meta, def = 2) {
    const n = Number(meta?.n ?? def);
    return Number.isFinite(n) ? Math.max(1, Math.round(n)) : def;
}
function weekDays(meta) {
    const raw = meta?.week_days;
    const out = [];
    const seen = new Set();
    if (Array.isArray(raw)) {
        for (const x of raw) {
            const v = Number(x);
            if (Number.isInteger(v) && v >= 0 && v <= 6 && !seen.has(v)) {
                seen.add(v);
                out.push(v);
            }
        }
    }
    out.sort((a, b) => a - b);
    return out;
}
function everyNDaysSlots(n, a, timeLocal, p0) {
    const runs = Math.max(1, roundHalfUp(14 / n));
    const offsets = [];
    for (let k = 0; k < runs; k++)
        offsets.push(roundHalfUp((k * 14) / runs));
    const weekA = [];
    const weekB = [];
    const seenA = new Set();
    const seenB = new Set();
    for (const off of offsets) {
        const wd = (a + off) % 7;
        if (off < 7) {
            if (!seenA.has(wd)) {
                seenA.add(wd);
                weekA.push(wd);
            }
        }
        else if (!seenB.has(wd)) {
            seenB.add(wd);
            weekB.push(wd);
        }
    }
    weekA.sort((x, y) => x - y);
    weekB.sort((x, y) => x - y);
    const sameSet = weekA.length === weekB.length && weekA.every((v, i) => v === weekB[i]);
    if (weekA.length && weekB.length && sameSet) {
        return [{ weekdays: weekA, time_local: timeLocal, week_parity: "every" }];
    }
    const out = [];
    if (weekA.length)
        out.push({ weekdays: weekA, time_local: timeLocal, week_parity: p0 });
    if (weekB.length)
        out.push({ weekdays: weekB, time_local: timeLocal, week_parity: oppositeParity(p0) });
    return out;
}
function generateCycleSlots(kind, meta, anchorParity = "odd") {
    const ts = times(meta);
    const a = anchor(meta);
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    switch (kind) {
        case "daily":
            return [{ weekdays: allDays, time_local: ts[0], week_parity: "every" }];
        case "twice_daily": {
            const t2 = ts.length > 1 ? ts[1] : ts[0];
            return [
                { weekdays: allDays, time_local: ts[0], week_parity: "every" },
                { weekdays: allDays, time_local: t2, week_parity: "every" },
            ];
        }
        case "weekly":
            return [{ weekdays: [a], time_local: ts[0], week_parity: "every" }];
        case "biweekly":
            return [{ weekdays: [a], time_local: ts[0], week_parity: anchorParity }];
        case "n_per_week": {
            const days = weekDays(meta);
            return [
                { weekdays: days.length ? days : [a], time_local: ts[0], week_parity: "every" },
            ];
        }
        case "every_n_days":
            return everyNDaysSlots(nValue(meta), a, ts[0], anchorParity);
        default: {
            const days = weekDays(meta);
            return [
                { weekdays: days.length ? days : [a], time_local: ts[0], week_parity: "every" },
            ];
        }
    }
}
function cycleIsExact(kind, meta) {
    if (kind !== "every_n_days")
        return true;
    return 14 % nValue(meta) === 0;
}
/** Whether ``d`` falls in a week matching the slot cycle (ISO calendar week). */
function weekParityMatches(d, parity) {
    if (parity === "odd")
        return isoWeekNumber(d) % 2 === 1;
    if (parity === "even")
        return isoWeekNumber(d) % 2 === 0;
    return true;
}
/** 14-day strip starting at `start`; a day runs when any slot fires on it. */
function previewStrip(slots, start, today, days = 14) {
    const out = [];
    const tKey = today.toDateString();
    for (let i = 0; i < days; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const wd = mondayBasedWeekday(d);
        const run = slots.some((s) => s.weekdays.includes(wd) && weekParityMatches(d, s.week_parity));
        out.push({ date: d, run, isToday: d.toDateString() === tKey });
    }
    return out;
}
/** Day-gaps between consecutive fires over a 28-day window from `start`. */
function previewGaps(slots, start, days = 28) {
    const fires = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const wd = mondayBasedWeekday(d);
        if (slots.some((s) => s.weekdays.includes(wd) && weekParityMatches(d, s.week_parity))) {
            fires.push(d);
        }
    }
    const gaps = [];
    for (let i = 0; i < fires.length - 1; i++) {
        gaps.push(Math.round((fires[i + 1].getTime() - fires[i].getTime()) / 86400000));
    }
    return gaps;
}
/** First date on/after `start` on which any slot fires (null if none within 28 days). */
function firstRunDate(slots, start, days = 28) {
    for (let i = 0; i < days; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const wd = mondayBasedWeekday(d);
        if (slots.some((s) => s.weekdays.includes(wd) && weekParityMatches(d, s.week_parity))) {
            return d;
        }
    }
    return null;
}

const MODES = ["eco", "normal", "extra"];
class ViewOverview extends i$2 {
    constructor() {
        super(...arguments);
        this._busy = false;
        this._tickMs = 0;
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
        sharedStyles,
        i$5 `
      .overview-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
        align-items: start;
        margin-bottom: 20px;
      }
      @container siview (min-width: 780px) {
        .overview-grid {
          grid-template-columns: minmax(300px, 0.85fr) 1.15fr;
        }
      }
      .overview-grid ha-card {
        margin-bottom: 0;
        height: 100%;
        box-sizing: border-box;
      }
      .pause-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 12px;
        border: 1px solid color-mix(in srgb, var(--warning-color, #f0b23a) 45%, transparent);
        background: color-mix(in srgb, var(--warning-color, #f0b23a) 10%, transparent);
        margin-bottom: 20px;
        font-size: 0.9rem;
      }
      .pause-banner ha-icon {
        color: var(--warning-color, #f0b23a);
        flex-shrink: 0;
      }
      .pause-banner .btn-outline {
        margin-left: auto;
      }
      .state-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 4px 10px;
        border-radius: 999px;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
        color: var(--secondary-text-color);
      }
      .state-badge::before {
        content: "";
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }
      .state-badge.running {
        color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 14%, transparent);
      }
      .state-badge.error {
        color: var(--error-color);
        background: color-mix(in srgb, var(--error-color) 14%, transparent);
      }
      .hero-state {
        font-size: 2.6rem;
        font-weight: 300;
        line-height: 1.05;
        letter-spacing: -0.03em;
        margin: 8px 0 12px;
      }
      .hero-state.running {
        color: var(--primary-color);
      }
      .hero-state.error {
        color: var(--error-color);
      }
      .hero-sub {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: -6px 0 12px;
        color: var(--secondary-text-color);
        font-size: 0.9rem;
      }
      .hero-sub ha-icon {
        --mdc-icon-size: 18px;
        flex: none;
      }
      .num {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .pill-list {
        list-style: none;
        margin: 14px 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .pill {
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
      .pill ha-icon {
        flex-shrink: 0;
        --mdc-icon-size: 20px;
        color: var(--primary-color);
        margin-top: 1px;
      }
      .pill strong {
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .action-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 18px;
      }
      /* Next-runs list */
      .nr {
        border: 1px solid var(--divider-color);
        border-radius: 10px;
        padding: 12px 14px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: background 0.12s ease, border-color 0.12s ease;
      }
      .nr:hover {
        border-color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 4%, transparent);
      }
      .nr:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      .nr.first {
        border-left: 3px solid var(--primary-color);
      }
      .nr.faded {
        border-style: dashed;
        opacity: 0.72;
      }
      .nr-top {
        display: flex;
        align-items: baseline;
        gap: 8px 10px;
        flex-wrap: wrap;
      }
      .nr-when {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .nr-desc {
        color: var(--secondary-text-color);
        font-size: 0.88rem;
      }
      .nr-dur {
        margin-left: auto;
        color: var(--primary-color);
        font-variant-numeric: tabular-nums;
        font-size: 0.85rem;
        white-space: nowrap;
      }
      .nr-zones {
        color: var(--secondary-text-color);
        font-size: 0.85rem;
        margin-top: 4px;
        line-height: 1.4;
      }
      .mode-total {
        margin: 12px 0 0;
        font-size: 0.85rem;
        color: var(--secondary-text-color);
      }
      .mode-total .num {
        color: var(--primary-text-color);
      }
    `,
    ]; }
    connectedCallback() {
        super.connectedCallback();
        this._syncTick();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this._clearTick();
    }
    updated() {
        this._syncTick();
    }
    /** Second-resolution while a zone is watering, lazy otherwise. */
    _syncTick() {
        const wanted = this._runBusy() ? 1000 : 30000;
        if (this._tick !== undefined && this._tickMs === wanted)
            return;
        this._clearTick();
        this._tickMs = wanted;
        this._tick = window.setInterval(() => this.requestUpdate(), wanted);
    }
    _clearTick() {
        if (this._tick !== undefined)
            window.clearInterval(this._tick);
        this._tick = undefined;
    }
    get _inst() {
        return this.installation ?? {};
    }
    _mode() {
        const m = String(this._inst.mode ?? "normal");
        return MODES.includes(m) ? m : "normal";
    }
    _planEnabled() {
        return Boolean(this._inst.enabled ?? true);
    }
    _pauseUntil() {
        const raw = this._inst.pause_until;
        if (!raw || typeof raw !== "string")
            return null;
        const ms = Date.parse(raw);
        return Number.isNaN(ms) || ms <= Date.now() ? null : ms;
    }
    _zoneName(zoneId) {
        const zones = this._inst.zones;
        const z = zones?.[zoneId];
        return z ? String(z.name ?? zoneId) : zoneId;
    }
    /** Friendly name of any entity, falling back to its id. */
    _entityName(entityId) {
        const st = this.hass?.states?.[entityId];
        return st ? String(st.attributes?.friendly_name ?? entityId) : entityId;
    }
    _zonesPhaseInput() {
        const zones = this._inst.zones;
        const out = {};
        if (!zones)
            return out;
        for (const [id, z] of Object.entries(zones)) {
            out[id] = { enabled: Boolean(z?.enabled ?? true), exclusive: Boolean(z?.exclusive ?? false) };
        }
        return out;
    }
    _maxParallel() {
        const n = Number(this._inst.max_parallel_zones ?? 2);
        return Number.isFinite(n) && n >= 1 ? n : 2;
    }
    _slotEstimateMin(zoneIds, mode) {
        const zones = this._inst.zones;
        if (!zones)
            return 0;
        const phases = computePhases(zoneIds, this._zonesPhaseInput(), this._maxParallel(), true);
        const preStart = Math.max(0, Number(this._inst.pre_start_delay_sec ?? 10)) / 60;
        let total = preStart;
        for (const phase of phases) {
            let phaseMax = 0;
            for (const zid of phase) {
                const z = zones[zid];
                if (z && Boolean(z.enabled ?? true))
                    phaseMax = Math.max(phaseMax, durationForMode(z, mode));
            }
            total += phaseMax;
        }
        return Math.round(total);
    }
    _slotZoneIds(slotId) {
        const slots = this._inst.schedule_slots;
        const s = slots?.find((x) => String(x.slot_id) === slotId);
        return s && Array.isArray(s.zone_ids_ordered) ? s.zone_ids_ordered : [];
    }
    /** Humanised cadence for a slot ("every 2 days", "weekly", or its weekday list). */
    _kindLabel(slot) {
        const kind = String(slot.cycle_kind ?? "custom");
        const meta = slot.cycle_meta ?? null;
        switch (kind) {
            case "daily":
                return t(this.hass, "config_panel.cycle_kind_daily");
            case "weekly":
                return t(this.hass, "config_panel.cycle_kind_weekly");
            case "biweekly":
                return t(this.hass, "config_panel.cycle_kind_biweekly");
            case "n_per_week":
                return t(this.hass, "config_panel.cycle_kind_n_per_week");
            case "every_n_days":
                return meta?.n === 3
                    ? t(this.hass, "config_panel.cycle_kind_every_3_days")
                    : t(this.hass, "config_panel.cycle_kind_every_2_days");
            default: {
                const wds = Array.isArray(slot.weekdays)
                    ? slot.weekdays
                    : [Number(slot.weekday ?? 0)];
                return weekdaysSummary(this.hass, wds);
            }
        }
    }
    /** The next `limit` distinct run fires across all enabled slots (client-side). */
    _upcomingRuns(limit) {
        const slots = this._inst.schedule_slots ?? [];
        if (!this._planEnabled())
            return [];
        const pauseMs = this._pauseUntil();
        const now = new Date();
        const runs = [];
        const mode = this._mode();
        for (let i = 0; i < 21 && runs.length < limit * 4; i++) {
            const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            const wd = mondayBasedWeekday(day);
            for (const slot of slots) {
                if (!(slot.enabled ?? true))
                    continue;
                const weekdays = Array.isArray(slot.weekdays)
                    ? slot.weekdays
                    : [Number(slot.weekday ?? 0)];
                if (!weekdays.includes(wd))
                    continue;
                const parity = String(slot.week_parity ?? "every");
                if (!weekParityMatches(day, parity))
                    continue;
                const [h, mi] = String(slot.time_local ?? "06:00").split(":").map(Number);
                const when = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h || 0, mi || 0);
                if (when <= now)
                    continue;
                if (pauseMs !== null && when.getTime() < pauseMs)
                    continue;
                const zoneIds = Array.isArray(slot.zone_ids_ordered)
                    ? slot.zone_ids_ordered
                    : [];
                runs.push({
                    when,
                    label: String(slot.cycle_meta?.label ?? slot.name ?? "").trim(),
                    kind: this._kindLabel(slot),
                    zoneNames: zoneIds.map((id) => this._zoneName(id)),
                    est: this._slotEstimateMin(zoneIds, mode),
                    slotId: String(slot.slot_id ?? ""),
                });
            }
        }
        runs.sort((a, b) => a.when.getTime() - b.when.getTime());
        return runs.slice(0, limit);
    }
    _relDay(d) {
        const now = new Date();
        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diff = Math.round((startD.getTime() - startToday.getTime()) / 86400000);
        if (diff === 0)
            return t(this.hass, "config_panel.overview_today");
        if (diff === 1)
            return t(this.hass, "config_panel.overview_tomorrow");
        return weekdayLong(this.hass, mondayBasedWeekday(d));
    }
    _fmtCountdown(ms) {
        const diff = ms - Date.now();
        if (diff <= 0)
            return t(this.hass, "config_panel.overview_countdown_soon");
        const totalMin = Math.round(diff / 60000);
        const d = Math.floor(totalMin / 1440);
        const h = Math.floor((totalMin % 1440) / 60);
        const m = totalMin % 60;
        if (d > 0)
            return t(this.hass, "config_panel.overview_countdown_days", { d, h });
        if (h > 0)
            return t(this.hass, "config_panel.overview_countdown_hours", { h, m });
        if (m > 0)
            return t(this.hass, "config_panel.overview_countdown_minutes", { m });
        return t(this.hass, "config_panel.overview_countdown_soon");
    }
    /** Planned end of a watering zone, as pushed by the runtime. */
    _zoneEndsAt(zoneId) {
        const rs = (this.runState ?? {});
        const ends = rs.zone_ends_at;
        const raw = ends?.[zoneId];
        if (!raw)
            return null;
        const ms = new Date(raw).getTime();
        return Number.isFinite(ms) ? ms : null;
    }
    /** `m:ss` while watering — a running zone is minutes, not days, away from done. */
    _fmtRemaining(endsAtMs) {
        const diff = endsAtMs - Date.now();
        if (diff <= 0)
            return t(this.hass, "config_panel.general_remaining_finishing");
        const totalSec = Math.round(diff / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
        return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
    }
    _fmtTime(d) {
        return formatTimeLocalForDisplay(this.hass, `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`);
    }
    _runBusy() {
        const s = String((this.runState ?? {}).run_state ?? "idle");
        return ["preparing", "running", "stopping"].includes(s);
    }
    async _call(fn) {
        this._busy = true;
        this._msg = undefined;
        this.requestUpdate();
        try {
            const res = await fn();
            if (!res.success)
                this._msg = formatApiError(res.error, this.hass);
            else
                this.onSaved?.();
        }
        catch (e) {
            this._msg = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
            this.requestUpdate();
        }
    }
    _setMode(mode) {
        if (mode === this._mode())
            return;
        void this._call(() => saveGlobal(this.hass, this.entryId, { mode }));
    }
    _runNextSlot(runs) {
        const sid = runs[0]?.slotId || this.scheduleNext?.slots?.[0]?.slot_id;
        if (!sid)
            return;
        void this._call(() => runSlotNow(this.hass, this.entryId, sid));
    }
    _pause48h() {
        const until = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
        void this._call(() => saveGlobal(this.hass, this.entryId, { pause_until: until }));
    }
    _goSchedule(slotId) {
        const q = slotId ? `?editSlot=${encodeURIComponent(slotId)}` : "";
        navigate(this, `${exportPath(this.entryId, "schedule")}${q}`);
    }
    _renderCurrentRun(runs) {
        const rs = (this.runState ?? {});
        const runState = String(rs.run_state ?? "idle");
        const runBusy = this._runBusy();
        const activeIds = Array.isArray(rs.active_zone_ids) ? rs.active_zone_ids : [];
        // Only while actually watering: "preparing" and "stopping" have no deadline to
        // count down to, and a leftover entry must never render a phantom countdown.
        const remainingRows = runState === "running"
            ? activeIds
                .map((id) => ({ name: this._zoneName(id), endsAt: this._zoneEndsAt(id) }))
                .filter((r) => r.endsAt !== null)
            : [];
        const lastErr = rs.last_error ? String(rs.last_error) : "";
        const upcoming = Array.isArray(rs.upcoming_phases) ? rs.upcoming_phases : [];
        const nextZones = upcoming
            .map((g) => g.map((id) => this._zoneName(String(id))).join(", "))
            .filter(Boolean)
            .join(" → ");
        const mode = this._mode();
        const next = runs[0];
        const badgeClass = runBusy ? "running" : runState === "error" ? "error" : "";
        const stateWord = runBusy
            ? runState === "preparing"
                ? t(this.hass, "config_panel.general_state_preparing")
                : runState === "stopping"
                    ? t(this.hass, "config_panel.general_state_stopping")
                    : t(this.hass, "config_panel.general_state_running")
            : runState === "error"
                ? t(this.hass, "config_panel.general_state_error_idle")
                : t(this.hass, "config_panel.general_state_idle");
        const showSkip = runBusy && runState !== "stopping" && (runState === "preparing" || upcoming.length > 0);
        // A blocking script is why "Preparing" can sit there for minutes — name it.
        const activeScript = rs.active_script ? String(rs.active_script) : "";
        const scriptLine = activeScript
            ? t(this.hass, runState === "stopping"
                ? "config_panel.general_state_post_run_script"
                : "config_panel.general_state_pre_start_script", { name: this._entityName(activeScript) })
            : "";
        return b `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:sprinkler-variant"></ha-icon>
          ${t(this.hass, "config_panel.general_card_current_run")}
          <span class="header-actions">
            <span class="state-badge ${badgeClass}">${stateWord}</span>
          </span>
        </div>
        <div class="card-content">
          ${this._msg ? b `<div class="error">${this._msg}</div>` : A}
          <div class="hero-state ${badgeClass}">${stateWord}</div>
          ${scriptLine
            ? b `<div class="hero-sub">
                <ha-icon icon="mdi:script-text-play-outline"></ha-icon>
                <span>${scriptLine}</span>
              </div>`
            : A}

          ${!runBusy && this._planEnabled() && next
            ? b `
                <div class="meta-line">
                  <span class="meta"
                    ><ha-icon icon="mdi:clock-outline"></ha-icon>${this._fmtCountdown(next.when.getTime())}</span
                  >
                  <span class="meta"
                    ><ha-icon icon="mdi:water-percent"></ha-icon>${t(this.hass, `config_panel.general_mode_${mode}`)}</span
                  >
                  ${next.zoneNames.length
                ? b `<span class="meta"
                        ><ha-icon icon="mdi:format-list-numbered"></ha-icon>${t(this.hass, "config_panel.overview_zones_queued", { n: next.zoneNames.length })}</span
                      >`
                : A}
                  ${next.est > 0
                ? b `<span class="meta"
                        ><ha-icon icon="mdi:timer-outline"></ha-icon
                        ><span class="num">~${next.est}</span> min</span
                      >`
                : A}
                </div>
              `
            : A}

          ${activeIds.length || nextZones || lastErr
            ? b `
                <ul class="pill-list">
                  ${activeIds.length
                ? b `<li class="pill">
                        <ha-icon icon="mdi:water"></ha-icon>
                        <span><strong>${t(this.hass, "config_panel.general_active_zones")}</strong>
                          ${activeIds.map((id) => this._zoneName(id)).join(", ")}</span>
                      </li>`
                : A}
                  ${remainingRows.length
                ? b `<li class="pill">
                        <ha-icon icon="mdi:timer-sand"></ha-icon>
                        <span><strong>${t(this.hass, "config_panel.general_remaining")}</strong>
                          ${remainingRows.map((r, i) => b `${i > 0 ? ", " : ""}${r.name}
                                <span class="num">${this._fmtRemaining(r.endsAt)}</span>`)}</span>
                      </li>`
                : A}
                  ${nextZones
                ? b `<li class="pill">
                        <ha-icon icon="mdi:playlist-play"></ha-icon>
                        <span><strong>${t(this.hass, "config_panel.general_next_zones")}</strong>
                          ${nextZones}</span>
                      </li>`
                : A}
                  ${lastErr
                ? b `<li class="pill">
                        <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
                        <span><strong>${t(this.hass, "config_panel.general_last_error")}</strong>
                          ${lastErr}</span>
                      </li>`
                : A}
                </ul>
              `
            : A}

          <div class="action-row">
            ${runBusy
            ? b `
                  <!-- Already stopping: the run is ending and its cleanup (post-run
                       script) cannot be cut short, so the button would only hang. The
                       hero line above says what it is waiting for. -->
                  <button type="button" class="btn-danger"
                    ?disabled=${this._busy || runState === "stopping"}
                    @click=${() => this._call(() => panelControl(this.hass, this.entryId, "stop"))}>
                    ${t(this.hass, "config_panel.general_stop_irrigation")}
                  </button>
                  ${showSkip
                ? b `<button type="button" class="btn-outline" ?disabled=${this._busy}
                        @click=${() => this._call(() => panelControl(this.hass, this.entryId, "skip_phase"))}>
                        ${t(this.hass, "config_panel.general_skip_phase")}
                      </button>`
                : A}
                `
            : b `
                  <button type="button" class="btn"
                    ?disabled=${this._busy || !this._planEnabled() || !next}
                    @click=${() => this._runNextSlot(runs)}>
                    ${t(this.hass, "config_panel.overview_run_next_now")}
                  </button>
                  <button type="button" class="btn-outline"
                    ?disabled=${this._busy || !this._planEnabled()}
                    @click=${() => this._call(() => skipIrrigationToday(this.hass, this.entryId))}>
                    ${t(this.hass, "config_panel.general_skip_today")}
                  </button>
                  <button type="button" class="btn-outline"
                    ?disabled=${this._busy || !this._planEnabled()}
                    @click=${() => this._pause48h()}>
                    ${t(this.hass, "config_panel.overview_pause_48h")}
                  </button>
                `}
            ${lastErr
            ? b `<button type="button" class="btn-outline" ?disabled=${this._busy}
                  @click=${() => this._call(() => panelControl(this.hass, this.entryId, "clear_error"))}>
                  ${t(this.hass, "config_panel.general_clear_error")}
                </button>`
            : A}
          </div>
        </div>
      </ha-card>
    `;
    }
    _renderNextRuns(runs) {
        return b `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:calendar-clock"></ha-icon>
          ${t(this.hass, "config_panel.overview_next_runs")}
          <span class="header-actions">
            <button type="button" class="btn-icon" @click=${() => this._goSchedule()}>
              ${t(this.hass, "config_panel.tab_schedule")} →
            </button>
          </span>
        </div>
        <div class="card-content">
          ${!this._planEnabled()
            ? b `<p class="hint">${t(this.hass, "config_panel.general_plan_off_hint")}</p>`
            : A}
          ${runs.length
            ? runs.map((r, i) => {
                const desc = [r.label, r.kind].filter(Boolean).join(" · ");
                return b `
                  <div
                    class="nr ${i === 0 ? "first" : ""} ${i >= 2 ? "faded" : ""}"
                    role="button"
                    tabindex="0"
                    @click=${() => this._goSchedule(r.slotId)}
                    @keydown=${(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        this._goSchedule(r.slotId);
                    }
                }}
                  >
                    <div class="nr-top">
                      <span class="nr-when">${this._relDay(r.when)} ${this._fmtTime(r.when)}</span>
                      <span class="nr-desc">${desc}</span>
                      ${r.est > 0
                    ? b `<span class="nr-dur">~${r.est} min</span>`
                    : A}
                    </div>
                    ${r.zoneNames.length && i < 2
                    ? b `<div class="nr-zones ellipsis">${r.zoneNames.join(", ")}</div>`
                    : A}
                  </div>
                `;
            })
            : b `<div class="empty-state">
                <ha-icon icon="mdi:calendar-blank-outline"></ha-icon>
                <p>${t(this.hass, "config_panel.general_no_slots")}</p>
                <button type="button" class="btn-outline" @click=${() => this._goSchedule()}>
                  ${t(this.hass, "config_panel.tab_schedule")}
                </button>
              </div>`}
        </div>
      </ha-card>
    `;
    }
    _renderMode(runs) {
        const mode = this._mode();
        const next = runs[0];
        const zoneIds = next ? this._slotZoneIds(next.slotId) : [];
        const eco = zoneIds.length ? this._slotEstimateMin(zoneIds, "eco") : 0;
        const extra = zoneIds.length ? this._slotEstimateMin(zoneIds, "extra") : 0;
        const cur = next?.est ?? 0;
        return b `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:water-percent"></ha-icon>
          ${t(this.hass, "config_panel.general_watering_mode")}
        </div>
        <div class="card-content">
          <div class="segmented" role="group" aria-label=${t(this.hass, "config_panel.general_watering_mode")}>
            ${MODES.map((m) => b `<button
                type="button"
                class=${m === mode ? "selected" : ""}
                aria-pressed=${m === mode ? "true" : "false"}
                ?disabled=${this._busy}
                @click=${() => this._setMode(m)}
              >
                ${t(this.hass, `config_panel.general_mode_${m}`)}
              </button>`)}
          </div>
          ${next
            ? b `<p class="mode-total">
                ${t(this.hass, "config_panel.overview_mode_total", { n: cur })} ·
                ${t(this.hass, "config_panel.general_mode_eco")}
                <span class="num">${eco}</span> min ·
                ${t(this.hass, "config_panel.general_mode_extra")}
                <span class="num">${extra}</span> min
              </p>`
            : A}
          <details class="inline-help">
            <summary>
              <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
              ${t(this.hass, "config_panel.general_watering_mode")}
            </summary>
            <p>${t(this.hass, "config_panel.general_watering_mode_desc")}</p>
          </details>
        </div>
      </ha-card>
    `;
    }
    render() {
        const pauseMs = this._pauseUntil();
        const runs = this._upcomingRuns(4);
        return b `
      ${pauseMs !== null
            ? b `<div class="pause-banner">
            <ha-icon icon="mdi:pause-circle-outline"></ha-icon>
            <span>${t(this.hass, "config_panel.general_pause_active_hint", {
                when: new Date(pauseMs).toLocaleString(),
            })}</span>
            <button type="button" class="btn-outline" ?disabled=${this._busy}
              @click=${() => this._call(() => saveGlobal(this.hass, this.entryId, { pause_until: null }))}>
              ${t(this.hass, "config_panel.general_clear_pause")}
            </button>
          </div>`
            : A}

      <div class="overview-grid">
        ${this._renderCurrentRun(runs)}
        ${this._renderNextRuns(runs)}
      </div>
      ${this._renderMode(runs)}
    `;
    }
}
__decorate([
    r()
], ViewOverview.prototype, "_busy", void 0);
__decorate([
    r()
], ViewOverview.prototype, "_msg", void 0);
defineCustomElementOnce("si-view-overview", ViewOverview);

/**
 * Render Home Assistant's standard searchable entity picker.
 *
 * Entity names, icons, supporting information, and search are deliberately left
 * to the Home Assistant frontend. The value emitted by the picker is always the
 * selected entity_id.
 */
function renderNativeEntityField(hass, domains, label, value, onValue, { placeholderKey = "config_panel.entity_placeholder_example", allowCustom = false, } = {}) {
    return b `
    <ha-entity-picker
      .hass=${hass}
      .label=${label}
      .value=${value || undefined}
      .includeDomains=${domains}
      .placeholder=${t(hass, placeholderKey)}
      .allowCustomEntity=${allowCustom}
      .required=${false}
      @value-changed=${(e) => onValue(e.detail.value ?? "")}
    ></ha-entity-picker>
  `;
}

const GUARD_OPERATORS = [
    "above",
    "below",
    "equals",
    "state_is",
    "is_true",
    "is_false",
];
/** Operators comparing the state as a number. */
const GUARD_NUMERIC_OPERATORS = ["above", "below", "equals"];
/** Operators comparing the state as text. */
const GUARD_TEXT_OPERATORS = ["state_is"];
/**
 * Ranked suggestions only, never a filter: `parse_guard_list` is deliberately
 * domain-agnostic, so the picker for these fields runs with `allowCustom`.
 */
const GUARD_ENTITY_DOMAINS = [
    "sensor",
    "binary_sensor",
    "input_boolean",
    "input_number",
    "input_select",
    "number",
    "switch",
];
const isNumericOp = (op) => GUARD_NUMERIC_OPERATORS.includes(op);
const isTextOp = (op) => GUARD_TEXT_OPERATORS.includes(op);
/** Boolean operators need no value at all. */
const needsValue = (op) => isNumericOp(op) || isTextOp(op);
function asOperator(raw) {
    const s = String(raw ?? "");
    return GUARD_OPERATORS.includes(s) ? s : "above";
}
/** Build a clean Guard[] from whatever the API delivered. */
function normalizeGuards(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw.map((entry) => {
        const o = (entry ?? {});
        const operator = asOperator(o.operator);
        let value = null;
        if (isNumericOp(operator)) {
            value = o.value === null || o.value === undefined || o.value === "" ? null : Number(o.value);
        }
        else if (isTextOp(operator)) {
            value = o.value === null || o.value === undefined ? "" : String(o.value);
        }
        return { entity_id: String(o.entity_id ?? "").trim(), operator, value };
    });
}
/** Drop blank rows and null out values the operator does not use. */
function guardsForSave(guards) {
    return guards
        .filter((g) => g.entity_id.trim() !== "")
        .map((g) => ({
        entity_id: g.entity_id.trim(),
        operator: g.operator,
        value: needsValue(g.operator) ? g.value : null,
    }));
}
/** True when a row has an entity but is missing the value its operator needs. */
function guardsIncomplete(guards) {
    return guards.some((g) => {
        const hasEntity = g.entity_id.trim() !== "";
        if (!hasEntity)
            return false;
        if (!needsValue(g.operator))
            return false;
        if (isNumericOp(g.operator))
            return g.value === null || Number.isNaN(Number(g.value));
        return String(g.value ?? "").trim() === "";
    });
}
function entityName(hass, entityId) {
    const st = hass.states[entityId];
    return st ? String(st.attributes?.friendly_name ?? entityId) : entityId;
}
/** Current reading of the guarded entity, or "" when unknown. */
function currentState(hass, entityId) {
    const st = hass.states[entityId];
    return st ? String(st.state) : "";
}
/** Human-readable single guard, e.g. "Tank level is above 20". */
function guardLabel(hass, g) {
    const op = t(hass, `config_panel.guard_op_${g.operator}`);
    const entity = entityName(hass, g.entity_id);
    if (!needsValue(g.operator)) {
        return t(hass, "config_panel.guard_label_boolean", { entity, op });
    }
    return t(hass, "config_panel.guard_label_numeric", {
        entity,
        op,
        value: String(g.value ?? ""),
    });
}
/** One guard spelled out; several collapsed to a count. */
function guardsSummary(hass, guards) {
    if (guards.length === 0)
        return t(hass, "config_panel.guards_none");
    if (guards.length === 1)
        return guardLabel(hass, guards[0]);
    return t(hass, "config_panel.guards_count", { n: String(guards.length) });
}
function renderValueField(hass, guard, onValue) {
    if (!needsValue(guard.operator))
        return A;
    if (isTextOp(guard.operator)) {
        // The offered states come from the selected entity, so without one there is
        // nothing to choose from — say so instead of showing an empty dropdown.
        const noEntity = guard.entity_id.trim() === "";
        return b `<ha-selector
      class="guard-value"
      .hass=${hass}
      .selector=${{ state: { entity_id: guard.entity_id } }}
      .label=${t(hass, "config_panel.guards_value_label")}
      .value=${String(guard.value ?? "")}
      .disabled=${noEntity}
      .helper=${noEntity ? t(hass, "config_panel.guards_value_needs_entity") : undefined}
      @value-changed=${(e) => onValue(e.detail.value ?? "")}
    ></ha-selector>`;
    }
    return b `<ha-input
    class="guard-value"
    type="number"
    step="any"
    .label=${t(hass, "config_panel.guards_value_label")}
    .value=${guard.value === null || guard.value === undefined ? "" : String(guard.value)}
    @input=${(e) => {
        const raw = e.target.value;
        onValue(raw === "" ? null : Number(raw));
    }}
  ></ha-input>`;
}
/**
 * Repeatable guard editor. Mirrors the pre-start entity list pattern.
 * `onChange` always receives a fresh array so callers can mark dirty uniformly.
 */
function renderGuardList(hass, domains, guards, onChange) {
    const replaceAt = (i, patch) => {
        const next = guards.map((g, idx) => (idx === i ? { ...g, ...patch } : g));
        onChange(next);
    };
    return b `
    <div class="guard-rows">
      ${guards.map((g, i) => {
        const reading = currentState(hass, g.entity_id);
        return b `
          <div class="guard-row">
            ${renderNativeEntityField(hass, domains, t(hass, "config_panel.guards_entity_label"), g.entity_id, (v) => replaceAt(i, {
            entity_id: v,
            // A state value belongs to the selected entity; do not keep
            // a potentially invalid option when the entity changes.
            value: v === g.entity_id ? g.value : isTextOp(g.operator) ? "" : g.value,
        }), {
            placeholderKey: "config_panel.guards_entity_placeholder",
            allowCustom: true,
        })}
            <div class="stacked-field guard-operator">
              <label class="stacked-field-label"
                >${t(hass, "config_panel.guards_operator_label")}</label
              >
              <select
                class="field-select"
                .value=${g.operator}
                @change=${(e) => {
            const op = asOperator(e.target.value);
            // Reset the value when switching between value kinds.
            const value = isNumericOp(op) ? null : isTextOp(op) ? "" : null;
            replaceAt(i, { operator: op, value });
        }}
              >
                ${GUARD_OPERATORS.map((op) => b `<option value=${op} ?selected=${op === g.operator}>
                    ${t(hass, `config_panel.guard_op_${op}`)}
                  </option>`)}
              </select>
            </div>
            ${renderValueField(hass, g, (v) => replaceAt(i, { value: v }))}
            <button
              type="button"
              class="row-remove"
              @click=${() => onChange(guards.filter((_, idx) => idx !== i))}
            >
              ${t(hass, "config_panel.guards_remove")}
            </button>
            ${reading !== ""
            ? b `<p class="hint guard-reading">
                  ${t(hass, "config_panel.guards_current_value", { v: reading })}
                </p>`
            : A}
            ${g.operator === "equals"
            ? b `<p class="hint guard-reading">
                  ${t(hass, "config_panel.guards_equals_hint")}
                </p>`
            : A}
          </div>
        `;
    })}
      <button
        type="button"
        class="btn-outline"
        @click=${() => onChange([...guards, { entity_id: "", operator: "above", value: null }])}
      >
        ${t(hass, "config_panel.guards_add")}
      </button>
    </div>
  `;
}

const SCRIPT_ENTITY_DOMAINS = ["script"];
const MAX_SCRIPT_TIMEOUT_SEC = 3600;
/** Nothing overridden — the installation's script applies. Copy before editing. */
const EMPTY_SCRIPT_OVERRIDE = {
    override: false,
    entity_id: "",
    timeout_sec: null,
};
/** Read one phase's override off a raw slot object from the API. */
function normalizeScriptOverride(raw, phase) {
    const o = raw ?? {};
    const timeout = Number(o[`${phase}_script_timeout_sec`]);
    return {
        override: Boolean(o[`override_${phase}_script`] ?? false),
        entity_id: String(o[`${phase}_script`] ?? "").trim(),
        timeout_sec: Number.isFinite(timeout) && timeout > 0 ? Math.round(timeout) : null,
    };
}
/** The three keys the slot API expects for one phase. */
function scriptOverrideForSave(value, phase) {
    return {
        [`override_${phase}_script`]: value.override,
        [`${phase}_script`]: value.override ? value.entity_id.trim() : "",
        [`${phase}_script_timeout_sec`]: value.override ? value.timeout_sec : null,
    };
}
/** True when either phase replaces the installation's script. */
function hasScriptOverride(pre, post) {
    return pre.override || post.override;
}
function renderScriptOverride(hass, domains, phase, value, 
/** The installation's script and timeout, shown while not overriding. */
globalScript, globalTimeoutSec, busy, onChange) {
    const patch = (p) => onChange({ ...value, ...p });
    return b `
    <div class="field-block">
      <span class="field-title">${t(hass, `config_panel.schedule_${phase}_script_title`)}</span>
      <div class="switch-row">
        <ha-switch
          .disabled=${busy}
          .checked=${value.override}
          @change=${(e) => patch({
        override: Boolean(e.target.checked),
    })}
        ></ha-switch>
        <span class="switch-row-label"
          >${t(hass, `config_panel.schedule_override_${phase}_script`)}</span
        >
      </div>
      ${value.override
        ? b `
            <div class="field-row">
              ${renderNativeEntityField(hass, domains, t(hass, "config_panel.schedule_script_field"), value.entity_id, (v) => patch({ entity_id: v }), { placeholderKey: "config_panel.entity_placeholder_script" })}
            </div>
            <p class="hint">${t(hass, "config_panel.schedule_script_override_hint")}</p>
            ${value.entity_id.trim()
            ? b `
                  <div class="field-row">
                    <ha-input
                      type="number"
                      .label=${t(hass, "config_panel.schedule_script_timeout_field")}
                      .value=${value.timeout_sec === null ? "" : String(value.timeout_sec)}
                      min="1"
                      max=${MAX_SCRIPT_TIMEOUT_SEC}
                      @input=${(e) => {
                const raw = e.target.value.trim();
                if (raw === "") {
                    patch({ timeout_sec: null });
                    return;
                }
                const n = parseInt(raw, 10);
                patch({
                    timeout_sec: Number.isFinite(n)
                        ? Math.max(1, Math.min(MAX_SCRIPT_TIMEOUT_SEC, n))
                        : null,
                });
            }}
                    ></ha-input>
                  </div>
                  <p class="hint">
                    ${t(hass, "config_panel.schedule_script_timeout_hint", {
                n: String(globalTimeoutSec),
            })}
                  </p>
                `
            : A}
          `
        : b `<p class="hint">
            ${globalScript
            ? t(hass, "config_panel.schedule_script_inherited", { script: globalScript })
            : t(hass, "config_panel.schedule_script_inherited_none")}
          </p>`}
    </div>
  `;
}

/** Shared stacked form layout: titles, helper text, full-width controls. */
const formLayoutStyles = i$5 `
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

const KIND_OPTIONS = [
    { id: "daily", kind: "daily", multiAnchor: false, twoTimes: false },
    { id: "every_2_days", kind: "every_n_days", n: 2, multiAnchor: false, twoTimes: false },
    { id: "every_3_days", kind: "every_n_days", n: 3, multiAnchor: false, twoTimes: false },
    { id: "n_per_week", kind: "n_per_week", multiAnchor: true, twoTimes: false },
    { id: "weekly", kind: "weekly", multiAnchor: false, twoTimes: false },
    { id: "biweekly", kind: "biweekly", multiAnchor: false, twoTimes: false },
    { id: "custom", kind: "custom", multiAnchor: true, twoTimes: false },
];
const TIME_PRESETS = [
    { key: "config_panel.cycle_time_preset_early", time: "05:30" },
    { key: "config_panel.cycle_time_preset_morning", time: "08:15" },
    { key: "config_panel.cycle_time_preset_evening", time: "19:00" },
    { key: "config_panel.cycle_time_preset_late", time: "21:00" },
];
class CycleWizard extends i$2 {
    constructor() {
        super(...arguments);
        this.open = false;
        this._step = 1;
        this._optionId = "daily";
        this._times = ["19:00", "06:00"];
        this._anchor = 0;
        this._weekDays = [0, 3];
        this._zoneIds = [];
        this._enabled = true;
        this._label = "";
        this._guards = [];
        this._ignoreGlobalGuards = false;
        this._preStartScript = EMPTY_SCRIPT_OVERRIDE;
        this._postRunScript = EMPTY_SCRIPT_OVERRIDE;
        this._cycleId = null;
        this._busy = false;
        this._seeded = false;
    }
    static { this.properties = {
        hass: { attribute: false },
        entryId: { type: String },
        installation: { type: Object },
        open: { type: Boolean },
        onClose: { attribute: false },
        onSaved: { attribute: false },
    }; }
    static { this.styles = [
        sharedStyles,
        formLayoutStyles,
        i$5 `
      .progress {
        display: flex;
        gap: 6px;
        margin: 0 0 18px;
      }
      .progress .step {
        flex: 1;
        height: 4px;
        border-radius: 2px;
        background: var(--divider-color);
      }
      .progress .step.done {
        background: var(--primary-color);
      }
      .kind-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      @container siview (max-width: 700px) {
        .kind-grid {
          grid-template-columns: 1fr;
        }
      }
      .kind-card {
        text-align: left;
        border: 1px solid var(--divider-color);
        border-radius: 12px;
        padding: 12px 14px;
        background: var(--card-background-color);
        cursor: pointer;
        font: inherit;
        color: var(--primary-text-color);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .kind-card:hover {
        border-color: var(--primary-color);
      }
      .kind-card.selected {
        border-color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 8%, var(--card-background-color));
      }
      .kind-card-title {
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: space-between;
      }
      .kind-card-desc {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        line-height: 1.4;
      }
      .weekday-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 4px 0 8px;
      }
      .weekday-chips .chip.day {
        min-width: 44px;
        min-height: 40px;
        text-align: center;
        justify-content: center;
      }
      .time-fields {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .time-fields input[type="time"] {
        width: auto;
        min-width: 120px;
      }
      .zone-pick {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        margin-bottom: 6px;
      }
      .zone-pick input[type="checkbox"] {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }
      .zone-pick-main {
        flex: 1;
        min-width: 0;
      }
      .zone-pick-name {
        font-weight: 500;
      }
      .summary-card {
        border: 1px solid var(--divider-color);
        border-radius: 10px;
        padding: 12px 14px;
        margin-top: 8px;
        background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
        font-size: 0.9rem;
      }
      .preview-line {
        font-size: 0.85rem;
        color: var(--secondary-text-color);
        margin: 6px 0;
        line-height: 1.5;
      }
    `,
    ]; }
    /** Open the wizard, optionally prefilled at a given step / from an existing cycle. */
    start(opts) {
        this._msg = undefined;
        this._busy = false;
        this._seeded = true;
        if (opts?.seedFromSlots && opts.seedFromSlots.length) {
            this._seedFromSlots(opts.seedFromSlots);
        }
        else {
            this._optionId = opts?.optionId ?? "daily";
            this._cycleId = opts?.cycleId ?? null;
            this._zoneIds = this._defaultZoneIds();
            this._enabled = true;
            this._label = "";
            this._guards = [];
            this._ignoreGlobalGuards = false;
            this._preStartScript = { ...EMPTY_SCRIPT_OVERRIDE };
            this._postRunScript = { ...EMPTY_SCRIPT_OVERRIDE };
            this._syncDefaultsForOption();
        }
        this._step = opts?.step ?? 1;
        this.open = true;
        this.requestUpdate();
    }
    _seedFromSlots(slots) {
        const first = slots[0];
        this._cycleId = String(first.cycle_id ?? "") || null;
        const meta = first.cycle_meta ?? {};
        const kind = String(first.cycle_kind ?? "custom");
        this._optionId =
            kind === "every_n_days"
                ? meta.n === 3
                    ? "every_3_days"
                    : "every_2_days"
                : kind;
        this._label = String(meta.label ?? first.name ?? "");
        const times = slots.map((s) => String(s.time_local ?? "06:00"));
        this._times = [times[0] ?? "19:00", times[1] ?? "06:00"];
        this._anchor = Number(meta.anchor_weekday ?? 0);
        this._weekDays =
            Array.isArray(meta.week_days) && meta.week_days.length
                ? [...meta.week_days]
                : first.weekdays ?? [0];
        this._zoneIds = Array.isArray(first.zone_ids_ordered)
            ? [...first.zone_ids_ordered]
            : this._defaultZoneIds();
        this._enabled = Boolean(first.enabled ?? true);
        this._guards = normalizeGuards(first.guards);
        this._ignoreGlobalGuards = Boolean(first.ignore_global_guards ?? false);
        // All members of a cycle share their scripts, so the first one speaks for all.
        this._preStartScript = normalizeScriptOverride(first, "pre_start");
        this._postRunScript = normalizeScriptOverride(first, "post_run");
    }
    _option() {
        return KIND_OPTIONS.find((o) => o.id === this._optionId) ?? KIND_OPTIONS[0];
    }
    _syncDefaultsForOption() {
        const opt = this._option();
        if (opt.multiAnchor && this._weekDays.length === 0)
            this._weekDays = [0, 3];
    }
    _defaultZoneIds() {
        const zones = this.installation?.zones;
        if (!zones)
            return [];
        return Object.entries(zones)
            .filter(([, z]) => Boolean(z.enabled ?? true))
            .map(([id]) => id);
    }
    _meta() {
        const opt = this._option();
        const meta = { label: this._label.trim(), times: this._times.slice(0, opt.twoTimes ? 2 : 1) };
        if (opt.n)
            meta.n = opt.n;
        if (opt.multiAnchor)
            meta.week_days = [...this._weekDays].sort((a, b) => a - b);
        else
            meta.anchor_weekday = this._anchor;
        return meta;
    }
    _slots() {
        const opt = this._option();
        const p0 = anchorWeekParity(this._anchor, new Date());
        return generateCycleSlots(opt.kind, this._meta(), p0);
    }
    _mode() {
        return String(this.installation?.mode ?? "normal");
    }
    _zonesPhaseInput() {
        const zones = this.installation?.zones;
        const out = {};
        if (!zones)
            return out;
        for (const [id, z] of Object.entries(zones)) {
            out[id] = { enabled: Boolean(z?.enabled ?? true), exclusive: Boolean(z?.exclusive ?? false) };
        }
        return out;
    }
    _maxParallel() {
        const n = Number(this.installation?.max_parallel_zones ?? 2);
        return Number.isFinite(n) && n >= 1 ? n : 2;
    }
    _zoneName(id) {
        const zones = this.installation?.zones;
        const z = zones?.[id];
        return z ? String(z.name ?? id) : id;
    }
    _globalScript(phase) {
        return String(this.installation?.[`${phase}_script`] ?? "").trim();
    }
    _globalScriptTimeout(phase) {
        const n = Number(this.installation?.[`${phase}_script_timeout_sec`] ?? 300);
        return Number.isFinite(n) && n > 0 ? Math.round(n) : 300;
    }
    _zoneDuration(id) {
        const zones = this.installation?.zones;
        return durationForMode(zones?.[id], this._mode());
    }
    _estimateMin() {
        const zones = this.installation?.zones;
        if (!zones)
            return 0;
        const phases = computePhases(this._zoneIds, this._zonesPhaseInput(), this._maxParallel(), true);
        let total = Math.max(0, Number(this.installation?.pre_start_delay_sec ?? 10)) / 60;
        for (const phase of phases) {
            let phaseMax = 0;
            for (const zid of phase) {
                const z = zones[zid];
                if (z && Boolean(z.enabled ?? true))
                    phaseMax = Math.max(phaseMax, durationForMode(z, this._mode()));
            }
            total += phaseMax;
        }
        return Math.round(total);
    }
    _close() {
        this.open = false;
        this._seeded = false;
        this.onClose?.();
        this.requestUpdate();
    }
    _canNext() {
        if (this._step === 2) {
            const opt = this._option();
            if (opt.multiAnchor && this._weekDays.length === 0)
                return false;
        }
        if (this._step === 3 && this._zoneIds.length === 0)
            return false;
        return true;
    }
    /** Conflict with an existing slot: shares a weekday and its [start, start+est] overlaps. */
    _conflicts() {
        const zones = this.installation?.zones;
        if (!zones)
            return false;
        const est = this._estimateMin();
        const mine = this._slots().map((s) => ({
            days: new Set(s.weekdays),
            start: parseTimeLocalToMinutes(s.time_local),
            parity: s.week_parity,
        }));
        const existing = this.installation?.schedule_slots ?? [];
        for (const slot of existing) {
            if (this._cycleId && String(slot.cycle_id ?? "") === this._cycleId)
                continue;
            if (!(slot.enabled ?? true))
                continue;
            const days = new Set(Array.isArray(slot.weekdays) ? slot.weekdays : [Number(slot.weekday ?? 0)]);
            const start = parseTimeLocalToMinutes(String(slot.time_local ?? "00:00"));
            const parity = String(slot.week_parity ?? "every");
            for (const m of mine) {
                const shareDay = [...m.days].some((d) => days.has(d));
                const shareWeek = m.parity === "every" || parity === "every" || m.parity === parity;
                if (!shareDay || !shareWeek)
                    continue;
                // Assume similar duration window for the existing slot too.
                if (m.start < start + est && start < m.start + est)
                    return true;
            }
        }
        return false;
    }
    _shiftLater() {
        this._times = this._times.map((tl) => {
            const min = Math.min(23 * 60 + 59, parseTimeLocalToMinutes(tl) + 60);
            return minutesToTimeLocal(min).padStart(5, "0");
        });
    }
    async _create() {
        this._busy = true;
        this._msg = undefined;
        this.requestUpdate();
        try {
            if (guardsIncomplete(this._guards)) {
                this._msg = t(this.hass, "config_panel.schedule_err_guards_incomplete");
                return;
            }
            const opt = this._option();
            const res = await upsertCycle(this.hass, this.entryId, {
                cycle_id: this._cycleId,
                cycle_kind: opt.kind,
                cycle_meta: this._meta(),
                zone_ids_ordered: this._zoneIds,
                enabled: this._enabled,
                guards: guardsForSave(this._guards),
                ignore_global_guards: this._ignoreGlobalGuards,
                ...scriptOverrideForSave(this._preStartScript, "pre_start"),
                ...scriptOverrideForSave(this._postRunScript, "post_run"),
            });
            if (!res.success) {
                this._msg = formatApiError(res.error, this.hass);
            }
            else {
                const rid = res.cycle_id ?? this._cycleId ?? "";
                this._close();
                this.onSaved?.(rid);
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
    _renderStep1() {
        return b `
      <div class="section-title">${t(this.hass, "config_panel.cycle_step_how_often")}</div>
      <div class="kind-grid">
        ${KIND_OPTIONS.map((opt) => {
            const meta = opt.n ? { n: opt.n } : {};
            const exact = cycleIsExact(opt.kind, meta);
            return b `
            <button
              type="button"
              class="kind-card ${this._optionId === opt.id ? "selected" : ""}"
              @click=${() => {
                this._optionId = opt.id;
                this._syncDefaultsForOption();
            }}
            >
              <span class="kind-card-title">
                ${t(this.hass, `config_panel.cycle_kind_${opt.id}`)}
                <span class="badge ${exact ? "badge-primary" : "badge-warn"}"
                  >${exact
                ? t(this.hass, "config_panel.cycle_badge_exact")
                : t(this.hass, "config_panel.cycle_badge_approx")}</span
                >
              </span>
              <span class="kind-card-desc">${t(this.hass, `config_panel.cycle_kind_${opt.id}_desc`)}</span>
            </button>
          `;
        })}
      </div>
    `;
    }
    _renderWeekdayPicker(multi) {
        const selected = multi ? this._weekDays : [this._anchor];
        return b `
      <div class="weekday-chips" role="group">
        ${[0, 1, 2, 3, 4, 5, 6].map((i) => b `
            <button
              type="button"
              class="chip day ${selected.includes(i) ? "selected" : ""}"
              aria-pressed=${selected.includes(i) ? "true" : "false"}
              title=${weekdayLong(this.hass, i)}
              @click=${() => {
            if (multi) {
                this._weekDays = this._weekDays.includes(i)
                    ? this._weekDays.filter((d) => d !== i)
                    : [...this._weekDays, i].sort((a, b) => a - b);
            }
            else {
                this._anchor = i;
            }
            this.requestUpdate();
        }}
            >
              ${weekdayShort(this.hass, i)}
            </button>
          `)}
      </div>
    `;
    }
    _renderStep2() {
        const opt = this._option();
        const slots = this._slots();
        const today = new Date();
        const start = today;
        const strip = previewStrip(slots, start, today, 14);
        const gaps = previewGaps(slots, start);
        const uniqueGaps = [...new Set(gaps)];
        const first = firstRunDate(slots, start);
        const exact = cycleIsExact(opt.kind, this._meta());
        return b `
      <div class="section-title">${t(this.hass, "config_panel.cycle_step_when")}</div>
      <span class="field-title">${t(this.hass, "config_panel.cycle_time_title")}</span>
      <div class="chips" style="margin:6px 0">
        ${TIME_PRESETS.map((p) => b `
            <button
              type="button"
              class="chip ${this._times[0] === p.time ? "selected" : ""}"
              @click=${() => {
            this._times = [p.time, this._times[1]];
            this.requestUpdate();
        }}
            >
              ${t(this.hass, p.key)} ${formatTimeLocalForDisplay(this.hass, p.time)}
            </button>
          `)}
      </div>
      <div class="time-fields">
        <input
          type="time"
          .value=${this._times[0]}
          @input=${(e) => {
            this._times = [e.target.value || "06:00", this._times[1]];
            this.requestUpdate();
        }}
        />
        ${opt.twoTimes
            ? b `<input
              type="time"
              .value=${this._times[1]}
              @input=${(e) => {
                this._times = [this._times[0], e.target.value || "18:00"];
                this.requestUpdate();
            }}
            />`
            : A}
      </div>

      ${opt.kind === "daily" || opt.kind === "twice_daily"
            ? A
            : b `
            <div class="section-title">${t(this.hass, "config_panel.cycle_anchor_title")}</div>
            <p class="hint">${t(this.hass, "config_panel.cycle_anchor_desc")}</p>
            ${this._renderWeekdayPicker(opt.multiAnchor)}
          `}

      <div class="section-title">${t(this.hass, "config_panel.cycle_preview_title")}</div>
      <div class="day-strip">
        ${strip.map((d) => b `
            <div class="day-cell ${d.run ? "run" : ""} ${d.isToday ? "today" : ""}">
              <span class="dc-dow">${weekdayShort(this.hass, mondayBasedWeekday(d.date))}</span>
              <span class="dc-dom">${d.date.getDate()}</span>
            </div>
          `)}
      </div>
      <p class="preview-line">
        ${t(this.hass, "config_panel.cycle_preview_gaps", { gaps: uniqueGaps.join(", ") })}
        ${!exact ? " · " + t(this.hass, "config_panel.cycle_badge_approx") : ""}
      </p>
      ${first
            ? b `<p class="preview-line">
            ${t(this.hass, "config_panel.cycle_preview_first_run", {
                when: formatDateTimeForDisplay(this.hass, new Date(first.getFullYear(), first.getMonth(), first.getDate(), ...this._times[0].split(":").map(Number))),
            })}
          </p>`
            : A}
    `;
    }
    _renderStep3() {
        const zones = this.installation?.zones;
        const allIds = zones ? Object.keys(zones) : [];
        const pmap = phaseIndexByZoneId(this._zoneIds, this._zonesPhaseInput(), this._maxParallel());
        const est = this._estimateMin();
        const slots = this._slots();
        const first = firstRunDate(slots, new Date());
        const conflict = this._conflicts();
        return b `
      <div class="section-title">
        ${t(this.hass, "config_panel.cycle_step_zones")}
        <button
          type="button"
          class="btn-outline"
          style="margin-left:auto;margin-top:0;padding:4px 10px;font-size:0.8rem"
          @click=${() => {
            this._zoneIds = allIds.filter((id) => Boolean(zones?.[id]?.enabled ?? true));
            this.requestUpdate();
        }}
        >
          ${t(this.hass, "config_panel.cycle_select_all")}
        </button>
      </div>
      ${allIds.map((id) => {
            const checked = this._zoneIds.includes(id);
            const pos = this._zoneIds.indexOf(id);
            const phase = pmap.get(id);
            const excl = Boolean(zones?.[id]?.exclusive ?? false);
            return b `
          <div class="zone-pick">
            <input
              type="checkbox"
              .checked=${checked}
              @change=${(e) => {
                const on = e.target.checked;
                this._zoneIds = on
                    ? [...this._zoneIds, id]
                    : this._zoneIds.filter((x) => x !== id);
                this.requestUpdate();
            }}
            />
            <div class="zone-pick-main">
              <div class="zone-pick-name">${this._zoneName(id)}</div>
              <div class="meta-line">
                <span class="meta"
                  ><ha-icon icon="mdi:timer-outline"></ha-icon>${t(this.hass, "config_panel.timetable_duration_min", { n: this._zoneDuration(id) })}</span
                >
                ${checked && phase
                ? b `<span class="meta"
                      ><ha-icon icon="mdi:layers-triple-outline"></ha-icon>${excl
                    ? t(this.hass, "config_panel.cycle_phase_alone", { n: phase })
                    : t(this.hass, "config_panel.schedule_phase_n", { n: phase })}</span
                    >`
                : A}
              </div>
            </div>
            ${checked
                ? b `
                  <button
                    type="button"
                    class="iconbtn"
                    aria-label=${t(this.hass, "config_panel.schedule_up")}
                    ?disabled=${pos <= 0}
                    @click=${() => {
                    const a = [...this._zoneIds];
                    [a[pos - 1], a[pos]] = [a[pos], a[pos - 1]];
                    this._zoneIds = a;
                    this.requestUpdate();
                }}
                  >
                    <ha-icon icon="mdi:chevron-up"></ha-icon>
                  </button>
                  <button
                    type="button"
                    class="iconbtn"
                    aria-label=${t(this.hass, "config_panel.schedule_down")}
                    ?disabled=${pos < 0 || pos >= this._zoneIds.length - 1}
                    @click=${() => {
                    const a = [...this._zoneIds];
                    [a[pos + 1], a[pos]] = [a[pos], a[pos + 1]];
                    this._zoneIds = a;
                    this.requestUpdate();
                }}
                  >
                    <ha-icon icon="mdi:chevron-down"></ha-icon>
                  </button>
                `
                : A}
          </div>
        `;
        })}

      <div class="field-block" style="margin-top:14px">
        <span class="field-title">${t(this.hass, "config_panel.schedule_slot_name")}</span>
        <div class="field-row">
          <ha-input
            .value=${this._label}
            @input=${(e) => {
            this._label = e.target.value;
        }}
          ></ha-input>
        </div>
      </div>

      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.guards_section_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.guards_section_desc")}</p>
        ${renderGuardList(this.hass, GUARD_ENTITY_DOMAINS, this._guards, (next) => {
            this._guards = next;
            this.requestUpdate();
        })}
        <div class="switch-row">
          <ha-switch
            .checked=${this._ignoreGlobalGuards}
            @change=${(e) => {
            this._ignoreGlobalGuards = Boolean(e.target.checked);
            this.requestUpdate();
        }}
          ></ha-switch>
          <span class="switch-row-label"
            >${t(this.hass, "config_panel.schedule_ignore_global_guards")}</span
          >
        </div>
        <p class="hint">${t(this.hass, "config_panel.schedule_ignore_global_guards_hint")}</p>
      </div>

      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.schedule_scripts_section_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.schedule_scripts_section_desc")}</p>
      </div>
      ${renderScriptOverride(this.hass, SCRIPT_ENTITY_DOMAINS, "pre_start", this._preStartScript, this._globalScript("pre_start"), this._globalScriptTimeout("pre_start"), this._busy, (next) => {
            this._preStartScript = next;
        })}
      ${renderScriptOverride(this.hass, SCRIPT_ENTITY_DOMAINS, "post_run", this._postRunScript, this._globalScript("post_run"), this._globalScriptTimeout("post_run"), this._busy, (next) => {
            this._postRunScript = next;
        })}

      <div class="summary-card">
        <strong>${t(this.hass, "config_panel.cycle_creates_title")}</strong>
        <ul style="margin:8px 0 0;padding-left:1.1rem">
          ${slots.map((s) => b `<li>
              ${s.weekdays.map((d) => weekdayShort(this.hass, d)).join(", ")}
              · ${formatTimeLocalForDisplay(this.hass, s.time_local)}
              ${s.week_parity !== "every"
            ? " · " +
                t(this.hass, s.week_parity === "odd"
                    ? "config_panel.week_parity_odd"
                    : "config_panel.week_parity_even")
            : ""}
              ${this._guards.length
            ? b ` · ${guardsSummary(this.hass, this._guards)}`
            : A}
            </li>`)}
        </ul>
        ${est > 0
            ? b `<p class="preview-line" style="margin-bottom:0">
              ${t(this.hass, "config_panel.overview_mode_total", { n: est })}
            </p>`
            : A}
        ${first
            ? b `<p class="preview-line" style="margin-bottom:0">
              ${t(this.hass, "config_panel.cycle_preview_first_run", {
                when: formatDateTimeForDisplay(this.hass, new Date(first.getFullYear(), first.getMonth(), first.getDate(), ...this._times[0].split(":").map(Number))),
            })}
            </p>`
            : A}
      </div>

      ${conflict
            ? b `<div class="warning" style="display:flex;align-items:center;gap:10px;margin-top:10px">
            <span>${t(this.hass, "config_panel.cycle_conflict_warning")}</span>
            <button type="button" class="btn-outline" style="margin-top:0" @click=${() => this._shiftLater()}>
              ${t(this.hass, "config_panel.cycle_conflict_shift")}
            </button>
          </div>`
            : A}
    `;
    }
    render() {
        if (!this.open)
            return A;
        const titleKey = this._cycleId
            ? "config_panel.cycle_edit_title"
            : "config_panel.cycle_new";
        return b `
      <ha-dialog
        .open=${this.open}
        header-title=${t(this.hass, titleKey)}
        @closed=${() => this._close()}
      >
        <div class="progress" aria-hidden="true">
          ${[1, 2, 3].map((n) => b `<span class="step ${this._step >= n ? "done" : ""}"></span>`)}
        </div>
        ${this._msg ? b `<div class="error">${this._msg}</div>` : A}
        ${this._step === 1
            ? this._renderStep1()
            : this._step === 2
                ? this._renderStep2()
                : this._renderStep3()}
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead">
              ${this._step > 1
            ? b `<button type="button" class="btn-outline" ?disabled=${this._busy} @click=${() => (this._step -= 1)}>
                    ${t(this.hass, "config_panel.cycle_back")}
                  </button>`
            : b `<button type="button" class="btn-outline" ?disabled=${this._busy} @click=${() => this._close()}>
                    ${t(this.hass, "config_panel.zones_cancel")}
                  </button>`}
            </div>
            <div class="dialog-footer-actions">
              ${this._step < 3
            ? b `<button type="button" class="btn" ?disabled=${this._busy || !this._canNext()} @click=${() => (this._step += 1)}>
                    ${t(this.hass, "config_panel.cycle_next")}
                  </button>`
            : b `
                    <button
                      type="button"
                      class="btn"
                      ?disabled=${this._busy || this._zoneIds.length === 0}
                      @click=${() => this._create()}
                    >
                      ${this._cycleId
                ? t(this.hass, "config_panel.cycle_save")
                : t(this.hass, "config_panel.cycle_create")}
                    </button>
                  `}
            </div>
          </div>
        </div>
      </ha-dialog>
    `;
    }
}
__decorate([
    r()
], CycleWizard.prototype, "_step", void 0);
__decorate([
    r()
], CycleWizard.prototype, "_optionId", void 0);
__decorate([
    r()
], CycleWizard.prototype, "_times", void 0);
__decorate([
    r()
], CycleWizard.prototype, "_anchor", void 0);
__decorate([
    r()
], CycleWizard.prototype, "_weekDays", void 0);
__decorate([
    r()
], CycleWizard.prototype, "_zoneIds", void 0);
__decorate([
    r()
], CycleWizard.prototype, "_enabled", void 0);
__decorate([
    r()
], CycleWizard.prototype, "_label", void 0);
__decorate([
    r()
], CycleWizard.prototype, "_guards", void 0);
__decorate([
    r()
], CycleWizard.prototype, "_ignoreGlobalGuards", void 0);
__decorate([
    r()
], CycleWizard.prototype, "_preStartScript", void 0);
__decorate([
    r()
], CycleWizard.prototype, "_postRunScript", void 0);
__decorate([
    r()
], CycleWizard.prototype, "_cycleId", void 0);
__decorate([
    r()
], CycleWizard.prototype, "_busy", void 0);
__decorate([
    r()
], CycleWizard.prototype, "_msg", void 0);
defineCustomElementOnce("si-cycle-wizard", CycleWizard);

const WEEK_PARITIES = ["every", "odd", "even"];
const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6];
class ViewSchedule extends i$2 {
    constructor() {
        super(...arguments);
        this._busy = false;
        this._expanded = new Set();
        this._slotEditDraft = null;
        this._addZonePick = "";
        this._cleanupProposals = null;
        this._consumedEditSlotKey = null;
    }
    static { this.properties = {
        hass: { attribute: false },
        entryId: { type: String },
        installation: { type: Object },
        runState: { type: Object },
        onSaved: { attribute: false },
    }; }
    static { this.styles = [
        sharedStyles,
        formLayoutStyles,
        i$5 `
      .card-header .header-actions .btn,
      .card-header .header-actions .btn-outline {
        margin-top: 0;
        align-self: center;
      }
      .quick-add {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        scroll-snap-type: x proximity;
        padding: 2px 0 8px;
        margin-bottom: 6px;
      }
      .quick-add .chip {
        scroll-snap-align: start;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .member-line {
        display: flex;
        align-items: center;
        gap: 8px 12px;
        flex-wrap: wrap;
        padding: 8px 0;
        border-top: 1px solid var(--divider-color);
        font-size: 0.85rem;
      }
      .member-line:first-of-type {
        border-top: none;
      }
      .detach-line {
        margin-top: 10px;
        font-size: 0.82rem;
        color: var(--secondary-text-color);
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .zones {
        list-style: none;
        padding: 0;
        margin: 10px 0;
      }
      .zones li {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        padding: 8px 0;
        border-bottom: 1px solid var(--divider-color);
      }
      .zones li.phase-sep {
        display: block;
        margin: 12px 0 4px;
        padding: 0;
        border-bottom: none;
      }
      .zones li.phase-sep span {
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--secondary-text-color);
      }
      .zone-actions {
        display: flex;
        gap: 6px;
        margin-left: auto;
      }
      .zone-actions .btn-outline {
        margin-top: 0;
        padding: 5px 10px;
        font-size: 0.8rem;
      }
      .weekday-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .weekday-presets {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 4px 0 10px;
      }
      .chip.day {
        min-width: 44px;
        min-height: 40px;
        text-align: center;
        justify-content: center;
      }
      .drawer-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-top: 12px;
      }
      .drawer-actions .btn-outline {
        width: 100%;
        min-height: 46px;
        margin-top: 0;
      }
    `,
    ]; }
    // ---- data ---------------------------------------------------------------
    _slots() {
        const s = this.installation?.schedule_slots;
        if (!Array.isArray(s))
            return [];
        return s.map((raw) => {
            const o = raw;
            const wds = normalizeWeekdays(o.weekdays);
            const rid = o.cycle_id ? String(o.cycle_id) : null;
            return {
                slot_id: String(o.slot_id ?? ""),
                weekdays: wds.length ? wds : normalizeWeekdays([o.weekday ?? 0]),
                time_local: String(o.time_local ?? "06:00"),
                enabled: Boolean(o.enabled ?? true),
                zone_ids_ordered: Array.isArray(o.zone_ids_ordered) ? [...o.zone_ids_ordered] : [],
                name: String(o.name ?? "").trim(),
                week_parity: o.week_parity === "odd" || o.week_parity === "even" ? o.week_parity : "every",
                guards: normalizeGuards(o.guards),
                ignore_global_guards: Boolean(o.ignore_global_guards ?? false),
                pre_start_script: normalizeScriptOverride(o, "pre_start"),
                post_run_script: normalizeScriptOverride(o, "post_run"),
                cycle_id: rid,
                cycle_kind: String(o.cycle_kind ?? "custom"),
                cycle_meta: o.cycle_meta ?? null,
            };
        });
    }
    /**
     * Split slots into real cycles (>=2 linked members) and single slots.
     * A cycle only exists when the cadence needed >=2 slots (every 2/3 days).
     * Anything else — incl. a stray 1-member cycle from old data — is a single slot.
     */
    _groupsAndCustom() {
        const index = new Map();
        const order = [];
        const single = [];
        for (const s of this._slots()) {
            if (!s.cycle_id) {
                single.push(s);
                continue;
            }
            let g = index.get(s.cycle_id);
            if (!g) {
                g = {
                    cycle_id: s.cycle_id,
                    members: [],
                    label: String(s.cycle_meta?.label ?? s.name ?? ""),
                    kind: s.cycle_kind,
                    meta: s.cycle_meta,
                };
                index.set(s.cycle_id, g);
                order.push(g);
            }
            g.members.push(s);
        }
        // Demote 1-member "cycles" to plain single slots, preserving overall order.
        const groups = [];
        for (const g of order) {
            if (g.members.length >= 2)
                groups.push(g);
            else
                single.push(...g.members);
        }
        return { groups, custom: single };
    }
    _cloneSlot(s) {
        return {
            ...s,
            weekdays: [...s.weekdays],
            zone_ids_ordered: [...s.zone_ids_ordered],
            guards: s.guards.map((g) => ({ ...g })),
            pre_start_script: { ...s.pre_start_script },
            post_run_script: { ...s.post_run_script },
        };
    }
    /** The installation's script for one phase, inherited unless a slot overrides. */
    _globalScript(phase) {
        return String(this.installation?.[`${phase}_script`] ?? "").trim();
    }
    _globalScriptTimeout(phase) {
        const n = Number(this.installation?.[`${phase}_script_timeout_sec`] ?? 300);
        return Number.isFinite(n) && n > 0 ? Math.round(n) : 300;
    }
    /** Read-only chip shown on a slot/cycle row that brings its own scripts. */
    _renderScriptMeta(s) {
        if (!hasScriptOverride(s.pre_start_script, s.post_run_script))
            return A;
        return b `<span class="meta"
      ><ha-icon icon="mdi:script-text-outline"></ha-icon>${t(this.hass, "config_panel.schedule_scripts_own")}</span
    >`;
    }
    /** Guards defined on the installation; inherited unless a slot opts out. */
    _globalGuards() {
        return normalizeGuards(this.installation?.guards);
    }
    /** Badge text for a slot's own guards: one spelled out, several counted. */
    _guardBadge(guards) {
        return guards.length === 1
            ? guardLabel(this.hass, guards[0])
            : t(this.hass, "config_panel.guards_count", { n: String(guards.length) });
    }
    /** Read-only chips shown on a slot/cycle row. */
    _renderGuardMeta(guards, ignoreGlobal) {
        return b `
      ${guards.length
            ? b `<span class="meta"
            ><ha-icon icon="mdi:shield-check-outline"></ha-icon>${this._guardBadge(guards)}</span
          >`
            : A}
      ${ignoreGlobal
            ? b `<span class="meta"
            ><ha-icon icon="mdi:shield-off-outline"></ha-icon>${t(this.hass, "config_panel.schedule_guards_global_off")}</span
          >`
            : A}
    `;
    }
    _zonesMap() {
        return this.installation?.zones;
    }
    _zoneName(zid) {
        const z = this._zonesMap()?.[zid];
        return z ? String(z.name ?? zid) : zid;
    }
    _mode() {
        return String(this.installation?.mode ?? "normal");
    }
    _maxParallel() {
        const n = Number(this.installation?.max_parallel_zones ?? 2);
        return Number.isFinite(n) && n >= 1 ? n : 2;
    }
    _zonesPhaseInput() {
        const zones = this._zonesMap();
        const out = {};
        if (!zones)
            return out;
        for (const [id, z] of Object.entries(zones)) {
            out[id] = { enabled: Boolean(z?.enabled ?? true), exclusive: Boolean(z?.exclusive ?? false) };
        }
        return out;
    }
    _estimateMin(zoneIds) {
        const zones = this._zonesMap();
        if (!zones)
            return 0;
        const phases = computePhases(zoneIds, this._zonesPhaseInput(), this._maxParallel(), true);
        let total = Math.max(0, Number(this.installation?.pre_start_delay_sec ?? 10)) / 60;
        for (const phase of phases) {
            let phaseMax = 0;
            for (const zid of phase) {
                const z = zones[zid];
                if (z && Boolean(z.enabled ?? true))
                    phaseMax = Math.max(phaseMax, durationForMode(z, this._mode()));
            }
            total += phaseMax;
        }
        return Math.round(total);
    }
    _phaseCount(zoneIds) {
        return computePhases(zoneIds, this._zonesPhaseInput(), this._maxParallel(), true).length;
    }
    _nextFire(members) {
        const now = new Date();
        for (let i = 0; i < 21; i++) {
            const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            const wd = mondayBasedWeekday(day);
            for (const m of members) {
                if (!m.enabled)
                    continue;
                if (!m.weekdays.includes(wd))
                    continue;
                if (!weekParityMatches(day, m.week_parity))
                    continue;
                const [h, mi] = m.time_local.split(":").map(Number);
                const cand = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h || 0, mi || 0);
                if (cand > now)
                    return cand;
            }
        }
        return null;
    }
    // ---- api helpers --------------------------------------------------------
    async _call(body) {
        this._busy = true;
        this._msg = undefined;
        this.requestUpdate();
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
            this.requestUpdate();
        }
    }
    _runtimeBusy() {
        const s = String((this.runState ?? {}).run_state ?? "idle");
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
                const map = {
                    busy: "config_panel.schedule_err_busy",
                    empty_slot: "config_panel.schedule_err_empty_slot",
                    no_runnable_zones: "config_panel.schedule_err_no_runnable",
                    unknown_slot: "config_panel.schedule_err_unknown_slot",
                };
                const err = res.error ?? "run_failed";
                this._msg = map[err] ? t(this.hass, map[err]) : String(err);
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
    async _toggleGroupEnabled(g, enabled) {
        if (this._busy)
            return;
        this._busy = true;
        this._msg = undefined;
        try {
            for (const m of g.members) {
                const res = await saveSlot(this.hass, this.entryId, {
                    action: "update",
                    slot_id: m.slot_id,
                    enabled,
                });
                if (!res.success) {
                    this._msg = formatApiError(res.error, this.hass);
                    break;
                }
            }
            this.onSaved?.();
        }
        catch (e) {
            this._msg = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
            this.requestUpdate();
        }
    }
    async _toggleSlotEnabled(slot, enabled) {
        if (this._busy)
            return;
        await this._call({ action: "update", slot_id: slot.slot_id, enabled });
    }
    async _detachCycle(g) {
        if (!confirm(t(this.hass, "config_panel.cycle_detach_confirm")))
            return;
        this._busy = true;
        this._msg = undefined;
        try {
            for (const m of g.members) {
                const res = await saveSlot(this.hass, this.entryId, {
                    action: "update",
                    slot_id: m.slot_id,
                    cycle_id: null,
                    cycle_kind: "custom",
                });
                if (!res.success) {
                    this._msg = formatApiError(res.error, this.hass);
                    break;
                }
            }
            this.onSaved?.();
        }
        catch (e) {
            this._msg = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
            this.requestUpdate();
        }
    }
    async _deleteCycle(g) {
        if (!confirm(t(this.hass, "config_panel.cycle_delete_confirm")))
            return;
        this._busy = true;
        this._msg = undefined;
        try {
            const res = await deleteCycle(this.hass, this.entryId, g.cycle_id);
            if (!res.success)
                this._msg = formatApiError(res.error, this.hass);
            else
                this.onSaved?.();
        }
        catch (e) {
            this._msg = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
            this.requestUpdate();
        }
    }
    // ---- wizard -------------------------------------------------------------
    _openWizardNew() {
        this._msg = undefined;
        this._wizard?.start({ step: 1 });
    }
    _openWizardEdit(g) {
        this._msg = undefined;
        const slots = (this.installation?.schedule_slots).filter((s) => String(s.cycle_id ?? "") === g.cycle_id);
        this._wizard?.start({ seedFromSlots: slots, step: 1 });
    }
    // ---- cleanup ------------------------------------------------------------
    /** Detect ungrouped slots with matching time+zones that form a known cadence. */
    _analyzeCleanup() {
        const { custom } = this._groupsAndCustom();
        const buckets = new Map();
        for (const s of custom) {
            const key = `${s.time_local}||${s.zone_ids_ordered.join(",")}`;
            if (!buckets.has(key))
                buckets.set(key, []);
            buckets.get(key).push(s);
        }
        const proposals = [];
        for (const list of buckets.values()) {
            if (list.length < 2)
                continue;
            const parities = new Set(list.map((s) => s.week_parity));
            const time = list[0].time_local;
            const zoneIds = list[0].zone_ids_ordered;
            const memberIds = list.map((s) => s.slot_id);
            if (parities.size === 1 && parities.has("every")) {
                // Merge weekday union into a single every-week cycle.
                const union = normalizeWeekdays(list.flatMap((s) => s.weekdays));
                const optionId = union.length === 7 ? "daily" : union.length === 1 ? "weekly" : "n_per_week";
                const meta = { times: [time] };
                if (optionId === "weekly")
                    meta.anchor_weekday = union[0];
                else if (optionId === "n_per_week")
                    meta.week_days = union;
                proposals.push({ optionId, meta, zoneIds, memberIds, label: list[0].name });
            }
            else if (list.length === 2 &&
                parities.has("odd") &&
                parities.has("even")) {
                // Complementary parity pair → every-2-days.
                proposals.push({
                    optionId: "every_2_days",
                    meta: { times: [time], n: 2, anchor_weekday: normalizeWeekdays(list[0].weekdays)[0] ?? 0 },
                    zoneIds,
                    memberIds,
                    label: list[0].name,
                });
            }
        }
        return proposals;
    }
    _openCleanup() {
        const proposals = this._analyzeCleanup();
        this._cleanupProposals = proposals;
    }
    async _applyCleanup() {
        const proposals = this._cleanupProposals ?? [];
        if (!proposals.length) {
            this._cleanupProposals = null;
            return;
        }
        this._busy = true;
        this._msg = undefined;
        try {
            for (const p of proposals) {
                const opt = p.optionId;
                const kind = opt === "every_2_days" ? "every_n_days" : opt === "every_3_days" ? "every_n_days" : opt;
                const res = await upsertCycle(this.hass, this.entryId, {
                    cycle_id: null,
                    cycle_kind: kind,
                    cycle_meta: p.meta,
                    zone_ids_ordered: p.zoneIds,
                    enabled: true,
                });
                if (!res.success) {
                    this._msg = formatApiError(res.error, this.hass);
                    break;
                }
                for (const sid of p.memberIds) {
                    await saveSlot(this.hass, this.entryId, { action: "delete", slot_id: sid });
                }
            }
            this._cleanupProposals = null;
            this.onSaved?.();
        }
        catch (e) {
            this._msg = formatApiError(e, this.hass);
        }
        finally {
            this._busy = false;
            this.requestUpdate();
        }
    }
    // ---- single-slot editor (custom slots & cycle members) -----------------
    _parityLabel(parity) {
        if (parity === "odd")
            return t(this.hass, "config_panel.week_parity_odd");
        if (parity === "even")
            return t(this.hass, "config_panel.week_parity_even");
        return t(this.hass, "config_panel.week_parity_every");
    }
    _cycleBadge(kind, meta) {
        switch (kind) {
            case "daily":
                return t(this.hass, "config_panel.cycle_kind_daily");
            case "twice_daily":
                return t(this.hass, "config_panel.cycle_kind_twice_daily");
            case "weekly":
                return t(this.hass, "config_panel.cycle_kind_weekly");
            case "biweekly":
                return t(this.hass, "config_panel.cycle_kind_biweekly");
            case "n_per_week":
                return t(this.hass, "config_panel.cycle_kind_n_per_week");
            case "every_n_days":
                return meta?.n === 3
                    ? t(this.hass, "config_panel.cycle_kind_every_3_days")
                    : t(this.hass, "config_panel.cycle_kind_every_2_days");
            default:
                return t(this.hass, "config_panel.cycle_badge_custom");
        }
    }
    _toggleWeekday(current, day) {
        return current.includes(day)
            ? current.filter((d) => d !== day)
            : normalizeWeekdays([...current, day]);
    }
    _renderWeekdayPicker(selected, onChange) {
        const presets = [
            { label: t(this.hass, "config_panel.schedule_preset_daily"), days: [0, 1, 2, 3, 4, 5, 6] },
            { label: t(this.hass, "config_panel.schedule_preset_workdays"), days: [0, 1, 2, 3, 4] },
            { label: t(this.hass, "config_panel.schedule_preset_weekend"), days: [5, 6] },
        ];
        const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
        return b `
      <div class="weekday-presets">
        ${presets.map((p) => b `<button
            type="button"
            class="chip ${same(normalizeWeekdays(selected), normalizeWeekdays(p.days)) ? "selected" : ""}"
            ?disabled=${this._busy}
            @click=${() => onChange(normalizeWeekdays(p.days))}
          >
            ${p.label}
          </button>`)}
      </div>
      <div class="weekday-chips" role="group">
        ${WEEKDAY_ORDER.map((i) => b `<button
            type="button"
            class="chip day ${selected.includes(i) ? "selected" : ""}"
            aria-pressed=${selected.includes(i) ? "true" : "false"}
            title=${weekdayLong(this.hass, i)}
            ?disabled=${this._busy}
            @click=${() => onChange(this._toggleWeekday(selected, i))}
          >
            ${weekdayShort(this.hass, i)}
          </button>`)}
      </div>
    `;
    }
    _closeEditDialog() {
        this._slotEditDraft = null;
    }
    async _saveSlotDraft() {
        const d = this._slotEditDraft;
        if (!d)
            return;
        if (d.weekdays.length === 0) {
            this._msg = t(this.hass, "config_panel.schedule_err_no_weekdays");
            return;
        }
        if (guardsIncomplete(d.guards)) {
            this._msg = t(this.hass, "config_panel.schedule_err_guards_incomplete");
            return;
        }
        const ok = await this._call({
            action: "update",
            slot_id: d.slot_id,
            weekdays: d.weekdays,
            time_local: d.time_local,
            enabled: d.enabled,
            zone_ids_ordered: d.zone_ids_ordered,
            name: d.name.trim(),
            week_parity: d.week_parity,
            guards: guardsForSave(d.guards),
            ignore_global_guards: d.ignore_global_guards,
            ...scriptOverrideForSave(d.pre_start_script, "pre_start"),
            ...scriptOverrideForSave(d.post_run_script, "post_run"),
        });
        if (ok)
            this._closeEditDialog();
    }
    async _deleteSlotDraft() {
        const d = this._slotEditDraft;
        if (!d)
            return;
        if (!confirm(t(this.hass, "config_panel.schedule_confirm_delete_slot")))
            return;
        if (await this._call({ action: "delete", slot_id: d.slot_id }))
            this._closeEditDialog();
    }
    async _splitSlotDraft() {
        const d = this._slotEditDraft;
        if (!d || d.weekdays.length <= 1)
            return;
        if (!confirm(t(this.hass, "config_panel.schedule_confirm_split")))
            return;
        if (await this._call({ action: "split", slot_id: d.slot_id }))
            this._closeEditDialog();
    }
    _consumeEditSlotQueryFromUrl() {
        const slotId = new URLSearchParams(window.location.search).get("editSlot");
        if (!slotId) {
            this._consumedEditSlotKey = null;
            return;
        }
        if (!this.entryId)
            return;
        const key = `${this.entryId}:${slotId}`;
        if (this._consumedEditSlotKey === key)
            return;
        const slot = this._slots().find((s) => s.slot_id === slotId);
        const known = Array.isArray(this.installation?.schedule_slots);
        if (slot) {
            this._consumedEditSlotKey = key;
            this._msg = undefined;
            this._addZonePick = "";
            // Expand the parent cycle too, per spec §6.
            if (slot.cycle_id)
                this._expanded = new Set([...this._expanded, slot.cycle_id]);
            this._slotEditDraft = this._cloneSlot(slot);
            stripEditSlotQueryFromUrl();
            return;
        }
        if (known) {
            this._consumedEditSlotKey = key;
            stripEditSlotQueryFromUrl();
        }
    }
    updated(changed) {
        super.updated(changed);
        this._consumeEditSlotQueryFromUrl();
    }
    // ---- rows ---------------------------------------------------------------
    _toggleExpand(id) {
        const next = new Set(this._expanded);
        if (next.has(id))
            next.delete(id);
        else
            next.add(id);
        this._expanded = next;
    }
    _renderMemberLine(m) {
        return b `
      <div class="member-line">
        ${m.week_parity !== "every"
            ? b `<span class="badge badge-primary badge-dot">${this._parityLabel(m.week_parity)}</span>`
            : A}
        <span>${weekdaysSummary(this.hass, m.weekdays)}</span>
        <span class="muted">${formatTimeLocalForDisplay(this.hass, m.time_local)}</span>
        ${m.guards.length
            ? b `<span class="muted"
              ><ha-icon icon="mdi:shield-check-outline"></ha-icon>${this._guardBadge(m.guards)}</span
            >`
            : A}
        ${m.ignore_global_guards
            ? b `<span class="muted"
              ><ha-icon icon="mdi:shield-off-outline"></ha-icon>${t(this.hass, "config_panel.schedule_guards_global_off")}</span
            >`
            : A}
        ${hasScriptOverride(m.pre_start_script, m.post_run_script)
            ? b `<span class="muted"
              ><ha-icon icon="mdi:script-text-outline"></ha-icon>${t(this.hass, "config_panel.schedule_scripts_own")}</span
            >`
            : A}
        <span class="muted"
          >${m.zone_ids_ordered.length === 1
            ? t(this.hass, "config_panel.schedule_zones_in_order_one")
            : t(this.hass, "config_panel.schedule_zones_in_order_many", {
                n: m.zone_ids_ordered.length,
            })}</span
        >
        <button
          type="button"
          class="iconbtn"
          style="margin-left:auto;width:34px;height:34px"
          aria-label=${t(this.hass, "config_panel.schedule_edit")}
          @click=${() => {
            this._addZonePick = "";
            this._slotEditDraft = this._cloneSlot(m);
        }}
        >
          <ha-icon icon="mdi:pencil"></ha-icon>
        </button>
      </div>
    `;
    }
    _renderCycleRow(g) {
        const allEnabled = g.members.every((m) => m.enabled);
        const anyEnabled = g.members.some((m) => m.enabled);
        const expanded = this._expanded.has(g.cycle_id);
        const zoneIds = g.members[0]?.zone_ids_ordered ?? [];
        const est = this._estimateMin(zoneIds);
        const phases = this._phaseCount(zoneIds);
        const times = [...new Set(g.members.map((m) => m.time_local))].sort();
        const next = this._nextFire(g.members);
        const label = g.label || this._cycleBadge(g.kind, g.meta);
        const accent = allEnabled ? "" : anyEnabled ? "warn" : "inactive";
        // Merge member weekdays into slot specs for the 14-day strip.
        const specs = g.members.map((m) => ({
            weekdays: m.weekdays,
            time_local: m.time_local,
            week_parity: m.week_parity,
        }));
        const today = new Date();
        const strip = previewStrip(specs, today, today, 14);
        return b `
      <div class="compact-row ${accent}">
        <div class="compact-row-header">
          <ha-switch
            .disabled=${this._busy}
            .checked=${allEnabled}
            @change=${(e) => this._toggleGroupEnabled(g, Boolean(e.target.checked))}
          ></ha-switch>
          <div class="compact-row-main">
            <div class="compact-row-title">
              <span class="ellipsis">${label}</span>
              <span class="badge badge-primary">${this._cycleBadge(g.kind, g.meta)}</span>
              ${!anyEnabled
            ? b `<span class="badge">${t(this.hass, "config_panel.cycle_paused_n", {
                n: g.members.length,
            })}</span>`
            : !allEnabled
                ? b `<span class="badge badge-warn badge-dot">${t(this.hass, "config_panel.cycle_partly_enabled")}</span>`
                : A}
            </div>
            <div class="meta-line">
              <span class="meta"
                ><ha-icon icon="mdi:clock-outline"></ha-icon>${times
            .map((tl) => formatTimeLocalForDisplay(this.hass, tl))
            .join(", ")}</span
              >
              <span class="meta"
                ><ha-icon icon="mdi:vector-square"></ha-icon>${t(this.hass, "config_panel.cycle_meta_zones", { z: zoneIds.length, p: phases, m: est })}</span
              >
              ${g.members[0]
            ? b `${this._renderGuardMeta(g.members[0].guards, g.members[0].ignore_global_guards)}${this._renderScriptMeta(g.members[0])}`
            : A}
              ${next
            ? b `<span class="meta"
                    ><ha-icon icon="mdi:skip-next-outline"></ha-icon>${weekdayShort(this.hass, mondayBasedWeekday(next))}
                    ${formatTimeLocalForDisplay(this.hass, `${next.getHours()}:${String(next.getMinutes()).padStart(2, "0")}`)}</span
                  >`
            : A}
              <span class="meta"
                ><ha-icon icon="mdi:format-list-bulleted"></ha-icon>${t(this.hass, "config_panel.cycle_slots_n", { n: g.members.length })}</span
              >
            </div>
          </div>
          <div class="icon-group" role="group">
            <button
              type="button"
              title=${t(this.hass, "config_panel.schedule_run_slot_now")}
              aria-label=${t(this.hass, "config_panel.schedule_run_slot_now")}
              ?disabled=${this._busy || this._runtimeBusy() || !anyEnabled || zoneIds.length === 0}
              @click=${() => {
            const m = g.members.find((x) => x.enabled) ?? g.members[0];
            this._runSlotNow(m.slot_id);
        }}
            >
              <ha-icon icon="mdi:play"></ha-icon>
            </button>
            <button
              type="button"
              title=${t(this.hass, "config_panel.cycle_edit_title")}
              aria-label=${t(this.hass, "config_panel.cycle_edit_title")}
              @click=${() => this._openWizardEdit(g)}
            >
              <ha-icon icon="mdi:pencil"></ha-icon>
            </button>
            <button
              type="button"
              class=${expanded ? "selected" : ""}
              aria-expanded=${expanded ? "true" : "false"}
              aria-label=${t(this.hass, "config_panel.cycle_expand")}
              @click=${() => this._toggleExpand(g.cycle_id)}
            >
              <ha-icon icon=${expanded ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>
            </button>
          </div>
        </div>
        ${expanded
            ? b `<div class="compact-row-detail">
              <div class="day-strip" style="margin-top:10px">
                ${strip.map((d) => b `<div class="day-cell ${d.run ? "run" : ""} ${d.isToday ? "today" : ""}">
                    <span class="dc-dow">${weekdayShort(this.hass, mondayBasedWeekday(d.date))}</span>
                    <span class="dc-dom">${d.date.getDate()}</span>
                  </div>`)}
              </div>
              ${g.members.map((m) => this._renderMemberLine(m))}
              <div class="detach-line">
                <span>${t(this.hass, "config_panel.cycle_detach_hint")}</span>
                <button type="button" class="btn-outline" style="margin-top:0" ?disabled=${this._busy} @click=${() => this._detachCycle(g)}>
                  ${t(this.hass, "config_panel.cycle_detach")}
                </button>
                <button type="button" class="btn-danger" style="margin-top:0" ?disabled=${this._busy} @click=${() => this._deleteCycle(g)}>
                  ${t(this.hass, "config_panel.cycle_delete")}
                </button>
              </div>
            </div>`
            : A}
      </div>
    `;
    }
    _renderCustomRow(s) {
        const est = this._estimateMin(s.zone_ids_ordered);
        const phases = this._phaseCount(s.zone_ids_ordered);
        const accent = s.enabled ? "" : "inactive";
        const expanded = this._expanded.has(s.slot_id);
        const next = this._nextFire([s]);
        const today = new Date();
        const strip = previewStrip([{ weekdays: s.weekdays, time_local: s.time_local, week_parity: s.week_parity }], today, today, 14);
        return b `
      <div class="compact-row ${accent}">
        <div class="compact-row-header">
          <ha-switch
            .disabled=${this._busy}
            .checked=${s.enabled}
            @change=${(e) => this._toggleSlotEnabled(s, Boolean(e.target.checked))}
          ></ha-switch>
          <div class="compact-row-main">
            <div class="compact-row-title">
              <span class="ellipsis"
                >${s.name ? s.name + " · " : ""}${weekdaysSummary(this.hass, s.weekdays)}
                ${formatTimeLocalForDisplay(this.hass, s.time_local)}</span
              >
              ${s.week_parity !== "every"
            ? b `<span class="badge badge-primary badge-dot">${this._parityLabel(s.week_parity)}</span>`
            : A}
            </div>
            <div class="meta-line">
              <span class="meta"
                ><ha-icon icon="mdi:vector-square"></ha-icon>${t(this.hass, "config_panel.cycle_meta_zones", { z: s.zone_ids_ordered.length, p: phases, m: est })}</span
              >
              ${this._renderGuardMeta(s.guards, s.ignore_global_guards)}
              ${this._renderScriptMeta(s)}
              ${next
            ? b `<span class="meta"
                    ><ha-icon icon="mdi:skip-next-outline"></ha-icon>${weekdayShort(this.hass, mondayBasedWeekday(next))}
                    ${formatTimeLocalForDisplay(this.hass, `${next.getHours()}:${String(next.getMinutes()).padStart(2, "0")}`)}</span
                  >`
            : A}
            </div>
          </div>
          <div class="icon-group" role="group">
            <button
              type="button"
              title=${t(this.hass, "config_panel.schedule_run_slot_now")}
              aria-label=${t(this.hass, "config_panel.schedule_run_slot_now")}
              ?disabled=${this._busy || this._runtimeBusy() || !s.enabled || s.zone_ids_ordered.length === 0}
              @click=${() => this._runSlotNow(s.slot_id)}
            >
              <ha-icon icon="mdi:play"></ha-icon>
            </button>
            <button
              type="button"
              title=${t(this.hass, "config_panel.schedule_edit")}
              aria-label=${t(this.hass, "config_panel.schedule_edit")}
              @click=${() => {
            this._addZonePick = "";
            this._slotEditDraft = this._cloneSlot(s);
        }}
            >
              <ha-icon icon="mdi:pencil"></ha-icon>
            </button>
            <button
              type="button"
              class=${expanded ? "selected" : ""}
              aria-expanded=${expanded ? "true" : "false"}
              aria-label=${t(this.hass, "config_panel.cycle_expand")}
              @click=${() => this._toggleExpand(s.slot_id)}
            >
              <ha-icon icon=${expanded ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>
            </button>
          </div>
        </div>
        ${expanded
            ? b `<div class="compact-row-detail">
              <div class="day-strip" style="margin-top:10px">
                ${strip.map((d) => b `<div class="day-cell ${d.run ? "run" : ""} ${d.isToday ? "today" : ""}">
                    <span class="dc-dow">${weekdayShort(this.hass, mondayBasedWeekday(d.date))}</span>
                    <span class="dc-dom">${d.date.getDate()}</span>
                  </div>`)}
              </div>
              ${this._renderMemberLine(s)}
            </div>`
            : A}
      </div>
    `;
    }
    _addZoneOptionsForDraft(draft) {
        const zones = this._zonesMap();
        if (!zones)
            return [];
        return Object.keys(zones).filter((id) => !draft.zone_ids_ordered.includes(id));
    }
    /**
     * "Runs then and then — but only if x AND y AND z", so this sits below the
     * timing fields rather than above them.
     */
    _renderGuardSection(draft) {
        const globals = this._globalGuards();
        return b `
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.guards_section_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.guards_section_desc")}</p>
        ${renderGuardList(this.hass, GUARD_ENTITY_DOMAINS, draft.guards, (next) => {
            draft.guards = next;
            this.requestUpdate();
        })}
        <div class="switch-row">
          <ha-switch
            .disabled=${this._busy}
            .checked=${draft.ignore_global_guards}
            @change=${(e) => {
            draft.ignore_global_guards = Boolean(e.target.checked);
            this.requestUpdate();
        }}
          ></ha-switch>
          <span class="switch-row-label"
            >${t(this.hass, "config_panel.schedule_ignore_global_guards")}</span
          >
        </div>
        <p class="hint">${t(this.hass, "config_panel.schedule_ignore_global_guards_hint")}</p>
        ${globals.length && !draft.ignore_global_guards
            ? b `<p class="hint">
              ${t(this.hass, "config_panel.schedule_guards_inherited", {
                list: globals.map((g) => guardLabel(this.hass, g)).join(", "),
            })}
            </p>`
            : A}
      </div>
    `;
    }
    /**
     * Scripts sit on the slot, not the zone: zones run in parallel phases, so a
     * per-zone script would have no single point in the pipeline to run at. Keep
     * zones that need different preparation in different slots.
     */
    _renderScriptSection(draft) {
        return b `
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.schedule_scripts_section_title")}</span>
        <p class="field-desc">${t(this.hass, "config_panel.schedule_scripts_section_desc")}</p>
      </div>
      ${renderScriptOverride(this.hass, SCRIPT_ENTITY_DOMAINS, "pre_start", draft.pre_start_script, this._globalScript("pre_start"), this._globalScriptTimeout("pre_start"), this._busy, (next) => {
            draft.pre_start_script = next;
            this.requestUpdate();
        })}
      ${renderScriptOverride(this.hass, SCRIPT_ENTITY_DOMAINS, "post_run", draft.post_run_script, this._globalScript("post_run"), this._globalScriptTimeout("post_run"), this._busy, (next) => {
            draft.post_run_script = next;
            this.requestUpdate();
        })}
    `;
    }
    _renderEditDialog(draft) {
        const zones = this._zonesMap();
        const addZoneOpts = this._addZoneOptionsForDraft(draft);
        return b `
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.schedule_name_optional_title")}</span>
        <div class="field-row">
          <ha-input
            .value=${draft.name}
            @input=${(e) => {
            draft.name = e.target.value;
        }}
          ></ha-input>
        </div>
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.schedule_weekdays_title")}</span>
        ${this._renderWeekdayPicker(draft.weekdays, (n) => {
            draft.weekdays = n;
            this.requestUpdate();
        })}
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.schedule_week_parity_title")}</span>
        <select
          class="field-select"
          @change=${(e) => {
            draft.week_parity = e.target.value;
            this.requestUpdate();
        }}
        >
          ${WEEK_PARITIES.map((p) => b `<option value=${p} ?selected=${draft.week_parity === p}>${this._parityLabel(p)}</option>`)}
        </select>
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.schedule_start_time_title")}</span>
        <div class="field-row">
          <input
            type="time"
            .value=${draft.time_local}
            @input=${(e) => {
            draft.time_local = e.target.value;
        }}
          />
        </div>
      </div>
      ${this._renderGuardSection(draft)}
      ${this._renderScriptSection(draft)}
      <div class="field-block">
        <div class="switch-row">
          <ha-switch
            .disabled=${this._busy}
            .checked=${draft.enabled}
            @change=${(e) => {
            draft.enabled = Boolean(e.target.checked);
            this.requestUpdate();
        }}
          ></ha-switch>
          <span class="switch-row-label">${t(this.hass, "config_panel.schedule_slot_enabled")}</span>
        </div>
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.schedule_run_order_title")}</span>
        <ul class="zones">
          ${(() => {
            const pmap = phaseIndexByZoneId(draft.zone_ids_ordered, this._zonesPhaseInput(), this._maxParallel());
            return draft.zone_ids_ordered.map((zid, idx) => {
                const pnum = pmap.get(zid);
                const prevP = idx > 0 ? pmap.get(draft.zone_ids_ordered[idx - 1]) : undefined;
                const showPhase = pnum !== undefined && pnum !== prevP;
                return b `
                ${showPhase
                    ? b `<li class="phase-sep"><span>${t(this.hass, "config_panel.schedule_phase_n", { n: pnum ?? 0 })}</span></li>`
                    : A}
                <li>
                  <span>${idx + 1}. ${this._zoneName(zid)}</span>
                  <span class="zone-actions">
                    <button type="button" class="btn-outline" @click=${() => {
                    if (idx > 0) {
                        const a = draft.zone_ids_ordered;
                        [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
                        this.requestUpdate();
                    }
                }}>${t(this.hass, "config_panel.schedule_up")}</button>
                    <button type="button" class="btn-outline" @click=${() => {
                    const a = draft.zone_ids_ordered;
                    if (idx < a.length - 1) {
                        [a[idx + 1], a[idx]] = [a[idx], a[idx + 1]];
                        this.requestUpdate();
                    }
                }}>${t(this.hass, "config_panel.schedule_down")}</button>
                    <button type="button" class="btn-outline" @click=${() => {
                    draft.zone_ids_ordered = draft.zone_ids_ordered.filter((x) => x !== zid);
                    this.requestUpdate();
                }}>${t(this.hass, "config_panel.schedule_remove")}</button>
                  </span>
                </li>
              `;
            });
        })()}
        </ul>
        ${addZoneOpts.length
            ? b `<div class="action-row">
              <select class="field-select" .value=${this._addZonePick} @change=${(e) => {
                this._addZonePick = e.target.value;
            }}>
                <option value="">${t(this.hass, "config_panel.schedule_choose_zone")}</option>
                ${addZoneOpts.map((id) => b `<option value=${id}>${this._zoneName(id)}</option>`)}
              </select>
              <button type="button" class="btn-outline" ?disabled=${!this._addZonePick} @click=${() => {
                if (this._addZonePick && !draft.zone_ids_ordered.includes(this._addZonePick)) {
                    draft.zone_ids_ordered = [...draft.zone_ids_ordered, this._addZonePick];
                    this._addZonePick = "";
                    this.requestUpdate();
                }
            }}>${t(this.hass, "config_panel.schedule_add_to_list")}</button>
            </div>`
            : zones && Object.keys(zones).length > 0
                ? b `<p class="hint">${t(this.hass, "config_panel.schedule_all_zones_in_slot")}</p>`
                : b `<p class="hint">${t(this.hass, "config_panel.schedule_create_zones_first")}</p>`}
      </div>
    `;
    }
    render() {
        const { groups, custom } = this._groupsAndCustom();
        const draft = this._slotEditDraft;
        const hasAny = groups.length > 0 || custom.length > 0;
        const cleanupCandidates = this._analyzeCleanup().length;
        return b `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:format-list-bulleted-type"></ha-icon>
          ${t(this.hass, "config_panel.cycle_card_title")}
          <div class="header-actions">
            ${cleanupCandidates > 0
            ? b `<button type="button" class="btn-outline hide-narrow" @click=${() => this._openCleanup()}>
                  ${t(this.hass, "config_panel.cycle_cleanup")}
                </button>`
            : A}
            <button type="button" class="btn hide-narrow" @click=${() => this._openWizardNew()}>
              ${t(this.hass, "config_panel.cycle_new")}
            </button>
          </div>
        </div>
        <div class="card-content">
          ${this._msg ? b `<div class="error">${this._msg}</div>` : A}

          ${!hasAny
            ? b `<div class="empty-state">
                <ha-icon icon="mdi:calendar-clock"></ha-icon>
                <p>${t(this.hass, "config_panel.schedule_empty")}</p>
                <button type="button" class="btn" @click=${() => this._openWizardNew()}>
                  ${t(this.hass, "config_panel.cycle_new")}
                </button>
              </div>`
            : b `
                ${groups.map((g) => this._renderCycleRow(g))}
                ${custom.map((s) => this._renderCustomRow(s))}
              `}
        </div>
      </ha-card>

      <button
        type="button"
        class="fab"
        aria-label=${t(this.hass, "config_panel.cycle_new")}
        title=${t(this.hass, "config_panel.cycle_new")}
        @click=${() => this._openWizardNew()}
      >
        <ha-icon icon="mdi:plus"></ha-icon>
      </button>

      <si-cycle-wizard
        .hass=${this.hass}
        .entryId=${this.entryId}
        .installation=${this.installation}
        .onSaved=${(rid) => {
            if (rid)
                this._expanded = new Set([...this._expanded, rid]);
            this.onSaved?.();
        }}
      ></si-cycle-wizard>

      <ha-dialog
        .open=${draft !== null}
        header-title=${draft ? t(this.hass, "config_panel.schedule_edit") : ""}
        @closed=${() => this._closeEditDialog()}
      >
        ${draft ? this._renderEditDialog(draft) : A}
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead">
              ${draft
            ? b `
                    <button type="button" class="btn-danger" ?disabled=${this._busy} @click=${() => this._deleteSlotDraft()}>
                      ${t(this.hass, "config_panel.schedule_delete_slot")}
                    </button>
                    ${draft.weekdays.length > 1
                ? b `<button type="button" class="btn-outline" ?disabled=${this._busy} @click=${() => this._splitSlotDraft()}>
                          ${t(this.hass, "config_panel.schedule_split_slot")}
                        </button>`
                : A}
                  `
            : A}
            </div>
            <div class="dialog-footer-actions">
              <button type="button" class="btn-outline" @click=${() => this._closeEditDialog()} ?disabled=${this._busy}>
                ${t(this.hass, "config_panel.zones_cancel")}
              </button>
              <button type="button" class="btn" ?disabled=${this._busy || !draft} @click=${() => this._saveSlotDraft()}>
                ${this._busy ? t(this.hass, "config_panel.schedule_saving") : t(this.hass, "config_panel.schedule_save_slot")}
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>

      <ha-dialog
        .open=${this._cleanupProposals !== null}
        header-title=${t(this.hass, "config_panel.cycle_cleanup")}
        @closed=${() => (this._cleanupProposals = null)}
      >
        <p class="hint">${t(this.hass, "config_panel.cycle_cleanup_desc")}</p>
        ${(this._cleanupProposals ?? []).map((p) => b `<div class="compact-row" style="margin-top:8px">
            <div class="compact-row-header">
              <div class="compact-row-main">
                <div class="compact-row-title">
                  <span>${p.label || this._cycleBadge(p.optionId === "every_2_days" ? "every_n_days" : p.optionId, p.meta)}</span>
                  <span class="badge badge-primary">${t(this.hass, "config_panel.cycle_cleanup_merge_n", {
            n: p.memberIds.length,
        })}</span>
                </div>
              </div>
            </div>
          </div>`)}
        ${(this._cleanupProposals ?? []).length === 0
            ? b `<p class="muted">${t(this.hass, "config_panel.cycle_cleanup_none")}</p>`
            : A}
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead"></div>
            <div class="dialog-footer-actions">
              <button type="button" class="btn-outline" @click=${() => (this._cleanupProposals = null)} ?disabled=${this._busy}>
                ${t(this.hass, "config_panel.zones_cancel")}
              </button>
              <button
                type="button"
                class="btn"
                ?disabled=${this._busy || (this._cleanupProposals ?? []).length === 0}
                @click=${() => this._applyCleanup()}
              >
                ${t(this.hass, "config_panel.cycle_cleanup_confirm")}
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
], ViewSchedule.prototype, "_expanded", void 0);
__decorate([
    r()
], ViewSchedule.prototype, "_slotEditDraft", void 0);
__decorate([
    r()
], ViewSchedule.prototype, "_addZonePick", void 0);
__decorate([
    r()
], ViewSchedule.prototype, "_cleanupProposals", void 0);
__decorate([
    e$1("si-cycle-wizard")
], ViewSchedule.prototype, "_wizard", void 0);
defineCustomElementOnce("si-view-schedule", ViewSchedule);

class ViewSettings extends i$2 {
    constructor() {
        super(...arguments);
        this._busy = false;
        this._dirty = false;
        this._isDefault = false;
        this._defaultConfirmOpen = false;
        this._showRaw = false;
        this._defaultConfirmOtherName = "";
        this._name = "";
        this._mode = "normal";
        this._maxParallel = 2;
        this._preStart = [];
        this._preStartDelaySec = 10;
        this._preStartScript = "";
        this._preStartScriptTimeoutSec = 300;
        this._postRunScript = "";
        this._postRunScriptTimeoutSec = 300;
        this._guards = [];
        this._beforeUnload = (e) => {
            if (this._dirty) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
    }
    static { this.properties = {
        hass: { attribute: false },
        entryId: { type: String },
        installation: { type: Object },
        runState: { type: Object },
        outputEntityDomains: { type: Array },
        onSaved: { attribute: false },
    }; }
    static { this.styles = [
        sharedStyles,
        formLayoutStyles,
        i$5 `
      .save-bar {
        position: sticky;
        bottom: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        margin: 8px -4px 0;
        background: var(--card-background-color);
        border-top: 1px solid var(--divider-color);
        border-radius: 0 0 12px 12px;
        box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
        z-index: 3;
      }
      .save-bar .dirty-note {
        color: var(--warning-color, #b85c00);
        font-size: 0.85rem;
      }
      .save-bar .btn {
        margin-left: auto;
      }
      pre.raw {
        overflow: auto;
        font-size: 12px;
        margin: 8px 0 0;
        white-space: pre-wrap;
        max-height: 320px;
      }
      .field-block {
        margin-bottom: 22px;
      }
    `,
    ]; }
    willUpdate(changed) {
        if (changed.has("installation") && this.installation && !this._dirty) {
            this._loadFromInstallation();
        }
    }
    _loadFromInstallation() {
        const inst = this.installation ?? {};
        this._name = String(inst.name ?? "");
        this._mode = String(inst.mode ?? "normal");
        this._maxParallel = Number(inst.max_parallel_zones ?? 2);
        this._isDefault = Boolean(inst.is_default ?? false);
        const ps = Array.isArray(inst.pre_start_switches)
            ? inst.pre_start_switches.filter(Boolean)
            : [];
        this._preStart = ps.length ? [...ps] : [""];
        const d = Number(inst.pre_start_delay_sec ?? 10);
        this._preStartDelaySec = Number.isFinite(d) ? Math.max(1, Math.min(3600, Math.round(d))) : 10;
        this._preStartScript = String(inst.pre_start_script ?? "");
        const st = Number(inst.pre_start_script_timeout_sec ?? 300);
        this._preStartScriptTimeoutSec = Number.isFinite(st)
            ? Math.max(1, Math.min(3600, Math.round(st)))
            : 300;
        this._postRunScript = String(inst.post_run_script ?? "");
        const pt = Number(inst.post_run_script_timeout_sec ?? 300);
        this._postRunScriptTimeoutSec = Number.isFinite(pt)
            ? Math.max(1, Math.min(3600, Math.round(pt)))
            : 300;
        this._guards = normalizeGuards(inst.guards);
        this._dirty = false;
    }
    connectedCallback() {
        super.connectedCallback();
        window.addEventListener("beforeunload", this._beforeUnload);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener("beforeunload", this._beforeUnload);
    }
    _markDirty() {
        if (!this._dirty) {
            this._dirty = true;
        }
    }
    async _save() {
        if (guardsIncomplete(this._guards)) {
            this._msg = t(this.hass, "config_panel.schedule_err_guards_incomplete");
            this.requestUpdate();
            return;
        }
        this._busy = true;
        this._msg = undefined;
        this.requestUpdate();
        try {
            const res = await saveGlobal(this.hass, this.entryId, {
                name: this._name,
                pre_start_switches: this._preStart.filter(Boolean),
                pre_start_delay_sec: this._preStartDelaySec,
                pre_start_script: this._preStartScript.trim(),
                pre_start_script_timeout_sec: this._preStartScriptTimeoutSec,
                post_run_script: this._postRunScript.trim(),
                post_run_script_timeout_sec: this._postRunScriptTimeoutSec,
                mode: this._mode,
                max_parallel_zones: this._maxParallel,
                is_default: this._isDefault,
                guards: guardsForSave(this._guards),
            });
            if (!res.success) {
                this._msg = formatApiError(res.error, this.hass);
            }
            else {
                this._dirty = false;
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
    _closeDefaultConfirm() {
        this._defaultConfirmOpen = false;
        this._defaultConfirmOtherName = "";
    }
    async _onDefaultToggle(checked) {
        this._markDirty();
        if (!checked) {
            this._isDefault = false;
            return;
        }
        try {
            const entries = await listSimpleIrrigationEntries(this.hass);
            for (const e of entries) {
                if (e.entry_id === this.entryId)
                    continue;
                const st = await fetchPanelState(this.hass, e.entry_id);
                const inst = st.installation;
                if (Boolean(inst.is_default ?? false)) {
                    this._defaultConfirmOtherName = String(inst.name ?? e.title);
                    this._defaultConfirmOpen = true;
                    return;
                }
            }
            this._isDefault = true;
        }
        catch (e) {
            this._msg = formatApiError(e, this.hass);
        }
    }
    _openIntegrationPage() {
        // Removal of an installation is the standard HA config-entry flow.
        window.open("/config/integrations/integration/simple_irrigation", "_blank", "noopener");
    }
    render() {
        const domains = this.outputEntityDomains ?? ["switch", "input_boolean", "group", "valve"];
        return b `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:cog-outline"></ha-icon>
          ${t(this.hass, "config_panel.general_card_settings")}
        </div>
        <div class="card-content">
          ${this._msg ? b `<div class="error">${this._msg}</div>` : A}

          <div class="section-title">${t(this.hass, "config_panel.settings_section_general")}</div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_installation_name")}</span>
            <div class="field-row">
              <ha-input
                .label=${t(this.hass, "config_panel.general_field_name")}
                .value=${this._name}
                @input=${(e) => {
            this._name = e.target.value;
            this._markDirty();
        }}
              ></ha-input>
            </div>
            <p class="hint">${t(this.hass, "config_panel.settings_name_hint")}</p>
          </div>

          <div class="section-title">${t(this.hass, "config_panel.settings_section_pump")}</div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_pre_start_script_title")}</span>
            <div class="field-row">
              ${renderNativeEntityField(this.hass, ["script"], t(this.hass, "config_panel.general_pre_start_script_field"), this._preStartScript, (v) => {
            this._preStartScript = v;
            this._markDirty();
            this.requestUpdate();
        }, { placeholderKey: "config_panel.entity_placeholder_script" })}
            </div>
            <details class="inline-help">
              <summary>
                <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
                ${t(this.hass, "config_panel.general_pre_start_script_title")}
              </summary>
              <p>${t(this.hass, "config_panel.general_pre_start_script_desc")}</p>
            </details>
          </div>
          ${this._preStartScript.trim()
            ? b `<div class="field-block">
                <span class="field-title">
                  ${t(this.hass, "config_panel.general_pre_start_script_timeout_title")}
                </span>
                <div class="field-row">
                  <ha-input
                    type="number"
                    .label=${t(this.hass, "config_panel.general_pre_start_script_timeout_field")}
                    .value=${String(this._preStartScriptTimeoutSec)}
                    min="1"
                    max="3600"
                    @input=${(e) => {
                this._preStartScriptTimeoutSec = Math.max(1, Math.min(3600, parseInt(e.target.value, 10) || 1));
                this._markDirty();
            }}
                  ></ha-input>
                </div>
                <p class="hint">
                  ${t(this.hass, "config_panel.settings_pre_start_script_timeout_hint")}
                </p>
              </div>`
            : A}
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_pre_start_title")}</span>
            <div class="field-row">
              <div class="entity-picker-rows">
                ${this._preStart.map((eid, i) => b `
                    <div class="entity-picker-row">
                      ${renderNativeEntityField(this.hass, domains, i === 0
            ? t(this.hass, "config_panel.general_pre_start_output_n")
            : t(this.hass, "config_panel.general_pre_start_output_i", { n: i + 1 }), eid, (v) => {
            const next = [...this._preStart];
            next[i] = v;
            this._preStart = next;
            this._markDirty();
            this.requestUpdate();
        })}
                      ${this._preStart.length > 1
            ? b `<button
                            type="button"
                            class="row-remove"
                            @click=${() => {
                this._preStart.splice(i, 1);
                if (this._preStart.length === 0)
                    this._preStart = [""];
                this._markDirty();
                this.requestUpdate();
            }}
                          >
                            ${t(this.hass, "config_panel.general_remove")}
                          </button>`
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
            <details class="inline-help">
              <summary>
                <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
                ${t(this.hass, "config_panel.general_pre_start_title")}
              </summary>
              <p>${t(this.hass, "config_panel.general_pre_start_desc")}</p>
            </details>
          </div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_pre_start_delay_title")}</span>
            <div class="field-row">
              <ha-input
                type="number"
                .label=${t(this.hass, "config_panel.general_pre_start_delay_field")}
                .value=${String(this._preStartDelaySec)}
                min="1"
                max="3600"
                @input=${(e) => {
            this._preStartDelaySec = Math.max(1, Math.min(3600, parseInt(e.target.value, 10) || 1));
            this._markDirty();
        }}
              ></ha-input>
            </div>
            <p class="hint">${t(this.hass, "config_panel.settings_pre_start_delay_hint")}</p>
          </div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_post_run_script_title")}</span>
            <div class="field-row">
              ${renderNativeEntityField(this.hass, ["script"], t(this.hass, "config_panel.general_post_run_script_field"), this._postRunScript, (v) => {
            this._postRunScript = v;
            this._markDirty();
            this.requestUpdate();
        }, { placeholderKey: "config_panel.entity_placeholder_script" })}
            </div>
            <details class="inline-help">
              <summary>
                <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
                ${t(this.hass, "config_panel.general_post_run_script_title")}
              </summary>
              <p>${t(this.hass, "config_panel.general_post_run_script_desc")}</p>
            </details>
          </div>
          ${this._postRunScript.trim()
            ? b `<div class="field-block">
                <span class="field-title">
                  ${t(this.hass, "config_panel.general_post_run_script_timeout_title")}
                </span>
                <div class="field-row">
                  <ha-input
                    type="number"
                    .label=${t(this.hass, "config_panel.general_post_run_script_timeout_field")}
                    .value=${String(this._postRunScriptTimeoutSec)}
                    min="1"
                    max="3600"
                    @input=${(e) => {
                this._postRunScriptTimeoutSec = Math.max(1, Math.min(3600, parseInt(e.target.value, 10) || 1));
                this._markDirty();
            }}
                  ></ha-input>
                </div>
                <p class="hint">
                  ${t(this.hass, "config_panel.settings_post_run_script_timeout_hint")}
                </p>
              </div>`
            : A}

          <div class="section-title">${t(this.hass, "config_panel.settings_section_watering")}</div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_watering_mode")}</span>
            <div class="field-row">
              <select
                class="field-select"
                @change=${(e) => {
            this._mode = e.target.value;
            this._markDirty();
        }}
              >
                ${["eco", "normal", "extra"].map((m) => b `<option value=${m} ?selected=${this._mode === m}>
                      ${t(this.hass, `config_panel.general_mode_${m}`)}
                    </option>`)}
              </select>
            </div>
          </div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.general_max_parallel")}</span>
            <div class="field-row">
              <ha-input
                type="number"
                .label=${t(this.hass, "config_panel.general_max_parallel_field")}
                .value=${String(this._maxParallel)}
                min="1"
                max="16"
                @input=${(e) => {
            this._maxParallel = Math.max(1, Math.min(16, parseInt(e.target.value, 10) || 1));
            this._markDirty();
        }}
              ></ha-input>
            </div>
            <p class="hint">${t(this.hass, "config_panel.settings_max_parallel_hint")}</p>
          </div>

          <div class="section-title">${t(this.hass, "config_panel.settings_section_guards")}</div>
          <div class="field-block">
            <span class="field-title">${t(this.hass, "config_panel.guards_section_title")}</span>
            <p class="field-desc">${t(this.hass, "config_panel.guards_section_desc")}</p>
            ${renderGuardList(this.hass, GUARD_ENTITY_DOMAINS, this._guards, (next) => {
            this._guards = next;
            this._markDirty();
        })}
            <p class="hint">${t(this.hass, "config_panel.settings_guards_hint")}</p>
          </div>

          <div class="section-title">${t(this.hass, "config_panel.general_default_section")}</div>
          <div class="field-block">
            <div class="switch-row">
              <ha-switch
                .disabled=${this._busy}
                .checked=${this._isDefault}
                @change=${(e) => {
            const tgt = e.target;
            void this._onDefaultToggle(Boolean(tgt.checked));
        }}
              ></ha-switch>
              <span class="switch-row-label">${t(this.hass, "config_panel.general_default_toggle_label")}</span>
            </div>
            <p class="hint">${t(this.hass, "config_panel.settings_default_hint")}</p>
          </div>

          <div class="section-title">${t(this.hass, "config_panel.settings_section_automations")}</div>
          <details class="inline-help">
            <summary>
              <ha-icon class="inline-help-icon" icon="mdi:robot-outline"></ha-icon>
              ${t(this.hass, "config_panel.settings_automations_summary")}
            </summary>
            <div class="help-body">
              <p style="border:0;padding:0;margin:0 0 8px;background:none">
                ${t(this.hass, "config_panel.settings_automations_body")}
              </p>
              <div><code>config_entry_id</code>: <code>${this.entryId}</code></div>
            </div>
          </details>
          <details class="inline-help" @toggle=${(e) => {
            this._showRaw = e.target.open;
        }}>
            <summary>
              <ha-icon class="inline-help-icon" icon="mdi:code-json"></ha-icon>
              ${t(this.hass, "config_panel.settings_diagnostics_summary")}
            </summary>
            ${this._showRaw
            ? b `<pre class="raw">${JSON.stringify(this.runState ?? {}, null, 2)}</pre>`
            : A}
          </details>

          <div class="section-title">${t(this.hass, "config_panel.settings_manage_title")}</div>
          <p class="hint">${t(this.hass, "config_panel.settings_manage_desc")}</p>
          <button type="button" class="btn-outline" @click=${() => this._openIntegrationPage()}>
            ${t(this.hass, "config_panel.settings_open_integration")}
          </button>
        </div>

        <div class="save-bar">
          ${this._dirty
            ? b `<span class="dirty-note">${t(this.hass, "config_panel.settings_unsaved")}</span>`
            : b `<span class="muted">${t(this.hass, "config_panel.settings_all_saved")}</span>`}
          <button type="button" class="btn" ?disabled=${this._busy || !this._dirty} @click=${() => this._save()}>
            ${this._busy ? t(this.hass, "config_panel.general_saving") : t(this.hass, "config_panel.general_save")}
          </button>
        </div>
      </ha-card>

      <ha-dialog
        .open=${this._defaultConfirmOpen}
        header-title=${t(this.hass, "config_panel.general_default_confirm_title")}
        @closed=${() => this._closeDefaultConfirm()}
      >
        <p>
          ${t(this.hass, "config_panel.general_default_confirm_body", {
            name: this._name || this.entryId,
            other: this._defaultConfirmOtherName,
        })}
        </p>
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead"></div>
            <div class="dialog-footer-actions">
              <button type="button" class="btn-outline" @click=${() => this._closeDefaultConfirm()}>
                ${t(this.hass, "config_panel.general_default_confirm_cancel")}
              </button>
              <button
                type="button"
                class="btn"
                @click=${() => {
            this._isDefault = true;
            this._markDirty();
            this._closeDefaultConfirm();
        }}
              >
                ${t(this.hass, "config_panel.general_default_confirm_ok")}
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
], ViewSettings.prototype, "_busy", void 0);
__decorate([
    r()
], ViewSettings.prototype, "_msg", void 0);
__decorate([
    r()
], ViewSettings.prototype, "_dirty", void 0);
__decorate([
    r()
], ViewSettings.prototype, "_isDefault", void 0);
__decorate([
    r()
], ViewSettings.prototype, "_defaultConfirmOpen", void 0);
__decorate([
    r()
], ViewSettings.prototype, "_showRaw", void 0);
__decorate([
    r()
], ViewSettings.prototype, "_guards", void 0);
defineCustomElementOnce("si-view-settings", ViewSettings);

class ViewTimetable extends i$2 {
    constructor() {
        super(...arguments);
        /** Selected week view; null = follow the current calendar week. */
        this._weekView = null;
        /** Selected weekday for the mobile day view; null = today. */
        this._selectedDay = null;
    }
    static { this.properties = {
        hass: { attribute: false },
        entryId: { type: String },
        installation: { type: Object },
    }; }
    static { this.styles = [
        sharedStyles,
        i$5 `
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
    .tt-block--biweekly {
      border-style: dashed;
      border-width: 1.5px;
    }
    .tt-block--biweekly.tt-block--active {
      border-color: color-mix(in srgb, var(--primary-color) 85%, var(--card-background-color));
    }
    .tt-block-parity {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 0.6rem;
      opacity: 0.92;
    }
    .tt-block-parity ha-icon {
      --mdc-icon-size: 11px;
      width: 11px;
      height: 11px;
    }
    .week-toggle {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px;
    }
    .week-toggle-seg {
      display: inline-flex;
      border: 1px solid var(--divider-color);
      border-radius: 999px;
      overflow: hidden;
      background: var(--card-background-color);
    }
    .week-toggle-btn {
      appearance: none;
      border: none;
      background: transparent;
      color: var(--primary-text-color);
      font: inherit;
      font-size: 0.8rem;
      padding: 7px 14px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      line-height: 1.2;
    }
    .week-toggle-btn + .week-toggle-btn {
      border-left: 1px solid var(--divider-color);
    }
    .week-toggle-btn[aria-pressed="true"] {
      background: var(--primary-color);
      color: var(--text-primary-color);
    }
    .week-toggle-btn:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: -2px;
    }
    .week-toggle-now {
      font-size: 0.68rem;
      opacity: 0.85;
      white-space: nowrap;
    }
    .swatch--biweekly {
      background: color-mix(in srgb, var(--primary-color) 78%, var(--card-background-color));
      border: 1.5px dashed color-mix(in srgb, var(--primary-color) 85%, var(--card-background-color));
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
    /* Sticky header row + first (zone) column on horizontal scroll. */
    .tt-table thead th {
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .tt-zone-name {
      position: sticky;
      left: 0;
      z-index: 1;
    }
    .tt-foot-total {
      text-align: center;
      font-weight: 600;
      font-size: 0.72rem;
      color: var(--secondary-text-color);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    .tt-foot-label {
      text-align: right;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--secondary-text-color);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    /* Mobile day view */
    .day-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 4px 0 14px;
    }
    .day-pill {
      flex: 1 1 auto;
      min-width: 40px;
      border: 1px solid var(--divider-color);
      border-radius: 999px;
      background: transparent;
      color: var(--primary-text-color);
      font: inherit;
      font-size: 0.8rem;
      padding: 8px 4px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }
    .day-pill.selected {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border-color: var(--primary-color);
    }
    .day-pill .dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--primary-color);
    }
    .day-pill.selected .dot {
      background: var(--text-primary-color, #fff);
    }
    .day-run {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid var(--divider-color);
      border-left: 3px solid var(--primary-color);
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
    }
    .day-run.disabled {
      border-left-color: var(--disabled-text-color, #6d7476);
      opacity: 0.75;
    }
    .day-run-main {
      flex: 1;
      min-width: 0;
    }
    .day-run-time {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .day-total {
      font-size: 0.8rem;
      color: var(--secondary-text-color);
      margin: 6px 0 0;
    }
  `,
    ]; }
    _parityLabel(parity) {
        if (parity === "odd")
            return t(this.hass, "config_panel.week_parity_odd");
        if (parity === "even")
            return t(this.hass, "config_panel.week_parity_even");
        return t(this.hass, "config_panel.week_parity_every");
    }
    _parityBadge(parity) {
        return parity === "odd"
            ? t(this.hass, "config_panel.timetable_parity_badge_odd")
            : t(this.hass, "config_panel.timetable_parity_badge_even");
    }
    _bucketIcon(bucket) {
        if (bucket === 0)
            return "mdi:weather-sunset-up";
        if (bucket === 1)
            return "mdi:white-balance-sunny";
        return "mdi:weather-sunset";
    }
    _bucketAriaLabel(bucket) {
        if (bucket === 0)
            return t(this.hass, "config_panel.timetable_bucket_aria_morning");
        if (bucket === 1)
            return t(this.hass, "config_panel.timetable_bucket_aria_day");
        return t(this.hass, "config_panel.timetable_bucket_aria_evening");
    }
    _bucketLegendCaption(bucket) {
        if (bucket === 0)
            return t(this.hass, "config_panel.timetable_legend_bucket_morning");
        if (bucket === 1)
            return t(this.hass, "config_panel.timetable_legend_bucket_day");
        return t(this.hass, "config_panel.timetable_legend_bucket_evening");
    }
    _entryTooltip(e) {
        const start = formatSlotTimeForProfile(this.hass, minutesToTimeLocal(e.startMin));
        const end = formatSlotTimeForProfile(this.hass, minutesToTimeLocal(e.endMin));
        const modeKey = e.mode === "eco"
            ? "config_panel.timetable_mode_eco"
            : e.mode === "extra"
                ? "config_panel.timetable_mode_extra"
                : "config_panel.timetable_mode_normal";
        const modeLabel = t(this.hass, modeKey);
        const base = t(this.hass, "config_panel.timetable_bar_tooltip", {
            start,
            end,
            mode: modeLabel,
        });
        if (e.weekParity === "every")
            return base;
        return `${base} · ${this._parityLabel(e.weekParity)}`;
    }
    _entriesForCell(map, weekday, zoneId, bucket) {
        return map.get(`${weekday}\t${zoneId}\t${bucket}`) ?? [];
    }
    _openSlotEditor(slotId) {
        if (!slotId || !this.entryId)
            return;
        const q = new URLSearchParams({ editSlot: slotId });
        navigate(this, `${exportPath(this.entryId, "schedule")}?${q.toString()}`);
    }
    _blockKeydown(ev, slotId) {
        if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            this._openSlotEditor(slotId);
        }
    }
    render() {
        const inst = this.installation ?? {};
        const zones = inst.zones;
        const slots = inst.schedule_slots;
        const zoneIds = zoneRowOrder(inst);
        const allEntries = buildTimetableEntries(inst);
        const hasBiweekly = allEntries.some((e) => e.weekParity !== "every");
        const nowWeek = isoWeekNumber(new Date());
        const nowParity = weekParityOfWeekNumber(nowWeek);
        const viewParity = hasBiweekly ? (this._weekView ?? nowParity) : null;
        const entries = viewParity
            ? allEntries.filter((e) => e.weekParity === "every" || e.weekParity === viewParity)
            : allEntries;
        const laneInfo = assignEntryLanes(entries);
        const colOrder = weekdayIndicesForDisplay(this.hass?.locale?.first_weekday, this.hass?.locale?.language ?? this.hass?.language);
        if (!zones || zoneIds.length === 0) {
            return b `
        <ha-card>
          <div class="card-header">
            <ha-icon icon="mdi:calendar-week"></ha-icon>
            ${t(this.hass, "config_panel.timetable_card_title")}
          </div>
          <div class="card-content">
            <div class="empty-state">
              <ha-icon icon="mdi:calendar-week"></ha-icon>
              <p>${t(this.hass, "config_panel.timetable_empty_no_zones")}</p>
            </div>
          </div>
        </ha-card>
      `;
        }
        if (!slots?.length) {
            return b `
        <ha-card>
          <div class="card-header">
            <ha-icon icon="mdi:calendar-week"></ha-icon>
            ${t(this.hass, "config_panel.timetable_card_title")}
          </div>
          <div class="card-content">
            <div class="empty-state">
              <ha-icon icon="mdi:calendar-blank-outline"></ha-icon>
              <p>${t(this.hass, "config_panel.timetable_empty_no_slots")}</p>
            </div>
          </div>
        </ha-card>
      `;
        }
        const byCell = new Map();
        for (const e of entries) {
            const k = `${e.weekday}\t${e.zoneId}\t${e.bucket}`;
            if (!byCell.has(k))
                byCell.set(k, []);
            byCell.get(k).push(e);
        }
        // Per-weekday totals (sum of visible-entry durations) for the footer row.
        const dayTotals = new Map();
        for (const e of entries) {
            dayTotals.set(e.weekday, (dayTotals.get(e.weekday) ?? 0) + (e.endMin - e.startMin));
        }
        // Mobile day view: runs on the selected weekday, chronological.
        const todayWd = (new Date().getDay() + 6) % 7;
        const selDay = this._selectedDay ?? todayWd;
        const dayEntries = entries
            .filter((e) => e.weekday === selDay)
            .sort((a, b) => a.startMin - b.startMin);
        const dayTotal = Math.round(dayEntries.reduce((s, e) => s + (e.endMin - e.startMin), 0));
        return b `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:calendar-week"></ha-icon>
          ${t(this.hass, "config_panel.timetable_card_title")}
        </div>
        <div class="card-content">
          <details class="inline-help">
            <summary>
              <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
              ${t(this.hass, "config_panel.timetable_help_summary")}
            </summary>
            <p>${t(this.hass, "config_panel.timetable_intro")}</p>
          </details>
          ${viewParity
            ? b `
                <div
                  class="week-toggle"
                  role="group"
                  aria-label=${t(this.hass, "config_panel.timetable_week_toggle_label")}
                >
                  <span class="week-toggle-seg">
                    ${["odd", "even"].map((p) => b `
                        <button
                          type="button"
                          class="week-toggle-btn"
                          aria-pressed=${viewParity === p ? "true" : "false"}
                          @click=${() => {
                this._weekView = p;
            }}
                        >
                          <span>${this._parityLabel(p)}</span>
                          ${nowParity === p
                ? b `<span class="week-toggle-now"
                                >${t(this.hass, "config_panel.timetable_week_current_hint", {
                    n: nowWeek,
                })}</span
                              >`
                : A}
                        </button>
                      `)}
                  </span>
                </div>
              `
            : A}
          <div class="only-narrow">
            <div class="day-pills" role="group" aria-label=${t(this.hass, "config_panel.timetable_col_zone")}>
              ${colOrder.map((wd) => {
            const has = (dayTotals.get(wd) ?? 0) > 0;
            return b `<button
                  type="button"
                  class="day-pill ${wd === selDay ? "selected" : ""}"
                  aria-pressed=${wd === selDay ? "true" : "false"}
                  @click=${() => (this._selectedDay = wd)}
                >
                  <span>${weekdayLong(this.hass, wd)}</span>
                  ${has ? b `<span class="dot" aria-hidden="true"></span>` : A}
                </button>`;
        })}
            </div>
            ${dayEntries.length
            ? b `
                  ${dayEntries.map((e) => {
                const start = formatSlotTimeForProfile(this.hass, minutesToTimeLocal(e.startMin));
                const end = formatSlotTimeForProfile(this.hass, minutesToTimeLocal(e.endMin));
                return b `
                      <div
                        class="day-run ${e.enabled ? "" : "disabled"}"
                        role="button"
                        tabindex="0"
                        @click=${() => this._openSlotEditor(e.slotId)}
                        @keydown=${(ev) => this._blockKeydown(ev, e.slotId)}
                      >
                        <ha-icon icon=${this._bucketIcon(e.bucket)} style="color:var(--secondary-text-color)"></ha-icon>
                        <div class="day-run-main">
                          <span class="day-run-time">${start} – ${end}</span>
                          <div class="meta-line">
                            <span class="meta ellipsis">${zoneDisplayName(inst, e.zoneId)}</span>
                            <span class="meta">${t(this.hass, "config_panel.timetable_duration_min", {
                    n: entryDurationMinutesRounded(e),
                })}</span>
                          </div>
                        </div>
                      </div>
                    `;
            })}
                  <p class="day-total">${t(this.hass, "config_panel.timetable_day_total", { n: dayTotal })}</p>
                `
            : b `<p class="muted" style="padding:8px 0">${t(this.hass, "config_panel.timetable_day_empty")}</p>`}
          </div>
          <div class="table-wrap hide-narrow">
            <table class="tt-table">
              <thead>
                <tr>
                  <th class="tt-th-zone" scope="col">${t(this.hass, "config_panel.timetable_col_zone")}</th>
                  <th class="tt-th-bucket" scope="col" aria-hidden="true"></th>
                  ${colOrder.map((wd) => b `<th class="tt-th-day" scope="col">${weekdayLong(this.hass, wd)}</th>`)}
                </tr>
              </thead>
              <tbody>
                ${zoneIds.flatMap((zid) => {
            const name = zoneDisplayName(inst, zid);
            return TIMETABLE_BUCKET_INDICES.map((bucket, bi) => {
                return b `
                      <tr>
                        ${bi === 0
                    ? b `<th class="tt-zone-name" scope="row" rowspan="3">${name}</th>`
                    : A}
                        <th
                          class="tt-bucket-icon"
                          scope="row"
                          aria-label=${this._bucketAriaLabel(bucket)}
                        >
                          <ha-icon icon=${this._bucketIcon(bucket)}></ha-icon>
                        </th>
                        ${colOrder.map((wd) => {
                    const cellEntries = [...this._entriesForCell(byCell, wd, zid, bucket)].sort((a, b) => a.startMin - b.startMin);
                    const multiLane = cellEntries.some((e) => {
                        const info = laneInfo.get(e);
                        return info && info.maxLanes > 1;
                    });
                    return b `
                            <td class="tt-bucket-cell">
                              ${cellEntries.length
                        ? b `
                                    <div class="tt-blocks ${multiLane ? "tt-blocks--lanes" : ""}">
                                      ${cellEntries.map((e) => {
                            const start = formatSlotTimeForProfile(this.hass, minutesToTimeLocal(e.startMin));
                            const end = formatSlotTimeForProfile(this.hass, minutesToTimeLocal(e.endMin));
                            const dur = entryDurationMinutesRounded(e);
                            const durLabel = t(this.hass, "config_panel.timetable_duration_min", {
                                n: dur,
                            });
                            const biweekly = e.weekParity !== "every";
                            return b `
                                          <div
                                            class="tt-block tt-block--clickable ${e.enabled
                                ? "tt-block--active"
                                : "tt-block--disabled"} ${biweekly
                                ? "tt-block--biweekly"
                                : ""}"
                                            title=${this._entryTooltip(e)}
                                            role="button"
                                            tabindex="0"
                                            @click=${() => this._openSlotEditor(e.slotId)}
                                            @keydown=${(ev) => this._blockKeydown(ev, e.slotId)}
                                          >
                                            <span class="tt-block-time">${start} – ${end}</span>
                                            <span class="tt-block-dur">${durLabel}</span>
                                            ${biweekly
                                ? b `<span class="tt-block-parity">
                                                  <ha-icon icon="mdi:calendar-sync"></ha-icon>
                                                  ${this._parityBadge(e.weekParity)}
                                                </span>`
                                : A}
                                          </div>
                                        `;
                        })}
                                    </div>
                                  `
                        : A}
                            </td>
                          `;
                })}
                      </tr>
                    `;
            });
        })}
              </tbody>
              <tfoot>
                <tr>
                  <th class="tt-foot-label" scope="row" colspan="2">
                    ${t(this.hass, "config_panel.timetable_totals_label")}
                  </th>
                  ${colOrder.map((wd) => {
            const total = Math.round(dayTotals.get(wd) ?? 0);
            return b `<td class="tt-foot-total">
                      ${total > 0 ? t(this.hass, "config_panel.timetable_duration_min", { n: total }) : "—"}
                    </td>`;
        })}
                </tr>
              </tfoot>
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
              ${hasBiweekly
            ? b `
                    <span class="legend-item">
                      <span class="swatch swatch--biweekly" aria-hidden="true"></span>
                      ${t(this.hass, "config_panel.timetable_legend_biweekly")}
                    </span>
                  `
            : A}
              <span class="legend-sep" aria-hidden="true"></span>
              ${TIMETABLE_BUCKET_INDICES.map((b$1) => b `
                  <span class="legend-period">
                    <ha-icon icon=${this._bucketIcon(b$1)}></ha-icon>
                    <span>${this._bucketLegendCaption(b$1)}</span>
                  </span>
                `)}
            </div>
          </div>
        </div>
      </ha-card>
    `;
    }
}
__decorate([
    r()
], ViewTimetable.prototype, "_weekView", void 0);
__decorate([
    r()
], ViewTimetable.prototype, "_selectedDay", void 0);
defineCustomElementOnce("si-view-timetable", ViewTimetable);

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e=t=>(...e)=>({_$litDirective$:t,values:e});let i$1 = class i{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i;}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}};

/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const m={},p=(o,t=m)=>o._$AH=t;

/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const i=e(class extends i$1{constructor(){super(...arguments),this.key=A;}render(r,t){return this.key=r,t}update(r,[t,e]){return t!==this.key&&(p(r),this.key=t),e}});

const defaultDomains = ["switch", "input_boolean", "group", "valve"];
/** Entity domains the start target usually lives in — the start service does not
 *  always address the output itself (Hydrawise starts via its `binary_sensor`).
 *  Suggestions only: the backend puts no domain rule on `start_entity_id`, so the
 *  picker for that field runs with `allowCustom`. */
const startTargetDomains = ["switch", "valve", "binary_sensor", "input_boolean", "number"];
const zoneStartPresets = {
    rainbird: {
        start_service: "rainbird.start_irrigation",
        duration_field: "duration",
        duration_unit: "minutes",
        hintKey: "config_panel.zones_start_hint_output_is_target",
    },
    rachio: {
        start_service: "rachio.start_watering",
        duration_field: "duration",
        duration_unit: "minutes",
        hintKey: "config_panel.zones_start_hint_output_is_target",
    },
    hydrawise: {
        start_service: "hydrawise.start_watering",
        duration_field: "duration",
        duration_unit: "minutes",
        hintKey: "config_panel.zones_start_hint_hydrawise",
    },
    bhyve: {
        start_service: "bhyve.start_watering",
        duration_field: "minutes",
        duration_unit: "minutes",
        hintKey: "config_panel.zones_start_hint_output_is_target",
    },
    opensprinkler: {
        start_service: "opensprinkler.run",
        duration_field: "run_seconds",
        duration_unit: "seconds",
        hintKey: "config_panel.zones_start_hint_output_is_target",
    },
};
class ViewZones extends i$2 {
    constructor() {
        super(...arguments);
        this._busy = false;
        this._addDialogOpen = false;
        this._editDraft = null;
        this._filter = "all";
        this._expanded = new Set();
        this._new = this._blankZone();
    }
    static { this.properties = {
        hass: { attribute: false },
        entryId: { type: String },
        installation: { type: Object },
        runState: { type: Object },
        outputEntityDomains: { type: Array },
        onSaved: { attribute: false },
    }; }
    static { this.styles = [
        sharedStyles,
        formLayoutStyles,
        i$5 `
      .drawer-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-top: 12px;
      }
      .drawer-actions .btn-outline {
        width: 100%;
        min-height: 46px;
        margin-top: 0;
      }
      .out-line {
        margin: 8px 0 0;
        font-size: 0.8rem;
        color: var(--secondary-text-color);
      }
      /* Local reset: form-layout adds align-self/margin to .btn-outline. */
      .card-header .header-actions .btn-outline,
      .card-header .header-actions .btn {
        margin-top: 0;
        align-self: center;
      }
    `,
    ]; }
    _blankZone() {
        return {
            zone_id: "",
            name: "",
            switch_entity_ids: [""],
            enabled: true,
            duration_eco_min: 10,
            duration_normal_min: 15,
            duration_extra_min: 20,
            exclusive: false,
            start_service: "",
            duration_field: "",
            duration_unit: "",
            start_entity_id: "",
        };
    }
    _cloneZone(z) {
        return { ...z, switch_entity_ids: [...z.switch_entity_ids] };
    }
    _zonesFromInstallation() {
        const z = this.installation?.zones;
        if (!z)
            return [];
        return Object.entries(z).map(([zone_id, o]) => {
            const raw = o.switch_entity_ids;
            let ids = [];
            if (Array.isArray(raw))
                ids = raw.map((x) => String(x)).filter(Boolean);
            else if (o.switch_entity_id)
                ids = [String(o.switch_entity_id)];
            if (ids.length === 0)
                ids = [""];
            return {
                zone_id,
                name: String(o.name ?? ""),
                switch_entity_ids: ids,
                enabled: Boolean(o.enabled ?? true),
                duration_eco_min: Number(o.duration_eco_min ?? 10),
                duration_normal_min: Number(o.duration_normal_min ?? 15),
                duration_extra_min: Number(o.duration_extra_min ?? 20),
                exclusive: Boolean(o.exclusive ?? false),
                start_service: String(o.start_service ?? ""),
                duration_field: String(o.duration_field ?? ""),
                duration_unit: String(o.duration_unit ?? ""),
                start_entity_id: String(o.start_entity_id ?? ""),
            };
        });
    }
    /** A zone has an "issue" when an output entity is missing or unavailable. */
    _zoneIssue(z) {
        const outs = z.switch_entity_ids.filter(Boolean);
        if (outs.length === 0)
            return true;
        for (const eid of outs) {
            const st = this.hass.states[eid];
            if (!st || st.state === "unavailable" || st.state === "unknown")
                return true;
        }
        return false;
    }
    _mode() {
        return String(this.installation?.mode ?? "normal");
    }
    _closeAddDialog() {
        this._addDialogOpen = false;
        this._new = this._blankZone();
    }
    _closeEditDialog() {
        this._editDraft = null;
    }
    _canSaveZone(z) {
        return Boolean(z.name.trim() && z.switch_entity_ids.some((id) => id.trim()));
    }
    /** Which entity goes into "outputs" and which into "start target" — that pairing
     *  is the one thing users get wrong, because stopping always runs via the outputs. */
    _renderPresetHint(z) {
        const cfg = zoneStartPresets[this._presetForZone(z)];
        if (!cfg)
            return A;
        return b `<p class="hint">
      <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
      ${t(this.hass, cfg.hintKey)}
    </p>`;
    }
    _presetForZone(z) {
        if (!z.start_service && !z.duration_field && !z.duration_unit && !z.start_entity_id) {
            return "none";
        }
        for (const [preset, cfg] of Object.entries(zoneStartPresets)) {
            if (z.start_service.trim() === cfg.start_service &&
                z.duration_field.trim() === cfg.duration_field &&
                z.duration_unit.trim() === cfg.duration_unit) {
                return preset;
            }
        }
        return "custom";
    }
    _toggleExpand(id) {
        const next = new Set(this._expanded);
        if (next.has(id))
            next.delete(id);
        else
            next.add(id);
        this._expanded = next;
    }
    async _runZoneNow(zoneId) {
        this._busy = true;
        this._msg = undefined;
        this.requestUpdate();
        try {
            const res = (await runZoneNow(this.hass, this.entryId, zoneId));
            if (!res.success) {
                const err = res.error ?? "run_failed";
                const map = {
                    busy: "config_panel.zones_err_busy",
                    zone_already_queued: "config_panel.zones_err_zone_already_queued",
                    unknown_zone: "config_panel.zones_err_unknown_zone",
                    zone_disabled: "config_panel.zones_err_zone_disabled",
                    zone_no_outputs: "config_panel.zones_err_zone_no_outputs",
                };
                this._msg = map[err] ? t(this.hass, map[err]) : String(err);
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
    async _toggleZoneEnabled(z, enabled) {
        if (this._busy)
            return;
        await this._saveZone("update", z.zone_id, { ...z, enabled }, { keepDialogs: true });
    }
    async _saveZone(action, zoneId, zone, opts) {
        this._busy = true;
        this._msg = undefined;
        this.requestUpdate();
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
                    start_service: zone.start_service.trim(),
                    duration_field: zone.duration_field.trim(),
                    duration_unit: zone.duration_unit.trim(),
                    start_entity_id: zone.start_entity_id.trim(),
                };
            }
            const res = await saveZone(this.hass, this.entryId, body);
            if (!res.success) {
                this._msg = formatApiError(res.error, this.hass);
            }
            else {
                if (!opts?.keepDialogs) {
                    if (action === "add")
                        this._closeAddDialog();
                    if (action === "update" || action === "delete")
                        this._closeEditDialog();
                }
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
    _renderZoneFields(z) {
        const modeInput = (key, labelKey) => b `
      <ha-input
        type="number"
        .label=${t(this.hass, labelKey)}
        .value=${String(z[key])}
        min="0"
        max="240"
        @input=${(e) => {
            z[key] = parseInt(e.target.value, 10) || 0;
        }}
      ></ha-input>
    `;
        return b `
      <div class="section-title">${t(this.hass, "config_panel.zones_field_name_title")}</div>
      <div class="field-block">
        <div class="field-row">
          <ha-input
            .label=${t(this.hass, "config_panel.zones_field_zone_name")}
            .value=${z.name}
            @input=${(e) => {
            z.name = e.target.value;
            this.requestUpdate();
        }}
          ></ha-input>
        </div>
      </div>
      <div class="field-block">
        <span class="field-title">${t(this.hass, "config_panel.zones_outputs_title")}</span>
        <div class="field-row">
          <div class="entity-picker-rows">
            ${z.switch_entity_ids.map((eid, i) => b `
                <div class="entity-picker-row">
                  ${renderNativeEntityField(this.hass, this.outputEntityDomains ?? defaultDomains, i === 0
            ? t(this.hass, "config_panel.zones_output_first")
            : t(this.hass, "config_panel.zones_output_n", { n: i + 1 }), eid, (v) => {
            const next = [...z.switch_entity_ids];
            next[i] = v;
            z.switch_entity_ids = next;
            this.requestUpdate();
        })}
                  ${z.switch_entity_ids.length > 1
            ? b `<button
                        type="button"
                        class="row-remove"
                        @click=${() => {
                z.switch_entity_ids.splice(i, 1);
                if (z.switch_entity_ids.length === 0)
                    z.switch_entity_ids = [""];
                this.requestUpdate();
            }}
                      >
                        ${t(this.hass, "config_panel.general_remove")}
                      </button>`
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
        <details class="inline-help">
          <summary>
            <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
            ${t(this.hass, "config_panel.zones_outputs_title")}
          </summary>
          <p>${t(this.hass, "config_panel.zones_outputs_desc")}</p>
        </details>
      </div>

      <div class="section-title">${t(this.hass, "config_panel.zones_runtime_title")}</div>
      <div class="field-block">
        <div class="duration-row">
          ${modeInput("duration_eco_min", "config_panel.zones_duration_eco")}
          ${modeInput("duration_normal_min", "config_panel.zones_duration_normal")}
          ${modeInput("duration_extra_min", "config_panel.zones_duration_extra")}
        </div>
        <p class="hint">${t(this.hass, "config_panel.zones_runtime_desc")}</p>
      </div>

      <div class="section-title">${t(this.hass, "config_panel.zones_behavior_title")}</div>
      <div class="field-block">
        <div class="switch-rows">
          <div class="switch-row">
            <ha-switch
              .disabled=${this._busy}
              .checked=${z.enabled}
              @change=${(e) => {
            z.enabled = Boolean(e.target.checked);
            this.requestUpdate();
        }}
            ></ha-switch>
            <span class="switch-row-label">${t(this.hass, "config_panel.zones_enabled")}</span>
          </div>
          <div class="switch-row">
            <ha-switch
              .disabled=${this._busy}
              .checked=${z.exclusive}
              @change=${(e) => {
            z.exclusive = Boolean(e.target.checked);
            this.requestUpdate();
        }}
            ></ha-switch>
            <span class="switch-row-label">${t(this.hass, "config_panel.zones_exclusive")}</span>
          </div>
        </div>
        <p class="hint">${t(this.hass, "config_panel.zones_behavior_desc")}</p>
      </div>

      <div class="section-title">${t(this.hass, "config_panel.zones_advanced_title")}</div>
      <div class="field-block">
        <details class="inline-help" ?open=${Boolean(z.start_service || z.duration_field || z.duration_unit || z.start_entity_id)}>
          <summary>
            <ha-icon class="inline-help-icon" icon="mdi:tune"></ha-icon>
            ${t(this.hass, "config_panel.zones_advanced_summary")}
          </summary>
          <p>${t(this.hass, "config_panel.zones_advanced_desc")}</p>
          <div class="field-row">
            <label class="stacked-field-label" for="si-preset-${z.zone_id || "new"}">
              ${t(this.hass, "config_panel.zones_start_preset")}
            </label>
            <select
              id="si-preset-${z.zone_id || "new"}"
              class="field-select"
              .value=${this._presetForZone(z)}
              @change=${(e) => {
            const preset = e.target.value;
            if (preset === "none") {
                z.start_service = "";
                z.duration_field = "";
                z.duration_unit = "";
                z.start_entity_id = "";
            }
            else if (preset !== "custom") {
                const cfg = zoneStartPresets[preset];
                if (cfg) {
                    z.start_service = cfg.start_service;
                    z.duration_field = cfg.duration_field;
                    z.duration_unit = cfg.duration_unit;
                }
            }
            this.requestUpdate();
        }}
            >
              <option value="none">${t(this.hass, "config_panel.zones_start_preset_none")}</option>
              <option value="custom">${t(this.hass, "config_panel.zones_start_preset_custom")}</option>
              <option value="rainbird">Rain Bird</option>
              <option value="rachio">Rachio</option>
              <option value="hydrawise">Hydrawise</option>
              <option value="bhyve">B-hyve / Orbit</option>
              <option value="opensprinkler">OpenSprinkler</option>
            </select>
          </div>
          ${this._renderPresetHint(z)}
          <div class="field-row">
            ${i(this._presetForZone(z), b `<ha-input
                .label=${t(this.hass, "config_panel.zones_start_service")}
                .value=${z.start_service}
                @input=${(e) => {
            z.start_service = e.target.value;
            this.requestUpdate();
        }}
              ></ha-input>`)}
          </div>
          <div class="duration-row">
            ${i(this._presetForZone(z), b `<ha-input
                .label=${t(this.hass, "config_panel.zones_duration_field")}
                .value=${z.duration_field}
                @input=${(e) => {
            z.duration_field = e.target.value;
            this.requestUpdate();
        }}
              ></ha-input>`)}
            <select
              class="field-select"
              .value=${z.duration_unit || ""}
              @change=${(e) => {
            z.duration_unit = e.target.value;
            this.requestUpdate();
        }}
            >
              <option value="">${t(this.hass, "config_panel.zones_duration_unit_empty")}</option>
              <option value="minutes">${t(this.hass, "config_panel.zones_duration_unit_minutes")}</option>
              <option value="seconds">${t(this.hass, "config_panel.zones_duration_unit_seconds")}</option>
            </select>
          </div>
          <div class="field-row">
            ${renderNativeEntityField(this.hass, startTargetDomains, t(this.hass, "config_panel.zones_start_target_entity"), z.start_entity_id, (v) => {
            z.start_entity_id = v;
            this.requestUpdate();
        }, { allowCustom: true })}
          </div>
          <p class="hint">${t(this.hass, "config_panel.zones_advanced_target_desc")}</p>
        </details>
      </div>
    `;
    }
    _renderRow(z, slotsPerZone) {
        const outs = z.switch_entity_ids.filter(Boolean);
        const issue = this._zoneIssue(z);
        const runDisabled = this._busy || !z.enabled || outs.length === 0;
        const mode = this._mode();
        const slotN = slotsPerZone[z.zone_id] ?? 0;
        const accentClass = !z.enabled ? "inactive" : issue ? "warn" : "";
        const expanded = this._expanded.has(z.zone_id);
        const firstOut = outs[0] ?? "";
        const runBtn = b `
      <button
        type="button"
        class="iconbtn"
        title=${t(this.hass, "config_panel.zones_run_zone_now")}
        aria-label=${t(this.hass, "config_panel.zones_run_zone_now")}
        ?disabled=${runDisabled}
        @click=${() => this._runZoneNow(z.zone_id)}
      >
        <ha-icon icon="mdi:play"></ha-icon>
      </button>
    `;
        const editBtn = b `
      <button
        type="button"
        class="iconbtn"
        title=${t(this.hass, "config_panel.zones_edit")}
        aria-label=${t(this.hass, "config_panel.zones_edit")}
        @click=${() => {
            this._msg = undefined;
            this._editDraft = this._cloneZone(z);
        }}
      >
        <ha-icon icon="mdi:pencil"></ha-icon>
      </button>
    `;
        return b `
      <div class="compact-row ${accentClass}">
        <div class="compact-row-header">
          <ha-switch
            .disabled=${this._busy}
            .checked=${z.enabled}
            @change=${(e) => this._toggleZoneEnabled(z, Boolean(e.target.checked))}
          ></ha-switch>
          <div class="compact-row-main">
            <div class="compact-row-title">
              <span class="ellipsis">${z.name || z.zone_id.slice(0, 8)}</span>
              ${!z.enabled
            ? b `<span class="badge">${t(this.hass, "config_panel.zones_detail_disabled")}</span>`
            : A}
              ${z.exclusive
            ? b `<span class="badge badge-primary badge-dot">${t(this.hass, "config_panel.zones_detail_exclusive")}</span>`
            : A}
              ${issue
            ? b `<span class="preflight-badge would_skip"
                    ><ha-icon icon="mdi:alert-outline"></ha-icon>${t(this.hass, "config_panel.zones_issue_output_unavailable")}</span
                  >`
            : A}
            </div>
            <div class="meta-line">
              <span class="meta">
                <ha-icon icon="mdi:timer-outline"></ha-icon>
                ${["eco", "normal", "extra"].map((m, i) => {
            const val = m === "eco"
                ? z.duration_eco_min
                : m === "extra"
                    ? z.duration_extra_min
                    : z.duration_normal_min;
            const sep = i > 0 ? " / " : "";
            return mode === m
                ? b `${sep}<strong>${val}</strong>`
                : b `${sep}${val}`;
        })}
                ${" "}${t(this.hass, "config_panel.zones_min_suffix")}
              </span>
              ${slotN > 0
            ? b `<span class="meta"
                    ><ha-icon icon="mdi:format-list-bulleted"></ha-icon>${slotN === 1
                ? t(this.hass, "config_panel.zones_in_cycles_one")
                : t(this.hass, "config_panel.zones_in_cycles_many", { n: slotN })}</span
                  >`
            : A}
              ${firstOut
            ? b `<span class="meta ellipsis"
                    ><ha-icon icon="mdi:toggle-switch-outline"></ha-icon>${firstOut}</span
                  >`
            : A}
            </div>
          </div>
          <div class="icon-group hide-narrow" role="group">
            ${runBtn}${editBtn}
          </div>
          <button
            type="button"
            class="iconbtn only-narrow"
            aria-expanded=${expanded ? "true" : "false"}
            aria-label=${t(this.hass, "config_panel.zones_edit")}
            @click=${() => this._toggleExpand(z.zone_id)}
          >
            <ha-icon icon=${expanded ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>
          </button>
        </div>
        ${expanded
            ? b `<div class="compact-row-detail only-narrow">
              ${firstOut ? b `<p class="out-line">${outs.join(", ")}</p>` : A}
              <div class="drawer-actions">
                <button type="button" class="btn-outline" ?disabled=${runDisabled} @click=${() => this._runZoneNow(z.zone_id)}>
                  ${t(this.hass, "config_panel.zones_run_zone_now")}
                </button>
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
            </div>`
            : A}
      </div>
    `;
    }
    render() {
        const all = this._zonesFromInstallation();
        const issuesCount = all.filter((z) => this._zoneIssue(z)).length;
        const filtered = all.filter((z) => {
            if (this._filter === "enabled")
                return z.enabled;
            if (this._filter === "issues")
                return this._zoneIssue(z);
            return true;
        });
        const slotsPerZone = slotInclusionCountPerZone(this.installation ?? {});
        const edit = this._editDraft;
        return b `
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:vector-square"></ha-icon>
          ${t(this.hass, "config_panel.zones_card_title")}
          <div class="header-actions">
            <div class="segmented" role="group" aria-label=${t(this.hass, "config_panel.zones_filter_all")}>
              <button
                type="button"
                class=${this._filter === "all" ? "selected" : ""}
                @click=${() => (this._filter = "all")}
              >
                ${t(this.hass, "config_panel.zones_filter_all")}
              </button>
              <button
                type="button"
                class=${this._filter === "enabled" ? "selected" : ""}
                @click=${() => (this._filter = "enabled")}
              >
                ${t(this.hass, "config_panel.zones_filter_enabled")}
              </button>
              <button
                type="button"
                class=${this._filter === "issues" ? "selected" : ""}
                @click=${() => (this._filter = "issues")}
              >
                ${t(this.hass, "config_panel.zones_filter_issues")}
                ${issuesCount > 0 ? b `<span class="count">${issuesCount}</span>` : A}
              </button>
            </div>
            <button type="button" class="btn hide-narrow" @click=${() => (this._addDialogOpen = true)}>
              ${t(this.hass, "config_panel.zones_add_zone")}
            </button>
          </div>
        </div>
        <div class="card-content">
          ${this._msg ? b `<div class="error">${this._msg}</div>` : A}
          <details class="inline-help">
            <summary>
              <ha-icon class="inline-help-icon" icon="mdi:information-outline"></ha-icon>
              ${t(this.hass, "config_panel.zones_help_summary")}
            </summary>
            <p>${t(this.hass, "config_panel.zones_intro")}</p>
          </details>

          ${all.length === 0
            ? b `<div class="empty-state">
                <ha-icon icon="mdi:vector-square"></ha-icon>
                <p>${t(this.hass, "config_panel.zones_empty")}</p>
                <button type="button" class="btn" @click=${() => (this._addDialogOpen = true)}>
                  ${t(this.hass, "config_panel.zones_add_zone")}
                </button>
              </div>`
            : filtered.length === 0
                ? b `<div class="empty-state">
                  <ha-icon icon="mdi:filter-variant-remove"></ha-icon>
                  <p>${t(this.hass, "config_panel.zones_empty_filtered")}</p>
                  <button type="button" class="btn-outline" @click=${() => (this._filter = "all")}>
                    ${t(this.hass, "config_panel.zones_filter_all")}
                  </button>
                </div>`
                : filtered.map((z) => this._renderRow(z, slotsPerZone))}

          <details class="inline-help" style="margin-top:14px">
            <summary>
              <ha-icon class="inline-help-icon" icon="mdi:robot-outline"></ha-icon>
              ${t(this.hass, "config_panel.settings_automations_summary")}
            </summary>
            <p>${t(this.hass, "config_panel.zones_intro_automation")}</p>
          </details>
        </div>
      </ha-card>

      <button
        type="button"
        class="fab"
        aria-label=${t(this.hass, "config_panel.zones_add_zone")}
        title=${t(this.hass, "config_panel.zones_add_zone")}
        @click=${() => (this._addDialogOpen = true)}
      >
        <ha-icon icon="mdi:plus"></ha-icon>
      </button>

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
                class="btn"
                ?disabled=${this._busy || !this._canSaveZone(this._new)}
                @click=${() => this._saveZone("add", undefined, { ...this._new, zone_id: "" })}
              >
                ${this._busy ? t(this.hass, "config_panel.zones_adding") : t(this.hass, "config_panel.zones_add_zone_btn")}
              </button>
            </div>
          </div>
        </div>
      </ha-dialog>

      <ha-dialog
        .open=${edit !== null}
        header-title=${edit
            ? t(this.hass, "config_panel.zones_dialog_edit_title", { name: edit.name || edit.zone_id.slice(0, 8) })
            : ""}
        @closed=${() => this._closeEditDialog()}
      >
        ${edit ? this._renderZoneFields(edit) : A}
        <div slot="footer" class="dialog-footer">
          <div class="dialog-footer-row">
            <div class="dialog-footer-lead">
              ${edit
            ? b `<button
                    type="button"
                    class="btn-danger"
                    ?disabled=${this._busy}
                    @click=${() => {
                if (edit && confirm(t(this.hass, "config_panel.zones_confirm_delete"))) {
                    void this._saveZone("delete", edit.zone_id);
                }
            }}
                  >
                    ${t(this.hass, "config_panel.zones_delete_zone")}
                  </button>`
            : A}
            </div>
            <div class="dialog-footer-actions">
              <button type="button" class="btn-outline" @click=${() => this._closeEditDialog()} ?disabled=${this._busy}>
                ${t(this.hass, "config_panel.zones_cancel")}
              </button>
              <button
                type="button"
                class="btn"
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
__decorate([
    r()
], ViewZones.prototype, "_filter", void 0);
__decorate([
    r()
], ViewZones.prototype, "_expanded", void 0);
defineCustomElementOnce("si-view-zones", ViewZones);

const VERSION = "1.9.0";
const PANEL_PAGES = ["overview", "zones", "schedule", "timetable", "settings"];
/** Legacy path aliases so existing links / deep links keep working. */
const PAGE_ALIASES = {
    general: "overview",
    status: "settings",
};
const TAB_LABEL_KEYS = {
    overview: "config_panel.tab_overview",
    zones: "config_panel.tab_zones",
    schedule: "config_panel.tab_schedule",
    timetable: "config_panel.tab_timetable",
    settings: "config_panel.tab_settings",
};
const TAB_ICONS = {
    overview: "mdi:view-dashboard-outline",
    zones: "mdi:vector-square",
    schedule: "mdi:format-list-bulleted-type",
    timetable: "mdi:calendar-week",
    settings: "mdi:cog-outline",
};
function normalizePanelPage(raw) {
    const p = raw || "overview";
    if (PANEL_PAGES.includes(p))
        return p;
    return PAGE_ALIASES[p] ?? "overview";
}
class SimpleIrrigationPanel extends i$2 {
    constructor() {
        super(...arguments);
        this.narrow = false;
        this._state = null;
        this._loading = true;
        this._entries = [];
        this._entriesLoading = false;
        /** After first successful panel translation fetch (or no loader API). */
        this._initialPanelI18nDone = false;
        /** Serializes panel fetches so overlapping requests cannot clear `_state` out of order. */
        this._loadTail = Promise.resolve();
        this._onVisibility = () => {
            if (document.visibilityState !== "visible")
                return;
            if (!window.location.pathname.includes("simple-irrigation"))
                return;
            if (!this.hass)
                return;
            const { entryId } = getPath();
            if (!entryId)
                return;
            if (this._state) {
                void this._loadState(entryId, { silent: true });
            }
            else {
                void this._reloadPath();
            }
        };
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
        document.addEventListener("visibilitychange", this._onVisibility);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener("location-changed", this._locChanged);
        document.removeEventListener("visibilitychange", this._onVisibility);
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
            // Subscribe to state_changed events with efficient filtering
            // This is more efficient than the previous implementation that had 1-second polling
            this._runStateUnsub = await this.hass.connection.subscribeEvents((ev) => {
                // Only process events for the specific entity we're monitoring
                if (ev.data?.entity_id !== runningId)
                    return;
                // Trigger a silent refresh when the running state changes
                this._scheduleSilentRefresh(entryId);
            }, "state_changed");
        }
    }
    async _reloadPath() {
        const { entryId, page } = getPath();
        if (!entryId) {
            await this._teardownRunStateListeners();
            await this._loadEntryList();
            /* Another `_reloadPath` may have navigated to an entry while we awaited the list. */
            if (getPath().entryId) {
                this.requestUpdate();
                return;
            }
            const defaultEntry = this._entries.find((e) => e.is_default);
            if (defaultEntry) {
                navigate(this, exportPath(defaultEntry.entry_id, "overview"));
                this.requestUpdate();
                return;
            }
            this._loading = false;
            this._state = null;
            this.requestUpdate();
            return;
        }
        await this._loadState(entryId);
        // Redirect legacy/aliased/invalid page paths to their canonical page.
        // (Must not compare against a dead literal — that would loop forever.)
        const canonical = normalizePanelPage(page);
        if (page !== canonical) {
            navigate(this, exportPath(entryId, canonical));
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
                let is_default = false;
                try {
                    const st = await fetchPanelState(hass, e.entry_id);
                    const inst = st.installation;
                    plan_enabled = Boolean(inst.enabled ?? true);
                    is_default = Boolean(inst.is_default ?? false);
                }
                catch {
                    /* ignore; show as active */
                }
                return { ...e, plan_enabled, is_default };
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
    /** Enqueue a panel state fetch so concurrent calls cannot apply in the wrong order. */
    _loadState(entryId, opts) {
        const run = this._loadTail.then(() => this._executeLoadState(entryId, opts));
        this._loadTail = run.then(() => undefined, () => undefined);
        return run;
    }
    async _executeLoadState(entryId, opts) {
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
        if (!changed.has("hass") || !this.hass) {
            return;
        }
        const prev = changed.get("hass");
        if (prev === undefined) {
            void this._reloadPath();
            return;
        }
        if (prev.connection !== this.hass.connection) {
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
        navigate(this, exportPath(entryId, "overview"));
        /* `location-changed` runs `_reloadPath` → `_loadState`; avoid a second concurrent fetch. */
    }
    render() {
        if (!this.hass) {
            return b `<div class="view"><div class="view-inner">Loading…</div></div>`;
        }
        if (!this._initialPanelI18nDone) {
            return b `<div class="view"><div class="view-inner">Loading…</div></div>`;
        }
        const path = getPath();
        const page = normalizePanelPage(path.page);
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
                      ${e.is_default
                ? b `<span class="entry-badge entry-badge-default">${t(this.hass, "config_panel.entry_badge_default")}</span>`
                : A}
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
          <div class="main-title">
            ${String(inst.name || "").trim() || t(this.hass, "config_panel.main_title")}
          </div>
          <div class="version">v${VERSION}</div>
        </div>
        <ha-tab-group @wa-tab-show=${this._onTab}>
          ${PANEL_PAGES.map((p) => b `
              <ha-tab-group-tab slot="nav" panel=${p} .active=${page === p}>
                <ha-icon slot="prefix" icon=${TAB_ICONS[p]}></ha-icon>
                ${t(this.hass, TAB_LABEL_KEYS[p])}
              </ha-tab-group-tab>
            `)}
        </ha-tab-group>
      </div>
      <div class="view">
        <div class="view-inner">
          ${page === "overview"
            ? b `<si-view-overview
                .hass=${this.hass}
                .entryId=${path.entryId}
                .installation=${inst}
                .scheduleNext=${scheduleNext}
                .runState=${rs}
                .onSaved=${() => this._loadState(path.entryId, { silent: true })}
              ></si-view-overview>`
            : A}
          ${page === "zones"
            ? b `<si-view-zones
                .hass=${this.hass}
                .entryId=${path.entryId}
                .installation=${inst}
                .runState=${rs}
                .outputEntityDomains=${this._state?.output_entity_domains ?? ["switch", "input_boolean", "group", "valve"]}
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
          ${page === "timetable"
            ? b `<si-view-timetable
                .hass=${this.hass}
                .entryId=${path.entryId}
                .installation=${inst}
              ></si-view-timetable>`
            : A}
          ${page === "settings"
            ? b `<si-view-settings
                .hass=${this.hass}
                .entryId=${path.entryId}
                .installation=${inst}
                .runState=${rs}
                .outputEntityDomains=${this._state?.output_entity_domains ?? ["switch", "input_boolean", "group", "valve"]}
                .onSaved=${() => this._loadState(path.entryId, { silent: true })}
              ></si-view-settings>`
            : A}
        </div>
      </div>
    `;
    }
}
defineCustomElementOnce("simple-irrigation-panel", SimpleIrrigationPanel);

export { SimpleIrrigationPanel };
//# sourceMappingURL=simple-irrigation-panel.js.map
