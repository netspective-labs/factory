import * as safety from "../../safety/mod.ts";
import * as contrib from "../../text/contributions.ts";
import * as extn from "../../module/mod.ts";
import * as hn from "../html/nature.ts";
import * as c from "../content/mod.ts";
import * as coll from "../collection/mod.ts";
import * as fm from "../frontmatter/mod.ts";
import * as el from "./layout.ts";
import * as ren from "../render/mod.ts";
import * as p from "../persist/mod.ts";
import * as govn from "./governance.ts";

export interface EmailDesignSystemLayoutArgumentsSupplier {
  readonly layout:
    | ren.RenderStrategyIdentity
    | ({
      readonly identity?: ren.RenderStrategyIdentity;
    } & govn.HtmlEmailLayoutArguments);
}

export const isPotentialEmailDesignSystemLayoutArgumentsSupplier = safety
  .typeGuard<
    EmailDesignSystemLayoutArgumentsSupplier
  >("layout");

export function isEmailDesignSystemLayoutArgumentsSupplier(
  o: unknown,
): o is EmailDesignSystemLayoutArgumentsSupplier {
  if (isPotentialEmailDesignSystemLayoutArgumentsSupplier(o)) {
    if (typeof o.layout === "string") return true;
    if (typeof o.layout === "object") return true;
  }
  return false;
}

export interface EmailDesignSystemArgumentsSupplier {
  readonly designSystem: EmailDesignSystemLayoutArgumentsSupplier;
}

export const isPotentialEmailDesignSystemArgumentsSupplier = safety.typeGuard<
  EmailDesignSystemArgumentsSupplier
>("designSystem");

export interface KebabCaseEmailDesignSystemArgumentsSupplier {
  readonly "design-system": EmailDesignSystemLayoutArgumentsSupplier;
}

export const isKebabCaseEmailDesignSystemArgumentsSupplier = safety.typeGuard<
  KebabCaseEmailDesignSystemArgumentsSupplier
>("design-system");

export function isEmailDesignSystemArgumentsSupplier(
  o: unknown,
): o is EmailDesignSystemArgumentsSupplier {
  if (isPotentialEmailDesignSystemArgumentsSupplier(o)) {
    if (isEmailDesignSystemLayoutArgumentsSupplier(o.designSystem)) return true;
  }
  return false;
}

export function isFlexibleMutatedEmailDesignSystemArgumentsSupplier(
  o: unknown,
): o is EmailDesignSystemArgumentsSupplier {
  if (isKebabCaseEmailDesignSystemArgumentsSupplier(o)) {
    // deno-lint-ignore no-explicit-any
    const mutatableO = o as any;
    mutatableO.designSystem = o["design-system"];
    delete mutatableO["design-system"];
  }
  return isEmailDesignSystemArgumentsSupplier(o);
}

export function emailDesignSystemTemplate<Layout extends govn.HtmlEmailLayout>(
  identity: string,
  location: extn.LocationSupplier,
) {
  return el.htmlEmailLayoutTemplate<
    govn.HtmlEmailHelperFunctionOrString<Layout>,
    Layout
  >(identity, location);
}

export function emailDesignSystemLayoutFrontmatter(
  layout: EmailDesignSystemLayoutArgumentsSupplier,
):
  & fm.UntypedFrontmatter
  & EmailDesignSystemLayoutArgumentsSupplier {
  return layout as
    & fm.UntypedFrontmatter
    & EmailDesignSystemLayoutArgumentsSupplier;
}

