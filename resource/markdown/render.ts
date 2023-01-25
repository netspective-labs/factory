import * as safety from "../../safety/mod.ts";
import { default as markdownIt } from "https://jspm.dev/markdown-it@13.0.1";
import { default as markdownItReplaceLink } from "https://jspm.dev/markdown-it-replace-link@1.1.0";
import { default as markdownItFootnote } from "https://jspm.dev/markdown-it-footnote@3.0.3";
import { default as markdownItAnchor } from "https://jspm.dev/markdown-it-anchor@8.6.4";
import { default as markdownItTitle } from "https://jspm.dev/markdown-it-title@4.0.0";
import { default as markdownItEmoji } from "https://jspm.dev/markdown-it-emoji@2.0.2";
import { default as markdownItDirective } from "https://jspm.dev/markdown-it-directive@1.0.1";
import { default as markdownItDirectiveWC } from "https://jspm.dev/markdown-it-directive-webcomponents@1.2.0";
import { default as markdownItHashtag } from "https://jspm.dev/markdown-it-hashtag@0.4.0";
import { default as markdownItTaskCheckbox } from "https://jspm.dev/markdown-it-task-checkbox";
import * as c from "../content/mod.ts";
import * as coll from "../collection/mod.ts";
import * as fm from "../frontmatter/mod.ts";
import * as r from "../render/mod.ts";
import * as md from "./resource.ts";
import * as extn from "../../module/mod.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

/**
 * markdownRenderEnv is available after Markdown rendering and includes
 * properties such as titles, footnotes, and other "generated" attributes.
 */
export interface MarkdownRenderEnvSupplier<
  RenderEnv extends Record<string, unknown>,
> {
  readonly markdownRenderEnv: RenderEnv;
}

export interface MarkdownContentDirective<Attributes>
  extends MarkdownRenderEnvSupplier<Record<string, unknown>> {
  readonly isMarkdownContentDirective: true;
  readonly identity: c.DirectiveIdentity;
  readonly content: string;
  readonly destinations?: [link: string, string: string][];
  readonly attributes?: Attributes;
}

export interface MarkdownContentInlineDirective<Attributes>
  extends MarkdownContentDirective<Attributes> {
  readonly isMarkdownContentInlineDirective: true;
}

export interface MarkdownItOptions {
  readonly html?: boolean;
  readonly xhtmlOut?: boolean;
  readonly breaks?: boolean;
  readonly langPrefix?: string;
  readonly linkify?: boolean;
  readonly typographer?: boolean;
  readonly quotes?: string | string[];
}

export interface MarkdownItOptionsSupplier {
  readonly markdown: MarkdownItOptions;
}

export const isMarkdownItOptionsSupplier = safety.typeGuard<
  MarkdownItOptionsSupplier
>("markdown");

export type MarkdownLayoutStrategy = r.LayoutStrategy<
  md.MarkdownResource,
  c.HtmlSupplier
>;

export type DefaultMarkdownLayoutSupplier = r.DefaultLayoutStrategySupplier<
  md.MarkdownResource,
  c.HtmlSupplier
>;

export interface MarkdownLinkUrlRewriter {
  (parsedURL: string, renderEnv: Record<string, unknown>): string;
}

export interface MarkdownClientCustomElementDirective {
  readonly present: "inline" | "block" | "both";
  readonly name: string;
  readonly tag: string;
  readonly allowedAttrs?: (string | RegExp)[];
  readonly destLinkName?: string;
  readonly destStringName?: string;
  readonly parseInner?: boolean;
}

export const isMarkdownClientCustomElementDirective = safety.typeGuard<
  MarkdownClientCustomElementDirective
>("present", "name", "tag");

export interface MarkdownLayoutPreferences {
  readonly directiveExpectations?: c.DirectiveExpectationsSupplier<
    c.DirectiveExpectation<
      // deno-lint-ignore no-explicit-any
      MarkdownContentDirective<any>,
      string | undefined
    >
  >;
  readonly rewriteURL?: MarkdownLinkUrlRewriter;
  readonly transformRendered?: (
    rendered: string,
    resource: md.MarkdownResource,
  ) => string;
  readonly topLevelMarkdownClassName?: string;
  // deno-lint-ignore no-explicit-any
  readonly customize?: (mdiRenderer: any) => void;
}

/**
 * References like <img src="figure-01.png"> need to be relative to the parent
 * directory if pretty URLs are enabled (e.g. if document URL ends with '/').
 * For any images referenced like ![label](url) check to see if the url is a
 * local reference and, if it is, change it to '../url' because Pretty URLs
 * require the relative location.
 * Ref: https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md#renderer
 * @param defaultRender the default md.renderer.rules.image rule
 * @returns
 */
