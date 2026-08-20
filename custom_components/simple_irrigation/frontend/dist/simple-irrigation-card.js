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
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$3=globalThis,e$4=t$3.ShadowRoot&&(void 0===t$3.ShadyCSS||t$3.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s$3=Symbol(),o$6=new WeakMap;let n$5 = class n{constructor(t,e,o){if(this._$cssResult$=true,o!==s$3)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e;}get styleSheet(){let t=this.o;const s=this.t;if(e$4&&void 0===t){const e=void 0!==s&&1===s.length;e&&(t=o$6.get(s)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),e&&o$6.set(s,t));}return t}toString(){return this.cssText}};const r$6=t=>new n$5("string"==typeof t?t:t+"",void 0,s$3),i$5=(t,...e)=>{const o=1===t.length?t[0]:e.reduce((e,s,o)=>e+(t=>{if(true===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[o+1],t[0]);return new n$5(o,t,s$3)},S$1=(s,o)=>{if(e$4)s.adoptedStyleSheets=o.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const e of o){const o=document.createElement("style"),n=t$3.litNonce;void 0!==n&&o.setAttribute("nonce",n),o.textContent=e.cssText,s.appendChild(o);}},c$3=e$4?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return r$6(e)})(t):t;

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:i$4,defineProperty:e$3,getOwnPropertyDescriptor:h$2,getOwnPropertyNames:r$5,getOwnPropertySymbols:o$5,getPrototypeOf:n$4}=Object,a$1=globalThis,c$2=a$1.trustedTypes,l$1=c$2?c$2.emptyScript:"",p$1=a$1.reactiveElementPolyfillSupport,d$1=(t,s)=>t,u$1={toAttribute(t,s){switch(s){case Boolean:t=t?l$1:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t);}return t},fromAttribute(t,s){let i=t;switch(s){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t);}catch(t){i=null;}}return i}},f$2=(t,s)=>!i$4(t,s),b$1={attribute:true,type:String,converter:u$1,reflect:false,useDefault:false,hasChanged:f$2};Symbol.metadata??=Symbol("metadata"),a$1.litPropertyMetadata??=new WeakMap;let y$1 = class y extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t);}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,s=b$1){if(s.state&&(s.attribute=false),this._$Ei(),this.prototype.hasOwnProperty(t)&&((s=Object.create(s)).wrapped=true),this.elementProperties.set(t,s),!s.noAccessor){const i=Symbol(),h=this.getPropertyDescriptor(t,i,s);void 0!==h&&e$3(this.prototype,t,h);}}static getPropertyDescriptor(t,s,i){const{get:e,set:r}=h$2(this.prototype,t)??{get(){return this[s]},set(t){this[s]=t;}};return {get:e,set(s){const h=e?.call(this);r?.call(this,s),this.requestUpdate(t,h,i);},configurable:true,enumerable:true}}static getPropertyOptions(t){return this.elementProperties.get(t)??b$1}static _$Ei(){if(this.hasOwnProperty(d$1("elementProperties")))return;const t=n$4(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties);}static finalize(){if(this.hasOwnProperty(d$1("finalized")))return;if(this.finalized=true,this._$Ei(),this.hasOwnProperty(d$1("properties"))){const t=this.properties,s=[...r$5(t),...o$5(t)];for(const i of s)this.createProperty(i,t[i]);}const t=this[Symbol.metadata];if(null!==t){const s=litPropertyMetadata.get(t);if(void 0!==s)for(const[t,i]of s)this.elementProperties.set(t,i);}this._$Eh=new Map;for(const[t,s]of this.elementProperties){const i=this._$Eu(t,s);void 0!==i&&this._$Eh.set(i,t);}this.elementStyles=this.finalizeStyles(this.styles);}static finalizeStyles(s){const i=[];if(Array.isArray(s)){const e=new Set(s.flat(1/0).reverse());for(const s of e)i.unshift(c$3(s));}else void 0!==s&&i.push(c$3(s));return i}static _$Eu(t,s){const i=s.attribute;return  false===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=false,this.hasUpdated=false,this._$Em=null,this._$Ev();}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this));}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.();}removeController(t){this._$EO?.delete(t);}_$E_(){const t=new Map,s=this.constructor.elementProperties;for(const i of s.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t);}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return S$1(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(true),this._$EO?.forEach(t=>t.hostConnected?.());}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.());}attributeChangedCallback(t,s,i){this._$AK(t,i);}_$ET(t,s){const i=this.constructor.elementProperties.get(t),e=this.constructor._$Eu(t,i);if(void 0!==e&&true===i.reflect){const h=(void 0!==i.converter?.toAttribute?i.converter:u$1).toAttribute(s,i.type);this._$Em=t,null==h?this.removeAttribute(e):this.setAttribute(e,h),this._$Em=null;}}_$AK(t,s){const i=this.constructor,e=i._$Eh.get(t);if(void 0!==e&&this._$Em!==e){const t=i.getPropertyOptions(e),h="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:u$1;this._$Em=e;const r=h.fromAttribute(s,t.type);this[e]=r??this._$Ej?.get(e)??r,this._$Em=null;}}requestUpdate(t,s,i,e=false,h){if(void 0!==t){const r=this.constructor;if(false===e&&(h=this[t]),i??=r.getPropertyOptions(t),!((i.hasChanged??f$2)(h,s)||i.useDefault&&i.reflect&&h===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,i))))return;this.C(t,s,i);} false===this.isUpdatePending&&(this._$ES=this._$EP());}C(t,s,{useDefault:i,reflect:e,wrapped:h},r){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??s??this[t]),true!==h||void 0!==r)||(this._$AL.has(t)||(this.hasUpdated||i||(s=void 0),this._$AL.set(t,s)),true===e&&this._$Em!==t&&(this._$Eq??=new Set).add(t));}async _$EP(){this.isUpdatePending=true;try{await this._$ES;}catch(t){Promise.reject(t);}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,s]of this._$Ep)this[t]=s;this._$Ep=void 0;}const t=this.constructor.elementProperties;if(t.size>0)for(const[s,i]of t){const{wrapped:t}=i,e=this[s];true!==t||this._$AL.has(s)||void 0===e||this.C(s,void 0,i,e);}}let t=false;const s=this._$AL;try{t=this.shouldUpdate(s),t?(this.willUpdate(s),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(s)):this._$EM();}catch(s){throw t=false,this._$EM(),s}t&&this._$AE(s);}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=true,this.firstUpdated(t)),this.updated(t);}_$EM(){this._$AL=new Map,this.isUpdatePending=false;}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return  true}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM();}updated(t){}firstUpdated(t){}};y$1.elementStyles=[],y$1.shadowRootOptions={mode:"open"},y$1[d$1("elementProperties")]=new Map,y$1[d$1("finalized")]=new Map,p$1?.({ReactiveElement:y$1}),(a$1.reactiveElementVersions??=[]).push("2.1.2");

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$2=globalThis,i$3=t=>t,s$2=t$2.trustedTypes,e$2=s$2?s$2.createPolicy("lit-html",{createHTML:t=>t}):void 0,h$1="$lit$",o$4=`lit$${Math.random().toFixed(9).slice(2)}$`,n$3="?"+o$4,r$4=`<${n$3}>`,l=document,c$1=()=>l.createComment(""),a=t=>null===t||"object"!=typeof t&&"function"!=typeof t,u=Array.isArray,d=t=>u(t)||"function"==typeof t?.[Symbol.iterator],f$1="[ \t\n\f\r]",v=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,_=/-->/g,m=/>/g,p=RegExp(`>|${f$1}(?:([^\\s"'>=/]+)(${f$1}*=${f$1}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),g=/'/g,$=/"/g,y=/^(?:script|style|textarea|title)$/i,x=t=>(i,...s)=>({_$litType$:t,strings:i,values:s}),b=x(1),E=Symbol.for("lit-noChange"),A=Symbol.for("lit-nothing"),C=new WeakMap,P=l.createTreeWalker(l,129);function V(t,i){if(!u(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==e$2?e$2.createHTML(i):i}const N=(t,i)=>{const s=t.length-1,e=[];let n,l=2===i?"<svg>":3===i?"<math>":"",c=v;for(let i=0;i<s;i++){const s=t[i];let a,u,d=-1,f=0;for(;f<s.length&&(c.lastIndex=f,u=c.exec(s),null!==u);)f=c.lastIndex,c===v?"!--"===u[1]?c=_:void 0!==u[1]?c=m:void 0!==u[2]?(y.test(u[2])&&(n=RegExp("</"+u[2],"g")),c=p):void 0!==u[3]&&(c=p):c===p?">"===u[0]?(c=n??v,d=-1):void 0===u[1]?d=-2:(d=c.lastIndex-u[2].length,a=u[1],c=void 0===u[3]?p:'"'===u[3]?$:g):c===$||c===g?c=p:c===_||c===m?c=v:(c=p,n=void 0);const x=c===p&&t[i+1].startsWith("/>")?" ":"";l+=c===v?s+r$4:d>=0?(e.push(a),s.slice(0,d)+h$1+s.slice(d)+o$4+x):s+o$4+(-2===d?i:x);}return [V(t,l+(t[s]||"<?>")+(2===i?"</svg>":3===i?"</math>":"")),e]};class S{constructor({strings:t,_$litType$:i},e){let r;this.parts=[];let l=0,a=0;const u=t.length-1,d=this.parts,[f,v]=N(t,i);if(this.el=S.createElement(f,e),P.currentNode=this.el.content,2===i||3===i){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes);}for(;null!==(r=P.nextNode())&&d.length<u;){if(1===r.nodeType){if(r.hasAttributes())for(const t of r.getAttributeNames())if(t.endsWith(h$1)){const i=v[a++],s=r.getAttribute(t).split(o$4),e=/([.?@])?(.*)/.exec(i);d.push({type:1,index:l,name:e[2],strings:s,ctor:"."===e[1]?I:"?"===e[1]?L:"@"===e[1]?z:H}),r.removeAttribute(t);}else t.startsWith(o$4)&&(d.push({type:6,index:l}),r.removeAttribute(t));if(y.test(r.tagName)){const t=r.textContent.split(o$4),i=t.length-1;if(i>0){r.textContent=s$2?s$2.emptyScript:"";for(let s=0;s<i;s++)r.append(t[s],c$1()),P.nextNode(),d.push({type:2,index:++l});r.append(t[i],c$1());}}}else if(8===r.nodeType)if(r.data===n$3)d.push({type:2,index:l});else {let t=-1;for(;-1!==(t=r.data.indexOf(o$4,t+1));)d.push({type:7,index:l}),t+=o$4.length-1;}l++;}}static createElement(t,i){const s=l.createElement("template");return s.innerHTML=t,s}}function M(t,i,s=t,e){if(i===E)return i;let h=void 0!==e?s._$Co?.[e]:s._$Cl;const o=a(i)?void 0:i._$litDirective$;return h?.constructor!==o&&(h?._$AO?.(false),void 0===o?h=void 0:(h=new o(t),h._$AT(t,s,e)),void 0!==e?(s._$Co??=[])[e]=h:s._$Cl=h),void 0!==h&&(i=M(t,h._$AS(t,i.values),h,e)),i}class R{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i;}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:s}=this._$AD,e=(t?.creationScope??l).importNode(i,true);P.currentNode=e;let h=P.nextNode(),o=0,n=0,r=s[0];for(;void 0!==r;){if(o===r.index){let i;2===r.type?i=new k(h,h.nextSibling,this,t):1===r.type?i=new r.ctor(h,r.name,r.strings,this,t):6===r.type&&(i=new Z(h,this,t)),this._$AV.push(i),r=s[++n];}o!==r?.index&&(h=P.nextNode(),o++);}return P.currentNode=l,e}p(t){let i=0;for(const s of this._$AV) void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,i),i+=s.strings.length-2):s._$AI(t[i])),i++;}}class k{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,i,s,e){this.type=2,this._$AH=A,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=s,this.options=e,this._$Cv=e?.isConnected??true;}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return void 0!==i&&11===t?.nodeType&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=M(this,t,i),a(t)?t===A||null==t||""===t?(this._$AH!==A&&this._$AR(),this._$AH=A):t!==this._$AH&&t!==E&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):d(t)?this.k(t):this._(t);}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t));}_(t){this._$AH!==A&&a(this._$AH)?this._$AA.nextSibling.data=t:this.T(l.createTextNode(t)),this._$AH=t;}$(t){const{values:i,_$litType$:s}=t,e="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=S.createElement(V(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===e)this._$AH.p(i);else {const t=new R(e,this),s=t.u(this.options);t.p(i),this.T(s),this._$AH=t;}}_$AC(t){let i=C.get(t.strings);return void 0===i&&C.set(t.strings,i=new S(t)),i}k(t){u(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let s,e=0;for(const h of t)e===i.length?i.push(s=new k(this.O(c$1()),this.O(c$1()),this,this.options)):s=i[e],s._$AI(h),e++;e<i.length&&(this._$AR(s&&s._$AB.nextSibling,e),i.length=e);}_$AR(t=this._$AA.nextSibling,s){for(this._$AP?.(false,true,s);t!==this._$AB;){const s=i$3(t).nextSibling;i$3(t).remove(),t=s;}}setConnected(t){ void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t));}}class H{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,s,e,h){this.type=1,this._$AH=A,this._$AN=void 0,this.element=t,this.name=i,this._$AM=e,this.options=h,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=A;}_$AI(t,i=this,s,e){const h=this.strings;let o=false;if(void 0===h)t=M(this,t,i,0),o=!a(t)||t!==this._$AH&&t!==E,o&&(this._$AH=t);else {const e=t;let n,r;for(t=h[0],n=0;n<h.length-1;n++)r=M(this,e[s+n],i,n),r===E&&(r=this._$AH[n]),o||=!a(r)||r!==this._$AH[n],r===A?t=A:t!==A&&(t+=(r??"")+h[n+1]),this._$AH[n]=r;}o&&!e&&this.j(t);}j(t){t===A?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"");}}class I extends H{constructor(){super(...arguments),this.type=3;}j(t){this.element[this.name]=t===A?void 0:t;}}class L extends H{constructor(){super(...arguments),this.type=4;}j(t){this.element.toggleAttribute(this.name,!!t&&t!==A);}}class z extends H{constructor(t,i,s,e,h){super(t,i,s,e,h),this.type=5;}_$AI(t,i=this){if((t=M(this,t,i,0)??A)===E)return;const s=this._$AH,e=t===A&&s!==A||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,h=t!==A&&(s===A||e);e&&this.element.removeEventListener(this.name,this,s),h&&this.element.addEventListener(this.name,this,t),this._$AH=t;}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t);}}class Z{constructor(t,i,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=s;}get _$AU(){return this._$AM._$AU}_$AI(t){M(this,t);}}const B=t$2.litHtmlPolyfillSupport;B?.(S,k),(t$2.litHtmlVersions??=[]).push("3.3.2");const D$1=(t,i,s)=>{const e=s?.renderBefore??i;let h=e._$litPart$;if(void 0===h){const t=s?.renderBefore??null;e._$litPart$=h=new k(i.insertBefore(c$1(),t),t,void 0,s??{});}return h._$AI(t),h};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const s$1=globalThis;let i$2 = class i extends y$1{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0;}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const r=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=D$1(r,this.renderRoot,this.renderOptions);}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(true);}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(false);}render(){return E}};i$2._$litElement$=true,i$2["finalized"]=true,s$1.litElementHydrateSupport?.({LitElement:i$2});const o$3=s$1.litElementPolyfillSupport;o$3?.({LitElement:i$2});(s$1.litElementVersions??=[]).push("4.2.2");

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$1=t=>(e,o)=>{ void 0!==o?o.addInitializer(()=>{customElements.define(t,e);}):customElements.define(t,e);};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const o$2={attribute:true,type:String,converter:u$1,reflect:false,hasChanged:f$2},r$3=(t=o$2,e,r)=>{const{kind:n,metadata:i}=r;let s=globalThis.litPropertyMetadata.get(i);if(void 0===s&&globalThis.litPropertyMetadata.set(i,s=new Map),"setter"===n&&((t=Object.create(t)).wrapped=true),s.set(r.name,t),"accessor"===n){const{name:o}=r;return {set(r){const n=e.get.call(this);e.set.call(this,r),this.requestUpdate(o,n,t,true,r);},init(e){return void 0!==e&&this.C(o,void 0,t,e),e}}}if("setter"===n){const{name:o}=r;return function(r){const n=this[o];e.call(this,r),this.requestUpdate(o,n,t,true,r);}}throw Error("Unsupported decorator location: "+n)};function n$2(t){return (e,o)=>"object"==typeof o?r$3(t,e,o):((t,e,o)=>{const r=e.hasOwnProperty(o);return e.constructor.createProperty(o,t),r?Object.getOwnPropertyDescriptor(e,o):void 0})(t,e,o)}

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function r$2(r){return n$2({...r,state:true,attribute:false})}

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t={ATTRIBUTE:1,CHILD:2,ELEMENT:6},e$1=t=>(...e)=>({_$litDirective$:t,values:e});let i$1 = class i{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i;}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}};

/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const e=e$1(class extends i$1{constructor(t$1){if(super(t$1),t$1.type!==t.ATTRIBUTE||"class"!==t$1.name||t$1.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(t){return " "+Object.keys(t).filter(s=>t[s]).join(" ")+" "}update(s,[i]){if(void 0===this.st){this.st=new Set,void 0!==s.strings&&(this.nt=new Set(s.strings.join(" ").split(/\s/).filter(t=>""!==t)));for(const t in i)i[t]&&!this.nt?.has(t)&&this.st.add(t);return this.render(i)}const r=s.element.classList;for(const t of this.st)t in i||(r.remove(t),this.st.delete(t));for(const t in i){const s=!!i[t];s===this.st.has(t)||this.nt?.has(t)||(s?(r.add(t),this.st.add(t)):(r.remove(t),this.st.delete(t)));}return E}});

/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const n$1="important",i=" !"+n$1,o$1=e$1(class extends i$1{constructor(t$1){if(super(t$1),t$1.type!==t.ATTRIBUTE||"style"!==t$1.name||t$1.strings?.length>2)throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.")}render(t){return Object.keys(t).reduce((e,r)=>{const s=t[r];return null==s?e:e+`${r=r.includes("-")?r:r.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g,"-$&").toLowerCase()}:${s};`},"")}update(e,[r]){const{style:s}=e.element;if(void 0===this.ft)return this.ft=new Set(Object.keys(r)),this.render(r);for(const t of this.ft)null==r[t]&&(this.ft.delete(t),t.includes("-")?s.removeProperty(t):s[t]=null);for(const t in r){const e=r[t];if(null!=e){this.ft.add(t);const r="string"==typeof e&&e.endsWith(i);t.includes("-")||r?s.setProperty(t,r?e.slice(0,-11):e,r?n$1:""):s[t]=e;}}return E}});

/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const r$1=o=>void 0===o.strings;

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const s=(i,t)=>{const e=i._$AN;if(void 0===e)return  false;for(const i of e)i._$AO?.(t,false),s(i,t);return  true},o=i=>{let t,e;do{if(void 0===(t=i._$AM))break;e=t._$AN,e.delete(i),i=t;}while(0===e?.size)},r=i=>{for(let t;t=i._$AM;i=t){let e=t._$AN;if(void 0===e)t._$AN=e=new Set;else if(e.has(i))break;e.add(i),c(t);}};function h(i){ void 0!==this._$AN?(o(this),this._$AM=i,r(this)):this._$AM=i;}function n(i,t=false,e=0){const r=this._$AH,h=this._$AN;if(void 0!==h&&0!==h.size)if(t)if(Array.isArray(r))for(let i=e;i<r.length;i++)s(r[i],false),o(r[i]);else null!=r&&(s(r,false),o(r));else s(this,i);}const c=i=>{i.type==t.CHILD&&(i._$AP??=n,i._$AQ??=h);};class f extends i$1{constructor(){super(...arguments),this._$AN=void 0;}_$AT(i,t,e){super._$AT(i,t,e),r(this),this.isConnected=i._$AU;}_$AO(i,t=true){i!==this.isConnected&&(this.isConnected=i,i?this.reconnected?.():this.disconnected?.()),t&&(s(this,i),o(this));}setValue(t){if(r$1(this._$Ct))this._$Ct._$AI(t,this);else {const i=[...this._$Ct._$AH];i[this._$Ci]=t,this._$Ct._$AI(i,this,0);}}disconnected(){}reconnected(){}}

function fireEvent(node, type, detail) {
    node.dispatchEvent(new CustomEvent(type, {
        bubbles: true,
        composed: true,
        detail: detail ?? {},
    }));
}

const ACTION_TYPES = [
    "none",
    "more-info",
    "panel",
    "navigate",
    "url",
    "perform-action",
];
const PANEL_PAGES = [
    "overview",
    "zones",
    "schedule",
    "timetable",
    "settings",
];
const PANEL_BASE = "/simple-irrigation";
const isActionable = (action) => Boolean(action) && action.action !== "none";
const navigate = (path) => {
    history.pushState(null, "", path);
    fireEvent(window, "location-changed", { replace: false });
};
const openMoreInfo = (node, entityId) => {
    if (!entityId)
        return;
    fireEvent(node, "hass-more-info", { entityId });
};
const openPanel = (node, hass, action, context) => {
    // The panel is registered with `require_admin`, the card is not: sending a
    // non-admin there lands on a blank "not found" page, so fall back to the
    // thing they *can* open.
    if (hass?.user?.is_admin === false) {
        openMoreInfo(node, action.entity ?? context.entityId);
        return;
    }
    const entryId = context.entryId;
    if (!entryId)
        return;
    const page = action.panel_page ?? context.page ?? "overview";
    const query = page === "schedule" && context.slotId
        ? `?editSlot=${encodeURIComponent(context.slotId)}`
        : "";
    navigate(`${PANEL_BASE}/${entryId}/${page}${query}`);
};
function handleAction(node, hass, action, context) {
    if (!isActionable(action))
        return;
    const config = action;
    switch (config.action) {
        case "more-info":
            openMoreInfo(node, config.entity ?? context.entityId);
            return;
        case "panel":
            openPanel(node, hass, config, context);
            return;
        case "navigate":
            if (config.navigation_path)
                navigate(config.navigation_path);
            return;
        case "url":
            if (config.url_path) {
                window.open(config.url_path, config.url_path.startsWith("/") ? "_self" : "_blank");
            }
            return;
        case "perform-action": {
            const service = config.perform_action ?? config.service;
            const separator = service?.indexOf(".") ?? -1;
            if (!service || separator < 1 || !hass)
                return;
            const domain = service.slice(0, separator);
            const name = service.slice(separator + 1);
            void hass.callService(domain, name, config.data ?? {}, config.target);
            return;
        }
    }
}
/**
 * Throw on a config a user could not otherwise debug — Lovelace shows the
 * message on the card itself.
 */
function validateAction(key, value) {
    if (value === undefined)
        return;
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`${key} must be an action object`);
    }
    const action = value;
    if (!ACTION_TYPES.includes(action.action)) {
        throw new Error(`${key}.action must be one of ${ACTION_TYPES.join(", ")}`);
    }
    if (action.panel_page !== undefined &&
        !PANEL_PAGES.includes(action.panel_page)) {
        throw new Error(`${key}.panel_page must be one of ${PANEL_PAGES.join(", ")}`);
    }
    if (action.data !== undefined && typeof action.data !== "object") {
        throw new Error(`${key}.data must be a mapping`);
    }
    // A missing path or service is not a config error: the visual editor writes
    // the action type first and the field a keystroke later, and a card that
    // throws in between is worse than one that does nothing until it is filled in.
}
// ---- tap / hold handling ---------------------------------------------------
/** Long enough not to fire on a slow tap, short enough to feel deliberate. */
const HOLD_MS = 500;
/**
 * `actionHandler` as an element directive, rather than Home Assistant's own —
 * a custom card cannot import from the frontend bundle.
 */
class ActionHandlerDirective extends f {
    constructor(partInfo) {
        super(partInfo);
        this._options = {
            hasHold: false,
            disabled: true,
            handler: () => undefined,
        };
        this._held = false;
        this._onDown = () => {
            this._held = false;
            this._clearTimer();
            if (this._options.disabled || !this._options.hasHold)
                return;
            this._timer = window.setTimeout(() => {
                this._timer = undefined;
                this._held = true;
                // Same confirmation HA gives a long press elsewhere; silently ignored
                // where the browser has no vibration motor.
                navigator.vibrate?.(20);
                this._options.handler("hold");
            }, HOLD_MS);
        };
        this._onCancel = () => {
            this._clearTimer();
        };
        this._onClick = (ev) => {
            this._clearTimer();
            if (this._options.disabled)
                return;
            // Nested targets: a week bar sits inside its own tappable day column.
            ev.stopPropagation();
            if (this._held) {
                // The hold already ran; the click that follows it is not a second tap.
                this._held = false;
                ev.preventDefault();
                return;
            }
            this._options.handler("tap");
        };
        this._onKeyDown = (ev) => {
            // A real <button> turns Enter/Space into a click by itself; only the
            // role="button" rows need this.
            if (this._element?.tagName === "BUTTON")
                return;
            if (this._options.disabled)
                return;
            if (ev.key !== "Enter" && ev.key !== " ")
                return;
            ev.preventDefault();
            ev.stopPropagation();
            this._options.handler("tap");
        };
        this._onContextMenu = (ev) => {
            // Long press on touch would otherwise open the browser's own menu.
            if (this._options.disabled || !this._options.hasHold)
                return;
            ev.preventDefault();
        };
        if (partInfo.type !== t.ELEMENT) {
            throw new Error("actionHandler must be used on an element");
        }
    }
    render(_options) {
        return A;
    }
    update(part, [options]) {
        this._options = options;
        const element = part.element;
        if (this._element !== element) {
            this._detach();
            this._element = element;
            this._attach();
        }
        return A;
    }
    disconnected() {
        this._detach();
    }
    reconnected() {
        this._attach();
    }
    _attach() {
        const element = this._element;
        if (!element)
            return;
        element.addEventListener("pointerdown", this._onDown);
        element.addEventListener("pointerup", this._onCancel);
        element.addEventListener("pointercancel", this._onCancel);
        element.addEventListener("pointerleave", this._onCancel);
        element.addEventListener("click", this._onClick);
        element.addEventListener("keydown", this._onKeyDown);
        element.addEventListener("contextmenu", this._onContextMenu);
    }
    _detach() {
        const element = this._element;
        this._clearTimer();
        if (!element)
            return;
        element.removeEventListener("pointerdown", this._onDown);
        element.removeEventListener("pointerup", this._onCancel);
        element.removeEventListener("pointercancel", this._onCancel);
        element.removeEventListener("pointerleave", this._onCancel);
        element.removeEventListener("click", this._onClick);
        element.removeEventListener("keydown", this._onKeyDown);
        element.removeEventListener("contextmenu", this._onContextMenu);
    }
    _clearTimer() {
        if (this._timer !== undefined) {
            clearTimeout(this._timer);
            this._timer = undefined;
        }
    }
}
const actionHandler = e$1(ActionHandlerDirective);

const D = "simple_irrigation";
function withEntry(msg, entryId) {
    return entryId ? { ...msg, entry_id: entryId } : msg;
}
const listEntries = (hass) => hass.callWS({ type: `${D}/card/entries` });
const subscribeSnapshot = (hass, callback, entryId) => hass.connection.subscribeMessage(callback, withEntry({ type: `${D}/card/subscribe` }, entryId));
const action = (hass, entryId, payload) => hass.callWS(withEntry({ type: `${D}/card/action`, ...payload }, entryId));
const runNext = (hass, entryId) => action(hass, entryId, { action: "run_next" });
const runSlot = (hass, slotId, applyConditions, entryId) => action(hass, entryId, {
    action: "run_slot",
    slot_id: slotId,
    apply_conditions: applyConditions,
});
const runZones = (hass, zoneIds, durationMin, entryId) => action(hass, entryId, {
    action: "run_zones",
    zone_ids: zoneIds,
    ...(durationMin ? { duration_min: durationMin } : {}),
});
const stopAll = (hass, entryId) => action(hass, entryId, { action: "stop" });
const skipToday = (hass, entryId) => action(hass, entryId, { action: "skip_today" });
const pauseHours = (hass, hours, entryId) => action(hass, entryId, { action: "pause", hours });
const pauseUntil = (hass, until, entryId) => action(hass, entryId, { action: "pause", until });
const clearPause = (hass, entryId) => action(hass, entryId, { action: "clear_pause" });
const clearError = (hass, entryId) => action(hass, entryId, { action: "clear_error" });
const setMode = (hass, mode, entryId) => action(hass, entryId, { action: "set_mode", mode });

/**
 * Card strings are bundled rather than read from the integration's backend
 * translations: a Lovelace card is loaded on dashboards where
 * `component.simple_irrigation.*` may not be in the frontend's translation set,
 * and a card that silently falls back to raw keys is worse than a slightly
 * larger bundle.
 */
const TRANSLATIONS = {
    en: {
        // states
        state_idle: "Idle",
        state_preparing: "Preparing",
        state_running: "Watering",
        state_stopping: "Stopping",
        state_paused: "Paused",
        state_error: "Error",
        // status view
        next_run: "Next run",
        no_next_run: "No run scheduled",
        no_next_run_hint: "Add a schedule slot in the Simple Irrigation panel.",
        remaining: "{zone} · remaining",
        zones_count: "{count} zones",
        zones_count_one: "1 zone",
        queued: "queued",
        phase_of: "Phase {index} of {total}",
        ends_at: "ends {time}",
        watering_mode: "Watering mode",
        mode_short: "Mode",
        mode_eco: "Eco",
        mode_normal: "Normal",
        mode_extra: "Extra",
        // actions
        action_run_next: "Run next slot",
        action_stop: "Stop",
        action_skip_today: "Skip today",
        action_pause_48h: "Pause 48 h",
        action_pause_until: "Pause until…",
        resume_schedule: "Resume schedule",
        clear_error: "Clear error",
        // edge states
        waiting_for_script: "Waiting for the pre-start script",
        paused_until: "Automatic runs paused until {time}",
        paused_manual_note: "Manual runs are unaffected.",
        last_run_failed: "Last run stopped early",
        disabled_title: "Schedule disabled",
        disabled_note: "This installation is switched off; nothing will run.",
        // zones view
        zones_title: "Zones",
        issues_count: "{count} issues",
        issues_count_one: "1 issue",
        zone_watering: "Watering · {time} left",
        zone_next: "Next {time}",
        zone_disabled: "Disabled",
        zone_no_next: "Not scheduled",
        zone_issue_unavailable: "Output unavailable · {entity}",
        zone_issue_missing: "Output missing · {entity}",
        zone_issue_no_output: "No output configured",
        zones_footnote: "Runtimes for the active mode ({mode}).",
        zones_empty: "No zones configured yet.",
        // schedule view
        schedule_title: "Next runs",
        slots_of: "{shown} of {total} slots",
        schedule_footnote: "Conditions are checked at start time — a rain sensor can still skip any of these.",
        schedule_empty: "Nothing scheduled.",
        skipped_by_pause: "skipped — paused",
        // week view
        week_title: "This week",
        week_summary: "{runs} runs · {time}",
        week_summary_one: "1 run · {time}",
        legend_run: "scheduled run · height = duration",
        legend_parity_odd: "odd weeks only",
        legend_parity_even: "even weeks only",
        legend_scale: "top of column = 00:00, bottom = 24:00",
        week_paused: "paused",
        week_empty: "No schedule slots yet.",
        // run view
        run_title: "Run now",
        run_subtitle: "Pick zones or a schedule slot",
        run_tab_zones: "Zones",
        run_tab_slot: "Slot",
        run_zones_label: "Zones · {count} selected",
        run_zones_none: "Zones",
        run_slot_label: "Schedule slot",
        duration: "Duration",
        duration_configured: "As configured",
        duration_minutes: "{n} min",
        duration_custom: "Custom…",
        duration_custom_prompt: "Run each zone for how many minutes?",
        runs_in_sequence: "Runs in sequence · {parts}",
        start_zones: "Start {count} zones · ~{time}",
        start_zones_one: "Start 1 zone · ~{time}",
        start_zones_none: "Start",
        start_slot: "Start slot · ~{time}",
        apply_conditions: "Apply the slot conditions",
        apply_conditions_on: "On: the slot is skipped if a condition fails",
        apply_conditions_off: "Off: the slot runs even if the rain sensor would skip it",
        manual_run_started: "Manual run started",
        run_progress: "{zone} · {time} left · {index} of {total}",
        select_zones_first: "Select at least one zone.",
        no_slots: "No schedule slots to run.",
        // compact
        compact_idle: "{state} · next {time} · ~{duration}",
        compact_idle_no_run: "{state} · nothing scheduled",
        compact_running: "{zone} · {time} left · {index} of {total}",
        compact_paused: "Paused until {time}",
        // badges
        badge_next: "Next {time}",
        badge_paused: "Paused until {time}",
        badge_issues: "{count} zone issues",
        badge_issues_one: "1 zone issue",
        // shared
        unit_hour_short: "h",
        unit_minute_short: "min",
        in_time: "in {time}",
        today: "Today",
        tomorrow: "Tomorrow",
        approx_minutes: "~{n} min",
        // cadence
        cadence_daily: "Daily",
        cadence_twice_daily: "Twice daily",
        cadence_every_n_days: "Every {n} days",
        cadence_every_2_days: "Every 2 days",
        cadence_weekly: "Weekly",
        cadence_biweekly: "Every 2 weeks",
        cadence_n_per_week: "{n}× per week",
        parity_odd: "odd weeks",
        parity_even: "even weeks",
        // errors / empty
        loading: "Loading…",
        no_installation: "No Simple Irrigation installation found. Add the integration first.",
        pick_installation: "Several installations found — pick one in the card settings.",
        action_failed: "Action failed: {error}",
        // editor
        editor_installation: "Installation",
        editor_installation_auto: "Automatic",
        editor_view: "View",
        editor_view_status: "Status",
        editor_view_zones: "Zones",
        editor_view_schedule: "Schedule",
        editor_view_week: "Week",
        editor_view_run: "Manual run",
        editor_compact: "Compact layout",
        editor_compact_help: "One tile-style row instead of the full card.",
        editor_show_mode: "Watering mode selector",
        editor_manual_start: "Manual run picker",
        editor_manual_start_help: "Adds a collapsible “Run now” section below the card.",
        editor_manual_start_mode: "Manual run offers",
        editor_manual_zones: "Zones",
        editor_manual_slot: "Schedule slot",
        editor_manual_both: "Both",
        editor_manual_duration: "Allow duration override",
        editor_actions: "Actions",
        editor_next_runs: "Runs to show",
        editor_next_runs_help: "Schedule view only.",
        editor_zones: "Zones to list",
        editor_zones_all: "All",
        editor_zones_active: "Active only",
        editor_zones_custom: "Pick zones",
        editor_interactions: "Interactions",
        editor_interactions_help: "What a tap or a long press on the card's rows does.",
        editor_actions_card: "Header and compact row",
        editor_actions_zone: "Zone rows",
        editor_actions_run: "Schedule rows and week bars",
        editor_tap_action: "Tap",
        editor_hold_action: "Long press",
        editor_action_none: "Nothing",
        editor_action_more_info: "Open the entity",
        editor_action_panel: "Open the Simple Irrigation panel",
        editor_action_navigate: "Go to a dashboard",
        editor_action_url: "Open a URL",
        editor_action_perform_action: "Perform an action",
        editor_panel_page_auto: "Matching page",
        editor_page_overview: "Overview",
        editor_page_zones: "Zones",
        editor_page_schedule: "Schedule",
        editor_page_timetable: "Timetable",
        editor_page_settings: "Settings",
        editor_panel_admin_help: "Admins only — everyone else opens the entity.",
        editor_action_entity: "Entity (optional)",
        editor_action_data: "Action data as JSON (optional)",
        editor_action_data_help: 'For example {"zone_id": "zone_1"}.',
        editor_action_data_invalid: "Not valid JSON.",
        editor_title: "Simple Irrigation card",
    },
    fr: {
        // states
        state_idle: "Inactif",
        state_preparing: "Préparation",
        state_running: "Arrosage",
        state_stopping: "Arrêt…",
        state_paused: "En pause",
        state_error: "Erreur",
        // status view
        next_run: "Prochain arrosage",
        no_next_run: "Aucun arrosage planifié",
        no_next_run_hint: "Ajoutez un créneau de programmation dans le panneau Simple Irrigation.",
        remaining: "{zone} · restant",
        zones_count: "{count} zones",
        zones_count_one: "1 zone",
        queued: "en file d’attente",
        phase_of: "Phase {index} sur {total}",
        ends_at: "se termine à {time}",
        watering_mode: "Mode d’arrosage",
        mode_short: "Mode",
        mode_eco: "Eco",
        mode_normal: "Normal",
        mode_extra: "Extra",
        // actions
        action_run_next: "Lancer le prochain créneau",
        action_stop: "Arrêter",
        action_skip_today: "Sauter aujourd’hui",
        action_pause_48h: "Pause 48 h",
        action_pause_until: "Pause jusqu’à…",
        resume_schedule: "Reprendre la programmation",
        clear_error: "Effacer l’erreur",
        // edge states
        waiting_for_script: "Attente du script de pré-démarrage",
        paused_until: "Exécutions automatiques en pause jusqu’à {time}",
        paused_manual_note: "Les exécutions manuelles ne sont pas affectées.",
        last_run_failed: "La dernière exécution a été interrompue",
        disabled_title: "Programmation désactivée",
        disabled_note: "Cette installation est coupée ; rien ne s’exécutera.",
        // zones view
        zones_title: "Zones",
        issues_count: "{count} problèmes",
        issues_count_one: "1 problème",
        zone_watering: "Arrosage · encore {time}",
        zone_next: "Prochain {time}",
        zone_disabled: "Désactivée",
        zone_no_next: "Non planifiée",
        zone_issue_unavailable: "Sortie indisponible · {entity}",
        zone_issue_missing: "Sortie manquante · {entity}",
        zone_issue_no_output: "Aucune sortie configurée",
        zones_footnote: "Durées pour le mode actif ({mode}).",
        zones_empty: "Aucune zone configurée pour l’instant.",
        // schedule view
        schedule_title: "Prochaines exécutions",
        slots_of: "{shown} sur {total} créneaux",
        schedule_footnote: "Les conditions sont vérifiées à l’heure de début — un capteur de pluie peut encore annuler n’importe laquelle de ces exécutions.",
        schedule_empty: "Rien de planifié.",
        skipped_by_pause: "ignoré — en pause",
        // week view
        week_title: "Cette semaine",
        week_summary: "{runs} exécutions · {time}",
        week_summary_one: "1 exécution · {time}",
        legend_run: "exécution planifiée · hauteur = durée",
        legend_parity_odd: "semaines impaires uniquement",
        legend_parity_even: "semaines paires uniquement",
        legend_scale: "haut de colonne = 00:00, bas = 24:00",
        week_paused: "en pause",
        week_empty: "Aucun créneau de programmation pour l’instant.",
        // run view
        run_title: "Arroser maintenant",
        run_subtitle: "Choisissez des zones ou un créneau de programmation",
        run_tab_zones: "Zones",
        run_tab_slot: "Créneau",
        run_zones_label: "Zones · {count} sélectionnées",
        run_zones_none: "Zones",
        run_slot_label: "Créneau de programmation",
        duration: "Durée",
        duration_configured: "Comme configuré",
        duration_minutes: "{n} min",
        duration_custom: "Personnalisé…",
        duration_custom_prompt: "Arroser chaque zone pendant combien de minutes ?",
        runs_in_sequence: "Exécutions en séquence · {parts}",
        start_zones: "Démarrer {count} zones · ~{time}",
        start_zones_one: "Démarrer 1 zone · ~{time}",
        start_zones_none: "Démarrer",
        start_slot: "Démarrer le créneau · ~{time}",
        apply_conditions: "Appliquer les conditions du créneau",
        apply_conditions_on: "Activé : le créneau est ignoré si une condition échoue",
        apply_conditions_off: "Désactivé : le créneau s’exécute même si le capteur de pluie l’annulerait",
        manual_run_started: "Exécution manuelle démarrée",
        run_progress: "{zone} · encore {time} · {index} sur {total}",
        select_zones_first: "Sélectionnez au moins une zone.",
        no_slots: "Aucun créneau de programmation à exécuter.",
        // compact
        compact_idle: "{state} · prochain {time} · ~{duration}",
        compact_idle_no_run: "{state} · rien de planifié",
        compact_running: "{zone} · encore {time} · {index} sur {total}",
        compact_paused: "En pause jusqu’à {time}",
        // badges
        badge_next: "Prochain {time}",
        badge_paused: "En pause jusqu’à {time}",
        badge_issues: "{count} problèmes de zone",
        badge_issues_one: "1 problème de zone",
        // shared
        unit_hour_short: "h",
        unit_minute_short: "min",
        in_time: "dans {time}",
        today: "Aujourd’hui",
        tomorrow: "Demain",
        approx_minutes: "~{n} min",
        // cadence
        cadence_daily: "Quotidien",
        cadence_twice_daily: "Deux fois par jour",
        cadence_every_n_days: "Tous les {n} jours",
        cadence_every_2_days: "Tous les 2 jours",
        cadence_weekly: "Hebdomadaire",
        cadence_biweekly: "Toutes les 2 semaines",
        cadence_n_per_week: "{n}× par semaine",
        parity_odd: "semaines impaires",
        parity_even: "semaines paires",
        // errors / empty
        loading: "Chargement…",
        no_installation: "Aucune installation Simple Irrigation trouvée. Ajoutez d’abord l’intégration.",
        pick_installation: "Plusieurs installations trouvées — choisissez-en une dans les paramètres de la carte.",
        action_failed: "Action échouée : {error}",
        // editor
        editor_installation: "Installation",
        editor_installation_auto: "Automatique",
        editor_view: "Vue",
        editor_view_status: "État",
        editor_view_zones: "Zones",
        editor_view_schedule: "Programmation",
        editor_view_week: "Semaine",
        editor_view_run: "Arrosage manuel",
        editor_compact: "Disposition compacte",
        editor_compact_help: "Une seule rangée de type tuile au lieu de la carte complète.",
        editor_show_mode: "Sélecteur de mode d’arrosage",
        editor_manual_start: "Sélecteur d’arrosage manuel",
        editor_manual_start_help: "Ajoute une section « Arroser maintenant » repliable sous la carte.",
        editor_manual_start_mode: "Options d’arrosage manuel",
        editor_manual_zones: "Zones",
        editor_manual_slot: "Créneau de programmation",
        editor_manual_both: "Les deux",
        editor_manual_duration: "Autoriser la durée personnalisée",
        editor_actions: "Actions",
        editor_next_runs: "Exécutions à afficher",
        editor_next_runs_help: "Vue Programmation uniquement.",
        editor_zones: "Zones à lister",
        editor_zones_all: "Toutes",
        editor_zones_active: "Actives uniquement",
        editor_zones_custom: "Choisir les zones",
        editor_interactions: "Interactions",
        editor_interactions_help: "Ce que font une touche ou un appui long sur les lignes de la carte.",
        editor_actions_card: "En-tête et ligne compacte",
        editor_actions_zone: "Lignes de zone",
        editor_actions_run: "Lignes de programmation et barres de semaine",
        editor_tap_action: "Appui",
        editor_hold_action: "Appui long",
        editor_action_none: "Aucune",
        editor_action_more_info: "Ouvrir l’entité",
        editor_action_panel: "Ouvrir le panneau Simple Irrigation",
        editor_action_navigate: "Aller à un dashboard",
        editor_action_url: "Ouvrir une URL",
        editor_action_perform_action: "Exécuter une action",
        editor_panel_page_auto: "Page correspondante",
        editor_page_overview: "Aperçu",
        editor_page_zones: "Zones",
        editor_page_schedule: "Programmation",
        editor_page_timetable: "Planning",
        editor_page_settings: "Paramètres",
        editor_panel_admin_help: "Administrateurs uniquement — les autres ouvrent l’entité.",
        editor_action_entity: "Entité (facultatif)",
        editor_action_data: "Données d’action en JSON (facultatif)",
        editor_action_data_help: 'Par exemple {"zone_id": "zone_1"}.',
        editor_action_data_invalid: "JSON non valide.",
        editor_title: "Carte Simple Irrigation",
    },
    de: {
        state_idle: "Bereit",
        state_preparing: "Vorbereitung",
        state_running: "Bewässert",
        state_stopping: "Wird gestoppt",
        state_paused: "Pausiert",
        state_error: "Fehler",
        next_run: "Nächster Lauf",
        no_next_run: "Kein Lauf geplant",
        no_next_run_hint: "Lege im Simple-Irrigation-Panel einen Zeitplan an.",
        remaining: "{zone} · verbleibend",
        zones_count: "{count} Zonen",
        zones_count_one: "1 Zone",
        queued: "wartet",
        phase_of: "Phase {index} von {total}",
        ends_at: "endet {time}",
        watering_mode: "Bewässerungsmodus",
        mode_short: "Modus",
        mode_eco: "Eco",
        mode_normal: "Normal",
        mode_extra: "Extra",
        action_run_next: "Nächsten Slot starten",
        action_stop: "Stopp",
        action_skip_today: "Heute überspringen",
        action_pause_48h: "48 Std. pausieren",
        action_pause_until: "Pausieren bis…",
        resume_schedule: "Zeitplan fortsetzen",
        clear_error: "Fehler löschen",
        waiting_for_script: "Wartet auf das Vorstart-Skript",
        paused_until: "Automatische Läufe pausiert bis {time}",
        paused_manual_note: "Manuelle Läufe sind nicht betroffen.",
        last_run_failed: "Letzter Lauf wurde vorzeitig beendet",
        disabled_title: "Zeitplan deaktiviert",
        disabled_note: "Diese Anlage ist ausgeschaltet; es läuft nichts.",
        zones_title: "Zonen",
        issues_count: "{count} Probleme",
        issues_count_one: "1 Problem",
        zone_watering: "Bewässert · noch {time}",
        zone_next: "Nächster Lauf {time}",
        zone_disabled: "Deaktiviert",
        zone_no_next: "Nicht eingeplant",
        zone_issue_unavailable: "Ausgang nicht verfügbar · {entity}",
        zone_issue_missing: "Ausgang fehlt · {entity}",
        zone_issue_no_output: "Kein Ausgang konfiguriert",
        zones_footnote: "Laufzeiten für den aktiven Modus ({mode}).",
        zones_empty: "Noch keine Zonen angelegt.",
        schedule_title: "Nächste Läufe",
        slots_of: "{shown} von {total} Slots",
        schedule_footnote: "Bedingungen werden zur Startzeit geprüft — ein Regensensor kann jeden Lauf noch verhindern.",
        schedule_empty: "Nichts geplant.",
        skipped_by_pause: "entfällt — pausiert",
        week_title: "Diese Woche",
        week_summary: "{runs} Läufe · {time}",
        week_summary_one: "1 Lauf · {time}",
        legend_run: "geplanter Lauf · Höhe = Dauer",
        legend_parity_odd: "nur ungerade Wochen",
        legend_parity_even: "nur gerade Wochen",
        legend_scale: "Spaltenanfang = 00:00, Ende = 24:00",
        week_paused: "pausiert",
        week_empty: "Noch keine Zeitpläne.",
        run_title: "Jetzt starten",
        run_subtitle: "Zonen oder einen Zeitplan-Slot wählen",
        run_tab_zones: "Zonen",
        run_tab_slot: "Slot",
        run_zones_label: "Zonen · {count} ausgewählt",
        run_zones_none: "Zonen",
        run_slot_label: "Zeitplan-Slot",
        duration: "Dauer",
        duration_configured: "Wie konfiguriert",
        duration_minutes: "{n} Min.",
        duration_custom: "Eigene…",
        duration_custom_prompt: "Wie viele Minuten pro Zone?",
        runs_in_sequence: "Läuft nacheinander · {parts}",
        start_zones: "{count} Zonen starten · ~{time}",
        start_zones_one: "1 Zone starten · ~{time}",
        start_zones_none: "Starten",
        start_slot: "Slot starten · ~{time}",
        apply_conditions: "Bedingungen des Slots anwenden",
        apply_conditions_on: "An: der Slot entfällt, wenn eine Bedingung nicht passt",
        apply_conditions_off: "Aus: der Slot läuft auch, wenn der Regensensor ihn überspringen würde",
        manual_run_started: "Manueller Lauf gestartet",
        run_progress: "{zone} · noch {time} · {index} von {total}",
        select_zones_first: "Wähle mindestens eine Zone.",
        no_slots: "Keine Zeitplan-Slots vorhanden.",
        compact_idle: "{state} · nächster Lauf {time} · ~{duration}",
        compact_idle_no_run: "{state} · nichts geplant",
        compact_running: "{zone} · noch {time} · {index} von {total}",
        compact_paused: "Pausiert bis {time}",
        badge_next: "Nächster {time}",
        badge_paused: "Pausiert bis {time}",
        badge_issues: "{count} Zonenprobleme",
        badge_issues_one: "1 Zonenproblem",
        unit_hour_short: "Std.",
        unit_minute_short: "Min.",
        in_time: "in {time}",
        today: "Heute",
        tomorrow: "Morgen",
        approx_minutes: "~{n} Min.",
        cadence_daily: "Täglich",
        cadence_twice_daily: "Zweimal täglich",
        cadence_every_n_days: "Alle {n} Tage",
        cadence_every_2_days: "Alle 2 Tage",
        cadence_weekly: "Wöchentlich",
        cadence_biweekly: "Alle 2 Wochen",
        cadence_n_per_week: "{n}× pro Woche",
        parity_odd: "ungerade Wochen",
        parity_even: "gerade Wochen",
        loading: "Wird geladen…",
        no_installation: "Keine Simple-Irrigation-Anlage gefunden. Richte zuerst die Integration ein.",
        pick_installation: "Mehrere Anlagen gefunden — wähle eine in den Karteneinstellungen.",
        action_failed: "Aktion fehlgeschlagen: {error}",
        editor_installation: "Anlage",
        editor_installation_auto: "Automatisch",
        editor_view: "Ansicht",
        editor_view_status: "Status",
        editor_view_zones: "Zonen",
        editor_view_schedule: "Zeitplan",
        editor_view_week: "Woche",
        editor_view_run: "Manueller Lauf",
        editor_compact: "Kompaktes Layout",
        editor_compact_help: "Eine Kachel-Zeile statt der vollen Karte.",
        editor_show_mode: "Modus-Auswahl anzeigen",
        editor_manual_start: "Manuelle Startauswahl",
        editor_manual_start_help: "Fügt unter der Karte einen ausklappbaren Bereich „Jetzt starten“ hinzu.",
        editor_manual_start_mode: "Manueller Start bietet",
        editor_manual_zones: "Zonen",
        editor_manual_slot: "Zeitplan-Slot",
        editor_manual_both: "Beides",
        editor_manual_duration: "Dauer überschreibbar",
        editor_actions: "Aktionen",
        editor_next_runs: "Anzahl Läufe",
        editor_next_runs_help: "Nur in der Zeitplan-Ansicht.",
        editor_zones: "Zonen anzeigen",
        editor_zones_all: "Alle",
        editor_zones_active: "Nur aktive",
        editor_zones_custom: "Zonen wählen",
        editor_interactions: "Interaktionen",
        editor_interactions_help: "Was ein Tippen oder langes Drücken auf die Zeilen der Karte auslöst.",
        editor_actions_card: "Kopfzeile und Kompaktzeile",
        editor_actions_zone: "Zonenzeilen",
        editor_actions_run: "Termine und Wochenbalken",
        editor_tap_action: "Tippen",
        editor_hold_action: "Lang drücken",
        editor_action_none: "Nichts",
        editor_action_more_info: "Entität öffnen",
        editor_action_panel: "Simple-Irrigation-Panel öffnen",
        editor_action_navigate: "Zu einem Dashboard wechseln",
        editor_action_url: "URL öffnen",
        editor_action_perform_action: "Aktion ausführen",
        editor_panel_page_auto: "Passende Seite",
        editor_page_overview: "Übersicht",
        editor_page_zones: "Zonen",
        editor_page_schedule: "Zeitplan",
        editor_page_timetable: "Wochenplan",
        editor_page_settings: "Einstellungen",
        editor_panel_admin_help: "Nur für Admins — alle anderen öffnen die Entität.",
        editor_action_entity: "Entität (optional)",
        editor_action_data: "Aktionsdaten als JSON (optional)",
        editor_action_data_help: 'Zum Beispiel {"zone_id": "zone_1"}.',
        editor_action_data_invalid: "Kein gültiges JSON.",
        editor_title: "Simple-Irrigation-Karte",
    },
    nl: {
        state_idle: "Inactief",
        state_preparing: "Voorbereiden",
        state_running: "Bewatering",
        state_stopping: "Stoppen",
        state_paused: "Gepauzeerd",
        state_error: "Fout",
        next_run: "Volgende beurt",
        no_next_run: "Geen beurt gepland",
        no_next_run_hint: "Maak een tijdvak aan in het Simple Irrigation-paneel.",
        remaining: "{zone} · resterend",
        zones_count: "{count} zones",
        zones_count_one: "1 zone",
        queued: "in wachtrij",
        phase_of: "Fase {index} van {total}",
        ends_at: "eindigt {time}",
        watering_mode: "Bewateringsmodus",
        mode_short: "Modus",
        mode_eco: "Eco",
        mode_normal: "Normaal",
        mode_extra: "Extra",
        action_run_next: "Volgend tijdvak starten",
        action_stop: "Stoppen",
        action_skip_today: "Vandaag overslaan",
        action_pause_48h: "48 uur pauzeren",
        action_pause_until: "Pauzeren tot…",
        resume_schedule: "Schema hervatten",
        clear_error: "Fout wissen",
        waiting_for_script: "Wacht op het voorstart-script",
        paused_until: "Automatische beurten gepauzeerd tot {time}",
        paused_manual_note: "Handmatige beurten gaan gewoon door.",
        last_run_failed: "Laatste beurt is vroegtijdig gestopt",
        disabled_title: "Schema uitgeschakeld",
        disabled_note: "Deze installatie staat uit; er draait niets.",
        zones_title: "Zones",
        issues_count: "{count} problemen",
        issues_count_one: "1 probleem",
        zone_watering: "Bewatering · nog {time}",
        zone_next: "Volgende {time}",
        zone_disabled: "Uitgeschakeld",
        zone_no_next: "Niet ingepland",
        zone_issue_unavailable: "Uitgang niet beschikbaar · {entity}",
        zone_issue_missing: "Uitgang ontbreekt · {entity}",
        zone_issue_no_output: "Geen uitgang ingesteld",
        zones_footnote: "Looptijden voor de actieve modus ({mode}).",
        zones_empty: "Nog geen zones ingesteld.",
        schedule_title: "Volgende beurten",
        slots_of: "{shown} van {total} tijdvakken",
        schedule_footnote: "Voorwaarden worden bij de starttijd gecontroleerd — een regensensor kan elke beurt alsnog overslaan.",
        schedule_empty: "Niets gepland.",
        skipped_by_pause: "vervalt — gepauzeerd",
        week_title: "Deze week",
        week_summary: "{runs} beurten · {time}",
        week_summary_one: "1 beurt · {time}",
        legend_run: "geplande beurt · hoogte = duur",
        legend_parity_odd: "alleen oneven weken",
        legend_parity_even: "alleen even weken",
        legend_scale: "bovenkant kolom = 00:00, onderkant = 24:00",
        week_paused: "gepauzeerd",
        week_empty: "Nog geen tijdvakken.",
        run_title: "Nu starten",
        run_subtitle: "Kies zones of een tijdvak",
        run_tab_zones: "Zones",
        run_tab_slot: "Tijdvak",
        run_zones_label: "Zones · {count} gekozen",
        run_zones_none: "Zones",
        run_slot_label: "Tijdvak",
        duration: "Duur",
        duration_configured: "Zoals ingesteld",
        duration_minutes: "{n} min",
        duration_custom: "Aangepast…",
        duration_custom_prompt: "Hoeveel minuten per zone?",
        runs_in_sequence: "Draait achter elkaar · {parts}",
        start_zones: "{count} zones starten · ~{time}",
        start_zones_one: "1 zone starten · ~{time}",
        start_zones_none: "Starten",
        start_slot: "Tijdvak starten · ~{time}",
        apply_conditions: "Voorwaarden van het tijdvak toepassen",
        apply_conditions_on: "Aan: het tijdvak vervalt als een voorwaarde faalt",
        apply_conditions_off: "Uit: het tijdvak draait ook als de regensensor het zou overslaan",
        manual_run_started: "Handmatige beurt gestart",
        run_progress: "{zone} · nog {time} · {index} van {total}",
        select_zones_first: "Kies minstens één zone.",
        no_slots: "Geen tijdvakken beschikbaar.",
        compact_idle: "{state} · volgende {time} · ~{duration}",
        compact_idle_no_run: "{state} · niets gepland",
        compact_running: "{zone} · nog {time} · {index} van {total}",
        compact_paused: "Gepauzeerd tot {time}",
        badge_next: "Volgende {time}",
        badge_paused: "Gepauzeerd tot {time}",
        badge_issues: "{count} zoneproblemen",
        badge_issues_one: "1 zoneprobleem",
        unit_hour_short: "u",
        unit_minute_short: "min",
        in_time: "over {time}",
        today: "Vandaag",
        tomorrow: "Morgen",
        approx_minutes: "~{n} min",
        cadence_daily: "Dagelijks",
        cadence_twice_daily: "Tweemaal daags",
        cadence_every_n_days: "Elke {n} dagen",
        cadence_every_2_days: "Elke 2 dagen",
        cadence_weekly: "Wekelijks",
        cadence_biweekly: "Elke 2 weken",
        cadence_n_per_week: "{n}× per week",
        parity_odd: "oneven weken",
        parity_even: "even weken",
        loading: "Laden…",
        no_installation: "Geen Simple Irrigation-installatie gevonden. Voeg eerst de integratie toe.",
        pick_installation: "Meerdere installaties gevonden — kies er een in de kaartinstellingen.",
        action_failed: "Actie mislukt: {error}",
        editor_installation: "Installatie",
        editor_installation_auto: "Automatisch",
        editor_view: "Weergave",
        editor_view_status: "Status",
        editor_view_zones: "Zones",
        editor_view_schedule: "Schema",
        editor_view_week: "Week",
        editor_view_run: "Handmatige beurt",
        editor_compact: "Compacte weergave",
        editor_compact_help: "Eén tegelrij in plaats van de volledige kaart.",
        editor_show_mode: "Moduskiezer tonen",
        editor_manual_start: "Handmatige startkiezer",
        editor_manual_start_help: "Voegt onder de kaart een uitklapbaar blok “Nu starten” toe.",
        editor_manual_start_mode: "Handmatig starten biedt",
        editor_manual_zones: "Zones",
        editor_manual_slot: "Tijdvak",
        editor_manual_both: "Beide",
        editor_manual_duration: "Duur mag worden aangepast",
        editor_actions: "Acties",
        editor_next_runs: "Aantal beurten",
        editor_next_runs_help: "Alleen in de schemaweergave.",
        editor_zones: "Zones tonen",
        editor_zones_all: "Alle",
        editor_zones_active: "Alleen actieve",
        editor_zones_custom: "Zones kiezen",
        editor_interactions: "Interacties",
        editor_interactions_help: "Wat een tik of lang indrukken op de rijen van de kaart doet.",
        editor_actions_card: "Koptekst en compacte rij",
        editor_actions_zone: "Zonerijen",
        editor_actions_run: "Beurten en weekbalken",
        editor_tap_action: "Tikken",
        editor_hold_action: "Lang indrukken",
        editor_action_none: "Niets",
        editor_action_more_info: "Entiteit openen",
        editor_action_panel: "Simple Irrigation-paneel openen",
        editor_action_navigate: "Naar een dashboard gaan",
        editor_action_url: "URL openen",
        editor_action_perform_action: "Actie uitvoeren",
        editor_panel_page_auto: "Bijbehorende pagina",
        editor_page_overview: "Overzicht",
        editor_page_zones: "Zones",
        editor_page_schedule: "Schema",
        editor_page_timetable: "Weekoverzicht",
        editor_page_settings: "Instellingen",
        editor_panel_admin_help: "Alleen voor beheerders — anderen openen de entiteit.",
        editor_action_entity: "Entiteit (optioneel)",
        editor_action_data: "Actiegegevens als JSON (optioneel)",
        editor_action_data_help: 'Bijvoorbeeld {"zone_id": "zone_1"}.',
        editor_action_data_invalid: "Geen geldige JSON.",
        editor_title: "Simple Irrigation-kaart",
    },
    it: {
        state_idle: "Inattivo",
        state_preparing: "Preparazione",
        state_running: "Irrigazione",
        state_stopping: "Arresto",
        state_paused: "In pausa",
        state_error: "Errore",
        next_run: "Prossima irrigazione",
        no_next_run: "Nessuna irrigazione programmata",
        no_next_run_hint: "Aggiungi una fascia oraria nel pannello Simple Irrigation.",
        remaining: "{zone} · rimanente",
        zones_count: "{count} zone",
        zones_count_one: "1 zona",
        queued: "in coda",
        phase_of: "Fase {index} di {total}",
        ends_at: "termina {time}",
        watering_mode: "Modalità di irrigazione",
        mode_short: "Modalità",
        mode_eco: "Eco",
        mode_normal: "Normale",
        mode_extra: "Extra",
        action_run_next: "Avvia prossima fascia",
        action_stop: "Arresta",
        action_skip_today: "Salta oggi",
        action_pause_48h: "Pausa 48 h",
        action_pause_until: "Pausa fino a…",
        resume_schedule: "Riprendi programmazione",
        clear_error: "Cancella errore",
        waiting_for_script: "In attesa dello script di pre-avvio",
        paused_until: "Irrigazioni automatiche in pausa fino a {time}",
        paused_manual_note: "Le irrigazioni manuali non sono interessate.",
        last_run_failed: "L'ultima irrigazione si è interrotta",
        disabled_title: "Programmazione disattivata",
        disabled_note: "Questo impianto è spento; non verrà eseguito nulla.",
        zones_title: "Zone",
        issues_count: "{count} problemi",
        issues_count_one: "1 problema",
        zone_watering: "Irrigazione · {time} rimanenti",
        zone_next: "Prossima {time}",
        zone_disabled: "Disattivata",
        zone_no_next: "Non programmata",
        zone_issue_unavailable: "Uscita non disponibile · {entity}",
        zone_issue_missing: "Uscita mancante · {entity}",
        zone_issue_no_output: "Nessuna uscita configurata",
        zones_footnote: "Durate per la modalità attiva ({mode}).",
        zones_empty: "Nessuna zona configurata.",
        schedule_title: "Prossime irrigazioni",
        slots_of: "{shown} di {total} fasce",
        schedule_footnote: "Le condizioni sono verificate all'avvio — un sensore di pioggia può comunque saltarle.",
        schedule_empty: "Nulla in programma.",
        skipped_by_pause: "saltata — in pausa",
        week_title: "Questa settimana",
        week_summary: "{runs} irrigazioni · {time}",
        week_summary_one: "1 irrigazione · {time}",
        legend_run: "irrigazione programmata · altezza = durata",
        legend_parity_odd: "solo settimane dispari",
        legend_parity_even: "solo settimane pari",
        legend_scale: "inizio colonna = 00:00, fine = 24:00",
        week_paused: "in pausa",
        week_empty: "Nessuna fascia oraria.",
        run_title: "Avvia ora",
        run_subtitle: "Scegli le zone o una fascia oraria",
        run_tab_zones: "Zone",
        run_tab_slot: "Fascia",
        run_zones_label: "Zone · {count} selezionate",
        run_zones_none: "Zone",
        run_slot_label: "Fascia oraria",
        duration: "Durata",
        duration_configured: "Come configurato",
        duration_minutes: "{n} min",
        duration_custom: "Personalizzata…",
        duration_custom_prompt: "Quanti minuti per zona?",
        runs_in_sequence: "In sequenza · {parts}",
        start_zones: "Avvia {count} zone · ~{time}",
        start_zones_one: "Avvia 1 zona · ~{time}",
        start_zones_none: "Avvia",
        start_slot: "Avvia fascia · ~{time}",
        apply_conditions: "Applica le condizioni della fascia",
        apply_conditions_on: "Attivo: la fascia viene saltata se una condizione non è soddisfatta",
        apply_conditions_off: "Disattivo: la fascia parte anche se il sensore di pioggia la salterebbe",
        manual_run_started: "Irrigazione manuale avviata",
        run_progress: "{zone} · {time} rimanenti · {index} di {total}",
        select_zones_first: "Seleziona almeno una zona.",
        no_slots: "Nessuna fascia oraria disponibile.",
        compact_idle: "{state} · prossima {time} · ~{duration}",
        compact_idle_no_run: "{state} · nulla in programma",
        compact_running: "{zone} · {time} rimanenti · {index} di {total}",
        compact_paused: "In pausa fino a {time}",
        badge_next: "Prossima {time}",
        badge_paused: "In pausa fino a {time}",
        badge_issues: "{count} problemi di zona",
        badge_issues_one: "1 problema di zona",
        unit_hour_short: "h",
        unit_minute_short: "min",
        in_time: "tra {time}",
        today: "Oggi",
        tomorrow: "Domani",
        approx_minutes: "~{n} min",
        cadence_daily: "Ogni giorno",
        cadence_twice_daily: "Due volte al giorno",
        cadence_every_n_days: "Ogni {n} giorni",
        cadence_every_2_days: "Ogni 2 giorni",
        cadence_weekly: "Ogni settimana",
        cadence_biweekly: "Ogni 2 settimane",
        cadence_n_per_week: "{n}× a settimana",
        parity_odd: "settimane dispari",
        parity_even: "settimane pari",
        loading: "Caricamento…",
        no_installation: "Nessun impianto Simple Irrigation trovato. Aggiungi prima l'integrazione.",
        pick_installation: "Più impianti trovati — scegline uno nelle impostazioni della scheda.",
        action_failed: "Azione non riuscita: {error}",
        editor_installation: "Impianto",
        editor_installation_auto: "Automatico",
        editor_view: "Vista",
        editor_view_status: "Stato",
        editor_view_zones: "Zone",
        editor_view_schedule: "Programmazione",
        editor_view_week: "Settimana",
        editor_view_run: "Avvio manuale",
        editor_compact: "Layout compatto",
        editor_compact_help: "Una riga in stile tile invece della scheda completa.",
        editor_show_mode: "Selettore modalità",
        editor_manual_start: "Selettore avvio manuale",
        editor_manual_start_help: "Aggiunge sotto la scheda una sezione richiudibile “Avvia ora”.",
        editor_manual_start_mode: "L'avvio manuale offre",
        editor_manual_zones: "Zone",
        editor_manual_slot: "Fascia oraria",
        editor_manual_both: "Entrambi",
        editor_manual_duration: "Consenti durata personalizzata",
        editor_actions: "Azioni",
        editor_next_runs: "Irrigazioni da mostrare",
        editor_next_runs_help: "Solo nella vista programmazione.",
        editor_zones: "Zone da elencare",
        editor_zones_all: "Tutte",
        editor_zones_active: "Solo attive",
        editor_zones_custom: "Scegli le zone",
        editor_interactions: "Interazioni",
        editor_interactions_help: "Cosa succede toccando o tenendo premute le righe della scheda.",
        editor_actions_card: "Intestazione e riga compatta",
        editor_actions_zone: "Righe delle zone",
        editor_actions_run: "Righe del programma e barre settimanali",
        editor_tap_action: "Tocco",
        editor_hold_action: "Pressione lunga",
        editor_action_none: "Niente",
        editor_action_more_info: "Apri l'entità",
        editor_action_panel: "Apri il pannello Simple Irrigation",
        editor_action_navigate: "Vai a una dashboard",
        editor_action_url: "Apri un URL",
        editor_action_perform_action: "Esegui un'azione",
        editor_panel_page_auto: "Pagina corrispondente",
        editor_page_overview: "Panoramica",
        editor_page_zones: "Zone",
        editor_page_schedule: "Programma",
        editor_page_timetable: "Settimana",
        editor_page_settings: "Impostazioni",
        editor_panel_admin_help: "Solo per amministratori — gli altri aprono l'entità.",
        editor_action_entity: "Entità (opzionale)",
        editor_action_data: "Dati dell'azione in JSON (opzionale)",
        editor_action_data_help: 'Per esempio {"zone_id": "zone_1"}.',
        editor_action_data_invalid: "JSON non valido.",
        editor_title: "Scheda Simple Irrigation",
    },
};
function language(hass) {
    return (hass?.locale?.language ?? hass?.language ?? "en").split("-")[0];
}
function localize(hass, key, vars) {
    const table = TRANSLATIONS[language(hass)] ?? TRANSLATIONS.en;
    let text = table[key] ?? TRANSLATIONS.en[key] ?? key;
    if (vars) {
        for (const [name, value] of Object.entries(vars)) {
            text = text.split(`{${name}}`).join(String(value));
        }
    }
    return text;
}
/** `localize` with the singular variant picked automatically for count === 1. */
function localizeCount(hass, key, count, vars) {
    const singular = `${key}_one`;
    const table = TRANSLATIONS[language(hass)] ?? TRANSLATIONS.en;
    const useSingular = count === 1 && (table[singular] !== undefined || TRANSLATIONS.en[singular]);
    return localize(hass, useSingular ? singular : key, { count, ...vars });
}

/**
 * All timestamps cross the wire as ISO strings and become text here, so a
 * household with two users in two languages sees two correctly formatted cards
 * from one snapshot.
 */
function use12Hour(hass) {
    const fmt = hass?.locale?.time_format;
    if (fmt === "12")
        return true;
    if (fmt === "24")
        return false;
    return undefined; // "language"/"system" — let Intl decide
}
/** "19:30" (or "7:30 PM"), in the user's own time format. */
function clock(hass, iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return "";
    return new Intl.DateTimeFormat(language(hass), {
        hour: "2-digit",
        minute: "2-digit",
        hour12: use12Hour(hass),
    }).format(d);
}
function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
/** Whole days from today to `d`; 0 = today, 1 = tomorrow. */
function dayOffset(d, now = new Date()) {
    return Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);
}
/**
 * "Today 19:30", "Tomorrow 06:00", "Saturday 06:00", "12 Sep 06:00".
 *
 * Weekday names stay useful only inside the coming week; past that a date is
 * clearer than "Saturday" twelve days out.
 */
function dayTime(hass, iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return "";
    const offset = dayOffset(d);
    const time = clock(hass, iso);
    if (offset === 0)
        return `${localize(hass, "today")} ${time}`;
    if (offset === 1)
        return `${localize(hass, "tomorrow")} ${time}`;
    if (offset > 1 && offset < 7) {
        const weekday = new Intl.DateTimeFormat(language(hass), {
            weekday: "long",
        }).format(d);
        return `${weekday} ${time}`;
    }
    const date = new Intl.DateTimeFormat(language(hass), {
        day: "numeric",
        month: "short",
    }).format(d);
    return `${date} ${time}`;
}
/**
 * Short form for tight rows mid-sentence: "next today 19:30".
 *
 * Only the relative words are lower-cased — a weekday or month name is a proper
 * noun and stays capitalised ("next Aug 29 07:00", not "next aug 29 07:00").
 * German lower-cases nothing here, since its relative words are nouns too.
 */
function dayTimeShort(hass, iso) {
    const text = dayTime(hass, iso);
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return text;
    const offset = dayOffset(d);
    const relative = offset === 0 || offset === 1;
    if (!relative || language(hass) === "de")
        return text;
    return text.charAt(0).toLowerCase() + text.slice(1);
}
/** Countdown as "7:24" under an hour, "1:07:24" above it. */
function countdown(seconds) {
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
/** Seconds until `iso`, never negative. */
function secondsUntil(iso) {
    if (!iso)
        return 0;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t))
        return 0;
    return Math.max(0, (t - Date.now()) / 1000);
}
/** "2 h 35 min", "40 min" — coarse, for durations rather than countdowns. */
function duration(hass, minutes) {
    const total = Math.max(0, Math.round(minutes));
    const h = Math.floor(total / 60);
    const m = total % 60;
    const hUnit = localize(hass, "unit_hour_short");
    const mUnit = localize(hass, "unit_minute_short");
    if (h && m)
        return `${h} ${hUnit} ${m} ${mUnit}`;
    if (h)
        return `${h} ${hUnit}`;
    return `${m} ${mUnit}`;
}
/** "in 11 h 11 min" — the lead time before a scheduled run. */
function leadTime(hass, iso) {
    const secs = secondsUntil(iso);
    return localize(hass, "in_time", { time: duration(hass, secs / 60) });
}
/** Localized weekday names, Monday first (the integration's weekday order). */
function weekdayNames(hass, style = "short") {
    const fmt = new Intl.DateTimeFormat(language(hass), { weekday: style });
    // 2024-01-01 was a Monday.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
}
/** "Every 2 days", "Daily", "Mon, Wed, Fri" — the slot's rhythm in one phrase. */
function cadenceLabel(hass, cadence) {
    const days = cadence.weekdays ?? [];
    // Cycles longer than a week are built *out of* odd/even weeks, so naming the
    // parity there only restates the cadence — "Every 2 days · even weeks" is
    // noise. Where the user picked the rhythm by hand it is real information.
    const parityIsGenerated = ["every_n_days", "biweekly", "twice_daily", "daily", "n_per_week"].includes(cadence.kind);
    const parityNote = parityIsGenerated
        ? ""
        : cadence.week_parity === "odd"
            ? localize(hass, "parity_odd")
            : cadence.week_parity === "even"
                ? localize(hass, "parity_even")
                : "";
    let base;
    switch (cadence.kind) {
        case "daily":
            base = localize(hass, "cadence_daily");
            break;
        case "twice_daily":
            base = localize(hass, "cadence_twice_daily");
            break;
        case "every_n_days":
            base = localize(hass, "cadence_every_n_days", { n: cadence.n ?? 2 });
            break;
        case "n_per_week":
            base = localize(hass, "cadence_n_per_week", { n: cadence.n ?? days.length });
            break;
        case "weekly":
            base = localize(hass, "cadence_weekly");
            break;
        case "biweekly":
            base = localize(hass, "cadence_biweekly");
            break;
        default: {
            // No wizard metadata: describe what the slot literally does.
            if (days.length === 7) {
                base = localize(hass, "cadence_daily");
            }
            else if (days.length === 0) {
                base = "";
            }
            else {
                const names = weekdayNames(hass);
                base = days.map((d) => names[d] ?? "").join(", ");
            }
        }
    }
    if (parityNote) {
        return base ? `${base} · ${parityNote}` : parityNote;
    }
    return base;
}
/** "~40 min" — an estimate, flagged as one. */
function approxMinutes(hass, minutes) {
    return localize(hass, "approx_minutes", { n: Math.round(minutes) });
}

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
const cardStyles = i$5 `
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
  :host([data-narrow]) .runfoot .btn {
    margin-left: 0;
    width: 100%;
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

const CARD_VIEWS = [
    "status",
    "zones",
    "schedule",
    "week",
    "run",
];
const CARD_ACTIONS = [
    "run_next",
    "stop",
    "skip_today",
    "pause_48h",
    "pause_until",
];
/** Config keys the editor and the card treat as one tap/hold pair. */
const ACTION_KEYS = {
    card: { tap: "tap_action", hold: "hold_action" },
    zone: { tap: "zone_tap_action", hold: "zone_hold_action" },
    run: { tap: "run_tap_action", hold: "run_hold_action" },
};
const DEFAULT_CONFIG = {
    view: "status",
    compact: false,
    show_mode: true,
    manual_start: "off",
    manual_duration: false,
    actions: ["run_next", "skip_today", "pause_48h"],
    next_runs: 4,
    zones: "all",
    // Tap opens what the row stands for, holding opens the panel page it lives
    // on. `panel` without a page follows the row: a run opens its own slot.
    tap_action: { action: "more-info" },
    hold_action: { action: "panel" },
    zone_tap_action: { action: "more-info" },
    zone_hold_action: { action: "panel" },
    run_tap_action: { action: "panel" },
    run_hold_action: { action: "none" },
};
const BADGE_KINDS = [
    "state",
    "next",
    "mode",
    "pause",
    "issues",
];

/** Views the editor offers as chips; `run` is reached via the picker toggle. */
const EDITOR_VIEWS = ["status", "zones", "schedule", "week"];
const MANUAL_MODES = ["zones", "slot", "both"];
let SimpleIrrigationCardEditor = class SimpleIrrigationCardEditor extends i$2 {
    constructor() {
        super(...arguments);
        this._entries = [];
    }
    setConfig(config) {
        this._config = { ...DEFAULT_CONFIG, ...config };
    }
    connectedCallback() {
        super.connectedCallback();
        void this._loadEntries();
        this._resubscribe();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsubscribe?.then((unsub) => unsub()).catch(() => undefined);
        this._unsubscribe = undefined;
    }
    updated() {
        if (this.hass && !this._entries.length)
            void this._loadEntries();
        this._resubscribe();
    }
    async _loadEntries() {
        if (!this.hass || this._entries.length)
            return;
        try {
            this._entries = await listEntries(this.hass);
        }
        catch {
            this._entries = [];
        }
    }
    _resubscribe() {
        if (!this.hass || this._unsubscribe || !this.isConnected)
            return;
        this._unsubscribe = subscribeSnapshot(this.hass, (snapshot) => {
            this._snapshot = snapshot;
        }, this._config?.entry_id);
        this._unsubscribe.catch(() => {
            this._unsubscribe = undefined;
        });
    }
    _emit(patch) {
        if (!this._config)
            return;
        const next = { ...this._config, ...patch };
        // Keep the YAML honest: options at their default add noise, and an option
        // that does not apply to the chosen view is worse than noise.
        for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
            if (JSON.stringify(next[key]) === JSON.stringify(value)) {
                delete next[key];
            }
        }
        if (next.view !== "schedule")
            delete next.next_runs;
        if (!next.entry_id)
            delete next.entry_id;
        const config = next;
        this._config = { ...DEFAULT_CONFIG, ...config };
        fireEvent(this, "config-changed", { config });
    }
    render() {
        if (!this.hass || !this._config)
            return A;
        const cfg = { ...DEFAULT_CONFIG, ...this._config };
        const view = cfg.view;
        return b `
      <div class="wrap">
        <div class="etitle">${localize(this.hass, "editor_title")}</div>

        ${this._entries.length > 1
            ? b `
              <div class="flabel">
                ${localize(this.hass, "editor_installation")}
              </div>
              <select
                class="select"
                .value=${this._config.entry_id ?? ""}
                @change=${(ev) => this._emit({
                entry_id: ev.target.value || undefined,
            })}
              >
                <option value="">
                  ${localize(this.hass, "editor_installation_auto")}
                </option>
                ${this._entries.map((entry) => b `<option value=${entry.entry_id}>
                    ${entry.name}
                  </option>`)}
              </select>
            `
            : A}

        <div class="flabel">${localize(this.hass, "editor_view")}</div>
        <div class="seg">
          ${EDITOR_VIEWS.map((option) => b `<button
              class=${e({ on: view === option })}
              @click=${() => this._emit({ view: option })}
            >
              ${localize(this.hass, `editor_view_${option}`)}
            </button>`)}
        </div>

        ${this._toggleRow("editor_compact", cfg.compact, (on) => this._emit({ compact: on }), "editor_compact_help")}
        ${view === "status" || view === "run"
            ? this._toggleRow("editor_show_mode", cfg.show_mode, (on) => this._emit({ show_mode: on }))
            : A}
        ${this._toggleRow("editor_manual_start", cfg.manual_start !== "off", (on) => this._emit({ manual_start: on ? "zones" : "off" }), "editor_manual_start_help")}
        ${cfg.manual_start !== "off"
            ? b `
              <div class="flabel">
                ${localize(this.hass, "editor_manual_start_mode")}
              </div>
              <div class="seg">
                ${MANUAL_MODES.map((mode) => b `<button
                    class=${e({ on: cfg.manual_start === mode })}
                    @click=${() => this._emit({ manual_start: mode })}
                  >
                    ${localize(this.hass, mode === "zones"
                ? "editor_manual_zones"
                : mode === "slot"
                    ? "editor_manual_slot"
                    : "editor_manual_both")}
                  </button>`)}
              </div>
              ${this._toggleRow("editor_manual_duration", cfg.manual_duration, (on) => this._emit({ manual_duration: on }))}
            `
            : A}

        ${view === "status"
            ? b `
              <div class="flabel top">
                ${localize(this.hass, "editor_actions")}
              </div>
              <div class="chips">
                ${CARD_ACTIONS.map((action) => {
                const on = cfg.actions.includes(action);
                return b `<button
                    class=${e({ chip: true, on })}
                    @click=${() => this._toggleAction(action)}
                  >
                    ${localize(this.hass, `action_${action}`)}
                  </button>`;
            })}
              </div>
            `
            : A}

        ${view === "schedule"
            ? b `
              <div class="flabel top">
                ${localize(this.hass, "editor_next_runs")}
              </div>
              <input
                class="select"
                type="number"
                min="1"
                max="12"
                .value=${String(cfg.next_runs)}
                @change=${(ev) => {
                const value = Number.parseInt(ev.target.value, 10);
                if (Number.isFinite(value)) {
                    this._emit({ next_runs: Math.min(12, Math.max(1, value)) });
                }
            }}
              />
              <div class="fhelp">
                ${localize(this.hass, "editor_next_runs_help")}
              </div>
            `
            : A}

        ${view === "zones"
            ? b `
              <div class="flabel top">${localize(this.hass, "editor_zones")}</div>
              <div class="seg">
                ${["all", "active", "custom"].map((option) => b `<button
                    class=${e({ on: this._zoneMode() === option })}
                    @click=${() => this._setZoneMode(option)}
                  >
                    ${localize(this.hass, `editor_zones_${option}`)}
                  </button>`)}
              </div>
              ${this._zoneMode() === "custom" && this._snapshot
                ? b `<div class="chips">
                    ${this._snapshot.zones.map((zone) => {
                    const picked = Array.isArray(cfg.zones)
                        ? cfg.zones.includes(zone.zone_id)
                        : false;
                    return b `<button
                        class=${e({ chip: true, on: picked })}
                        @click=${() => this._toggleZone(zone.zone_id)}
                      >
                        ${zone.name}
                      </button>`;
                })}
                  </div>`
                : A}
            `
            : A}

        <div class="flabel top strong">
          ${localize(this.hass, "editor_interactions")}
        </div>
        <div class="fhelp bottom">
          ${localize(this.hass, "editor_interactions_help")}
        </div>
        ${this._actionTarget("card", "editor_actions_card")}
        ${view === "zones"
            ? this._actionTarget("zone", "editor_actions_zone")
            : A}
        ${view === "schedule" || view === "week"
            ? this._actionTarget("run", "editor_actions_run")
            : A}
      </div>
    `;
    }
    // ---- tap / hold ---------------------------------------------------------
    _action(target, kind) {
        const key = ACTION_KEYS[target][kind];
        const value = (this._config?.[key] ?? DEFAULT_CONFIG[key]);
        return value;
    }
    _setAction(target, kind, action) {
        const key = ACTION_KEYS[target][kind];
        this._emit({ [key]: action });
    }
    /** Patch one field, dropping it again when the input is cleared. */
    _patchAction(target, kind, patch) {
        const next = { ...this._action(target, kind), ...patch };
        for (const [field, value] of Object.entries(patch)) {
            if (value === undefined || value === "")
                delete next[field];
        }
        this._setAction(target, kind, next);
    }
    _actionTarget(target, labelKey) {
        return b `
      <div class="flabel top">${localize(this.hass, labelKey)}</div>
      ${this._actionEditor(target, "tap")}
      ${this._actionEditor(target, "hold")}
    `;
    }
    _actionEditor(target, kind) {
        const action = this._action(target, kind);
        return b `
      <div class="arow">
        <span class="aname">
          ${localize(this.hass, kind === "tap" ? "editor_tap_action" : "editor_hold_action")}
        </span>
        <select
          class="select inline"
          @change=${(ev) => this._setAction(target, kind, {
            action: ev.target.value,
        })}
        >
          ${ACTION_TYPES.map((type) => b `<option
              value=${type}
              ?selected=${type === action.action}
            >
              ${localize(this.hass, `editor_action_${type.replace("-", "_")}`)}
            </option>`)}
        </select>
      </div>
      ${this._actionFields(target, kind, action)}
    `;
    }
    _actionFields(target, kind, action) {
        switch (action.action) {
            case "more-info":
                return b `<input
          class="select sub"
          type="text"
          .value=${action.entity ?? ""}
          placeholder=${localize(this.hass, "editor_action_entity")}
          @change=${(ev) => this._patchAction(target, kind, {
                    entity: ev.target.value.trim(),
                })}
        />`;
            case "panel":
                return b `
          <select
            class="select sub"
            @change=${(ev) => {
                    const value = ev.target.value;
                    this._patchAction(target, kind, {
                        panel_page: (value || undefined),
                    });
                }}
          >
            <option value="" ?selected=${!action.panel_page}>
              ${localize(this.hass, "editor_panel_page_auto")}
            </option>
            ${PANEL_PAGES.map((page) => b `<option
                value=${page}
                ?selected=${page === action.panel_page}
              >
                ${localize(this.hass, `editor_page_${page}`)}
              </option>`)}
          </select>
          <div class="fhelp bottom">
            ${localize(this.hass, "editor_panel_admin_help")}
          </div>
        `;
            case "navigate":
                return b `<input
          class="select sub"
          type="text"
          .value=${action.navigation_path ?? ""}
          placeholder="/lovelace/garden"
          @change=${(ev) => this._patchAction(target, kind, {
                    navigation_path: ev.target.value.trim(),
                })}
        />`;
            case "url":
                return b `<input
          class="select sub"
          type="text"
          .value=${action.url_path ?? ""}
          placeholder="https://…"
          @change=${(ev) => this._patchAction(target, kind, {
                    url_path: ev.target.value.trim(),
                })}
        />`;
            case "perform-action":
                return b `
          <input
            class="select sub"
            type="text"
            .value=${action.perform_action ?? action.service ?? ""}
            placeholder="simple_irrigation.run_zone"
            @change=${(ev) => this._patchAction(target, kind, {
                    perform_action: ev.target.value.trim(),
                    service: undefined,
                })}
          />
          <input
            class="select sub"
            type="text"
            .value=${action.data ? JSON.stringify(action.data) : ""}
            placeholder=${localize(this.hass, "editor_action_data")}
            @change=${(ev) => this._onActionData(target, kind, ev)}
          />
          <div class="fhelp bottom">
            ${localize(this.hass, "editor_action_data_help")}
          </div>
        `;
            default:
                return A;
        }
    }
    _onActionData(target, kind, ev) {
        const input = ev.target;
        const raw = input.value.trim();
        if (!raw) {
            this._patchAction(target, kind, { data: undefined });
            input.setCustomValidity("");
            return;
        }
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
                throw new Error("not an object");
            }
            input.setCustomValidity("");
            this._patchAction(target, kind, { data: parsed });
        }
        catch {
            // Keep what they typed and say so, rather than silently dropping it.
            input.setCustomValidity(localize(this.hass, "editor_action_data_invalid"));
            input.reportValidity();
        }
    }
    _toggleRow(labelKey, value, onChange, helpKey) {
        return b `<div class="row">
      <div class="rowmain">
        <span>${localize(this.hass, labelKey)}</span>
        ${helpKey
            ? b `<div class="fhelp">${localize(this.hass, helpKey)}</div>`
            : A}
      </div>
      <button
        class=${e({ toggle: true, on: value })}
        role="switch"
        aria-checked=${value}
        aria-label=${localize(this.hass, labelKey)}
        @click=${() => onChange(!value)}
      >
        <span class="knob"></span>
      </button>
    </div>`;
    }
    _toggleAction(action) {
        const current = { ...DEFAULT_CONFIG, ...this._config }.actions;
        const next = current.includes(action)
            ? current.filter((a) => a !== action)
            : // Keep the canonical order so the primary action stays predictable.
                CARD_ACTIONS.filter((a) => current.includes(a) || a === action);
        this._emit({ actions: next });
    }
    _zoneMode() {
        const zones = { ...DEFAULT_CONFIG, ...this._config }.zones;
        if (zones === "active")
            return "active";
        if (Array.isArray(zones))
            return "custom";
        return "all";
    }
    _setZoneMode(mode) {
        if (mode === "custom") {
            const current = this._config?.zones;
            this._emit({ zones: Array.isArray(current) ? current : [] });
            return;
        }
        this._emit({ zones: mode });
    }
    _toggleZone(zoneId) {
        const current = this._config?.zones;
        const list = Array.isArray(current) ? current : [];
        this._emit({
            zones: list.includes(zoneId)
                ? list.filter((id) => id !== zoneId)
                : [...list, zoneId],
        });
    }
    static { this.styles = i$5 `
    :host {
      --e-fg: var(--primary-text-color);
      --e-fg2: var(--secondary-text-color);
      --e-div: var(--divider-color);
      --e-pri: var(--primary-color);
      --e-prifg: var(--text-primary-color, #fff);
      display: block;
    }
    .wrap {
      padding: 4px 0 8px;
      color: var(--e-fg);
    }
    button {
      font: inherit;
      cursor: pointer;
      color: inherit;
    }
    button:focus-visible {
      outline: 2px solid var(--e-pri);
      outline-offset: 2px;
    }
    .etitle {
      font-size: 15px;
      font-weight: 500;
      margin-bottom: 14px;
    }
    .flabel {
      font-size: 12px;
      color: var(--e-fg2);
      margin-bottom: 6px;
    }
    .flabel.top {
      margin-top: 14px;
    }
    .flabel.strong {
      font-size: 13.5px;
      font-weight: 500;
      color: var(--e-fg);
    }
    .fhelp.bottom {
      margin-bottom: 10px;
    }
    .arow {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .aname {
      font-size: 13px;
      flex: none;
      min-width: 92px;
    }
    .select.inline {
      margin-bottom: 0;
      flex: 1 1 auto;
      min-width: 0;
    }
    .select.sub {
      margin-bottom: 8px;
    }
    .fhelp {
      font-size: 12px;
      color: var(--e-fg2);
      margin-top: 4px;
      line-height: 1.4;
    }
    .select {
      display: block;
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--e-div);
      border-radius: 8px;
      padding: 9px 12px;
      font: inherit;
      font-size: 13.5px;
      margin-bottom: 14px;
      background: var(--ha-card-background, var(--card-background-color));
      color: var(--e-fg);
    }
    .seg {
      display: inline-flex;
      border: 1px solid var(--e-div);
      border-radius: 9px;
      overflow: hidden;
      margin-bottom: 14px;
      max-width: 100%;
      flex-wrap: wrap;
    }
    .seg button {
      font-size: 12.5px;
      padding: 7px 13px;
      border: 0;
      background: transparent;
      color: var(--e-fg2);
      white-space: nowrap;
    }
    .seg button + button {
      border-left: 1px solid var(--e-div);
    }
    .seg button.on {
      background: var(--e-pri);
      color: var(--e-prifg);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 0;
      border-top: 1px solid var(--e-div);
      font-size: 13.5px;
    }
    .rowmain {
      min-width: 0;
    }
    .toggle {
      margin-left: auto;
      flex: none;
      width: 34px;
      height: 20px;
      border-radius: 999px;
      background: var(--e-div);
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
      background: var(--ha-card-background, var(--card-background-color));
      border: 1px solid var(--e-div);
      box-sizing: border-box;
      transition: left 0.15s ease;
    }
    .toggle.on {
      background: var(--e-pri);
    }
    .toggle.on .knob {
      left: 16px;
      background: #fff;
      border-color: transparent;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      font-size: 12px;
      padding: 5px 11px;
      border-radius: 14px;
      border: 1px solid var(--e-div);
      background: transparent;
      color: var(--e-fg2);
    }
    .chip.on {
      background: var(--e-pri);
      color: var(--e-prifg);
      border-color: transparent;
    }
    @media (prefers-reduced-motion: reduce) {
      .toggle .knob {
        transition: none;
      }
    }
  `; }
};
__decorate([
    n$2({ attribute: false })
], SimpleIrrigationCardEditor.prototype, "hass", void 0);
__decorate([
    r$2()
], SimpleIrrigationCardEditor.prototype, "_config", void 0);
__decorate([
    r$2()
], SimpleIrrigationCardEditor.prototype, "_entries", void 0);
__decorate([
    r$2()
], SimpleIrrigationCardEditor.prototype, "_snapshot", void 0);
SimpleIrrigationCardEditor = __decorate([
    t$1("simple-irrigation-card-editor")
], SimpleIrrigationCardEditor);

