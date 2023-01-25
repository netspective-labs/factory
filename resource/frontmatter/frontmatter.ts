import { toml, yaml } from "./deps.ts";
import * as safety from "../../safety/mod.ts";
import * as govn from "./governance.ts";
import * as c from "../content/mod.ts";
import * as e from "../../module/mod.ts";

export const isFrontmatterSupplier = safety.typeGuard<
  govn.FrontmatterSupplier<govn.UntypedFrontmatter>
>("frontmatter");

export const isFrontmatterConsumer = safety.typeGuard<
  govn.FrontmatterConsumer<govn.UntypedFrontmatter>
>("consumeParsedFrontmatter");

export const yamlTomlMarkdownFrontmatterRE =
  /^[\-\+][\-\+][\-\+]([\s\S]*?)^[\-\+][\-\+][\-\+]$([\s\S]*)/m;

export const yamlHtmlFrontmatterRE = /^<!---([\s\S]*?)^--->$([\s\S]*)/m;

/**
 * Frontmatter is metadata attached to the start of text. If text is prefaced
 * by opening and closing +++ it the metadata is considered TOML-formatted
 * otherwise it's considered YAML-formatted.
 * @param frontmatterRE the regular expression to use
 * @param text The text to search and extract frontmatter from
 * @returns The parsed, raw, frontmatter as a JS object and the remaining text
 */
export function parseYamlTomlFrontmatter(
  frontmatterRE: RegExp,
  text?: string,
): govn.FrontmatterParseResult<govn.UntypedFrontmatter> | undefined {
  if (text) {
    try {
      const fmMatch = text.match(frontmatterRE);
      if (fmMatch) {
        const [_, fmText, content] = fmMatch;
        const fm = text.startsWith("+++")
          ? toml.parse(fmText.trim())
          : yaml.parse(fmText.trim());
        return {
          frontmatter: typeof fm === "object"
            ? fm as Record<string, unknown>
            : undefined,
          content: content.trimStart(),
        };
      }
    } catch (error) {
      return {
        content: text,
        error,
      };
    }
  }
}

/**
 * Find the first frontmatter supplier in a list of frontmatter suppliers
 * @param o List of objects which might be potential frontmatter suppliers
 * @returns Either the first frontmatter supplier or undefined if none found
 */
export function potentialFrontmatterSupplier<
  FM extends govn.UntypedFrontmatter,
>(
  ...o: unknown[]
): govn.FrontmatterSupplier<FM> | undefined {
  const found = o.find((potential) => isFrontmatterSupplier(potential));
  if (found) return found as govn.FrontmatterSupplier<FM>;
  return undefined;
}

/**
 * Find the first frontmatter supplier in a list of frontmatter suppliers
 * @param defaultSupplier What to return in case no frontmatter suppliers found
 * @param o List of objects which might be potential frontmatter suppliers
 * @returns Either the first frontmatter supplier or defaultSupplier
 */
export function frontmatterSupplier<FM extends govn.UntypedFrontmatter>(
  defaultSupplier:
    | govn.FrontmatterSupplier<FM>
    | (() => govn.FrontmatterSupplier<FM>),
  ...o: unknown[]
): govn.FrontmatterSupplier<FM> | undefined {
  const found = o.find((potential) => isFrontmatterSupplier(potential));
  if (found) return found as govn.FrontmatterSupplier<FM>;
  return typeof defaultSupplier === "function"
    ? defaultSupplier()
    : defaultSupplier;
}

/**
 * Find the first frontmatter in a list of frontmatter suppliers
 * @param defaultFrontmatter What to return in case no frontmatter suppliers supplied a frontmatter
 * @param o List of objects which might be potential frontmatter suppliers
 * @returns Either the first frontmatter supplier's frontmatter or defaultFrontmatter
 */
export function frontmatter<FM extends govn.UntypedFrontmatter>(
  defaultFrontmatter: FM | (() => FM),
  ...o: unknown[]
): FM {
  const found = o.find((potential) => isFrontmatterSupplier(potential));
  if (found) {
    return (found as govn.FrontmatterSupplier<FM>)
      .frontmatter as FM;
  }
  return typeof defaultFrontmatter === "function"
    ? defaultFrontmatter()
    : defaultFrontmatter;
}

/**
 * Transform the dest into a FrontmatterSupplier, pointing to the source frontmatter
 * as a reference (not cloned).
 * @param source The frontmatter supplier we want the dest to reference
 * @param dest The target object that should reference the source frontmatter
 * @returns
 */
export function referenceFrontmatter<
  FrontmatterSupplier extends govn.FrontmatterSupplier<govn.UntypedFrontmatter>,
>(
  source: FrontmatterSupplier,
  dest: unknown,
  options?: {
    readonly append?: Iterable<[key: string, value: unknown]>;
    readonly onDestIsNotMutatable?: (
      reason: string,
      source: FrontmatterSupplier,
      dest: unknown,
    ) => unknown;
  },
): FrontmatterSupplier | unknown {
  if (dest && typeof dest === "object") {
    if (isFrontmatterSupplier(source)) {
      // deno-lint-ignore no-explicit-any
      (dest as any).frontmatter = source.frontmatter;
    }
    const result = dest as FrontmatterSupplier;
    if (options?.append) {
      const frontmatter = result.frontmatter as Record<string, unknown>;
      for (const append of options?.append) {
        const [key, value] = append;
        frontmatter[key] = value;
      }
    }
    return result;
  } else {
    if (options?.onDestIsNotMutatable) {
      return options?.onDestIsNotMutatable(
        "dest is not an object in referenceFrontmatter",
        source,
        dest,
      );
    } else {
      console.warn("referenceFrontmatter: dest is not an object");
    }
  }
  return dest;
}