export class EmailDesignSystemLayouts<Layout extends govn.HtmlEmailLayout>
  implements ren.LayoutStrategies<Layout, c.HtmlSupplier> {
  readonly layouts: Map<
    ren.LayoutStrategyIdentity,
    govn.HtmlEmailLayoutStrategy<Layout>
  > = new Map();

  constructor(
    readonly defaultLayoutStrategySupplier:
      govn.HtmlEmailLayoutStrategySupplier<
        Layout
      >,
  ) {
  }

  layoutStrategy(
    name: ren.LayoutStrategyIdentity,
  ): govn.HtmlEmailLayoutStrategy<Layout> | undefined {
    return this.layouts.get(name);
  }

  diagnosticLayoutStrategy(
    layoutStrategyErrorDiagnostic: string,
    dl?: govn.HtmlEmailLayoutStrategySupplier<Layout>,
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

export type EmailDesignSystemAssetURL = string;

export interface EmailDesignSystemAssetLocationSupplier {
  (relURL: EmailDesignSystemAssetURL): EmailDesignSystemAssetURL;
}

export interface EmailDesignSystemAssetLocations {
  readonly dsImage: EmailDesignSystemAssetLocationSupplier; // design system
  readonly dsScript: EmailDesignSystemAssetLocationSupplier; // design system
  readonly dsStylesheet: EmailDesignSystemAssetLocationSupplier; // design system
  readonly dsComponent: EmailDesignSystemAssetLocationSupplier; // design system
  readonly uImage: EmailDesignSystemAssetLocationSupplier; // universal design system
  readonly uScript: EmailDesignSystemAssetLocationSupplier; // universal design system
  readonly uStylesheet: EmailDesignSystemAssetLocationSupplier; // universal design system
  readonly uComponent: EmailDesignSystemAssetLocationSupplier; // universal design system
  readonly image: EmailDesignSystemAssetLocationSupplier; // local site
  readonly favIcon: EmailDesignSystemAssetLocationSupplier; // local site
  readonly script: EmailDesignSystemAssetLocationSupplier; // local site
  readonly stylesheet: EmailDesignSystemAssetLocationSupplier; // local site
  readonly component: EmailDesignSystemAssetLocationSupplier; // local site
  readonly brandImage: EmailDesignSystemAssetLocationSupplier; // white label ("brandable")
  readonly brandScript: EmailDesignSystemAssetLocationSupplier; // white label ("brandable")
  readonly brandStylesheet: EmailDesignSystemAssetLocationSupplier; // white label ("brandable")
  readonly brandComponent: EmailDesignSystemAssetLocationSupplier; // white label ("brandable")
  readonly brandFavIcon: EmailDesignSystemAssetLocationSupplier; // white label ("brandable")
}

export interface EmailDesignSystemLintDiagnostic<
  Layout extends govn.HtmlEmailLayout,
> extends c.LintDiagnostic {
  readonly layout: Layout;
}

export const isEmailDesignSystemLintDiagnostic = safety.typeGuard<
  // deno-lint-ignore no-explicit-any
  EmailDesignSystemLintDiagnostic<any>
>("rule", "layout");

export interface EmailDesignSystemLintReporter<
  Layout extends govn.HtmlEmailLayout,
> extends c.LintReporter<EmailDesignSystemLintDiagnostic<Layout>> {
  readonly diagnostic: (
    rule: c.LintRule,
    layout: Layout,
  ) => EmailDesignSystemLintDiagnostic<Layout>;
  readonly diagsShouldBeTemporary: c.LintRule;
}

export interface EmailDesignSystemLayoutContribsInitializer<
  Layout extends govn.HtmlEmailLayout,
> {
  (layout: Omit<Layout, "contributions">): govn.HtmlEmailLayoutContributions;
}

export interface EmailDesignSystemContext<
  AssetLocations extends EmailDesignSystemAssetLocations,
> {
  readonly assets: AssetLocations;
}

export type UntypedEmailDesignSystemContext = EmailDesignSystemContext<
  // deno-lint-ignore no-explicit-any
  any
>;

export interface EmailDesignSystemFactory<
  Layout extends govn.HtmlEmailLayout,
  AssetLocations extends EmailDesignSystemAssetLocations,
> {
  readonly designSystem: EmailDesignSystem<Layout>;
  readonly contentStrategy: EmailDesignSystemContext<AssetLocations>;
}

// deno-lint-ignore no-explicit-any
export type EmailDesignSystemDirective = c.DirectiveExpectation<any, any>;

export abstract class EmailDesignSystem<Layout extends govn.HtmlEmailLayout>
  implements
    ren.RenderStrategy<Layout, c.HtmlSupplier>,
    c.DirectiveExpectationsSupplier<EmailDesignSystemDirective> {
  readonly defaultContentModel: () => c.ContentModel = () => {
    return { isContentModel: true, isContentAvailable: false };
  };

  constructor(
    readonly identity: ren.RenderStrategyIdentity,
    readonly location: extn.LocationSupplier,
    readonly layoutStrategies: EmailDesignSystemLayouts<Layout>,
    readonly dsAssetsBaseURL: string,
    readonly universalAssetsBaseURL: string,
  ) {
  }

  abstract layout(
    body: govn.HtmlEmailLayoutBody | (() => govn.HtmlEmailLayoutBody),
    layoutSS: govn.HtmlEmailLayoutStrategySupplier<Layout>,
    context: UntypedEmailDesignSystemContext,
  ): Layout;

  prepareLayout(
    body: govn.HtmlEmailLayoutBody | (() => govn.HtmlEmailLayoutBody),
    layoutSS: govn.HtmlEmailLayoutStrategySupplier<Layout>,
    context: UntypedEmailDesignSystemContext,
  ): govn.HtmlEmailLayout {
    const bodySource = typeof body === "function" ? body() : body;
    const frontmatter = fm.isFrontmatterSupplier(bodySource)
      ? bodySource.frontmatter
      : undefined;
    const layoutArgs = this.frontmatterLayoutArgs(frontmatter);
    const result: govn.HtmlEmailLayout = {
      bodySource,
      context,
      designSystem: this,
      layoutSS,
      frontmatter,
      contributions: this.contributions(),
      origin: el.typicalEmailHtmlOriginResolvers,
      ...layoutArgs,
    };
    return result;
  }

  allowedDirectives(
    _filter?: (DE: EmailDesignSystemDirective) => boolean,
  ): EmailDesignSystemDirective[] {
    return [];
  }

  frontmatterLayoutStrategy(
    layoutArgs: EmailDesignSystemLayoutArgumentsSupplier,
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
      if (isEmailDesignSystemLayoutArgumentsSupplier(s.frontmatter)) {
        const layout = this.frontmatterLayoutStrategy(s.frontmatter, "layout");
        if (layout) return layout;
        return this.layoutStrategies.diagnosticLayoutStrategy(
          `frontmatter 'layout' not found ${sourceMap}`,
        );
      }
      if (isFlexibleMutatedEmailDesignSystemArgumentsSupplier(s.frontmatter)) {
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
  ): govn.HtmlEmailLayoutArguments | undefined {
    if (isEmailDesignSystemLayoutArgumentsSupplier(utfm)) {
      return typeof utfm.layout === "string" ? undefined : utfm.layout;
    }
    if (isFlexibleMutatedEmailDesignSystemArgumentsSupplier(utfm)) {
      return typeof utfm.designSystem.layout === "string"
        ? undefined
        : utfm.designSystem.layout;
    }
  }

  contributions(): govn.HtmlEmailLayoutContributions {
    return {
      scripts: contrib.contributions("<!-- scripts contrib -->"),
      stylesheets: contrib.contributions("<!-- stylesheets contrib -->"),
      head: contrib.contributions("<!-- head contrib -->"),
      body: contrib.contributions("<!-- body contrib -->"),
      bodyMainContent: contrib.contributions(
        "<!-- body main content contrib -->",
      ),
      diagnostics: contrib.contributions("<!-- diagnostics contrib -->"),
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
    inherit?: Partial<EmailDesignSystemAssetLocations>,
  ): EmailDesignSystemAssetLocations {
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

  emailRenderer(
    contentStrategy: UntypedEmailDesignSystemContext,
    refine?: coll.ResourceRefinery<govn.HtmlEmailLayoutBody>,
  ): coll.ResourceRefinery<govn.HtmlEmailLayoutBody> {
    return async (resource) => {
      const lss =
        fm.isFrontmatterSupplier(resource) || c.isModelSupplier(resource)
          ? this.inferredLayoutStrategy(resource)
          : this.layoutStrategies.diagnosticLayoutStrategy(
            "Neither frontmatter nor model supplied to EmailDesignSystem.emailRenderer",
          );
      return await lss.layoutStrategy.rendered(this.layout(
        refine ? await refine(resource) : resource,
        lss,
        contentStrategy,
      ));
    };
  }

  emailRendererSync(
    contentStrategy: UntypedEmailDesignSystemContext,
    refine?: coll.ResourceRefinerySync<govn.HtmlEmailLayoutBody>,
  ): coll.ResourceRefinerySync<govn.HtmlEmailLayoutBody> {
    return (resource) => {
      const lss =
        fm.isFrontmatterSupplier(resource) || c.isModelSupplier(resource)
          ? this.inferredLayoutStrategy(resource)
          : this.layoutStrategies.diagnosticLayoutStrategy(
            "Neither frontmatter nor model supplied to EmailDesignSystem.emailRendererSync",
          );
      return lss.layoutStrategy.renderedSync(this.layout(
        refine ? refine(resource) : resource,
        lss,
        contentStrategy,
      ));
    };
  }

  htmlEmailProducer(
    destRootPath: string,
    contentStrategy: UntypedEmailDesignSystemContext,
    options?: {
      readonly fspEE?: p.FileSysPersistenceEventsEmitter;
      readonly memoize?: (
        resource: c.HtmlSupplier,
        producer: (replay: c.HtmlSupplier) => Promise<c.HtmlSupplier>,
      ) => Promise<void>;
    },
  ): coll.ResourceRefinery<govn.HtmlEmailLayoutBody> {
    const producer = coll.pipelineUnitsRefineryUntyped(
      this.emailRenderer(contentStrategy),
      hn.htmlContentNature.persistFileSysRefinery(
        destRootPath,
        p.routePersistForceExtnNamingStrategy(".html"),
        options?.fspEE,
      ),
    );

    return async (resource) => {
      if (
        ren.isRenderableMediaTypeResource(
          resource,
          c.htmlMediaTypeNature.mediaType,
        )
      ) {
        if (options?.memoize) {
          options?.memoize(resource as c.HtmlSupplier, async (replay) => {
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
