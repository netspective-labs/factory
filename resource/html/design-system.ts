import * as safety from "../../safety/mod.ts";
import * as k from "../../knowledge/mod.ts";
import * as extn from "../../module/mod.ts";
import * as git from "../../git/mod.ts";
import * as ws from "../../workspace/mod.ts";
import * as contrib from "../../text/contributions.ts";
import * as notif from "../../notification/mod.ts";
import * as c from "../content/mod.ts";
import * as fm from "../frontmatter/mod.ts";
import * as l from "./layout.ts";
import * as n from "./nature.ts";
import * as htmlRen from "./render.ts";
import * as coll from "../collection/mod.ts";
import * as r from "../../route/mod.ts";
import * as ren from "../render/mod.ts";
import * as p from "../persist/mod.ts";

export const indexUnitName = "index";

export interface MutableNavigationTreeIndexNode {
  isIndexNode: boolean;
}

export const isMutableNavigationTreeIndexNode = safety.typeGuard<
  MutableNavigationTreeIndexNode
>();

export type NavigationTreeIndexNode = Readonly<MutableNavigationTreeIndexNode>;

export const isNavigationTreeIndexNode = safety.typeGuard<
  NavigationTreeIndexNode
>();

export interface DesignSystemLayoutArgumentsSupplier {
  readonly layout:
    | ren.RenderStrategyIdentity
    | ({
      readonly identity?: ren.RenderStrategyIdentity;
    } & l.HtmlLayoutArguments);
}

export const isPotentialDesignSystemLayoutArgumentsSupplier = safety.typeGuard<
  DesignSystemLayoutArgumentsSupplier
>("layout");

export function isDesignSystemLayoutArgumentsSupplier(
  o: unknown,
): o is DesignSystemLayoutArgumentsSupplier {
  if (isPotentialDesignSystemLayoutArgumentsSupplier(o)) {
    if (typeof o.layout === "string") return true;
    if (typeof o.layout === "object") return true;
  }
  return false;
}

export interface DesignSystemArgumentsSupplier {
  readonly designSystem: DesignSystemLayoutArgumentsSupplier;
}

export const isPotentialDesignSystemArgumentsSupplier = safety.typeGuard<
  DesignSystemArgumentsSupplier
>("designSystem");

export interface KebabCaseDesignSystemArgumentsSupplier {
  readonly "design-system": DesignSystemLayoutArgumentsSupplier;
}

export const isKebabCaseDesignSystemArgumentsSupplier = safety.typeGuard<
  KebabCaseDesignSystemArgumentsSupplier
>("design-system");

export function isDesignSystemArgumentsSupplier(
  o: unknown,
): o is DesignSystemArgumentsSupplier {
  if (isPotentialDesignSystemArgumentsSupplier(o)) {
    if (isDesignSystemLayoutArgumentsSupplier(o.designSystem)) return true;
  }
  return false;
}

export function isFlexibleMutatedDesignSystemArgumentsSupplier(
  o: unknown,
): o is DesignSystemArgumentsSupplier {
  if (isKebabCaseDesignSystemArgumentsSupplier(o)) {
    // deno-lint-ignore no-explicit-any
    const mutatableO = o as any;
    mutatableO.designSystem = o["design-system"];
    delete mutatableO["design-system"];
  }
  return isDesignSystemArgumentsSupplier(o);
}

export function designSystemTemplate(
  identity: string,
  location: extn.LocationSupplier,
) {
  return htmlRen.htmlLayoutTemplate<
    l.HelperFunctionOrString<l.HtmlLayout>,
    l.HtmlLayout
  >(identity, location);
}

export const typicalDesignSystemBodyPartial: l.HtmlPartial<l.HtmlLayout> = (
  _,
  body,
) => body || "<!-- no design system body -->";

export const designSystemNoDecorationPage = designSystemTemplate(
  "ds/page/no-decoration",
  { moduleImportMetaURL: import.meta.url },
)`${typicalDesignSystemBodyPartial}`;

