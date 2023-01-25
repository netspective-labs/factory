import { dzx, path } from "./deps.ts";
import * as govn from "./governance.ts";
import * as safety from "../safety/mod.ts";

export const isModuleStatus = safety.typeGuard<govn.ModuleStatus>(
  "kind",
  "specifier",
  "mediaType",
);

export const isLocalModuleStatus = safety.typeGuard<govn.ModuleStatus>(
  "kind",
  "specifier",
  "mediaType",
  "local",
);

export const isModuleGraph = safety.typeGuard<govn.ModuleGraph>(
  "roots",
  "modules",
);

export async function moduleStatusLocalFileInfo(
  ms: govn.ModuleStatus,
): Promise<Deno.FileInfo | undefined> {
  if (isLocalModuleStatus(ms)) {
    try {
      return await Deno.lstat(ms.local);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function typicalModuleGraphs(): govn.ModuleGraphs {
  const result: govn.ModuleGraphs = {
    moduleGraph: async (rootSpecifier, onError) => {
      const process = await dzx.$`deno info ${rootSpecifier} --json`;
      const denoInfo = JSON.parse(process.stdout);
      if (isModuleGraph(denoInfo) && Array.isArray(denoInfo.modules)) {
        const valid = denoInfo.modules.filter((m: unknown) =>
          isModuleStatus(m)
        );
        if (valid.length == denoInfo.modules.length) {
          const graph = denoInfo as govn.ModuleGraph;
          return graph;
        }
      }
      if (onError) {
        return onError(
          new Error(`Unable to determine module graph from ${rootSpecifier}`, {
            cause: new Error(JSON.stringify(process)),
          }),
        );
      }
      return undefined;
    },
    localDependencies: async (rootSpecifier, includeRootSpecifier, onError) => {
      let graph: govn.ModuleGraph | undefined;
      let deps: govn.ModuleStatus[] | undefined;
      if (onError) {
        graph = await result.moduleGraph(rootSpecifier, async (error) => {
          deps = await onError(error);
          return undefined;
        });
        // this means the graph was not found but onError returned somthing;
        // otherwise, we fall through to if(graph) below
        if (deps) return deps;
      } else {
        graph = await result.moduleGraph(rootSpecifier);
      }
      if (graph) {
        const local = path.resolve(rootSpecifier);
        // we only return local modules who don't match the root specifier;
        // any remotes will be ignored as dependencies
        return includeRootSpecifier
          ? graph.modules.filter((m) => m.local)
          : graph.modules.filter((m) => m.local && (m.local != local));
      }
    },
    localDependenciesFileInfos: async (
      rootSpecifier,
      includeRootSpecifier,
      onError,
    ) => {
      const deps = await result.localDependencies(
        rootSpecifier,
        includeRootSpecifier,
        onError,
      );
      if (deps && deps.length > 0) {
        for (const dep of deps) {
          const lfis = dep as unknown as govn.MutatableLocalFileInfoSupplier;
          try {
            lfis.localFileInfo = await Deno.lstat(dep.local);
          } catch (error) {
            lfis.localFileInfoError = error;
          }
        }
        return deps;
      }
      return undefined;
    },
  };
  return result;
}

export const moduleGraphs = typicalModuleGraphs();
export default moduleGraphs;