// deno-lint-ignore no-explicit-any
export function autoCorrectPrettyUrlImagesRule(defaultRender: any) {
  const isAbsoluteUrlRE = new RegExp("^(?:[a-z]+:)?//", "i");

  // deno-lint-ignore no-explicit-any
  return (tokens: any, idx: any, options: any, env: any, self: any) => {
    const imgToken = tokens[idx], srcIndex = imgToken.attrIndex("src");
    const srcAttr = imgToken.attrs[srcIndex][1];

    // if the src URL is absolute don't touch it
    if (!isAbsoluteUrlRE.test(srcAttr) && !srcAttr.startsWith("/")) {
      // src URL is not absolute, assume that it's "local" to the markdown
      // file but for Pretty URLs the markdown will generate an HTML which
      // is one level down so we correct the reference
      imgToken.attrs[srcIndex][1] = `../${srcAttr}`;
    }

    return defaultRender(tokens, idx, options, env, self);
  };
}

export class TypicalMarkdownLayout implements MarkdownLayoutStrategy {
  // deno-lint-ignore no-explicit-any
  readonly mdiRenderer: any;
  readonly location: extn.LocationSupplier = {
    moduleImportMetaURL: import.meta.url,
  };

  constructor(
    readonly identity: string,
    readonly mpl?: MarkdownLayoutPreferences,
    readonly mdiOptions?: MarkdownItOptions,
  ) {
    this.mdiRenderer = this.prepareMarkdownItRendererPrime(
      this.mpl,
      this.mdiOptions,
    );
  }

  /**
   * Prepare the primary markdown-it instance for rendering HTML from markdown.
   * @param mdiOptions Optional markdown-it instance options defaults
   * @returns markdown-it renderer instance
   */
  prepareMarkdownItRendererPrime(
    mpl?: MarkdownLayoutPreferences,
    mdiOptions?: MarkdownItOptions,
  ) {
    // @ts-ignore: This expression is not callable.
    const result = markdownIt({
      html: true,
      linkify: true,
      typographer: true,
      ...mdiOptions,
      replaceLink: mpl?.rewriteURL,
    });
    if (mpl?.rewriteURL) {
      result.use(markdownItReplaceLink);
    }
    result.use(markdownItFootnote);
    result.use(markdownItAnchor); // TODO: use callback to track headings?
    result.use(markdownItTitle, { level: 0 }); // TODO: grab excerpts too?
    result.use(markdownItHashtag);
    result.use(markdownItTaskCheckbox);
    result.use(markdownItEmoji);
    if (mpl?.directiveExpectations) {
      this.registerMarkdownItDirectives(result, mpl?.directiveExpectations);
    }
    if (mpl?.customize) {
      mpl.customize(result);
    }
    return result;
  }

  postProcessDirectiveResult(
    directive: MarkdownContentInlineDirective<Record<string, string>>,
    // deno-lint-ignore no-explicit-any
    result: any,
  ) {
    if (typeof result === "string") {
      directive.markdownRenderEnv.isDirectivePostProcess = directive;
      // TODO: this.mdiRenderer should be re-entrant (recursion-safe) but not
      // sure so we'll need to some testing
      result = this.mdiRenderer.render(result, directive.markdownRenderEnv);
      delete directive.markdownRenderEnv.isDirectivePostProcess;
    }
    return result;
  }

  registerMarkdownItDirectives(
    // deno-lint-ignore no-explicit-any
    renderer: any,
    directiveExpectations: c.DirectiveExpectationsSupplier<
      c.DirectiveExpectation<
        // deno-lint-ignore no-explicit-any
        MarkdownContentDirective<any>,
        string | undefined
      >
    >,
  ) {
    renderer.use(markdownItDirective)
      // deno-lint-ignore no-explicit-any
      .use((md: any) => {
        for (
          const de of directiveExpectations.allowedDirectives((d) =>
            !isMarkdownClientCustomElementDirective(d)
          )
        ) {
          md.inlineDirectives[de.identity] = (
            // deno-lint-ignore no-explicit-any
            state: any,
            // deno-lint-ignore no-explicit-any
            content: any,
            // deno-lint-ignore no-explicit-any
            dests: any,
            // deno-lint-ignore no-explicit-any
            attrs: any,
          ) => {
            const token = state.push("html_inline", "", 0);
            const directive: MarkdownContentInlineDirective<
              Record<string, string>
            > = {
              isMarkdownContentDirective: true,
              isMarkdownContentInlineDirective: true,
              markdownRenderEnv: state.env,
              identity: de.identity,
              content: content,
              destinations: dests
                ? (Array.isArray(dests) ? dests : undefined)
                : undefined,
              attributes:
                typeof attrs === "object" && Object.keys(attrs).length > 0
                  ? attrs
                  : undefined,
            };
            let result = de.encountered(directive);
            const pp = attrs && attrs["post-process"];
            if (pp && (pp == "md" || pp == "markdown")) {
              result = this.postProcessDirectiveResult(directive, result);
            }
            token.content = typeof result === "string"
              ? result
              : JSON.stringify({
                directive: de.identity,
                content,
                dests,
                attrs,
              });
          };
        }
      });
    renderer.use(markdownItDirectiveWC, {
      components: directiveExpectations.allowedDirectives((d) =>
        isMarkdownClientCustomElementDirective(d)
      ),
    });
  }