export function layoutFrontmatter(
  layout: DesignSystemLayoutArgumentsSupplier,
):
  & fm.UntypedFrontmatter
  & DesignSystemLayoutArgumentsSupplier {
  return layout as
    & fm.UntypedFrontmatter
    & DesignSystemLayoutArgumentsSupplier;
}

export class DesignSystemLayouts<Layout extends l.HtmlLayout>
  implements ren.LayoutStrategies<Layout, c.HtmlSupplier> {
  readonly layouts: Map<
    ren.LayoutStrategyIdentity,
    l.HtmlLayoutStrategy<Layout>
  > = new Map();

  constructor(
    readonly defaultLayoutStrategySupplier: l.HtmlLayoutStrategySupplier<
      Layout
    >,
  ) {
    this.layouts.set(
      designSystemNoDecorationPage.identity,
      designSystemNoDecorationPage,
    );
  }

  layoutStrategy(
    name: ren.LayoutStrategyIdentity,
  ): l.HtmlLayoutStrategy<Layout> | undefined {
    return this.layouts.get(name);
  }

  diagnosticLayoutStrategy(
    layoutStrategyErrorDiagnostic: string,
    dl?: l.HtmlLayoutStrategySupplier<Layout>,
  ): ren.LayoutStrategySupplier<Layout, c.HtmlSupplier> {
    const result: ren.ErrorLayoutStrategySupplier<Layout, c.HtmlSupplier> = {
      ...(dl || this.defaultLayoutStrategySupplier),
      isErrorLayoutStrategySupplier: true,
      layoutStrategyErrorDiagnostic,
    };
    return result;
  }

  namedLayoutStrategy(
    name: ren.LayoutStrategyIdentity,
  ): ren.LayoutStrategySupplier<Layout, c.HtmlSupplier> {
    const layoutStrategy = this.layoutStrategy(name);
    if (layoutStrategy) {
      const named: ren.NamedLayoutStrategySupplier<Layout, c.HtmlSupplier> = {
        layoutStrategy,
        isNamedLayoutStrategyStrategySupplier: true,
        layoutStrategyIdentity: name,
      };
      return named;
    }
    return this.diagnosticLayoutStrategy(`layout named '${name}' not found`);
  }
}

export type DesignSystemAssetURL = string;

export interface DesignSystemAssetLocationSupplier {
  (relURL: DesignSystemAssetURL): DesignSystemAssetURL;
}

export interface DesignSystemAssetLocations
  extends l.HtmlLayoutClientCargoValueSupplier {
  readonly dsImage: DesignSystemAssetLocationSupplier; // design system
  readonly dsScript: DesignSystemAssetLocationSupplier; // design system
  readonly dsStylesheet: DesignSystemAssetLocationSupplier; // design system
  readonly dsComponent: DesignSystemAssetLocationSupplier; // design system
  readonly uImage: DesignSystemAssetLocationSupplier; // universal design system
  readonly uScript: DesignSystemAssetLocationSupplier; // universal design system
  readonly uStylesheet: DesignSystemAssetLocationSupplier; // universal design system
  readonly uComponent: DesignSystemAssetLocationSupplier; // universal design system
  readonly image: DesignSystemAssetLocationSupplier; // local site
  readonly favIcon: DesignSystemAssetLocationSupplier; // local site
  readonly script: DesignSystemAssetLocationSupplier; // local site
  readonly stylesheet: DesignSystemAssetLocationSupplier; // local site
  readonly component: DesignSystemAssetLocationSupplier; // local site
  readonly brandImage: DesignSystemAssetLocationSupplier; // white label ("brandable")
  readonly brandScript: DesignSystemAssetLocationSupplier; // white label ("brandable")
  readonly brandStylesheet: DesignSystemAssetLocationSupplier; // white label ("brandable")
  readonly brandComponent: DesignSystemAssetLocationSupplier; // white label ("brandable")
  readonly brandFavIcon: DesignSystemAssetLocationSupplier; // white label ("brandable")
}

