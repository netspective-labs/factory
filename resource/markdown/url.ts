import * as mdr from "./render.ts";

export interface UrlRewriteRule {
  readonly purpose: string;
  readonly rewrite: string | ((ruleKey: string, originalURL: string) => string);
}

export function interpolateMarkdownLinks(
  findRuleMatch: (
    alias: string,
    parsedURL: string,
  ) => string | UrlRewriteRule | undefined,
  onNoMatchFound?: (alias: string, parsedURL: string) => string | undefined,
): mdr.MarkdownLinkUrlRewriter {
  // in [text](anchor) URLs anchor can contain ${alias} which the markdown
  // renderer will replace with $%7Balias%7D
  const linkRewriteRE = /\$%7B(.*?)%7D/g;

  return (parsedURL) => {
    if (parsedURL.indexOf("$%7B") >= 0) {
      return parsedURL.replace(
        linkRewriteRE,
        (_, regExpMatchGroup1: string) => {
          const rule = findRuleMatch(regExpMatchGroup1, parsedURL);
          if (typeof rule !== "undefined") {
            if (typeof rule === "string") {
              return rule;
            }
            const rewrite = rule.rewrite;
            if (typeof rewrite === "string") {
              return rewrite;
            }
            return rewrite(regExpMatchGroup1, parsedURL);
          }
          const onNoMatch = onNoMatchFound?.(regExpMatchGroup1, parsedURL);
          if (onNoMatch) return onNoMatch;
          return parsedURL;
        },
      );
    }
    return parsedURL;
  };
}