  renderedMarkdownResource(
    resource: md.MarkdownResource,
    sourceText: string | undefined,
    defaultText: string,
  ): c.HtmlSupplier {
    // we want resource to be available during rendering for directives
    const markdownRenderEnv = { resource };
    let html = "(unable to render using this.mdiRenderer)";
    try {
      html = this.mdiRenderer.render(
        sourceText || defaultText,
        markdownRenderEnv,
      );
    } catch (err) {
      html =
        `<pre>Fatal MarkdownIt content parse error: ${err}</pre>\nSometimes emojis or custom directives (anything ':' can confuse the directives parser) cause problems. See resource.markdownItRenderError for stack trace.`;
      (resource as Any).markdownItRenderError = err;
    }
    // deno-lint-ignore no-explicit-any
    delete (markdownRenderEnv as any).resource; // should not go into model
    // take each property in markdownRenderEnv and put it into resource.model
    c.mutateModelProperties(markdownRenderEnv, resource, {
      append: [["isContentAvailable", sourceText ? true : false]],
    });
    return {
      ...resource,
      html: this.mpl?.transformRendered
        ? this.mpl.transformRendered(html, resource)
        : html,
    };
  }

  async rendered(resource: md.MarkdownResource): Promise<c.HtmlSupplier> {
    return this.renderedMarkdownResource(
      resource,
      await c.flexibleTextCustom(resource),
      "async text not available in resource",
    );
  }

  renderedSync(resource: md.MarkdownResource): c.HtmlSupplier {
    return this.renderedMarkdownResource(
      resource,
      c.flexibleTextSyncCustom(resource),
      "sync text not available in resource",
    );
  }
}

export const defaultMarkdownStylesheetClassName = "md";

export class MarkdownLayouts
  implements r.LayoutStrategies<md.MarkdownResource, c.HtmlSupplier> {
  readonly defaultLayoutStrategySupplier: DefaultMarkdownLayoutSupplier;
  readonly layouts: Map<r.LayoutStrategyIdentity, MarkdownLayoutStrategy> =
    new Map();

  constructor(readonly mpl?: MarkdownLayoutPreferences) {
    const layoutStrategy = new TypicalMarkdownLayout(
      "html-in-md-div-with-style-as-data-URI",
      {
        // deno-fmt-ignore
        transformRendered: (rendered) => `<div class="${mpl?.topLevelMarkdownClassName || defaultMarkdownStylesheetClassName}">${rendered}</div>`,
        ...this.mpl,
      },
    );
    this.defaultLayoutStrategySupplier = {
      isDefaultLayoutStrategy: true,
      layoutStrategy,
    };
    this.layouts.set(layoutStrategy.identity, layoutStrategy);
  }

  layoutStrategy(
    name: r.LayoutStrategyIdentity,
  ): MarkdownLayoutStrategy | undefined {
    return this.layouts.get(name);
  }

  diagnosticLayoutStrategy(
    layoutStrategyErrorDiagnostic: string,
    dl?: DefaultMarkdownLayoutSupplier,
  ): r.ErrorLayoutStrategySupplier<md.MarkdownResource, c.HtmlSupplier> {
    return {
      ...(dl || this.defaultLayoutStrategySupplier),
      isErrorLayoutStrategySupplier: true,
      layoutStrategyErrorDiagnostic,
    };
  }

  namedLayoutStrategy(
    name: r.LayoutStrategyIdentity,
  ): r.LayoutStrategySupplier<md.MarkdownResource, c.HtmlSupplier> {
    const layoutStrategy = this.layoutStrategy(name);
    if (layoutStrategy) {
      const named: r.NamedLayoutStrategySupplier<
        md.MarkdownResource,
        c.HtmlSupplier
      > = {
        layoutStrategy,
        isNamedLayoutStrategyStrategySupplier: true,
        layoutStrategyIdentity: name,
      };
      return named;
    }
    return this.diagnosticLayoutStrategy(`layout named '${name}' not found`);
  }
}