/**
 * The same facts as the status card, without a card slot — for the badge row of
 * a sections dashboard. Each configured kind renders as its own pill; kinds
 * that have nothing to say (no pause, no issues) stay silent rather than
 * showing an empty state.
 */
let SimpleIrrigationBadge = class SimpleIrrigationBadge extends i$2 {
    static getStubConfig() {
        return { badges: ["state", "next"] };
    }
    setConfig(config) {
        if (!config || typeof config !== "object") {
            throw new Error("Invalid configuration");
        }
        if (config.badges) {
            if (!Array.isArray(config.badges)) {
                throw new Error("badges must be a list");
            }
            for (const kind of config.badges) {
                if (!BADGE_KINDS.includes(kind)) {
                    throw new Error(`unknown badge "${kind}"`);
                }
            }
        }
        validateAction("tap_action", config.tap_action);
        validateAction("hold_action", config.hold_action);
        this._config = { badges: ["state", "next"], ...config };
        this._resubscribe();
    }
    connectedCallback() {
        super.connectedCallback();
        this._resubscribe();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsubscribe?.then((unsub) => unsub()).catch(() => undefined);
        this._unsubscribe = undefined;
        this._stopTicker();
    }
    updated() {
        this.toggleAttribute("data-dark", Boolean(this.hass?.themes?.darkMode));
        const running = this._snapshot?.state === "running";
        if (running && this._ticker === undefined) {
            this._ticker = window.setInterval(() => this.requestUpdate(), 1000);
        }
        else if (!running) {
            this._stopTicker();
        }
    }
    _stopTicker() {
        if (this._ticker !== undefined) {
            window.clearInterval(this._ticker);
            this._ticker = undefined;
        }
    }
    _resubscribe() {
        if (!this.hass || !this._config || this._unsubscribe || !this.isConnected) {
            return;
        }
        this._unsubscribe = subscribeSnapshot(this.hass, (snapshot) => {
            this._snapshot = snapshot;
        }, this._config.entry_id);
        this._unsubscribe.catch(() => {
            this._unsubscribe = undefined;
        });
    }
    _pill(kind, snap) {
        switch (kind) {
            case "state": {
                const running = snap.state === "running" || snap.state === "stopping";
                const lead = snap.zones
                    .filter((z) => z.active)
                    .sort((a, b) => secondsUntil(b.ends_at) - secondsUntil(a.ends_at))[0];
                const label = localize(this.hass, `state_${snap.state}`);
                return {
                    icon: running ? "mdi:sprinkler-variant" : "mdi:sprinkler-variant",
                    text: running && lead
                        ? `${label} · ${countdown(secondsUntil(lead.ends_at))}`
                        : label,
                    tone: snap.state === "error" ? "err" : "",
                    drip: running,
                };
            }
            case "next": {
                const next = snap.next_runs.find((run) => !run.skipped_by_pause);
                if (!next?.fire_at)
                    return undefined;
                return {
                    icon: "mdi:clock-outline",
                    text: localize(this.hass, "badge_next", {
                        time: clock(this.hass, next.fire_at),
                    }),
                    tone: "",
                };
            }
            case "mode":
                return {
                    icon: "mdi:water-percent",
                    text: localize(this.hass, `mode_${snap.mode}`),
                    tone: "",
                };
            case "pause": {
                if (!snap.paused_until)
                    return undefined;
                return {
                    icon: "mdi:pause-circle-outline",
                    text: localize(this.hass, "badge_paused", {
                        time: dayTime(this.hass, snap.paused_until),
                    }),
                    tone: "warn",
                };
            }
            case "issues": {
                if (!snap.issue_count)
                    return undefined;
                return {
                    icon: "mdi:alert-circle-outline",
                    text: localizeCount(this.hass, "badge_issues", snap.issue_count),
                    tone: "err",
                };
            }
        }
    }
    render() {
        const snap = this._snapshot;
        if (!this.hass || !this._config || !snap)
            return A;
        const kinds = this._config.badges ?? ["state", "next"];
        const pills = kinds
            .map((kind) => this._pill(kind, snap))
            .filter((pill) => Boolean(pill));
        if (!pills.length)
            return A;
        const tap = this._config.tap_action ?? {
            action: "more-info",
        };
        const hold = this._config.hold_action ?? { action: "panel" };
        const on = isActionable(tap) || isActionable(hold);
        const options = {
            hasHold: isActionable(hold),
            disabled: !on,
            handler: (kind) => handleAction(this, this.hass, kind === "tap" ? tap : hold, {
                entityId: snap.entity_id,
                entryId: snap.entry_id,
                page: "overview",
            }),
        };
        return b `<div
      class=${e({ row: true, tappable: on })}
      role=${on ? "button" : A}
      tabindex=${on ? "0" : A}
      ${actionHandler(options)}
    >
      ${pills.map((pill) => b `<span class="badge ${pill.tone}">
          <ha-icon
            class=${e({ drip: Boolean(pill.drip) })}
            .icon=${pill.icon}
          ></ha-icon>
          <span class="txt">${pill.text}</span>
        </span>`)}
    </div>`;
    }
    static { this.styles = i$5 `
    :host {
      --b-fg: var(--primary-text-color);
      --b-fg2: var(--secondary-text-color);
      --b-div: var(--divider-color);
      --b-pri: var(--primary-color);
      --b-err: var(--error-color, #db4437);
      --b-warn: var(--warning-color, #e07c00);
      --b-warnB: color-mix(in srgb, var(--b-warn) 45%, transparent);
      --b-errB: color-mix(in srgb, var(--b-err) 45%, transparent);
      display: block;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .row.tappable {
      cursor: pointer;
      -webkit-user-select: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .row.tappable:focus-visible {
      outline: 2px solid var(--b-pri);
      outline-offset: 2px;
      border-radius: 999px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--ha-card-background, var(--card-background-color));
      border: 1px solid var(--b-div);
      border-radius: 999px;
      padding: 7px 14px 7px 11px;
      font-size: 13px;
      color: var(--b-fg);
      max-width: 100%;
    }
    .badge ha-icon {
      --mdc-icon-size: 18px;
      color: var(--b-fg2);
      flex: none;
    }
    .badge:first-child ha-icon {
      color: var(--b-pri);
    }
    .badge.warn {
      border-color: var(--b-warnB);
      color: var(--b-warn);
    }
    .badge.err {
      border-color: var(--b-errB);
      color: var(--b-err);
    }
    .badge.warn ha-icon,
    .badge.err ha-icon {
      color: currentColor;
    }
    .txt {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
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
    }
  `; }
};
__decorate([
    n$2({ attribute: false })
], SimpleIrrigationBadge.prototype, "hass", void 0);
__decorate([
    r$2()
], SimpleIrrigationBadge.prototype, "_config", void 0);
__decorate([
    r$2()
], SimpleIrrigationBadge.prototype, "_snapshot", void 0);
SimpleIrrigationBadge = __decorate([
    t$1("simple-irrigation-badge")
], SimpleIrrigationBadge);
window.customBadges = window.customBadges ?? [];
window.customBadges.push({
    type: "simple-irrigation-badge",
    name: "Simple Irrigation Badge",
    description: "Irrigation state, next run, mode and warnings as badge pills.",
    preview: true,
    documentationURL: "https://github.com/florianbaethge/simple_irrigation",
});

