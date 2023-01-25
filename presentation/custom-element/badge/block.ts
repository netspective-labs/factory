// loosely follows https://blockprotocol.org/ but as that protocol gets better
// defined, we'll align to it more closely

import * as safety from "../../../safety/mod.ts";

declare global {
  interface Window {
    badgen: (content: BadgenBadgeContent) => string;

    // get past Deno errors without requiring <reference lib="dom"/>
    // deno-lint-ignore no-explicit-any
    document: any;
  }
}

// deno-lint-ignore no-explicit-any
type HTMLElement = any;

// this should fill in window.badgen defined above
import "https://unpkg.com/badgen@3.2.2/dist/index.browser.js";

export interface BadgenBadgeContent {
  // API: https://github.com/badgen/badgen#in-browser
  readonly label?: string;
  readonly labelColor?: string; // <Color RGB> or <Color Name> (default: '555')
  readonly status: string; // <Text>, required
  readonly color?: string; // <Color RGB> or <Color Name> (default: 'blue')
  readonly style?: "classic" | "flat"; // 'flat' or 'classic' (default: 'classic')
  readonly icon?: string; // Use icon (default: undefined), best to use 'data:image/svg+xml;base64,...'
  readonly iconWidth?: number; // Set this if icon is not square (default: 13)
  readonly scale?: number; // Set badge scale (default: 1)

  // beyond badgen, our custom properties
  readonly title?: string;
  readonly action?: string;
}

export const isBadgenBadgeContent = safety.typeGuard<BadgenBadgeContent>(
  "status",
);

export interface BadgenBlockState {
  content?: BadgenBadgeContent;
  renderTarget?: {
    targetSupplier: () => HTMLElement;
    eventName: string;
    autoDisplay?: boolean;
  };
}

export interface BadgenElementRenderRequest {
  readonly content: BadgenBadgeContent;
  readonly autoDisplay?: boolean;
}

export interface BadgenBlock {
  readonly badgeHTML: (content: BadgenBadgeContent) => string;
  readonly decorateHTML: (html: string, content: BadgenBadgeContent) => string;
  readonly renderElement: (
    elem: HTMLElement,
    content: BadgenBadgeContent,
  ) => void;
  readonly prepareRenderTarget: (
    targetSupplier: () => HTMLElement,
    eventName: string,
  ) => void;
  readonly render: (event: BadgenElementRenderRequest) => void;
}

// deno-lint-ignore no-empty-interface
export interface BadgenBlockInit {
}

export function badgenBlock(
  _TODO_forLaterExtension?: BadgenBlockInit,
): BadgenBlock {
  const state: BadgenBlockState = {
    content: undefined,
    renderTarget: undefined,
  };
  const block: BadgenBlock = {
    badgeHTML: (content) => {
      return block.decorateHTML(window.badgen(content), content);
    },
    decorateHTML: (html, content) => {
      state.content = content;
      if (content.title) {
        html = `<span title="${content.title}">${html}</span>`;
      }
      if (content.action) {
        html = `<a onclick="${content.action}">${html}</a>`;
      }
      return html;
    },
    renderElement: (elem, content) => {
      if (elem) {
        elem.innerHTML = block.badgeHTML(content);
      } else {
        console.error(
          `[badgenBlock.renderElement] target element is undefined`,
          content,
        );
      }
    },
    prepareRenderTarget: (targetSupplier, eventName) => {
      const isCustomEvent = (
        o: unknown,
      ): o is { detail: BadgenElementRenderRequest } => {
        if (o && typeof o === "object") {
          // deno-lint-ignore no-explicit-any
          if ("content" in (o as any).detail) return true;
        }
        return false;
      };

      state.renderTarget = { targetSupplier, eventName };
      window.document.addEventListener(eventName, (event: unknown) => {
        const target = state.renderTarget?.targetSupplier?.();
        if (target && isCustomEvent(event)) {
          const { content, autoDisplay } = event.detail;
          block.renderElement(target, content);
          if (autoDisplay) target.style.display = "block";
        } else {
          console.warn(
            `[badgenBlock.eventListener] unable to render HTML`,
            target,
            event,
          );
        }
      });
    },
    render: (event) => {
      if (state.renderTarget) {
        window.document.dispatchEvent(
          new CustomEvent(state.renderTarget.eventName, {
            detail: event,
          }),
        );
      }
    },
  };
  return block;
}
