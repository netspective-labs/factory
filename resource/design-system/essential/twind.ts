import { tw, twind, twSheets as sh } from "./deps.ts";
import * as extn from "../../../module/mod.ts";
import * as gi from "../../../structure/govn-index.ts";
import * as c from "../../content/mod.ts";
import * as coll from "../../collection/mod.ts";
import * as direc from "../../markdown/directive/mod.ts";
import * as fm from "../../frontmatter/mod.ts";
import * as r from "../../../route/mod.ts";
import * as ren from "../../render/mod.ts";
import * as html from "../../html/mod.ts";
import * as dsGovn from "./governance.ts";
import * as p from "./partial.ts";
import * as edsGovn from "./governance.ts";

// TODO: this should really be done in the DesignSystem class but for some
// reason Tailwind complains with an error
const singletonTwSheet = sh.virtualSheet();
twind.setup({
  theme: {
    fontFamily: {
      sans: ["Helvetica", "sans-serif"],
      serif: ["Times", "serif"],
    },
  },
  sheet: singletonTwSheet,
});

export const pageIdentity = (identity: string) => `essentialDS/${identity}`;
export const thisModuleLocationRel = import.meta.url.slice(
  import.meta.url.indexOf("design-system"),
);
const pageLocation = (identity: string) =>
  `${thisModuleLocationRel}::${pageIdentity(identity)}`;

export function essentialPageLayout(
  identity: string,
  location: extn.LocationSupplier,
): dsGovn.EssentialPage {
  return html.htmlLayoutTemplate<
    html.HelperFunctionOrString<dsGovn.EssentialLayout>,
    dsGovn.EssentialLayout
  >(identity, location);
}

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const pageHeadingPartial: dsGovn.EssentialPartial = (layout) => `<!-- pageHeadingPartial -->
${layout.activeTreeNode ? `<div class="essential-header">
  <h1 class="${tw`text(3xl blue-500)`}">${layout.layoutText?.title(layout) ?? `no layout.layoutText supplier in twind.ts::pageHeadingPartial`}</h1>
