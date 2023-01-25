import { fs, log, path } from "../deps.ts";
import * as extn from "../../module/mod.ts";
import * as govn from "../governance.ts";
import * as c from "../content/mod.ts";
import * as coll from "../collection/mod.ts";
import * as p from "../persist/mod.ts";
import * as fm from "../frontmatter/mod.ts";
import * as r from "../../route/mod.ts";
import * as ren from "../render/mod.ts";
import * as i from "../instantiate.ts";
import * as hn from "../html/nature.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export interface MarkdownModel extends c.ContentModel {
  readonly isMarkdownModel: true;
}

export interface MarkdownResource<Model extends MarkdownModel = MarkdownModel>
  extends
    c.TextSupplier,
    c.TextSyncSupplier,
    c.NatureSupplier<
      & c.MediaTypeNature<c.TextSupplier & c.TextSyncSupplier>
      & p.FileSysPersistenceSupplier<MarkdownResource>
    >,
    r.RouteSupplier,
    c.ModelSupplier<Model>,
    Partial<fm.FrontmatterSupplier<fm.UntypedFrontmatter>>,
    Partial<c.DiagnosticsSupplier> {
}

export interface MutatableMarkdownResource<
  Model extends MarkdownModel = MarkdownModel,
> extends
  MarkdownResource<Model>,
  Partial<fm.FrontmatterConsumer<fm.UntypedFrontmatter>> {
}

export const markdownMediaTypeNature: c.MediaTypeNature<MarkdownResource> = {
  mediaType: "text/markdown",
  guard: (o: unknown): o is MarkdownResource => {
    if (
      c.isNatureSupplier(o) && c.isMediaTypeNature(o.nature) &&
      o.nature.mediaType === markdownMediaTypeNature.mediaType &&
      (c.isTextSupplier(o) && c.isTextSyncSupplier(o))
    ) {
      return true;
    }
    return false;
  },
};

export const markdownContentNature:
  & c.MediaTypeNature<MarkdownResource>
  & c.TextSuppliersFactory
  & c.HtmlSuppliersFactory
  & p.FileSysPersistenceSupplier<MarkdownResource>
  & ren.RenderTargetsSupplier<c.MediaTypeNature<c.HtmlResource>> = {
    mediaType: markdownMediaTypeNature.mediaType,
    guard: markdownMediaTypeNature.guard,
    prepareText: c.prepareText,
    prepareHTML: c.prepareHTML,
    renderTargets: [hn.htmlContentNature],
    persistFileSysRefinery: (rootPath, namingStrategy, eventsEmitter) => {
      return async (resource) => {
        if (c.isHtmlSupplier(resource)) {
          await p.persistResourceFile(
            resource,
            resource.html,
            namingStrategy(resource, rootPath),
            { ensureDirSync: fs.ensureDirSync, eventsEmitter },
          );
        }
        return resource;
      };
    },
    persistFileSys: async (
      resource,
      rootPath,
      namingStrategy,
      eventsEmitter,
    ) => {
      if (c.isHtmlSupplier(resource)) {
        await p.persistResourceFile(
          resource,
          resource.html,
          namingStrategy(resource, rootPath),
          { ensureDirSync: fs.ensureDirSync, eventsEmitter },
        );
      }
    },
  };

