import * as yaml from "https://deno.land/std@0.147.0/encoding/yaml.ts";
import * as toml from "https://deno.land/std@0.147.0/encoding/toml.ts";
import * as iof from "https://deno.land/std@0.147.0/io/files.ts";

export type UntypedFrontmatter = Record<string, unknown>;

export interface FrontmatterParseResult<FM extends UntypedFrontmatter> {
  readonly nature:
    | "not-found-in-text"
    | "not-found-in-file"
    | "not-found-in-html"
    | "yaml"
    | "toml"
    | "error";
  readonly frontmatter?: FM;
  readonly content?: string;
  readonly error?: Error;
  readonly regExp?: RegExp;
}

export const fmInitiateMdStyleYamlBytes = new TextEncoder().encode("---");
export const fmInitiateMdStyleTomlBytes = new TextEncoder().encode("+++");

export const isPotentialMdStyleFrontmatterBytes = (bytes: Uint8Array) => {
  if (bytes.length < 3) return false;

  {
    let maybeYaml = true;
    for (let i = 0; i < fmInitiateMdStyleYamlBytes.length; i++) {
      if (bytes[i] != fmInitiateMdStyleYamlBytes[i]) {
        maybeYaml = false;
        break;
      }
    }
    if (maybeYaml) return true;
  }

  for (let i = 0; i < fmInitiateMdStyleTomlBytes.length; i++) {
    if (bytes[i] != fmInitiateMdStyleTomlBytes[i]) {
      return false;
    }
  }
  return true;
};

export const fmInitiateHtmlStyleYamlBytes = new TextEncoder().encode("<!---");

export const isPotentialHtmlStyleFrontmatterBytes = (bytes: Uint8Array) => {
  if (bytes.length < 5) return false;
  for (let i = 0; i < fmInitiateHtmlStyleYamlBytes.length; i++) {
    if (bytes[i] != fmInitiateHtmlStyleYamlBytes[i]) {
      return false;
    }
  }
  return true;
};

export const yamlTomlMarkdownFrontmatterRE =
  /^[\-\+][\-\+][\-\+]([\s\S]*?)^[\-\+][\-\+][\-\+][\r\n]?([\s\S]*)/m;

export const yamlHtmlFrontmatterRE = /^<!---([\s\S]*?)^--->[\r\n]?([\s\S]*)/m;

/**
 * Frontmatter is metadata attached to the start of text. If text is prefaced
 * by opening and closing +++ it the metadata is considered TOML-formatted
 * otherwise it's considered YAML-formatted.
 * @param text The text to search and extract frontmatter from
 * @param options match strategy and result typing
 * @returns The parsed, raw, frontmatter as a JS object and the remaining text
 */
export function parseTextFrontmatter<FM extends UntypedFrontmatter>(
  text: string,
  options?: {
    regExp?: RegExp;
    // deno-lint-ignore ban-types
    typed?: (untyped: object | null) => FM;
    onNotObject?: (
      fmParsed: unknown,
      fmText: string,
      content: string,
    ) => FrontmatterParseResult<FM>;
  },
): FrontmatterParseResult<FM> {
  const {
    regExp = yamlTomlMarkdownFrontmatterRE,
    // deno-lint-ignore ban-types
    typed = (untyped: object | null) => untyped as FM,
    onNotObject,
  } = options ?? {};
  try {
    const fmMatch = text.match(regExp);
    if (fmMatch) {
      const [_, fmText, content] = fmMatch;
      const isTOML = text.startsWith("+++");
      const fm = isTOML ? toml.parse(fmText.trim()) : yaml.parse(fmText.trim());
      switch (typeof fm) {
        case "object":
          return {
            nature: isTOML ? "toml" : "yaml",
            frontmatter: typed(fm),
            content,
            regExp,
          };
      }
      if (onNotObject) {
        return onNotObject(fm, fmText, content);
      }
      return {
        nature: "error",
        content,
        // deno-fmt-ignore
        error: new Error(`${isTOML ? "toml" : "yaml"} parse of frontmatter did not return an object`),
        regExp,
      };
    } else {
      return {
        nature: "not-found-in-text",
        content: text,
        regExp,
      };
    }
  } catch (error) {
    return {
      nature: "error",
      content: text,
      error,
      regExp,
    };
  }
}

export const parseYamlTomlFrontmatter = <FM extends UntypedFrontmatter>(
  text: string,
) => parseTextFrontmatter<FM>(text, { regExp: yamlTomlMarkdownFrontmatterRE });

export const parseYamlHtmlFrontmatter = <FM extends UntypedFrontmatter>(
  text: string,
) => parseTextFrontmatter<FM>(text, { regExp: yamlHtmlFrontmatterRE });

export const parseFileYamlTomlFrontmatter = async <
  FM extends UntypedFrontmatter,
>(path: string) => {
  try {
    const file = await Deno.open(path, { read: true });
    const bytes = await iof.readRange(file, { start: 0, end: 2 });
    file.close();

    if (isPotentialMdStyleFrontmatterBytes(bytes)) {
      const text = await Deno.readTextFile(path);
      return parseTextFrontmatter<FM>(text, {
        regExp: yamlTomlMarkdownFrontmatterRE,
      });
    }

    return { nature: "not-found-in-file" } as FrontmatterParseResult<FM>;
  } catch (error) {
    return {
      nature: "error",
      error,
    } as FrontmatterParseResult<FM>;
  }
};

export const parseFileYamlHtmlFrontmatter = async <
  FM extends UntypedFrontmatter,
>(path: string) => {
  try {
    const file = await Deno.open(path, { read: true });
    const bytes = await iof.readRange(file, { start: 0, end: 4 });
    file.close();

    if (isPotentialHtmlStyleFrontmatterBytes(bytes)) {
      const text = await Deno.readTextFile(path);
      return parseTextFrontmatter<FM>(text, {
        regExp: yamlHtmlFrontmatterRE,
      });
    }
    return { nature: "not-found-in-html" } as FrontmatterParseResult<FM>;
  } catch (error) {
    return {
      nature: "error",
      error,
    } as FrontmatterParseResult<FM>;
  }
};