</div>`: ''}`

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const typicalPageSurroundBodyPrePartial: dsGovn.EssentialPartial = (layout) => `<!-- typicalPageSurroundBodyPre -->
  <head>
    ${p.typicalHeadPartial(layout)}
    ${sh.getStyleTag(layout.designSystem.twSheet)}
    ${layout.contributions.scripts.contributions().text()}
    ${layout.contributions.stylesheets.contributions().text()}
    ${layout.contributions.head.contributions("aft").text()}
  </head>
  <body>
    ${layout.contributions.body.contributions("fore").text()}
    ${p.resourceDiagnosticsPartial(layout)}
    <header>HEADER</header>`

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const typicalPageSurroundBodyPostPartial: dsGovn.EssentialPartial = (layout) => `<!-- typicalPageSurroundBodyPost -->
    ${p.footerFixedCopyrightBuildPartial(layout)}
    ${p.typicalTailPartial(layout)}
    ${layout.contributions.body.contributions("aft").text()}
  </body>`

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const homePage = essentialPageLayout(pageIdentity('home'), { moduleImportMetaURL: import.meta.url })`<!DOCTYPE html>
<html lang="en" ${(layout) => layout.origin.dataAttrs(layout, pageLocation('homePage'), "homePage")}>
    ${typicalPageSurroundBodyPrePartial}

    <main class="container flex slds-m-vertical_small slds-container--center">
      <div class="slds-container--xlarge slds-container--center">
      ${p.typicalBodyPartial}
      </div>
      ${p.layoutDiagnosticsPartial}
    </main>

    ${typicalPageSurroundBodyPostPartial}
</html>`;

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const innerIndexPage = essentialPageLayout(pageIdentity("inner-index"), { moduleImportMetaURL: import.meta.url })`<!DOCTYPE html>
<html lang="en" ${(layout) => layout.origin.dataAttrs(layout, pageLocation("innerIndexPage"), "innerIndexPage")}>
    ${typicalPageSurroundBodyPrePartial}

    <main class="slds-container_x-large slds-container_center slds-p-around_medium">
        <div>
            ${p.breadcrumbsPartial}
            ${pageHeadingPartial}
            <div id="content" class="slds-m-top_x-large">
            ${p.typicalBodyPartial}
            </div>
            ${p.layoutDiagnosticsPartial}
        </div>
    </main>

    ${typicalPageSurroundBodyPostPartial}
</html>`;

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const innerIndexAutoPage = essentialPageLayout(pageIdentity("inner-index-auto"), { moduleImportMetaURL: import.meta.url })`<!DOCTYPE html>
<html lang="en" ${(layout) => layout.origin.dataAttrs(layout, pageLocation("innerIndexAutoPage"), "innerIndexAutoPage")}>
    ${typicalPageSurroundBodyPrePartial}

    <main class="slds-container_x-large slds-container_center slds-p-around_medium">
        <div>
          ${p.breadcrumbsWithoutTerminalPartial}
          ${pageHeadingPartial}
          <div id="content" class="slds-m-top_x-large">
          ${(layout, body) => layout.model?.isContentAvailable ? p.typicalBodyPartial(layout, body) : ''}
          ${p.autoIndexCardsBodyPartial}
          </div>
          ${p.layoutDiagnosticsPartial}
        </div>
    </main>

    ${typicalPageSurroundBodyPostPartial}
</html>`;

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const noDefinitiveLayoutPage = essentialPageLayout(pageIdentity("/no-layout"), { moduleImportMetaURL: import.meta.url })`<!DOCTYPE html>
<html lang="en" ${(layout) => layout.origin.dataAttrs(layout, pageLocation("noDefinitiveLayoutPage"), "noDefinitiveLayoutPage")}>
  <head>
    ${p.typicalHeadPartial}
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.2.0/styles/default.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.2.0/highlight.min.js"></script>
    <script>hljs.highlightAll();</script>
    <title>SLDS Diagnostics</title>
    ${(layout) => layout.contributions.head.contributions("aft")}
  </head>
  <body>
    <h1>SLDS Diagnostics</h2>
    You did not choose a proper layout either programmtically or through frontmatter.
    ${p.resourceDiagnosticsPartial}
    <h2>Layout Strategy</h2>
    <pre><code class="language-js">${(layout) => c.escapeHTML(Deno.inspect(layout.layoutSS, { depth: undefined }).trimStart())}</code></pre>
    ${p.footerFixedCopyrightBuildPartial}
    ${p.typicalTailPartial}
  </body>
</html>`;

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const noDecorationPage = essentialPageLayout(pageIdentity("no-decoration"), { moduleImportMetaURL: import.meta.url })`${p.typicalBodyPartial}`;

// deno-fmt-ignore (because we don't want ${...} wrapped)
export const smartNavigationPage = essentialPageLayout(pageIdentity("smart"), { moduleImportMetaURL: import.meta.url })`<!DOCTYPE html>
<html lang="en" ${(layout) => layout.origin.dataAttrs(layout, pageLocation("smartNavigationPage"), "smartNavigationPage")}>
  <head>
    ${p.typicalHeadPartial}
    ${(layout) => layout.contributions.scripts.contributions()}
    ${(layout) => layout.contributions.stylesheets.contributions()}
    ${(layout) => layout.contributions.head.contributions("aft")}
  </head>
  <body>
  ${(layout) => layout.contributions.body.contributions("fore")}
  ${p.resourceDiagnosticsPartial}
  <header class="slds-no-print">CONTEXT BAR</header>
  <main class="slds-container_x-large slds-container_center slds-p-around_medium">
    <div class="slds-grid slds-grid_align-left slds-gutters">
      <div class="slds-col slds-size_3-of-12 slds-no-print">
      ${p.verticalNavigationPartial}
      </div>
      <!-- data-print-class="X" will replace class="Y" for printing, see essential.js -->
      <div class="slds-size_7-of-12" data-print-class="slds-size_12-of-12">
        <div class="slds-box_x-small slds-m-around_x-small">
          <div class="slds-container--large slds-container--center">
          ${p.breadcrumbsPartial}
          ${pageHeadingPartial}
          <div id="content" class="slds-m-top_x-large">
          <article>
          ${p.typicalBodyPartial}
          </article>
          </div>
          ${p.layoutDiagnosticsPartial}
        </div>
        </div>
      </div>
      <div id="desktop-toc" class="tiktoc slds-col slds-size_2-of-12 slds-no-print">
        <aside class="toc-container slds-is-fixed">
          <div class="toc"></div> <!-- filled in by tocbot in asideTOC -->
          <div class="slds-p-top_large">
            ${p.frontmatterTagsPartial}
          </div>
        </aside>
      </div>
    </div>
  </main>
  ${p.asideTocPartial}
  ${p.footerFixedCopyrightBuildPartial}
  ${p.typicalTailPartial}
  ${(layout) => layout.contributions.body.contributions("aft")}
  </body>
</html>`;

