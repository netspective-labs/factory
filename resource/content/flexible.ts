import { io } from "../deps.ts";
import * as safety from "../../safety/mod.ts";
import * as govn from "./governance.ts";
import * as m from "./model.ts";

export const isContentModel = safety.typeGuard<govn.ContentModel>(
  "isContentModel",
  "isContentAvailable",
);

export function isContentModelSupplier(
  o: unknown,
): o is govn.ModelSupplier<govn.ContentModel> {
  return m.isModelSupplier(o) && isContentModel(o.model);
}

/**
 * Find the first content model supplier in a list of model suppliers
 * @param o List of objects which might be potential content model suppliers
 * @returns Either the first model supplier or undefined if none found
 */
export function potentialContentModelSupplier(
  ...o: unknown[]
): govn.ModelSupplier<govn.ContentModel> | undefined {
  const found = o.find((potential) => isContentModelSupplier(potential));
  if (found) return found as govn.ModelSupplier<govn.ContentModel>;
  return undefined;
}

/**
 * Find the first content model supplier in a list of model suppliers
 * @param defaultSupplier What to return in case no content model suppliers found
 * @param o List of objects which might be potential content model suppliers
 * @returns Either the first model supplier or defaultSupplier
 */
export function contentModelSupplier(
  defaultSupplier:
    | govn.ModelSupplier<govn.ContentModel>
    | (() => govn.ModelSupplier<govn.ContentModel>),
  ...o: unknown[]
): govn.ModelSupplier<govn.ContentModel> {
  const found = o.find((potential) => isContentModelSupplier(potential));
  if (found) return found as govn.ModelSupplier<govn.ContentModel>;
  return typeof defaultSupplier === "function"
    ? defaultSupplier()
    : defaultSupplier;
}

/**
 * Find the first content model in a list of content model suppliers
 * @param defaultModel What to return in case no content model suppliers supplied a model
 * @param o List of objects which might be potential content model suppliers
 * @returns Either the first model supplier's content model or defaultModel
 */
export function contentModel(
  defaultModel: govn.ContentModel | (() => govn.ContentModel),
  ...o: unknown[]
): govn.ContentModel {
  const found = o.find((potential) => isContentModelSupplier(potential));
  if (found) return (found as govn.ModelSupplier<govn.ContentModel>).model;
  return typeof defaultModel === "function" ? defaultModel() : defaultModel;
}

export const isTextSupplier = safety.typeGuard<govn.TextSupplier>("text");

export const isTextSyncSupplier = safety.typeGuard<govn.TextSyncSupplier>(
  "textSync",
);

export const isUint8ArraySupplier = safety.typeGuard<govn.Uint8ArraySupplier>(
  "uint8Array",
);

export const isUint8ArraySyncSupplier = safety.typeGuard<
  govn.Uint8ArraySyncSupplier
>(
  "uint8ArraySync",
);

export const isContentSupplier = safety.typeGuard<govn.ContentSupplier>(
  "content",
);

export const isContentSyncSupplier = safety.typeGuard<govn.ContentSyncSupplier>(
  "contentSync",
);

export const isHtmlSupplier = safety.typeGuard<govn.HtmlSupplier>(
  "html",
);

export const isStructuredDataInstanceSupplier = safety.typeGuard<
  govn.StructuredDataInstanceSupplier
>(
  "structuredDataInstance",
);

export const isSerializedDataSupplier = safety.typeGuard<
  govn.SerializedDataSupplier
>(
  "serializedData",
);

export const isDiagnosticsSupplier = safety.typeGuard<govn.DiagnosticsSupplier>(
  "diagnostics",
);

export function isFlexibleContentSupplier(
  o: unknown,
): o is govn.FlexibleContent {
  if (
    isTextSupplier(o) || isUint8ArraySupplier(o) || isContentSupplier(o) ||
    isTextSyncSupplier(o) || isUint8ArraySyncSupplier(o) ||
    isContentSyncSupplier(o)
  ) {
    return true;
  }
  return false;
}

export function isFlexibleContentSyncSupplier(
  o: unknown,
): o is govn.FlexibleContentSync {
  if (
    isTextSyncSupplier(o) || isUint8ArraySyncSupplier(o) ||
    isContentSyncSupplier(o)
  ) {
    return true;
  }
  return false;
}

export function isFlexibleHtmlSupplier(
  o: unknown,
): o is govn.FlexibleContent | govn.HtmlSupplier {
  if (isFlexibleContentSupplier(o) || isHtmlSupplier(o)) {
    return true;
  }
  return false;
}