// deno-lint-ignore no-empty-interface
export interface DesignSystemNotification extends notif.Notification {
}

// deno-lint-ignore no-empty-interface
export interface DesignSystemNotifications<T extends DesignSystemNotification>
  extends notif.Notifications<T> {
}

export interface DesignSystemNavigationStrategy<
  Layout extends l.HtmlLayout,
> extends r.RouteTreeSupplier, l.HtmlLayoutClientCargoValueSupplier {
  readonly home: r.RouteLocation;
  readonly contentTree: (
    layout: Layout,
  ) => r.RouteTreeNode | undefined;
  readonly location: (unit: r.RouteNode) => r.RouteLocation;
  readonly redirectUrl: (
    rs: r.RedirectSupplier,
  ) => r.RouteLocation | undefined;
  readonly notifications: <Notification extends DesignSystemNotification>(
    unit: r.RouteTreeNode,
  ) => DesignSystemNotifications<Notification> | undefined;
  readonly descendantsNotifications: <
    Notification extends DesignSystemNotification,
  >(
    unit: r.RouteTreeNode,
  ) => DesignSystemNotifications<Notification> | undefined;
}

export interface DesignSystemLintDiagnostic<Layout extends l.HtmlLayout>
  extends c.LintDiagnostic {
  readonly layout: Layout;
}

export const isDesignSystemLintDiagnostic = safety.typeGuard<
  // deno-lint-ignore no-explicit-any
  DesignSystemLintDiagnostic<any>
>("rule", "layout");

export interface DesignSystemLintReporter<Layout extends l.HtmlLayout>
  extends c.LintReporter<DesignSystemLintDiagnostic<Layout>> {
  readonly diagnostic: (
    rule: c.LintRule,
    layout: Layout,
  ) => DesignSystemLintDiagnostic<Layout>;
  readonly diagsShouldBeTemporary: c.LintRule;
}

export interface DesignSystemLayoutContribsInitializer<
  Layout extends l.HtmlLayout,
> {
  (layout: Omit<Layout, "contributions">): l.HtmlLayoutContributions;
}

export interface DesignSystemContentStrategy<
  Layout extends l.HtmlLayout,
  LayoutText extends l.HtmlLayoutText<Layout>,
  AssetLocations extends DesignSystemAssetLocations,
  Navigation extends DesignSystemNavigationStrategy<Layout>,
  OperationalCtxClientCargo = unknown,
> {
  // TODO: replace with gitRepo?: (something) => git.GitExecutive where `something`
  // is a location or contentRoot or _something_ which would allow multiple
  // git repos to be determined; or can we just get it from mGitResolvers?
  readonly git?: git.GitExecutive;
  readonly mGitResolvers?: git.ManagedGitResolvers<string>;
  readonly routeGitRemoteResolver?: r.RouteGitRemoteResolver<
    l.GitRemoteAnchor
  >;
  readonly wsEditorResolver?: ws.WorkspaceEditorTargetResolver<
    ws.WorkspaceEditorTarget
  >;
  readonly wsEditorRouteResolver?: r.RouteWorkspaceEditorResolver<
    ws.WorkspaceEditorTarget
  >;
  readonly layoutText?: LayoutText;
  readonly assets: AssetLocations;
  readonly navigation?: Navigation;
  readonly termsManager?: k.TermsManager;
  readonly renderedAt?: Date;
  readonly lintReporter?: DesignSystemLintReporter<Layout>;
  readonly initContributions?: DesignSystemLayoutContribsInitializer<Layout>;
  readonly operationalCtxClientCargo?: OperationalCtxClientCargo;
}

export type UntypedDesignSystemContentStrategy = DesignSystemContentStrategy<
  // deno-lint-ignore no-explicit-any
  any,
  // deno-lint-ignore no-explicit-any
  any,
  // deno-lint-ignore no-explicit-any
  any,
  // deno-lint-ignore no-explicit-any
  any
>;

