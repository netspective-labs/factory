import * as c from "../content/mod.ts";

// deno-lint-ignore no-empty-interface
export interface UntypedFrontmatter extends Record<string, unknown> {
}

export type FrontmatterContentSupplier = c.FlexibleContent;

export interface FrontmatterSupplier<FM extends UntypedFrontmatter> {
  readonly frontmatter: FM;
}

export interface FrontmatterParseResult<FM extends UntypedFrontmatter> {
  readonly frontmatter?: FM;
  readonly content: string;
  readonly error?: Error;
}

export interface FrontmatterConsumer<FM extends UntypedFrontmatter> {
  readonly consumeParsedFrontmatter: (
    fmpr: FrontmatterParseResult<FM>,
  ) => FM | undefined;
}
