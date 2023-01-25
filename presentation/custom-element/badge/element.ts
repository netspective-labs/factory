import * as block from "./block.ts";

declare global {
  interface Window {
    // get past Deno errors without requiring <reference lib="dom"/>
    // deno-lint-ignore no-explicit-any
    customElements: any;
  }
}

// get past Deno errors without requiring <reference lib="dom"/>
declare class HTMLElement {
  public innerHTML: string;
  public getAttribute(name: string): string;
  public setAttribute(name: string, value: string): void;
}

class BadgenBadgeElement extends HTMLElement {
  static badgenBadgeElementIndex = 0;
  static badgeNameAttrName = "name";
  #renderReqEventName?: string;
  #defaultName: string;
  #block: block.BadgenBlock;

  constructor() {
    super();
    BadgenBadgeElement.badgenBadgeElementIndex++;
    this.#defaultName = `badge${BadgenBadgeElement.badgenBadgeElementIndex}`;
    this.#block = block.badgenBlock();
  }

  static get observedAttributes(): string[] {
    return [BadgenBadgeElement.badgeNameAttrName];
  }

  attributeChangedCallback(name: string): void {
    if (name == BadgenBadgeElement.badgeNameAttrName) {
      this.#renderReqEventName = `auto-update-${this.name}`;
      this.#block.prepareRenderTarget(() => this, this.#renderReqEventName);
    }
  }

  connectedCallback(): void {
    this.innerHTML =
      `<code>${this.name}</code> listening for <code>${this.#renderReqEventName}</code>`;
  }

  get name(): string {
    return this.getAttribute(BadgenBadgeElement.badgeNameAttrName) ||
      this.#defaultName;
  }

  set name(value: string) {
    this.setAttribute(BadgenBadgeElement.badgeNameAttrName, value);
  }
}

export function* registerBadgenBadgeCE(suggestedName = "auto-badge") {
  if (!window.customElements.get(suggestedName)) {
    window.customElements.define(suggestedName, BadgenBadgeElement);
  }
  yield BadgenBadgeElement;
}
