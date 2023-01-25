import * as cg from "../content/mod.ts";
import * as rg from "../render/mod.ts";
import * as r from "../../route/mod.ts";
import * as fm from "../frontmatter/mod.ts";
import * as ds from "./design-system.ts";
import * as contrib from "../../text/contributions.ts";
import * as git from "../../git/mod.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export interface GitRemoteAnchor extends git.GitAsset {
  readonly href: string;
  readonly textContent: string;
}

export interface HtmlLayoutClientCargoPersister {
  (destination: string): Promise<void>;
}

export type HtmlLayoutClientCargoJavaScriptValue = string;

export interface HtmlLayoutClientCargoValueSupplier {
  readonly clientCargoValue?: <Layout extends HtmlLayout>(
    layout: Layout,
  ) => HtmlLayoutClientCargoJavaScriptValue;
}

export interface HtmlLayoutClientCargoSupplier {
  readonly clientCargoPropertyName: string;
}

export interface HtmlLayoutContributions {
  readonly stylesheets: contrib.Contributions;
  readonly scripts: contrib.Contributions;
  readonly head: contrib.Contributions;
  readonly body: contrib.Contributions;
  readonly bodyMainContent: contrib.Contributions;
  readonly domContentLoadedJS: contrib.Contributions;
  readonly diagnostics: contrib.Contributions;
}

export type HtmlLayoutBody =
  | cg.FlexibleContentSync
  | cg.FlexibleContent
  | cg.HtmlSupplier;

// deno-lint-ignore no-empty-interface
export interface HtmlLayoutStrategy<Layout extends HtmlLayout>
  extends rg.IdentifiableLayoutStrategy<Layout, cg.HtmlSupplier> {
}

// deno-lint-ignore no-empty-interface
export interface HtmlLayoutStrategySupplier<Layout extends HtmlLayout>
  extends rg.LayoutStrategySupplier<Layout, cg.HtmlSupplier> {
}

export type HtmlLayoutDiagnosticsRequest =
  | boolean
  | "all"
  | "bodySource"
  | "layoutStrategySupplier"
  | "contributions"
  | "state";

export interface HtmlLayoutArguments {
  readonly diagnostics?: HtmlLayoutDiagnosticsRequest;
}

// TODO: implement contexts like production, sandbox, devl, test, staging, etc.
//       with type-safe properties (not just identities)
// export interface HtmlLayoutRenderContext {
// }

export interface HtmlLayoutText<Layout> {
  readonly title: (layout: Layout) => string;
}

export interface HtmlOperationalCtxDomDataAttrsResolver {
  (layout: HtmlLayout): string;
}

export interface HtmlMetaOriginDomDataAttrsResolver {
  (layout: HtmlLayout): string;
}

export interface HtmlNavigationOriginDomDataAttrsResolver {
  (layout: HtmlLayout): string;
}

export interface HtmlDesignSystemOriginDomDataAttrsResolver {
  (layout: HtmlLayout, srcModuleImportMetaURL: string, symbol: string): string;
}

export interface HtmlOriginResolvers {
  readonly meta: HtmlMetaOriginDomDataAttrsResolver;
  readonly navigation: HtmlNavigationOriginDomDataAttrsResolver;
  readonly designSystem: HtmlDesignSystemOriginDomDataAttrsResolver;
  readonly operationalCtx: HtmlOperationalCtxDomDataAttrsResolver;
  readonly dataAttrs: (
    layout: HtmlLayout,
    srcModuleImportMetaURL: string,
    symbol: string,
  ) => string;
}

export interface HtmlLayoutNavigationContext {
  readonly activeRoute?: r.Route;
  readonly activeTreeNode?: r.RouteTreeNode;
}

/*
TODO: Add Partial<govn.RenderContextSupplier<HtmlLayoutRenderContext>> to
HtmlLayout so that pages, partials, etc. can easily see which "environment"
like production, sandbox, devl, test, etc. they are running in.
*/
export interface HtmlLayout<
  // deno-lint-ignore no-explicit-any
  LayoutText extends HtmlLayoutText<any> = HtmlLayoutText<any>,
  OperationalCtxClientCargo = unknown,
> extends
  Partial<fm.FrontmatterSupplier<fm.UntypedFrontmatter>>,
  Partial<HtmlLayoutClientCargoSupplier>,
  HtmlLayoutArguments,
  HtmlLayoutNavigationContext {
  readonly bodySource: HtmlLayoutBody;
  readonly designSystem: ds.DesignSystem<Any>;
  readonly contentStrategy?: ds.UntypedDesignSystemContentStrategy;
  readonly layoutSS: HtmlLayoutStrategySupplier<Any>;
  readonly contributions: HtmlLayoutContributions;
  readonly layoutText?: LayoutText;
  readonly origin: HtmlOriginResolvers;
  readonly operationalCtxClientCargo?: OperationalCtxClientCargo;
}

/**
 * Used by Deno HTML modules as html: { text: HtmlLayoutBodySupplier }
 */
export interface HtmlLayoutBodySupplier {
  (layout: HtmlLayout): string;
}

export interface TemplateLiteralHtmlLayout<T, Layout extends HtmlLayout> {
  (
    literals: TemplateStringsArray,
    ...expressions: T[]
  ): HtmlLayoutStrategy<Layout>;
}

export interface HtmlTemplateExprBodyTextSupplier {
  (body?: string): string;
}

export interface HtmlTemplateExprLayoutSupplier<Layout extends HtmlLayout> {
  (
    layout: Layout,
    body?: string,
  ): string | contrib.TextContributionsPlaceholder;
}

export type HtmlPartialUntyped = HtmlTemplateExprLayoutSupplier<HtmlLayout>;
export type HtmlPartial<Layout extends HtmlLayout> =
  HtmlTemplateExprLayoutSupplier<Layout>;

export type HelperFunctionOrString<Layout extends HtmlLayout> =
  | HtmlPartial<Layout>
  | string;
