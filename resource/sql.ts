import { fs } from "./deps.ts";
import * as safety from "../safety/mod.ts";
import * as c from "./content/mod.ts";
import * as coll from "./collection/mod.ts";
import * as r from "../route/mod.ts";
import * as p from "./persist/mod.ts";

export const sqlContentNature:
  & c.MediaTypeNature<c.TextResource>
  & c.TextSuppliersFactory
  & p.FileSysPersistenceSupplier<c.TextResource> = {
    mediaType: c.sqlMediaTypeNature.mediaType,
    guard: c.sqlMediaTypeNature.guard,
    prepareText: c.prepareText,
    persistFileSysRefinery: (
      rootPath,
      namingStrategy,
      eventsEmitter,
      ...functionArgs
    ) => {
      return async (resource) => {
        if (c.isTextSupplier(resource)) {
          await p.persistResourceFile(
            resource,
            resource,
            namingStrategy(
              resource as unknown as r.RouteSupplier<r.RouteNode>,
              rootPath,
            ),
            {
              ensureDirSync: fs.ensureDirSync,
              functionArgs,
              eventsEmitter,
            },
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
      ...functionArgs
    ) => {
      if (c.isTextSupplier(resource)) {
        await p.persistResourceFile(
          resource,
          resource,
          namingStrategy(
            resource as unknown as r.RouteSupplier<r.RouteNode>,
            rootPath,
          ),
          { ensureDirSync: fs.ensureDirSync, functionArgs, eventsEmitter },
        );
      }
    },
  };

export interface SqlFileResource extends c.TextResource {
  readonly isSqlFileResource: true;
}

export const isSqlFileResource = safety.typeGuard<SqlFileResource>(
  "nature",
  "text",
  "textSync",
  "isSqlFileResource",
);

export function sqlFileProducer<State>(
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
    p.routePersistForceExtnNamingStrategy(".sql");
  return async (resource) => {
    if (isSqlFileResource(resource)) {
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
