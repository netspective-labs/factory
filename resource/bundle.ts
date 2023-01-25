import { fs } from "./deps.ts";
import * as de from "https://deno.land/x/emit@0.3.0/mod.ts"; // not in deps because only this module needs it
import * as safety from "../safety/mod.ts";
import * as extn from "../module/mod.ts";
import * as c from "./content/mod.ts";
import * as coll from "./collection/mod.ts";
import * as fm from "./frontmatter/mod.ts";
import * as r from "../route/mod.ts";
import * as ren from "./render/mod.ts";
import * as p from "./persist/mod.ts";

export interface FileSysResourceBundleConstructor<State> {
  (
    origin: { path: string },
    options: r.FileSysRouteOptions,
    imported: extn.ExtensionModule,
    state: State,
  ): Promise<BundleResource>;
}

export interface BundleResource
  extends
    c.TextSupplier,
    c.TextSyncSupplier,
    c.NatureSupplier<
      & c.MediaTypeNature<c.TextSupplier & c.TextSyncSupplier>
      & p.FileSysPersistenceSupplier<BundleResource>
    >,
    r.RouteSupplier,
    Partial<fm.FrontmatterSupplier<fm.UntypedFrontmatter>>,
    Partial<c.DiagnosticsSupplier> {
  readonly isClientJavascriptBundle?: boolean;
}

export const isBundleResourceType = safety.typeGuard<BundleResource>(
  "nature",
  "text",
  "textSync",
  "isClientJavascriptBundle",
);

export function isBundleResource(o: unknown): o is BundleResource {
  if (isBundleResourceType(o)) {
    return o.isClientJavascriptBundle ? true : false;
  }
  return false;
}

export const bundleMediaTypeNature: c.MediaTypeNature<BundleResource> = {
  mediaType: "text/javascript",
  guard: (o: unknown): o is BundleResource => {
    if (
      c.isNatureSupplier(o) && c.isMediaTypeNature(o.nature) &&
      o.nature.mediaType === bundleMediaTypeNature.mediaType &&
      (c.isTextSupplier(o) && c.isTextSyncSupplier(o))
    ) {
      return true;
    }
    return false;
  },
};

export const bundleContentNature:
  & c.MediaTypeNature<c.TextResource>
  & c.TextSuppliersFactory
  & p.FileSysPersistenceSupplier<BundleResource>
  & ren.RenderTargetsSupplier<c.MediaTypeNature<c.TextResource>> = {
    mediaType: bundleMediaTypeNature.mediaType,
    guard: bundleMediaTypeNature.guard,
    prepareText: c.prepareText,
    renderTargets: [bundleMediaTypeNature],
    persistFileSysRefinery: (rootPath, namingStrategy, eventsEmitter) => {
      return async (resource) => {
        if (c.isTextSupplier(resource)) {
          await p.persistResourceFile(
            resource,
            resource,
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
      if (c.isTextSupplier(resource)) {
        await p.persistResourceFile(
          resource,
          resource,
          namingStrategy(resource, rootPath),
          { ensureDirSync: fs.ensureDirSync, eventsEmitter },
        );
      }
    },
  };

export function bundleFileSysResourceFactory(
  isClientJavascriptBundle: boolean,
  refine?: coll.ResourceRefinery<BundleResource>,
) {
  return {
    construct: async (
      origination: r.RouteSupplier & { path: string },
      options: r.FileSysRouteOptions,
    ) => {
      // doing this will make PCII available at the server side
      const imported = await options.extensionsManager.importModule(
        origination.path,
      );
      let content = "// bundler did not run?";
      if (imported.isValid) {
        try {
          const { files, diagnostics } = await de.emit(origination.path, {
            // bundle: "classic", // TODO: not supported by deno_emit
            // compilerOptions: { // TODO: not supported by deno_emit
            //   lib: ["deno.unstable", "deno.window"],
            // },
          });
          if (diagnostics.length) {
            content = diagnostics;
            // content = Deno.formatDiagnostics(diagnostics); // TODO: not supported by deno_emit
          } else {
            content = files;
            // content = files["deno:///bundle.js"]; // TODO: not supported by deno_emit
          }
        } catch (e) {
          content = `// Error emitting ${origination.path}: ${e}`;
        }
      } else {
        content =
          `// Invalid Module ${origination.path}: ${imported.importError}`;
      }
      const nature = bundleContentNature;
      const result:
        & BundleResource
        & r.RouteSupplier = {
          isClientJavascriptBundle,
          nature,
          route: {
            ...origination.route,
            nature,
          },
          // deno-lint-ignore require-await
          text: async () => content,
          textSync: () => content,
        };
      return result;
    },
    refine,
  };
}

export function bundleProducer<State>(
  destRootPath: string,
  state: State,
  options?: {
    readonly namingStrategy?: p.LocalFileSystemNamingStrategy<
      r.RouteSupplier<r.RouteNode>
    >;
    readonly eventsEmitter?: p.FileSysPersistenceEventsEmitter;
  },
  // deno-lint-ignore no-explicit-any
): coll.ResourceRefinery<any> {
  const namingStrategy = options?.namingStrategy ||
    p.routePersistForceExtnNamingStrategy(".js");
  return async (resource) => {
    if (isBundleResource(resource)) {
      await p.persistResourceFile(
        resource,
        resource,
        namingStrategy(
          resource as unknown as r.RouteSupplier<r.RouteNode>,
          destRootPath,
        ),
        {
          ensureDirSync: fs.ensureDirSync,
          functionArgs: [state],
          eventsEmitter: options?.eventsEmitter,
        },
      );
    }
    return resource;
  };
}