/** Below this the action column drops under the summary (see design, page 10). */
const NARROW_PX = 300;
/** Narrower than the concept's 232 px reference — shrink rather than clip. */
const TINY_PX = 200;
/** Duration presets offered when `manual_duration` is on. */
const DURATION_PRESETS = [5, 10];
const ACTION_ICONS = {
    run_next: "mdi:play",
    stop: "mdi:stop",
    skip_today: "mdi:calendar-remove-outline",
    pause_48h: "mdi:pause",
    pause_until: "mdi:clock-outline",
};
const STATE_ICONS = {
    idle: "mdi:sprinkler-variant",
    preparing: "mdi:progress-clock",
    running: "mdi:sprinkler-variant",
    stopping: "mdi:sprinkler-variant",
    paused: "mdi:pause-circle-outline",
    error: "mdi:alert-circle-outline",
};
let SimpleIrrigationCard = class SimpleIrrigationCard extends i$2 {
    constructor() {
        super(...arguments);
        this._busy = false;
        this._narrow = false;
        this._tiny = false;
        // --- manual run picker state (deliberately not persisted: a shared
        // dashboard should never hand the next person a pre-armed selection) ---
        this._runOpen = false;
        this._manualTab = "zones";
        this._picked = [];
        this._durationChoice = "configured";
        this._applyConditions = false;
        this._onCustomDuration = () => {
            const answer = window.prompt(localize(this.hass, "duration_custom_prompt"), String(this._durationChoice === "configured" ? 15 : this._durationChoice));
            if (!answer)
                return;
            const minutes = Number.parseInt(answer, 10);
            if (Number.isFinite(minutes) && minutes > 0 && minutes <= 1440) {
                this._durationChoice = minutes;
            }
        };
        this._onStartZones = () => {
            const zoneIds = [...this._picked];
            if (!zoneIds.length)
                return;
            const durationMin = this._durationChoice === "configured" ? undefined : this._durationChoice;
            void this._run(async () => {
                await runZones(this.hass, zoneIds, durationMin, this._config?.entry_id);
                this._picked = [];
            });
        };
    }
    static { this.styles = cardStyles; }
    static getConfigElement() {
        return document.createElement("simple-irrigation-card-editor");
    }
    static getStubConfig() {
        // Nothing required: dropped on a dashboard the card picks the only
        // installation and shows the status view.
        return {};
    }
    setConfig(config) {
        if (!config || typeof config !== "object") {
            throw new Error("Invalid configuration");
        }
        if (config.view && !CARD_VIEWS.includes(config.view)) {
            throw new Error(`view must be one of ${CARD_VIEWS.join(", ")}`);
        }
        if (config.manual_start &&
            !["off", "zones", "slot", "both"].includes(config.manual_start)) {
            throw new Error('manual_start must be "off", "zones", "slot" or "both"');
        }
        if (config.actions) {
            if (!Array.isArray(config.actions)) {
                throw new Error("actions must be a list");
            }
            for (const action of config.actions) {
                if (!CARD_ACTIONS.includes(action)) {
                    throw new Error(`unknown action "${action}"`);
                }
            }
        }
        if (config.next_runs !== undefined &&
            (typeof config.next_runs !== "number" ||
                config.next_runs < 1 ||
                config.next_runs > 12)) {
            throw new Error("next_runs must be a number between 1 and 12");
        }
        if (config.zones !== undefined &&
            config.zones !== "all" &&
            config.zones !== "active" &&
            !Array.isArray(config.zones)) {
            throw new Error('zones must be "all", "active" or a list of zone ids');
        }
        for (const keys of Object.values(ACTION_KEYS)) {
            validateAction(keys.tap, config[keys.tap]);
            validateAction(keys.hold, config[keys.hold]);
        }
        const previous = this._config;
        this._config = { ...DEFAULT_CONFIG, ...config };
        // The run view is the picker, so "off" there would render an empty card.
        if (this._config.view === "run" && this._config.manual_start === "off") {
            this._config.manual_start = "zones";
        }
        if (this._config.manual_start === "slot") {
            this._manualTab = "slot";
        }
        else if (this._config.manual_start === "zones") {
            this._manualTab = "zones";
        }
        if (previous?.entry_id !== this._config.entry_id) {
            this._snapshot = undefined;
            this._picked = [];
            this._pickedSlot = undefined;
        }
        this._resubscribe();
    }
    /** Rough height in HA's 50 px card units, so masonry can place the card. */
    getCardSize() {
        if (this._config?.compact)
            return 2;
        switch (this._config?.view) {
            case "zones":
                return 2 + Math.ceil((this._snapshot?.zones.length ?? 4) / 2);
            case "schedule":
                return 2 + (this._config.next_runs ?? DEFAULT_CONFIG.next_runs);
            case "week":
                return 5;
            case "run":
                return 5;
            default:
                return 5;
        }
    }
    /** Sections view: never demand a full-width slot (design, page 10). */
    getGridOptions() {
        if (this._config?.compact) {
            return { columns: "full", rows: 1, min_columns: 6, min_rows: 1 };
        }
        return { columns: 12, rows: "auto", min_columns: 4 };
    }
    getLayoutOptions() {
        return this._config?.compact
            ? { grid_columns: "full", grid_rows: 1 }
            : { grid_columns: 6, grid_rows: "auto", grid_min_columns: 3 };
    }
    connectedCallback() {
        super.connectedCallback();
        this._resubscribe();
        this._observeWidth();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this._teardown();
        this._stopTicker();
        this._resizeObserver?.disconnect();
        this._resizeObserver = undefined;
    }
    updated() {
        if (this.hass && !this._unsubscribe) {
            this._resubscribe();
        }
        this.toggleAttribute("data-narrow", this._narrow);
        this.toggleAttribute("data-tiny", this._tiny);
        this.toggleAttribute("data-dark", Boolean(this.hass?.themes?.darkMode));
        this._syncTicker();
    }
    _observeWidth() {
        if (this._resizeObserver || typeof ResizeObserver === "undefined")
            return;
        // Card width, not viewport width: the same card is narrow in a two-column
        // section and wide in a panel view on the very same screen.
        this._resizeObserver = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width ?? 0;
            if (width === 0)
                return;
            const narrow = width < NARROW_PX;
            const tiny = width < TINY_PX;
            if (narrow !== this._narrow)
                this._narrow = narrow;
            if (tiny !== this._tiny)
                this._tiny = tiny;
        });
        this._resizeObserver.observe(this);
    }
    // ---- data ---------------------------------------------------------------
    _teardown() {
        this._unsubscribe?.then((unsub) => unsub()).catch(() => undefined);
        this._unsubscribe = undefined;
        this._subscribedEntry = undefined;
    }
    _resubscribe() {
        if (!this.hass || !this._config || !this.isConnected)
            return;
        const entry = this._config.entry_id ?? "";
        if (this._unsubscribe && this._subscribedEntry === entry)
            return;
        this._teardown();
        this._subscribedEntry = entry;
        this._unsubscribe = subscribeSnapshot(this.hass, (snapshot) => {
            this._snapshot = snapshot;
            this._error = undefined;
            this._actionError = undefined;
            this._busy = false;
        }, this._config.entry_id);
        this._unsubscribe.catch((err) => {
            this._unsubscribe = undefined;
            // "Nothing configured" and "several installations, pick one" need
            // different answers from the user, so they get different sentences.
            this._error =
                err?.code === "ambiguous_entry"
                    ? localize(this.hass, "pick_installation")
                    : localize(this.hass, "no_installation");
        });
    }
    /** A visible countdown needs a repaint every second; nothing else does. */
    _needsTicker() {
        const snap = this._snapshot;
        if (!snap)
            return false;
        if (snap.state === "running" || snap.state === "stopping")
            return true;
        return snap.state === "preparing" && Boolean(snap.active_script_started_at);
    }
    _syncTicker() {
        if (this._needsTicker()) {
            if (this._ticker === undefined) {
                this._ticker = window.setInterval(() => this.requestUpdate(), 1000);
            }
        }
        else {
            this._stopTicker();
        }
    }
    _stopTicker() {
        if (this._ticker !== undefined) {
            window.clearInterval(this._ticker);
            this._ticker = undefined;
        }
    }
    // ---- helpers ------------------------------------------------------------
    get _cfg() {
        return { ...DEFAULT_CONFIG, type: "", ...(this._config ?? {}) };
    }
    async _run(fn) {
        this._busy = true;
        this._actionError = undefined;
        try {
            await fn();
        }
        catch (err) {
            const message = err?.message ?? String(err);
            this._actionError = localize(this.hass, "action_failed", {
                error: message,
            });
        }
        finally {
            this._busy = false;
        }
    }
    /**
     * Render a `{time}` template with the substituted value in bold, splitting on
     * the placeholder rather than concatenating — the time does not sit at the
     * end of the sentence in every language.
     */
    _sentenceWithBold(key, value) {
        const [before, after = ""] = localize(this.hass, key).split("{time}");
        return b `${before}<strong>${value}</strong>${after}`;
    }
    // ---- tap / hold ---------------------------------------------------------
    /** The configured pair for one row kind, defaults filled in. */
    _actionPair(target) {
        const keys = ACTION_KEYS[target];
        const cfg = this._cfg;
        return {
            tap: cfg[keys.tap] ?? DEFAULT_CONFIG[keys.tap],
            hold: cfg[keys.hold] ?? DEFAULT_CONFIG[keys.hold],
        };
    }
    /**
     * Everything a tappable row needs: whether it is one at all (so an
     * all-`none` configuration leaves a plain, unfocusable row behind) and the
     * directive options that run the configured action.
     */
    _tap(target, context) {
        const { tap, hold } = this._actionPair(target);
        const on = isActionable(tap) || isActionable(hold);
        return {
            on,
            options: {
                hasHold: isActionable(hold),
                disabled: !on,
                handler: (kind) => handleAction(this, this.hass, kind === "tap" ? tap : hold, {
                    entryId: this._snapshot?.entry_id,
                    ...context,
                }),
            },
        };
    }
    /** The panel page the current view belongs to. */
    _viewPage() {
        switch (this._cfg.view) {
            case "zones":
                return "zones";
            case "schedule":
                return "schedule";
            case "week":
                return "timetable";
            default:
                return "overview";
        }
    }
    _cardTap() {
        return this._tap("card", {
            entityId: this._snapshot?.entity_id,
            page: this._viewPage(),
        });
    }
    _zoneTap(zone) {
        return this._tap("zone", {
            entityId: zone.entity_id || this._snapshot?.entity_id,
            page: "zones",
        });
    }
    /** A schedule row, a week bar, or a whole day column (no slot). */
    _runTap(slotId) {
        return this._tap("run", {
            entityId: this._snapshot?.entity_id,
            slotId,
            page: slotId ? "schedule" : "timetable",
        });
    }
    /** Zones this card is configured to list. */
    _visibleZones() {
        const snap = this._snapshot;
        if (!snap)
            return [];
        const setting = this._cfg.zones;
        if (Array.isArray(setting)) {
            const wanted = new Set(setting);
            return snap.zones.filter((z) => wanted.has(z.zone_id));
        }
        if (setting === "active") {
            return snap.zones.filter((z) => z.active || z.queued);
        }
        return snap.zones;
    }
    _nextRun() {
        return this._snapshot?.next_runs.find((run) => !run.skipped_by_pause);
    }
    _stateLabel() {
        return localize(this.hass, `state_${this._snapshot?.state ?? "idle"}`);
    }
    _pillClass() {
        switch (this._snapshot?.state) {
            case "running":
            case "stopping":
            case "preparing":
                return "pri";
            case "paused":
                return "warn";
            case "error":
                return "err";
            default:
                return "";
        }
    }
    /** Active zones, longest remaining first — the headline is the phase's end. */
    _activeZones() {
        const zones = (this._snapshot?.zones ?? []).filter((z) => z.active);
        return zones.sort((a, b) => secondsUntil(b.ends_at) - secondsUntil(a.ends_at));
    }
    // ---- render -------------------------------------------------------------
    render() {
        if (!this.hass || !this._config)
            return A;
        if (!this._snapshot) {
            return b `<ha-card>
        <div class="empty">
          ${this._error ?? localize(this.hass, "loading")}
        </div>
      </ha-card>`;
        }
        if (this._cfg.compact)
            return this._renderCompact();
        const view = this._cfg.view;
        return b `<ha-card>
      ${view === "status" ? this._renderStatus() : A}
      ${view === "zones" ? this._renderZones() : A}
      ${view === "schedule" ? this._renderSchedule() : A}
      ${view === "week" ? this._renderWeek() : A}
      ${view === "run" ? this._renderRun(false) : A}
      ${view !== "run" && this._cfg.manual_start !== "off"
            ? b `<div class="section">${this._renderRun(true)}</div>`
            : A}
      ${this._actionError
            ? b `<div class="error">${this._actionError}</div>`
            : A}
    </ha-card>`;
    }
    // ---- status -------------------------------------------------------------
    _renderStatus() {
        const snap = this._snapshot;
        if (!snap.enabled)
            return this._renderDisabled();
        switch (snap.state) {
            case "running":
            case "stopping":
                return this._renderRunning();
            case "preparing":
                return this._renderPreparing();
            case "paused":
                return this._renderPaused();
            case "error":
                return this._renderError();
            default:
                return this._renderIdle();
        }
    }
    _renderHeader() {
        const snap = this._snapshot;
        const running = snap.state === "running" || snap.state === "stopping";
        const tap = this._cardTap();
        return b `<div
      class=${e({ head: true, tappable: tap.on })}
      role=${tap.on ? "button" : A}
      tabindex=${tap.on ? "0" : A}
      ${actionHandler(tap.options)}
    >
      <ha-icon
        class=${e({ drip: running })}
        .icon=${STATE_ICONS[snap.state] ?? STATE_ICONS.idle}
      ></ha-icon>
      <span class="title">${snap.name}</span>
      <span class="pill ${this._pillClass()}">
        <span class="dot"></span>${this._stateLabel()}
      </span>
    </div>`;
    }
    _renderIdle() {
        this._snapshot;
        const next = this._nextRun();
        return b `
      ${this._renderHeader()}
      <div class="body">
        <div class="summary">
          <div class="label">${localize(this.hass, "next_run")}</div>
          ${next
            ? b `
                <div class="big">${dayTime(this.hass, next.fire_at)}</div>
                <div class="sub">
                  ${leadTime(this.hass, next.fire_at)}${next.name
                ? ` · ${next.name}`
                : ""}
                </div>
                <div class="meta">
                  ${cadenceLabel(this.hass, next.cadence)
                ? b `<span>
                        <ha-icon icon="mdi:repeat-variant"></ha-icon>
                        ${cadenceLabel(this.hass, next.cadence)}
                      </span>`
                : A}
                  <span>
                    <ha-icon icon="mdi:format-list-numbered"></ha-icon>
                    ${localizeCount(this.hass, "zones_count", next.zone_names.length)}
                  </span>
                  <span>
                    <ha-icon icon="mdi:timer-outline"></ha-icon>
                    <strong>~${next.duration_min}</strong>
                    ${localize(this.hass, "unit_minute_short")}
                  </span>
                </div>
              `
            : b `
                <div class="big">${localize(this.hass, "no_next_run")}</div>
                <div class="sub">${localize(this.hass, "no_next_run_hint")}</div>
              `}
        </div>
        ${this._renderActions()} ${this._renderModeRow()}
      </div>
    `;
    }
    _renderActions() {
        const snap = this._snapshot;
        const busyRun = snap.state === "running" || snap.state === "preparing";
        // Stop only earns a slot while there is something to stop; the running
        // layout carries its own Stop button.
        const actions = this._cfg.actions.filter((action) => action !== "stop" || busyRun);
        if (!actions.length)
            return A;
        const hasNext = Boolean(this._nextRun() ?? snap.next_runs.length);
        return b `<div class="actions">
      ${actions.map((action, index) => {
            const primary = index === 0 && action !== "stop";
            const danger = action === "stop";
            const disabled = this._busy ||
                (action === "run_next" && (!hasNext || busyRun)) ||
                (action === "stop" && !busyRun);
            return b `<button
          class=${e({ btn: true, primary, danger })}
          ?disabled=${disabled}
          @click=${() => this._onAction(action)}
        >
          <ha-icon .icon=${ACTION_ICONS[action]}></ha-icon>
          <span>${localize(this.hass, `action_${action}`)}</span>
        </button>`;
        })}
    </div>`;
    }
    _onAction(action) {
        const entry = this._config?.entry_id;
        switch (action) {
            case "run_next":
                void this._run(() => runNext(this.hass, entry));
                break;
            case "stop":
                void this._run(() => stopAll(this.hass, entry));
                break;
            case "skip_today":
                void this._run(() => skipToday(this.hass, entry));
                break;
            case "pause_48h":
                void this._run(() => pauseHours(this.hass, 48, entry));
                break;
            case "pause_until": {
                const suggestion = new Date(Date.now() + 24 * 3600 * 1000);
                const local = new Date(suggestion.getTime() - suggestion.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
                const answer = window.prompt(localize(this.hass, "action_pause_until"), local);
                if (answer)
                    void this._run(() => pauseUntil(this.hass, answer, entry));
                break;
            }
        }
    }
    _renderModeRow() {
        const snap = this._snapshot;
        if (!this._cfg.show_mode)
            return A;
        return b `<div class="foot">
      <span class="cap">
        ${localize(this.hass, this._narrow ? "mode_short" : "watering_mode")}
      </span>
      <div class="seg">
        ${snap.modes.map((mode) => b `<button
            class=${e({ on: mode === snap.mode })}
            ?disabled=${this._busy}
            @click=${() => this._onMode(mode)}
          >
            ${localize(this.hass, `mode_${mode}`)}
          </button>`)}
      </div>
    </div>`;
    }
    _onMode(mode) {
        if (mode === this._snapshot?.mode)
            return;
        void this._run(() => setMode(this.hass, mode, this._config?.entry_id));
    }
    _renderRunning() {
        const snap = this._snapshot;
        const active = this._activeZones();
        const lead = active[0];
        const remaining = lead ? secondsUntil(lead.ends_at) : 0;
        const total = (lead?.duration_min ?? 0) * 60;
        const progress = total > 0 ? Math.min(100, (1 - remaining / total) * 100) : 0;
        const queued = snap.zones.filter((z) => z.queued && !z.active);
        const footParts = [
            snap.phase_index && snap.phase_total
                ? localize(this.hass, "phase_of", {
                    index: snap.phase_index,
                    total: snap.phase_total,
                })
                : "",
            localize(this.hass, `mode_${snap.mode}`),
            snap.run_ends_at
                ? localize(this.hass, "ends_at", {
                    time: clock(this.hass, snap.run_ends_at),
                })
                : "",
        ].filter(Boolean);
        return b `
      ${this._renderHeader()}
      <div class="body run">
        ${lead
            ? b `
              <div class="label">
                ${localize(this.hass, "remaining", { zone: lead.name })}
              </div>
              <div class="big pri">${countdown(remaining)}</div>
              <div class="bar">
                <i style=${o$1({ width: `${progress}%` })}></i>
              </div>
            `
            : A}
        <div class="queue">
          ${active.map((zone) => b `<div class="qrow">
              <span class="qdot"></span>
              <span class="name">${zone.name}</span>
              <span class="val">${countdown(secondsUntil(zone.ends_at))}</span>
            </div>`)}
          ${queued.length
            ? b `<div class="qrow pending">
                <span class="qdot"></span>
                <span class="name">
                  ${queued.map((z) => z.name).join(", ")}
                </span>
                <span class="val">${localize(this.hass, "queued")}</span>
              </div>`
            : A}
        </div>
        <div class="runfoot">
          <span class="cap">${footParts.join(" · ")}</span>
          <button
            class="btn danger inline"
            ?disabled=${this._busy}
            @click=${() => this._onAction("stop")}
          >
            ${localize(this.hass, "action_stop")}
          </button>
        </div>
      </div>
    `;
    }
    _renderPreparing() {
        const snap = this._snapshot;
        const started = snap.active_script_started_at;
        const timeout = snap.active_script_timeout_sec ?? 0;
        const elapsed = started
            ? Math.max(0, (Date.now() - new Date(started).getTime()) / 1000)
            : 0;
        const progress = timeout > 0 ? Math.min(100, (elapsed / timeout) * 100) : 0;
        const upNext = snap.zones.filter((z) => z.queued || z.active);
        return b `<div class="state">
      <div class="srow">
        <ha-icon icon="mdi:progress-clock" style="color:var(--si-pri)"></ha-icon>
        <span class="title">${snap.name}</span>
        <span class="pill pri">${this._stateLabel()}</span>
      </div>
      ${snap.active_script
            ? b `
            <div class="stext">
              ${localize(this.hass, "waiting_for_script")}
            </div>
            <div class="smono">
              ${snap.active_script}
              ${timeout
                ? ` · ${countdown(elapsed)} / ${countdown(timeout)}`
                : ""}
            </div>
            ${timeout
                ? b `<div class="bar thin">
                  <i style=${o$1({ width: `${progress}%` })}></i>
                </div>`
                : A}
          `
            : b `<div class="stext">
            ${upNext.map((z) => z.name).join(", ") ||
                localize(this.hass, "state_preparing")}
          </div>`}
    </div>`;
    }
    _renderPaused() {
        const snap = this._snapshot;
        return b `<div class="state">
      <div class="srow">
        <ha-icon
          icon="mdi:pause-circle-outline"
          style="color:var(--si-warn)"
        ></ha-icon>
        <span class="title">${snap.name}</span>
        <span class="pill warn">${this._stateLabel()}</span>
      </div>
      <div class="stext">
        ${this._sentenceWithBold("paused_until", snap.paused_until ? dayTime(this.hass, snap.paused_until) : "")}
      </div>
      <div class="snote">${localize(this.hass, "paused_manual_note")}</div>
      <div class="sbtns">
        <button
          class="btn inline small outline-pri"
          ?disabled=${this._busy}
          @click=${() => this._run(() => clearPause(this.hass, this._config?.entry_id))}
        >
          ${localize(this.hass, "resume_schedule")}
        </button>
      </div>
    </div>`;
    }
    _renderError() {
        const snap = this._snapshot;
        return b `<div class="state">
      <div class="srow">
        <ha-icon
          icon="mdi:alert-circle-outline"
          style="color:var(--si-err)"
        ></ha-icon>
        <span class="title">${snap.name}</span>
        <span class="pill err">${this._stateLabel()}</span>
      </div>
      <div class="stext">${localize(this.hass, "last_run_failed")}</div>
      ${snap.last_error
            ? b `<div class="scode">${snap.last_error}</div>`
            : A}
      <div class="sbtns">
        <button
          class="btn inline small"
          ?disabled=${this._busy}
          @click=${() => this._run(() => clearError(this.hass, this._config?.entry_id))}
        >
          ${localize(this.hass, "clear_error")}
        </button>
        <button
          class="btn inline small outline-pri"
          ?disabled=${this._busy || !this._snapshot?.next_runs.length}
          @click=${() => this._onAction("run_next")}
        >
          ${localize(this.hass, "action_run_next")}
        </button>
      </div>
    </div>`;
    }
    _renderDisabled() {
        const snap = this._snapshot;
        return b `<div class="state">
      <div class="srow">
        <ha-icon icon="mdi:power-off" style="color:var(--si-fg2)"></ha-icon>
        <span class="title">${snap.name}</span>
        <span class="pill">${localize(this.hass, "disabled_title")}</span>
      </div>
      <div class="snote">${localize(this.hass, "disabled_note")}</div>
    </div>`;
    }
    // ---- zones --------------------------------------------------------------
    _zoneSub(zone) {
        if (zone.issue) {
            const key = zone.issue.reason === "unavailable"
                ? "zone_issue_unavailable"
                : zone.issue.reason === "missing"
                    ? "zone_issue_missing"
                    : "zone_issue_no_output";
            return {
                text: localize(this.hass, key, { entity: zone.issue.entity_id }),
                cls: "warn",
            };
        }
        if (zone.active) {
            return {
                text: localize(this.hass, "zone_watering", {
                    time: countdown(secondsUntil(zone.ends_at)),
                }),
                cls: "pri",
            };
        }
        if (!zone.enabled) {
            return { text: localize(this.hass, "zone_disabled"), cls: "" };
        }
        if (zone.next_run) {
            return {
                text: localize(this.hass, "zone_next", {
                    time: dayTimeShort(this.hass, zone.next_run),
                }),
                cls: "",
            };
        }
        return { text: localize(this.hass, "zone_no_next"), cls: "" };
    }
    _renderZones() {
        const snap = this._snapshot;
        const zones = this._visibleZones();
        const headTap = this._cardTap();
        return b `
      <div
        class=${e({ head: true, tappable: headTap.on })}
        role=${headTap.on ? "button" : A}
        tabindex=${headTap.on ? "0" : A}
        ${actionHandler(headTap.options)}
      >
        <ha-icon icon="mdi:water-outline"></ha-icon>
        <span class="title">${localize(this.hass, "zones_title")}</span>
        ${snap.issue_count
            ? b `<span class="pill warn issues">
              <ha-icon icon="mdi:alert-outline"></ha-icon>
              ${localizeCount(this.hass, "issues_count", snap.issue_count)}
            </span>`
            : A}
      </div>
      ${zones.length
            ? b `<div class="zbody">
            ${zones.map((zone) => {
                const sub = this._zoneSub(zone);
                const tap = this._zoneTap(zone);
                return b `<div
                class=${e({
                    zrow: true,
                    disabled: !zone.enabled,
                    tappable: tap.on,
                })}
                role=${tap.on ? "button" : A}
                tabindex=${tap.on ? "0" : A}
                ${actionHandler(tap.options)}
              >
                ${zone.issue
                    ? b `<ha-icon
                      class="zwarn"
                      icon="mdi:alert-circle"
                    ></ha-icon>`
                    : b `<span
                      class=${e({
                        zdot: true,
                        on: zone.active,
                        off: !zone.active && zone.enabled,
                        dis: !zone.enabled,
                    })}
                    ></span>`}
                <div class="zmain">
                  <div class="zname">${zone.name}</div>
                  <div class="zsub ${sub.cls}">${sub.text}</div>
                </div>
                <span class="zdur">
                  ${localize(this.hass, "duration_minutes", {
                    n: zone.duration_min,
                })}
                </span>
              </div>`;
            })}
            <div class="znote">
              ${localize(this.hass, "zones_footnote", {
                mode: localize(this.hass, `mode_${snap.mode}`),
            })}
            </div>
          </div>`
            : b `<div class="empty">${localize(this.hass, "zones_empty")}</div>`}
    `;
    }
    // ---- schedule -----------------------------------------------------------
    _renderSchedule() {
        const snap = this._snapshot;
        const limit = this._cfg.next_runs;
        const runs = snap.next_runs.slice(0, limit);
        const headTap = this._cardTap();
        return b `
      <div
        class=${e({ head: true, tappable: headTap.on })}
        role=${headTap.on ? "button" : A}
        tabindex=${headTap.on ? "0" : A}
        ${actionHandler(headTap.options)}
      >
        <ha-icon icon="mdi:calendar-clock"></ha-icon>
        <span class="title">${localize(this.hass, "schedule_title")}</span>
        ${snap.slots.length
            ? b `<span class="count">
              ${localize(this.hass, "slots_of", {
                shown: runs.length,
                total: snap.slots.length,
            })}
            </span>`
            : A}
      </div>
      ${runs.length
            ? b `<div class="sbody">
            ${runs.map((run, index) => {
                // Dashed once a run is further out than the next 24 hours —
                // the design's shorthand for "not what happens next".
                const far = secondsUntil(run.fire_at) > 86_400;
                const cadence = cadenceLabel(this.hass, run.cadence);
                const what = [run.name, cadence].filter(Boolean).join(" · ");
                const tap = this._runTap(run.slot_id);
                return b `<div
                class=${e({
                    srun: true,
                    next: index === 0 && !run.skipped_by_pause,
                    far,
                    skipped: Boolean(run.skipped_by_pause),
                    tappable: tap.on,
                })}
                role=${tap.on ? "button" : A}
                tabindex=${tap.on ? "0" : A}
                ${actionHandler(tap.options)}
              >
                <div class="sline">
                  <span class="swhen">${dayTime(this.hass, run.fire_at)}</span>
                  ${what ? b `<span class="swhat">${what}</span>` : A}
                  <span class="sdur">
                    ${run.skipped_by_pause
                    ? localize(this.hass, "skipped_by_pause")
                    : approxMinutes(this.hass, run.duration_min)}
                  </span>
                </div>
                ${!far && run.zone_names.length
                    ? b `<div class="szones">
                      ${run.zone_names.join(", ")}
                    </div>`
                    : A}
              </div>`;
            })}
            <div class="znote">
              ${localize(this.hass, "schedule_footnote")}
            </div>
          </div>`
            : b `<div class="empty">
            ${localize(this.hass, "schedule_empty")}
          </div>`}
    `;
    }
    // ---- week ---------------------------------------------------------------
    /**
     * Bar height from duration. Literal proportion would render a 20-minute run
     * as one pixel in a 24-hour column, so the scale is offset — the design's own
     * 20 min → 7 px, 40 min → 12 px.
     */
    _barHeight(minutes) {
        return Math.max(5, Math.min(48, 2 + minutes / 4));
    }
    _renderWeek() {
        const snap = this._snapshot;
        const week = snap.week;
        const short = weekdayNames(this.hass, "short");
        const narrow = weekdayNames(this.hass, "narrow");
        const hasParity = week.days.some((d) => d.runs.some((run) => run.parity_only));
        const headTap = this._cardTap();
        if (!week.days.length || !snap.slots.length) {
            return b `
        <div
          class=${e({ head: true, tappable: headTap.on })}
          role=${headTap.on ? "button" : A}
          tabindex=${headTap.on ? "0" : A}
          ${actionHandler(headTap.options)}
        >
          <ha-icon icon="mdi:calendar-week"></ha-icon>
          <span class="title">${localize(this.hass, "week_title")}</span>
        </div>
        <div class="empty">${localize(this.hass, "week_empty")}</div>
      `;
        }
        return b `
      <div
        class=${e({ head: true, tappable: headTap.on })}
        role=${headTap.on ? "button" : A}
        tabindex=${headTap.on ? "0" : A}
        ${actionHandler(headTap.options)}
      >
        <ha-icon icon="mdi:calendar-week"></ha-icon>
        <span class="title">${localize(this.hass, "week_title")}</span>
        <span class="count">
          ${localizeCount(this.hass, "week_summary", week.total_runs, {
            runs: week.total_runs,
            time: duration(this.hass, week.total_min),
        })}
        </span>
      </div>
      <div class="wbody">
        <div class="wgrid">
          ${week.days.map((day) => {
            const date = new Date(day.date);
            const label = this._narrow
                ? narrow[day.weekday]
                : `${short[day.weekday]} ${date.getDate()}`;
            const dayTap = this._runTap();
            return b `<div
              class=${e({ wcol: true, today: day.today })}
            >
              <div class="wday">${label}</div>
              <div
                class=${e({ wtrack: true, tappable: dayTap.on })}
                role=${dayTap.on ? "button" : A}
                tabindex=${dayTap.on ? "0" : A}
                aria-label=${dayTap.on ? label : A}
                ${actionHandler(dayTap.options)}
              >
                ${day.runs.map((run) => {
                const barTap = this._runTap(run.slot_id);
                return b `<div
                    class=${e({
                    wbar: true,
                    parity: run.parity_only,
                    paused: run.paused && !run.parity_only,
                    tappable: barTap.on,
                })}
                    ${actionHandler(barTap.options)}
                    style=${o$1({
                    top: `${(run.start_min / 1440) * 100}%`,
                    height: `${this._barHeight(run.duration_min)}px`,
                })}
                    title=${[
                    run.name,
                    `${String(Math.floor(run.start_min / 60)).padStart(2, "0")}:${String(run.start_min % 60).padStart(2, "0")}`,
                    duration(this.hass, run.duration_min),
                ]
                    .filter(Boolean)
                    .join(" · ")}
                  ></div>`;
            })}
              </div>
              <div class="wtot">
                ${day.paused
                ? localize(this.hass, "week_paused")
                : day.total_min
                    ? `${day.total_min}′`
                    : "—"}
              </div>
            </div>`;
        })}
        </div>
        <div class="wlegend">
          <span><span class="lkey"></span>${localize(this.hass, "legend_run")}</span>
          ${hasParity
            ? b `<span>
                <span class="lkey dash"></span>
                ${localize(this.hass, "legend_parity_odd")}
              </span>`
            : A}
          <span>${localize(this.hass, "legend_scale")}</span>
        </div>
      </div>
    `;
    }
    // ---- manual run ---------------------------------------------------------
    _renderRun(collapsible) {
        const snap = this._snapshot;
        // A manual run in flight replaces the picker with what it produced. Keyed
        // on the run states rather than on `manual_run`, which outlives the run it
        // describes — a paused installation would otherwise keep offering to stop
        // something that finished long ago.
        const inFlight = ["preparing", "running", "stopping"].includes(snap.state);
        if (snap.manual_run && inFlight) {
            const lead = this._activeZones()[0];
            return b `<div class="collapse">
        <ha-icon class="drip" icon="mdi:sprinkler-variant"></ha-icon>
        <div class="cmain">
          <div class="ctitle">${localize(this.hass, "manual_run_started")}</div>
          <div class="csub pri">
            ${lead
                ? localize(this.hass, "run_progress", {
                    zone: lead.name,
                    time: countdown(secondsUntil(lead.ends_at)),
                    index: snap.phase_index ?? 1,
                    total: snap.phase_total ?? 1,
                })
                : this._stateLabel()}
          </div>
        </div>
        <button
          class="btn danger inline"
          ?disabled=${this._busy}
          @click=${() => this._onAction("stop")}
        >
          ${localize(this.hass, "action_stop")}
        </button>
      </div>`;
        }
        if (collapsible && !this._runOpen) {
            return b `<button
        class="collapse"
        aria-expanded="false"
        @click=${() => {
                this._runOpen = true;
            }}
      >
        <ha-icon icon="mdi:play-circle-outline"></ha-icon>
        <div class="cmain">
          <div class="ctitle">${localize(this.hass, "run_title")}</div>
          <div class="csub">${localize(this.hass, "run_subtitle")}</div>
        </div>
        <ha-icon class="chev" icon="mdi:chevron-down"></ha-icon>
      </button>`;
        }
        const both = this._cfg.manual_start === "both";
        const tab = both
            ? this._manualTab
            : this._cfg.manual_start === "slot"
                ? "slot"
                : "zones";
        return b `
      <div class="head run">
        <ha-icon icon="mdi:play-circle-outline"></ha-icon>
        <span class="title">${localize(this.hass, "run_title")}</span>
        ${both
            ? b `<div class="seg tight">
              <button
                class=${e({ on: tab === "zones" })}
                @click=${() => {
                this._manualTab = "zones";
            }}
              >
                ${localize(this.hass, "run_tab_zones")}
              </button>
              <button
                class=${e({ on: tab === "slot" })}
                @click=${() => {
                this._manualTab = "slot";
            }}
              >
                ${localize(this.hass, "run_tab_slot")}
              </button>
            </div>`
            : A}
        ${collapsible
            ? b `<button
              class="chevbtn"
              aria-expanded="true"
              aria-label=${localize(this.hass, "run_title")}
              @click=${() => {
                this._runOpen = false;
            }}
            >
              <ha-icon class="chev up" icon="mdi:chevron-down"></ha-icon>
            </button>`
            : A}
      </div>
      ${tab === "zones" ? this._renderRunZones() : this._renderRunSlot()}
    `;
    }
    _durationFor(zone) {
        return this._durationChoice === "configured"
            ? zone.duration_min
            : this._durationChoice;
    }
    _renderRunZones() {
        const snap = this._snapshot;
        const zones = snap.zones;
        const picked = zones.filter((z) => this._picked.includes(z.zone_id));
        const totalMin = picked.reduce((sum, z) => sum + this._durationFor(z), 0);
        return b `<div class="rbody">
      <div class="label">
        ${picked.length
            ? localize(this.hass, "run_zones_label", { count: picked.length })
            : localize(this.hass, "run_zones_none")}
      </div>
      <div class="chips">
        ${zones.map((zone) => {
            const on = this._picked.includes(zone.zone_id);
            // A disabled zone stays visible but is not selectable; a zone with a
            // broken output is selectable and fails loudly (design, page 7).
            const selectable = zone.enabled;
            return b `<button
            class=${e({
                chip: true,
                on,
                warn: Boolean(zone.issue) && !on,
                dis: !selectable,
            })}
            ?disabled=${!selectable}
            @click=${() => this._toggleZone(zone.zone_id)}
          >
            ${on
                ? b `<ha-icon icon="mdi:check"></ha-icon>`
                : zone.issue
                    ? b `<ha-icon icon="mdi:alert-circle-outline"></ha-icon>`
                    : A}
            ${zone.name}
          </button>`;
        })}
      </div>
      ${this._cfg.manual_duration
            ? b `<div class="rrow">
            <span class="cap">${localize(this.hass, "duration")}</span>
            <div class="seg tight">
              <button
                class=${e({ on: this._durationChoice === "configured" })}
                @click=${() => {
                this._durationChoice = "configured";
            }}
              >
                ${localize(this.hass, "duration_configured")}
              </button>
              ${DURATION_PRESETS.map((n) => b `<button
                  class=${e({ on: this._durationChoice === n })}
                  @click=${() => {
                this._durationChoice = n;
            }}
                >
                  ${localize(this.hass, "duration_minutes", { n })}
                </button>`)}
              <button
                class=${e({
                on: this._durationChoice !== "configured" &&
                    !DURATION_PRESETS.includes(this._durationChoice),
            })}
                @click=${this._onCustomDuration}
              >
                ${localize(this.hass, "duration_custom")}
              </button>
            </div>
          </div>`
            : A}
      <div class="rlaunch">
        <span class="cap">
          ${picked.length
            ? localize(this.hass, "runs_in_sequence", {
                parts: picked
                    .map((z) => `${this._durationFor(z)}`)
                    .join(" + ")
                    .concat(` ${localize(this.hass, "unit_minute_short")}`),
            })
            : localize(this.hass, "select_zones_first")}
        </span>
        <button
          class="btn primary"
          ?disabled=${this._busy || !picked.length}
          @click=${this._onStartZones}
        >
          <ha-icon icon="mdi:play"></ha-icon>
          ${picked.length
            ? localizeCount(this.hass, "start_zones", picked.length, {
                count: picked.length,
                time: duration(this.hass, totalMin),
            })
            : localize(this.hass, "start_zones_none")}
        </button>
      </div>
    </div>`;
    }
    _toggleZone(zoneId) {
        this._picked = this._picked.includes(zoneId)
            ? this._picked.filter((id) => id !== zoneId)
            : [...this._picked, zoneId];
    }
    _renderRunSlot() {
        const snap = this._snapshot;
        const slots = snap.slots;
        const selected = slots.find((slot) => slot.slot_id === this._pickedSlot) ??
            slots.find((slot) => slot.enabled && slot.zone_ids.length);
        if (!slots.length) {
            return b `<div class="empty">${localize(this.hass, "no_slots")}</div>`;
        }
        return b `<div class="rbody">
      <div class="label">${localize(this.hass, "run_slot_label")}</div>
      <div style="margin-top:4px">
        ${slots.map((slot) => {
            const on = slot.slot_id === selected?.slot_id;
            const runnable = slot.enabled && slot.zone_ids.length > 0;
            return b `<button
            class=${e({ slotrow: true, on, disabled: !runnable })}
            ?disabled=${!runnable}
            @click=${() => {
                this._pickedSlot = slot.slot_id;
            }}
          >
            <span class=${e({ radio: true, on })}></span>
            <div class="slotmain">
              <div class="slotname">
                ${slot.name || cadenceLabel(this.hass, slot.cadence)}
              </div>
              <div class="slotsub">${slot.zone_names.join(", ")}</div>
            </div>
            <span class="slotdur">
              ${approxMinutes(this.hass, slot.duration_min)}
            </span>
          </button>`;
        })}
      </div>
      <div class="rrow">
        <span class="cap">${localize(this.hass, "apply_conditions")}</span>
        <button
          class=${e({ toggle: true, on: this._applyConditions })}
          role="switch"
          aria-checked=${this._applyConditions}
          aria-label=${localize(this.hass, "apply_conditions")}
          @click=${() => {
            this._applyConditions = !this._applyConditions;
        }}
        >
          <span class="knob"></span>
        </button>
      </div>
      <div class="rlaunch">
        <span class="cap">
          ${localize(this.hass, this._applyConditions ? "apply_conditions_on" : "apply_conditions_off")}
        </span>
        <button
          class="btn primary"
          ?disabled=${this._busy || !selected}
          @click=${() => selected && this._onStartSlot(selected)}
        >
          <ha-icon icon="mdi:play"></ha-icon>
          ${localize(this.hass, "start_slot", {
            time: duration(this.hass, selected?.duration_min ?? 0),
        })}
        </button>
      </div>
    </div>`;
    }
    _onStartSlot(slot) {
        void this._run(() => runSlot(this.hass, slot.slot_id, this._applyConditions, this._config?.entry_id));
    }
    // ---- compact ------------------------------------------------------------
    _renderCompact() {
        if (this._cfg.view === "zones")
            return this._renderCompactZones();
        const snap = this._snapshot;
        const running = snap.state === "running" || snap.state === "stopping";
        const paused = snap.state === "paused";
        const error = snap.state === "error";
        const lead = this._activeZones()[0];
        const next = this._nextRun();
        let stateText;
        let stateCls = "";
        if (running && lead) {
            stateText = localize(this.hass, "compact_running", {
                zone: lead.name,
                time: countdown(secondsUntil(lead.ends_at)),
                index: snap.phase_index ?? 1,
                total: snap.phase_total ?? 1,
            });
            stateCls = "pri";
        }
        else if (paused && snap.paused_until) {
            stateText = localize(this.hass, "compact_paused", {
                time: dayTime(this.hass, snap.paused_until),
            });
            stateCls = "warn";
        }
        else if (error) {
            stateText = snap.last_error ?? localize(this.hass, "last_run_failed");
            stateCls = "err";
        }
        else if (next) {
            stateText = localize(this.hass, "compact_idle", {
                state: this._stateLabel(),
                time: dayTimeShort(this.hass, next.fire_at),
                duration: duration(this.hass, next.duration_min),
            });
        }
        else {
            stateText = localize(this.hass, "compact_idle_no_run", {
                state: this._stateLabel(),
            });
        }
        const icon = paused
            ? "mdi:pause"
            : error
                ? "mdi:alert-circle-outline"
                : "mdi:sprinkler-variant";
        const tap = this._tap("card", {
            entityId: snap.entity_id,
            page: "overview",
        });
        return b `<ha-card>
      <div class="crow">
        <div
          class=${e({ ctap: true, tappable: tap.on })}
          role=${tap.on ? "button" : A}
          tabindex=${tap.on ? "0" : A}
          ${actionHandler(tap.options)}
        >
          <div
            class=${e({
            cicon: true,
            pri: running,
            warn: paused,
            err: error,
        })}
          >
            <ha-icon class=${e({ drip: running })} .icon=${icon}></ha-icon>
          </div>
          <div class="cmain">
            <div class="cname">${snap.name}</div>
            <div class="cstate ${stateCls}">${stateText}</div>
          </div>
        </div>
        ${this._renderCompactAction(running, paused)}
      </div>
      ${this._actionError
            ? b `<div class="error">${this._actionError}</div>`
            : A}
    </ha-card>`;
    }
    _renderCompactAction(running, paused) {
        if (running) {
            return b `<button
        class="cbtn danger"
        ?disabled=${this._busy}
        aria-label=${localize(this.hass, "action_stop")}
        @click=${() => this._onAction("stop")}
      >
        <ha-icon icon="mdi:stop"></ha-icon>
      </button>`;
        }
        if (paused) {
            return b `<button
        class="cbtn muted"
        ?disabled=${this._busy}
        aria-label=${localize(this.hass, "resume_schedule")}
        @click=${() => this._run(() => clearPause(this.hass, this._config?.entry_id))}
      >
        <ha-icon icon="mdi:play-pause"></ha-icon>
      </button>`;
        }
        return b `<button
      class="cbtn"
      ?disabled=${this._busy || !this._snapshot?.next_runs.length}
      aria-label=${localize(this.hass, "action_run_next")}
      @click=${() => this._onAction("run_next")}
    >
      <ha-icon icon="mdi:play"></ha-icon>
    </button>`;
    }
    _renderCompactZones() {
        const zones = this._visibleZones();
        if (!zones.length) {
            return b `<ha-card>
        <div class="empty">${localize(this.hass, "zones_empty")}</div>
      </ha-card>`;
        }
        return b `<ha-card>
      <div class="zc">
        ${zones.map((zone) => {
            const sub = this._zoneSub(zone);
            const tap = this._zoneTap(zone);
            return b `<div
            class=${e({
                zcrow: true,
                on: zone.active,
                tappable: tap.on,
            })}
            role=${tap.on ? "button" : A}
            tabindex=${tap.on ? "0" : A}
            ${actionHandler(tap.options)}
          >
            <span
              class=${e({
                zdot: true,
                on: zone.active,
                off: !zone.active && zone.enabled,
                dis: !zone.enabled,
            })}
            ></span>
            <span class="name">${zone.name}</span>
            <span class="val">
              ${zone.active
                ? countdown(secondsUntil(zone.ends_at))
                : sub.text}
            </span>
          </div>`;
        })}
      </div>
    </ha-card>`;
    }
};
__decorate([
    n$2({ attribute: false })
], SimpleIrrigationCard.prototype, "hass", void 0);
__decorate([
    r$2()
], SimpleIrrigationCard.prototype, "_config", void 0);
__decorate([
    r$2()
], SimpleIrrigationCard.prototype, "_snapshot", void 0);
__decorate([
    r$2()
], SimpleIrrigationCard.prototype, "_error", void 0);
__decorate([
    r$2()
], SimpleIrrigationCard.prototype, "_actionError", void 0);
__decorate([
    r$2()
], SimpleIrrigationCard.prototype, "_busy", void 0);
__decorate([
    r$2()
], SimpleIrrigationCard.prototype, "_narrow", void 0);
__decorate([
    r$2()
], SimpleIrrigationCard.prototype, "_tiny", void 0);
__decorate([
    r$2()
], SimpleIrrigationCard.prototype, "_runOpen", void 0);
__decorate([
    r$2()
], SimpleIrrigationCard.prototype, "_manualTab", void 0);
__decorate([
    r$2()
], SimpleIrrigationCard.prototype, "_picked", void 0);
__decorate([
    r$2()
], SimpleIrrigationCard.prototype, "_pickedSlot", void 0);
__decorate([
    r$2()
], SimpleIrrigationCard.prototype, "_durationChoice", void 0);
__decorate([
    r$2()
], SimpleIrrigationCard.prototype, "_applyConditions", void 0);
SimpleIrrigationCard = __decorate([
    t$1("simple-irrigation-card")
], SimpleIrrigationCard);
window.customCards = window.customCards ?? [];
window.customCards.push({
    type: "simple-irrigation-card",
    name: "Simple Irrigation Card",
    description: "Status, zones, schedule, week timetable and a manual run picker for one irrigation installation.",
    preview: true,
    documentationURL: "https://github.com/florianbaethge/simple_irrigation",
});
// eslint-disable-next-line no-console
console.info(`%c SIMPLE-IRRIGATION-CARD %c ${"1.8.0"} `, "color: #fff; background: #03a9f4; font-weight: 700;", "color: #03a9f4; background: #fff; font-weight: 700;");

export { SimpleIrrigationCard };
//# sourceMappingURL=simple-irrigation-card.js.map