export class MarkdownRenderStrategy
  implements r.RenderStrategy<md.MarkdownResource, c.HtmlSupplier> {
  readonly identity = "markdown";
  readonly location: extn.LocationSupplier = {
    moduleImportMetaURL: import.meta.url,
  };

  constructor(
    readonly layoutStrategies: MarkdownLayouts,
    readonly frontmatterPropNames = ["markdown", "mdrender"],
  ) {
  }

  frontmatterPropertyLayout(
    fmPropertyName: string,
    layoutName?: unknown,
  ):
    | r.LayoutStrategySupplier<md.MarkdownResource, c.HtmlSupplier>
    | undefined {
    if (!layoutName) return undefined;
    if (typeof layoutName === "string") {
      const layoutStrategy = layoutName
        ? this.layoutStrategies.layoutStrategy(layoutName)
        : undefined;
      if (layoutStrategy) {
        const named:
          & r.NamedLayoutStrategySupplier<
            md.MarkdownResource,
            c.HtmlSupplier
          >
          & r.FrontmatterLayoutStrategySupplier<
            md.MarkdownResource,
            c.HtmlSupplier
          > = {
            layoutStrategy,
            isNamedLayoutStrategyStrategySupplier: true,
            isInferredLayoutStrategySupplier: true,
            isFrontmatterLayoutStrategy: true,
            layoutStrategyIdentity: layoutName,
            frontmatterLayoutStrategyPropertyName: fmPropertyName,
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
  ): r.LayoutStrategySupplier<md.MarkdownResource, c.HtmlSupplier> {
    if (fm.isFrontmatterSupplier(s) && s.frontmatter) {
      for (const propName of this.frontmatterPropNames) {
        if (propName in s.frontmatter) {
          const layoutName = s.frontmatter[propName];
          const layout = this.frontmatterPropertyLayout(propName, layoutName);
          if (layout) return layout;
          return this.layoutStrategies.diagnosticLayoutStrategy(
            `frontmatter '${propName}' property '${s.frontmatter.mdrender}' not found in MarkdownRenderStrategy.frontmatterLayoutStrategy`,
          );
        }
        return this.layoutStrategies.diagnosticLayoutStrategy(
          `frontmatter property not found: ${
            this.frontmatterPropNames.map((pn) => `'${pn}'`).join(" or ")
          } in MarkdownRenderStrategy.frontmatterLayoutStrategy`,
        );
      }
    }
    return this.layoutStrategies.diagnosticLayoutStrategy(
      `neither frontmatter nor model available, using default in MarkdownRenderStrategy.frontmatterLayoutStrategy`,
    );
  }

  /**
   * Create an ansynchronous refinery which uses Frontmatter to drive a Markdown renderer
   * @returns async resource refinery which returns the resource plus a new `html` property
   */
  renderer(): coll.ResourceRefinery<md.MarkdownResource> {
    return async (resource) => {
      const lss = fm.isFrontmatterSupplier(resource)
        ? this.inferredLayoutStrategy(resource)
        : this.layoutStrategies.diagnosticLayoutStrategy(
          "Frontmatter not supplied to MarkdownRenderStrategy.renderer",
        );
      return await lss.layoutStrategy.rendered(
        resource,
      ) as (md.MarkdownResource & c.HtmlSupplier);
    };
  }

  /**
   * Create a syncronous refinery which uses Frontmatter to drive a Markdown renderer
   * @returns sync resource refinery which returns the resource plus a new `html` property
   */
  rendererSync(): coll.ResourceRefinerySync<md.MarkdownResource> {
    return (resource) => {
      const lss = fm.isFrontmatterSupplier(resource)
        ? this.inferredLayoutStrategy(resource)
        : this.layoutStrategies.diagnosticLayoutStrategy(
          "Frontmatter not supplied to MarkdownRenderStrategy.renderer",
        );
      return lss.layoutStrategy.renderedSync(
        resource,
      ) as (md.MarkdownResource & c.HtmlSupplier);
    };
  }
}

/**
 * Create an originator function that will return a factory object which can
 * acquire a markdown resource and render its  HTML either from static *.md
 * files or Typescript *.md.ts modules.
 * @param defaultEM the a module import manager (for caching imports)
 * @param mdRS markdown render strategy with render layouts for automatic loading
 * @param refine a default refinery to supply with the created factory object
 * @returns
 */
export function fsFileSuffixRenderedMarkdownResourceOriginator(
  defaultEM: extn.ExtensionsManager,
  mdRS: MarkdownRenderStrategy = new MarkdownRenderStrategy(
    new MarkdownLayouts(),
  ),
  refine = coll.pipelineUnitsRefinery<md.MarkdownResource>(
    fm.prepareFrontmatter(fm.yamlTomlMarkdownFrontmatterRE),
    mdRS.renderer(),
  ),
) {
  return md.fsFileSuffixMarkdownResourceOriginator(defaultEM, refine);
}