export function flexibleTextSyncCustom(
  contributor: govn.FlexibleContentSync | govn.FlexibleContent | string,
  options?: {
    readonly unhandledText?:
      | string
      | undefined
      | ((...args: unknown[]) => string | undefined);
    readonly functionArgs?: unknown[];
    readonly textDecoder?: TextDecoder;
  },
): string | undefined {
  if (typeof contributor === "string") return contributor;
  if (isTextSyncSupplier(contributor)) {
    return typeof contributor.textSync === "string"
      ? contributor.textSync
      : contributor.textSync(...(options?.functionArgs || []));
  }
  if (isUint8ArraySyncSupplier(contributor)) {
    const te = options?.textDecoder || new TextDecoder();
    return te.decode(
      typeof contributor.uint8ArraySync === "function"
        ? contributor.uint8ArraySync(...(options?.functionArgs || []))
        : contributor.uint8ArraySync,
    );
  }
  if (isContentSyncSupplier(contributor)) {
    const sw = new io.StringWriter();
    contributor.contentSync(sw);
    return sw.toString();
  }
  return options?.unhandledText
    ? (typeof options.unhandledText == "string"
      ? options.unhandledText
      : options.unhandledText(...(options?.functionArgs || [])))
    : undefined;
}

export function flexibleTextSync(
  contributor: govn.FlexibleContentSync | govn.FlexibleContent | string,
  defaultText: string,
): string {
  return flexibleTextSyncCustom(contributor) || defaultText;
}

export async function flexibleTextCustom(
  contributor: govn.FlexibleContent | govn.FlexibleContentSync | string,
  options?: {
    readonly unhandledText?:
      | string
      | undefined
      | ((...args: unknown[]) => string | undefined);
    readonly functionArgs?: unknown[];
    readonly textDecoder?: TextDecoder;
  },
): Promise<string | undefined> {
  if (typeof contributor === "string") return contributor;
  if (isTextSupplier(contributor)) {
    return typeof contributor.text === "string"
      ? contributor.text
      : await contributor.text(...(options?.functionArgs || []));
  }
  if (isUint8ArraySupplier(contributor)) {
    const te = options?.textDecoder || new TextDecoder();
    return te.decode(
      typeof contributor.uint8Array === "function"
        ? await contributor.uint8Array(...(options?.functionArgs || []))
        : contributor.uint8Array,
    );
  }
  if (isContentSupplier(contributor)) {
    const sw = new io.StringWriter();
    contributor.content(sw);
    return sw.toString();
  }
  // if no async versions are available but sync versions are, we'll take 'em
  return flexibleTextSyncCustom(contributor, options);
}

export async function flexibleText(
  contributor: govn.FlexibleContent | govn.FlexibleContentSync | string,
  defaultText: string,
): Promise<string> {
  return (await flexibleTextCustom(contributor)) || defaultText;
}

export function flexibleContent(
  text: string,
): govn.FlexibleContent & govn.FlexibleContentSync {
  return {
    text: text,
    textSync: text,
  };
}

/**
 * Replace the text of the given flexible content source with text
 * @param source The instance to mutate
 * @param text The text to replace existing
 * @returns
 */
export function mutateFlexibleContent(
  source: govn.FlexibleContent | govn.FlexibleContentSync,
  text: string,
): govn.FlexibleContent & govn.FlexibleContentSync {
  // deno-lint-ignore no-explicit-any
  const mutatable = source as any;
  delete mutatable.uint8Array; // remove if they were in the original
  delete mutatable.uint8ArraySync; // remove if they were in the original
  delete mutatable.content; // remove if they were in the original
  delete mutatable.contentSync; // remove if they were in the original
  mutatable.text = text; // replace or assign because this is now canonical
  mutatable.textSync = text; // replace or assign because this is now canonical
  return mutatable;
}

/**
 * Replace the HTML of the given flexible content source with new HTML
 * @param source The instance to mutate
 * @param text The HTML to replace existing with
 * @returns
 */
export function mutateHTML(
  source: unknown,
  supplier: string | govn.HtmlSupplier,
): govn.HtmlSupplier {
  // deno-lint-ignore no-explicit-any
  const mutatable = source as any;
  mutatable.html = typeof supplier === "string"
    ? flexibleContent(supplier)
    : supplier.html;
  return mutatable;
}

export function replaceExtn(fileName: string, newExtn: string) {
  const pos = fileName.lastIndexOf(".");
  return pos >= 0
    ? (fileName.substr(0, pos < 0 ? fileName.length : pos) + newExtn)
    : (fileName + newExtn);
}

export function escapeHTML(
  string: string,
  matchHtmlRegExp = /["'&<>]/,
): string {
  const str = "" + string;
  const match = matchHtmlRegExp.exec(str);

  if (!match) {
    return str;
  }

  let escape;
  let html = "";
  let index = 0;
  let lastIndex = 0;

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = "&quot;";
        break;
      case 38: // &
        escape = "&amp;";
        break;
      case 39: // '
        escape = "&#39;";
        break;
      case 60: // <
        escape = "&lt;";
        break;
      case 62: // >
        escape = "&gt;";
        break;
      default:
        continue;
    }

    if (lastIndex !== index) {
      html += str.substring(lastIndex, index);
    }

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
}
