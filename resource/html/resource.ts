import { path } from "../deps.ts";
import * as extn from "../../module/mod.ts";
import * as govn from "../governance.ts";
import * as c from "../content/mod.ts";
import * as coll from "../collection/mod.ts";
import * as p from "../persist/mod.ts";
import * as fm from "../frontmatter/mod.ts";
import * as r from "../../route/mod.ts";
import * as i from "../instantiate.ts";
import * as n from "./nature.ts";

export interface StaticHtmlResource extends
  c.HtmlSupplier,
  c.NatureSupplier<
    & c.MediaTypeNature<c.HtmlSupplier>
    & p.FileSysPersistenceSupplier<c.HtmlResource>
  >,
  r.RouteSupplier,
  Partial<fm.FrontmatterSupplier<fm.UntypedFrontmatter>>,
  Partial<c.DiagnosticsSupplier> {
}

export const constructResourceSync: (
  origination: r.RouteSupplier & {
    fsPath: string;
    diagnostics?: (error: Error, message?: string) => string;
  },
  options?: r.FileSysRouteOptions,
) => StaticHtmlResource = (origination, options) => {
  const result:
    & StaticHtmlResource
    & fm.FrontmatterConsumer<fm.UntypedFrontmatter>
    & r.RouteSupplier
    & r.ParsedRouteConsumer
    & i.InstantiatorSupplier
    & govn.OriginationSupplier<typeof origination> = {
      nature: n.htmlContentNature,
      frontmatter: {},
      route: { ...origination.route, nature: n.htmlContentNature },
      consumeParsedFrontmatter: (parsed) => {
        if (!parsed.error) {
          // we're going to mutate this object directly and not make a copy
          if (typeof result.html !== "string") {
            c.mutateFlexibleContent(result.html, parsed.content);
          }

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
      html: {
        // deno-lint-ignore require-await
        text: async () => Deno.readTextFile(origination.fsPath),
        textSync: () => Deno.readTextFileSync(origination.fsPath),
      },
      ...i.typicalInstantiatorProps(
        constructResourceSync,
        import.meta.url,
        "constructResourceSync",
      ),
      origination,
    };
  return result;
};

export function staticHtmlFileSysResourceFactory(
  refine?: coll.ResourceRefinery<StaticHtmlResource>,
) {
  const factory = {
    // deno-lint-ignore require-await
    construct: async (
      we: r.RouteSupplier & {
        fsPath: string;
        diagnostics?: (error: Error, message?: string) => string;
      },
      options?: r.FileSysRouteOptions,
    ) => constructResourceSync(we, options),
    refine,
    instance: async (
      we: r.RouteSupplier & {
        fsPath: string;
        diagnostics?: (error: Error, message?: string) => string;
      },
      options?: r.FileSysRouteOptions,
    ) => {
      const instance = await factory.construct(we, options);
      return (refine ? await refine(instance) : instance);
    },
  };
  return factory;
}

/**
 * Create an originator function that will return a factory object which will
 * construct and refine HTML resources from static *.html files with optional
 * "HTML frontmatter" with <!-- YAML --> strategy.
 * @param _defaultEM the a module import manager (for caching imports)
 * @param refine a default refinery to supply with the created factory object
 * @returns
 */
export function fsFileSuffixHtmlResourceOriginator(
  _defaultEM: extn.ExtensionsManager,
  refine = fm.prepareFrontmatter<StaticHtmlResource>(fm.yamlHtmlFrontmatterRE),
) {
  const typicalStaticFactory = staticHtmlFileSysResourceFactory(refine);
  const allExtns = (fsPath: string) => {
    const fileName = path.basename(fsPath);
    return fileName.slice(fileName.indexOf("."));
  };

  return (fsPath: string, matchExtns = allExtns(fsPath)) => {
    switch (matchExtns) {
      case ".html":
      case ".fm.html": // .fm means frontmatter-capable, for convenience
        return typicalStaticFactory;
    }

    return undefined;
  };
}