/**
 * Transform the dest into a FrontmatterSupplier, cloning to the source frontmatter
 * @param source The frontmatter supplier we want the dest to become a clone of
 * @param dest The target object that should clone from the source frontmatter
 * @returns
 */
export function cloneFrontmatter<
  FrontmatterSupplier extends govn.FrontmatterSupplier<govn.UntypedFrontmatter>,
>(
  source: FrontmatterSupplier,
  dest: unknown,
  options?: {
    readonly append?: Iterable<[key: string, value: unknown]>;
    readonly onDestIsNotMutatable?: (
      reason: string,
      source: FrontmatterSupplier,
      dest: unknown,
    ) => unknown;
  },
): FrontmatterSupplier | unknown {
  if (dest && typeof dest === "object") {
    if (isFrontmatterSupplier(source)) {
      // deno-lint-ignore no-explicit-any
      (dest as any).frontmatter = e.deepClone(source.frontmatter);
    }
    const result = dest as FrontmatterSupplier;
    if (options?.append) {
      const frontmatter = result.frontmatter as Record<string, unknown>;
      for (const append of options?.append) {
        const [key, value] = append;
        frontmatter[key] = value;
      }
    }
    return result;
  } else {
    if (options?.onDestIsNotMutatable) {
      return options?.onDestIsNotMutatable(
        "dest is not an object in cloneFrontmatter",
        source,
        dest,
      );
    } else {
      console.warn("cloneFrontmatter: dest is not an object");
    }
  }
  return dest;
}

/**
 * Clone properties from source into dest.frontmatter if the property in source does
 * not alrady exist in dest.frontmatter.
 * @param source Any arbitrary string-keyed object
 * @param dest The destination's frontmatter to merge source keys into
 * @param filter Return transformed value that should be merged, undefined to skip property
 * @returns The destination
 */
export const mutateFrontmatterProperties = <
  FrontmatterSupplier extends govn.FrontmatterSupplier<govn.UntypedFrontmatter>,
>(
  source: Record<string, unknown>,
  dest: FrontmatterSupplier,
  options?: {
    readonly append?: Iterable<[key: string, value: unknown]>;
    readonly filter?: (key: string, value: unknown) => unknown | undefined;
    readonly onDestIsNotMutatable?: (
      reason: string,
      source: Record<string, unknown>,
      dest: FrontmatterSupplier,
    ) => FrontmatterSupplier;
  },
): FrontmatterSupplier => {
  if (isFrontmatterSupplier(dest)) {
    if (typeof dest.frontmatter === "object") {
      const merged = dest.frontmatter as Record<string, unknown>;
      if (options?.filter) {
        const filter = options?.filter;
        for (const prop in source) {
          if (!(prop in merged)) {
            const filtered = filter(prop, source[prop]);
            if (filtered) {
              merged[prop] = filtered;
            }
          }
        }
      } else {
        for (const prop in source) {
          if (!(prop in merged)) {
            merged[prop] = e.deepClone(source[prop]);
          }
        }
      }
      if (options?.append) {
        for (const append of options?.append) {
          const [key, value] = append;
          merged[key] = value;
        }
      }
    } else {
      if (options?.onDestIsNotMutatable) {
        return options?.onDestIsNotMutatable(
          "dest.frontmatter is not an object in mutateFrontmatterProperties",
          source,
          dest,
        );
      } else {
        console.warn(
          "mutateFrontmatterProperties: dest.frontmatter is not an object",
        );
      }
    }
  } else {
    if (options?.onDestIsNotMutatable) {
      return options?.onDestIsNotMutatable(
        "dest is not a FrontmatterSupplier in mutateFrontmatterProperties",
        source,
        dest,
      );
    } else {
      console.warn(
        "mutateFrontmatterProperties: dest is not a FrontmatterSupplier",
      );
    }
  }
  return dest;
};

export type FrontmatterResource =
  & govn.FrontmatterConsumer<govn.UntypedFrontmatter>
  & (c.FlexibleContent | c.HtmlSupplier);

export function prepareFrontmatter<Resource>(
  frontmatterRE: RegExp,
) {
  return async (resource: Resource) => {
    if (isFrontmatterConsumer(resource)) {
      if (c.isFlexibleContentSupplier(resource)) {
        const fmResult = parseYamlTomlFrontmatter(
          frontmatterRE,
          await c.flexibleTextCustom(resource),
        );
        if (fmResult) {
          resource.consumeParsedFrontmatter(fmResult);
        }
      } else if (c.isHtmlSupplier(resource)) {
        const fmResult = parseYamlTomlFrontmatter(
          frontmatterRE,
          await c.flexibleTextCustom(resource.html),
        );
        if (fmResult) {
          resource.consumeParsedFrontmatter(fmResult);
        }
      }
    }
    return resource;
  };
}

export function prepareFrontmatterSync(
  frontmatterRE: RegExp,
): (resource: FrontmatterResource) =>
  & FrontmatterResource
  & Partial<govn.FrontmatterSupplier<govn.UntypedFrontmatter>> {
  return (
    resource: FrontmatterResource,
  ) => {
    if (
      isFrontmatterConsumer(resource) &&
      c.isFlexibleContentSupplier(resource)
    ) {
      const fmResult = parseYamlTomlFrontmatter(
        frontmatterRE,
        c.flexibleTextSyncCustom(resource),
      );
      if (fmResult) {
        resource.consumeParsedFrontmatter(fmResult);
      }
    }
    return resource;
  };
}
