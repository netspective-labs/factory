import { fs } from "./deps.ts";
import * as safety from "../safety/mod.ts";
import * as c from "./content/mod.ts";
import * as coll from "./collection/mod.ts";
import * as r from "../route/mod.ts";
import * as p from "./persist/mod.ts";

export const textContentNature:
  & c.MediaTypeNature<c.TextResource>
  & c.TextSuppliersFactory
  & c.HtmlSuppliersFactory
  & p.FileSysPersistenceSupplier<c.TextResource> = {
    mediaType: c.textMediaTypeNature.mediaType,
    guard: c.textMediaTypeNature.guard,
    prepareText: c.prepareText,
    prepareHTML: c.prepareHTML,
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

export interface TextFileResource extends c.TextResource {
  readonly isTextFileResource: true;
}

export const isTextFileResource = safety.typeGuard<TextFileResource>(
  "nature",
  "text",
  "textSync",
  "isTextFileResource",
);

export function textFileProducer<State>(
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
    p.routePersistForceExtnNamingStrategy(".txt");
  return async (resource) => {
    if (isTextFileResource(resource)) {
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
