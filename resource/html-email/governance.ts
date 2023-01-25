import * as c from "../content/mod.ts";
import * as fm from "../frontmatter/mod.ts";
import * as ren from "../render/mod.ts";
import * as eds from "./design-system.ts";
import * as contrib from "../../text/contributions.ts";

export interface HtmlEmailLayoutContributions {
  readonly stylesheets: contrib.Contributions;
  readonly scripts: contrib.Contributions;
  readonly head: contrib.Contributions;
  readonly body: contrib.Contributions;
  readonly bodyMainContent: contrib.Contributions;
  readonly diagnostics: contrib.Contributions;
}

export type HtmlEmailLayoutBody =
  | c.FlexibleContentSync
  | c.FlexibleContent
  | c.HtmlSupplier;

// deno-lint-ignore no-empty-interface
export interface HtmlEmailLayoutStrategy<Layout extends HtmlEmailLayout>
  extends ren.IdentifiableLayoutStrategy<Layout, c.HtmlSupplier> {
}

// deno-lint-ignore no-empty-interface
export interface HtmlEmailLayoutStrategySupplier<Layout extends HtmlEmailLayout>
  extends ren.LayoutStrategySupplier<Layout, c.HtmlSupplier> {
}

export type HtmlEmailLayoutDiagnosticsRequest =
  | boolean
  | "all"
  | "bodySource"
  | "layoutStrategySupplier"
  | "contributions"
  | "state";

export interface HtmlEmailLayoutArguments {
  readonly diagnostics?: HtmlEmailLayoutDiagnosticsRequest;
}

export interface HtmlEmailContentAdapter<Layout> {
  readonly subject: (layout: Layout) => string;
}

export interface HtmlEmailOperationalCtxDomDataAttrsResolver {
  (layout: HtmlEmailLayout): string;
}

export interface HtmlEmailMetaOriginDomDataAttrsResolver {
  (layout: HtmlEmailLayout): string;
}

export interface HtmlEmailDesignSystemOriginDomDataAttrsResolver {
  (
    layout: HtmlEmailLayout,
    srcModuleImportMetaURL: string,
    symbol: string,
  ): string;
}

export interface HtmlEmailOriginResolvers {
  readonly meta: HtmlEmailMetaOriginDomDataAttrsResolver;
  readonly designSystem: HtmlEmailDesignSystemOriginDomDataAttrsResolver;
  readonly operationalCtx: HtmlEmailOperationalCtxDomDataAttrsResolver;
  readonly dataAttrs: (
    layout: HtmlEmailLayout,
    srcModuleImportMetaURL: string,
    symbol: string,
  ) => string;
}

export interface HtmlEmailLayout<OperationalCtxClientCargo = unknown>
  extends
    Partial<fm.FrontmatterSupplier<fm.UntypedFrontmatter>>,
    HtmlEmailLayoutArguments {
  readonly bodySource: HtmlEmailLayoutBody;
  readonly context: eds.UntypedEmailDesignSystemContext;
  // deno-lint-ignore no-explicit-any
  readonly designSystem: eds.EmailDesignSystem<any>;
  // deno-lint-ignore no-explicit-any
  readonly layoutSS: HtmlEmailLayoutStrategySupplier<any>;
  readonly contributions: HtmlEmailLayoutContributions;
  readonly origin: HtmlEmailOriginResolvers;
  readonly operationalCtxClientCargo?: OperationalCtxClientCargo;
}

/**
 * Used by Deno HTML modules as html: { text: HtmlLayoutBodySupplier }
 */
export interface HtmlEmailLayoutBodySupplier {
  (layout: HtmlEmailLayout): string;
}

export interface TemplateLiteralHtmlEmailLayout<
  T,
  Layout extends HtmlEmailLayout,
> {
  (
    literals: TemplateStringsArray,
    ...expressions: T[]
  ): HtmlEmailLayoutStrategy<Layout>;
}

export interface HtmlEmailTemplateExprBodyTextSupplier {
  (body?: string): string;
}

export interface HtmlEmailTemplateExprLayoutSupplier<
  Layout extends HtmlEmailLayout,
> {
  (
    layout: Layout,
    body?: string,
  ): string | contrib.TextContributionsPlaceholder;
}

export type HtmlEmailPartialUntyped = HtmlEmailTemplateExprLayoutSupplier<
  HtmlEmailLayout
>;
export type HtmlEmailPartial<Layout extends HtmlEmailLayout> =
  HtmlEmailTemplateExprLayoutSupplier<Layout>;

export type HtmlEmailHelperFunctionOrString<Layout extends HtmlEmailLayout> =
  | HtmlEmailPartial<Layout>
  | string;