export const constructStaticMarkdownTextResource = (
  origination: r.RouteSupplier & {
    markdownText: string;
    frontmatterEffector?: (
      resource: fm.FrontmatterResource,
    ) =>
      & fm.FrontmatterResource
      & Partial<fm.FrontmatterSupplier<fm.UntypedFrontmatter>>;
    diagnostics?: (error: Error, message?: string) => string;
  },
  options?: { readonly log?: log.Logger },
) => {
  const nature = markdownContentNature;
  const result:
    & MarkdownResource
    & fm.FrontmatterConsumer<fm.UntypedFrontmatter>
    & r.RouteSupplier
    & r.ParsedRouteConsumer
    & i.InstantiatorSupplier
    & govn.OriginationSupplier<typeof origination> = {
      nature,
      frontmatter: {},
      route: {
        ...origination.route,
        nature,
      },
      model: {
        isContentModel: true,
        isContentAvailable: true,
        isMarkdownModel: true,
      },
      consumeParsedFrontmatter: (parsed) => {
        if (!parsed.error) {
          // Assume frontmatter is the content's header, which has been parsed
          // so the text after the frontmatter needs to become our new content.
          // We're going to mutate this object directly and not make a copy.
          c.mutateFlexibleContent(result, parsed.content);

          // if the originator wants to override anything, give them a chance
          const frontmatter = fm.isFrontmatterConsumer(origination)
            ? origination.consumeParsedFrontmatter(parsed)
            : parsed.frontmatter;
          if (frontmatter) {
            // deno-lint-ignore no-explicit-any
            (result as any).frontmatter = frontmatter;
            result.consumeParsedRoute(frontmatter);
          }
        } else {
          const diagnostics = origination.diagnostics?.(
            parsed.error,
            `Frontmatter parse error`,
          ) ?? `Frontmatter parse error: ${parsed.error}`;
          // deno-lint-ignore no-explicit-any
          (result as any).diagnostics = diagnostics;
          options?.log?.error(diagnostics, { origination, parsed });
        }
        return parsed.frontmatter;
      },
      consumeParsedRoute: (pr) => {
        return result.route.consumeParsedRoute(pr);
      },
      text: origination.markdownText,
      textSync: origination.markdownText,
      ...i.typicalInstantiatorProps(
        constructStaticMarkdownTextResource,
        import.meta.url,
        "constructStaticMarkdownTextResource",
      ),
      origination,
    };
  origination.frontmatterEffector?.(result);
  return result;
};

export const constructStaticMarkdownResourceSync = (
  origination: r.RouteSupplier & {
    fsPath: string;
    diagnostics?: (error: Error, message?: string) => string;
  },
  options?: r.FileSysRouteOptions,
) => {
  const nature = markdownContentNature;
  const result:
    & MarkdownResource
    & fm.FrontmatterConsumer<fm.UntypedFrontmatter>
    & r.RouteSupplier
    & r.ParsedRouteConsumer
    & i.InstantiatorSupplier
    & govn.OriginationSupplier<
      typeof origination & coll.ResourceFactorySupplier<MarkdownResource>
    > = {
      nature,
      frontmatter: {},
      route: {
        ...origination.route,
        nature,
      },
      model: {
        isContentModel: true,
        isContentAvailable: true,
        isMarkdownModel: true,
      },
      consumeParsedFrontmatter: (parsed) => {
        if (!parsed.error) {
          // Assume frontmatter is the content's header, which has been parsed
          // so the text after the frontmatter needs to become our new content.
          // We're going to mutate this object directly and not make a copy.
          c.mutateFlexibleContent(result, parsed.content);

          // if the originator wants to override anything, give them a chance
          const frontmatter = fm.isFrontmatterConsumer(origination)
            ? origination.consumeParsedFrontmatter(parsed)
            : parsed.frontmatter;
          if (frontmatter) {
            // deno-lint-ignore no-explicit-any
            (result as any).frontmatter = frontmatter;
            result.consumeParsedRoute(frontmatter);
          }
        } else {
          const diagnostics = origination.diagnostics?.(
            parsed.error,
            `Frontmatter parse error`,
          ) ?? `Frontmatter parse error: ${parsed.error}`;
          // deno-lint-ignore no-explicit-any
          (result as any).diagnostics = diagnostics;
          options?.log?.error(diagnostics, { origination, parsed });
        }
        return parsed.frontmatter;
      },
      consumeParsedRoute: (pr) => {
        return result.route.consumeParsedRoute(pr);
      },
      // deno-lint-ignore require-await
      text: async () => Deno.readTextFile(origination.fsPath),
      textSync: () => Deno.readTextFileSync(origination.fsPath),
      ...i.typicalInstantiatorProps(
        constructStaticMarkdownResourceSync,
        import.meta.url,
        "constructStaticMarkdownResourceSync",
      ),
      origination: {
        ...origination,
        // the resourceFactory in an origination object is responsible for
        // "cloning" an instatiation; this is used by memoizers to replay an
        // object construction activity
        // deno-lint-ignore require-await
        resourceFactory: async () => {
          return constructStaticMarkdownResourceSync(origination, options);
        },
      },
    };
  return result;
};

