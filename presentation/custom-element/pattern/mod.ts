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

class CustomElementPattern extends HTMLElement {
  connectedCallback(): void {
    this.innerHTML = "connectedCallback() in CustomElementPattern";
  }
}

export function* registerCustomElementPatternCE(suggestedName = "ce-pattern") {
  if (!window.customElements.get(suggestedName)) {
    window.customElements.define(suggestedName, CustomElementPattern);
  }
  yield CustomElementPattern;
}
