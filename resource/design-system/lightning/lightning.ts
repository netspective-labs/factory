import * as extn from "../../../module/mod.ts";
import * as c from "../../content/mod.ts";
import * as direc from "../../markdown/directive/mod.ts";
import * as fm from "../../frontmatter/mod.ts";
import * as r from "../../../route/mod.ts";
import * as ren from "../../render/mod.ts";
import * as html from "../../html/mod.ts";
import * as ldsGovn from "./governance.ts";
import * as l from "./layout/mod.ts";
import * as ldsDirec from "./directive/mod.ts";
import * as udsp from "../universal/publication.ts";
import * as rws from "../../../route/commons/weight.ts";

export class LightingDesignSystemLayouts<
  Layout extends ldsGovn.LightningLayout,
> extends html.DesignSystemLayouts<Layout> {
  constructor() {
    super({ layoutStrategy: l.defaultPage });
    l.autoRegisterPages.forEach((l) => this.layouts.set(l.identity, l));
  }
}

export class LightingDesignSystemNavigation
  extends html.DesignSystemNavigation<ldsGovn.LightningLayout>
  implements ldsGovn.LightningNavigation {
  contextBarItems(_layout: ldsGovn.LightningLayout): r.RouteNode[] {
    return this.routeTree.items.length > 0 ? this.routeTree.items : [];
  }
}

export class LightingDesignSystemText implements ldsGovn.LightningLayoutText {
  /**
   * Supply the <title> tag text from a inheritable set of model suppliers.
   * @param layout the active layout where the title will be rendered
   * @returns title text from first model found or from the frontmatter.title or the terminal route unit
   */
  title(layout: ldsGovn.LightningLayout) {
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

export class LightingDesignSystem<Layout extends ldsGovn.LightningLayout>
  extends html.DesignSystem<Layout> {
  readonly lightningAssetsPathUnits = ["lightning"];
  // deno-lint-ignore no-explicit-any
  readonly directives: c.DirectiveExpectation<any, any>[] = [
    new ldsDirec.ActionItemDirective(),
    ...direc.allCustomElements,
  ];
  constructor(
    readonly extnManager: extn.ExtensionsManager,
    readonly universalAssetsBaseURL: string,
    readonly emptyContentModelLayoutSS:
      & ren.LayoutStrategySupplier<Layout, c.HtmlSupplier>
      & ren.ModelLayoutStrategySupplier<Layout, c.HtmlSupplier> = {
        layoutStrategy: l.innerIndexAutoPage,
        isInferredLayoutStrategySupplier: true,
        isModelLayoutStrategy: true,
        modelLayoutStrategyDiagnostic: "no content available",
      },
  ) {
    super(
      "LightningDS",
      { moduleImportMetaURL: import.meta.url },
      new LightingDesignSystemLayouts(),
      "/lightning",
      universalAssetsBaseURL,
    );
    this.directives.push(
      new direc.ProxiedContentInfuseInterpolateDirective(this.extnManager),
    );
  }

  allowedDirectives(filter?: (DE: html.DesignSystemDirective) => boolean) {
    return filter ? this.directives.filter(filter) : this.directives;
  }

  assets(
    base = "", // should NOT be terminated by / since assets will be prefixed by /
    inherit?: Partial<html.DesignSystemAssetLocations>,
  ): ldsGovn.LightningAssetLocations {
    const dsAssets = super.assets(base, inherit);
    const ldsAssets: ldsGovn.LightningAssetLocations = {
      ...dsAssets,
      ldsIcons: (relURL) => `${this.dsAssetsBaseURL}/image/slds-icons${relURL}`,
    };
    return ldsAssets;
  }

  inferredLayoutStrategy(
    s: Partial<
      | fm.FrontmatterSupplier<fm.UntypedFrontmatter>
      | c.ModelSupplier<c.UntypedModel>
    >,
  ): ren.LayoutStrategySupplier<Layout, c.HtmlSupplier> {
    if (c.isContentModelSupplier(s) && !s.model.isContentAvailable) {
      return this.emptyContentModelLayoutSS;
    }
    return super.inferredLayoutStrategy(s);
  }

  layout(
    body: html.HtmlLayoutBody | (() => html.HtmlLayoutBody),
    layoutSS: html.HtmlLayoutStrategySupplier<Layout>,
    contentStrategy: ldsGovn.LightingDesignSystemContentStrategy,
  ): Layout {
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
    const result: ldsGovn.LightningLayout = {
      contentStrategy,
      bodySource,
      model,
      layoutText: contentStrategy?.layoutText,
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
          layoutText: contentStrategy.layoutText,
          designSystem: this,
          layoutSS,
          frontmatter,
          activeRoute,
          activeTreeNode,
          clientCargoPropertyName: "clientLayout",
          origin: html.typicalHtmlOriginResolvers,
          operationalCtxClientCargo: contentStrategy.operationalCtxClientCargo,
          ...layoutArgs,
        })
        : this.contributions(),
      clientCargoPropertyName: "clientLayout",
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
    return result as Layout; // TODO: consider not casting to type
  }
}

export class LightningRoutes extends udsp.PublicationRoutes {
  constructor(
    readonly routeFactory: r.RouteFactory,
    readonly contextBarLevel = 1,
  ) {
    super(routeFactory, new udsp.ResourcesTree(routeFactory));
  }

  prepareNavigationTree() {
    // this.navigationTree.consumeRoute(
    //   ocC.diagnosticsObsRedirectRoute(this.routeFactory),
    // );
    this.resourcesTree.consumeAliases();
    this.navigationTree.consumeTree(
      this.resourcesTree,
      (node) => {
        if (
          ldsGovn.isNavigationTreeContextBarNode(node) &&
          node.isContextBarRouteNode
        ) {
          return true;
        }
        if (node.level < this.contextBarLevel) return false;
        return ren.isRenderableMediaTypeResource(
            node.route,
            c.htmlMediaTypeNature.mediaType,
          )
          ? true
          : false;
      },
      { order: rws.orderByWeight },
    );
  }
}

export function lightningLintReporter(): html.DesignSystemLintReporter<
  ldsGovn.LightningLayout
> {
  return {
    report: (ld: html.DesignSystemLintDiagnostic<ldsGovn.LightningLayout>) => {
      ldsDirec.registerActionItems(ld.layout.bodySource, undefined, {
        type: "lint-issue",
        subject: `${ld.rule.humanFriendly} (${ld.rule.code})`,
      });
    },
    diagnostic: (rule, layout) => ({ rule, layout }),
    diagsShouldBeTemporary: {
      code: "diagnostics-should-be-temporary",
      humanFriendly: "turn off `layout: diagnostics` in frontmatter",
    },
  };
}