export function staticMarkdownFileSysResourceFactory(
  refine?: coll.ResourceRefinery<MarkdownResource>,
) {
  const factory = {
    // deno-lint-ignore require-await
    construct: async (
      origin: r.RouteSupplier & {
        fsPath: string;
        diagnostics?: (error: Error, message?: string) => string;
      },
      options?: r.FileSysRouteOptions,
    ) => constructStaticMarkdownResourceSync(origin, options),
    refine,
    instance: async (
      we: r.RouteSupplier & {
        fsPath: string;
        diagnostics?: (error: Error, message?: string) => string;
      },
      options?: r.FileSysRouteOptions,
    ) => {
      const instance = await factory.construct(we, options);
      coll.forceOriginationRF<MarkdownResource>(instance, async () => {
        // the resourceFactory in an origination object is responsible for
        // "cloning" an instatiation; this is used by memoizers to replay an
        // object construction activity
        const instance = await factory.construct(we, options);
        return (refine ? await refine(instance) : instance);
      });
      return refine ? await refine(instance) : instance;
    },
  };
  return factory;
}

export const constructMarkdownModuleResourceSync: (
  origin: r.RouteSupplier,
  content: string,
  frontmatter: extn.UntypedExports,
  options?: r.FileSysRouteOptions,
) => MarkdownResource = (origination, content, frontmatter, options) => {
  const nature = markdownContentNature;
  const result:
    & MarkdownResource
    & r.RouteSupplier
    & i.InstantiatorSupplier
    & govn.OriginationSupplier<
      typeof origination & coll.ResourceFactorySupplier<MarkdownResource>
    > = {
      nature,
      frontmatter,
      route: {
        ...origination.route,
        nature,
      },
      model: {
        isContentModel: true,
        isContentAvailable: true,
        isMarkdownModel: true,
      },
      // deno-lint-ignore require-await
      text: async () => content,
      textSync: () => content,
      ...i.typicalInstantiatorProps(
        constructMarkdownModuleResourceSync,
        import.meta.url,
        "constructMarkdownModuleResourceSync",
      ),
      origination: {
        ...origination,
        // the resourceFactory in an origination object is responsible for
        // "cloning" an instatiation; this is used by memoizers to replay an
        // object construction activity
        // deno-lint-ignore require-await
        resourceFactory: async () => {
          return constructMarkdownModuleResourceSync(
            origination,
            content,
            frontmatter,
            options,
          );
        },
      },
    };
  return result;
};