export const defaultPage: html.HtmlLayoutStrategy<dsGovn.EssentialLayout> = {
  ...smartNavigationPage,
  identity: pageIdentity("prime"),
};

export const essentialPages: html.HtmlLayoutStrategy<
  dsGovn.EssentialLayout
>[] = [
  defaultPage,
  homePage,
  innerIndexPage,
  innerIndexAutoPage,
  smartNavigationPage,
  noDecorationPage,
  noDefinitiveLayoutPage,
];

export class EssentialDesignSystemText implements dsGovn.EssentialLayoutText {
  /**
   * Supply the <title> tag text from a inheritable set of model suppliers.
   * @param layout the active layout where the title will be rendered
   * @returns title text from first model found or from the frontmatter.title or the terminal route unit
   */
  title(layout: dsGovn.EssentialLayout) {
    const fmTitle = layout.frontmatter?.title;
    if (fmTitle) return String(fmTitle);
    const title: () => string = () => {
      if (layout.activeRoute?.terminal) {
        return layout.activeRoute?.terminal.label;
      }
      return "(no frontmatter, terminal route, or model title)";
    };
    const model = c.model<{ readonly title: string }>(
      () => {
        return { title: title() };
      },
      layout.activeTreeNode,
      layout.activeRoute,
      layout.bodySource,
    );
    return model.title || title();
  }
}

const defaultContentModel: () => c.ContentModel = () => {
  return { isContentModel: true, isContentAvailable: false };
};

export class EssentialDesignSystemLayouts<
  Layout extends dsGovn.EssentialLayout,
> extends html.DesignSystemLayouts<Layout> {
  constructor(init?: { pages?: Iterable<dsGovn.EssentialLayoutStrategy> }) {
    super({ layoutStrategy: defaultPage });
    if (init?.pages) {
      for (const page of init.pages) {
        this.layouts.set(page.identity, page);
      }
    }
  }
}

