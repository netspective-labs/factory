import { path } from "./deps.ts";
import * as safety from "../safety/mod.ts";
import * as extn from "../module/mod.ts";
import * as govn from "./governance.ts";
import * as c from "./content/mod.ts";
import * as coll from "./collection/mod.ts";
import * as fm from "./frontmatter/mod.ts";
import * as h from "./html/mod.ts";
import * as r from "../route/mod.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export interface IssueHtmlResource
  extends
    c.HtmlResource,
    r.RouteSupplier,
    Partial<fm.FrontmatterSupplier<fm.UntypedFrontmatter>>,
    Partial<c.DiagnosticsSupplier> {
}

export const isModuleResource = safety.typeGuard<c.ModuleResource>(
  "imported",
);

export interface FileSysResourceModuleConstructor {
  (
    origin: { fsPath: string },
    options: r.FileSysRouteOptions,
    imported: extn.ExtensionModule,
  ): Promise<c.ModuleResource>;
}

export function isModuleConstructor(
  o: unknown,
): o is FileSysResourceModuleConstructor {
  if (typeof o === "function") return true;
  return false;
}

export function moduleFileSysResourceFactory(
  defaultEM: extn.ExtensionsManager,
  refine?: coll.ResourceRefinery<c.ModuleResource>,
) {
  const factory = {
    construct: async (
      origination: r.RouteSupplier & { fsPath: string },
      options: r.FileSysRouteOptions,
    ) => {
      const em = options?.extensionsManager ?? defaultEM;
      const imported = await em.importModule(origination.fsPath);
      const issue = (diagnostics: string) => {
        const result:
          & c.ModuleResource
          & IssueHtmlResource
          & govn.OriginationSupplier<typeof origination> = {
            route: { ...origination.route, nature: h.htmlContentNature },
            nature: h.htmlContentNature,
            frontmatter: {},
            diagnostics,
            imported,
            origination,
            html: {
              // deno-lint-ignore require-await
              text: async () => Deno.readTextFile(origination.fsPath),
              textSync: () => Deno.readTextFileSync(origination.fsPath),
            },
          };
        options?.log?.error(diagnostics, imported.importError);
        return result;
      };

      if (imported.isValid) {
        // deno-lint-ignore no-explicit-any
        const constructor = (imported.module as any).default;
        if (isModuleConstructor(constructor)) {
          const instance = await constructor(origination, options, imported);
          if (isModuleResource(instance)) {
            return instance;
          } else {
            return issue(
              `Valid module with default function that does not construct a resource which passes isModuleResource(instance) guard`,
            );
          }
        } else {
          return issue(
            `Valid module with invalid default (must be a function not ${typeof constructor})`,
          );
        }
      } else {
        return issue("Invalid Module: " + imported.importError);
      }
    },
    refine,
    instance: async (
      we: r.RouteSupplier & {
        fsPath: string;
        diagnostics?: (error: Error, message?: string) => string;
      },
      options: r.FileSysRouteOptions,
    ) => {
      const instance = await factory.construct(we, options);
      return (refine ? await refine(instance) : instance);
    },
  };
  return factory;
}

/**
 * Create an originator function that will return a factory object which will
 * construct and refine arbitrary resources either *.rf.ts modules.
 * @param defaultEM the a module import manager (for caching imports)
 * @param refine a default refinery to supply with the created factory object
 * @returns
 */
export function fsFileSuffixModuleOriginator(
  defaultEM: extn.ExtensionsManager,
  refine?: coll.ResourceRefinery<Any>,
) {
  const typicalModuleFactory = moduleFileSysResourceFactory(defaultEM, refine);
  const allExtns = (fsPath: string) => {
    const fileName = path.basename(fsPath);
    return fileName.slice(fileName.indexOf("."));
  };

  return (fsPath: string, matchExtns = allExtns(fsPath)) => {
    switch (matchExtns) {
      case ".rf.ts":
      case ".rf.js":
        return typicalModuleFactory;
    }

    return undefined;
  };
}