export function markdownModuleFileSysResourceFactory(
  defaultEM: extn.ExtensionsManager,
  refine?: coll.ResourceRefinery<MarkdownResource>,
) {
  const factory = {
    construct: async (
      origination: r.RouteSupplier & {
        fsPath: string;
        diagnostics?: (error: Error, message?: string) => string;
      },
      options?: r.FileSysRouteOptions,
    ) => {
      const em = options?.extensionsManager ?? defaultEM;
      const nature = markdownContentNature;
      const model: MarkdownModel = {
        isContentModel: true,
        isContentAvailable: true,
        isMarkdownModel: true,
      };
      const imported = await em.importModule(origination.fsPath);
      const issue = (diagnostics: string, ...args: unknown[]) => {
        options?.log?.error(diagnostics, ...args);
        const result:
          & c.ModuleResource
          & MarkdownResource
          & r.RouteSupplier
          & i.InstantiatorSupplier
          & govn.OriginationSupplier<typeof origination> = {
            imported,
            nature,
            route: { ...origination.route, nature },
            model,
            // deno-lint-ignore require-await
            text: async () => diagnostics,
            textSync: () => diagnostics,
            ...i.typicalInstantiatorProps(
              issue,
              import.meta.url,
              "markdownModuleFileSysResourceFactory.issue",
            ),
            origination,
          };
        return result;
      };

      if (imported.isValid) {
        // deno-lint-ignore no-explicit-any
        const defaultValue = (imported.module as any).default;
        if (defaultValue) {
          // every exported variable will be assumed to be "frontmatter" but
          // the `default` export will be the content so we don't want that in
          // frontmatter.
          const frontmatter = imported.exports((key) =>
            key == "default" ? false : true
          );
          const result:
            & c.ModuleResource
            & MarkdownResource
            & r.RouteSupplier
            & i.InstantiatorSupplier
            & govn.OriginationSupplier<
              & typeof origination
              & coll.ResourceFactorySupplier<MarkdownResource>
            > = {
              imported,
              frontmatter,
              nature,
              route: r.isRouteSupplier(frontmatter) &&
                  r.isRoute(frontmatter.route)
                ? frontmatter.route
                : { ...origination.route, nature },
              model: {
                isContentModel: true,
                isContentAvailable: true,
                isMarkdownModel: true,
              },
              // deno-lint-ignore require-await
              text: async () => defaultValue,
              textSync: () => defaultValue,
              ...i.typicalInstantiatorProps(
                markdownModuleFileSysResourceFactory,
                import.meta.url,
                "markdownModuleFileSysResourceFactory.defaultValue",
              ),
              origination: {
                ...origination,
                // the resourceFactory in an origination object is responsible for
                // "cloning" an instatiation; this is used by memoizers to replay an
                // object construction activity
                // deno-lint-ignore require-await
                resourceFactory: async () => {
                  return factory.construct(origination, options);
                },
              },
            };
          return result;
        } else {
          return issue("Markdown module has no default value");
        }
      } else {
        return issue(
          "Invalid Markdown Module " + imported.importError,
          imported.importError,
        );
      }
    },
    refine,
    instance: async (
      we: r.RouteSupplier & {
        fsPath: string;
        diagnostics?: (error: Error, message?: string) => string;
      },
      options?: r.FileSysRouteOptions,
    ) => {
      const instance = await factory.construct(we, options);
      coll.forceOriginationRF<MarkdownResource>(instance, async () => {
        // the resourceFactory in an origination object is responsible for
        // "cloning" an instatiation; this is used by memoizers to replay an
        // object construction activity
        const instance = await factory.construct(we, options);
        return (refine ? await refine(instance) : instance);
      });
      return (refine ? await refine(instance) : instance);
    },
  };
  return factory;
}

/**
 * Create an originator function that will return a factory object which will
 * construct and refine markdown resources either from static *.md files or
 * Typescript *.md.ts modules.
 * @param defaultEM the a module import manager (for caching imports)
 * @param refine a default refinery to supply with the created factory object
 * @returns
 */
export function fsFileSuffixMarkdownResourceOriginator(
  defaultEM: extn.ExtensionsManager,
  refine?: coll.ResourceRefinery<MarkdownResource>,
) {
  const typicalStaticFactory = staticMarkdownFileSysResourceFactory(refine);
  const typicalModuleFactory = markdownModuleFileSysResourceFactory(
    defaultEM,
    refine,
  );
  const allExtns = (fsPath: string) => {
    const fileName = path.basename(fsPath);
    return fileName.slice(fileName.indexOf("."));
  };

  return (fsPath: string, matchExtns = allExtns(fsPath)) => {
    switch (matchExtns) {
      case ".md":
        return typicalStaticFactory;

      case ".md.ts":
      case ".md.js":
        return typicalModuleFactory;
    }

    return undefined;
  };
}