export class TailwindDesignSystem
  extends html.DesignSystem<dsGovn.EssentialLayout>
  implements dsGovn.EssentialDesignSystem {
  readonly essentialAssetsPathUnits = ["essential"];
  // deno-lint-ignore no-explicit-any
  readonly directives: c.DirectiveExpectation<any, any>[] = [
    // TODO: new ldsDirec.ActionItemDirective(),
    ...direc.allCustomElements,
  ];
  readonly twSheet = singletonTwSheet; // TODO: figure out how to make it a real instance
  readonly contentStrategy: dsGovn.EssentialDesignSystemContentStrategy;
  constructor(
    readonly extnManager: extn.ExtensionsManager,
    readonly universalAssetsBaseURL: string,
    readonly emptyContentModelLayoutSS:
      & ren.LayoutStrategySupplier<dsGovn.EssentialLayout, c.HtmlSupplier>
      & ren.ModelLayoutStrategySupplier<
        dsGovn.EssentialLayout,
        c.HtmlSupplier
      > = {
        layoutStrategy: innerIndexAutoPage,
        isInferredLayoutStrategySupplier: true,
        isModelLayoutStrategy: true,
        modelLayoutStrategyDiagnostic: "no content available",
      },
  ) {
    super(
      "EssentialDS",
      { moduleImportMetaURL: import.meta.url },
      new EssentialDesignSystemLayouts({ pages: essentialPages }),
      "/essential-ds",
      universalAssetsBaseURL,
    );
    this.directives.push(
      new direc.ProxiedContentInfuseInterpolateDirective(this.extnManager),
    );
    this.contentStrategy = { assets: this.assets() };
  }

  allowedDirectives(filter?: (DE: html.DesignSystemDirective) => boolean) {
    return filter ? this.directives.filter(filter) : this.directives;
  }

  layout(
    body: html.HtmlLayoutBody | (() => html.HtmlLayoutBody),
    layoutSS: html.HtmlLayoutStrategySupplier<dsGovn.EssentialLayout>,
    contentStrategy: dsGovn.EssentialDesignSystemContentStrategy,
  ): dsGovn.EssentialLayout {
    this.twSheet.reset();
    const bodySource = typeof body === "function" ? body() : body;
    const frontmatter = fm.isFrontmatterSupplier(bodySource)
      ? bodySource.frontmatter
      : undefined;
    const layoutArgs = this.frontmatterLayoutArgs(frontmatter);
    const activeRoute = r.isRouteSupplier(bodySource)
      ? bodySource.route
      : undefined;
    const activeTreeNode = activeRoute?.terminal
      ? contentStrategy.navigation?.routeTree.node(
        activeRoute?.terminal.qualifiedPath,
      )
      : undefined;
    const model = c.contentModel(
      defaultContentModel,
      activeTreeNode,
      activeRoute,
      bodySource,
    );
    const layoutText = contentStrategy.layoutText ??
      { title: () => `no contentStrategy.layoutText supplier in twind.ts` };
    const result: dsGovn.EssentialLayout = {
      contentStrategy,
      bodySource,
      model,
      layoutText,
      designSystem: this,
      layoutSS,
      frontmatter,
      activeRoute,
      activeTreeNode,
      contributions: contentStrategy.initContributions
        ? contentStrategy.initContributions({
          contentStrategy,
          bodySource,
          model,
          layoutText,
          designSystem: this,
          layoutSS,
          frontmatter,
          activeRoute,
          activeTreeNode,
          origin: html.typicalHtmlOriginResolvers,
          operationalCtxClientCargo: contentStrategy.operationalCtxClientCargo,
          ...layoutArgs,
        })
        : this.contributions(),
      operationalCtxClientCargo: contentStrategy.operationalCtxClientCargo,
      origin: html.typicalHtmlOriginResolvers,
      ...layoutArgs,
    };
    if (contentStrategy.lintReporter && layoutArgs?.diagnostics) {
      (result as unknown as c.Lintable).lint = (reporter) => {
        reporter.report(
          contentStrategy.lintReporter!.diagnostic(
            contentStrategy.lintReporter!.diagsShouldBeTemporary,
            result,
          ),
        );
      };
    }
    return result;
  }
}

export function essentialLintReporter(): html.DesignSystemLintReporter<
  dsGovn.EssentialLayout
> {
  return {
    report: (_ld: html.DesignSystemLintDiagnostic<dsGovn.EssentialLayout>) => {
      // TODO:
      // ldsDirec.registerActionItems(ld.layout.bodySource, undefined, {
      //   type: "lint-issue",
      //   subject: `${ld.rule.humanFriendly} (${ld.rule.code})`,
      // });
    },
    diagnostic: (rule, layout) => ({ rule, layout }),
    diagsShouldBeTemporary: {
      code: "diagnostics-should-be-temporary",
      humanFriendly: "turn off `layout: diagnostics` in frontmatter",
    },
  };
}