export interface DesignSystemFactory<
  Layout extends l.HtmlLayout,
  LayoutText extends l.HtmlLayoutText<Layout>,
  AssetLocations extends DesignSystemAssetLocations,
  Navigation extends DesignSystemNavigationStrategy<Layout>,
> {
  readonly beforeFirstRender?: (
    dsf: DesignSystemFactory<Layout, LayoutText, AssetLocations, Navigation>,
  ) => Promise<void>;
  readonly designSystem: DesignSystem<Layout>;
  readonly contentStrategy: DesignSystemContentStrategy<
    Layout,
    LayoutText,
    AssetLocations,
    Navigation
  >;
}

export class DesignSystemNavigation<Layout extends l.HtmlLayout>
  implements DesignSystemNavigationStrategy<Layout> {
  constructor(
    readonly prettyURLs: boolean,
    readonly routeTree: r.TypicalRouteTree,
    readonly home = "/", // TODO: adjust for base location etc.
  ) {
  }

  contentTree(layout: Layout): r.RouteTreeNode | undefined {
    return layout.activeTreeNode?.parent;
  }

  location(unit: r.RouteNode): string {
    if (this.prettyURLs) {
      const loc = unit.qualifiedPath === "/index" ? "/" : unit.location();
      return loc.endsWith("/index")
        ? loc.endsWith("/") ? `${loc}..` : `${loc}/..`
        : (loc.endsWith("/") ? loc : `${loc}/`);
    }
    return unit.qualifiedPath === "/index" ? "/" : unit.location();
  }

  redirectUrl(
    rs: r.RedirectSupplier,
  ): r.RouteLocation | undefined {
    return r.isRedirectUrlSupplier(rs)
      ? rs.redirect
      : this.location(rs.redirect);
  }

  notifications<
    Notifications extends DesignSystemNotifications<DesignSystemNotification>,
  >(
    node: r.RouteTreeNode,
  ): Notifications | undefined {
    if (notif.isNotificationsSupplier(node)) {
      return node.notifications as Notifications;
    }
  }

  descendantsNotifications<Notification extends DesignSystemNotification>(
    node: r.RouteTreeNode,
  ): DesignSystemNotifications<Notification> | undefined {
    const notifications = (parentRTN: r.RouteTreeNode) => {
      const accumulate: Notification[] = [];
      parentRTN.walk((rtn) => {
        if (notif.isNotificationsSupplier<Notification>(rtn)) {
          for (const lnn of rtn.notifications.collection) {
            let found = false;
            for (const lnnA of accumulate) {
              if (lnnA.identity == lnn.identity) {
                lnnA.count(lnnA.count() + lnn.count());
                found = true;
                break;
              }
            }
            if (!found) {
              let count = lnn.count();
              accumulate.push({
                ...lnn,
                count: (set) => (set ? (count = set) : count),
              });
            }
          }
        }
        return true;
      });
      if (notif.isNotificationsSupplier<Notification>(parentRTN)) {
        for (const lnn of parentRTN.notifications.collection) {
          let found = false;
          for (const lnnA of accumulate) {
            if (lnnA.identity == lnn.identity) {
              lnnA.count(lnnA.count() + lnn.count());
              found = true;
              break;
            }
          }
          if (!found) {
            let count = lnn.count();
            accumulate.push({
              ...lnn,
              count: (set) => (set ? (count = set) : count),
            });
          }
        }
      }
      return accumulate;
    };

    const collection = notifications(node);
    if (collection.length > 0) {
      return { collection } as DesignSystemNotifications<Notification>;
    }
    return undefined;
  }

  clientCargoValue(_layout: l.HtmlLayout) {
    let locationJsFn = "";
    if (this.prettyURLs) {
      locationJsFn = `{
          const loc = unit.qualifiedPath === "/index" ? "/" : unit.location();
          return loc.endsWith("/index")
            ? loc.endsWith("/") ? \`\${loc}..\` : \`\${loc}/..\`
            : (loc.endsWith("/") ? loc : \`\${loc}/\`);
        }`;
    } else {
      locationJsFn = `unit.qualifiedPath === "/index" ? "/" : unit.location()`;
    }
    return `{
      location: (unit) => ${locationJsFn}
    }`;
  }
}

