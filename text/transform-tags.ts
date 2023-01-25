import * as safety from "../safety/mod.ts";
import * as esc from "./escape.ts";

export interface TaggedChildLevelSupplier {
  readonly level: number;
}

export interface TaggedChildrenSupplier {
  readonly children: TaggedNode[];
}

export interface TaggedTextSupplier extends TaggedChildLevelSupplier {
  readonly text: string;
}

export interface TransformedTextSupplier extends TaggedTextSupplier {
  readonly originalText: string;
}

export interface TaggedElement
  extends TaggedChildrenSupplier, TaggedChildLevelSupplier {
  readonly tag: string;
  readonly attributes: Record<string, string>;
  readonly autoClose?: boolean;
}

export type TaggedNode =
  | TaggedElement
  | TaggedTextSupplier
  | TransformedTextSupplier;

export interface TaggedRootElement extends TaggedElement {
  readonly isValid: boolean;
  readonly error?: Error;
}

export interface WellFormedTagsParserOptions {
  readonly tagsWithoutChildren?: string[];
  readonly prepareElementNode?: (
    suggested: TaggedElement,
  ) => TaggedNode | undefined;
  readonly registerElementNode?: (
    suggested: TaggedElement,
    parent: TaggedElement,
  ) => TaggedNode | undefined;
  readonly registerTextNode?: (
    text: string,
    level: number,
  ) => TaggedNode | undefined;
}

export const isTaggedChildrenSupplier = safety.typeGuard<
  TaggedChildrenSupplier
>("children");

export const isTaggedElement = safety.typeGuard<TaggedElement>(
  "tag",
  "attributes",
  "children",
);

export const isTaggedTextSupplier = safety.typeGuard<TaggedTextSupplier>(
  "text",
);

export const isTransformedTextSupplier = safety.typeGuard<
  TransformedTextSupplier
>("originalText");

export function wellFormedHtml5TagsParserOptions(): WellFormedTagsParserOptions {
  return {
    registerTextNode: (text, level) => {
      // newlines at the end of tags should be ignored
      if (text == "\n") return undefined;
      if (text.trim().length == 0) {
        return {
          originalText: text,
          text: "<br>",
          level,
        };
      }
      return { text, level };
    },
    tagsWithoutChildren: [
      // List from: https://riptutorial.com/html/example/4736/void-elements
      "area",
      "base",
      "br",
      "hr",
      "img",
      "input",
      "link",
      "meta",
      "param",
      "command",
      "keygen",
      "source",
    ],
  };
}

export function parseWellFormedTags(
  input: string,
  options = wellFormedHtml5TagsParserOptions(),
): TaggedRootElement {
  const createElementNode = options?.prepareElementNode ??
    ((suggested) => suggested);
  const registerElementNode = options?.registerElementNode ??
    ((suggested, _parent) => suggested);
  const createTextNode = options?.registerTextNode ??
    ((text, level) => ({ text, level }));
  const voidTags = options?.tagsWithoutChildren ?? [];
  const root: TaggedElement = {
    tag: "ROOT",
    attributes: {},
    children: [],
    level: 0,
  };

  function match(regex: RegExp, handler?: (...args: unknown[]) => unknown) {
    const match = regex.exec(input);
    if (match !== null) {
      const [fullMatch, ...captures] = match;
      input = input.substring(fullMatch.length);
      handler?.(...captures);
      return true;
    } else {
      return false;
    }
  }

  function parseContent(cursor: TaggedElement, level: number) {
    let iterate = true;
    while (iterate && input.length > 0) {
      // Parse the opening of a tag:
      const success = match(/^<([a-zA-Z][a-zA-Z0-9\-]*)/, (tagArg) => {
        const tag = tagArg as string;
        let element = createElementNode({
          tag,
          attributes: {},
          children: [],
          level,
        });
        if (element) {
          if (isTaggedElement(element)) {
            parseAttributes(element);
            if (!element.autoClose && !voidTags.includes(tag.toLowerCase())) {
              parseContent(element, level + 1);
            }
            element = registerElementNode(element, cursor);
            if (element) cursor.children.push(element);
          }
        }
      }) ||
        // Parse a closing tag
        match(/^<\/([a-zA-Z][a-zA-Z0-9\-]*)>/, (tagArg) => {
          const tag = tagArg as string;
          if (
            cursor.tag === undefined ||
            cursor.tag.toLowerCase() !== tag.toLowerCase()
          ) {
            throw new Error(
              `Parse error, closing tag ${tag.toLowerCase()} does not match ${cursor.tag.toLowerCase()}`,
            );
          }
          iterate = false;
        }) ||
        // Parse a text node
        match(/^([^<]+)/, (text) => {
          const node = createTextNode(text as string, level);
          if (node) cursor.children.push(node);
        });
      if (!success) {
        throw new Error(
          `Parse error, no rules matched at cursor ${cursor.tag}`,
        );
      }
    }
  }

  function parseAttributes(cursor: TaggedElement) {
    while (
      match(/^\s+([a-zA-Z][a-zA-Z0-9\-]+)="([^"]*)"/, (name, value) => {
        cursor.attributes[name as string] = value as string;
      })
      // deno-lint-ignore no-empty
    ) {
    }
    // see if tag ends in > or />
    if (
      !match(/^\s*(\/?)>/, (closer) => {
        if (closer) (cursor as { autoClose: boolean }).autoClose = true;
      })
    ) {
      throw new Error(
        `Error parsing attributes in open tag at cursor ${cursor.tag}`,
      );
    }
  }

  try {
    parseContent(root, 1);
    return {
      ...root,
      isValid: true,
    };
  } catch (error) {
    return {
      ...root,
      isValid: false,
      error,
    };
  }
}

export interface WellFormedTagsEmitterOptions {
  readonly content: () => string[];
  readonly emitElement: (
    element: TaggedElement,
    content: string[],
    indent?: string,
  ) => void;
  readonly emitTextNode: (
    tts: TaggedTextSupplier,
    content: string[],
    indent?: string,
  ) => void;
}

export function typicalTagsEmitterOptions(
  content: string[] = [],
): WellFormedTagsEmitterOptions {
  const emitTextNode: (
    tts: TaggedTextSupplier,
    content: string[],
    indent?: string,
  ) => void = (tts, content, indent = "") => {
    content.push(`${indent}${tts.text}`);
  };
  const emitElement: (
    element: TaggedElement,
    content: string[],
    indent?: string,
  ) => void = (element, content, indent = "") => {
    for (const ce of element.children) {
      if (isTaggedElement(ce)) {
        content.push(
          `${indent}<${ce.tag}${
            Object.entries(ce.attributes).map((attr) =>
              ` ${attr[0]}="${
                esc.escapeHtmlCustom(
                  attr[1],
                  esc.matchHtmlRegExpForAttrDoubleQuote,
                )
              }"`
            ).join()
          }>`,
        );
        emitElement(ce, content, indent + "  ");
        content.push(`${indent}</${ce.tag}>`);
      } else if (isTaggedTextSupplier(ce)) {
        emitTextNode(ce, content, indent);
      }
    }
  };

  return { content: () => content, emitElement, emitTextNode };
}

export function emitElementText(
  root: TaggedElement,
  options = typicalTagsEmitterOptions(),
): string {
  const content = options.content();
  options.emitElement(root, content);
  return content.join("\n");
}