export function typicalHtmlResource(
  rf: r.RouteFactory,
  parentRoute: r.Route,
  childUnit: r.RouteUnit,
  frontmatter:
    & fm.UntypedFrontmatter
    & html.DesignSystemLayoutArgumentsSupplier,
  HTML: edsGovn.EssentialLayoutBodySupplier,
  origin?: r.ModuleRouteOrigin,
  indexKeys?: gi.GovnIndexKey[],
): [
  route: r.Route,
  factory: html.PersistableHtmlResource,
] {
  const route = {
    ...rf.childRoute(
      childUnit,
      parentRoute,
      true,
    ),
    nature: html.htmlContentNature,
    origin,
  };
  const htmlResource:
    & html.PersistableHtmlResource
    & r.RouteSupplier
    & fm.FrontmatterSupplier<fm.UntypedFrontmatter> = {
      nature: html.htmlContentNature,
      frontmatter,
      route,
      html: {
        // deno-lint-ignore require-await
        text: async (layout: edsGovn.EssentialLayout) => HTML(layout),
        textSync: HTML,
      },
    };
  if (indexKeys) {
    (htmlResource as unknown as gi.MutatableGovnIndexKeysSupplier)
      .indexKeys = indexKeys;
  }
  return [route, htmlResource];
}

export function smartNavigationPageHtmlFactory(
  rf: r.RouteFactory,
  parentRoute: r.Route,
  childUnit: r.RouteUnit,
  HTML: edsGovn.EssentialLayoutBodySupplier,
  origin?: r.ModuleRouteOrigin,
  indexKeys?: gi.GovnIndexKey[],
): [
  route: r.Route,
  factory: coll.ResourceFactorySupplier<c.HtmlResource>,
] {
  const frontmatter:
    & fm.UntypedFrontmatter
    & html.DesignSystemLayoutArgumentsSupplier = {
      layout: {
        identity: smartNavigationPage.identity,
      },
    };

  return typicalHtmlFactory(
    rf,
    parentRoute,
    childUnit,
    frontmatter,
    HTML,
    origin,
    indexKeys,
  );
}

export function typicalHtmlFactory(
  rf: r.RouteFactory,
  parentRoute: r.Route,
  childUnit: r.RouteUnit,
  frontmatter:
    & fm.UntypedFrontmatter
    & html.DesignSystemLayoutArgumentsSupplier,
  HTML: edsGovn.EssentialLayoutBodySupplier,
  origin?: r.ModuleRouteOrigin,
  indexKeys?: gi.GovnIndexKey[],
): [
  route: r.Route,
  factory: coll.ResourceFactorySupplier<c.HtmlResource>,
] {
  const [route, resource] = typicalHtmlResource(
    rf,
    parentRoute,
    childUnit,
    frontmatter,
    HTML,
    origin,
    indexKeys,
  );
  return [route, {
    // deno-lint-ignore require-await
    resourceFactory: async () => {
      return resource;
    },
  }];
}

export function autoIndexHtmlFactory(
  rf: r.RouteFactory,
  parentRoute: r.Route,
  label: string,
  origin?: r.ModuleRouteOrigin,
  indexKeys?: gi.GovnIndexKey[],
): [
  route: r.Route,
  factory: coll.ResourceFactorySupplier<c.HtmlResource>,
] {
  const route = {
    ...rf.childRoute(
      { unit: html.indexUnitName, label },
      parentRoute,
      true,
    ),
    nature: html.htmlContentNature,
    origin,
  };
  return [route, {
    // deno-lint-ignore require-await
    resourceFactory: async () => {
      const frontmatter:
        & fm.UntypedFrontmatter
        & html.DesignSystemLayoutArgumentsSupplier = {
          layout: {
            identity: innerIndexAutoPage.identity,
          },
        };

      // body is empty since it's an auto-index page
      const HTML = ``;
      const htmlResource:
        & html.PersistableHtmlResource
        & r.RouteSupplier
        & fm.FrontmatterSupplier<fm.UntypedFrontmatter> = {
          nature: html.htmlContentNature,
          frontmatter,
          route,
          html: {
            text: HTML,
            textSync: HTML,
          },
        };
      if (indexKeys) {
        (htmlResource as unknown as gi.MutatableGovnIndexKeysSupplier)
          .indexKeys = indexKeys;
      }
      return htmlResource;
    },
  }];
}