// deno-lint-ignore no-explicit-any
export type DesignSystemDirective = c.DirectiveExpectation<any, any>;

export abstract class DesignSystem<Layout extends l.HtmlLayout>
  implements
    ren.RenderStrategy<Layout, c.HtmlSupplier>,
    c.DirectiveExpectationsSupplier<DesignSystemDirective> {
  readonly prettyUrlIndexUnitName = "index";
  constructor(
    readonly identity: ren.RenderStrategyIdentity,
    readonly location: extn.LocationSupplier,
    readonly layoutStrategies: DesignSystemLayouts<Layout>,
    readonly dsAssetsBaseURL: string,
    readonly universalAssetsBaseURL: string,
  ) {
  }

  abstract layout(
    body: l.HtmlLayoutBody | (() => l.HtmlLayoutBody),
    supplier: l.HtmlLayoutStrategySupplier<Layout>,
    contentStrategy: UntypedDesignSystemContentStrategy,
    ...args: unknown[]
  ): Layout;

  abstract allowedDirectives(
    filter?: (DE: DesignSystemDirective) => boolean,
  ): DesignSystemDirective[];

  frontmatterLayoutStrategy(
    layoutArgs: DesignSystemLayoutArgumentsSupplier,
    fmPropertyName: string,
  ):
    | ren.LayoutStrategySupplier<Layout, c.HtmlSupplier>
    | undefined {
    const strategyName = typeof layoutArgs.layout == "string"
      ? layoutArgs.layout
      : layoutArgs.layout.identity;
    if (!strategyName) return undefined;
    if (typeof strategyName === "string") {
      const layoutStrategy = strategyName
        ? this.layoutStrategies.layoutStrategy(strategyName)
        : undefined;
      if (layoutStrategy) {
        const named:
          & ren.NamedLayoutStrategySupplier<Layout, c.HtmlSupplier>
          & ren.FrontmatterLayoutStrategySupplier<Layout, c.HtmlSupplier> = {
            layoutStrategy,
            isNamedLayoutStrategyStrategySupplier: true,
            isInferredLayoutStrategySupplier: true,
            isFrontmatterLayoutStrategy: true,
            layoutStrategyIdentity: strategyName,
            frontmatterLayoutStrategyPropertyName: fmPropertyName,
          };
        return named;
      }
    }
  }

  modelLayoutStrategy(diagnostic: string, strategyName?: unknown):
    | ren.LayoutStrategySupplier<Layout, c.HtmlSupplier>
    | undefined {
    if (!strategyName) return undefined;
    if (typeof strategyName === "string") {
      const layoutStrategy = strategyName
        ? this.layoutStrategies.layoutStrategy(strategyName)
        : undefined;
      if (layoutStrategy) {
        const named:
          & ren.NamedLayoutStrategySupplier<Layout, c.HtmlSupplier>
          & ren.ModelLayoutStrategySupplier<Layout, c.HtmlSupplier> = {
            layoutStrategy,
            isNamedLayoutStrategyStrategySupplier: true,
            isInferredLayoutStrategySupplier: true,
            isModelLayoutStrategy: true,
            layoutStrategyIdentity: strategyName,
            modelLayoutStrategyDiagnostic: diagnostic,
          };
        return named;
      }
    }
  }

  inferredLayoutStrategy(
    s: Partial<
      | fm.FrontmatterSupplier<fm.UntypedFrontmatter>
      | c.ModelSupplier<c.UntypedModel>
    >,
  ): ren.LayoutStrategySupplier<Layout, c.HtmlSupplier> {
    const sourceMap = `(${import.meta.url}::inferredLayoutStrategy)`;
    if (fm.isFrontmatterSupplier(s)) {
      if (isDesignSystemLayoutArgumentsSupplier(s.frontmatter)) {
        const layout = this.frontmatterLayoutStrategy(s.frontmatter, "layout");
        if (layout) return layout;
        return this.layoutStrategies.diagnosticLayoutStrategy(
          `frontmatter 'layout' not found ${sourceMap}`,
        );
      }
      if (isFlexibleMutatedDesignSystemArgumentsSupplier(s.frontmatter)) {
        const layout = this.frontmatterLayoutStrategy(
          s.frontmatter.designSystem,
          "design-system.layout",
        );
        if (layout) return layout;
        return this.layoutStrategies.diagnosticLayoutStrategy(
          `frontmatter 'design-system.layout' not found ${sourceMap}`,
        );
      }
      return this.layoutStrategies.diagnosticLayoutStrategy(
        `frontmatter 'layout' or 'designSystem.layout' property not available, using default ${sourceMap}`,
      );
    }
    return this.layoutStrategies.diagnosticLayoutStrategy(
      `neither frontmatter nor model available, using default ${sourceMap}`,
    );
  }

  frontmatterLayoutArgs(
    utfm?: fm.UntypedFrontmatter,
  ): l.HtmlLayoutArguments | undefined {
    if (isDesignSystemLayoutArgumentsSupplier(utfm)) {
      return typeof utfm.layout === "string" ? undefined : utfm.layout;
    }
    if (isFlexibleMutatedDesignSystemArgumentsSupplier(utfm)) {
      return typeof utfm.designSystem.layout === "string"
        ? undefined
        : utfm.designSystem.layout;
    }
  }

  contributions(): l.HtmlLayoutContributions {
    return {
      scripts: contrib.contributions("<!-- scripts contrib -->"),
      stylesheets: contrib.contributions("<!-- stylesheets contrib -->"),
      head: contrib.contributions("<!-- head contrib -->"),
      body: contrib.contributions("<!-- body contrib -->"),
      bodyMainContent: contrib.contributions(
        "<!-- body main content contrib -->",
      ),
      diagnostics: contrib.contributions("<!-- diagnostics contrib -->"),
      domContentLoadedJS: contrib.contributions(
        "<!-- DOMContentLoaded contrib -->",
      ),
    };
  }

  /**
   * Server-side and client-side access to asset locators. For image, favIcon,
   * script, and stylesheet that is app-specific (meaning managed outside of
   * the design-system) those locations are relative to base. For design system
   * specific dsImage, dsScript, dsComponent, etc. they are relative to the
   * design system's chosen conventions.
   * @param base base URL for non-design-system-specific URLs
   * @param inherit any settings to inherit
   * @returns functions which will locate assets on server and client
   */
  assets(
    base = "", // should NOT be terminated by / since assets will be prefixed by /
    inherit?: Partial<DesignSystemAssetLocations>,
  ): DesignSystemAssetLocations {
    // these must match, precisely, what is in design system Javascript rfLayout()
    return {
      dsImage: (relURL) => `${this.dsAssetsBaseURL}/image${relURL}`,
      dsScript: (relURL) => `${this.dsAssetsBaseURL}/script${relURL}`,
      dsStylesheet: (relURL) => `${this.dsAssetsBaseURL}/style${relURL}`,
      dsComponent: (relURL) => `${this.dsAssetsBaseURL}/component${relURL}`,
      uImage: (relURL) => `${this.universalAssetsBaseURL}/image${relURL}`,
      uScript: (relURL) => `${this.universalAssetsBaseURL}/script${relURL}`,
      uStylesheet: (relURL) => `${this.universalAssetsBaseURL}/style${relURL}`,
      uComponent: (relURL) =>
        `${this.universalAssetsBaseURL}/component${relURL}`,
      image: (relURL) => `${base}${relURL}`,
      favIcon: (relURL) => `${base}${relURL}`,
      script: (relURL) => `${base}${relURL}`,
      stylesheet: (relURL) => `${base}${relURL}`,
      component: (relURL) => `${base}${relURL}`,
      brandImage: (relURL) => `${base}/brand${relURL}`,
      brandFavIcon: (relURL) => `${base}/brand${relURL}`,
      brandScript: (relURL) => `${base}/brand${relURL}`,
      brandStylesheet: (relURL) => `${base}/brand${relURL}`,
      brandComponent: (relURL) => `${base}/brand${relURL}`,
      ...inherit,
    };
  }

  pageRenderer(
    contentStrategy: UntypedDesignSystemContentStrategy,
    refine?: coll.ResourceRefinery<l.HtmlLayoutBody>,
  ): coll.ResourceRefinery<c.HtmlSupplier> {
    return async (resource) => {
      const lss =
        fm.isFrontmatterSupplier(resource) || c.isModelSupplier(resource)
          ? this.inferredLayoutStrategy(resource)
          : this.layoutStrategies.diagnosticLayoutStrategy(
            "Neither frontmatter nor model supplied to LightingDesignSystem.pageRenderer",
          );
      return await lss.layoutStrategy.rendered(this.layout(
        refine ? await refine(resource) : resource,
        lss,
        contentStrategy,
      ));
    };
  }

  pageRendererSync(
    contentStrategy: UntypedDesignSystemContentStrategy,
    refine?: coll.ResourceRefinerySync<l.HtmlLayoutBody>,
  ): coll.ResourceRefinerySync<c.HtmlSupplier> {
    return (resource) => {
      const lss =
        fm.isFrontmatterSupplier(resource) || c.isModelSupplier(resource)
          ? this.inferredLayoutStrategy(resource)
          : this.layoutStrategies.diagnosticLayoutStrategy(
            "Neither frontmatter nor model supplied to LightingDesignSystem.pageRendererSync",
          );
      return lss.layoutStrategy.renderedSync(this.layout(
        refine ? refine(resource) : resource,
        lss,
        contentStrategy,
      ));
    };
  }

  /**
   * A resource refinery that will look at the resource to see if it's HTML-
   * renderable and renders, then persists the resource. If it's not HTML-
   * renderable the resource remains untouched.
   * @returns a refinery function that can be passed into a pipeline
   */
  potentialPrettyUrlsHtmlProducer(
    destRootPath: string,
    contentStrategy: UntypedDesignSystemContentStrategy,
    options?: {
      readonly isPersisting?: boolean;
      readonly fspEE?: p.FileSysPersistenceEventsEmitter;
      readonly memoize?: (
        resource: c.HtmlSupplier,
        suggestedDestName: string,
        producer: (replay: c.HtmlSupplier) => Promise<c.HtmlSupplier>,
      ) => Promise<void>;
    },
  ): coll.ResourceRefinery<c.HtmlSupplier> {
    const { isPersisting = true, fspEE, memoize } = options ?? {};
    const producer = isPersisting
      ? coll.pipelineUnitsRefineryUntyped(
        this.pageRenderer(contentStrategy),
        n.htmlContentNature.persistFileSysRefinery(
          destRootPath,
          p.routePersistPrettyUrlHtmlNamingStrategy((ru) =>
            ru.unit === this.prettyUrlIndexUnitName
          ),
          fspEE,
        ),
      )
      : this.pageRenderer(contentStrategy);

    return async (resource) => {
      if (
        ren.isRenderableMediaTypeResource(
          resource,
          c.htmlMediaTypeNature.mediaType,
        )
      ) {
        if (memoize) {
          const ns = p.routePersistPrettyUrlHtmlNamingStrategy((ru) =>
            ru.unit === this.prettyUrlIndexUnitName
          );
          const suggestedDestName = r.isRouteSupplier(resource)
            ? ns(resource, destRootPath)
            : "/potentialPrettyUrlsHtmlProducer/resource/not-route-supplier.html";
          memoize(resource, suggestedDestName, async (replay) => {
            return await producer(replay);
          });
        }
        return await producer(resource);
      }
      // we cannot handle this type of rendering target, no change to resource
      return resource;
    };
  }
}
