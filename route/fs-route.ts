import { log, path } from "./deps.ts";
import * as safety from "../safety/mod.ts";
import * as r from "./route.ts";
import * as e from "../module/mod.ts";
import * as ws from "../workspace/mod.ts";
import * as fsrp from "./fs-route-parse.ts";
import * as govn from "./governance.ts";

export function defaultRouteWorkspaceEditorResolver(
  wser: ws.WorkspaceEditorTargetResolver<ws.WorkspaceEditorTarget>,
): govn.RouteWorkspaceEditorResolver<
  ws.WorkspaceEditorTarget
> {
  return (route, line) => {
    if (route.origin && r.isModuleRouteOrigin(route.origin)) {
      const candidate = route.origin.moduleImportMetaURL;
      if (candidate.startsWith("file:")) {
        return wser(path.fromFileUrl(candidate), line);
      }
    }

    const terminal = route.terminal;
    if (terminal) {
      if (isFileSysRouteUnit(terminal)) {
        return wser(terminal.fileSysPath, line);
      }
    }
    return undefined;
  };
}

export interface FileSysRouteOptions {
  readonly fsRouteFactory: FileSysRouteFactory;
  readonly routeParser: fsrp.FileSysRouteParser;
  readonly extensionsManager: e.ExtensionsManager;
  readonly log?: log.Logger;
}

export interface FileSysRouteNode extends govn.RouteNode {
  readonly fileSysPath: string;
  readonly fileSysPathParts: path.ParsedPath;
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly isSymlink: boolean;
  readonly size: number;
  readonly isModifiedInFileSys: () => boolean;
}

export const isFileSysRouteUnit = safety.typeGuard<FileSysRouteNode>(
  "fileSysPath",
  "qualifiedPath",
  "isDirectory",
  "isFile",
  "isSymlink",
  "size",
  "level",
  "resolve",
);

export type FileSysRoute = govn.Route<FileSysRouteNode>;

export class FileSysRouteFactory extends r.TypicalRouteFactory {
  readonly cache = new Map<string, FileSysRoute>();

  /**
   * Determine all route units between fileSysPath and commonAncestor. Both
   * commonAncestor and fileSysPath should be valid (must exist) and be absolute
   * paths (not relative). commonAncestor should be a directory but fileSysPath
   * should be file.
   * @param fileSysPath absolute path the single unit whose route we're computing, must be a child of commonAncestor
   * @param commonAncestor absolute path of the ancestor path, must be a known ancestor of fileSysPath
   * @param pathParser which path parser we should use
   * @returns the full set of route units between fileSysPath and commonAncestor
   */
  async fsRoute(
    fileSysPath: string,
    commonAncestor: string,
    rps: FileSysRouteOptions,
  ): Promise<FileSysRoute> {
    const found = this.cache.get(fileSysPath);
    if (found) return found;

    if (fileSysPath == commonAncestor) {
      return {
        units: [],
        consumeParsedRoute: (pr) => pr,
        inRoute: (unit) => {
          return result.units.find((u) =>
            u.qualifiedPath == unit.qualifiedPath
          );
        },
        parent: undefined,
      };
    }

    const { parsedPath: fileSysPathParts, routeUnit: parsedUnit } = rps
      .routeParser(fileSysPath, commonAncestor);
    const qualifiedPath = path.relative(
      commonAncestor,
      path.join(fileSysPathParts.dir, parsedUnit.unit),
    );
    const parent = await this.fsRoute(
      path.dirname(fileSysPath),
      commonAncestor,
      rps,
    );
    const result: FileSysRoute = {
      units: qualifiedPath.length > 0
        ? [
          ...(await this.fsRoute(
            fileSysPathParts.dir,
            commonAncestor,
            rps,
          )).units,
        ]
        : [],
      consumeParsedRoute: (pr) => r.consumeParsedRoute(pr, result),
      inRoute: (unit) => {
        return result.units.find((u) => u.qualifiedPath == unit.qualifiedPath);
      },
      parent,
    };
    const level = result.units.length;
    const stat = Deno.statSync(fileSysPath);
    const routeUnit: FileSysRouteNode = {
      ...parsedUnit,
      fileSysPath,
      fileSysPathParts,
      qualifiedPath: qualifiedPath.startsWith("/")
        ? qualifiedPath
        : `/${qualifiedPath}`,
      level,
      isDirectory: stat.isDirectory,
      isFile: stat.isFile,
      isSymlink: stat.isSymlink,
      size: stat.size,
      isIntermediate: stat.isDirectory,
      lastModifiedAt: stat.mtime || undefined,
      createdAt: stat.birthtime || undefined,
      resolve: (relative) => r.resolveRouteUnit(relative, level, result),
      location: (options) => this.routeLocationResolver(routeUnit, options),
      inRoute: (route) => route.inRoute(routeUnit) ? true : false,
      isModifiedInFileSys: () => {
        const reStat = Deno.statSync(fileSysPath);
        if (reStat.mtime && stat.mtime) {
          return reStat.mtime > stat.mtime;
        }
        return false;
      },
    };
    result.units.push(routeUnit);
    // deno-lint-ignore no-explicit-any
    (result as any).terminal = routeUnit;
    this.cache.set(fileSysPath, result);
    return result;
  }
}
